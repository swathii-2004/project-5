import asyncio
from datetime import datetime
import math
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from app.database import get_db
from app.dependencies import require_role
from app.models.admin import RejectRequest
from app.services.admin_service import log_admin_action
from app.services.email_service import send_approval_email, send_rejection_email
from app.utils.encryption import decrypt
from app.config import settings

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(require_role(["admin"]))])

@router.get("/pending")
async def get_pending(role: str = "vendor", db=Depends(get_db)):
    users = await db.users.find({"role": role, "status": "pending"}).to_list(100)
    result = []
    for user in users:
        hours_waiting = (datetime.utcnow() - user["created_at"]).total_seconds() / 3600
        vendor_profile = await db.vendor_profiles.find_one({"user_id": user["_id"]})
        
        doc_urls = vendor_profile.get("doc_urls", []) if vendor_profile else []
        store_name = vendor_profile.get("store_name", "") if vendor_profile else ""
        city = vendor_profile.get("city", "") if vendor_profile else ""
        
        result.append({
            "user_id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "store_name": store_name,
            "city": city,
            "doc_urls": doc_urls,
            "created_at": user["created_at"],
            "hours_waiting": hours_waiting
        })
    result.sort(key=lambda x: x["created_at"])
    return result

@router.put("/approve/{user_id}")
async def approve_user(user_id: str, admin: dict = Depends(require_role(["admin"])), db=Depends(get_db)):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user: raise HTTPException(404, "User not found")
    if user.get("status") != "pending": raise HTTPException(400, "This application is not pending")
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"status": "active", "updated_at": datetime.utcnow()}})
    await log_admin_action(admin["_id"], "approve", ObjectId(user_id), user["role"], db)
    await send_approval_email(user["email"], user["name"], settings.FRONTEND_VENDOR_URL + "/login")
    return {"message": "Vendor approved successfully", "user_id": user_id}

@router.put("/reject/{user_id}")
async def reject_user(user_id: str, data: RejectRequest, admin: dict = Depends(require_role(["admin"])), db=Depends(get_db)):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user: raise HTTPException(404, "User not found")
    if user.get("status") != "pending": raise HTTPException(400, "This application is not pending")
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}})
    await log_admin_action(admin["_id"], "reject", ObjectId(user_id), user["role"], db, reason=data.reason)
    await send_rejection_email(user["email"], user["name"], data.reason)
    return {"message": "Vendor rejected", "user_id": user_id}

@router.get("/users")
async def get_users(role: str = None, search: str = None, page: int = 1, limit: int = 20, db=Depends(get_db)):
    query = {"role": {"$ne": "admin"}}
    if role: query["role"] = role
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.users.count_documents(query)
    skip = (page - 1) * limit
    users = await db.users.find(query).skip(skip).limit(limit).to_list(limit)
    
    return {
        "users": [{"id": str(u["_id"]), "name": u["name"], "email": u["email"], "role": u["role"], "status": u.get("status", ""), "created_at": u["created_at"]} for u in users],
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit)
    }

@router.put("/users/{user_id}/deactivate")
async def deactivate_user(user_id: str, admin: dict = Depends(require_role(["admin"])), db=Depends(get_db)):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user: raise HTTPException(404, "User not found")
    if user["role"] == "admin": raise HTTPException(403, "Cannot deactivate admin accounts")
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"status": "deactivated", "updated_at": datetime.utcnow()}})
    await log_admin_action(admin["_id"], "deactivate", ObjectId(user_id), user["role"], db)
    return {"message": "User deactivated successfully"}

@router.put("/users/{user_id}/reactivate")
async def reactivate_user(user_id: str, admin: dict = Depends(require_role(["admin"])), db=Depends(get_db)):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user: raise HTTPException(404, "User not found")
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"status": "active", "updated_at": datetime.utcnow()}})
    await log_admin_action(admin["_id"], "reactivate", ObjectId(user_id), user["role"], db)
    return {"message": "User reactivated successfully"}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_role(["admin"])), db=Depends(get_db)):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user: raise HTTPException(404, "User not found")
    if user["role"] == "admin": raise HTTPException(403, "Cannot delete admin accounts")
    
    await db.users.delete_one({"_id": ObjectId(user_id)})
    if user["role"] == "vendor":
        await db.vendor_profiles.delete_one({"user_id": ObjectId(user_id)})
        
    await log_admin_action(admin["_id"], "delete", ObjectId(user_id), user["role"], db, metadata={"email": user["email"], "name": user["name"]})
    return {"message": "User deleted successfully"}

@router.get("/analytics/overview")
async def get_analytics(db=Depends(get_db)):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    coros = [
        db.users.count_documents({"role": "user"}),
        db.users.count_documents({"role": "vendor", "status": "active"}),
        db.users.count_documents({"role": "vendor", "status": "pending"}),
        db.products.count_documents({"is_active": True}),
        db.reservations.count_documents({"created_at": {"$gte": today}})
    ]
    
    results = await asyncio.gather(*coros)
    
    return {
        "total_users": results[0],
        "total_vendors_active": results[1],
        "total_vendors_pending": results[2],
        "total_products": results[3],
        "total_reservations_today": results[4],
        "platform_completion_rate": 0
    }
