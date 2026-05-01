from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from typing import Optional
from app.database import db
from app.utils.geo import haversine_distance
from app.models.vendor import VendorProfileResponse

router = APIRouter(tags=["stores"])


@router.get("/nearby")
async def get_nearby_stores(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(5.0, ge=0),
    product_q: Optional[str] = None
):
    query = {"location": {"$exists": True}, "location.coordinates": {"$exists": True}}
    profiles = await db.vendor_profiles.find(query).to_list(length=1000)
    
    results = []
    for p in profiles:
        store_lng = p["location"]["coordinates"][0]
        store_lat = p["location"]["coordinates"][1]
        distance = haversine_distance(lat, lng, store_lat, store_lng)
        
        if distance <= radius_km:
            prod_query = {"vendor_id": p["user_id"], "is_active": True}
            if product_q:
                prod_query["name"] = {"$regex": product_q, "$options": "i"}
            
            matching_products = await db.products.count_documents(prod_query)
            
            # Stock status
            all_products = await db.products.find({"vendor_id": p["user_id"], "is_active": True}).to_list(length=None)
            stock_status = "out_of_stock"
            for prod in all_products:
                avail = prod["stock"] - prod.get("reserved_qty", 0)
                if avail > 10:
                    stock_status = "in_stock"
                    break
                elif avail > 0:
                    stock_status = "low_stock"
            
            results.append({
                "store_id": str(p["_id"]),
                "store_name": p.get("store_name", ""),
                "city": p.get("city", ""),
                "state": p.get("state", ""),
                "lat": store_lat,
                "lng": store_lng,
                "distance_km": distance,
                "matching_product_count": matching_products,
                "average_rating": p.get("average_rating", 0.0),
                "is_open_now": p.get("is_open_now", False),
                "stock_status": stock_status
            })
            
    results.sort(key=lambda x: x["distance_km"])
    return results


@router.get("/{store_id}")
async def get_store(store_id: str):
    p = await db.vendor_profiles.find_one({"_id": ObjectId(store_id)})
    if not p:
        raise HTTPException(status_code=404, detail="Store not found")
        
    p["id"] = str(p["_id"])
    p["user_id"] = str(p["user_id"])
    res = VendorProfileResponse(**p).model_dump()
    if p.get("location") and p["location"].get("coordinates"):
        res["lat"] = p["location"]["coordinates"][1]
        res["lng"] = p["location"]["coordinates"][0]
    return res


@router.get("/{store_id}/products")
async def get_store_products(
    store_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    query = {"store_id": ObjectId(store_id), "is_active": True}
    total = await db.products.count_documents(query)
    cursor = db.products.find(query).skip((page-1)*limit).limit(limit)
    docs = await cursor.to_list(length=limit)
    
    from app.routers.products import format_product_response
    
    return {
        "products": [format_product_response(d).model_dump() for d in docs],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }
