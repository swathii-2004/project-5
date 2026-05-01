import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import patch
from app.main import app
from app.config import settings
from app.database import get_db
from motor.motor_asyncio import AsyncIOMotorClient

assert settings.MONGODB_URL != settings.MONGO_TEST_DB, "Never use production DB for tests"

client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.MONGO_TEST_DB]

async def override_get_db():
    yield db

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture(autouse=True)
async def clear_db():
    await db.users.delete_many({})
    await db.vendor_profiles.delete_many({})
    yield

@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

# Test 1
@pytest.mark.asyncio
async def test_signup_user(async_client):
    res = await async_client.post(
        "/api/v1/auth/signup?role=user",
        json={"name": "Test User", "email": "test@user.com", "password": "password123", "confirm_password": "password123", "phone": "1234567890"}
    )
    assert res.status_code == 201
    assert "access_token" in res.json()

# Test 2
@pytest.mark.asyncio
async def test_signup_user_duplicate_email(async_client):
    data = {"name": "Test", "email": "test@user.com", "password": "password123", "confirm_password": "password123", "phone": "1234567890"}
    await async_client.post("/api/v1/auth/signup?role=user", json=data)
    res = await async_client.post("/api/v1/auth/signup?role=user", json=data)
    assert res.status_code == 400

# Test 3
@pytest.mark.asyncio
@patch("app.services.auth_service.upload_to_cloudinary", return_value="http://mock.url")
async def test_signup_vendor(mock_upload, async_client):
    data = {
        "name": "Vendor", "email": "vendor@test.com", "password": "password123",
        "phone": "1234567890", "store_name": "Store", "gst_number": "GST123", "city": "City"
    }
    files = {"documents": ("test.pdf", b"%PDF-", "application/pdf")}
    res = await async_client.post("/api/v1/auth/signup?role=vendor", data=data, files=files)
    assert res.status_code == 201
    assert res.json()["user"]["status"] == "pending"

# Test 4
@pytest.mark.asyncio
async def test_login_correct_credentials(async_client):
    await async_client.post("/api/v1/auth/signup?role=user", json={"name": "Test", "email": "test@user.com", "password": "password123", "confirm_password": "password123", "phone": "1234567890"})
    res = await async_client.post("/api/v1/auth/login", json={"email": "test@user.com", "password": "password123"})
    assert res.status_code == 200
    assert "access_token" in res.json()

# Test 5
@pytest.mark.asyncio
async def test_login_wrong_password(async_client):
    await async_client.post("/api/v1/auth/signup?role=user", json={"name": "Test", "email": "test@user.com", "password": "password123", "confirm_password": "password123", "phone": "1234567890"})
    res = await async_client.post("/api/v1/auth/login", json={"email": "test@user.com", "password": "wrong"})
    assert res.status_code == 401

# Test 6
@pytest.mark.asyncio
@patch("app.services.auth_service.upload_to_cloudinary", return_value="http://mock.url")
async def test_login_pending_vendor(mock_upload, async_client):
    data = {
        "name": "Vendor", "email": "vendor@test.com", "password": "password123",
        "phone": "1234567890", "store_name": "Store", "gst_number": "GST123", "city": "City"
    }
    files = {"documents": ("test.pdf", b"%PDF-", "application/pdf")}
    await async_client.post("/api/v1/auth/signup?role=vendor", data=data, files=files)
    res = await async_client.post("/api/v1/auth/login", json={"email": "vendor@test.com", "password": "password123"})
    assert res.status_code == 403
    assert "approval" in res.json()["detail"].lower()

# Test 7
@pytest.mark.asyncio
async def test_login_rejected_user(async_client):
    await async_client.post("/api/v1/auth/signup?role=user", json={"name": "Test", "email": "test@user.com", "password": "password123", "confirm_password": "password123", "phone": "1234567890"})
    await db.users.update_one({"email": "test@user.com"}, {"$set": {"status": "rejected"}})
    res = await async_client.post("/api/v1/auth/login", json={"email": "test@user.com", "password": "password123"})
    assert res.status_code == 403
    assert "rejected" in res.json()["detail"].lower()

# Test 8
@pytest.mark.asyncio
async def test_refresh_valid_cookie(async_client):
    res = await async_client.post("/api/v1/auth/signup?role=user", json={"name": "Test", "email": "test@user.com", "password": "password123", "confirm_password": "password123", "phone": "1234567890"})
    cookies = res.cookies
    res2 = await async_client.post("/api/v1/auth/refresh", cookies=cookies)
    assert res2.status_code == 200
    assert "access_token" in res2.json()

# Test 9
@pytest.mark.asyncio
async def test_refresh_no_cookie(async_client):
    res = await async_client.post("/api/v1/auth/refresh")
    assert res.status_code == 401

# Test 10
@pytest.mark.asyncio
async def test_logout(async_client):
    res = await async_client.post("/api/v1/auth/logout")
    assert res.status_code == 200

# Test 11
@pytest.mark.asyncio
async def test_me_valid_token(async_client):
    res = await async_client.post("/api/v1/auth/signup?role=user", json={"name": "Test", "email": "test@user.com", "password": "password123", "confirm_password": "password123", "phone": "1234567890"})
    token = res.json()["access_token"]
    res2 = await async_client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 200

# Test 12
@pytest.mark.asyncio
async def test_me_no_token(async_client):
    res = await async_client.get("/api/v1/users/me")
    assert res.status_code == 401

# Test 13
@pytest.mark.asyncio
async def test_db_user_phone_encrypted(async_client):
    await async_client.post("/api/v1/auth/signup?role=user", json={"name": "Test", "email": "test@user.com", "password": "password123", "confirm_password": "password123", "phone": "1234567890"})
    user = await db.users.find_one({"email": "test@user.com"})
    assert ":" in user["phone"]

# Test 14
@pytest.mark.asyncio
@patch("app.services.auth_service.upload_to_cloudinary", return_value="http://mock.url")
async def test_db_vendor_gst_encrypted(mock_upload, async_client):
    data = {
        "name": "Vendor", "email": "vendor@test.com", "password": "password123",
        "phone": "1234567890", "store_name": "Store", "gst_number": "GST123", "city": "City"
    }
    files = {"documents": ("test.pdf", b"%PDF-", "application/pdf")}
    await async_client.post("/api/v1/auth/signup?role=vendor", data=data, files=files)
    user = await db.users.find_one({"email": "vendor@test.com"})
    vendor_profile = await db.vendor_profiles.find_one({"user_id": user["_id"]})
    assert ":" in vendor_profile["gst_number"]
