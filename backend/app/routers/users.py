import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from app.dependencies import get_current_user, require_role
from app.models.user import UserResponse, UserUpdate
from app.utils.encryption import decrypt, encrypt
from app.database import get_db

router = APIRouter(prefix="/users", tags=["Users"])

class FCMTokenUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    fcm_token: str

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    user = await db.users.find_one({"_id": current_user["_id"]})
    
    decrypted_phone = decrypt(user.get("phone"))
    
    user["id"] = str(user["_id"])
    return UserResponse(**user)

@router.get("/me/dashboard")
async def get_user_dashboard(
    current_user: dict = Depends(require_role(["user"])),
    db=Depends(get_db)
):
    uid = current_user["_id"]
    
    async def get_active_reservations():
        cursor = db.reservations.find({
            "user_id": uid, 
            "status": {"$in": ["pending", "confirmed"]}
        }).sort("created_at", -1).limit(5)
        docs = await cursor.to_list(5)
        now = datetime.utcnow()
        for doc in docs:
            doc["id"] = str(doc["_id"])
            doc["user_id"] = str(doc["user_id"])
            doc["vendor_id"] = str(doc["vendor_id"])
            doc["store_id"] = str(doc["store_id"]) if doc.get("store_id") else None
            for item in doc.get("items", []):
                item["product_id"] = str(item["product_id"])
                
            if doc["status"] == "pending":
                diff = doc["expires_at"] - now
                doc["countdown_seconds"] = max(0.0, diff.total_seconds())
            elif doc["status"] == "confirmed":
                diff = doc["expires_at"] - now
                doc["countdown_seconds"] = max(0.0, diff.total_seconds())
            else:
                doc["countdown_seconds"] = None
                
            del doc["_id"]
        return docs
        
    async def get_wishlist_alerts():
        cursor = db.wishlists.find({"user_id": uid})
        wishlists = await cursor.to_list(None)
        
        alerts = []
        for wl in wishlists:
            prod = await db.products.find_one({"_id": wl["product_id"]})
            if not prod: continue
            
            price_drop = False
            if wl.get("target_price") and prod.get("discounted_price", prod["price"]) <= wl["target_price"]:
                price_drop = True
                
            back_in_stock = False
            if wl.get("notify_on_restock") and (prod["stock"] - prod.get("reserved_qty", 0)) > 0:
                back_in_stock = True
                
            if price_drop or back_in_stock:
                alerts.append({
                    "product_id": str(prod["_id"]),
                    "name": prod["name"],
                    "images": prod.get("images", []),
                    "price_drop": price_drop,
                    "back_in_stock": back_in_stock,
                    "current_price": prod.get("discounted_price", prod["price"])
                })
                if len(alerts) >= 5: break
        return alerts
        
    async def get_nearby_stores():
        cursor = db.vendor_profiles.find({"location": {"$exists": True}}).sort("created_at", -1).limit(3)
        stores = await cursor.to_list(3)
        res = []
        for s in stores:
            res.append({
                "store_id": str(s["_id"]),
                "store_name": s.get("store_name", "Unknown"),
                "city": s.get("city", ""),
                "average_rating": s.get("average_rating", 0.0)
            })
        return res
        
    async def get_stats():
        total = await db.reservations.count_documents({"user_id": uid})
        completed = await db.reservations.count_documents({"user_id": uid, "status": "completed"})
        wishlist_count = await db.wishlists.count_documents({"user_id": uid})
        return {
            "total_reservations": total,
            "completed_reservations": completed,
            "active_wishlist_items": wishlist_count
        }

    res_active, alerts, stores, stats = await asyncio.gather(
        get_active_reservations(),
        get_wishlist_alerts(),
        get_nearby_stores(),
        get_stats()
    )
    
    return {
        "active_reservations": res_active,
        "wishlist_alerts": alerts,
        "nearby_stores_preview": stores,
        "stats": stats
    }

@router.put("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    update_dict = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    
    if "phone" in update_dict:
        update_dict["phone"] = encrypt(update_dict["phone"])
        
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    return UserResponse(
        id=str(updated_user["_id"]),
        name=updated_user["name"],
        email=updated_user["email"],
        role=updated_user["role"],
        status=updated_user["status"]
    )
