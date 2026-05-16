import random
from fastapi import APIRouter, HTTPException, Depends
from database import get_db, row_to_dict, new_id, now_iso
from models import CollaboratorIn
from dependencies import current_user_id

router = APIRouter(prefix="/api/collaborators", tags=["collaborators"])

AVATAR_COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#06B6D4",
                 "#3B82F6", "#8B5CF6", "#EC4899", "#F43F5E", "#10B981"]


@router.get("")
async def list_collaborators(uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        cur = await db.execute("SELECT * FROM collaborators WHERE user_id=? ORDER BY name", (uid,))
        return [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


@router.post("")
async def create_collaborator(body: CollaboratorIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        cid = new_id()
        color = body.avatar_color or random.choice(AVATAR_COLORS)
        await db.execute(
            """INSERT INTO collaborators (id, user_id, name, email, role, institution, avatar_color, notes, created_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (cid, uid, body.name, body.email, body.role, body.institution, color, body.notes, now_iso()),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM collaborators WHERE id=?", (cid,))
        return row_to_dict(await cur.fetchone())
    finally:
        await db.close()


@router.put("/{cid}")
async def update_collaborator(cid: str, body: CollaboratorIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute(
            """UPDATE collaborators SET name=?, email=?, role=?, institution=?, avatar_color=?, notes=?
               WHERE id=? AND user_id=?""",
            (body.name, body.email, body.role, body.institution,
             body.avatar_color, body.notes, cid, uid),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM collaborators WHERE id=? AND user_id=?", (cid, uid))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404)
        return row_to_dict(row)
    finally:
        await db.close()


@router.delete("/{cid}")
async def delete_collaborator(cid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute("DELETE FROM collaborators WHERE id=? AND user_id=?", (cid, uid))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()
