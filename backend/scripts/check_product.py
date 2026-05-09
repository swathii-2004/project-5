import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from bson import ObjectId

async def check_product():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.get_default_database()
    
    pid = "69fc9f07a29eb7d0e1db1d25"
    p = await db.products.find_one({"_id": ObjectId(pid)})
    if p:
        print(f"Product: {p['name']}, VendorID: {p['vendor_id']}, StoreID: {p.get('store_id')}")
        v = await db.users.find_one({"_id": p["vendor_id"]})
        if v:
            print(f"Vendor User: {v['email']}, Role: {v['role']}")
    else:
        print("Product not found")

if __name__ == "__main__":
    asyncio.run(check_product())
