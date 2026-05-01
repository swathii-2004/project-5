# ProxiMart — Project Flow, Architecture & Technical Reference

> **Stack:** React TypeScript (×3 frontends) · FastAPI · MongoDB · JWT Auth · AES-256 Encryption  
> **Repo strategy:** Monorepo — one repo, 4 folders, deploy each independently

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Role Overview](#2-role-overview)
3. [System Architecture Flow](#3-system-architecture-flow)
4. [Authentication Flow](#4-authentication-flow)
5. [Feature Flows (per role)](#5-feature-flows-per-role)
6. [Database Models](#6-database-models)
7. [API Structure](#7-api-structure)
8. [Tech Stack](#8-tech-stack)
9. [Folder Structure](#9-folder-structure)
10. [Git Strategy](#10-git-strategy)
11. [Deployment Strategy](#11-deployment-strategy)

---

## 1. Project Overview

ProxiMart is a multi-role hyperlocal product discovery and reservation platform with three completely independent frontends sharing one FastAPI backend and one MongoDB database. Users discover real-time local inventory, reserve items for store pickup, and navigate to stores — all without upfront payment.

| Service | URL (example) | Deploy target |
|---|---|---|
| Backend API | `api.proximart.com` | Railway / Render / VPS |
| User frontend | `app.proximart.com` | Vercel |
| Vendor frontend | `vendor.proximart.com` | Vercel |
| Admin frontend | `admin.proximart.com` | Vercel |

---

## 2. Role Overview

| Role | Signup | Login | Approval needed |
|---|---|---|---|
| **User** | Public signup | Immediate | No |
| **Vendor** | Signup + document upload | After admin approval | Yes |
| **Admin** | No public signup — seeded via CLI | Always active | No |

---

## 3. System Architecture Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                                                                  │
│    [User App]        [Vendor App]        [Admin App]             │
│    React TS          React TS            React TS                │
│                                                                  │
└─────────────────────────┬────────────────────────────────────────┘
                          │  HTTPS REST + WebSocket
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND                             │
│                                                                  │
│  JWT Middleware → AES-256 Layer → Role Guards → Route Handlers   │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Auth     │  │ Products │  │ Reserva- │  │ WebSocket     │  │
│  │ Router   │  │ Router   │  │ tions    │  │ Chat Manager  │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Maps /   │  │ Notif.   │  │ Analytics│                      │
│  │ Location │  │ Router   │  │ Router   │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                  │
└───┬──────────────┬──────────────┬──────────────┬────────────────┘
    │              │              │              │
    ▼              ▼              ▼              ▼
[MongoDB]    [Cloudinary]   [Firebase]     [SendGrid]
Motor async   Product/doc    Push notif.    Email
driver        storage        (FCM)          service
                    │
                    ▼
             [Google Maps API]
             Geocoding + Distance
             + Route guidance
```

### Request lifecycle

1. Client sends request with `Authorization: Bearer <access_token>`
2. FastAPI `get_current_user()` dependency decodes JWT → extracts `user_id` + `role`
3. Role guard checks if endpoint is permitted for that role
4. Sensitive fields (phone, address, bank details) are decrypted via AES-256 before use
5. Business logic executes → reads/writes MongoDB via Motor (async)
6. Sensitive fields re-encrypted with AES-256 before writing back to DB
7. File uploads → validated (type + size) → streamed to Cloudinary → URL saved in DB
8. Push notifications → dispatched via Firebase Cloud Messaging (FCM)
9. Realtime events → pushed via WebSocket to connected clients
10. Response returned with appropriate HTTP status

### AES-256 encryption layer

```
Fields encrypted at rest in MongoDB:
  users           → phone, address fields
  vendor_profiles → bank_account_number, ifsc, gst_number, phone
  reservations    → pickup_contact_phone

Encryption key:  AES_SECRET_KEY (32-byte key, stored in .env only)
Algorithm:       AES-256-CBC
IV:              Random 16-byte IV generated per encryption, stored
                 alongside ciphertext as  iv:ciphertext  (base64)
Library:         cryptography (Python) — Fernet or AES via hazmat layer

Helper location: utils/encryption.py
  encrypt(plain_text: str) -> str   # returns "b64iv:b64ciphertext"
  decrypt(cipher_text: str) -> str  # splits iv, decrypts, returns plain
```

---

## 4. Authentication Flow

### 4.1 User signup (immediate access)

```
User fills form
     │
     ▼
POST /auth/signup
     │
     ├── Validate input (Pydantic strict)
     ├── Check email not already registered
     ├── Hash password (bcrypt)
     ├── Encrypt phone + address fields (AES-256)
     ├── Create user doc: { role: "user", status: "active" }
     └── Return access_token + set refresh_token in httpOnly cookie
```

### 4.2 Vendor signup (approval required)

```
Vendor fills form + uploads documents (PDF/JPG/PNG, max 5MB each)
     │
     ▼
POST /auth/signup  (multipart/form-data)
     │
     ├── Validate input fields (Pydantic strict)
     ├── Validate file types and sizes (server-side MIME check)
     ├── Upload documents to Cloudinary → save URLs
     ├── Hash password (bcrypt)
     ├── Encrypt phone, address, GST number (AES-256)
     ├── Create user doc: { role: "vendor", status: "pending" }
     └── Return 201: "Registration submitted. Awaiting admin approval."

     [Login blocked until status = "active"]
```

### 4.3 Admin approval flow

```
Admin logs in → opens pending approvals queue
     │
     ▼
Admin clicks application → views uploaded documents inline
     │
     ├── [APPROVE] → PUT /admin/approve/:user_id
     │       ├── status = "active"
     │       └── Send approval email via SendGrid
     │
     └── [REJECT]  → PUT /admin/reject/:user_id  { reason: "..." }
             ├── status = "rejected"
             └── Send rejection email with reason
                 (Vendor can resubmit → new application, status = "pending" again)
```

### 4.4 Login flow (all roles)

```
POST /auth/login  { email, password }
     │
     ├── Find user by email
     ├── Check status == "active"  → 403 if pending/rejected/deactivated
     ├── Verify password (bcrypt)
     ├── Generate access_token  (JWT, 15 min, payload: user_id + role)
     ├── Generate refresh_token (JWT, 7 days)
     ├── Set refresh_token in httpOnly cookie
     └── Return { access_token, user: { id, name, role } }
```

### 4.5 Token refresh

```
POST /auth/refresh
     │
     ├── Read refresh_token from httpOnly cookie
     ├── Verify and decode
     ├── Issue new access_token (15 min)
     └── Return { access_token }
```

### 4.6 JWT middleware (every protected route)

```python
# FastAPI dependency — applied to all protected routes
async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    payload = decode_jwt(token)           # raises 401 if invalid/expired
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user or user["status"] != "active":
        raise HTTPException(403)
    return user

# Role guard
def require_role(roles: list[str]):
    def guard(current_user = Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return current_user
    return guard
```

---

## 5. Feature Flows (per role)

### 5.1 User flows

#### Smart local product search

```
User opens Search tab → grants or enters location
     │
     ▼
GET /products/search?q=rice&lat=12.97&lng=77.59&radius_km=5
     &sort=distance|price|rating&available_now=true&page=1&limit=20
     │
     ├── Backend calculates distance using Google Maps Distance Matrix API
     │   (or Haversine formula for fast approximate results)
     ├── Filters products where store is within radius
     ├── Filters by stock > 0 if available_now=true
     └── Returns ranked list: { product, store, distance_km, price, rating }
```

#### Live map view

```
User opens Map tab
     │
     ▼
GET /stores/nearby?lat=12.97&lng=77.59&radius_km=5&product_q=rice
     │
     ├── Returns stores with coordinates + available product count
     └── Frontend renders pins on Google Maps / Mapbox
          ├── Pin color = green (in stock) / amber (low stock) / red (out of stock)
          └── Clicking pin shows store card with products inline
```

#### Reserve a product

```
User views product in a store → clicks "Reserve"
     │
     ▼
POST /reservations
     { product_id, store_id, quantity, pickup_contact_phone }
     │
     ├── Check product stock >= requested quantity
     ├── Encrypt pickup_contact_phone (AES-256)
     ├── Create reservation: { status: "pending", expires_at: now + 30 min }
     ├── Temporarily hold stock (reserved_qty field on product)
     └── Notify vendor via FCM push + WebSocket

          [Vendor sees new reservation]
          │
          ├── PUT /reservations/:id/confirm
          │       ├── status = "confirmed"
          │       ├── expires_at extended to now + 2 hours (pickup window)
          │       └── Notify user via FCM push
          │
          └── PUT /reservations/:id/reject { reason }
                  ├── status = "rejected"
                  ├── Release held stock
                  └── Notify user via FCM push

[Reservation auto-expires if not confirmed within 30 min — background task]
[If confirmed but user does not pick up within 2 hours → status = "expired", stock released]
```

#### Reservation status tracking

```
User opens My Reservations
     │
     ▼
GET /reservations/user?status=pending|confirmed|completed|expired|rejected
     │
     ▼
Each reservation card shows:
  - Product name, store name, quantity
  - Status badge + time remaining (countdown for confirmed reservations)
  - "Get Directions" button → opens Google Maps route to store
  - "Cancel" button (only if status = pending or confirmed)
```

#### Smart notifications

```
FCM push notifications sent to user for:
  - Reservation confirmed by vendor
  - Reservation rejected by vendor (with reason)
  - Reservation expiring soon (15 min warning)
  - Price drop on wishlisted product
  - A wishlisted product is back in stock
  - Emergency mode item located nearby

In-app notification bell (WebSocket):
  - Real-time badge count
  - Notification dropdown with all above events
```

#### Emergency mode

```
User toggles Emergency Mode → enters item name (e.g. "oxygen cylinder", "baby formula")
     │
     ▼
GET /products/emergency?q=oxygen+cylinder&lat=...&lng=...&radius_km=10
     │
     ├── Elevated radius (10 km default, expandable to 25 km)
     ├── Results sorted strictly by distance (ignore price)
     ├── In-stock stores highlighted at top
     └── One-tap "Get Directions" per result
```

#### Group reservation

```
User creates a Group Reservation
     │
     ▼
POST /reservations/group
     { product_id, store_id, items: [{ product_id, quantity }], group_name, invite_emails[] }
     │
     ├── Create group reservation doc
     ├── Send invite links to group members via email (SendGrid)
     ├── Each member confirms their portion
     └── Once all confirmed → single consolidated reservation sent to vendor
```

#### Offline lite mode

```
On app load: cache last-known product availability in localStorage (via React Query)
     │
When network unavailable:
     ├── Show cached results with "Last updated X min ago" banner
     ├── Reserve button disabled
     └── Map loads cached store pins
```

---

### 5.2 Vendor flows

#### Manage store profile

```
Vendor opens Store Profile tab
     │
     ▼
GET /vendors/me/profile
     │
     ▼
PUT /vendors/me/profile
     { store_name, description, address, lat, lng, phone, open_hours, categories[] }
     │
     ├── Encrypt phone (AES-256) before saving
     └── Geocode address via Google Maps API → save lat/lng
```

#### Product CRUD + inventory sync

```
POST   /products            → Create listing (vendor only)
GET    /products/mine       → List own products with stock levels
PUT    /products/:id        → Update product details or price
PUT    /products/:id/stock  → Update stock quantity (inventory sync)
DELETE /products/:id        → Soft delete (is_active = false)

Each product: name, description, category, price, stock, reserved_qty,
              low_stock_threshold, images[], is_active, tags[]

Images uploaded to Cloudinary on create/edit
Stock update triggers:
  - FCM push to users who wishlisted this product (if restocked from 0)
  - Low-stock alert to vendor if stock < low_stock_threshold
```

#### Reservation management

```
New reservation arrives (FCM push + WebSocket notification)
     │
     ▼
GET /reservations/vendor?status=pending
     │
     ▼
Vendor reviews reservation → confirms stock physically
     │
     ├── PUT /reservations/:id/confirm
     │       ├── status = "confirmed"
     │       └── Notify user via FCM
     │
     └── PUT /reservations/:id/reject { reason }
             ├── status = "rejected"
             ├── Release reserved stock
             └── Notify user via FCM

When user arrives and collects item:
     │
     ▼
PUT /reservations/:id/complete
     ├── status = "completed"
     ├── Decrement actual stock (reserved_qty released, stock decremented)
     └── Trigger review nudge to user
```

#### Analytics dashboard

```
GET /vendors/me/analytics
     │
     Returns:
     ├── Total reservations (today / this week / this month)
     ├── Completion rate (completed / total confirmed)
     ├── Top 5 most reserved products
     ├── Peak booking hours (hourly breakdown)
     ├── Demand forecast: products trending upward in reservations
     └── Revenue estimate: sum of completed reservation values
```

#### In-app chat with users

```
Chat available on any active reservation (pending or confirmed)
     │
     ▼
Frontend connects to WebSocket:
     ws://api.proximart.com/ws/chat/{reservation_id}
     │
     ├── Authenticate via token query param: ?token=<access_token>
     ├── Validate user is either the reserver or the vendor of this reservation
     └── Load message history: GET /chat/{reservation_id}/history

User sends pre-booking query → WS event → FastAPI WS manager
     ├── Save message to DB (chat_messages collection)
     └── Broadcast to all sockets in room
```

---

### 5.3 Admin flows

#### Pending vendor approval queue

```
GET /admin/pending?role=vendor    → all vendors with status "pending"

Each record includes:
  - store name, owner name, email, registration date
  - document URLs (viewable inline)
  - Time waiting (for SLA tracking)
  - Decrypted GST number for verification (admin-only endpoint)
```

#### Platform monitoring

```
GET /admin/analytics/overview
     │
     Returns:
     ├── Total registered users
     ├── Total active vendors
     ├── Pending vendor approvals
     ├── Total reservations today
     ├── Total completed reservations
     ├── Total products listed
     └── Platform-wide reservation completion rate
```

#### User & vendor management

```
GET    /admin/users?role=&search=&page=     → paginated list
PUT    /admin/users/:id/deactivate          → status = "deactivated"
PUT    /admin/users/:id/reactivate          → status = "active"
DELETE /admin/users/:id                     → hard delete (with audit log)
PUT    /admin/products/:id/flag             → flag inappropriate listing
DELETE /admin/products/:id                  → remove listing
POST   /admin/broadcast                     → send FCM push to all users
```

---

## 6. Database Models

> MongoDB collections. All `_id` fields are MongoDB ObjectId.  
> Fields marked 🔒 are AES-256 encrypted at rest.

### 6.1 users

```js
{
  _id: ObjectId,
  name: String,                           // required
  email: String,                          // unique, required
  hashed_password: String,                // bcrypt
  role: "user" | "vendor" | "admin",
  status: "pending" | "active" | "rejected" | "deactivated",
  avatar_url: String,
  phone: String,                          // 🔒 AES-256 encrypted
  address: {
    line1: String,                        // 🔒 AES-256 encrypted
    city: String,
    state: String,
    pincode: String
  },
  location: {
    lat: Number,
    lng: Number
  },
  fcm_token: String,                      // Firebase push token
  wishlist: [ObjectId],                   // ref: products
  created_at: DateTime,
  updated_at: DateTime
}
// Indexes: email (unique), role, status
```

### 6.2 vendor_profiles

```js
{
  _id: ObjectId,
  user_id: ObjectId,                      // ref: users
  store_name: String,
  description: String,
  categories: [String],                   // ["groceries","dairy","pharmacy"]
  address: String,                        // 🔒 AES-256 encrypted
  city: String,
  state: String,
  pincode: String,
  location: {
    type: "Point",
    coordinates: [Number, Number]         // [lng, lat] — GeoJSON for $geoNear
  },
  phone: String,                          // 🔒 AES-256 encrypted
  gst_number: String,                     // 🔒 AES-256 encrypted
  bank_details: {
    account_number: String,               // 🔒 AES-256 encrypted
    ifsc: String,                         // 🔒 AES-256 encrypted
    account_name: String
  },
  open_hours: {
    monday:    { open: String, close: String },
    tuesday:   { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday:  { open: String, close: String },
    friday:    { open: String, close: String },
    saturday:  { open: String, close: String },
    sunday:    { open: String, close: String }
  },
  is_open_now: Boolean,                   // cached, updated by cron
  doc_urls: [String],                     // uploaded trade license, ID proof
  average_rating: Number,                 // computed, cached
  total_reviews: Number,
  total_reservations: Number,             // cached
  is_profile_complete: Boolean,
  created_at: DateTime,
  updated_at: DateTime
}
// Indexes: user_id (unique), location (2dsphere for geo queries)
```

### 6.3 products

```js
{
  _id: ObjectId,
  vendor_id: ObjectId,                    // ref: users
  store_id: ObjectId,                     // ref: vendor_profiles
  name: String,
  description: String,
  category: "groceries" | "dairy" | "pharmacy" | "electronics" | "clothing" | "other",
  price: Number,
  discounted_price: Number,               // null if no discount
  discount_expires_at: DateTime,
  stock: Number,                          // actual available stock
  reserved_qty: Number,                   // currently held by active reservations
  low_stock_threshold: Number,            // alert when (stock - reserved_qty) < this
  images: [String],                       // Cloudinary URLs
  is_active: Boolean,
  average_rating: Number,
  total_reviews: Number,
  total_reservations: Number,             // cached
  tags: [String],                         // for search
  barcode: String,                        // optional — for inventory scanning
  created_at: DateTime,
  updated_at: DateTime
}
// Indexes: vendor_id, category, is_active, tags (text index), name+description (text)
// Computed field: available_qty = stock - reserved_qty
```

### 6.4 reservations

```js
{
  _id: ObjectId,
  user_id: ObjectId,                      // ref: users
  vendor_id: ObjectId,                    // ref: users
  store_id: ObjectId,                     // ref: vendor_profiles
  items: [
    {
      product_id: ObjectId,
      name: String,                       // snapshot at time of reservation
      price: Number,
      quantity: Number,
      image_url: String
    }
  ],
  total_value: Number,                    // sum of price * quantity
  status: "pending" | "confirmed" | "completed" | "rejected" | "cancelled" | "expired",
  pickup_contact_phone: String,           // 🔒 AES-256 encrypted
  vendor_note: String,                    // note on confirm/reject
  is_group: Boolean,
  group_id: ObjectId,                     // ref: group_reservations (if is_group)
  expires_at: DateTime,                   // auto-expire timestamp
  confirmed_at: DateTime,
  completed_at: DateTime,
  chat_room_id: String,                   // reservation_id used as room
  created_at: DateTime,
  updated_at: DateTime
}
// Indexes: user_id, vendor_id, status, expires_at, created_at
```

### 6.5 group_reservations

```js
{
  _id: ObjectId,
  created_by: ObjectId,                   // ref: users
  store_id: ObjectId,                     // ref: vendor_profiles
  group_name: String,
  items: [
    {
      product_id: ObjectId,
      name: String,
      price: Number,
      total_quantity: Number,
      confirmed_members: Number
    }
  ],
  members: [
    {
      user_id: ObjectId,
      email: String,
      status: "invited" | "joined" | "confirmed",
      portion_qty: Number
    }
  ],
  status: "assembling" | "submitted" | "confirmed" | "completed" | "cancelled",
  total_value: Number,
  reservation_id: ObjectId,              // ref: reservations (created after all confirm)
  created_at: DateTime,
  updated_at: DateTime
}
// Indexes: created_by, store_id, status
```

### 6.6 chat_messages

```js
{
  _id: ObjectId,
  room_id: String,                        // reservation_id as room
  sender_id: ObjectId,                    // ref: users
  receiver_id: ObjectId,                  // ref: users
  message: String,
  is_read: Boolean,
  created_at: DateTime
}
// Indexes: room_id + created_at (compound), is_read
```

### 6.7 reviews

```js
{
  _id: ObjectId,
  reviewer_id: ObjectId,                  // ref: users
  target_id: ObjectId,                    // ref: vendor_profiles OR products
  target_type: "store" | "product",
  rating: Number,                         // 1–5
  comment: String,
  reservation_id: ObjectId,              // ref: reservations
  created_at: DateTime
}
// Indexes: target_id + target_type, reviewer_id
// Unique: reviewer_id + target_id + target_type (one review per target per user)
```

### 6.8 notifications

```js
{
  _id: ObjectId,
  user_id: ObjectId,                      // ref: users
  title: String,
  message: String,
  type: "reservation" | "stock" | "price_drop" | "chat" | "approval" | "system" | "emergency",
  is_read: Boolean,
  action_url: String,                     // deep link in frontend
  created_at: DateTime
}
// Indexes: user_id + is_read, created_at
```

### 6.9 wishlists

```js
{
  _id: ObjectId,
  user_id: ObjectId,                      // ref: users
  product_id: ObjectId,                   // ref: products
  notify_on_restock: Boolean,
  notify_on_price_drop: Boolean,
  price_at_add: Number,                   // to detect price drops
  created_at: DateTime
}
// Indexes: user_id, product_id
// Unique: user_id + product_id
```

### 6.10 admin_audit_log

```js
{
  _id: ObjectId,
  admin_id: ObjectId,                     // ref: users
  action: "approve" | "reject" | "deactivate" | "delete" | "flag" | "broadcast",
  target_id: ObjectId,                    // who was acted upon
  target_role: String,
  reason: String,
  metadata: Object,                       // any extra context
  created_at: DateTime
}
// Indexes: admin_id, action, created_at
// This collection is append-only — never delete or update records
```

### 6.11 transactions

```js
{
  _id: ObjectId,
  reservation_id: ObjectId,              // ref: reservations
  user_id: ObjectId,                     // ref: users
  vendor_id: ObjectId,                   // ref: users
  amount: Number,
  payment_method: "razorpay" | "stripe" | "cod",
  gateway_order_id: String,
  gateway_payment_id: String,
  status: "initiated" | "captured" | "refunded" | "failed" | "cod_pending",
  created_at: DateTime
}
// Indexes: reservation_id, user_id, vendor_id, status
```

---

## 7. API Structure

All routes prefixed with `/api/v1`

| Router | Prefix | Key endpoints | Access |
|---|---|---|---|
| Auth | `/auth` | `POST /signup`, `POST /login`, `POST /refresh`, `POST /logout` | Public |
| Users | `/users` | `GET /me`, `PUT /me`, `GET /me/notifications`, `GET /me/wishlist` | User |
| Vendors | `/vendors` | `GET /me/profile`, `PUT /me/profile`, `GET /me/analytics`, `PUT /me/availability` | Vendor |
| Products | `/products` | `GET /search` (public), `GET /nearby` (public), `POST /`, `PUT /:id`, `PUT /:id/stock`, `DELETE /:id`, `GET /mine` | Vendor (CUD) + Public (R) |
| Stores | `/stores` | `GET /nearby`, `GET /:id`, `GET /:id/products` | Public |
| Reservations | `/reservations` | `POST /`, `GET /user`, `GET /vendor`, `PUT /:id/confirm`, `PUT /:id/reject`, `PUT /:id/complete`, `PUT /:id/cancel` | User + Vendor |
| Group Reservations | `/reservations/group` | `POST /`, `GET /:id`, `PUT /:id/join`, `PUT /:id/confirm-member` | User |
| Chat | `/chat` | `GET /:room_id/history`, `WS /ws/chat/:room_id` | User + Vendor |
| Reviews | `/reviews` | `POST /`, `GET /store/:id`, `GET /product/:id` | User (write) + Public (read) |
| Notifications | `/notifications` | `GET /`, `PUT /:id/read`, `PUT /read-all` | Authenticated |
| Wishlist | `/wishlist` | `POST /`, `DELETE /:product_id`, `GET /` | User |
| Admin | `/admin` | `GET /pending`, `PUT /approve/:id`, `PUT /reject/:id`, `GET /users`, `GET /analytics`, `POST /broadcast`, `PUT /products/:id/flag` | Admin only |

---

## 8. Tech Stack

### Backend

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.12 | Runtime |
| FastAPI | 0.111+ | Web framework |
| Motor | 3.x | Async MongoDB driver |
| Pydantic v2 | 2.x | Request/response validation |
| python-jose | 3.x | JWT encode/decode |
| bcrypt | 4.x | Password hashing |
| cryptography | 41.x | AES-256 encryption/decryption |
| cloudinary | 1.x | Product image uploads |
| firebase-admin | 6.x | FCM push notifications |
| sendgrid | 6.x | Transactional email |
| googlemaps | 4.x | Geocoding + Distance Matrix API |
| slowapi | 0.1.x | Rate limiting |
| apscheduler | 3.x | Background tasks (reservation expiry, stock alerts) |
| pytest + httpx | latest | Testing |
| uvicorn | 0.29+ | ASGI server |

### Frontend (all 3 apps — identical stack)

| Tool | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | latest | Component library |
| React Query (TanStack) | 5.x | Server state, caching + offline support |
| Zustand | 4.x | Client state |
| React Router | 6.x | Routing |
| Axios | 1.x | HTTP client |
| Socket.IO client | 4.x | WebSocket (chat + notifications) |
| Recharts | 2.x | Vendor analytics charts |
| React Hook Form + Zod | latest | Form handling + validation |
| @react-google-maps/api | latest | Google Maps integration |
| date-fns | 3.x | Date utilities |
| firebase | 10.x | FCM client-side push |

### Infrastructure

| Tool | Purpose |
|---|---|
| MongoDB Atlas | Managed database (free tier to start) |
| Cloudinary | Product image storage (free tier) |
| Google Maps API | Geocoding, Distance Matrix, Map rendering |
| Firebase (FCM) | Push notifications |
| Razorpay / Stripe | Optional digital payment gateway |
| SendGrid | Email (100/day free) |
| Vercel | 3 frontend deploys |
| Railway / Render | Backend deploy |
| Docker | Local development + production containerization |
| GitHub Actions | CI/CD |

---

## 9. Folder Structure

```
proximart/                                    ← monorepo root
│
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml               ← deploys on push to backend/**
│       ├── deploy-user.yml                  ← deploys on push to frontend-user/**
│       ├── deploy-vendor.yml
│       └── deploy-admin.yml
│
├── backend/
│   ├── app/
│   │   ├── main.py                          ← FastAPI app init, router registration, CORS
│   │   ├── config.py                        ← Settings via pydantic-settings (.env)
│   │   ├── database.py                      ← Motor client + db connection
│   │   ├── dependencies.py                  ← get_current_user(), require_role()
│   │   │
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── vendors.py
│   │   │   ├── products.py
│   │   │   ├── stores.py
│   │   │   ├── reservations.py
│   │   │   ├── group_reservations.py
│   │   │   ├── chat.py
│   │   │   ├── reviews.py
│   │   │   ├── notifications.py
│   │   │   ├── wishlist.py
│   │   │   ├── admin.py
│   │   │   └── webhooks.py
│   │   │
│   │   ├── models/                          ← Pydantic schemas (request + response)
│   │   │   ├── user.py
│   │   │   ├── vendor.py
│   │   │   ├── product.py
│   │   │   ├── reservation.py
│   │   │   ├── group_reservation.py
│   │   │   ├── chat.py
│   │   │   ├── review.py
│   │   │   └── notification.py
│   │   │
│   │   ├── services/                        ← Business logic (called by routers)
│   │   │   ├── auth_service.py
│   │   │   ├── reservation_service.py
│   │   │   ├── inventory_service.py
│   │   │   ├── notification_service.py      ← FCM + in-app
│   │   │   ├── upload_service.py
│   │   │   ├── email_service.py
│   │   │   ├── maps_service.py              ← Google Maps API calls
│   │   │   └── analytics_service.py
│   │   │
│   │   ├── utils/
│   │   │   ├── jwt.py                       ← encode/decode helpers
│   │   │   ├── hashing.py                   ← bcrypt helpers
│   │   │   ├── encryption.py                ← AES-256 encrypt/decrypt helpers
│   │   │   └── validators.py                ← file type/size validators
│   │   │
│   │   ├── tasks/
│   │   │   ├── scheduler.py                 ← APScheduler setup
│   │   │   ├── expire_reservations.py       ← runs every 5 min
│   │   │   └── stock_alerts.py              ← runs on stock update events
│   │   │
│   │   └── websocket/
│   │       └── manager.py                   ← ConnectionManager for chat rooms
│   │
│   ├── tests/
│   │   ├── test_auth.py
│   │   ├── test_products.py
│   │   ├── test_reservations.py
│   │   ├── test_encryption.py
│   │   └── test_admin.py
│   │
│   ├── seed_admin.py                        ← CLI: creates admin user in DB
│   ├── .env.example
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend-user/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                          ← Routes definition
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── SignupPage.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.tsx
│   │   │   ├── search/
│   │   │   │   ├── SearchPage.tsx
│   │   │   │   └── ProductDetailPage.tsx
│   │   │   ├── map/
│   │   │   │   └── MapPage.tsx
│   │   │   ├── reservations/
│   │   │   │   └── ReservationsPage.tsx
│   │   │   ├── chat/
│   │   │   │   └── ChatPage.tsx
│   │   │   ├── wishlist/
│   │   │   │   └── WishlistPage.tsx
│   │   │   └── emergency/
│   │   │       └── EmergencyPage.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   └── BottomNav.tsx
│   │   │   ├── map/
│   │   │   │   ├── StoreMap.tsx
│   │   │   │   └── StorePin.tsx
│   │   │   ├── search/
│   │   │   ├── reservations/
│   │   │   ├── chat/
│   │   │   └── shared/
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   └── notificationStore.ts
│   │   ├── api/
│   │   │   ├── axios.ts                     ← Axios instance with interceptors
│   │   │   ├── auth.ts
│   │   │   ├── products.ts
│   │   │   ├── reservations.ts
│   │   │   └── stores.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useChat.ts                   ← Socket.IO hook
│   │   │   ├── useGeolocation.ts
│   │   │   └── useNotifications.ts
│   │   └── types/
│   │       └── index.ts                     ← Shared TypeScript interfaces
│   ├── .env.example
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── frontend-vendor/                         ← Same structure as frontend-user
│   └── src/
│       └── pages/
│           ├── auth/
│           ├── dashboard/
│           ├── products/
│           ├── reservations/
│           ├── inventory/
│           ├── analytics/
│           └── chat/
│
├── frontend-admin/                          ← Same structure
│   └── src/
│       └── pages/
│           ├── auth/
│           ├── dashboard/
│           ├── approvals/
│           ├── users/
│           ├── products/
│           └── analytics/
│
├── docker-compose.yml                       ← Local dev: backend + MongoDB
├── .gitignore
└── README.md
```

---

## 10. Git Strategy

### Branch model

```
main                ← production-ready code only
  └── develop       ← integration branch (all features merged here first)
        ├── feature/auth-jwt-aes
        ├── feature/product-search-geo
        ├── feature/reservation-system
        ├── feature/realtime-chat
        ├── feature/vendor-analytics
        ├── fix/reservation-expiry-race
        └── chore/docker-setup
```

### Branch naming convention

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/<scope>-<description>` | `feature/user-emergency-mode` |
| Bug fix | `fix/<scope>-<description>` | `fix/vendor-stock-hold-race-condition` |
| Chore | `chore/<description>` | `chore/add-eslint-config` |
| Hotfix | `hotfix/<description>` | `hotfix/aes-key-rotation` |

### Commit message convention (Conventional Commits)

```
<type>(<scope>): <short description>

Types: feat, fix, chore, docs, refactor, test, style
Scopes: backend, user, vendor, admin, shared

Examples:
feat(backend): add AES-256 encryption for sensitive fields
feat(backend): add geo-based product search with radius filter
fix(user): resolve reservation countdown timer off-by-one
chore(vendor): configure tailwind for vendor frontend
docs: update folder structure in architecture doc
test(backend): add pytest cases for reservation expiry flow
```

### Workflow

```
1. Pull latest develop
   git checkout develop && git pull origin develop

2. Create feature branch
   git checkout -b feature/reservation-system

3. Develop + commit with conventional commits

4. Push and open PR → develop
   git push origin feature/reservation-system

5. PR checklist before merge:
   - [ ] No TypeScript errors
   - [ ] No failing tests
   - [ ] .env.example updated if new env vars added
   - [ ] AES-256 encryption applied to all new sensitive fields
   - [ ] Pydantic schemas updated for new fields

6. Merge to develop (squash merge preferred)

7. When develop is stable and tested → merge to main → auto-deploy triggers
```

---

## 11. Deployment Strategy

### Local development

```bash
# Start MongoDB + backend together
docker-compose up

# Each frontend runs separately
cd frontend-user   && npm run dev    # localhost:5173
cd frontend-vendor && npm run dev    # localhost:5174
cd frontend-admin  && npm run dev    # localhost:5175
```

### docker-compose.yml (local dev)

```yaml
version: "3.9"
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    depends_on:
      - mongodb
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

volumes:
  mongo_data:
```

### Production deploys

| Service | Platform | Trigger |
|---|---|---|
| `backend/` | Railway or Render | Push to `main` — `deploy-backend.yml` |
| `frontend-user/` | Vercel (root dir: `frontend-user`) | Push to `main` — auto |
| `frontend-vendor/` | Vercel (root dir: `frontend-vendor`) | Push to `main` — auto |
| `frontend-admin/` | Vercel (root dir: `frontend-admin`) | Push to `main` — auto |

### Environment variables per service

**backend/.env**
```
MONGODB_URL=mongodb+srv://...
JWT_SECRET=your_super_secret_key_32chars
JWT_ALGORITHM=HS256
AES_SECRET_KEY=your_aes_256_key_exactly_32bytes
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GOOGLE_MAPS_API_KEY=
FIREBASE_CREDENTIALS_JSON=path/to/firebase_credentials.json
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
SENDGRID_API_KEY=
FRONTEND_USER_URL=https://app.proximart.com
FRONTEND_VENDOR_URL=https://vendor.proximart.com
FRONTEND_ADMIN_URL=https://admin.proximart.com
```

**frontend-*/. env**
```
VITE_API_URL=https://api.proximart.com/api/v1
VITE_WS_URL=wss://api.proximart.com
VITE_GOOGLE_MAPS_API_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_PROJECT_ID=
VITE_RAZORPAY_KEY_ID=rzp_live_...
```

---

*Last updated: April 2026*