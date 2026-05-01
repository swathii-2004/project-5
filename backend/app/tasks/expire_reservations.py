from datetime import datetime
from bson import ObjectId
from app.services.reservation_service import release_stock


async def expire_reservations(db) -> None:
    now = datetime.utcnow()
    expired = await db.reservations.find({
        "status": {"$in": ["pending", "confirmed"]},
        "expires_at": {"$lt": now}
    }).to_list(length=100)

    for reservation in expired:
        rid = str(reservation["_id"])
        await db.reservations.update_one(
            {"_id": reservation["_id"]},
            {"$set": {"status": "expired", "updated_at": now}}
        )
        await release_stock(rid, db)
        await db.notifications.insert_one({
            "user_id": reservation["user_id"],
            "title": "Reservation Expired",
            "message": "Your reservation has expired.",
            "type": "reservation",
            "is_read": False,
            "action_url": "/reservations",
            "created_at": now
        })
