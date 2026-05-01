# ProxiMart — Phase Progress Tracker

> Mark tasks as completed by changing `- [ ]` to `- [x]`  
> Each phase ends with a working, demo-able state.  
> **Total estimated time: ~15 weeks**

---

## Progress Overview

| Phase | Title | Status | Duration |
|---|---|---|---|
| Phase 1 | Foundation & Auth | 🔲 Not started | 2 weeks |
| Phase 2 | Admin Panel & Vendor Approval System | 🔲 Not started | 1.5 weeks |
| Phase 3 | Product Listings & Inventory Management | 🔲 Not started | 2 weeks |
| Phase 4 | Reservation System | 🔲 Not started | 2 weeks |
| Phase 5 | Maps, Location & Smart Search | 🔲 Not started | 1.5 weeks |
| Phase 6 | Realtime Chat & Push Notifications | 🔲 Not started | 1.5 weeks |
| Phase 7 | Dashboards, Analytics & All Improvements | 🔲 Not started | 2 weeks |
| Phase 8 | Testing, Security & Deployment | 🔲 Not started | 2 weeks |

> Update the status column as you go: `🔲 Not started` → `🔄 In progress` → `✅ Completed`

---

## Phase 1 — Foundation & Auth

> **Goal:** Project skeleton, database, JWT auth for all roles, AES-256 encryption layer, document upload on vendor signup, admin seed script.  
> **Milestone:** All 3 roles can register and login correctly end-to-end. Sensitive fields encrypted in DB.

### Backend

#### Project setup
- [ ] Initialize FastAPI project inside `backend/`
- [ ] Configure `requirements.txt` with all dependencies
- [ ] Set up `app/config.py` with pydantic-settings reading from `.env`
- [ ] Set up `app/database.py` — Motor async MongoDB connection
- [ ] Set up `app/main.py` — FastAPI app init, CORS, router registration
- [ ] Create `.env.example` with all required variable names (including `AES_SECRET_KEY`)

#### AES-256 encryption utility
- [ ] Create `utils/encryption.py` — AES-256-CBC encrypt/decrypt helpers
- [ ] `encrypt(plain_text: str) -> str` — generates random IV, returns `"b64iv:b64ciphertext"`
- [ ] `decrypt(cipher_text: str) -> str` — splits IV, decrypts, returns plain text
- [ ] Unit test: encrypt then decrypt round-trip returns original string
- [ ] Unit test: two encryptions of the same string produce different ciphertexts (random IV)
- [ ] `AES_SECRET_KEY` must be exactly 32 bytes — validate on app startup, crash if invalid

#### Auth — User signup/login
- [ ] Create `users` collection schema and Pydantic models
- [ ] `POST /auth/signup` — user role, bcrypt hash, encrypt phone + address (AES-256), status: active, return JWT
- [ ] `POST /auth/login` — verify password, check status, return access + refresh tokens
- [ ] `POST /auth/refresh` — validate refresh token from httpOnly cookie, issue new access token
- [ ] `POST /auth/logout` — clear httpOnly cookie
- [ ] JWT utility: `encode_token()` and `decode_token()` in `utils/jwt.py`
- [ ] `get_current_user()` dependency in `dependencies.py`
- [ ] `require_role(["vendor"])` role guard in `dependencies.py`

#### Auth — Vendor signup with document upload
- [ ] `POST /auth/signup` handles `multipart/form-data` for vendor role
- [ ] File validator: accept only PDF, JPG, PNG; reject if > 5MB (server-side MIME check)
- [ ] Upload validated documents to Cloudinary, save URLs to DB
- [ ] Encrypt phone, address, GST number (AES-256) before saving
- [ ] Vendor status set to `"pending"` on signup
- [ ] Login returns `403` with clear message if status is `"pending"` or `"rejected"`

#### Admin seed script
- [ ] `seed_admin.py` CLI script that creates an admin user in MongoDB
- [ ] Script checks if admin already exists before creating (idempotent)
- [ ] Document how to run it in README

### Frontend — All 3 apps

#### Project setup (repeat for each frontend)
- [ ] `frontend-user` — Vite + React TS + Tailwind + shadcn/ui initialized
- [ ] `frontend-vendor` — same setup
- [ ] `frontend-admin` — same setup
- [ ] Axios instance with base URL from `VITE_API_URL` and request interceptor that attaches JWT
- [ ] Axios response interceptor: on 401 → call `/auth/refresh` → retry original request → on refresh fail → logout
- [ ] `authStore.ts` (Zustand) — stores `user`, `token`, `isAuthenticated`
- [ ] Protected route wrapper component that redirects to login if not authenticated

#### User app — Auth UI
- [ ] Login page with email/password form + Zod validation
- [ ] Signup page with: name, email, password, confirm password, phone
- [ ] Show toast on login error / success
- [ ] Redirect to dashboard on successful login

#### Vendor app — Auth UI
- [ ] Login page
- [ ] Signup page with: store name, owner name, email, password, phone, GST number, city
- [ ] Document upload field: trade license + ID proof, accepts PDF/JPG/PNG, max 5MB client-side check
- [ ] Show "Awaiting admin approval" message after successful signup
- [ ] Show specific message if login is attempted while still pending

#### Admin app — Auth UI
- [ ] Login page only — no signup route exists
- [ ] Show error message if credentials are wrong

### Infrastructure
- [ ] `docker-compose.yml` — MongoDB + backend containers for local dev
- [ ] Backend `Dockerfile`
- [ ] Root `.gitignore` covering Python, Node, env files, OS artifacts
- [ ] Root `README.md` with setup instructions for local development
- [ ] `develop` branch created from `main`

---

## Phase 2 — Admin Panel & Vendor Approval System

> **Goal:** Admin can review uploaded documents, approve or reject vendor registrations, manage users.  
> **Milestone:** Full approval loop — vendor signs up → admin approves → vendor can log in.

### Backend

#### Approval endpoints
- [ ] `GET /admin/pending?role=vendor` — list all pending vendor applications with document URLs
- [ ] `PUT /admin/approve/:user_id` — set status to `"active"`, log in admin_audit_log
- [ ] `PUT /admin/reject/:user_id` `{ reason }` — set status to `"rejected"`, log in admin_audit_log
- [ ] Decrypt GST number before returning in admin-only pending detail endpoint
- [ ] Send approval email via SendGrid on approve
- [ ] Send rejection email with reason via SendGrid on reject
- [ ] `admin_audit_log` collection — append-only, written on every admin action
- [ ] All admin endpoints protected by `require_role(["admin"])`

#### User management endpoints
- [ ] `GET /admin/users?role=&search=&page=` — paginated user list with filters
- [ ] `PUT /admin/users/:id/deactivate` — set status to `"deactivated"`
- [ ] `PUT /admin/users/:id/reactivate` — set status back to `"active"`
- [ ] `DELETE /admin/users/:id` — hard delete with audit log entry
- [ ] `PUT /admin/products/:id/flag` — flag inappropriate listing
- [ ] `DELETE /admin/products/:id` — remove listing with audit log entry

#### Platform stats
- [ ] `GET /admin/analytics/overview` — total users, active vendors, pending vendors, total products, total reservations today, platform-wide completion rate

### Frontend — Admin app

#### Layout
- [ ] Sidebar navigation: Dashboard, Pending Approvals, Users, Products, Analytics
- [ ] Top bar with admin name and logout button
- [ ] Active route highlighting in sidebar

#### Pending approvals page
- [ ] Card list of pending vendor applications: store name, owner, email, submission date, time waiting
- [ ] Amber highlight on applications waiting > 48 hours
- [ ] Red highlight on applications waiting > 72 hours
- [ ] "View Documents" button opens a modal

#### Document viewer modal
- [ ] Inline PDF viewer for PDF documents (use `<iframe>` or `react-pdf`)
- [ ] Image viewer for JPG/PNG documents
- [ ] Document checklist inside modal (checkboxes admin ticks before approving)
- [ ] "Approve" button → confirm dialog → calls approve endpoint → refreshes list
- [ ] "Reject" button → modal with required reason text field → calls reject endpoint

#### User management page
- [ ] Searchable, filterable table: name, email, role, status, joined date
- [ ] Deactivate / Reactivate action per row with confirm dialog

#### Analytics overview
- [ ] Stat cards: total users, active vendors, pending approvals, total reservations today
- [ ] No charts yet — charts come in Phase 7

### Email templates (SendGrid)
- [ ] Approval email: "Congratulations, your vendor account has been approved. You can now log in."
- [ ] Rejection email: "Your application was not approved. Reason: [reason]. You may resubmit with updated documents."

---

## Phase 3 — Product Listings & Inventory Management

> **Goal:** Vendors can manage product listings and stock. Users can browse and view products.  
> **Milestone:** Vendor adds products. User can browse and view product detail with live stock info.

### What Phase 3 builds

Vendors can create and manage product listings with images. Users can browse, search, and view products with live stock info. Wishlist system added.

### Build order

1. **Backend first:**
   - Vendor profile endpoints (`GET/PUT /vendors/me/profile`) with AES-256 re-encryption on update + Google Maps geocoding on address save
   - Product CRUD (`POST`, `GET`, `PUT`, `DELETE /products`) with Cloudinary image upload
   - Stock update endpoint (`PUT /products/:id/stock`)
   - Public product search with text index (`GET /products?category=&search=&page=`)
   - Public product detail (`GET /products/:id`) with `available_qty = stock - reserved_qty`
   - Wishlist endpoints (`POST/DELETE/GET /wishlist`)
   - Read-only reviews endpoints (`GET /reviews/product/:id`, `GET /reviews/store/:id`)
   - 2dsphere index on `vendor_profiles.location` confirmed in `database.py`

2. **Frontend — Vendor app:**
   - Products page: table with image thumbnail, stock level, low-stock amber highlight
   - Add/Edit product form: name, description, category, price, stock, threshold, multi-image upload (up to 5)
   - Inventory page: stock level table with inline update per row, low-stock banner

3. **Frontend — User app:**
   - Browse/Search page: category filter tabs, debounced search, product cards with stock badge
   - Product detail page: image gallery, price, available stock, Reserve button (placeholder for Phase 4), Add to Wishlist toggle
   - Wishlist page

### Backend

#### Vendor profile
- [ ] `GET /vendors/me/profile` — get own profile (decrypt sensitive fields before returning)
- [ ] `PUT /vendors/me/profile` — update store details, re-encrypt sensitive fields, geocode address
- [ ] `vendor_profiles` collection with all fields from schema
- [ ] 2dsphere index on `location` field for geo queries
- [ ] `maps_service.py` — geocode address on profile save using Google Maps API

#### Product CRUD
- [ ] `POST /products` — create product with image upload to Cloudinary (vendor only)
- [ ] `GET /products/mine` — list own products with pagination and stock status
- [ ] `PUT /products/:id` — update product, vendor can only update own products
- [ ] `PUT /products/:id/stock` — update stock quantity (increments reserved_qty logic checked)
- [ ] `DELETE /products/:id` — soft delete (`is_active = false`)
- [ ] `GET /products` — public listing with query params: `category`, `search`, `page`
- [ ] `GET /products/:id` — public product detail with available_qty computed field
- [ ] Text index on `name` + `description` + `tags` for full-text search
- [ ] Low stock detection: flag in response if `(stock - reserved_qty) < low_stock_threshold`

#### Wishlist
- [ ] `POST /wishlist` — add product to wishlist with `notify_on_restock` and `notify_on_price_drop` flags
- [ ] `DELETE /wishlist/:product_id` — remove from wishlist
- [ ] `GET /wishlist` — list user's wishlisted products

#### Reviews (read only — write comes with reservations in Phase 4)
- [ ] `GET /reviews/product/:id` — list reviews for a product
- [ ] `GET /reviews/store/:id` — list reviews for a store

### Frontend — Vendor app

#### Layout
- [ ] Sidebar: Dashboard, Products, Reservations (empty for now), Inventory, Analytics (empty)
- [ ] Dashboard shows placeholder stat cards

#### Products page
- [ ] Product list table: image thumbnail, name, category, price, available stock, status, actions
- [ ] Low-stock rows highlighted in amber
- [ ] "Add Product" button opens side drawer or modal form

#### Add/Edit product form
- [ ] Fields: name, description, category (select), price, stock, low_stock_threshold, tags
- [ ] Multi-image upload: up to 5 images, preview thumbnails, remove individual images
- [ ] Zod form validation
- [ ] Success toast on save

#### Inventory page
- [ ] Stock level table for all products: name, current stock, reserved qty, available qty
- [ ] Inline "Update Stock" input per product row
- [ ] Low-stock alert banner at top if any product is below threshold

### Frontend — User app

#### Browse / Search page (basic, without geo — geo search comes in Phase 5)
- [ ] Category filter tabs: All / Groceries / Dairy / Pharmacy / Electronics / Clothing
- [ ] Search bar with debounced API call
- [ ] Product cards: image, name, store name, price, available stock badge
- [ ] Pagination

#### Product detail page
- [ ] Image gallery (multiple images)
- [ ] Name, description, price, available stock
- [ ] Store name + city
- [ ] "Reserve" button (leads to Phase 4)
- [ ] "Add to Wishlist" button with toggle
- [ ] Reviews section (read only)

---

## Phase 4 — Reservation System

> **Goal:** Users can reserve products at stores. Vendors confirm or reject. Expiry auto-handled.  
> **Milestone:** User reserves → Vendor confirms → User picks up → Status updates end-to-end.

### Backend

#### Reservation creation
- [ ] `POST /reservations` — validate stock, encrypt `pickup_contact_phone` (AES-256), create reservation with `expires_at = now + 30 min`, increment `reserved_qty` on product
- [ ] Stock check: if `(stock - reserved_qty) < requested_quantity` → return `400` with which product
- [ ] Notify vendor via FCM push (firebase-admin) + WebSocket on new reservation
- [ ] `transactions` collection — create record for each reservation with payment method

#### Reservation management
- [ ] `GET /reservations/user` — user's own reservations with pagination and status filter
- [ ] `GET /reservations/vendor` — vendor's incoming reservations with pagination and status filter
- [ ] `PUT /reservations/:id/confirm` — status = "confirmed", extend `expires_at` to now + 2 hours, notify user via FCM
- [ ] `PUT /reservations/:id/reject` `{ reason }` — status = "rejected", release `reserved_qty`, notify user via FCM
- [ ] `PUT /reservations/:id/complete` — status = "completed", decrement actual stock, release `reserved_qty`, trigger review nudge
- [ ] `PUT /reservations/:id/cancel` — user cancels (only if status is pending or confirmed), release `reserved_qty`

#### Reservation expiry (background task)
- [ ] `tasks/expire_reservations.py` — APScheduler job runs every 5 minutes
- [ ] Find all reservations where `status = "pending"` and `expires_at < now` → set status = "expired", release `reserved_qty`
- [ ] Find all reservations where `status = "confirmed"` and `expires_at < now` → set status = "expired", release `reserved_qty`
- [ ] Notify user via FCM on expiry

#### Group reservation
- [ ] `POST /reservations/group` — create group reservation, send invite emails via SendGrid
- [ ] `PUT /reservations/group/:id/join` — member joins and sets their portion quantity
- [ ] `PUT /reservations/group/:id/confirm-member` — member confirms their portion
- [ ] When all members confirmed → auto-create single consolidated `reservations` doc → notify vendor

#### Reviews (after completion)
- [ ] After reservation status = "completed", user can submit product and store review
- [ ] `POST /reviews` with `target_type: "product" | "store"`, `reservation_id`
- [ ] One review per reservation per target enforced
- [ ] Review nudge banner shown in user's reservations page after completion
- [ ] Update `average_rating` + `total_reviews` on product and vendor_profile after review

### Frontend — User app

#### Reservation flow
- [ ] "Reserve" button on product detail → opens reservation modal
- [ ] Modal: quantity selector, pickup contact phone (pre-filled from profile), confirm button
- [ ] Client-side phone validation (Zod)
- [ ] On success → navigate to My Reservations with success toast

#### My Reservations page
- [ ] List of reservations with status badge
- [ ] Countdown timer for confirmed reservations (pickup window)
- [ ] Per-reservation: product name, store name, quantity, total value, status
- [ ] "Cancel" button (only if pending or confirmed)
- [ ] "Get Directions" button → opens Google Maps link to store address
- [ ] "Chat with Vendor" button (unlocked for active reservations — Phase 6)
- [ ] Review form shown after completion

#### Group Reservation page
- [ ] "Start Group Reservation" button on product detail
- [ ] Group name input + invite emails (comma separated)
- [ ] Group status tracker: members invited / joined / confirmed

### Frontend — Vendor app

#### Reservations page
- [ ] Reservation table with tabs: Pending / Confirmed / Completed / Rejected
- [ ] New reservation notification badge
- [ ] Per-reservation: user name, product, quantity, total value, time received
- [ ] "Confirm" button with confirm dialog
- [ ] "Reject" button with required reason text field
- [ ] "Mark as Completed" button (when user arrives to collect)

---

## Phase 5 — Maps, Location & Smart Search

> **Goal:** Geo-based product discovery, live map view, distance-ranked results, emergency mode.  
> **Milestone:** User finds products within a radius on map + list view. Emergency mode works.

### Backend

#### Geo search
- [ ] `GET /products/search?q=&lat=&lng=&radius_km=&sort=&available_now=&page=` — MongoDB `$geoNear` aggregation using 2dsphere index on vendor_profiles
- [ ] Sort options: `distance` (Haversine), `price` (ascending), `rating` (descending)
- [ ] `available_now=true` filters `(stock - reserved_qty) > 0`
- [ ] Response includes `distance_km` per result
- [ ] `GET /stores/nearby?lat=&lng=&radius_km=&product_q=` — returns stores with coordinates + matching product count
- [ ] `GET /vets/:id/availability?date=` equivalent: `GET /stores/:id/products` — all active products for a store
- [ ] Google Maps Distance Matrix API call in `maps_service.py` for accurate road distance (used on demand, not bulk)

#### Emergency mode
- [ ] `GET /products/emergency?q=&lat=&lng=&radius_km=` — same as search but radius defaults to 10 km, sorted strictly by distance, only in-stock results

### Frontend — User app

#### Search page (enhanced with geo)
- [ ] Location permission prompt on first visit
- [ ] Radius slider: 1 km / 2 km / 5 km / 10 km
- [ ] Sort controls: Nearest / Lowest Price / Highest Rated
- [ ] "Available Now" toggle filter
- [ ] Distance badge on each product card

#### Live Map page
- [ ] Google Maps rendered with user location centered
- [ ] Store pins loaded via `GET /stores/nearby`
- [ ] Pin color: green (in stock) / amber (low stock) / grey (no stock)
- [ ] Clicking pin opens bottom drawer: store name, address, product count, "View Products" button
- [ ] Search bar on map overlaid — typing updates pins in real time

#### Multi-store comparison
- [ ] Product search results grouped by store
- [ ] Side-by-side comparison card: store name, price, distance, rating, stock level
- [ ] "Best deal" badge on lowest price result
- [ ] "Nearest" badge on closest result

#### Emergency mode page
- [ ] Toggle switch in navbar → opens Emergency Mode overlay
- [ ] Prominent search field: "What do you urgently need?"
- [ ] Results sorted by distance, only in-stock, expanded radius
- [ ] One-tap "Get Directions" per result

#### Offline lite mode
- [ ] React Query `staleTime` + `cacheTime` configured to cache last results
- [ ] `navigator.onLine` check → if offline, show cached results with "Last updated X ago" banner
- [ ] Reserve button disabled when offline

---

## Phase 6 — Realtime Chat & Push Notifications

> **Goal:** Live chat between user and vendor on active reservations. FCM push + in-app notifications.  
> **Milestone:** Messages delivered in real-time. FCM push received on mobile/browser. In-app bell works.

### Backend

#### WebSocket chat server
- [ ] `ConnectionManager` class in `websocket/manager.py` — manages rooms
- [ ] `WebSocket /ws/chat/{reservation_id}` endpoint
- [ ] Authenticate WS connection via token query param `?token=<access_token>`
- [ ] Validate that connecting user is either the reserver or the vendor of that reservation
- [ ] Validate reservation status is `"pending"`, `"confirmed"`, or `"completed"` — close socket otherwise
- [ ] On connect: join room, send last 50 messages as history
- [ ] On message receive: save to `chat_messages` collection, broadcast to all sockets in room
- [ ] On disconnect: remove from room
- [ ] `GET /chat/:reservation_id/history` — paginated message history

#### Push notifications (FCM)
- [ ] `firebase-admin` SDK initialized in `services/notification_service.py`
- [ ] `send_push(user_id, title, body, data)` helper — looks up `fcm_token` from user, sends via FCM
- [ ] FCM push sent on: reservation confirmed, reservation rejected, reservation expiring (15 min warning), expiry, price drop on wishlist, back-in-stock on wishlist, reservation completed
- [ ] Notification doc created in `notifications` collection on every push event

#### In-app notification service
- [ ] `GET /notifications` — paginated, sorted by newest first
- [ ] `PUT /notifications/:id/read` — mark single as read
- [ ] `PUT /notifications/read-all` — mark all as read
- [ ] Unread count returned in `GET /users/me` response

### Frontend — User app

#### Chat page
- [ ] List of active chats (reservations with active status)
- [ ] Message bubble layout: own messages right-aligned, vendor messages left-aligned
- [ ] Timestamps per message
- [ ] Unread message indicator per chat
- [ ] Auto-scroll to latest message on new message
- [ ] "Send" on Enter key
- [ ] Reconnect logic with exponential backoff

#### Push notification setup (user app)
- [ ] Firebase SDK initialized in `main.tsx`
- [ ] Request notification permission on login
- [ ] `fcm_token` sent to backend `PUT /users/me` on token refresh
- [ ] Service worker (`firebase-messaging-sw.js`) for background push

#### In-app notification bell (all apps)
- [ ] Bell icon in navbar with unread count badge
- [ ] Dropdown: list of recent notifications with title, message, time ago
- [ ] Click notification → navigate to `action_url`
- [ ] "Mark all as read" button

### Frontend — Vendor app

#### Chat page
- [ ] Same structure as user chat page
- [ ] Chat list shows customer name + product name per reservation

#### Push notification setup (vendor app)
- [ ] Same FCM setup as user app
- [ ] Vendor receives push for: new reservation, chat message, group reservation assembled

---

## Phase 7 — Dashboards, Analytics & All Improvements

> **Goal:** Complete all 3 dashboards with charts and analytics. Add all remaining feature improvements.  
> **Milestone:** All dashboards live with real data and meaningful visualisations.

### Backend — New analytics endpoints

- [ ] `GET /users/me/dashboard` — upcoming reservations + wishlist price-drop alerts
- [ ] `GET /vendors/me/analytics` — total reservations, completion rate, top products, peak hours, demand forecast, revenue estimate
- [ ] `GET /vendors/me/analytics/chart?period=week|month` — daily reservation counts for charting
- [ ] `GET /admin/analytics/overview` — global stats: total revenue, total reservations, total users, active vendors, platform completion rate

### User dashboard
- [ ] Home page dashboard instead of redirecting to search
- [ ] Active reservations widget with countdown timers
- [ ] Wishlist price-drop alerts widget
- [ ] Quick navigation links: Search, Map, Emergency Mode
- [ ] "Nearby stores" preview strip (3 closest stores)

### Vendor dashboard
- [ ] Today's reservation request counter
- [ ] Pending reservations counter
- [ ] Total completed reservations counter
- [ ] Revenue estimate (completed reservation values this month)
- [ ] Low-stock product alerts strip
- [ ] Profile/Store status overview

### Vendor analytics page
- [ ] Line chart: daily reservation trend (Recharts)
- [ ] Bar chart: top 5 most reserved products
- [ ] Heatmap or bar chart: peak booking hours
- [ ] Completion rate donut chart
- [ ] Demand forecast list: products trending upward

### Admin dashboard
- [ ] Real-time total reservations via MongoDB aggregation
- [ ] Total active users and vendors
- [ ] Platform-wide completion rate
- [ ] Recent reservations table (global)
- [ ] Pending approvals count with quick-link to approvals page
- [ ] Visual stat cards with modern design

### AI-based recommendation (basic)
- [ ] `GET /products/recommended?lat=&lng=` — returns products based on: user's past reservations (category affinity), trending products in user's city, wishlist categories
- [ ] Recommendation strip on user dashboard: "Popular near you"
- [ ] Backend: simple aggregation-based logic (no ML dependency) — most reserved in city × category match

---

## Phase 8 — Testing, Security & Deployment

> **Goal:** Secure the platform end-to-end, write comprehensive tests, containerise, and deploy to production.  
> **Milestone:** Platform live on production URL, all roles functional, AES-256 verified, fully secured.

### Security hardening

#### Authentication & tokens
- [ ] Rate limiting on `POST /auth/login`: max 10 attempts per IP per minute (slowapi)
- [ ] Rate limiting on `POST /auth/signup`: max 5 requests per IP per minute
- [ ] Rate limiting on `POST /auth/refresh`: max 20 requests per IP per minute
- [ ] JWT payload must contain only `user_id` and `role` — no password, no phone, no bank details
- [ ] Refresh token stored exclusively in httpOnly, Secure, SameSite=Strict cookie — never in localStorage
- [ ] Access token expiry validated server-side on every request — no clock-skew tolerance beyond 30 seconds

#### AES-256 encryption verification
- [ ] Verify all sensitive fields are encrypted in MongoDB: run `db.users.findOne()` in Atlas shell — `phone` and `address.line1` must show `"b64iv:b64ciphertext"` format, not plain text
- [ ] Verify `vendor_profiles`: `phone`, `gst_number`, `bank_details.account_number`, `bank_details.ifsc` all encrypted
- [ ] Verify `reservations`: `pickup_contact_phone` encrypted
- [ ] `AES_SECRET_KEY` must be exactly 32 bytes — add startup assertion in `app/main.py` that crashes with a clear error if key length is wrong
- [ ] AES key must never appear in logs, error messages, or API responses
- [ ] Write a test `tests/test_encryption.py` that verifies: encrypt → store → retrieve → decrypt returns original plaintext for each sensitive field
- [ ] Key rotation plan documented in README: if `AES_SECRET_KEY` must change, a migration script must re-encrypt all existing fields

#### File upload security
- [ ] Validate MIME type server-side using `python-magic` (not just file extension)
- [ ] Enforce file size limit server-side: reject any upload > 5MB regardless of client-side check
- [ ] Reject files with mismatched extension and MIME type (e.g. a `.jpg` that is actually a `.exe`)
- [ ] Scan Cloudinary upload response — if Cloudinary rejects the file, return `400` to client

#### API & input security
- [ ] Pydantic v2 strict mode on all request models — `model_config = ConfigDict(extra="forbid")`
- [ ] No extra fields accepted on any endpoint — excess fields return `422`
- [ ] MongoDB queries use parameterised Motor calls — never string-interpolate user input into queries
- [ ] All admin endpoints double-checked to require `require_role(["admin"])` — write a test that calls each admin endpoint with a user token and expects `403`
- [ ] `admin_audit_log` verified append-only: confirm no `PUT` or `DELETE` routes exist for this collection
- [ ] CORS config in production: restrict `allow_origins` to exact frontend URLs — no wildcard
- [ ] `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` headers added via FastAPI middleware
- [ ] Razorpay / Stripe webhook: verify signature header on every incoming webhook request — reject with `403` if invalid

#### Infrastructure security
- [ ] MongoDB Atlas: create a dedicated DB user with read/write access to only the `proximart` database — no admin privileges
- [ ] MongoDB Atlas: enable IP allowlist — only backend server IP permitted
- [ ] All secrets (`JWT_SECRET`, `AES_SECRET_KEY`, API keys) stored as environment variables — never hardcoded
- [ ] Run `git log --all --full-history -- "*.env"` to confirm no `.env` file was ever committed
- [ ] `AES_SECRET_KEY` and `JWT_SECRET` must be different values

### Testing — Backend

- [ ] `tests/test_auth.py` — signup (user, vendor), login (active, pending, rejected, deactivated), token refresh, logout, rate limit triggers at 11th attempt
- [ ] `tests/test_encryption.py` — encrypt/decrypt round-trip for each sensitive field type, wrong key raises error, corrupted ciphertext raises error, all sensitive fields in DB are stored encrypted
- [ ] `tests/test_admin.py` — approve vendor, reject vendor, deactivate user, all endpoints return `403` for non-admin tokens
- [ ] `tests/test_products.py` — CRUD, vendor can only edit own products, soft delete works, text search returns relevant results
- [ ] `tests/test_reservations.py` — create reservation (stock held), confirm, reject (stock released), cancel (stock released), expiry task releases stock, double-booking prevented, group reservation assembled correctly
- [ ] `tests/test_geo_search.py` — products within radius returned, products outside radius excluded, `available_now` filter works, sort by distance correct
- [ ] `tests/test_reviews.py` — post review, one-per-reservation-per-target enforced, rating average updated on product and store after review
- [ ] All tests use a separate test MongoDB database (`MONGO_TEST_DB`) set in test config
- [ ] 80%+ coverage on routers and services

### Testing — Frontend

- [ ] All Zod schemas tested: valid input passes, invalid input fails with correct message
- [ ] Auth store tested: login sets token, logout clears state
- [ ] Reservation countdown timer tested: counts down correctly, shows "Expired" at zero
- [ ] Axios interceptor tested: 401 triggers refresh, refresh failure triggers logout
- [ ] Offline lite mode tested: cached results shown when `navigator.onLine = false`, Reserve button disabled

### CI/CD

- [ ] `.github/workflows/deploy-backend.yml` — on push to `main` where `backend/**` changed → run pytest → if pass deploy to Railway/Render, if fail block deploy
- [ ] `.github/workflows/deploy-user.yml` — on push to `main` where `frontend-user/**` changed → Vercel deploy
- [ ] Same workflow for vendor and admin frontends
- [ ] Tests must pass in CI before deploy step runs — `pytest --cov=app --cov-fail-under=80`
- [ ] All environment secrets (`JWT_SECRET`, `AES_SECRET_KEY`, `GOOGLE_MAPS_API_KEY`, `FIREBASE_CREDENTIALS_JSON`, etc.) stored as GitHub Secrets, not in repo
- [ ] Workflow validates `AES_SECRET_KEY` length == 32 before deploying

### Production deployment

- [ ] MongoDB Atlas cluster created (M0 free tier is fine to start) with 2dsphere index on `vendor_profiles.location` confirmed
- [ ] Cloudinary account set up, credentials added to env
- [ ] Google Maps API key created with HTTP referrer restrictions (only backend domain)
- [ ] Firebase project created, FCM enabled, `firebase_credentials.json` added as env secret
- [ ] Razorpay or Stripe account verified, keys added to env
- [ ] SendGrid account set up, sender domain verified
- [ ] Backend deployed to Railway or Render with all env vars set
- [ ] Backend health check endpoint `GET /health` returns `200 OK` with `{ "status": "ok" }`
- [ ] All 3 frontends deployed to Vercel with correct root directories and env vars
- [ ] CORS on backend updated to production frontend URLs only
- [ ] Admin seed script run on production DB to create admin account
- [ ] APScheduler reservation expiry job confirmed running (check logs 10 min after deploy)
- [ ] End-to-end smoke test on production: sign up as user → sign up as vendor → admin approves → vendor adds product → user searches by location → reserves → vendor confirms → user completes pickup

### Post-deploy checklist

- [ ] All 3 login pages accessible at their respective domains
- [ ] Admin can log in and see dashboard
- [ ] Vendor can sign up and upload documents
- [ ] Admin can approve vendor → vendor can log in
- [ ] User can search products by location and see distance results
- [ ] Map page renders with store pins
- [ ] Reservation flow works end-to-end
- [ ] Vendor confirms reservation → user receives FCM push notification
- [ ] Chat connects and messages deliver in real-time
- [ ] Reservation expiry job fires — expired reservations update status and release stock
- [ ] Email delivery confirmed (approval email, rejection email, group invite)
- [ ] AES-256: verify in Atlas shell that sensitive fields are stored encrypted, not in plain text
- [ ] No console errors in any frontend on first load
- [ ] Emergency mode returns results sorted by distance only

---

## Bugs & Issues Log

> Use this section to track bugs as you encounter them during development.

| # | Description | Phase found | Status |
|---|---|---|---|
| — | — | — | — |

---

## Notes

> Free-form notes, decisions, and things to revisit.

- AES_SECRET_KEY must be generated securely: `python -c "import secrets; print(secrets.token_hex(16))"` produces a 32-character hex string suitable as the key.
- Google Maps Distance Matrix API has per-call costs — use Haversine formula for bulk list sorting, call Distance Matrix only when user requests directions or exact road distance on a single store.
- Firebase FCM tokens expire — implement `PUT /users/me/fcm-token` endpoint called on every app foreground event to keep tokens fresh.

---

*Keep this file updated as you build. Every completed checkbox is progress.*