from datetime import datetime
from bson import ObjectId
from app.services.reservation_service import release_stock
from app.services.notification_service import notify_user

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
        await notify_user(
            str(reservation["user_id"]),
            "Reservation Expired",
            "Your reservation has expired.",
            "reservation",
            "/reservations",
            db
        )
