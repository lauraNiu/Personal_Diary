"""Gmail SMTP 邮件发送。"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import date, datetime, timedelta
from config import config


def _send(subject: str, html: str, to: str = None):
    """实际发送邮件。"""
    if not (config.GMAIL_ADDRESS and config.GMAIL_APP_PASSWORD):
        print(f"[email] skipped (no Gmail config): {subject}")
        return False

    to_addr = to or config.NOTIFY_EMAIL or config.GMAIL_ADDRESS
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = config.GMAIL_ADDRESS
    msg["To"] = to_addr
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as server:
            server.login(config.GMAIL_ADDRESS, config.GMAIL_APP_PASSWORD)
            server.send_message(msg)
        print(f"[email] sent: {subject}")
        return True
    except Exception as e:
        print(f"[email] failed: {e}")
        return False


def render_task_list(tasks: list) -> str:
    if not tasks:
        return '<p style="color:#94A3B8">无</p>'
    items = []
    for t in tasks:
        priority_color = {"urgent": "#EF4444", "high": "#F97316",
                         "medium": "#EAB308", "low": "#22C55E"}.get(t["priority"], "#94A3B8")
        due = f' · 截止 {t["due_date"]}' if t.get("due_date") else ""
        items.append(
            f'<li style="margin:6px 0">'
            f'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:{priority_color};margin-right:8px"></span>'
            f'<strong>{t["title"]}</strong>'
            f'<span style="color:#64748B;font-size:13px">{due}</span>'
            f'</li>'
        )
    return f'<ul style="list-style:none;padding:0;margin:0">{"".join(items)}</ul>'


async def send_daily_digest():
    """每日摘要邮件 08:00。"""
    from database import get_db, row_to_dict
    db = await get_db()
    try:
        today = date.today().isoformat()
        in_3 = (date.today() + timedelta(days=3)).isoformat()
        cur = await db.execute(
            """SELECT * FROM tasks WHERE status!='done'
               AND (substr(due_date,1,10)<=? OR priority='urgent')
               ORDER BY priority='urgent' DESC, due_date""",
            (in_3,)
        )
        urgent = [row_to_dict(r) for r in await cur.fetchall()]

        cur = await db.execute(
            """SELECT * FROM tasks WHERE status!='done' AND substr(due_date,1,10)=?
               ORDER BY priority='urgent' DESC""",
            (today,)
        )
        today_tasks = [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()

    html = f"""
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,sans-serif;color:#0F172A">
      <h1 style="font-size:24px;margin-bottom:8px">☀️ 早安！这是你的今日计划</h1>
      <p style="color:#64748B">{today}</p>

      <h2 style="font-size:18px;margin-top:24px">🔥 紧急 & 即将到期（{len(urgent)}）</h2>
      {render_task_list(urgent)}

      <h2 style="font-size:18px;margin-top:24px">📅 今日任务（{len(today_tasks)}）</h2>
      {render_task_list(today_tasks)}

      <hr style="border:none;border-top:1px solid #E2E8F0;margin:32px 0">
      <p style="color:#94A3B8;font-size:12px">来自你的 Personal Life OS · 今日加油 💪</p>
    </div>
    """
    _send(f"☀️ 今日计划 · {today}", html)


async def send_weekly_review():
    """每周回顾 周日 20:00。"""
    from database import get_db
    db = await get_db()
    try:
        week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()
        cur = await db.execute(
            "SELECT COUNT(*) as c FROM tasks WHERE status='done' AND substr(completed_at,1,10)>=?",
            (week_start,)
        )
        done_count = (await cur.fetchone())["c"]

        cur = await db.execute(
            "SELECT COUNT(*) as c FROM tasks WHERE status!='done' AND due_date<? ",
            (date.today().isoformat(),)
        )
        overdue = (await cur.fetchone())["c"]
    finally:
        await db.close()

    html = f"""
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,sans-serif">
      <h1>📊 本周回顾</h1>
      <p>本周完成任务：<strong style="color:#22C55E">{done_count}</strong></p>
      <p>已逾期任务：<strong style="color:#EF4444">{overdue}</strong></p>
      <p style="color:#64748B">下周加油，向前一步！</p>
    </div>
    """
    _send(f"📊 周回顾 · {date.today().isoformat()}", html)


async def send_test_email():
    """测试邮件配置。"""
    return _send("✅ Personal Life OS 邮件测试",
                 "<p>如果你看到这封邮件，说明 Gmail SMTP 配置成功！</p>")
