from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from bson import ObjectId
from app.database import db
from app.dependencies import get_current_user, require_role
from app.models.wishlist import WishlistAddRequest

router = APIRouter()

@router.post("/", status_code=201)
async def add_to_wishlist(
    data: WishlistAddRequest,
    current_user: dict = Depends(require_role(["user"]))
):
    product = await db.products.find_one({"_id": ObjectId(data.product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    existing = await db.wishlists.find_one({
        "user_id": ObjectId(current_user["_id"]),
        "product_id": ObjectId(data.product_id)
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already in wishlist")
        
    wishlist_doc = {
        "user_id": ObjectId(current_user["_id"]),
        "product_id": ObjectId(data.product_id),
        "notify_on_restock": data.notify_on_restock,
        "notify_on_price_drop": data.notify_on_price_drop,
        "price_at_add": product["price"],
        "created_at": datetime.utcnow()
    }
    
    await db.wishlists.insert_one(wishlist_doc)
    return {"message": "Added to wishlist"}

@router.delete("/{product_id}")
async def remove_from_wishlist(
    product_id: str,
    current_user: dict = Depends(require_role(["user"]))
):
    await db.wishlists.delete_one({
        "user_id": ObjectId(current_user["_id"]),
        "product_id": ObjectId(product_id)
    })
    return {"message": "Removed from wishlist"}

@router.get("/")
async def get_my_wishlist(current_user: dict = Depends(require_role(["user"]))):
    cursor = db.wishlists.find({"user_id": ObjectId(current_user["_id"])})
    wishlists = await cursor.to_list(length=None)
    
    results = []
    for wl in wishlists:
        product = await db.products.find_one({"_id": wl["product_id"]})
        if not product:
            continue
            
        product["id"] = str(product["_id"])
        product["vendor_id"] = str(product["vendor_id"])
        available_qty = product["stock"] - product.get("reserved_qty", 0)
        
        results.append({
            "wishlist_id": str(wl["_id"]),
            "product": product,
            "price_at_add": wl["price_at_add"],
            "price_drop": product["price"] < wl["price_at_add"],
            "back_in_stock": available_qty > 0 and wl["notify_on_restock"],
            "notify_on_restock": wl["notify_on_restock"],
            "notify_on_price_drop": wl["notify_on_price_drop"]
        })
        
    return results
