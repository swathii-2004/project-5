from datetime import datetime
from fastapi import HTTPException, UploadFile
from bson import ObjectId
from app.models.user import UserSignupUser, UserSignupVendor, UserLogin
from app.utils.hashing import hash_password, verify_password
from app.utils.encryption import encrypt
from app.services.upload_service import upload_to_cloudinary

async def signup_user(data: UserSignupUser, db) -> dict:
    existing_user = await db.users.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed = hash_password(data.password)
    encrypted_phone = encrypt(data.phone)
    now = datetime.utcnow()
    
    doc = {
        "name": data.name,
        "email": data.email,
        "hashed_password": hashed,
        "phone": encrypted_phone,
        "role": "user",
        "status": "active",
        "avatar_url": None,
        "fcm_token": None,
        "wishlist": [],
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc

async def signup_vendor(data: UserSignupVendor, files: list[UploadFile], db) -> dict:
    existing_user = await db.users.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    doc_urls = []
    for file in files:
        url = await upload_to_cloudinary(file, folder="proximart/vendor_docs")
        doc_urls.append(url)
        
    hashed = hash_password(data.password)
    encrypted_phone = encrypt(data.phone)
    encrypted_gst = encrypt(data.gst_number)
    now = datetime.utcnow()
    
    user_doc = {
        "name": data.name,
        "email": data.email,
        "hashed_password": hashed,
        "phone": encrypted_phone,
        "role": "vendor",
        "status": "pending",
        "avatar_url": None,
        "fcm_token": None,
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = result.inserted_id
    user_doc["_id"] = user_id
    
    vendor_doc = {
        "user_id": user_id,
        "store_name": data.store_name,
        "gst_number": encrypted_gst,
        "city": data.city,
        "doc_urls": doc_urls,
        "is_profile_complete": False,
        "average_rating": 0,
        "total_reviews": 0,
        "total_reservations": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.vendor_profiles.insert_one(vendor_doc)
    return user_doc

async def login(data: UserLogin, db) -> dict:
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")
        
    if user.get("status") == "pending":
        raise HTTPException(status_code=403, detail="Your account is awaiting admin approval")
    if user.get("status") == "rejected":
        raise HTTPException(status_code=403, detail="Your application was rejected. Please resubmit.")
    if user.get("status") == "deactivated":
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")
        
    if not verify_password(data.password, user.get("hashed_password")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    return user
