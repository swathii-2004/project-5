from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException
from bson import ObjectId
from datetime import datetime
import logging
from app.websocket.manager import manager
from app.utils.jwt import decode_token
from app.database import get_db
from app.dependencies import require_role

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])

@router.websocket("/ws/chat/{reservation_id}")
async def websocket_chat(
    reservation_id: str,
    websocket: WebSocket,
    token: str = Query(...),
    db = Depends(get_db)
):
    try:
        payload = decode_token(token)
    except Exception:
        await websocket.close(code=1008)
        return
        
    user_id = payload.get("user_id")
    if not user_id:
        await websocket.close(code=1008)
        return

    try:
        reservation = await db.reservations.find_one({"_id": ObjectId(reservation_id)})
    except Exception:
        await websocket.close(code=1008)
        return

    if not reservation:
        await websocket.close(code=1008)
        return
        
    is_participant = (str(reservation["user_id"]) == user_id or str(reservation["vendor_id"]) == user_id)
    if not is_participant:
        await websocket.close(code=1008)
        return
        
    if reservation["status"] not in ["pending", "confirmed", "completed"]:
        await websocket.close(code=1008)
        return

    if str(reservation["user_id"]) == user_id:
        receiver_id = str(reservation["vendor_id"])
    else:
        receiver_id = str(reservation["user_id"])

    await manager.connect(websocket, reservation_id)

    messages_cursor = db.chat_messages.find({"room_id": reservation_id}).sort("created_at", 1).limit(50)
    messages = await messages_cursor.to_list(50)
    
    history = []
    for msg in messages:
        msg["id"] = str(msg["_id"])
        msg["sender_id"] = str(msg["sender_id"])
        msg["receiver_id"] = str(msg["receiver_id"])
        msg["created_at"] = msg["created_at"].isoformat()
        del msg["_id"]
        history.append(msg)
        
    await websocket.send_json({"type": "history", "messages": history})

    try:
        while True:
            data = await websocket.receive_json()
            text = data.get("text", "").strip()
            if not text:
                continue
                
            now = datetime.utcnow()
            msg_doc = {
                "room_id": reservation_id,
                "sender_id": ObjectId(user_id),
                "receiver_id": ObjectId(receiver_id),
                "message": text,
                "is_read": False,
                "created_at": now
            }
            result = await db.chat_messages.insert_one(msg_doc)
            
            broadcast_msg = {
                "type": "message",
                "id": str(result.inserted_id),
                "sender_id": user_id,
                "receiver_id": receiver_id,
                "message": text,
                "created_at": now.isoformat()
            }
            await manager.broadcast(reservation_id, broadcast_msg)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, reservation_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, reservation_id)

@router.get("/{reservation_id}/history")
async def get_chat_history(
    reservation_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_role(["user", "vendor"])),
    db = Depends(get_db)
):
    try:
        reservation = await db.reservations.find_one({"_id": ObjectId(reservation_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid reservation ID")
        
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
    user_id = str(current_user["_id"])
    if str(reservation["user_id"]) != user_id and str(reservation["vendor_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Not a participant in this reservation")

    query = {"room_id": reservation_id}
    total = await db.chat_messages.count_documents(query)
    
    cursor = db.chat_messages.find(query).sort("created_at", 1).skip((page-1)*limit).limit(limit)
    docs = await cursor.to_list(length=limit)
    
    messages = []
    for d in docs:
        d["id"] = str(d["_id"])
        d["sender_id"] = str(d["sender_id"])
        d["receiver_id"] = str(d["receiver_id"])
        d["created_at"] = d["created_at"].isoformat()
        del d["_id"]
        messages.append(d)
        
    await db.chat_messages.update_many(
        {"room_id": reservation_id, "receiver_id": ObjectId(user_id), "is_read": False},
        {"$set": {"is_read": True}}
    )

    return {
        "messages": messages,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }
