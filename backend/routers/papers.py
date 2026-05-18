import json
import zipfile
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
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


async def _verify_snapshot_access(sid: str, uid: str) -> dict:
    """验证快照属于该用户，返回快照行 dict。"""
    db = await get_db()
    try:
        cur = await db.execute(
            """SELECT ps.* FROM paper_snapshots ps
               JOIN papers p ON p.id = ps.paper_id
               WHERE ps.id=? AND p.user_id=?""",
            (sid, uid)
        )
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404, "快照不存在或无权访问")
        return row_to_dict(row)
    finally:
        await db.close()


@router.get("/snapshots/{sid}/download")
async def download_snapshot(sid: str, uid: str = Depends(current_user_id)):
    """下载快照 ZIP 文件。"""
    snap = await _verify_snapshot_access(sid, uid)
    path = Path(snap["file_path"])
    if not path.exists():
        raise HTTPException(404, "快照文件已丢失")
    return FileResponse(
        path,
        media_type="application/zip",
        filename=f"{snap['version_label']}_{snap['snapshot_at'][:10]}.zip",
    )


@router.get("/snapshots/{sid}/files")
async def list_snapshot_files(sid: str, uid: str = Depends(current_user_id)):
    """列出快照 ZIP 内的文件结构。"""
    snap = await _verify_snapshot_access(sid, uid)
    path = Path(snap["file_path"])
    if not path.exists():
        raise HTTPException(404, "快照文件已丢失")
    files = []
    with zipfile.ZipFile(path) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            files.append({
                "name": info.filename,
                "size": info.file_size,
                "compressed": info.compress_size,
            })
    return {"files": sorted(files, key=lambda x: x["name"]), "total": len(files)}


@router.get("/snapshots/{sid}/file")
async def read_snapshot_file(sid: str, path: str, uid: str = Depends(current_user_id)):
    """读取快照 ZIP 内某个文件的内容（仅文本文件）。"""
    snap = await _verify_snapshot_access(sid, uid)
    zip_path = Path(snap["file_path"])
    if not zip_path.exists():
        raise HTTPException(404, "快照文件已丢失")
    with zipfile.ZipFile(zip_path) as zf:
        try:
            raw = zf.read(path)
        except KeyError:
            raise HTTPException(404, f"快照内无 {path}")
    # 二进制（图片/pdf 等）只返回大小
    try:
        text = raw.decode("utf-8")
        return {"content": text, "binary": False, "size": len(raw)}
    except UnicodeDecodeError:
        return {"content": None, "binary": True, "size": len(raw)}
