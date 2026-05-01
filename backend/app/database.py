from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client.get_default_database()

async def get_db():
    yield db

async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.users.create_index("status")
    
    await db.vendor_profiles.create_index("user_id", unique=True)
    await db.vendor_profiles.create_index([("location", "2dsphere")])
    
    await db.products.create_index("vendor_id")
    await db.products.create_index("category")
    await db.products.create_index("is_active")
    await db.products.create_index(
        [("name", "text"), ("description", "text"), ("tags", "text")]
    )
    
    await db.reservations.create_index("user_id")
    await db.reservations.create_index("vendor_id")
    await db.reservations.create_index("status")
    await db.reservations.create_index("expires_at")
    
    await db.admin_audit_log.create_index("admin_id")
    await db.admin_audit_log.create_index("action")
    await db.admin_audit_log.create_index("created_at")
    
    # Phase 3 indexes
    await db.wishlists.create_index([("user_id", 1), ("product_id", 1)], unique=True)
    await db.notifications.create_index([("user_id", 1), ("is_read", 1)])
    await db.notifications.create_index("created_at")
