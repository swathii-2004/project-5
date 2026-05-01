from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime
from bson import ObjectId
from app.database import db
from app.dependencies import require_role
from app.models.reservation import (
    ReservationCreate, ReservationResponse,
    ConfirmReservationRequest, RejectReservationRequest
)
from app.services.reservation_service import (
    create_reservation, confirm_reservation,
    reject_reservation, complete_reservation, cancel_reservation
)
from app.utils.encryption import decrypt

router = APIRouter(tags=["reservations"])


def _format(r: dict) -> dict:
    now = datetime.utcnow()
    r["id"] = str(r["_id"])
    r["user_id"] = str(r["user_id"])
    r["vendor_id"] = str(r["vendor_id"])
    if r.get("store_id"):
        r["store_id"] = str(r["store_id"])
    for item in r.get("items", []):
        item["product_id"] = str(item["product_id"])
    if r["status"] in ("pending", "confirmed"):
        secs = (r["expires_at"] - now).total_seconds()
        r["countdown_seconds"] = max(0.0, secs)
    else:
        r["countdown_seconds"] = None
    return r


@router.post("/reservations/", status_code=201, response_model=ReservationResponse)
async def make_reservation(
    data: ReservationCreate,
    current_user: dict = Depends(require_role(["user"]))
):
    doc = await create_reservation(data, str(current_user["_id"]), db)
    return _format(doc)


@router.get("/reservations/user")
async def list_user_reservations(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_role(["user"]))
):
    query = {"user_id": ObjectId(current_user["_id"])}
    if status:
        query["status"] = status
    total = await db.reservations.count_documents(query)
    cursor = db.reservations.find(query).sort("created_at", -1).skip((page-1)*limit).limit(limit)
    docs = await cursor.to_list(length=limit)
    results = []
    for r in docs:
        if r.get("pickup_contact_phone"):
            try:
                r["pickup_contact_phone"] = decrypt(r["pickup_contact_phone"])
            except Exception:
                pass
        results.append(_format(r))
    return {"reservations": results, "total": total, "page": page, "pages": (total+limit-1)//limit}


@router.get("/reservations/vendor")
async def list_vendor_reservations(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_role(["vendor"]))
):
    query = {"vendor_id": ObjectId(current_user["_id"])}
    if status:
        query["status"] = status
    total = await db.reservations.count_documents(query)
    cursor = db.reservations.find(query).sort("created_at", -1).skip((page-1)*limit).limit(limit)
    docs = await cursor.to_list(length=limit)
    return {
        "reservations": [_format(r) for r in docs],
        "total": total, "page": page,
        "pages": (total+limit-1)//limit
    }


@router.put("/reservations/{reservation_id}/confirm", response_model=ReservationResponse)
async def confirm(
    reservation_id: str,
    data: ConfirmReservationRequest,
    current_user: dict = Depends(require_role(["vendor"]))
):
    doc = await confirm_reservation(reservation_id, current_user["_id"], data.note, db)
    return _format(doc)


@router.put("/reservations/{reservation_id}/reject", response_model=ReservationResponse)
async def reject(
    reservation_id: str,
    data: RejectReservationRequest,
    current_user: dict = Depends(require_role(["vendor"]))
):
    doc = await reject_reservation(reservation_id, current_user["_id"], data.reason, db)
    return _format(doc)


@router.put("/reservations/{reservation_id}/complete", response_model=ReservationResponse)
async def complete(
    reservation_id: str,
    current_user: dict = Depends(require_role(["vendor"]))
):
    doc = await complete_reservation(reservation_id, current_user["_id"], db)
    return _format(doc)


@router.put("/reservations/{reservation_id}/cancel", response_model=ReservationResponse)
async def cancel(
    reservation_id: str,
    current_user: dict = Depends(require_role(["user"]))
):
    doc = await cancel_reservation(reservation_id, current_user["_id"], db)
    return _format(doc)
