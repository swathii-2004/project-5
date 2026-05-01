from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Literal, Optional

class UserSignupUser(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    name: str
    email: EmailStr
    password: str
    confirm_password: str
    phone: str
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v
        
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v
        
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if len(v) < 10 or len(v) > 15:
            raise ValueError("Phone must be between 10 and 15 characters")
        return v
        
    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('passwords do not match')
        return v

class UserSignupVendor(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    name: str
    email: EmailStr
    password: str
    phone: str
    store_name: str
    gst_number: str
    city: str
    role: Literal["vendor"]

    @field_validator('name', 'store_name')
    @classmethod
    def validate_names(cls, v):
        if len(v) < 2:
            raise ValueError("Field must be at least 2 characters")
        return v
        
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    name: str
    email: str
    role: str
    status: str

class TokenResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
