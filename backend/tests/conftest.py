import pytest
import pytest_asyncio
from httpx import AsyncClient
from typing import AsyncGenerator
from unittest.mock import patch
from motor.motor_asyncio import AsyncIOMotorClient

from app.main import app
from app.config import settings
from app.database import get_db

# Ensure we're using the test database
assert settings.MONGODB_URL != settings.MONGO_TEST_DB, "Never use production DB for tests"

client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.MONGO_TEST_DB]

async def override_get_db() -> AsyncGenerator:
    yield db

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture(autouse=True)
async def clear_db() -> AsyncGenerator:
    """Clear all test database collections before and after each test."""
    collections = await db.list_collection_names()
    for coll in collections:
        await db[coll].delete_many({})
    yield
    for coll in collections:
        await db[coll].delete_many({})

@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator:
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def user_token(async_client: AsyncClient) -> str:
    """Fixture providing an access token for a standard user."""
    user_data = {
        "name": "Test User",
        "email": "user@test.com",
        "password": "password123",
        "confirm_password": "password123",
        "phone": "1234567890"
    }
    res = await async_client.post("/api/v1/auth/signup?role=user", json=user_data)
    return res.json()["access_token"]

@pytest_asyncio.fixture
async def vendor_token(async_client: AsyncClient) -> str:
    """Fixture providing an access token for an approved vendor."""
    vendor_data = {
        "name": "Test Vendor",
        "email": "vendor@test.com",
        "password": "password123",
        "phone": "0987654321",
        "store_name": "Vendor Store",
        "gst_number": "GST123",
        "city": "Test City"
    }
    files = {"documents": ("test.pdf", b"%PDF-1.4\n%mockpdf", "application/pdf")}
    
    with patch("app.services.auth_service.upload_to_cloudinary", return_value="http://mock.url"):
        # Signup as vendor
        await async_client.post("/api/v1/auth/signup?role=vendor", data=vendor_data, files=files)
        
        # Approve vendor directly via DB
        await db.users.update_one({"email": "vendor@test.com"}, {"$set": {"status": "active"}})
        
        # Login to get token
        login_res = await async_client.post("/api/v1/auth/login", json={"email": "vendor@test.com", "password": "password123"})
        return login_res.json()["access_token"]

@pytest_asyncio.fixture
async def admin_token(async_client: AsyncClient) -> str:
    """Fixture providing an access token for an admin user."""
    # Create admin user directly in DB
    from app.utils.encryption import get_password_hash
    await db.users.insert_one({
        "name": "Admin User",
        "email": "admin@test.com",
        "hashed_password": get_password_hash("password123"),
        "role": "admin",
        "status": "active"
    })
    
    # Login to get token
    login_res = await async_client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "password123"})
    return login_res.json()["access_token"]
