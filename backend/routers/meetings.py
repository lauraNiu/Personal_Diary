import json
from fastapi import APIRouter, HTTPException, Depends
from database import get_db, row_to_dict, new_id, now_iso
from models import MeetingIn
from dependencies import current_user_id

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


@router.get("")
async def list_meetings(space_id: str | None = None, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        sql = "SELECT * FROM meetings WHERE user_id=?"
        params = [uid]
        if space_id:
            sql += " AND space_id=?"; params.append(space_id)
        sql += " ORDER BY scheduled_at"
        cur = await db.execute(sql, params)
        return [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


@router.post("")
async def create_meeting(body: MeetingIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        mid = new_id()
        await db.execute(
            """INSERT INTO meetings (id, user_id, title, space_id, project_id, scheduled_at,
                  duration_minutes, attendee_ids, agenda, notes, action_items, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (mid, uid, body.title, body.space_id, body.project_id, body.scheduled_at,
             body.duration_minutes, json.dumps(body.attendee_ids), body.agenda,
             body.notes, json.dumps(body.action_items), now_iso()),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM meetings WHERE id=?", (mid,))
        return row_to_dict(await cur.fetchone())
    finally:
        await db.close()


@router.put("/{mid}")
async def update_meeting(mid: str, body: MeetingIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute(
            """UPDATE meetings SET title=?, space_id=?, project_id=?, scheduled_at=?,
                  duration_minutes=?, attendee_ids=?, agenda=?, notes=?, action_items=?
               WHERE id=? AND user_id=?""",
            (body.title, body.space_id, body.project_id, body.scheduled_at,
             body.duration_minutes, json.dumps(body.attendee_ids), body.agenda,
             body.notes, json.dumps(body.action_items), mid, uid),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM meetings WHERE id=? AND user_id=?", (mid, uid))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404)
        return row_to_dict(row)
    finally:
        await db.close()


@router.delete("/{mid}")
async def delete_meeting(mid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute("DELETE FROM meetings WHERE id=? AND user_id=?", (mid, uid))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()
