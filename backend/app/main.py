from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import create_indexes
from app.routers import auth, users, admin

app = FastAPI(title="ProxiMart API", version="1.0.0")

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
        assert len(settings.AES_SECRET_KEY.encode('utf-8')) == 32, "AES_SECRET_KEY must be exactly 32 bytes"
    await create_indexes()

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
