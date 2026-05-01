import argparse
import asyncio
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from app.config import settings

async def main():
    parser = argparse.ArgumentParser(description="Seed admin user")
    parser.add_argument("--email", required=True, help="Admin email")
    parser.add_argument("--password", required=True, help="Admin password")
    args = parser.parse_args()

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.get_default_database()

    existing_admin = await db.users.find_one({"email": args.email})
    if existing_admin:
        print("Admin already exists.")
        sys.exit(0)

    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(args.password.encode('utf-8'), salt)

    now = datetime.utcnow()
    admin_doc = {
        "name": "Admin",
        "email": args.email,
        "hashed_password": hashed.decode('utf-8'),
        "role": "admin",
        "status": "active",
        "phone": None,
        "created_at": now,
        "updated_at": now
    }

    await db.users.insert_one(admin_doc)
    print("Admin user created successfully.")

if __name__ == "__main__":
    asyncio.run(main())
