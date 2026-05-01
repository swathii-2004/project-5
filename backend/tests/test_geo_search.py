import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from bson import ObjectId
import os

os.environ["MONGODB_URL"] = os.environ.get("MONGODB_TEST_URL", "mongodb://localhost:27017/proximart_test")

from app.main import app
from app.database import db

# Store location fixtures
STORE_A = {"lat": 12.9716, "lng": 77.5946}  # Bangalore center
STORE_B = {"lat": 12.9800, "lng": 77.6000}  # ~2km away
STORE_C = {"lat": 13.0827, "lng": 80.2707}  # Chennai — far

USER_LAT = 12.97
USER_LNG = 77.59


async def _register_login(client, email, role, **extra):
    payload = {"name": "GeoTest", "email": email, "password": "Test@1234", "role": role}
    if role == "vendor":
        payload.update({"store_name": extra.get("store_name", "S"), "city": "Bangalore", "state": "KA"})
    await client.post("/api/v1/auth/register", json=payload)
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": "Test@1234"})
    return r.json().get("access_token", "")


async def _create_product(client, token, name="Milk", price=50, stock=10):
    r = await client.post(
        "/api/v1/products/",
        data={"name": name, "description": "Test product", "category": "dairy",
              "price": str(price), "stock": str(stock), "low_stock_threshold": "2", "tags_json": "[]"},
        headers={"Authorization": f"Bearer {token}"}
    )
    return r.json()


async def _set_store_location(vendor_id: ObjectId, lat: float, lng: float):
    await db.vendor_profiles.update_one(
        {"user_id": vendor_id},
        {"$set": {"location": {"type": "Point", "coordinates": [lng, lat]}}}
    )


@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_teardown():
    # clean up
    for col in ["users", "products", "vendor_profiles", "reservations"]:
        await getattr(db, col).delete_many({"email": {"$regex": ".*@geo\\.test$"}})
    await db.products.delete_many({"description": "Test product"})
    yield
    await db.products.delete_many({"description": "Test product"})


@pytest_asyncio.fixture(scope="module")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture(scope="module")
async def geo_data(client):
    tok_a = await _register_login(client, "va@geo.test", "vendor", store_name="Store A")
    tok_b = await _register_login(client, "vb@geo.test", "vendor", store_name="Store B")
    tok_c = await _register_login(client, "vc@geo.test", "vendor", store_name="Store C")
    tok_u = await _register_login(client, "u@geo.test", "user")

    p_a = await _create_product(client, tok_a, name="Milk Store A", price=40, stock=20)
    p_b = await _create_product(client, tok_b, name="Milk Store B", price=60, stock=5)
    p_c = await _create_product(client, tok_c, name="Milk Store C", price=30, stock=0)

    # Set coordinates on vendor_profiles
    vp_a = await db.vendor_profiles.find_one({"store_name": "Store A"})
    vp_b = await db.vendor_profiles.find_one({"store_name": "Store B"})
    vp_c = await db.vendor_profiles.find_one({"store_name": "Store C"})

    if vp_a:
        await _set_store_location(vp_a["user_id"], **STORE_A)
    if vp_b:
        await _set_store_location(vp_b["user_id"], **STORE_B)
    if vp_c:
        await _set_store_location(vp_c["user_id"], **STORE_C)

    return {"tok_u": tok_u, "p_a": p_a, "p_b": p_b, "p_c": p_c}


# ── tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_01_search_radius_5km(client, geo_data):
    """Products from nearby stores returned; Chennai excluded."""
    r = await client.get(f"/api/v1/products/search?lat={USER_LAT}&lng={USER_LNG}&radius_km=5")
    assert r.status_code == 200
    names = [p["name"] for p in r.json()["products"]]
    assert any("Store A" in n for n in names), "Store A missing"
    assert any("Store B" in n for n in names), "Store B missing"
    assert not any("Store C" in n for n in names), "Store C should be excluded"


@pytest.mark.asyncio
async def test_02_available_now_filter(client, geo_data):
    """available_now=true excludes out-of-stock products."""
    r = await client.get(f"/api/v1/products/search?lat={USER_LAT}&lng={USER_LNG}&radius_km=5&available_now=true")
    assert r.status_code == 200
    for p in r.json()["products"]:
        assert p["available_qty"] > 0


@pytest.mark.asyncio
async def test_03_sort_by_distance(client, geo_data):
    """Nearest store products appear first."""
    r = await client.get(f"/api/v1/products/search?lat={USER_LAT}&lng={USER_LNG}&radius_km=10&sort=distance")
    assert r.status_code == 200
    prods = r.json()["products"]
    distances = [p["distance_km"] for p in prods if p.get("distance_km") is not None]
    assert distances == sorted(distances)


@pytest.mark.asyncio
async def test_04_sort_by_price(client, geo_data):
    """Cheapest products first."""
    r = await client.get(f"/api/v1/products/search?lat={USER_LAT}&lng={USER_LNG}&radius_km=10&sort=price")
    assert r.status_code == 200
    prods = r.json()["products"]
    prices = [p["price"] for p in prods]
    assert prices == sorted(prices)


@pytest.mark.asyncio
async def test_05_nearby_stores(client, geo_data):
    """GET /stores/nearby returns Store A & B, excludes Store C."""
    r = await client.get(f"/api/v1/stores/nearby?lat={USER_LAT}&lng={USER_LNG}&radius_km=5")
    assert r.status_code == 200
    names = [s["store_name"] for s in r.json()]
    assert "Store A" in names or "Store B" in names
    assert "Store C" not in names


@pytest.mark.asyncio
async def test_06_emergency_search(client, geo_data):
    """Emergency search returns only in-stock products sorted by distance."""
    r = await client.get(f"/api/v1/products/emergency?q=Milk&lat={USER_LAT}&lng={USER_LNG}&radius_km=10")
    assert r.status_code == 200
    prods = r.json()["products"]
    for p in prods:
        assert p["available_qty"] > 0
    distances = [p["distance_km"] for p in prods]
    assert distances == sorted(distances)


@pytest.mark.asyncio
async def test_07_emergency_radius_cap(client, geo_data):
    """radius_km > 25 → capped at 25, no server error."""
    r = await client.get(f"/api/v1/products/emergency?q=Milk&lat={USER_LAT}&lng={USER_LNG}&radius_km=100")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_08_search_no_location(client, geo_data):
    """No lat/lng → all active products returned (no distance filter)."""
    r = await client.get("/api/v1/products/search")
    assert r.status_code == 200
    assert r.json()["total"] > 0
