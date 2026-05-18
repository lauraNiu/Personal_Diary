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
            """INSERT INTO meetings
               (id, user_id, title, space_id, project_id, scheduled_at,
                duration_minutes, attendee_ids, agenda, notes, action_items,
                reminder_minutes, location, reminder_sent, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)""",
            (mid, uid, body.title, body.space_id, body.project_id, body.scheduled_at,
             body.duration_minutes, json.dumps(body.attendee_ids), body.agenda,
             body.notes, json.dumps(body.action_items),
             body.reminder_minutes, body.location, now_iso()),
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
        # 时间或提醒分钟变了 → 重置 reminder_sent，让定时任务重新评估
        cur = await db.execute(
            "SELECT scheduled_at, reminder_minutes FROM meetings WHERE id=? AND user_id=?",
            (mid, uid))
        old = await cur.fetchone()
        reset_sent = False
        if old and (old["scheduled_at"] != body.scheduled_at
                    or old["reminder_minutes"] != body.reminder_minutes):
            reset_sent = True

        await db.execute(
            """UPDATE meetings SET title=?, space_id=?, project_id=?, scheduled_at=?,
                  duration_minutes=?, attendee_ids=?, agenda=?, notes=?, action_items=?,
                  reminder_minutes=?, location=? """
            + (", reminder_sent=0" if reset_sent else "") +
            " WHERE id=? AND user_id=?",
            (body.title, body.space_id, body.project_id, body.scheduled_at,
             body.duration_minutes, json.dumps(body.attendee_ids), body.agenda,
             body.notes, json.dumps(body.action_items),
             body.reminder_minutes, body.location, mid, uid),
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


@router.post("/{mid}/test-reminder")
async def test_reminder(mid: str, uid: str = Depends(current_user_id)):
    """手动触发一次会议提醒邮件（测试用）。"""
    from services.scheduler import send_meeting_reminder
    db = await get_db()
    try:
        cur = await db.execute("SELECT * FROM meetings WHERE id=? AND user_id=?", (mid, uid))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404)
        meeting = row_to_dict(row)
    finally:
        await db.close()
    sent = await send_meeting_reminder(meeting, uid, force=True)
    return {"ok": sent, "message": "已发送测试邮件" if sent else "邮件未配置或发送失败"}
