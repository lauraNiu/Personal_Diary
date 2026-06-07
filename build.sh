#!/bin/bash
# 一键构建 Personal Life OS macOS 桌面应用
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "=== Personal Life OS 构建脚本 (Mac/Linux) ==="
echo

# ── 1. 构建前端 ──────────────────────────────────────────────
echo "[1/3] 构建前端..."
cd "$ROOT/frontend"
npm install
npm run build
echo "  ✓ 前端构建完成 → frontend/dist/"

# 复制到 electron/renderer
rm -rf "$ROOT/electron/renderer"
cp -r "$ROOT/frontend/dist" "$ROOT/electron/renderer"
echo "  ✓ 已复制到 electron/renderer/"
echo

# ── 2. 打包后端 ──────────────────────────────────────────────
echo "[2/3] 打包后端 (PyInstaller)..."
cd "$ROOT/backend"

# 安装依赖（包含 pyinstaller）
pip install -r requirements.txt
pip install pyinstaller

# 清理旧构建
rm -rf build dist __pycache__

pyinstaller backend.spec --distpath dist/ --workpath build/ --clean --noconfirm
echo "  ✓ 后端打包完成 → backend/dist/backend/"
echo

# ── 3. 打包 Electron ─────────────────────────────────────────
echo "[3/3] 打包 Electron 应用..."
cd "$ROOT/electron"
npm install
npm run build:mac
echo
echo "=== 构建完成！==="
echo "  安装包位置: electron/dist/"
ls "$ROOT/electron/dist/"*.dmg 2>/dev/null || true
