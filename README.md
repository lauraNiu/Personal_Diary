# Personal Life OS

> AI 驱动的个人生命周期管理系统：学术科研 · 公司工作 · 个人生活

[![](https://img.shields.io/badge/license-MIT-blue)]() [![](https://img.shields.io/badge/python-3.12+-green)]() [![](https://img.shields.io/badge/react-18-61dafb)]() [![](https://img.shields.io/badge/AI-GLM--5.1-orange)]()

---

## 🚀 快速开始

```bash
cd todo-app
./start.sh
```

首次运行会自动安装 Python + Node 依赖（约 1-2 分钟），然后访问 http://localhost:5173

**首次使用**：进入登录页 → 注册账号 → 系统自动初始化默认 Spaces，可以开始用了。

---

## ✨ 核心功能

### 🤖 AI Agent（智谱 GLM-5.1）

| 触发方式 | 功能 |
|---------|------|
| 按 `Q` | **Quick Capture** — 输入一句话，AI 自动解析所有字段 |
| 任务详情 ✨ 按钮 | **AI 任务拆解** — 大目标自动拆成 5-10 个子任务 |
| 容量视图 → AI 计划 | **今日计划生成** — 按可用时间智能排期 |
| 后台主动 | **建议引擎** — 截稿预警 / 协作者同步 / 拖延感知 |

> 示例：输入"下周三和张老师讨论 NLP 论文进展，紧急" → AI 自动填充：
> - 📁 学术空间 / 会议
> - 👤 协作者：张老师（不存在则自动创建）
> - 📅 截止日期：2026-05-20
> - ⚡ 优先级：紧急
> - ✅ 子任务：整理实验结果 / 准备 PPT / 拟定议程 / 撰写纪要
> - 🏷️ 标签：NLP, 论文, 讨论

### 📊 10 个视图

看板 (Kanban) · 甘特图 (Gantt) · 日历 (Calendar) · 统计 (Stats) · 四象限 (Eisenhower) · 容量 (Capacity) · 热力图 (Heatmap) · 协作者 (Collaborator) · 论文 Hub (Paper) · 专注模式 (Focus + 番茄钟)

### 📧 邮件提醒（Gmail SMTP）

| 邮件 | 时间 | 内容 |
|------|------|------|
| 每日摘要 | 每天 08:00 | 今日任务 + 紧急预警 + AI 建议 |
| 截稿预警 | 提前 14/7/3/1 天 | 论文/任务详情 + 当前进度 |
| 周回顾 | 周日 20:00 | 完成统计 + 下周重点 |
| 月度复盘 | 每月 1 日 09:00 | AI 生成成长报告 |

### 📝 论文管理（Overleaf 集成）

- 绑定 Overleaf 项目链接
- 每日 02:00 自动拉取最新版本
- 字数变化曲线 + 版本时间轴
- AI 生成 Diff 摘要："本次新增实验章节约 800 字"

### 👥 多用户系统

- 邮箱 + 密码注册（bcrypt 哈希）
- JWT 鉴权（默认 7 天）
- 数据严格按用户隔离
- 顶部头像菜单一键退出

---

## 📁 目录结构

```
todo-app/
├── backend/                          # FastAPI + SQLite
│   ├── main.py
│   ├── config.py / dependencies.py / models.py / database.py
│   ├── routers/                      13 个 API 模块
│   │   ├── auth.py                   注册/登录/me
│   │   ├── tasks.py / spaces.py / projects.py / areas.py
│   │   ├── collaborators.py / papers.py / meetings.py
│   │   ├── tags.py / journals.py / notifications.py
│   │   ├── stats.py / ai.py
│   ├── services/
│   │   ├── ai_service.py             智谱 GLM-5.1 调用
│   │   ├── auth_service.py           bcrypt + JWT
│   │   ├── email_service.py          Gmail SMTP
│   │   ├── overleaf_service.py       Cookie 同步
│   │   └── scheduler.py              APScheduler 定时任务
│   ├── data/
│   │   ├── life_os.db                SQLite 数据库
│   │   └── snapshots/                Overleaf 论文快照
│   ├── .env                          配置（API key 等）
│   └── requirements.txt
│
├── frontend/                         # React + Vite + TS + Tailwind
│   ├── src/
│   │   ├── App.tsx / main.tsx
│   │   ├── api.ts                    HTTP 客户端
│   │   ├── auth.ts                   登录态管理
│   │   ├── store.ts                  Zustand 全局状态
│   │   ├── types.ts / utils.ts
│   │   ├── components/               公共组件（Tooltip/Sidebar/...）
│   │   └── views/                    10 个视图组件
│   └── package.json
│
├── docs/                             3 份完整设计文档
│   ├── 01_产品设计.md
│   ├── 02_前端设计.md
│   └── 03_技术架构.md
│
├── start.sh                          一键启动脚本
└── README.md                         本文件
```

---

## ⚙️ 配置

复制示例文件并填入真实配置：

```bash
cp backend/.env.example backend/.env
```

`backend/.env` 完整字段：

```env
# 智谱 AI（已填入，可直接用 GLM-5.1）
ZHIPU_API_KEY=cdd67b27...
ZHIPU_MODEL=glm-5.1

# Gmail SMTP（用于邮件提醒）
GMAIL_ADDRESS=your@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx     # https://myaccount.google.com/apppasswords
NOTIFY_EMAIL=your@gmail.com

# Overleaf（浏览器登录后从 Cookies 里复制 overleaf_session2 等）
OVERLEAF_COOKIE=...

# 鉴权（生产环境务必改成强随机串！）
JWT_SECRET=change-me-to-a-long-random-secret
JWT_EXPIRE_DAYS=7

# 服务器
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:5173
```

> 未配置的功能会自动降级到 mock 模式，前端仍可使用。

---

## ⌨️ 全局快捷键

| 键 | 功能 |
|---|---|
| `Q` | AI Quick Capture（自然语言录入）|
| `⌘K` / `Ctrl+K` | 全局搜索 |
| `⌘/` | 打开帮助 + 快捷键面板 |
| `⌘1` ~ `⌘9` | 切换 10 种视图 |
| `⌘[` | 侧边栏展开/收起 |
| `F` | 进入专注模式 |
| `ESC` | 关闭弹窗 / 退出专注 |

---

## 🛠️ 技术栈

| 层 | 技术 |
|---|------|
| **前端** | React 18 + Vite + TypeScript + Tailwind CSS |
| **状态** | Zustand |
| **拖拽** | @hello-pangea/dnd |
| **图表** | recharts |
| **动效** | Framer Motion |
| **图标** | Lucide React |
| **后端** | FastAPI + aiosqlite |
| **数据库** | SQLite（可平滑迁 PostgreSQL）|
| **AI** | 智谱 GLM-5.1（zai-sdk）|
| **鉴权** | bcrypt + PyJWT |
| **邮件** | Gmail SMTP（smtplib）|
| **定时任务** | APScheduler |

---

## 🚢 部署到生产环境

### 1. 服务器准备

```bash
# 安装 Python 3.12 + Node 18+
# 克隆代码到服务器
git clone <repo> /opt/life-os
cd /opt/life-os
```

### 2. 改配置

```bash
# 生成强 JWT secret
python3 -c "import secrets; print(secrets.token_urlsafe(64))" > /tmp/jwt
```

修改 `backend/.env`：
- `JWT_SECRET` = 上面生成的值
- `FRONTEND_URL` = 你的域名（如 https://life-os.example.com）

### 3. 收紧 CORS

修改 `backend/main.py`：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://life-os.example.com"],   # 替换为你的域名
    ...
)
```

### 4. 用 systemd 管理后端

`/etc/systemd/system/life-os.service`：

```ini
[Unit]
Description=Personal Life OS Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/life-os/todo-app/backend
ExecStart=/opt/life-os/todo-app/backend/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

### 5. 前端构建 + Nginx

```bash
cd frontend && npm run build       # 产物在 dist/

# Nginx 配置
server {
    listen 443 ssl;
    server_name life-os.example.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
    }
    location / {
        root /opt/life-os/todo-app/frontend/dist;
        try_files $uri /index.html;
    }
}
```

### 6.（可选）迁 PostgreSQL

数据模型完全兼容，把 `aiosqlite` 换成 `asyncpg` + 调整连接字符串即可。

---

## 💾 数据备份

```bash
# 数据库
cp todo-app/backend/data/life_os.db ~/backup/life_os_$(date +%Y%m%d).db

# Overleaf 快照
tar czf ~/backup/snapshots_$(date +%Y%m%d).tar.gz todo-app/backend/data/snapshots/
```

---

## 📐 详细设计文档

| 文档 | 内容 |
|------|------|
| [`docs/01_产品设计.md`](docs/01_产品设计.md) | 三大空间、任务属性、AI 能力、邮件、Overleaf |
| [`docs/02_前端设计.md`](docs/02_前端设计.md) | 设计系统、Tooltip、快捷键、动效、Onboarding |
| [`docs/03_技术架构.md`](docs/03_技术架构.md) | 目录结构、数据库、API 路由、AI Prompt |

---

## 🐛 常见问题

**Q: AI 解析返回 mock 内容？**  
A: 检查 `backend/.env` 中 `ZHIPU_API_KEY` 是否正确填入，重启后端。

**Q: 邮件发送失败？**  
A: Gmail 必须开两步验证，然后用 [App Passwords](https://myaccount.google.com/apppasswords) 生成 16 位专用密码，不能用账户密码。

**Q: Overleaf 同步报 401？**  
A: Cookie 过期了，重新在浏览器登录 Overleaf，从开发者工具复制完整 Cookie 串。

**Q: 启动失败 "claude-agent-sdk requires Python >=3.10"？**  
A: 系统 Python 是 3.9，用 `uv` 装 Python 3.12（`start.sh` 已自动处理）。

**Q: 重置数据库？**  
A: 停服务后 `rm backend/data/life_os.db` 即可，下次启动自动重建。

---

## 📝 License

MIT — 自由使用、修改、二次分发。

---

*Built with Claude · Powered by GLM-5.1 · 2026*
