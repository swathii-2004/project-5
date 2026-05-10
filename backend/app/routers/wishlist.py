import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from bson import ObjectId
from app.database import db
from app.dependencies import get_current_user, require_role
from app.models.wishlist import WishlistAddRequest

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", status_code=201)
async def add_to_wishlist(
    data: WishlistAddRequest,
    current_user: dict = Depends(require_role(['user', 'admin', 'vendor']))
):
    user_id = str(current_user["_id"])
    logger.info(f"User {user_id} attempting to add product {data.product_id} to wishlist")
    
    product = await db.products.find_one({"_id": ObjectId(data.product_id)})
    if not product:
        logger.warning(f"Product {data.product_id} not found during wishlist add")
        raise HTTPException(status_code=404, detail="Product not found")
        
    existing = await db.wishlists.find_one({
        "user_id": ObjectId(current_user["_id"]),
        "product_id": ObjectId(data.product_id)
    })
    if existing:
        logger.info(f"Product {data.product_id} already in wishlist for user {user_id}")
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
    logger.info(f"Successfully added product {data.product_id} to wishlist for user {user_id}")
    return {"message": "Added to wishlist"}

@router.delete("/{product_id}")
async def remove_from_wishlist(
    product_id: str,
    current_user: dict = Depends(require_role(['user', 'admin', 'vendor']))
):
    user_id = str(current_user["_id"])
    logger.info(f"User {user_id} removing product {product_id} from wishlist")
    
    result = await db.wishlists.delete_one({
        "user_id": ObjectId(current_user["_id"]),
        "product_id": ObjectId(product_id)
    })
    
    if result.deleted_count > 0:
        logger.info(f"Successfully removed product {product_id} from wishlist for user {user_id}")
    else:
        logger.info(f"Product {product_id} was not in wishlist for user {user_id}")
        
    return {"message": "Removed from wishlist"}

@router.get("/")
async def get_my_wishlist(current_user: dict = Depends(require_role(['user', 'admin', 'vendor']))):
    user_id = str(current_user["_id"])
    logger.info(f"Fetching wishlist for user {user_id}")
    
    cursor = db.wishlists.find({"user_id": ObjectId(current_user["_id"])})
    wishlists = await cursor.to_list(length=None)
    
    logger.info(f"Found {len(wishlists)} raw wishlist entries for user {user_id}")
    
    from app.routers.products import format_product_response
    
    results = []
    for wl in wishlists:
        product = await db.products.find_one({"_id": wl["product_id"]})
        if not product:
            logger.warning(f"Product {wl['product_id']} found in wishlist but not in products collection")
            continue
            
        product_data = format_product_response(product).model_dump()
        available_qty = product_data["available_qty"]
        
        results.append({
            "wishlist_id": str(wl["_id"]),
            "product": product_data,
            "price_at_add": wl["price_at_add"],
            "price_drop": product_data["price"] < wl["price_at_add"],
            "back_in_stock": available_qty > 0 and wl["notify_on_restock"],
            "notify_on_restock": wl["notify_on_restock"],
            "notify_on_price_drop": wl["notify_on_price_drop"]
        })
        
    logger.info(f"Returning {len(results)} active wishlist items for user {user_id}")
    return results
