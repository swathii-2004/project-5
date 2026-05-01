from datetime import datetime
from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models.user import UserResponse, UserUpdate
from app.utils.encryption import decrypt, encrypt
from app.database import get_db

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    user = await db.users.find_one({"_id": current_user["_id"]})
    
    decrypted_phone = decrypt(user.get("phone"))
    
    return UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        role=user["role"],
        status=user["status"]
    )

@router.put("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    update_dict = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    
    if "phone" in update_dict:
        update_dict["phone"] = encrypt(update_dict["phone"])
        
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    return UserResponse(
        id=str(updated_user["_id"]),
        name=updated_user["name"],
        email=updated_user["email"],
        role=updated_user["role"],
        status=updated_user["status"]
    )
