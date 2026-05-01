from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from typing import List, Optional, Literal
from datetime import datetime, timedelta
from bson import ObjectId
import json
from app.database import db
from app.dependencies import get_current_user, require_role
from app.models.product import ProductCreate, ProductUpdate, StockUpdateRequest, ProductResponse
from app.services.upload_service import upload_to_cloudinary
from app.utils.geo import haversine_distance
from app.services.notification_service import notify_user

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
        
        for wl in wishlists:
            await notify_user(
                str(wl["user_id"]),
                "Back in stock!",
                f"{product['name']} is now available at a nearby store.",
                "stock",
                f"/products/{product_id}",
                db
            )
            
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
        # Use $regex for broad compatibility; text index helps if available
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

@router.get("/search")
async def search_products(
    q: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = Query(5.0, ge=0),
    sort: str = Query("distance", pattern="^(distance|price|rating)$"),
    available_now: bool = False,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    query = {"is_active": True}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    
    products_cursor = db.products.find(query)
    all_products = await products_cursor.to_list(length=None)
    
    filtered = []
    
    for prod in all_products:
        if available_now:
            avail = prod["stock"] - prod.get("reserved_qty", 0)
            if avail <= 0:
                continue
                
        profile = await db.vendor_profiles.find_one({"user_id": prod["vendor_id"]})
        
        distance = None
        store_name = "Unknown"
        city = ""
        
        if profile:
            store_name = profile.get("store_name", "Unknown")
            city = profile.get("city", "")
            if lat is not None and lng is not None and profile.get("location") and profile["location"].get("coordinates"):
                store_lng = profile["location"]["coordinates"][0]
                store_lat = profile["location"]["coordinates"][1]
                distance = haversine_distance(lat, lng, store_lat, store_lng)
        
        if lat is not None and lng is not None and distance is not None and distance > radius_km:
            continue
            
        prod_data = format_product_response(prod).model_dump()
        prod_data["distance_km"] = distance
        prod_data["store_name"] = store_name
        prod_data["city"] = city
        filtered.append(prod_data)
        
    if sort == "distance" and lat is not None and lng is not None:
        filtered.sort(key=lambda x: (x["distance_km"] is None, x["distance_km"]))
    elif sort == "price":
        filtered.sort(key=lambda x: x["discounted_price"] if x.get("discounted_price") is not None else x["price"])
    elif sort == "rating":
        filtered.sort(key=lambda x: x["average_rating"], reverse=True)
        
    total = len(filtered)
    start = (page - 1) * limit
    end = start + limit
    page_results = filtered[start:end]
    
    return {
        "products": page_results,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if limit > 0 else 1
    }

@router.get("/emergency")
async def emergency_search(
    q: str = Query(..., min_length=2),
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(10.0, ge=0)
):
    actual_radius = min(radius_km, 25.0)
    
    query = {
        "is_active": True,
        "name": {"$regex": q, "$options": "i"}
    }
    
    products_cursor = db.products.find(query)
    all_products = await products_cursor.to_list(length=None)
    
    filtered = []
    
    for prod in all_products:
        avail = prod["stock"] - prod.get("reserved_qty", 0)
        if avail <= 0:
            continue
            
        profile = await db.vendor_profiles.find_one({"user_id": prod["vendor_id"]})
        if not profile or not profile.get("location") or not profile["location"].get("coordinates"):
            continue
            
        store_lng = profile["location"]["coordinates"][0]
        store_lat = profile["location"]["coordinates"][1]
        distance = haversine_distance(lat, lng, store_lat, store_lng)
        
        if distance <= actual_radius:
            prod_data = format_product_response(prod).model_dump()
            prod_data["distance_km"] = distance
            prod_data["store_name"] = profile.get("store_name", "Unknown")
            prod_data["city"] = profile.get("city", "")
            filtered.append(prod_data)
            
    filtered.sort(key=lambda x: x["distance_km"])
    
    return {
        "products": filtered[:30],
        "total": len(filtered),
        "page": 1,
        "pages": 1
    }

@router.get("/recommended")
async def recommended_products(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    current_user: dict = Depends(require_role(["user"]))
):
    past_reservations = await db.reservations.find(
        {"user_id": ObjectId(current_user["_id"]), "status": "completed"}
    ).sort("created_at", -1).limit(10).to_list(length=10)
    
    category_counts = {}
    for r in past_reservations:
        for item in r.get("items", []):
            prod = await db.products.find_one({"_id": ObjectId(item["product_id"])})
            if prod and prod.get("category"):
                cat = prod["category"]
                category_counts[cat] = category_counts.get(cat, 0) + 1
                
    top_categories = [c for c, _ in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)]
    
    pipeline = [
        {"$match": {"created_at": {"$gte": datetime.utcnow() - timedelta(days=30)}}},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    trending = await db.reservations.aggregate(pipeline).to_list(length=10)
    trending_ids = [t["_id"] for t in trending]
    
    results = []
    seen_ids = set()
    
    async def add_product(prod):
        if str(prod["_id"]) in seen_ids or not prod.get("is_active"):
            return
        
        profile = await db.vendor_profiles.find_one({"user_id": prod["vendor_id"]})
        distance = None
        if profile and lat is not None and lng is not None and profile.get("location") and profile["location"].get("coordinates"):
            store_lng = profile["location"]["coordinates"][0]
            store_lat = profile["location"]["coordinates"][1]
            distance = haversine_distance(lat, lng, store_lat, store_lng)
            
            if distance > 10.0:
                return
                
        prod_data = format_product_response(prod).model_dump()
        prod_data["distance_km"] = distance
        prod_data["store_name"] = profile.get("store_name", "Unknown") if profile else "Unknown"
        prod_data["city"] = profile.get("city", "") if profile else ""
        
        results.append(prod_data)
        seen_ids.add(str(prod["_id"]))

    if top_categories:
        cat_products = await db.products.find({"category": {"$in": top_categories}, "is_active": True}).to_list(length=50)
        for p in cat_products:
            await add_product(p)
            if len(results) >= 5:
                break
                
    for tid in trending_ids:
        p = await db.products.find_one({"_id": tid})
        if p:
            await add_product(p)
            
    if len(results) < 10:
        extra = await db.products.find({"is_active": True}).sort("average_rating", -1).limit(20).to_list(length=20)
        for p in extra:
            await add_product(p)
            if len(results) >= 10:
                break
                
    return results[:10]


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
