"""AI 相关 API：解析、拆解、规划、建议。"""
import json
import random
from fastapi import APIRouter, HTTPException, Depends
from database import get_db, row_to_dict, new_id, now_iso
from models import AIParseIn, AIBreakdownIn, AIDayPlanIn
from services import ai_service, email_service
from dependencies import current_user_id

router = APIRouter(prefix="/api/ai", tags=["ai"])

COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#06B6D4",
          "#3B82F6", "#8B5CF6", "#EC4899"]


@router.post("/parse")
async def parse_text(body: AIParseIn, uid: str = Depends(current_user_id)):
    try:
        parsed = await ai_service.parse_task(body.text)
    except Exception as e:
        raise HTTPException(500, f"AI 解析失败：{e}")

    if not body.auto_create:
        return {"parsed": parsed}

    db = await get_db()
    try:
        # 验证 space_id 属于该用户
        space_id = parsed.get("space_id")
        cur = await db.execute("SELECT id FROM spaces WHERE id=? AND user_id=?", (space_id, uid))
        if not await cur.fetchone():
            # 退回到该用户的第一个 space
            cur = await db.execute("SELECT id FROM spaces WHERE user_id=? ORDER BY sort_order LIMIT 1", (uid,))
            r = await cur.fetchone()
            if not r:
                raise HTTPException(400, "用户未初始化任何空间")
            space_id = r["id"]

        # 协作者
        collab_ids = []
        for name in parsed.get("collaborators", []) or []:
            cur = await db.execute(
                "SELECT id FROM collaborators WHERE name=? AND user_id=?", (name, uid))
            row = await cur.fetchone()
            if row:
                collab_ids.append(row["id"])
            else:
                cid = new_id()
                await db.execute(
                    "INSERT INTO collaborators (id, user_id, name, avatar_color, created_at) VALUES (?,?,?,?,?)",
                    (cid, uid, name, random.choice(COLORS), now_iso()),
                )
                collab_ids.append(cid)

        subtasks = [{"id": new_id(), "title": s, "done": False}
                    for s in (parsed.get("subtasks") or [])]

        tid = new_id()
        now = now_iso()
        await db.execute(
            """INSERT INTO tasks (id, user_id, title, description, space_id, priority, status,
                  due_date, start_date, estimated_hours, subtasks, collaborator_ids,
                  raw_input, ai_parsed, is_inbox, created_at, updated_at, tag_ids,
                  dependency_ids, reminder_days, actual_hours)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?,?,'[]','[]','[]',0)""",
            (tid, uid, parsed.get("title", body.text[:30]),
             parsed.get("description"),
             space_id,
             parsed.get("priority", "medium"),
             "todo",
             parsed.get("due_date"),
             parsed.get("start_date"),
             parsed.get("estimated_hours"),
             json.dumps(subtasks, ensure_ascii=False),
             json.dumps(collab_ids),
             body.text,
             now, now),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM tasks WHERE id=?", (tid,))
        return {"parsed": parsed, "task": row_to_dict(await cur.fetchone())}
    finally:
        await db.close()


@router.post("/breakdown")
async def breakdown(body: AIBreakdownIn, uid: str = Depends(current_user_id)):
    try:
        return await ai_service.breakdown_task(body.goal, body.deadline)
    except Exception as e:
        raise HTTPException(500, f"AI 拆解失败：{e}")


@router.post("/day-plan")
async def day_plan(body: AIDayPlanIn, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT * FROM tasks WHERE user_id=? AND status NOT IN ('done','cancelled') ORDER BY priority='urgent' DESC, due_date",
            (uid,)
        )
        tasks = [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()
    try:
        return await ai_service.generate_day_plan(tasks, body.available_hours)
    except Exception as e:
        raise HTTPException(500, f"AI 规划失败：{e}")


@router.get("/suggestions")
async def suggestions(uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT status, COUNT(*) as c FROM tasks WHERE user_id=? GROUP BY status", (uid,))
        by_status = {r["status"]: r["c"] for r in await cur.fetchall()}

        cur = await db.execute(
            """SELECT * FROM tasks WHERE user_id=? AND status!='done'
               AND due_date IS NOT NULL ORDER BY due_date LIMIT 10""", (uid,)
        )
        urgent = [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()
    try:
        return await ai_service.generate_suggestions({"by_status": by_status}, urgent)
    except Exception as e:
        raise HTTPException(500, f"AI 建议失败：{e}")


@router.post("/test-email")
async def test_email(uid: str = Depends(current_user_id)):
    return {"ok": email_service.send_test_email()}
