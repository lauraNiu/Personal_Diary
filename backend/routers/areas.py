from fastapi import APIRouter, HTTPException, Depends
from database import get_db, row_to_dict, new_id
from models import AreaIn
from dependencies import current_user_id

router = APIRouter(prefix="/api/areas", tags=["areas"])


@router.get("")
async def list_areas(space_id: str | None = None, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        # 通过 space 过滤当前用户
        sql = """SELECT a.* FROM areas a
                 JOIN spaces s ON s.id=a.space_id
                 WHERE s.user_id=?"""
        params = [uid]
        if space_id:
            sql += " AND a.space_id=?"
            params.append(space_id)
        sql += " ORDER BY a.sort_order"
        cur = await db.execute(sql, params)
        return [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


@router.post("")
async def create_area(body: AreaIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        # 验证 space 属于该用户
        cur = await db.execute("SELECT id FROM spaces WHERE id=? AND user_id=?", (body.space_id, uid))
        if not await cur.fetchone():
            raise HTTPException(403, "无权操作该空间")
        aid = new_id()
        await db.execute(
            "INSERT INTO areas (id, space_id, name, color, sort_order) VALUES (?,?,?,?,?)",
            (aid, body.space_id, body.name, body.color, body.sort_order),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM areas WHERE id=?", (aid,))
        return row_to_dict(await cur.fetchone())
    finally:
        await db.close()


@router.put("/{aid}")
async def update_area(aid: str, body: AreaIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        cur = await db.execute(
            """SELECT a.id FROM areas a JOIN spaces s ON s.id=a.space_id
               WHERE a.id=? AND s.user_id=?""", (aid, uid))
        if not await cur.fetchone():
            raise HTTPException(404)
        await db.execute(
            "UPDATE areas SET space_id=?, name=?, color=?, sort_order=? WHERE id=?",
            (body.space_id, body.name, body.color, body.sort_order, aid),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM areas WHERE id=?", (aid,))
        return row_to_dict(await cur.fetchone())
    finally:
        await db.close()


@router.delete("/{aid}")
async def delete_area(aid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute(
            """DELETE FROM areas WHERE id=? AND space_id IN
               (SELECT id FROM spaces WHERE user_id=?)""", (aid, uid))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()
