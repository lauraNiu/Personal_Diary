"""SQLite 异步连接 + 建表 + 种子数据。"""
import aiosqlite
import json
import uuid
from datetime import datetime
from pathlib import Path
from config import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#6366F1',
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📁',
  color TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (space_id) REFERENCES spaces(id)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  area_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  due_date TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collaborators (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  institution TEXT,
  avatar_color TEXT NOT NULL,
  notes TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  space_id TEXT NOT NULL,
  area_id TEXT,
  project_id TEXT,
  paper_id TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'inbox',
  start_date TEXT,
  due_date TEXT,
  estimated_hours REAL,
  actual_hours REAL DEFAULT 0,
  subtasks TEXT DEFAULT '[]',
  tag_ids TEXT DEFAULT '[]',
  collaborator_ids TEXT DEFAULT '[]',
  dependency_ids TEXT DEFAULT '[]',
  recurrence TEXT,
  reminder_days TEXT DEFAULT '[]',
  is_inbox INTEGER DEFAULT 1,
  raw_input TEXT,
  ai_parsed INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS time_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_minutes INTEGER,
  is_pomodoro INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  title TEXT NOT NULL,
  overleaf_url TEXT,
  overleaf_project_id TEXT,
  target_journal_ids TEXT DEFAULT '[]',
  submission_status TEXT DEFAULT 'preparing',
  submission_deadline TEXT,
  collaborator_ids TEXT DEFAULT '[]',
  current_word_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_snapshots (
  id TEXT PRIMARY KEY,
  paper_id TEXT NOT NULL,
  version_label TEXT,
  snapshot_at TEXT NOT NULL,
  word_count INTEGER,
  diff_summary TEXT,
  file_path TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS journals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  field TEXT,
  impact_factor REAL,
  deadline TEXT,
  website TEXT,
  is_preset INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  space_id TEXT,
  project_id TEXT,
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  attendee_ids TEXT DEFAULT '[]',
  agenda TEXT,
  notes TEXT,
  action_items TEXT DEFAULT '[]',
  recurrence TEXT,
  reminder_minutes INTEGER DEFAULT 30,
  reminder_sent INTEGER DEFAULT 0,
  location TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  related_id TEXT,
  related_type TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS config_kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_space ON tasks(space_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_spaces_user ON spaces(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_papers_user ON papers(user_id);
"""


SEED_SPACES = [
    {"id": "space-academic", "name": "学术科研", "emoji": "🎓", "color": "#6366F1", "sort_order": 0},
    {"id": "space-work",     "name": "公司工作", "emoji": "💼", "color": "#0EA5E9", "sort_order": 1},
    {"id": "space-life",     "name": "个人生活", "emoji": "🌱", "color": "#10B981", "sort_order": 2},
]

SEED_AREAS = [
    {"space_id": "space-academic", "name": "论文写作", "color": "#818CF8"},
    {"space_id": "space-academic", "name": "实验研究", "color": "#A78BFA"},
    {"space_id": "space-academic", "name": "合作交流", "color": "#C084FC"},
    {"space_id": "space-work",     "name": "项目开发", "color": "#38BDF8"},
    {"space_id": "space-work",     "name": "会议汇报", "color": "#22D3EE"},
    {"space_id": "space-life",     "name": "学习成长", "color": "#34D399"},
    {"space_id": "space-life",     "name": "健身运动", "color": "#4ADE80"},
    {"space_id": "space-life",     "name": "社交日常", "color": "#A3E635"},
]

SEED_JOURNALS = [
    {"name": "Annual Meeting of the ACL", "abbreviation": "ACL", "field": "NLP", "impact_factor": None, "website": "https://aclweb.org"},
    {"name": "Conference on EMNLP", "abbreviation": "EMNLP", "field": "NLP", "impact_factor": None, "website": "https://emnlp.org"},
    {"name": "NAACL", "abbreviation": "NAACL", "field": "NLP", "impact_factor": None, "website": ""},
    {"name": "NeurIPS", "abbreviation": "NeurIPS", "field": "ML", "impact_factor": None, "website": "https://neurips.cc"},
    {"name": "ICML", "abbreviation": "ICML", "field": "ML", "impact_factor": None, "website": "https://icml.cc"},
    {"name": "ICLR", "abbreviation": "ICLR", "field": "ML", "impact_factor": None, "website": "https://iclr.cc"},
    {"name": "CVPR", "abbreviation": "CVPR", "field": "CV", "impact_factor": None, "website": ""},
    {"name": "ICCV", "abbreviation": "ICCV", "field": "CV", "impact_factor": None, "website": ""},
    {"name": "AAAI", "abbreviation": "AAAI", "field": "AI", "impact_factor": None, "website": ""},
    {"name": "IJCAI", "abbreviation": "IJCAI", "field": "AI", "impact_factor": None, "website": ""},
    {"name": "KDD", "abbreviation": "KDD", "field": "Data Mining", "impact_factor": None, "website": ""},
    {"name": "WWW", "abbreviation": "WWW", "field": "Web", "impact_factor": None, "website": ""},
    {"name": "SIGIR", "abbreviation": "SIGIR", "field": "IR", "impact_factor": None, "website": ""},
    {"name": "Nature", "abbreviation": "Nature", "field": "Multi", "impact_factor": 64.8, "website": "https://nature.com"},
    {"name": "Science", "abbreviation": "Science", "field": "Multi", "impact_factor": 56.9, "website": "https://science.org"},
]


async def get_db():
    db = await aiosqlite.connect(config.DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON")
    return db


async def init_db():
    """初始化建表 + 期刊种子。Spaces/Areas 在用户注册时按用户初始化。"""
    db = await get_db()
    try:
        await db.executescript(SCHEMA)
        await db.commit()

        # 种子 Journal（全局共用）
        cur = await db.execute("SELECT COUNT(*) FROM journals")
        if (await cur.fetchone())[0] == 0:
            for j in SEED_JOURNALS:
                await db.execute(
                    "INSERT INTO journals (id, name, abbreviation, field, impact_factor, website, is_preset) VALUES (?,?,?,?,?,?,1)",
                    (str(uuid.uuid4()), j["name"], j["abbreviation"], j["field"], j["impact_factor"], j["website"]),
                )

        # 自动迁移：旧数据没有 user_id 时迁到默认 demo 用户
        await _auto_migrate(db)

        await db.commit()
        print(f"[db] initialized: {config.DB_PATH}")
    finally:
        await db.close()


async def _auto_migrate(db):
    """旧版本数据迁移：① 加 user_id ② meeting 表加新字段。"""
    # 给 meetings 表补列（SQLite 不支持 IF NOT EXISTS 加列，try/except）
    for col_def in (
        "ALTER TABLE meetings ADD COLUMN reminder_minutes INTEGER DEFAULT 30",
        "ALTER TABLE meetings ADD COLUMN reminder_sent INTEGER DEFAULT 0",
        "ALTER TABLE meetings ADD COLUMN location TEXT",
    ):
        try:
            await db.execute(col_def)
        except Exception:
            pass

    cur = await db.execute("SELECT COUNT(*) FROM tasks WHERE user_id IS NULL OR user_id = ''")
    legacy = (await cur.fetchone())[0]
    if legacy == 0:
        return
    # 创建 demo 用户
    from services.auth_service import hash_password
    demo_id = "demo-user-legacy"
    cur = await db.execute("SELECT id FROM users WHERE id=?", (demo_id,))
    if not await cur.fetchone():
        await db.execute(
            "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?,?,?,?,?)",
            (demo_id, "demo@local", "Demo", hash_password("demo1234"), datetime.now().isoformat()),
        )
    # 迁移所有表
    for table in ("spaces", "projects", "tasks", "collaborators", "papers", "meetings", "notifications", "tags"):
        try:
            await db.execute(f"UPDATE {table} SET user_id=? WHERE user_id IS NULL OR user_id=''", (demo_id,))
        except Exception:
            pass
    print(f"[db] migrated {legacy} legacy tasks → user demo@local (password: demo1234)")


async def init_user_data(db, user_id: str):
    """注册新用户时调用：为新用户创建默认 spaces + areas。"""
    now = datetime.now().isoformat()
    space_id_map = {}
    for s in SEED_SPACES:
        sid = str(uuid.uuid4())
        space_id_map[s["id"]] = sid
        await db.execute(
            "INSERT INTO spaces (id, user_id, name, emoji, color, sort_order, created_at) VALUES (?,?,?,?,?,?,?)",
            (sid, user_id, s["name"], s["emoji"], s["color"], s["sort_order"], now),
        )
    for a in SEED_AREAS:
        await db.execute(
            "INSERT INTO areas (id, space_id, name, color, sort_order) VALUES (?,?,?,?,?)",
            (str(uuid.uuid4()), space_id_map[a["space_id"]], a["name"], a["color"], 0),
        )
    await db.commit()


def row_to_dict(row) -> dict:
    if row is None:
        return None
    d = dict(row)
    for k in ("subtasks", "tag_ids", "collaborator_ids", "dependency_ids",
              "reminder_days", "target_journal_ids", "attendee_ids", "action_items"):
        if k in d and isinstance(d[k], str):
            try:
                d[k] = json.loads(d[k])
            except Exception:
                d[k] = []
    if "recurrence" in d and isinstance(d.get("recurrence"), str) and d["recurrence"]:
        try:
            d["recurrence"] = json.loads(d["recurrence"])
        except Exception:
            pass
    return d


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")
