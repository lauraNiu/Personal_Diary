@echo off
REM 一键构建 Personal Life OS Windows 桌面应用
setlocal enabledelayedexpansion

set ROOT=%~dp0
echo === Personal Life OS 构建脚本 (Windows) ===
echo.

REM ── 1. 构建前端 ──────────────────────────────────────────────
echo [1/3] 构建前端...
cd /d "%ROOT%frontend"
call npm install
call npm run build
if errorlevel 1 ( echo 前端构建失败 & exit /b 1 )
echo   OK 前端构建完成 - frontend\dist\

REM 复制到 electron\renderer
if exist "%ROOT%electron\renderer" rmdir /s /q "%ROOT%electron\renderer"
xcopy /E /I /Q "%ROOT%frontend\dist" "%ROOT%electron\renderer"
echo   OK 已复制到 electron\renderer\
echo.

REM ── 2. 打包后端 ──────────────────────────────────────────────
echo [2/3] 打包后端 (PyInstaller)...
cd /d "%ROOT%backend"

pip install -r requirements.txt
pip install pyinstaller

if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

pyinstaller backend.spec --distpath dist\ --workpath build\ --clean --noconfirm
if errorlevel 1 ( echo 后端打包失败 & exit /b 1 )
echo   OK 后端打包完成 - backend\dist\backend\
echo.

REM ── 3. 打包 Electron ─────────────────────────────────────────
echo [3/3] 打包 Electron 应用...
cd /d "%ROOT%electron"
call npm install
call npm run build:win
if errorlevel 1 ( echo Electron 打包失败 & exit /b 1 )

echo.
echo === 构建完成！===
echo   安装包位置: electron\dist\
dir "%ROOT%electron\dist\*.exe" 2>nul
