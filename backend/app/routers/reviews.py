from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from bson import ObjectId
from app.database import db

router = APIRouter()

@router.get("/product/{product_id}")
async def get_product_reviews(
    product_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    query = {"target_id": ObjectId(product_id), "target_type": "product"}
    total = await db.reviews.count_documents(query)
    cursor = db.reviews.find(query).sort("created_at", -1).skip((page-1)*limit).limit(limit)
    reviews = await cursor.to_list(length=limit)
    
    formatted_reviews = []
    for r in reviews:
        user = await db.users.find_one({"_id": r["user_id"]})
        formatted_reviews.append({
            "id": str(r["_id"]),
            "reviewer_name": user["name"] if user else "Anonymous",
            "rating": r["rating"],
            "comment": r.get("comment", ""),
            "created_at": r["created_at"]
        })
        
    return {"reviews": formatted_reviews, "total": total}

@router.get("/store/{vendor_id}")
async def get_store_reviews(
    vendor_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    query = {"target_id": ObjectId(vendor_id), "target_type": "store"}
    total = await db.reviews.count_documents(query)
    cursor = db.reviews.find(query).sort("created_at", -1).skip((page-1)*limit).limit(limit)
    reviews = await cursor.to_list(length=limit)
    
    formatted_reviews = []
    for r in reviews:
        user = await db.users.find_one({"_id": r["user_id"]})
        formatted_reviews.append({
            "id": str(r["_id"]),
            "reviewer_name": user["name"] if user else "Anonymous",
            "rating": r["rating"],
            "comment": r.get("comment", ""),
            "created_at": r["created_at"]
        })
        
    return {"reviews": formatted_reviews, "total": total}
