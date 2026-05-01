from fastapi import APIRouter, Depends, Query
from bson import ObjectId
from app.database import db
from app.dependencies import get_current_user, require_role

router = APIRouter(tags=["notifications"])

@router.get("/")
async def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_role(["user", "vendor", "admin"]))
):
    query = {"user_id": ObjectId(current_user["_id"])}
    total = await db.notifications.count_documents(query)
    unread_count = await db.notifications.count_documents({"user_id": ObjectId(current_user["_id"]), "is_read": False})
    
    cursor = db.notifications.find(query).sort("created_at", -1).skip((page-1)*limit).limit(limit)
    docs = await cursor.to_list(length=limit)
    
    notifications = []
    for d in docs:
        d["id"] = str(d["_id"])
        d["user_id"] = str(d["user_id"])
        del d["_id"]
        notifications.append(d)
        
    return {
        "notifications": notifications,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "unread_count": unread_count
    }

@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: dict = Depends(require_role(["user", "vendor", "admin"]))
):
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": ObjectId(current_user["_id"])},
        {"$set": {"is_read": True}}
    )
    return {"message": "Marked as read"}

@router.put("/read-all")
async def mark_all_read(
    current_user: dict = Depends(require_role(["user", "vendor", "admin"]))
):
    await db.notifications.update_many(
        {"user_id": ObjectId(current_user["_id"])},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}
