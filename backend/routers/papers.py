import json
from fastapi import APIRouter, HTTPException, Depends
from database import get_db, row_to_dict, new_id, now_iso
from models import PaperIn
from dependencies import current_user_id

router = APIRouter(prefix="/api/papers", tags=["papers"])


@router.get("")
async def list_papers(project_id: str | None = None, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        sql = "SELECT * FROM papers WHERE user_id=?"
        params = [uid]
        if project_id:
            sql += " AND project_id=?"; params.append(project_id)
        sql += " ORDER BY updated_at DESC"
        cur = await db.execute(sql, params)
        return [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


@router.post("")
async def create_paper(body: PaperIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        pid = new_id()
        now = now_iso()
        await db.execute(
            """INSERT INTO papers (id, user_id, project_id, title, overleaf_url, overleaf_project_id,
                  target_journal_ids, submission_status, submission_deadline, collaborator_ids,
                  notes, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (pid, uid, body.project_id, body.title, body.overleaf_url, body.overleaf_project_id,
             json.dumps(body.target_journal_ids), body.submission_status, body.submission_deadline,
             json.dumps(body.collaborator_ids), body.notes, now, now),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM papers WHERE id=?", (pid,))
        return row_to_dict(await cur.fetchone())
    finally:
        await db.close()


@router.put("/{pid}")
async def update_paper(pid: str, body: PaperIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute(
            """UPDATE papers SET project_id=?, title=?, overleaf_url=?, overleaf_project_id=?,
                  target_journal_ids=?, submission_status=?, submission_deadline=?,
                  collaborator_ids=?, notes=?, updated_at=? WHERE id=? AND user_id=?""",
            (body.project_id, body.title, body.overleaf_url, body.overleaf_project_id,
             json.dumps(body.target_journal_ids), body.submission_status, body.submission_deadline,
             json.dumps(body.collaborator_ids), body.notes, now_iso(), pid, uid),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM papers WHERE id=? AND user_id=?", (pid, uid))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404)
        return row_to_dict(row)
    finally:
        await db.close()


@router.delete("/{pid}")
async def delete_paper(pid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        await db.execute("DELETE FROM papers WHERE id=? AND user_id=?", (pid, uid))
        await db.execute("DELETE FROM paper_snapshots WHERE paper_id=?", (pid,))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()


@router.get("/{pid}/snapshots")
async def list_snapshots(pid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        # 验证论文属于该用户
        cur = await db.execute("SELECT id FROM papers WHERE id=? AND user_id=?", (pid, uid))
        if not await cur.fetchone():
            raise HTTPException(404)
        cur = await db.execute(
            "SELECT * FROM paper_snapshots WHERE paper_id=? ORDER BY snapshot_at DESC", (pid,)
        )
        return [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


@router.post("/{pid}/sync")
async def sync_paper(pid: str, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        cur = await db.execute("SELECT id FROM papers WHERE id=? AND user_id=?", (pid, uid))
        if not await cur.fetchone():
            raise HTTPException(404)
    finally:
        await db.close()
    from services.overleaf_service import sync_one_paper
    return await sync_one_paper(pid)
