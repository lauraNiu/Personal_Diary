from fastapi import APIRouter, Depends
from database import get_db, row_to_dict, new_id
from models import TagIn
from dependencies import current_user_id

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("")
async def list_tags(uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        cur = await db.execute("SELECT * FROM tags WHERE user_id=? ORDER BY name", (uid,))
        return [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


@router.post("")
async def create_tag(body: TagIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        tid = new_id()
        await db.execute(
            "INSERT INTO tags (id, user_id, name, color) VALUES (?,?,?,?)",
            (tid, uid, body.name, body.color),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM tags WHERE id=?", (tid,))
        return row_to_dict(await cur.fetchone())
    finally:
        await db.close()


@router.delete("/{tid}")
async def delete_tag(tid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute("DELETE FROM tags WHERE id=? AND user_id=?", (tid, uid))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()
