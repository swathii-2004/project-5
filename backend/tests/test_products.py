import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from bson import ObjectId
from datetime import datetime

# Override DB to test database before importing app
import os
os.environ["MONGODB_URL"] = os.environ.get(
    "MONGODB_TEST_URL", "mongodb://localhost:27017/proximart_test"
)

from app.main import app
from app.database import db


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _register_and_login(client: AsyncClient, email: str, role: str) -> str:
    """Register user/vendor and return JWT token."""
    payload = {"name": "Test User", "email": email, "password": "Test@1234", "role": role}
    if role == "vendor":
        payload["store_name"] = "Test Store"
        payload["city"] = "Mumbai"
        payload["state"] = "Maharashtra"
    await client.post("/api/v1/auth/register", json=payload)
    login_res = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "Test@1234"}
    )
    return login_res.json().get("access_token", "")


async def _create_product(client: AsyncClient, token: str, **overrides) -> dict:
    """Helper to create a product via multipart form."""
    data = {
        "name": overrides.get("name", "Test Apple"),
        "description": overrides.get("description", "Fresh red apples from Himachal"),
        "category": overrides.get("category", "groceries"),
        "price": str(overrides.get("price", "99.99")),
        "stock": str(overrides.get("stock", "50")),
        "low_stock_threshold": str(overrides.get("low_stock_threshold", "5")),
        "tags_json": overrides.get("tags_json", '["fruit","fresh"]'),
    }
    res = await client.post(
        "/api/v1/products/",
        data=data,
        headers={"Authorization": f"Bearer {token}"},
    )
    return res


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="module", autouse=True)
async def cleanup():
    """Clean test DB before and after the module."""
    await db.users.delete_many({"email": {"$regex": ".*@test\\.com$"}})
    await db.products.delete_many({})
    await db.wishlists.delete_many({})
    yield
    await db.users.delete_many({"email": {"$regex": ".*@test\\.com$"}})
    await db.products.delete_many({})
    await db.wishlists.delete_many({})


@pytest_asyncio.fixture(scope="module")
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest_asyncio.fixture(scope="module")
async def vendor_token(client):
    return await _register_and_login(client, "vendor1@test.com", "vendor")


@pytest_asyncio.fixture(scope="module")
async def vendor2_token(client):
    return await _register_and_login(client, "vendor2@test.com", "vendor")


@pytest_asyncio.fixture(scope="module")
async def user_token(client):
    return await _register_and_login(client, "user1@test.com", "user")


# ─── Tests ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_01_create_product_as_vendor(client, vendor_token):
    """Test 1: POST /products as vendor multipart no images → 201"""
    res = await _create_product(client, vendor_token)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["name"] == "Test Apple"
    assert data["category"] == "groceries"
    assert data["stock"] == 50


@pytest.mark.asyncio
async def test_02_create_product_as_user_forbidden(client, user_token):
    """Test 2: POST /products as user → 403"""
    res = await _create_product(client, user_token)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_03_list_my_products(client, vendor_token):
    """Test 3: GET /products/mine as vendor → 200 list returned"""
    res = await client.get(
        "/api/v1/products/mine",
        headers={"Authorization": f"Bearer {vendor_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "products" in data
    assert len(data["products"]) >= 1


@pytest.mark.asyncio
async def test_04_update_product_as_owner(client, vendor_token):
    """Test 4: PUT /products/:id as owner → 200 updated"""
    # Get product id
    mine_res = await client.get(
        "/api/v1/products/mine",
        headers={"Authorization": f"Bearer {vendor_token}"},
    )
    product_id = mine_res.json()["products"][0]["id"]

    res = await client.put(
        f"/api/v1/products/{product_id}",
        data={"name": "Updated Apple"},
        headers={"Authorization": f"Bearer {vendor_token}"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Apple"


@pytest.mark.asyncio
async def test_05_update_product_as_other_vendor(client, vendor_token, vendor2_token):
    """Test 5: PUT /products/:id as different vendor → 403"""
    mine_res = await client.get(
        "/api/v1/products/mine",
        headers={"Authorization": f"Bearer {vendor_token}"},
    )
    product_id = mine_res.json()["products"][0]["id"]

    res = await client.put(
        f"/api/v1/products/{product_id}",
        data={"name": "Hacked Name"},
        headers={"Authorization": f"Bearer {vendor2_token}"},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_06_delete_product(client, vendor_token):
    """Test 6: DELETE /products/:id → 200 soft deleted"""
    # Create a dedicated product to delete
    res = await _create_product(client, vendor_token, name="Delete Me", stock=10)
    product_id = res.json()["id"]

    del_res = await client.delete(
        f"/api/v1/products/{product_id}",
        headers={"Authorization": f"Bearer {vendor_token}"},
    )
    assert del_res.status_code == 200
    assert del_res.json()["message"] == "Product removed successfully"

    # Verify soft delete in DB
    doc = await db.products.find_one({"_id": ObjectId(product_id)})
    assert doc["is_active"] is False


@pytest.mark.asyncio
async def test_07_get_deleted_product_returns_404(client, vendor_token):
    """Test 7: GET /products/:id after delete → 404"""
    res = await _create_product(client, vendor_token, name="Soon Gone")
    product_id = res.json()["id"]

    await client.delete(
        f"/api/v1/products/{product_id}",
        headers={"Authorization": f"Bearer {vendor_token}"},
    )

    get_res = await client.get(f"/api/v1/products/{product_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_08_list_products_by_category(client, vendor_token):
    """Test 8: GET /products?category=groceries → filtered results"""
    # Ensure a groceries product exists
    await _create_product(client, vendor_token, name="Milk", category="dairy")

    res = await client.get("/api/v1/products/?category=groceries")
    assert res.status_code == 200
    data = res.json()
    for product in data["products"]:
        assert product["category"] == "groceries"


@pytest.mark.asyncio
async def test_09_stock_update_increase(client, vendor_token):
    """Test 9: PUT /products/:id/stock +10 → stock increases"""
    res = await _create_product(client, vendor_token, name="Stock Item", stock=20)
    product_id = res.json()["id"]

    stock_res = await client.put(
        f"/api/v1/products/{product_id}/stock",
        json={"quantity": 10},
        headers={"Authorization": f"Bearer {vendor_token}"},
    )
    assert stock_res.status_code == 200
    assert stock_res.json()["stock"] == 30


@pytest.mark.asyncio
async def test_10_stock_update_negative_result(client, vendor_token):
    """Test 10: PUT /products/:id/stock negative result → 400"""
    res = await _create_product(client, vendor_token, name="Low Stock Item", stock=5)
    product_id = res.json()["id"]

    stock_res = await client.put(
        f"/api/v1/products/{product_id}/stock",
        json={"quantity": -10},
        headers={"Authorization": f"Bearer {vendor_token}"},
    )
    assert stock_res.status_code == 400


@pytest.mark.asyncio
async def test_11_add_to_wishlist(client, vendor_token, user_token):
    """Test 11: POST /wishlist → 201"""
    res = await _create_product(client, vendor_token, name="Wishlist Item")
    product_id = res.json()["id"]

    wl_res = await client.post(
        "/api/v1/wishlist/",
        json={"product_id": product_id, "notify_on_restock": True, "notify_on_price_drop": True},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert wl_res.status_code == 201
    assert wl_res.json()["message"] == "Added to wishlist"


@pytest.mark.asyncio
async def test_12_add_duplicate_wishlist(client, vendor_token, user_token):
    """Test 12: POST /wishlist duplicate → 400"""
    res = await _create_product(client, vendor_token, name="Wishlist Dup")
    product_id = res.json()["id"]

    await client.post(
        "/api/v1/wishlist/",
        json={"product_id": product_id},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    dup_res = await client.post(
        "/api/v1/wishlist/",
        json={"product_id": product_id},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert dup_res.status_code == 400


@pytest.mark.asyncio
async def test_13_remove_from_wishlist(client, vendor_token, user_token):
    """Test 13: DELETE /wishlist/:product_id → 200"""
    res = await _create_product(client, vendor_token, name="Wishlist Remove")
    product_id = res.json()["id"]

    await client.post(
        "/api/v1/wishlist/",
        json={"product_id": product_id},
        headers={"Authorization": f"Bearer {user_token}"},
    )

    del_res = await client.delete(
        f"/api/v1/wishlist/{product_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_14_get_wishlist_with_price_drop_flag(client, vendor_token, user_token):
    """Test 14: GET /wishlist → 200 with price_drop flag"""
    # Create product at price 100, add to wishlist, then lower price
    res = await _create_product(client, vendor_token, name="Price Drop Item", price=100)
    product_id = res.json()["id"]

    await client.post(
        "/api/v1/wishlist/",
        json={"product_id": product_id},
        headers={"Authorization": f"Bearer {user_token}"},
    )

    # Simulate price drop via DB
    await db.products.update_one(
        {"_id": ObjectId(product_id)}, {"$set": {"price": 80.0}}
    )

    wl_res = await client.get(
        "/api/v1/wishlist/",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert wl_res.status_code == 200
    items = wl_res.json()
    price_drop_items = [i for i in items if i.get("price_drop")]
    assert len(price_drop_items) >= 1
