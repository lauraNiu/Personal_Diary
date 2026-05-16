import json
from fastapi import APIRouter, HTTPException, Depends
from database import get_db, row_to_dict, new_id, now_iso
from models import TaskIn, TaskUpdate
from dependencies import current_user_id

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _serialize(d: dict) -> dict:
    out = dict(d)
    for k in ("subtasks", "tag_ids", "collaborator_ids", "dependency_ids", "reminder_days"):
        if k in out and out[k] is not None:
            out[k] = json.dumps(out[k], ensure_ascii=False)
    if "recurrence" in out and out["recurrence"] is not None and not isinstance(out["recurrence"], str):
        out["recurrence"] = json.dumps(out["recurrence"], ensure_ascii=False)
    return out


@router.get("")
async def list_tasks(
    space_id: str | None = None,
    status: str | None = None,
    project_id: str | None = None,
    collaborator_id: str | None = None,
    is_inbox: int | None = None,
    due_before: str | None = None,
    uid: str = Depends(current_user_id),
):
    db = await get_db()
    try:
        sql = "SELECT * FROM tasks WHERE user_id=?"
        params = [uid]
        if space_id:
            sql += " AND space_id=?"; params.append(space_id)
        if status:
            sql += " AND status=?"; params.append(status)
        if project_id:
            sql += " AND project_id=?"; params.append(project_id)
        if is_inbox is not None:
            sql += " AND is_inbox=?"; params.append(is_inbox)
        if due_before:
            sql += " AND due_date<=?"; params.append(due_before)
        sql += " ORDER BY priority='urgent' DESC, due_date IS NULL, due_date, created_at DESC"
        cur = await db.execute(sql, params)
        rows = [row_to_dict(r) for r in await cur.fetchall()]
        if collaborator_id:
            rows = [r for r in rows if collaborator_id in (r.get("collaborator_ids") or [])]
        return rows
    finally:
        await db.close()


@router.post("")
async def create_task(body: TaskIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        tid = new_id()
        now = now_iso()
        d = body.model_dump()
        d["id"] = tid
        d["user_id"] = uid
        d["created_at"] = now
        d["updated_at"] = now
        d["actual_hours"] = 0
        d["ai_parsed"] = 1 if body.raw_input else 0
        d["completed_at"] = None
        d = _serialize(d)
        cols = ",".join(d.keys())
        ph = ",".join("?" * len(d))
        await db.execute(f"INSERT INTO tasks ({cols}) VALUES ({ph})", list(d.values()))
        await db.commit()
        cur = await db.execute("SELECT * FROM tasks WHERE id=?", (tid,))
        return row_to_dict(await cur.fetchone())
    finally:
        await db.close()


@router.get("/{tid}")
async def get_task(tid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        cur = await db.execute("SELECT * FROM tasks WHERE id=? AND user_id=?", (tid, uid))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404)
        return row_to_dict(row)
    finally:
        await db.close()


@router.put("/{tid}")
async def update_task(tid: str, body: TaskUpdate, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        upd = {k: v for k, v in body.model_dump().items() if v is not None}
        if not upd:
            raise HTTPException(400, "Empty update")
        upd["updated_at"] = now_iso()

        # 状态变化时自动维护 completed_at
        if "status" in upd:
            cur = await db.execute("SELECT status FROM tasks WHERE id=? AND user_id=?", (tid, uid))
            old = await cur.fetchone()
            if old:
                old_status = old["status"]
                new_status = upd["status"]
                if new_status == "done" and old_status != "done":
                    upd["completed_at"] = now_iso()
                elif old_status == "done" and new_status != "done":
                    upd["completed_at"] = None

        upd = _serialize(upd)
        sets = ",".join(f"{k}=?" for k in upd.keys())
        await db.execute(
            f"UPDATE tasks SET {sets} WHERE id=? AND user_id=?",
            list(upd.values()) + [tid, uid],
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM tasks WHERE id=? AND user_id=?", (tid, uid))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404)
        return row_to_dict(row)
    finally:
        await db.close()


@router.delete("/{tid}")
async def delete_task(tid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute("DELETE FROM tasks WHERE id=? AND user_id=?", (tid, uid))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()


@router.post("/{tid}/complete")
async def complete_task(tid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        now = now_iso()
        await db.execute(
            "UPDATE tasks SET status='done', completed_at=?, updated_at=? WHERE id=? AND user_id=?",
            (now, now, tid, uid),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM tasks WHERE id=? AND user_id=?", (tid, uid))
        return row_to_dict(await cur.fetchone())
    finally:
        await db.close()
