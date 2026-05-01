from pydantic import BaseModel, ConfigDict
from typing import Optional

class WishlistAddRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    product_id: str
    notify_on_restock: bool = True
    notify_on_price_drop: bool = True
