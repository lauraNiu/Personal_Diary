"""APScheduler 定时任务。"""
from datetime import date, datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.email_service import (
    send_daily_digest, send_weekly_review, send_meeting_reminder_email,
)
from services.overleaf_service import sync_all_papers
from config import config


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
            user_id=r["user_id"],
            type="urgent",
            title=f"⏰ 任务即将到期：{r['title']}",
            body=f"截止 {r['due_date']}，优先级 {r['priority']}",
            related_id=r["id"],
            related_type="task",
        )


async def send_meeting_reminder(meeting: dict, user_id: str, force: bool = False) -> bool:
    """发送一个会议的提醒邮件（决定收件人 + 标记已发）。force=True 时跳过 reminder_sent 检查。"""
    from database import get_db, now_iso
    from routers.notifications import create_notification

    # 找用户邮箱
    db = await get_db()
    try:
        cur = await db.execute("SELECT email FROM users WHERE id=?", (user_id,))
        user_row = await cur.fetchone()
        to_email = user_row["email"] if user_row else config.NOTIFY_EMAIL

        # 查参会人姓名
        attendee_ids = meeting.get("attendee_ids") or []
        attendee_names = []
        if attendee_ids:
            ph = ",".join("?" * len(attendee_ids))
            cur = await db.execute(f"SELECT name FROM collaborators WHERE id IN ({ph})", attendee_ids)
            attendee_names = [r["name"] for r in await cur.fetchall()]
    finally:
        await db.close()

    sent = send_meeting_reminder_email(meeting, attendee_names, to=to_email)

    if sent:
        await create_notification(
            user_id=user_id,
            type="meeting_reminder",
            title=f"⏰ 会议提醒：{meeting.get('title', '')}",
            body=f"将于 {meeting.get('scheduled_at', '')[:16].replace('T', ' ')} 开始",
            related_id=meeting.get("id"),
            related_type="meeting",
        )
        if not force:
            db = await get_db()
            try:
                await db.execute(
                    "UPDATE meetings SET reminder_sent=1 WHERE id=?",
                    (meeting["id"],)
                )
                await db.commit()
            finally:
                await db.close()
    return sent


async def check_meeting_reminders():
    """每分钟检查：会议在 [reminder_minutes-1, reminder_minutes+1] 分钟内开始 → 发提醒。"""
    from database import get_db, row_to_dict
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT * FROM meetings WHERE reminder_sent=0 AND reminder_minutes>0"
        )
        meetings = [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()

    now = datetime.now()
    for m in meetings:
        try:
            sched = datetime.fromisoformat(m["scheduled_at"].replace("Z", ""))
        except Exception:
            continue
        # 距离开会还有多少分钟
        delta_min = (sched - now).total_seconds() / 60
        # 应当提醒的窗口：[reminder_minutes - 1, reminder_minutes + 1] 分钟
        if abs(delta_min - m["reminder_minutes"]) <= 1:
            await send_meeting_reminder(m, m["user_id"], force=False)


def start_scheduler():
    scheduler.add_job(send_daily_digest, "cron", hour=8, minute=0, id="daily_digest")
    scheduler.add_job(send_weekly_review, "cron", day_of_week="sun", hour=20, id="weekly_review")
    scheduler.add_job(sync_all_papers, "cron", hour=2, minute=0, id="sync_papers")
    scheduler.add_job(check_urgent_tasks, "interval", minutes=30, id="check_urgent")
    # 会议提醒 - 每分钟检查一次（精度高，避免错过提醒窗口）
    scheduler.add_job(check_meeting_reminders, "interval", minutes=1, id="meeting_reminders")
    scheduler.start()
    print("[scheduler] started: daily_digest, weekly_review, sync_papers, check_urgent, meeting_reminders")


def stop_scheduler():
    scheduler.shutdown()
