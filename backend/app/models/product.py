from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import List, Optional, Literal
from datetime import datetime

class ProductCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    name: str = Field(..., min_length=2)
    description: str = Field(..., min_length=10)
    category: Literal["groceries", "dairy", "pharmacy", "electronics", "clothing", "other"]
    price: float = Field(..., gt=0)
    stock: int = Field(..., ge=0)
    low_stock_threshold: int = Field(5, ge=0)
    tags: List[str] = []

class ProductUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    tags: Optional[List[str]] = None

class StockUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    quantity: int

class ProductResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    id: str
    vendor_id: str
    store_id: Optional[str] = None
    name: str
    description: str
    category: str
    price: float
    discounted_price: Optional[float] = None
    stock: int
    reserved_qty: int = 0
    available_qty: int
    low_stock_threshold: int
    images: List[str] = []
    is_active: bool = True
    average_rating: float = 0.0
    total_reviews: int = 0
    tags: List[str] = []
    low_stock: bool
    created_at: datetime
