import firebase_admin
from firebase_admin import credentials, messaging
from app.config import settings
from datetime import datetime
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

_firebase_initialized = False

def init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return
    if not settings.FIREBASE_CREDENTIALS_JSON:
        logger.warning("FIREBASE_CREDENTIALS_JSON not set. Push notifications disabled.")
        return
    try:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_JSON)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info("Firebase initialized successfully.")
    except Exception as e:
        logger.warning(f"Firebase init failed: {e}. Push notifications disabled.")

async def send_push(user_id: str, title: str, body: str, data: dict, db) -> None:
    if not _firebase_initialized:
        return
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user or not user.get("fcm_token"):
            return
            
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in data.items()},
            token=user["fcm_token"]
        )
        messaging.send(message)
    except Exception as e:
        logger.warning(f"Push notification failed for user {user_id}: {e}")

async def create_notification(user_id: str, title: str, message: str, type: str, action_url: str, db) -> None:
    await db.notifications.insert_one({
        "user_id": ObjectId(user_id),
        "title": title,
        "message": message,
        "type": type,
        "is_read": False,
        "action_url": action_url,
        "created_at": datetime.utcnow()
    })

async def notify_user(user_id: str, title: str, message: str, type: str, action_url: str, db, push_data: dict = {}) -> None:
    try:
        await create_notification(user_id, title, message, type, action_url, db)
    except Exception as e:
        logger.error(f"Failed to create db notification for {user_id}: {e}")
    await send_push(user_id, title, message, push_data, db)
