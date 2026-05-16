"""智谱 GLM 服务封装（zai-sdk + glm-5.1）：语义解析、任务拆解、规划、建议。"""
import json
import re
from datetime import date, timedelta
from typing import Optional, Any
from config import config

try:
    from zai import ZhipuAiClient
    _zai_available = True
except Exception:
    _zai_available = False


PARSE_SYSTEM_PROMPT = """你是个人任务管理助手。把用户输入解析成结构化任务 JSON。

可用 space_id：
  - space-academic（学术：论文、实验、合作交流、会议、投稿）
  - space-work（工作：项目、需求、汇报、Code Review）
  - space-life（生活：约会、读书、学习、健身、日常）

输出严格 JSON（无任何 Markdown、解释，必须能被 json.loads 解析）：
{
  "title": "任务标题（简洁 8-20 字）",
  "space_id": "space-academic|space-work|space-life",
  "priority": "urgent|high|medium|low",
  "due_date": "YYYY-MM-DD 或 null",
  "start_date": "YYYY-MM-DD 或 null",
  "estimated_hours": 数字 或 null,
  "collaborators": ["人名1", "人名2"],
  "subtasks": ["子任务1", "子任务2", "子任务3"],
  "tags": ["标签"],
  "description": "AI 补充的任务描述",
  "is_meeting": true/false
}

判断规则：
- 今天是 {today}
- "下周X" "明天" "下个月" 等相对时间转成绝对日期
- 有"截稿/deadline/紧急/必须"等词 → priority=urgent
- 有"重要/关键/优先"等词 → priority=high
- 涉及"开会/讨论/对齐/见面" → is_meeting=true
- subtasks 必须给出 2-4 个合理的步骤
- 提取所有人名作为 collaborators（即使没有姓氏，如"张老师""李同学"）
"""


BREAKDOWN_SYSTEM_PROMPT = """你是任务拆解专家。把用户的大目标拆成 5-10 个具体可执行的子任务。

输出 JSON：
{
  "subtasks": [
    {"title": "子任务1", "estimated_hours": 2, "days_from_now": 0},
    {"title": "子任务2", "estimated_hours": 3, "days_from_now": 1}
  ],
  "total_hours": 总计小时,
  "suggestion": "AI 给的执行建议"
}

要求：
- 每个子任务具体可执行，不要太抽象
- days_from_now 表示距今天多少天开始
- 总时间合理，不要把所有任务都堆在第一天
"""


DAY_PLAN_SYSTEM_PROMPT = """你是个人时间规划师。根据当前任务列表和可用时间，生成今日作战计划。

输出 JSON：
{
  "blocks": [
    {"start_time": "09:00", "end_time": "10:30", "task_id": "xxx", "task_title": "...", "reason": "选这个的理由"},
    ...
  ],
  "total_hours_used": 总计小时,
  "summary": "今日重点一句话",
  "warning": "如有冲突或建议"
}

规则：
- 优先安排 priority=urgent 和临近 deadline 的任务
- 每个时间块 60-90 分钟为佳，符合番茄工作法
- 块之间留 15 分钟休息
- 同类任务尽量相邻安排
"""


SUGGESTION_SYSTEM_PROMPT = """你是个人效率顾问。根据数据生成 1-3 条主动建议。

输出 JSON：
{
  "suggestions": [
    {
      "level": "urgent|warning|info|tip",
      "icon": "🔴|🟡|🟢|💡",
      "title": "一句话标题",
      "body": "详细说明",
      "action": "建议的行动按钮文字（可选）"
    }
  ]
}

只在真的有建议时才输出，最多 3 条。"""


def _is_placeholder_key(k: str) -> bool:
    return (not k) or k.startswith("your_") or k == "" or len(k) < 20


_client_cache = None
def _get_client():
    global _client_cache
    if _client_cache is None and _zai_available:
        _client_cache = ZhipuAiClient(api_key=config.ZHIPU_API_KEY)
    return _client_cache


async def call_glm(messages: list, temperature: float = 0.3) -> str:
    """调用智谱 GLM-5.1。无 key/SDK 不可用 → 降级 mock。"""
    if _is_placeholder_key(config.ZHIPU_API_KEY) or not _zai_available:
        return _mock_response(messages)

    try:
        # zai-sdk 是同步的，放线程池跑避免阻塞
        import asyncio
        client = _get_client()

        def _sync_call():
            response = client.chat.completions.create(
                model=config.ZHIPU_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=4096,
            )
            return response.choices[0].message.content

        return await asyncio.to_thread(_sync_call)
    except Exception as e:
        print(f"[ai] GLM call failed, falling back to mock: {e}")
        return _mock_response(messages)


def extract_json(text: str) -> dict:
    """从 LLM 输出中提取 JSON（兼容 Markdown 代码块）。"""
    text = text.strip()
    # 去掉 markdown
    m = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if m:
        text = m.group(1)
    # 找第一个 { 到最后一个 }
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start:end + 1]
    return json.loads(text)


def _mock_response(messages: list) -> str:
    """无 API key 时返回 mock 数据，让前端能开发。"""
    last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    sys = next((m["content"] for m in messages if m["role"] == "system"), "")

    if "结构化任务" in sys:
        # 简单关键词推断 space
        space = "space-academic"
        if any(k in last_user for k in ["开会", "项目", "需求", "汇报", "review", "代码"]):
            space = "space-work"
        elif any(k in last_user for k in ["读", "学", "约", "运动", "健身", "练"]):
            space = "space-life"

        priority = "medium"
        if any(k in last_user for k in ["紧急", "deadline", "必须", "立即"]):
            priority = "urgent"
        elif any(k in last_user for k in ["重要", "关键", "尽快"]):
            priority = "high"

        # 简单时间推断
        due = None
        today = date.today()
        if "明天" in last_user:
            due = (today + timedelta(days=1)).isoformat()
        elif "下周" in last_user:
            due = (today + timedelta(days=7)).isoformat()
        elif "下个月" in last_user:
            due = (today + timedelta(days=30)).isoformat()

        # 提取人名
        collaborators = re.findall(r"([一-龥]{1,4}(?:老师|同学|经理|总|博士|教授))", last_user)

        return json.dumps({
            "title": last_user[:30],
            "space_id": space,
            "priority": priority,
            "due_date": due,
            "start_date": None,
            "estimated_hours": 2,
            "collaborators": collaborators,
            "subtasks": ["分析需求", "制定方案", "执行落地"],
            "tags": [],
            "description": "（AI 离线 mock，请配置 ZHIPU_API_KEY 启用真实解析）",
            "is_meeting": "开会" in last_user or "讨论" in last_user,
        }, ensure_ascii=False)

    if "拆解" in sys:
        return json.dumps({
            "subtasks": [
                {"title": "调研背景资料", "estimated_hours": 2, "days_from_now": 0},
                {"title": "起草初版方案", "estimated_hours": 3, "days_from_now": 1},
                {"title": "团队评审", "estimated_hours": 1, "days_from_now": 2},
                {"title": "迭代修改", "estimated_hours": 4, "days_from_now": 3},
                {"title": "最终交付", "estimated_hours": 1, "days_from_now": 5},
            ],
            "total_hours": 11,
            "suggestion": "建议从背景调研开始，分阶段推进，避免最后赶工",
        }, ensure_ascii=False)

    if "时间规划" in sys:
        return json.dumps({
            "blocks": [],
            "total_hours_used": 0,
            "summary": "AI 离线模式，请配置 ZHIPU_API_KEY",
            "warning": "",
        }, ensure_ascii=False)

    if "效率顾问" in sys:
        return json.dumps({
            "suggestions": [
                {"level": "info", "icon": "💡",
                 "title": "AI 助手未启用",
                 "body": "在 backend/.env 中配置 ZHIPU_API_KEY 后可获得真实 AI 建议",
                 "action": ""}
            ]
        }, ensure_ascii=False)

    return "{}"


# ---------- 业务接口 ----------

async def parse_task(text: str) -> dict:
    today = date.today().isoformat()
    sys_prompt = PARSE_SYSTEM_PROMPT.replace("{today}", today)
    raw = await call_glm([
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": text},
    ])
    return extract_json(raw)


async def breakdown_task(goal: str, deadline: Optional[str] = None) -> dict:
    msg = f"目标：{goal}"
    if deadline:
        msg += f"\n截止时间：{deadline}"
    raw = await call_glm([
        {"role": "system", "content": BREAKDOWN_SYSTEM_PROMPT},
        {"role": "user", "content": msg},
    ])
    return extract_json(raw)


async def generate_day_plan(tasks: list, available_hours: float) -> dict:
    task_summary = json.dumps([
        {"id": t["id"], "title": t["title"], "priority": t["priority"],
         "due_date": t.get("due_date"), "estimated_hours": t.get("estimated_hours") or 1}
        for t in tasks[:30]
    ], ensure_ascii=False)
    user_msg = f"今日可用时间：{available_hours} 小时\n\n待办任务列表：\n{task_summary}"
    raw = await call_glm([
        {"role": "system", "content": DAY_PLAN_SYSTEM_PROMPT},
        {"role": "user", "content": user_msg},
    ])
    return extract_json(raw)


async def generate_suggestions(stats: dict, urgent_tasks: list) -> dict:
    msg = json.dumps({
        "stats": stats,
        "urgent_tasks": [{"title": t["title"], "due_date": t.get("due_date"),
                          "priority": t["priority"]} for t in urgent_tasks[:10]],
    }, ensure_ascii=False)
    raw = await call_glm([
        {"role": "system", "content": SUGGESTION_SYSTEM_PROMPT},
        {"role": "user", "content": msg},
    ])
    return extract_json(raw)
