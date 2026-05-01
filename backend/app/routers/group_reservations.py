from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
from app.database import db
from app.dependencies import get_current_user, require_role
from app.models.group_reservation import GroupReservationCreate, GroupMemberPortion
from app.config import settings
try:
    import sendgrid
    from sendgrid.helpers.mail import Mail
except ImportError:
    sendgrid = None

router = APIRouter(tags=["group-reservations"])


async def _send_invite(to_email: str, inviter_name: str, group_name: str):
    if not sendgrid or not settings.SENDGRID_API_KEY:
        return
    try:
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        msg = Mail(
            from_email=settings.SENDGRID_FROM_EMAIL,
            to_emails=to_email,
            subject="You're invited to a group reservation on ProxiMart",
            plain_text_content=(
                f"{inviter_name} has invited you to join a group reservation "
                f"for '{group_name}'. Join at {settings.FRONTEND_USER_URL}"
            )
        )
        sg.send(msg)
    except Exception:
        pass


@router.post("/reservations/group/", status_code=201)
async def create_group_reservation(
    data: GroupReservationCreate,
    current_user: dict = Depends(require_role(["user"]))
):
    now = datetime.utcnow()
    total_value = 0.0
    for item in data.items:
        product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item['product_id']} not found")
        available = product["stock"] - product.get("reserved_qty", 0)
        if available < item["quantity"]:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product['name']}"
            )
        total_value += product["price"] * item["quantity"]

    total_qty = sum(i["quantity"] for i in data.items)
    doc = {
        "created_by": ObjectId(current_user["_id"]),
        "store_id": ObjectId(data.store_id),
        "group_name": data.group_name,
        "items": data.items,
        "members": [{
            "user_id": ObjectId(current_user["_id"]),
            "email": current_user["email"],
            "status": "confirmed",
            "portion_qty": total_qty
        }],
        "status": "assembling",
        "total_value": total_value,
        "reservation_id": None,
        "created_at": now,
        "updated_at": now
    }
    result = await db.group_reservations.insert_one(doc)
    doc["_id"] = result.inserted_id

    for email in data.invite_emails:
        await _send_invite(email, current_user.get("name", "A user"), data.group_name)

    doc["id"] = str(doc["_id"])
    doc["created_by"] = str(doc["created_by"])
    doc["store_id"] = str(doc["store_id"])
    return doc


@router.get("/reservations/group/{group_id}")
async def get_group_reservation(
    group_id: str,
    current_user: dict = Depends(require_role(["user"]))
):
    try:
        doc = await db.group_reservations.find_one({"_id": ObjectId(group_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid group ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Group reservation not found")
    doc["id"] = str(doc["_id"])
    doc["created_by"] = str(doc["created_by"])
    return doc


@router.put("/reservations/group/{group_id}/join")
async def join_group(
    group_id: str,
    data: GroupMemberPortion,
    current_user: dict = Depends(require_role(["user"]))
):
    doc = await db.group_reservations.find_one({"_id": ObjectId(group_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Group reservation not found")
    if doc["status"] != "assembling":
        raise HTTPException(status_code=400, detail="Group is no longer accepting members")
    uid = ObjectId(current_user["_id"])
    if any(str(m["user_id"]) == str(uid) for m in doc["members"]):
        raise HTTPException(status_code=400, detail="Already a member")

    await db.group_reservations.update_one(
        {"_id": ObjectId(group_id)},
        {"$push": {"members": {
            "user_id": uid,
            "email": current_user["email"],
            "status": "joined",
            "portion_qty": data.portion_qty
        }}, "$set": {"updated_at": datetime.utcnow()}}
    )
    updated = await db.group_reservations.find_one({"_id": ObjectId(group_id)})
    updated["id"] = str(updated["_id"])
    return updated


@router.put("/reservations/group/{group_id}/confirm-member")
async def confirm_member(
    group_id: str,
    current_user: dict = Depends(require_role(["user"]))
):
    doc = await db.group_reservations.find_one({"_id": ObjectId(group_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Group reservation not found")

    uid_str = str(current_user["_id"])
    members = doc.get("members", [])
    for m in members:
        if str(m["user_id"]) == uid_str:
            m["status"] = "confirmed"
            break

    all_confirmed = all(m["status"] == "confirmed" for m in members)
    update: dict = {"members": members, "updated_at": datetime.utcnow()}

    if all_confirmed:
        update["status"] = "submitted"

    await db.group_reservations.update_one(
        {"_id": ObjectId(group_id)}, {"$set": update}
    )
    updated = await db.group_reservations.find_one({"_id": ObjectId(group_id)})
    updated["id"] = str(updated["_id"])
    return updated
