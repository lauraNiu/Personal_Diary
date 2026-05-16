from fastapi import APIRouter, Depends
from datetime import timedelta, date
from database import get_db
from dependencies import current_user_id

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/overview")
async def overview(uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        cur = await db.execute("SELECT status, COUNT(*) as c FROM tasks WHERE user_id=? GROUP BY status", (uid,))
        by_status = {r["status"]: r["c"] for r in await cur.fetchall()}

        cur = await db.execute("SELECT space_id, COUNT(*) as c FROM tasks WHERE user_id=? GROUP BY space_id", (uid,))
        by_space = {r["space_id"]: r["c"] for r in await cur.fetchall()}

        cur = await db.execute(
            "SELECT priority, COUNT(*) as c FROM tasks WHERE user_id=? AND status!='done' GROUP BY priority", (uid,))
        by_priority = {r["priority"]: r["c"] for r in await cur.fetchall()}

        today = date.today().isoformat()
        cur = await db.execute(
            "SELECT COUNT(*) as c FROM tasks WHERE user_id=? AND status='done' AND substr(completed_at,1,10)=?",
            (uid, today)
        )
        today_done = (await cur.fetchone())["c"]

        week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()
        cur = await db.execute(
            "SELECT COUNT(*) as c FROM tasks WHERE user_id=? AND status='done' AND substr(completed_at,1,10)>=?",
            (uid, week_start)
        )
        week_done = (await cur.fetchone())["c"]

        in_3 = (date.today() + timedelta(days=3)).isoformat()
        cur = await db.execute(
            "SELECT COUNT(*) as c FROM tasks WHERE user_id=? AND status!='done' AND due_date IS NOT NULL AND due_date<=?",
            (uid, in_3)
        )
        urgent_count = (await cur.fetchone())["c"]

        return {
            "by_status": by_status, "by_space": by_space, "by_priority": by_priority,
            "today_done": today_done, "week_done": week_done, "urgent_count": urgent_count,
        }
    finally:
        await db.close()


@router.get("/heatmap")
async def heatmap(days: int = 90, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        start = (date.today() - timedelta(days=days)).isoformat()
        cur = await db.execute(
            """SELECT substr(completed_at,1,10) as d, COUNT(*) as c FROM tasks
               WHERE user_id=? AND status='done' AND completed_at IS NOT NULL AND completed_at>=?
               GROUP BY d ORDER BY d""",
            (uid, start)
        )
        data = {r["d"]: r["c"] for r in await cur.fetchall()}
        result = []
        for i in range(days, -1, -1):
            d = (date.today() - timedelta(days=i)).isoformat()
            result.append({"date": d, "count": data.get(d, 0)})
        return result
    finally:
        await db.close()


@router.get("/trend")
async def trend(days: int = 14, uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        start = (date.today() - timedelta(days=days)).isoformat()
        cur = await db.execute(
            """SELECT substr(completed_at,1,10) as d, COUNT(*) as c FROM tasks
               WHERE user_id=? AND status='done' AND completed_at IS NOT NULL AND completed_at>=?
               GROUP BY d ORDER BY d""",
            (uid, start)
        )
        data = {r["d"]: r["c"] for r in await cur.fetchall()}
        result = []
        for i in range(days, -1, -1):
            d = (date.today() - timedelta(days=i)).isoformat()
            result.append({"date": d, "count": data.get(d, 0)})
        return result
    finally:
        await db.close()


@router.get("/capacity")
async def capacity(uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        today = date.today().isoformat()
        cur = await db.execute(
            """SELECT SUM(estimated_hours) as h FROM tasks
               WHERE user_id=? AND status!='done' AND substr(due_date,1,10)=?""",
            (uid, today)
        )
        today_hours = (await cur.fetchone())["h"] or 0

        week_data = []
        today_d = date.today()
        monday = today_d - timedelta(days=today_d.weekday())
        for i in range(7):
            d = (monday + timedelta(days=i)).isoformat()
            cur = await db.execute(
                """SELECT SUM(estimated_hours) as h FROM tasks
                   WHERE user_id=? AND status!='done' AND substr(due_date,1,10)=?""",
                (uid, d)
            )
            h = (await cur.fetchone())["h"] or 0
            week_data.append({"date": d, "hours": h})

        return {"today_hours": today_hours, "today_capacity": 8, "week": week_data}
    finally:
        await db.close()
