from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class ReservationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    product_id: str
    store_id: str
    quantity: int
    pickup_contact_phone: str

    from pydantic import field_validator
    @field_validator("quantity")
    @classmethod
    def qty_ge_1(cls, v):
        if v < 1:
            raise ValueError("quantity must be >= 1")
        return v

    @field_validator("pickup_contact_phone")
    @classmethod
    def phone_min(cls, v):
        if len(v) < 10:
            raise ValueError("pickup_contact_phone must be at least 10 characters")
        return v


class ReservationItemSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    product_id: str
    name: str
    price: float
    quantity: int
    image_url: str


class ReservationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    user_id: str
    vendor_id: str
    store_id: Optional[str] = None
    items: List[ReservationItemSchema]
    total_value: float
    status: str
    expires_at: datetime
    confirmed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    vendor_note: Optional[str] = None
    is_group: bool
    countdown_seconds: Optional[float] = None
    created_at: datetime


class RejectReservationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str

    from pydantic import field_validator
    @field_validator("reason")
    @classmethod
    def reason_min(cls, v):
        if len(v) < 10:
            raise ValueError("reason must be at least 10 characters")
        return v


class ConfirmReservationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    note: Optional[str] = None
