from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from bson import ObjectId
from app.database import get_db
from app.models.user import UserSignupUser, UserSignupVendor, UserLogin, TokenResponse, UserResponse
from app.services.auth_service import signup_user, signup_vendor, login
from app.utils.jwt import encode_token, decode_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup", status_code=201)
async def signup(
    role: str,
    request: Request,
    db=Depends(get_db)
):
    if role == "user":
        body = await request.json()
        data = UserSignupUser(**body)
        user_doc = await signup_user(data, db)
    elif role == "vendor":
        form_data = await request.form()
        
        vendor_data = {
            "name": form_data.get("name"),
            "email": form_data.get("email"),
            "password": form_data.get("password"),
            "phone": form_data.get("phone"),
            "store_name": form_data.get("store_name"),
            "gst_number": form_data.get("gst_number"),
            "city": form_data.get("city"),
            "role": "vendor"
        }
        data = UserSignupVendor(**vendor_data)
        files = form_data.getlist("documents")
        user_doc = await signup_vendor(data, files, db)
    else:
        raise HTTPException(status_code=400, detail="Invalid role. Must be user or vendor")
        
    access_token = encode_token(
        {"user_id": str(user_doc["_id"]), "role": user_doc["role"]},
        timedelta(minutes=15)
    )
    refresh_token = encode_token(
        {"user_id": str(user_doc["_id"])},
        timedelta(days=7)
    )
    
    user_resp = UserResponse(
        id=str(user_doc["_id"]),
        name=user_doc["name"],
        email=user_doc["email"],
        role=user_doc["role"],
        status=user_doc["status"]
    )
    
    json_resp = JSONResponse(
        content=TokenResponse(access_token=access_token, user=user_resp).model_dump(),
        status_code=201
    )
    
    json_resp.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="strict",
        max_age=604800
    )
    
    return json_resp

@router.post("/login")
async def login_route(data: UserLogin, db=Depends(get_db)):
    user_doc = await login(data, db)
    
    access_token = encode_token(
        {"user_id": str(user_doc["_id"]), "role": user_doc["role"]},
        timedelta(minutes=15)
    )
    refresh_token = encode_token(
        {"user_id": str(user_doc["_id"])},
        timedelta(days=7)
    )
    
    user_resp = UserResponse(
        id=str(user_doc["_id"]),
        name=user_doc["name"],
        email=user_doc["email"],
        role=user_doc["role"],
        status=user_doc["status"]
    )
    
    json_resp = JSONResponse(
        content=TokenResponse(access_token=access_token, user=user_resp).model_dump(),
        status_code=200
    )
    
    json_resp.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="strict",
        max_age=604800
    )
    return json_resp

@router.post("/refresh")
async def refresh(request: Request, db=Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")
        
    payload = decode_token(refresh_token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")
        
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("status") != "active":
        raise HTTPException(status_code=401, detail="Invalid session")
        
    new_access_token = encode_token(
        {"user_id": str(user["_id"]), "role": user["role"]},
        timedelta(minutes=15)
    )
    
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout():
    response = JSONResponse({"message": "Logged out successfully"})
    response.delete_cookie(key="refresh_token")
    return response
