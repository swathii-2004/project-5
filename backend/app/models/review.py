from pydantic import BaseModel, ConfigDict, field_validator
from typing import Literal


class ReviewCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    target_id: str
    target_type: Literal["store", "product"]
    rating: int
    comment: str
    reservation_id: str

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v):
        if not 1 <= v <= 5:
            raise ValueError("rating must be between 1 and 5")
        return v

    @field_validator("comment")
    @classmethod
    def comment_min(cls, v):
        if len(v) < 5:
            raise ValueError("comment must be at least 5 characters")
        return v
