from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import HTTPException
from app.utils.encryption import encrypt
from app.models.reservation import ReservationCreate


async def release_stock(reservation_id: str, db) -> None:
    reservation = await db.reservations.find_one({"_id": ObjectId(reservation_id)})
    if not reservation:
        return
    for item in reservation.get("items", []):
        await db.products.update_one(
            {"_id": item["product_id"]},
            {"$inc": {"reserved_qty": -item["quantity"]}}
        )


async def create_reservation(data: ReservationCreate, user_id: str, db) -> dict:
    product = await db.products.find_one({"_id": ObjectId(data.product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    available_qty = product["stock"] - product.get("reserved_qty", 0)
    if available_qty < data.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Only {available_qty} available."
        )

    encrypted_phone = encrypt(data.pickup_contact_phone)
    total_value = product["price"] * data.quantity
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=30)

    reservation_doc = {
        "user_id": ObjectId(user_id),
        "vendor_id": product["vendor_id"],
        "store_id": ObjectId(data.store_id) if data.store_id else None,
        "items": [{
            "product_id": product["_id"],
            "name": product["name"],
            "price": product["price"],
            "quantity": data.quantity,
            "image_url": product["images"][0] if product.get("images") else ""
        }],
        "total_value": total_value,
        "status": "pending",
        "pickup_contact_phone": encrypted_phone,
        "expires_at": expires_at,
        "is_group": False,
        "confirmed_at": None,
        "completed_at": None,
        "vendor_note": None,
        "group_id": None,
        "created_at": now,
        "updated_at": now
    }

    result = await db.reservations.insert_one(reservation_doc)

    await db.products.update_one(
        {"_id": product["_id"]},
        {"$inc": {"reserved_qty": data.quantity}}
    )

    await db.notifications.insert_one({
        "user_id": product["vendor_id"],
        "title": "New Reservation",
        "message": f"New reservation for {product['name']}",
        "type": "reservation",
        "is_read": False,
        "action_url": "/reservations",
        "created_at": now
    })

    reservation_doc["_id"] = result.inserted_id
    return reservation_doc


async def confirm_reservation(reservation_id: str, vendor_id, note, db) -> dict:
    reservation = await db.reservations.find_one({"_id": ObjectId(reservation_id)})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if str(reservation["vendor_id"]) != str(vendor_id):
        raise HTTPException(status_code=403, detail="Not your reservation")
    if reservation["status"] != "pending":
        raise HTTPException(status_code=400, detail="Can only confirm pending reservations")

    now = datetime.utcnow()
    update = {
        "status": "confirmed",
        "confirmed_at": now,
        "expires_at": now + timedelta(hours=2),
        "updated_at": now
    }
    if note:
        update["vendor_note"] = note

    await db.reservations.update_one({"_id": ObjectId(reservation_id)}, {"$set": update})

    await db.notifications.insert_one({
        "user_id": reservation["user_id"],
        "title": "Reservation Confirmed!",
        "message": "Your reservation has been confirmed. Pick up within 2 hours.",
        "type": "reservation",
        "is_read": False,
        "action_url": "/reservations",
        "created_at": now
    })

    return await db.reservations.find_one({"_id": ObjectId(reservation_id)})


async def reject_reservation(reservation_id: str, vendor_id, reason: str, db) -> dict:
    reservation = await db.reservations.find_one({"_id": ObjectId(reservation_id)})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if str(reservation["vendor_id"]) != str(vendor_id):
        raise HTTPException(status_code=403, detail="Not your reservation")
    if reservation["status"] != "pending":
        raise HTTPException(status_code=400, detail="Can only reject pending reservations")

    now = datetime.utcnow()
    await db.reservations.update_one(
        {"_id": ObjectId(reservation_id)},
        {"$set": {"status": "rejected", "vendor_note": reason, "updated_at": now}}
    )
    await release_stock(reservation_id, db)

    await db.notifications.insert_one({
        "user_id": reservation["user_id"],
        "title": "Reservation Rejected",
        "message": f"Your reservation was rejected. Reason: {reason}",
        "type": "reservation",
        "is_read": False,
        "action_url": "/reservations",
        "created_at": now
    })

    return await db.reservations.find_one({"_id": ObjectId(reservation_id)})


async def complete_reservation(reservation_id: str, vendor_id, db) -> dict:
    reservation = await db.reservations.find_one({"_id": ObjectId(reservation_id)})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if str(reservation["vendor_id"]) != str(vendor_id):
        raise HTTPException(status_code=403, detail="Not your reservation")
    if reservation["status"] != "confirmed":
        raise HTTPException(status_code=400, detail="Can only complete confirmed reservations")

    now = datetime.utcnow()
    for item in reservation.get("items", []):
        await db.products.update_one(
            {"_id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"], "reserved_qty": -item["quantity"]}}
        )

    await db.reservations.update_one(
        {"_id": ObjectId(reservation_id)},
        {"$set": {"status": "completed", "completed_at": now, "updated_at": now}}
    )

    await db.notifications.insert_one({
        "user_id": reservation["user_id"],
        "title": "Pickup Confirmed!",
        "message": "Your pickup is complete. Please leave a review!",
        "type": "reservation",
        "is_read": False,
        "action_url": "/reservations",
        "created_at": now
    })

    return await db.reservations.find_one({"_id": ObjectId(reservation_id)})


async def cancel_reservation(reservation_id: str, user_id, db) -> dict:
    reservation = await db.reservations.find_one({"_id": ObjectId(reservation_id)})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if str(reservation["user_id"]) != str(user_id):
        raise HTTPException(status_code=403, detail="Not your reservation")
    if reservation["status"] not in ["pending", "confirmed"]:
        raise HTTPException(status_code=400, detail="Cannot cancel this reservation")

    now = datetime.utcnow()
    await db.reservations.update_one(
        {"_id": ObjectId(reservation_id)},
        {"$set": {"status": "cancelled", "updated_at": now}}
    )
    await release_stock(reservation_id, db)

    return await db.reservations.find_one({"_id": ObjectId(reservation_id)})
