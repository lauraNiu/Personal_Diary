from fastapi import APIRouter, HTTPException, Depends
from database import get_db, row_to_dict, new_id, now_iso
from models import ProjectIn
from dependencies import current_user_id

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
async def list_projects(space_id: str | None = None, area_id: str | None = None,
                        uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        sql = "SELECT * FROM projects WHERE user_id=?"
        params = [uid]
        if space_id:
            sql += " AND space_id=?"; params.append(space_id)
        if area_id:
            sql += " AND area_id=?"; params.append(area_id)
        sql += " ORDER BY created_at DESC"
        cur = await db.execute(sql, params)
        return [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


@router.post("")
async def create_project(body: ProjectIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        pid = new_id()
        await db.execute(
            """INSERT INTO projects (id, user_id, space_id, area_id, name, description, color, status, due_date, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (pid, uid, body.space_id, body.area_id, body.name, body.description,
             body.color, body.status, body.due_date, now_iso()),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM projects WHERE id=?", (pid,))
        return row_to_dict(await cur.fetchone())
    finally:
        await db.close()


@router.put("/{pid}")
async def update_project(pid: str, body: ProjectIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute(
            """UPDATE projects SET space_id=?, area_id=?, name=?, description=?, color=?, status=?, due_date=?
               WHERE id=? AND user_id=?""",
            (body.space_id, body.area_id, body.name, body.description,
             body.color, body.status, body.due_date, pid, uid),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM projects WHERE id=? AND user_id=?", (pid, uid))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404)
        return row_to_dict(row)
    finally:
        await db.close()


@router.delete("/{pid}")
async def delete_project(pid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute("DELETE FROM projects WHERE id=? AND user_id=?", (pid, uid))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()
