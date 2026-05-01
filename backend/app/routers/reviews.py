from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime
from app.database import db
from app.dependencies import require_role
from app.models.review import ReviewCreate

router = APIRouter(tags=["reviews"])


@router.get("/reviews/product/{product_id}")
async def get_product_reviews(
    product_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    query = {"target_id": ObjectId(product_id), "target_type": "product"}
    total = await db.reviews.count_documents(query)
    cursor = db.reviews.find(query).sort("created_at", -1).skip((page-1)*limit).limit(limit)
    reviews = await cursor.to_list(length=limit)
    formatted = []
    for r in reviews:
        user = await db.users.find_one({"_id": r["reviewer_id"]})
        formatted.append({
            "id": str(r["_id"]),
            "reviewer_name": user["name"] if user else "Anonymous",
            "rating": r["rating"],
            "comment": r.get("comment", ""),
            "created_at": r["created_at"]
        })
    return {"reviews": formatted, "total": total}


@router.get("/reviews/store/{vendor_id}")
async def get_store_reviews(
    vendor_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    query = {"target_id": ObjectId(vendor_id), "target_type": "store"}
    total = await db.reviews.count_documents(query)
    cursor = db.reviews.find(query).sort("created_at", -1).skip((page-1)*limit).limit(limit)
    reviews = await cursor.to_list(length=limit)
    formatted = []
    for r in reviews:
        user = await db.users.find_one({"_id": r["reviewer_id"]})
        formatted.append({
            "id": str(r["_id"]),
            "reviewer_name": user["name"] if user else "Anonymous",
            "rating": r["rating"],
            "comment": r.get("comment", ""),
            "created_at": r["created_at"]
        })
    return {"reviews": formatted, "total": total}


@router.post("/reviews/", status_code=201)
async def create_review(
    data: ReviewCreate,
    current_user: dict = Depends(require_role(["user"]))
):
    reservation = await db.reservations.find_one({"_id": ObjectId(data.reservation_id)})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if str(reservation["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not your reservation")
    if reservation["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed reservations")

    existing = await db.reviews.find_one({
        "reviewer_id": ObjectId(current_user["_id"]),
        "target_id": ObjectId(data.target_id),
        "target_type": data.target_type
    })
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this")

    now = datetime.utcnow()
    review_doc = {
        "reviewer_id": ObjectId(current_user["_id"]),
        "target_id": ObjectId(data.target_id),
        "target_type": data.target_type,
        "rating": data.rating,
        "comment": data.comment,
        "reservation_id": ObjectId(data.reservation_id),
        "created_at": now
    }
    await db.reviews.insert_one(review_doc)

    if data.target_type == "product":
        product = await db.products.find_one({"_id": ObjectId(data.target_id)})
        if product:
            old_avg = product.get("average_rating", 0.0)
            old_count = product.get("total_reviews", 0)
            new_avg = (old_avg * old_count + data.rating) / (old_count + 1)
            await db.products.update_one(
                {"_id": ObjectId(data.target_id)},
                {"$set": {"average_rating": round(new_avg, 2)}, "$inc": {"total_reviews": 1}}
            )
    elif data.target_type == "store":
        profile = await db.vendor_profiles.find_one({"_id": ObjectId(data.target_id)})
        if profile:
            old_avg = profile.get("average_rating", 0.0)
            old_count = profile.get("total_reviews", 0)
            new_avg = (old_avg * old_count + data.rating) / (old_count + 1)
            await db.vendor_profiles.update_one(
                {"_id": ObjectId(data.target_id)},
                {"$set": {"average_rating": round(new_avg, 2)}, "$inc": {"total_reviews": 1}}
            )

    return {"message": "Review submitted", "id": str(review_doc.get("_id", ""))}
