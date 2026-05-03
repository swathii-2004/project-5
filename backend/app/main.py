import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app.database import create_indexes, db
from app.tasks.expire_reservations import expire_reservations
from app.routers import auth, users, admin, vendors, products, wishlist, reviews
from app.routers.reservations import router as reservations_router
from app.routers.group_reservations import router as group_reservations_router
from app.routers.stores import router as stores_router
from app.routers.notifications import router as notifications_router
from app.routers.chat import router as chat_router
from app.services.notification_service import init_firebase

app = FastAPI(title="ProxiMart API", version="1.0.0")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

scheduler = AsyncIOScheduler()

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_USER_URL,
        settings.FRONTEND_VENDOR_URL,
        settings.FRONTEND_ADMIN_URL
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.on_event("startup")
async def startup_event():
    init_firebase()
    if not settings.AES_SECRET_KEY or len(settings.AES_SECRET_KEY.encode("utf-8")) != 32:
        raise ValueError("AES_SECRET_KEY must be configured and exactly 32 bytes")
    if not settings.JWT_SECRET:
        raise ValueError("JWT_SECRET must be configured")
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
app.include_router(notifications_router, prefix="/api/v1/notifications")
app.include_router(chat_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    try:
        await db.command("ping")
        return {"status": "ok", "database": "connected", "version": "1.0.0"}
    except Exception as e:
        raise HTTPException(status_code=503, detail="Service Unavailable: Database connection failed")
