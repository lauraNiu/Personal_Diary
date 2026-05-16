"""APScheduler 定时任务。"""
import asyncio
from datetime import date, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.email_service import send_daily_digest, send_weekly_review
from services.overleaf_service import sync_all_papers


scheduler = AsyncIOScheduler()


async def check_urgent_tasks():
    """检查临期任务，写通知。"""
    from database import get_db
    from routers.notifications import create_notification
    db = await get_db()
    try:
        in_1 = (date.today() + timedelta(days=1)).isoformat()
        cur = await db.execute(
            """SELECT * FROM tasks WHERE status NOT IN ('done','cancelled')
               AND due_date IS NOT NULL AND substr(due_date,1,10)<=?""",
            (in_1,)
        )
        rows = await cur.fetchall()
    finally:
        await db.close()

    for r in rows:
        await create_notification(
            type="urgent",
            title=f"⏰ 任务即将到期：{r['title']}",
            body=f"截止 {r['due_date']}，优先级 {r['priority']}",
            related_id=r["id"],
            related_type="task",
        )


def start_scheduler():
    scheduler.add_job(send_daily_digest, "cron", hour=8, minute=0, id="daily_digest")
    scheduler.add_job(send_weekly_review, "cron", day_of_week="sun", hour=20, id="weekly_review")
    scheduler.add_job(sync_all_papers, "cron", hour=2, minute=0, id="sync_papers")
    scheduler.add_job(check_urgent_tasks, "interval", minutes=30, id="check_urgent")
    scheduler.start()
    print("[scheduler] started: daily_digest, weekly_review, sync_papers, check_urgent")


def stop_scheduler():
    scheduler.shutdown()
