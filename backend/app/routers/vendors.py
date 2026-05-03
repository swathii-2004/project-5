from fastapi import APIRouter, Depends, HTTPException, status
import asyncio
from typing import List
from datetime import datetime, timedelta
from bson import ObjectId
from app.database import db, get_db
from app.dependencies import get_current_user, require_role
from app.models.vendor import VendorProfileUpdate, VendorProfileResponse
from app.utils.encryption import encrypt, decrypt
from app.services.maps_service import geocode_address

router = APIRouter()

@router.get("/me/analytics")
async def get_vendor_analytics(
    current_user: dict = Depends(require_role(["vendor"])),
    db=Depends(get_db)
):
    uid = current_user["_id"]
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    month_start = datetime(now.year, now.month, 1)

    async def get_today_reservations():
        return await db.reservations.count_documents({
            "vendor_id": uid,
            "created_at": {"$gte": today_start}
        })

    async def get_pending_count():
        return await db.reservations.count_documents({
            "vendor_id": uid,
            "status": "pending"
        })

    async def get_completed_count():
        return await db.reservations.count_documents({
            "vendor_id": uid,
            "status": "completed"
        })

    async def get_total_confirmed():
        return await db.reservations.count_documents({
            "vendor_id": uid,
            "status": {"$in": ["confirmed", "completed"]}
        })

    async def get_top_5_products():
        pipeline = [
            {"$match": {"vendor_id": uid, "status": "completed"}},
            {"$unwind": "$items"},
            {"$group": {
                "_id": "$items.product_id",
                "total_quantity": {"$sum": "$items.quantity"}
            }},
            {"$sort": {"total_quantity": -1}},
            {"$limit": 5}
        ]
        results = await db.reservations.aggregate(pipeline).to_list(5)
        top_products = []
        for r in results:
            prod = await db.products.find_one({"_id": ObjectId(r["_id"])})
            if prod:
                top_products.append({
                    "product_id": r["_id"],
                    "product_name": prod["name"],
                    "total_quantity": r["total_quantity"]
                })
        return top_products

    async def get_peak_hours():
        pipeline = [
            {"$match": {"vendor_id": uid}},
            {"$group": {
                "_id": {"$hour": "$created_at"},
                "count": {"$sum": 1}
            }}
        ]
        results = await db.reservations.aggregate(pipeline).to_list(24)
        counts = {r["_id"]: r["count"] for r in results}
        return [{"hour": h, "count": counts.get(h, 0)} for h in range(24)]

    async def get_revenue_this_month():
        pipeline = [
            {"$match": {
                "vendor_id": uid,
                "status": "completed",
                "created_at": {"$gte": month_start}
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$total_value"}
            }}
        ]
        results = await db.reservations.aggregate(pipeline).to_list(1)
        return float(results[0]["total"]) if results else 0.0

    async def get_low_stock_products():
        cursor = db.products.find({"vendor_id": uid, "is_active": True})
        docs = await cursor.to_list(None)
        low_stock = []
        for d in docs:
            available = d["stock"] - d.get("reserved_qty", 0)
            if available < d.get("low_stock_threshold", 5):
                low_stock.append({
                    "id": str(d["_id"]),
                    "name": d["name"],
                    "available_qty": available,
                    "low_stock_threshold": d.get("low_stock_threshold", 5)
                })
        return low_stock

    res = await asyncio.gather(
        get_today_reservations(),
        get_pending_count(),
        get_completed_count(),
        get_total_confirmed(),
        get_top_5_products(),
        get_peak_hours(),
        get_revenue_this_month(),
        get_low_stock_products()
    )

    today_res, pending, completed, confirmed, top5, peak, revenue, low_stock = res
    completion_rate = round(completed / confirmed * 100, 1) if confirmed > 0 else 0.0

    return {
        "today_reservations": today_res,
        "pending_count": pending,
        "completed_count": completed,
        "total_confirmed": confirmed,
        "completion_rate": completion_rate,
        "top_5_products": top5,
        "peak_hours": peak,
        "revenue_this_month": revenue,
        "low_stock_products": low_stock
    }

@router.get("/me/analytics/chart")
async def get_vendor_analytics_chart(
    period: str = "week",
    current_user: dict = Depends(require_role(["vendor"])),
    db=Depends(get_db)
):
    uid = current_user["_id"]
    now = datetime.utcnow()
    days = 7 if period == "week" else 30
    start_date = now - timedelta(days=days-1)
    start_date = datetime(start_date.year, start_date.month, start_date.day)

    pipeline = [
        {"$match": {
            "vendor_id": uid,
            "created_at": {"$gte": start_date}
        }},
        {"$group": {
            "_id": {
                "year": {"$year": "$created_at"},
                "month": {"$month": "$created_at"},
                "day": {"$dayOfMonth": "$created_at"}
            },
            "total_reservations": {"$sum": 1},
            "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}}
        }}
    ]
    results = await db.reservations.aggregate(pipeline).to_list(days)
    
    data_map = {}
    for r in results:
        date_str = f"{r['_id']['year']}-{r['_id']['month']:02d}-{r['_id']['day']:02d}"
        data_map[date_str] = {
            "reservations": r["total_reservations"],
            "completed": r["completed"]
        }

    chart_data = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")
        item = data_map.get(date_str, {"reservations": 0, "completed": 0})
        chart_data.append({
            "date": date_str,
            "reservations": item["reservations"],
            "completed": item["completed"]
        })

    return chart_data

@router.get("/me/profile", response_model=VendorProfileResponse)
async def get_my_vendor_profile(current_user: dict = Depends(require_role(["vendor"]))):
    profile = await db.vendor_profiles.find_one({"user_id": ObjectId(current_user["_id"])})
    if not profile:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    
    profile["id"] = str(profile["_id"])
    profile["user_id"] = str(profile["user_id"])
    
    # Decrypt phone for the owner
    if profile.get("phone"):
        try:
            profile["phone"] = decrypt(profile["phone"])
        except Exception:
            pass # Keep encrypted if decryption fails
            
    return VendorProfileResponse(**profile)

@router.put("/me/profile", response_model=VendorProfileResponse)
async def update_my_vendor_profile(
    profile_data: VendorProfileUpdate,
    current_user: dict = Depends(require_role(["vendor"]))
):
    profile = await db.vendor_profiles.find_one({"user_id": ObjectId(current_user["_id"])})
    if not profile:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    
    update_dict = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    
    if "phone" in update_dict:
        update_dict["phone"] = encrypt(update_dict["phone"])
        
    if "address" in update_dict or "city" in update_dict:
        address = update_dict.get("address", profile.get("address", ""))
        city = update_dict.get("city", profile.get("city", ""))
        coords = await geocode_address(address, city)
        if coords:
            update_dict["location"] = {
                "type": "Point",
                "coordinates": [coords["lng"], coords["lat"]]
            }
            
    update_dict["updated_at"] = datetime.utcnow()
    update_dict["is_profile_complete"] = True
    
    await db.vendor_profiles.update_one(
        {"user_id": ObjectId(current_user["_id"])},
        {"$set": update_dict}
    )
    
    updated_profile = await db.vendor_profiles.find_one({"user_id": ObjectId(current_user["_id"])})
    updated_profile["id"] = str(updated_profile["_id"])
    updated_profile["user_id"] = str(updated_profile["user_id"])
    
    return VendorProfileResponse(**updated_profile)

@router.get("/{vendor_id}", response_model=VendorProfileResponse)
async def get_public_vendor_profile(vendor_id: str):
    try:
        profile = await db.vendor_profiles.find_one({"_id": ObjectId(vendor_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid vendor ID")
        
    if not profile:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
        
    profile["id"] = str(profile["_id"])
    profile["user_id"] = str(profile["user_id"])
    
    # Sensitive fields are omitted by the Pydantic model (VendorProfileResponse)
    return VendorProfileResponse(**profile)
