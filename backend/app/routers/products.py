from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from typing import List, Optional, Literal
from datetime import datetime
from bson import ObjectId
import json
from app.database import db
from app.dependencies import get_current_user, require_role
from app.models.product import ProductCreate, ProductUpdate, StockUpdateRequest, ProductResponse
from app.services.upload_service import upload_to_cloudinary

router = APIRouter()

def format_product_response(product: dict) -> ProductResponse:
    product["id"] = str(product["_id"])
    product["vendor_id"] = str(product["vendor_id"])
    if product.get("store_id"):
        product["store_id"] = str(product["store_id"])
    
    product["available_qty"] = product["stock"] - product.get("reserved_qty", 0)
    product["low_stock"] = product["available_qty"] < product.get("low_stock_threshold", 5)
    
    return ProductResponse(**product)

@router.post("/", response_model=ProductResponse, status_code=201)
async def create_product(
    name: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    price: float = Form(...),
    stock: int = Form(...),
    low_stock_threshold: int = Form(5),
    tags_json: str = Form("[]"),
    images: List[UploadFile] = File(default=[]),
    current_user: dict = Depends(require_role(["vendor"]))
):
    vendor_profile = await db.vendor_profiles.find_one({"user_id": ObjectId(current_user["_id"])})
    
    image_urls = []
    for image in images[:5]:
        url = await upload_to_cloudinary(image, folder="proximart/products")
        image_urls.append(url)
        
    tags = json.loads(tags_json)
    now = datetime.utcnow()
    
    product_doc = {
        "vendor_id": ObjectId(current_user["_id"]),
        "store_id": vendor_profile["_id"] if vendor_profile else None,
        "name": name,
        "description": description,
        "category": category,
        "price": price,
        "stock": stock,
        "reserved_qty": 0,
        "low_stock_threshold": low_stock_threshold,
        "images": image_urls,
        "is_active": True,
        "average_rating": 0.0,
        "total_reviews": 0,
        "total_reservations": 0,
        "tags": tags,
        "discounted_price": None,
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.products.insert_one(product_doc)
    product_doc["_id"] = result.inserted_id
    
    return format_product_response(product_doc)

@router.get("/mine")
async def get_my_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    current_user: dict = Depends(require_role(["vendor"]))
):
    query = {"vendor_id": ObjectId(current_user["_id"]), "is_active": True}
    if category:
        query["category"] = category
        
    total = await db.products.count_documents(query)
    cursor = db.products.find(query).skip((page-1)*limit).limit(limit).sort("created_at", -1)
    products = await cursor.to_list(length=limit)
    
    return {
        "products": [format_product_response(p) for p in products],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    stock: Optional[int] = Form(None),
    low_stock_threshold: Optional[int] = Form(None),
    tags_json: Optional[str] = Form(None),
    images: List[UploadFile] = File(default=[]),
    current_user: dict = Depends(require_role(["vendor"]))
):
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if str(product["vendor_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not your product")
        
    update_dict = {}
    if name is not None: update_dict["name"] = name
    if description is not None: update_dict["description"] = description
    if category is not None: update_dict["category"] = category
    if price is not None: update_dict["price"] = price
    if stock is not None: update_dict["stock"] = stock
    if low_stock_threshold is not None: update_dict["low_stock_threshold"] = low_stock_threshold
    if tags_json is not None: update_dict["tags"] = json.loads(tags_json)
    
    if images:
        new_urls = []
        for image in images[:5]:
            url = await upload_to_cloudinary(image, folder="proximart/products")
            new_urls.append(url)
        update_dict["images"] = product.get("images", []) + new_urls
        
    update_dict["updated_at"] = datetime.utcnow()
    await db.products.update_one({"_id": ObjectId(product_id)}, {"$set": update_dict})
    
    updated_product = await db.products.find_one({"_id": ObjectId(product_id)})
    return format_product_response(updated_product)

@router.put("/{product_id}/stock", response_model=ProductResponse)
async def update_product_stock(
    product_id: str,
    data: StockUpdateRequest,
    current_user: dict = Depends(require_role(["vendor"]))
):
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if str(product["vendor_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not your product")
        
    new_stock = product["stock"] + data.quantity
    if new_stock < 0:
        raise HTTPException(status_code=400, detail=f"Stock cannot go below 0. Current stock: {product['stock']}")
        
    old_stock = product["stock"]
    now = datetime.utcnow()
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"stock": new_stock, "updated_at": now}}
    )
    
    # Notify wishlist users if restocked
    if new_stock > 0 and old_stock == 0:
        wishlist_cursor = db.wishlists.find({"product_id": ObjectId(product_id), "notify_on_restock": True})
        wishlists = await wishlist_cursor.to_list(length=None)
        
        notifications = []
        for wl in wishlists:
            notifications.append({
                "user_id": wl["user_id"],
                "title": "Back in stock!",
                "message": f"{product['name']} is now available at a nearby store.",
                "type": "stock",
                "is_read": False,
                "action_url": f"/products/{product_id}",
                "created_at": now
            })
        if notifications:
            await db.notifications.insert_many(notifications)
            
    updated_product = await db.products.find_one({"_id": ObjectId(product_id)})
    return format_product_response(updated_product)

@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: dict = Depends(require_role(["vendor"]))
):
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if str(product["vendor_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not your product")
        
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    return {"message": "Product removed successfully"}

@router.get("/")
async def list_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("newest", pattern="^(newest|price_asc|price_desc|rating)$")
):
    query = {"is_active": True}
    if category:
        query["category"] = category
    if search:
        # Check if text index exists or fallback to regex
        try:
            query["$text"] = {"$search": search}
        except:
            query["name"] = {"$regex": search, "$options": "i"}
            
    sort_mapping = {
        "newest": [("created_at", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "rating": [("average_rating", -1)]
    }
    
    total = await db.products.count_documents(query)
    cursor = db.products.find(query).sort(sort_mapping[sort]).skip((page-1)*limit).limit(limit)
    products = await cursor.to_list(length=limit)
    
    return {
        "products": [format_product_response(p) for p in products],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/{product_id}")
async def get_product_detail(product_id: str):
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product or not product.get("is_active", True):
        raise HTTPException(status_code=404, detail="Product not found")
        
    vendor_profile = await db.vendor_profiles.find_one({"user_id": product["vendor_id"]})
    
    response_data = format_product_response(product).model_dump()
    response_data["store_name"] = vendor_profile.get("store_name", "Unknown") if vendor_profile else "Unknown"
    response_data["city"] = vendor_profile.get("city", "") if vendor_profile else ""
    
    return response_data
