from fastapi import APIRouter, Depends
from database import get_db, row_to_dict, new_id, now_iso
from dependencies import current_user_id

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(unread: bool = False, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        if unread:
            cur = await db.execute(
                "SELECT * FROM notifications WHERE user_id=? AND is_read=0 ORDER BY created_at DESC LIMIT 50",
                (uid,)
            )
        else:
            cur = await db.execute(
                "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
                (uid,)
            )
        return [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


@router.post("/{nid}/read")
async def mark_read(nid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?", (nid, uid))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()


@router.post("/read-all")
async def mark_all_read(uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute("UPDATE notifications SET is_read=1 WHERE user_id=? AND is_read=0", (uid,))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()


async def create_notification(user_id: str, type: str, title: str, body: str = "",
                              related_id: str = None, related_type: str = None):
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO notifications (id, user_id, type, title, body, related_id, related_type, created_at)
               VALUES (?,?,?,?,?,?,?,?)""",
            (new_id(), user_id, type, title, body, related_id, related_type, now_iso()),
        )
        await db.commit()
    finally:
        await db.close()
