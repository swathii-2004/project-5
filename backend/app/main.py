from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app.database import create_indexes, db
from app.tasks.expire_reservations import expire_reservations
from app.routers import auth, users, admin, vendors, products, wishlist, reviews
from app.routers.reservations import router as reservations_router
from app.routers.group_reservations import router as group_reservations_router
from app.routers.stores import router as stores_router

app = FastAPI(title="ProxiMart API", version="1.0.0")

scheduler = AsyncIOScheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_USER_URL,
        settings.FRONTEND_VENDOR_URL,
        settings.FRONTEND_ADMIN_URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    if settings.AES_SECRET_KEY:
        assert len(settings.AES_SECRET_KEY.encode("utf-8")) == 32, \
            "AES_SECRET_KEY must be exactly 32 bytes"
    await create_indexes()
    scheduler.add_job(
        expire_reservations,
        "interval",
        minutes=5,
        args=[db],
        id="expire_reservations"
    )
    scheduler.start()


@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()


app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(vendors.router, prefix="/api/v1/vendors", tags=["vendors"])
app.include_router(products.router, prefix="/api/v1/products", tags=["products"])
app.include_router(wishlist.router, prefix="/api/v1/wishlist", tags=["wishlist"])
app.include_router(reviews.router, prefix="/api/v1", tags=["reviews"])
app.include_router(reservations_router, prefix="/api/v1")
app.include_router(group_reservations_router, prefix="/api/v1")
app.include_router(stores_router, prefix="/api/v1/stores", tags=["stores"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
