from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional

class VendorProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    store_name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    categories: Optional[List[str]] = None
    open_hours: Optional[dict] = None

class VendorProfileResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    id: str
    user_id: str
    store_name: str
    description: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    categories: List[str] = []
    is_open_now: bool = True
    average_rating: float = 0.0
    total_reviews: int = 0
    is_profile_complete: bool = False
