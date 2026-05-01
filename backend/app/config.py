from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017/proximart"
    MONGO_TEST_DB: str = "proximart_test"
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    AES_SECRET_KEY: str = ""
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    FIREBASE_CREDENTIALS_JSON: str = ""
    MAPBOX_API_KEY: str = ""
    FRONTEND_USER_URL: str = "http://localhost:5173"
    FRONTEND_VENDOR_URL: str = "http://localhost:5174"
    FRONTEND_ADMIN_URL: str = "http://localhost:5175"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

if settings.AES_SECRET_KEY:
    assert len(settings.AES_SECRET_KEY.encode('utf-8')) == 32, "AES_SECRET_KEY must be exactly 32 bytes"
