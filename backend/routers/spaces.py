from fastapi import APIRouter, HTTPException, Depends
from database import get_db, row_to_dict, new_id, now_iso
from models import SpaceIn
from dependencies import current_user_id

router = APIRouter(prefix="/api/spaces", tags=["spaces"])


@router.get("")
async def list_spaces(uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        cur = await db.execute("SELECT * FROM spaces WHERE user_id=? ORDER BY sort_order, created_at", (uid,))
        return [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


@router.post("")
async def create_space(body: SpaceIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        sid = new_id()
        await db.execute(
            "INSERT INTO spaces (id, user_id, name, emoji, color, sort_order, created_at) VALUES (?,?,?,?,?,?,?)",
            (sid, uid, body.name, body.emoji, body.color, body.sort_order, now_iso()),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM spaces WHERE id=?", (sid,))
        return row_to_dict(await cur.fetchone())
    finally:
        await db.close()


@router.put("/{sid}")
async def update_space(sid: str, body: SpaceIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute(
            "UPDATE spaces SET name=?, emoji=?, color=?, sort_order=? WHERE id=? AND user_id=?",
            (body.name, body.emoji, body.color, body.sort_order, sid, uid),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM spaces WHERE id=? AND user_id=?", (sid, uid))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404)
        return row_to_dict(row)
    finally:
        await db.close()


@router.delete("/{sid}")
async def delete_space(sid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute("DELETE FROM spaces WHERE id=? AND user_id=?", (sid, uid))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()
