import logging
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import HTTPException
from app.utils.encryption import encrypt
from app.models.reservation import ReservationCreate
from app.services.notification_service import notify_user

logger = logging.getLogger(__name__)

async def release_stock(reservation_id: str, db) -> None:
    logger.info(f"Releasing stock for reservation {reservation_id}")
    reservation = await db.reservations.find_one({"_id": ObjectId(reservation_id)})
    if not reservation:
        logger.warning(f"Could not find reservation {reservation_id} to release stock")
        return
    for item in reservation.get("items", []):
        logger.info(f"Releasing {item['quantity']} of product {item['product_id']}")
        await db.products.update_one(
            {"_id": item["product_id"]},
            {"$inc": {"reserved_qty": -item["quantity"]}}
        )


async def create_reservation(data: ReservationCreate, user_id: str, db) -> dict:
    product = await db.products.find_one({"_id": ObjectId(data.product_id)})
    if not product:
        logger.error(f"Product {data.product_id} not found during reservation creation")
        raise HTTPException(status_code=404, detail="Product not found")

    available_qty = product["stock"] - product.get("reserved_qty", 0)
    logger.info(f"Reservation attempt - Product: {product['name']} ({data.product_id}), Available: {available_qty}, Requested: {data.quantity}")
    
    if available_qty < data.quantity:
        logger.warning(f"Insufficient stock for product {data.product_id}: requested {data.quantity}, available {available_qty}")
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Only {available_qty} available."
        )

    encrypted_phone = encrypt(data.pickup_contact_phone)
    total_value = product["price"] * data.quantity
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=30)

    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    vendor_doc = await db.users.find_one({"_id": ObjectId(product["vendor_id"])})
    
    user_name = user_doc.get("name", "Unknown User") if user_doc else "Unknown User"
    vendor_name = vendor_doc.get("name", "Unknown Vendor") if vendor_doc else "Unknown Vendor"

    reservation_doc = {
        "user_id": ObjectId(user_id),
        "vendor_id": product["vendor_id"],
        "user_name": user_name,
        "vendor_name": vendor_name,
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
    logger.info(f"Inserted reservation {result.inserted_id} into database")

    await db.products.update_one(
        {"_id": product["_id"]},
        {"$inc": {"reserved_qty": data.quantity}}
    )
    logger.info(f"Incremented reserved_qty for product {data.product_id} by {data.quantity}")

    await notify_user(
        str(product["vendor_id"]),
        "New Reservation",
        f"New reservation for {product['name']}",
        "reservation",
        "/reservations",
        db,
        {"reservation_id": str(result.inserted_id)}
    )

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

    await notify_user(
        str(reservation["user_id"]),
        "Reservation Confirmed!",
        "Your reservation has been confirmed. Pick up within 2 hours.",
        "reservation",
        "/reservations",
        db
    )

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

    await notify_user(
        str(reservation["user_id"]),
        "Reservation Rejected",
        f"Your reservation was rejected. Reason: {reason}",
        "reservation",
        "/reservations",
        db
    )

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

    await notify_user(
        str(reservation["user_id"]),
        "Pickup Confirmed!",
        "Your pickup is complete. Please leave a review!",
        "reservation",
        "/reservations",
        db
    )

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
