#!/bin/bash
# 一键启动 Personal Life OS（前后端）
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 启动 Personal Life OS..."
echo

# 启动后端
echo "📡 启动后端 (FastAPI)..."
cd "$DIR/backend"
if [ ! -d ".venv" ]; then
  echo "  → 首次运行，安装 Python 依赖..."
  uv venv .venv --python 3.12
  uv pip install -r requirements.txt
fi
[ ! -f .env ] && cp .env.example .env
.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/life-os-backend.log 2>&1 &
BACK_PID=$!
echo "  → 后端 PID=$BACK_PID, 日志: /tmp/life-os-backend.log"

# 启动前端
echo "🎨 启动前端 (Vite)..."
cd "$DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo "  → 首次运行，安装 npm 依赖..."
  npm install
fi
npm run dev > /tmp/life-os-frontend.log 2>&1 &
FRONT_PID=$!
echo "  → 前端 PID=$FRONT_PID, 日志: /tmp/life-os-frontend.log"

sleep 3
echo
echo "✅ 启动完成！"
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:8000"
echo "   API 文档: http://localhost:8000/docs"
echo
echo "💡 配置说明：编辑 backend/.env 启用 AI/邮件/Overleaf 功能"
echo "🛑 停止：kill $BACK_PID $FRONT_PID"
echo

# 等待并清理
trap "kill $BACK_PID $FRONT_PID 2>/dev/null; echo '已停止'; exit 0" INT TERM
wait
