from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
from app.database import get_db
from app.utils.jwt import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)) -> dict:
    payload = decode_token(token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    if user.get("status") != "active":
        raise HTTPException(status_code=401, detail="Account is not active")
        
    with open("access_logs.txt", "a") as f:
        f.write(f"AUTH_SUCCESS: User {user.get('email')} has role {user.get('role')}\n")
        
    return user

def require_role(roles: list[str]):
    def guard(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = (current_user.get("role") or "").lower()
        allowed_roles = [r.lower() for r in roles]
        
        if user_role not in allowed_roles:
            with open("access_logs.txt", "a") as f:
                f.write(f"DENIED: User {current_user.get('email')} with role {current_user.get('role')} tried to access roles {roles}\n")
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return guard
