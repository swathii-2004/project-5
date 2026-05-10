import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    # Use the Atlas cluster from .env
    client = AsyncIOMotorClient("mongodb+srv://proximart:1234@cluster0.phf9ran.mongodb.net/proximart")
    db = client.proximart
    
    reservations = await db.reservations.find({}).to_list(1000)
    count = 0
    for r in reservations:
        user = await db.users.find_one({"_id": r["user_id"]})
        vendor = await db.users.find_one({"_id": r["vendor_id"]})
        
        user_name = user.get("name", "Unknown User") if user else "Unknown User"
        vendor_name = vendor.get("name", "Unknown Vendor") if vendor else "Unknown Vendor"
        
        await db.reservations.update_one(
            {"_id": r["_id"]},
            {"$set": {"user_name": user_name, "vendor_name": vendor_name}}
        )
        count += 1
            
    print(f"Updated {count} reservations unconditionally with names.")

asyncio.run(main())
