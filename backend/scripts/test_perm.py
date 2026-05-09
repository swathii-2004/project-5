import asyncio
import httpx
from app.utils.jwt import encode_token
from datetime import timedelta
from bson import ObjectId
from app.config import settings

async def test_permission():
    # ss user ID from DB script
    user_id = "69fc9dd0a29eb7d0e1db1d23"
    role = "user"
    
    token = encode_token({"user_id": user_id, "role": role}, timedelta(minutes=15))
    
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient(base_url="http://localhost:8000/api/v1") as client:
        # Test /users/me
        r1 = await client.get("/users/me", headers=headers)
        print(f"GET /users/me Status: {r1.status_code}")
        try:
            print(f"GET /users/me Body: {r1.json()}")
        except:
            print(f"GET /users/me Body: {r1.text}")
        
        # Test /reservations/ (POST)
        data = {
            "product_id": "69fc9f07a29eb7d0e1db1d25", # aa product
            "store_id": "69f845292f7fa8b1eadc9b0d",
            "quantity": 1,
            "pickup_contact_phone": "1234567890"
        }
        r2 = await client.post("/reservations/", json=data, headers=headers)
        print(f"POST /reservations/: {r2.status_code} - {r2.text}")

if __name__ == "__main__":
    asyncio.run(test_permission())
