from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class RejectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str = Field(min_length=10, max_length=500)

class UserFilterParams(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Optional[str] = None
    search: Optional[str] = None
    page: int = 1
    limit: int = 20
