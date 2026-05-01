from pydantic import BaseModel, ConfigDict, field_validator
from typing import List


class GroupReservationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    store_id: str
    group_name: str
    items: List[dict]
    invite_emails: List[str]

    @field_validator("group_name")
    @classmethod
    def name_min(cls, v):
        if len(v) < 2:
            raise ValueError("group_name must be at least 2 characters")
        return v

    @field_validator("invite_emails", mode="before")
    @classmethod
    def validate_emails(cls, v):
        import re
        pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
        for email in v:
            if not re.match(pattern, email):
                raise ValueError(f"Invalid email: {email}")
        return v


class GroupMemberPortion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    portion_qty: int

    @field_validator("portion_qty")
    @classmethod
    def qty_ge_1(cls, v):
        if v < 1:
            raise ValueError("portion_qty must be >= 1")
        return v
