import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from bson import ObjectId

async def check_users():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.get_default_database()
    
    print("--- User Accounts ---")
    async for user in db.users.find():
        print(f"ID: {user['_id']}, Name: {user.get('name')}, Email: {user.get('email')}, Role: {user.get('role')}, Status: {user.get('status')}")
    
    print("\n--- Vendor Profiles ---")
    async for vendor in db.vendor_profiles.find():
        print(f"ID: {vendor['_id']}, UserID: {vendor.get('user_id')}, Store: {vendor.get('store_name')}")

if __name__ == "__main__":
    asyncio.run(check_users())
