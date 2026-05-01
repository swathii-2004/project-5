import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from bson import ObjectId
from datetime import datetime, timedelta
import os

os.environ["MONGODB_URL"] = os.environ.get(
    "MONGODB_TEST_URL", "mongodb://localhost:27017/proximart_test"
)

from app.main import app
from app.database import db
from app.tasks.expire_reservations import expire_reservations


# ── helpers ──────────────────────────────────────────────────────────────────

async def _login(client, email, password="Test@1234"):
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return r.json().get("access_token", "")


async def _register(client, email, role, **extra):
    payload = {"name": "Test", "email": email, "password": "Test@1234", "role": role}
    if role == "vendor":
        payload.update({"store_name": "S", "city": "C", "state": "ST"})
    payload.update(extra)
    await client.post("/api/v1/auth/register", json=payload)


async def _create_product(client, token, stock=10):
    r = await client.post(
        "/api/v1/products/",
        data={
            "name": "ResvProd", "description": "A test product for reservations",
            "category": "groceries", "price": "100", "stock": str(stock),
            "low_stock_threshold": "2", "tags_json": "[]"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    return r.json()


async def _get_store_id(client, token):
    r = await client.get("/api/v1/vendors/me/profile",
                         headers={"Authorization": f"Bearer {token}"})
    return r.json().get("id", "")


async def _reserve(client, token, product_id, store_id, qty=1):
    return await client.post(
        "/api/v1/reservations/",
        json={"product_id": product_id, "store_id": store_id,
              "quantity": qty, "pickup_contact_phone": "9876543210"},
        headers={"Authorization": f"Bearer {token}"}
    )


# ── fixtures ─────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="module", autouse=True)
async def cleanup():
    for col in ["users", "products", "reservations", "reviews", "wishlists"]:
        await getattr(db, col).delete_many({"email": {"$regex": ".*@resv\\.test$"}})
    await db.reservations.delete_many({})
    await db.reviews.delete_many({})
    yield
    await db.reservations.delete_many({})
    await db.reviews.delete_many({})


@pytest_asyncio.fixture(scope="module")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture(scope="module")
async def vendor_tok(client):
    await _register(client, "v1@resv.test", "vendor")
    return await _login(client, "v1@resv.test")


@pytest_asyncio.fixture(scope="module")
async def vendor2_tok(client):
    await _register(client, "v2@resv.test", "vendor")
    return await _login(client, "v2@resv.test")


@pytest_asyncio.fixture(scope="module")
async def user_tok(client):
    await _register(client, "u1@resv.test", "user")
    return await _login(client, "u1@resv.test")


# ── tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_01_create_reservation(client, vendor_tok, user_tok):
    """POST /reservations → 201, reserved_qty incremented"""
    prod = await _create_product(client, vendor_tok, stock=10)
    sid = await _get_store_id(client, vendor_tok)
    r = await _reserve(client, user_tok, prod["id"], sid, qty=3)
    assert r.status_code == 201, r.text
    assert r.json()["status"] == "pending"
    doc = await db.products.find_one({"_id": ObjectId(prod["id"])})
    assert doc["reserved_qty"] == 3


@pytest.mark.asyncio
async def test_02_insufficient_stock(client, vendor_tok, user_tok):
    """POST /reservations with quantity > available → 400"""
    prod = await _create_product(client, vendor_tok, stock=2)
    sid = await _get_store_id(client, vendor_tok)
    r = await _reserve(client, user_tok, prod["id"], sid, qty=5)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_03_confirm_reservation(client, vendor_tok, user_tok):
    """PUT confirm as correct vendor → status=confirmed"""
    prod = await _create_product(client, vendor_tok, stock=5)
    sid = await _get_store_id(client, vendor_tok)
    res = await _reserve(client, user_tok, prod["id"], sid)
    rid = res.json()["id"]
    r = await client.put(
        f"/api/v1/reservations/{rid}/confirm", json={"note": "Ready!"},
        headers={"Authorization": f"Bearer {vendor_tok}"}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed"


@pytest.mark.asyncio
async def test_04_confirm_wrong_vendor(client, vendor_tok, vendor2_tok, user_tok):
    """PUT confirm as wrong vendor → 403"""
    prod = await _create_product(client, vendor_tok, stock=5)
    sid = await _get_store_id(client, vendor_tok)
    res = await _reserve(client, user_tok, prod["id"], sid)
    rid = res.json()["id"]
    r = await client.put(
        f"/api/v1/reservations/{rid}/confirm", json={},
        headers={"Authorization": f"Bearer {vendor2_tok}"}
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_05_reject_releases_stock(client, vendor_tok, user_tok):
    """PUT reject → status=rejected, reserved_qty released"""
    prod = await _create_product(client, vendor_tok, stock=5)
    sid = await _get_store_id(client, vendor_tok)
    res = await _reserve(client, user_tok, prod["id"], sid, qty=2)
    rid = res.json()["id"]
    r = await client.put(
        f"/api/v1/reservations/{rid}/reject",
        json={"reason": "Sorry, item no longer available"},
        headers={"Authorization": f"Bearer {vendor_tok}"}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"
    doc = await db.products.find_one({"_id": ObjectId(prod["id"])})
    assert doc["reserved_qty"] == 0


@pytest.mark.asyncio
async def test_06_cancel_releases_stock(client, vendor_tok, user_tok):
    """PUT cancel as user → status=cancelled, reserved_qty released"""
    prod = await _create_product(client, vendor_tok, stock=5)
    sid = await _get_store_id(client, vendor_tok)
    res = await _reserve(client, user_tok, prod["id"], sid, qty=1)
    rid = res.json()["id"]
    r = await client.put(
        f"/api/v1/reservations/{rid}/cancel",
        headers={"Authorization": f"Bearer {user_tok}"}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"
    doc = await db.products.find_one({"_id": ObjectId(prod["id"])})
    assert doc["reserved_qty"] == 0


@pytest.mark.asyncio
async def test_07_cancel_completed_fails(client, vendor_tok, user_tok):
    """PUT cancel on completed reservation → 400"""
    prod = await _create_product(client, vendor_tok, stock=5)
    sid = await _get_store_id(client, vendor_tok)
    res = await _reserve(client, user_tok, prod["id"], sid)
    rid = res.json()["id"]
    # confirm then complete
    await client.put(f"/api/v1/reservations/{rid}/confirm", json={},
                     headers={"Authorization": f"Bearer {vendor_tok}"})
    await client.put(f"/api/v1/reservations/{rid}/complete",
                     headers={"Authorization": f"Bearer {vendor_tok}"})
    r = await client.put(f"/api/v1/reservations/{rid}/cancel",
                          headers={"Authorization": f"Bearer {user_tok}"})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_08_complete_decrements_stock(client, vendor_tok, user_tok):
    """PUT complete → status=completed, stock reduced, reserved_qty released"""
    prod = await _create_product(client, vendor_tok, stock=8)
    sid = await _get_store_id(client, vendor_tok)
    res = await _reserve(client, user_tok, prod["id"], sid, qty=3)
    rid = res.json()["id"]
    await client.put(f"/api/v1/reservations/{rid}/confirm", json={},
                     headers={"Authorization": f"Bearer {vendor_tok}"})
    r = await client.put(f"/api/v1/reservations/{rid}/complete",
                          headers={"Authorization": f"Bearer {vendor_tok}"})
    assert r.status_code == 200
    assert r.json()["status"] == "completed"
    doc = await db.products.find_one({"_id": ObjectId(prod["id"])})
    assert doc["stock"] == 5
    assert doc["reserved_qty"] == 0


@pytest.mark.asyncio
async def test_09_submit_review(client, vendor_tok, user_tok):
    """POST /reviews on completed reservation → 201"""
    prod = await _create_product(client, vendor_tok, stock=5)
    sid = await _get_store_id(client, vendor_tok)
    res = await _reserve(client, user_tok, prod["id"], sid)
    rid = res.json()["id"]
    await client.put(f"/api/v1/reservations/{rid}/confirm", json={},
                     headers={"Authorization": f"Bearer {vendor_tok}"})
    await client.put(f"/api/v1/reservations/{rid}/complete",
                     headers={"Authorization": f"Bearer {vendor_tok}"})
    r = await client.post(
        "/api/v1/reviews/",
        json={"target_id": prod["id"], "target_type": "product",
              "rating": 5, "comment": "Great product!", "reservation_id": rid},
        headers={"Authorization": f"Bearer {user_tok}"}
    )
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_10_duplicate_review(client, vendor_tok, user_tok):
    """POST /reviews duplicate → 400"""
    prod = await _create_product(client, vendor_tok, stock=5)
    sid = await _get_store_id(client, vendor_tok)
    res = await _reserve(client, user_tok, prod["id"], sid)
    rid = res.json()["id"]
    await client.put(f"/api/v1/reservations/{rid}/confirm", json={},
                     headers={"Authorization": f"Bearer {vendor_tok}"})
    await client.put(f"/api/v1/reservations/{rid}/complete",
                     headers={"Authorization": f"Bearer {vendor_tok}"})
    payload = {"target_id": prod["id"], "target_type": "product",
               "rating": 4, "comment": "Good product", "reservation_id": rid}
    await client.post("/api/v1/reviews/", json=payload,
                      headers={"Authorization": f"Bearer {user_tok}"})
    r = await client.post("/api/v1/reviews/", json=payload,
                           headers={"Authorization": f"Bearer {user_tok}"})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_11_review_pending_reservation(client, vendor_tok, user_tok):
    """POST /reviews on pending reservation → 400"""
    prod = await _create_product(client, vendor_tok, stock=5)
    sid = await _get_store_id(client, vendor_tok)
    res = await _reserve(client, user_tok, prod["id"], sid)
    rid = res.json()["id"]
    r = await client.post(
        "/api/v1/reviews/",
        json={"target_id": prod["id"], "target_type": "product",
              "rating": 3, "comment": "Early review", "reservation_id": rid},
        headers={"Authorization": f"Bearer {user_tok}"}
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_12_list_user_reservations(client, user_tok):
    """GET /reservations/user → 200"""
    r = await client.get("/api/v1/reservations/user",
                          headers={"Authorization": f"Bearer {user_tok}"})
    assert r.status_code == 200
    assert "reservations" in r.json()


@pytest.mark.asyncio
async def test_13_list_vendor_reservations(client, vendor_tok):
    """GET /reservations/vendor → 200"""
    r = await client.get("/api/v1/reservations/vendor",
                          headers={"Authorization": f"Bearer {vendor_tok}"})
    assert r.status_code == 200
    assert "reservations" in r.json()


@pytest.mark.asyncio
async def test_14_expiry_task(client, vendor_tok, user_tok):
    """Expiry task: set expires_at to past → status=expired, stock released"""
    prod = await _create_product(client, vendor_tok, stock=5)
    sid = await _get_store_id(client, vendor_tok)
    res = await _reserve(client, user_tok, prod["id"], sid, qty=2)
    rid = res.json()["id"]

    # Force expiry
    await db.reservations.update_one(
        {"_id": ObjectId(rid)},
        {"$set": {"expires_at": datetime.utcnow() - timedelta(minutes=1)}}
    )
    await expire_reservations(db)

    doc = await db.reservations.find_one({"_id": ObjectId(rid)})
    assert doc["status"] == "expired"
    prod_doc = await db.products.find_one({"_id": ObjectId(prod["id"])})
    assert prod_doc["reserved_qty"] == 0
