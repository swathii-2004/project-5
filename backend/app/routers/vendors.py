from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from bson import ObjectId
from app.database import db
from app.dependencies import get_current_user, require_role
from app.models.vendor import VendorProfileUpdate, VendorProfileResponse
from app.utils.encryption import encrypt, decrypt
from app.services.maps_service import geocode_address

router = APIRouter()

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
