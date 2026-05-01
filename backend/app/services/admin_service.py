from datetime import datetime

async def log_admin_action(admin_id, action, target_id, target_role, db, reason=None, metadata=None):
    doc = {
        "admin_id": admin_id,
        "action": action,
        "target_id": target_id,
        "target_role": target_role,
        "reason": reason,
        "metadata": metadata,
        "created_at": datetime.utcnow()
    }
    await db.admin_audit_log.insert_one(doc)
