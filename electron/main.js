const { app, BrowserWindow, shell, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

const BACKEND_PORT = 8000;
const HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/api/health`;
const HEALTH_TIMEOUT_MS = 60000;
const HEALTH_INTERVAL_MS = 500;

let mainWindow = null;
let backendProcess = null;

// ─── 工具函数 ─────────────────────────────────────────────────

function getAppDataDir() {
  const base = app.getPath('userData');
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

function getBackendExecutable() {
  const isWin = process.platform === 'win32';
  const exeName = isWin ? 'backend.exe' : 'backend';

  if (app.isPackaged) {
    // 打包后在 resources/backend/ 目录下
    return path.join(process.resourcesPath, 'backend', exeName);
  }
  // 开发模式：直接运行 Python
  return null;
}

function getRendererPath() {
  if (app.isPackaged) {
    return path.join(__dirname, 'renderer', 'index.html');
  }
  return null; // 开发时加载 Vite dev server
}

// ─── 启动后端 ─────────────────────────────────────────────────

function startBackend() {
  return new Promise((resolve, reject) => {
    const exe = getBackendExecutable();

    if (!exe) {
      // 开发模式：假设后端已手动启动
      console.log('[Backend] Dev mode — assuming backend is already running');
      resolve();
      return;
    }

    if (!fs.existsSync(exe)) {
      reject(new Error(`后端可执行文件不存在: ${exe}\n请先运行构建脚本。`));
      return;
    }

    const appDataDir = getAppDataDir();
    const env = {
      ...process.env,
      APP_DATA_DIR: appDataDir,
      HOST: '127.0.0.1',
      PORT: String(BACKEND_PORT),
      FRONTEND_URL: `file://${__dirname}/renderer/index.html`,
    };

    console.log(`[Backend] Starting: ${exe}`);
    console.log(`[Backend] AppData: ${appDataDir}`);

    backendProcess = spawn(exe, [], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    backendProcess.stdout.on('data', (d) => console.log('[Backend]', d.toString().trim()));
    backendProcess.stderr.on('data', (d) => console.error('[Backend]', d.toString().trim()));

    backendProcess.on('error', (err) => {
      console.error('[Backend] Failed to start:', err);
      reject(err);
    });

    backendProcess.on('exit', (code) => {
      console.log(`[Backend] Exited with code ${code}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(
          `document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666"><div style="text-align:center"><h2>后端服务已停止</h2><p>请重启应用</p></div></div>'`
        ).catch(() => {});
      }
    });

    resolve();
  });
}

// ─── 等待后端就绪 ─────────────────────────────────────────────

function waitForBackend() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + HEALTH_TIMEOUT_MS;

    function check() {
      if (Date.now() > deadline) {
        reject(new Error(`后端在 ${HEALTH_TIMEOUT_MS / 1000}s 内未就绪`));
        return;
      }

      const req = http.get(HEALTH_URL, { timeout: 2000 }, (res) => {
        if (res.statusCode === 200) {
          console.log('[Backend] Ready!');
          resolve();
        } else {
          setTimeout(check, HEALTH_INTERVAL_MS);
        }
      });

      req.on('error', () => setTimeout(check, HEALTH_INTERVAL_MS));
      req.on('timeout', () => { req.destroy(); setTimeout(check, HEALTH_INTERVAL_MS); });
    }

    check();
  });
}

// ─── 创建窗口 ─────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Personal Life OS',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  const rendererPath = getRendererPath();
  if (rendererPath) {
    mainWindow.loadFile(rendererPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // 外部链接在系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── 显示加载窗口 ─────────────────────────────────────────────

function createLoadingWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 240,
    frame: false,
    resizable: false,
    backgroundColor: '#0f172a',
    webPreferences: { nodeIntegration: false },
  });

  win.loadURL(`data:text/html,<html><body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;color:#94a3b8"><div style="text-align:center"><div style="font-size:32px;margin-bottom:16px">✦</div><div style="font-size:16px;font-weight:600;color:#e2e8f0;margin-bottom:8px">Personal Life OS</div><div style="font-size:13px">正在启动服务...</div></div></body></html>`);

  return win;
}

// ─── App 生命周期 ─────────────────────────────────────────────

app.whenReady().then(async () => {
  const loadingWin = createLoadingWindow();

  try {
    await startBackend();
    await waitForBackend();
    loadingWin.close();
    createWindow();
  } catch (err) {
    loadingWin.close();
    console.error('[App] Startup failed:', err);
    dialog.showErrorBox('启动失败', err.message || '未知错误，请重试。');
    app.quit();
  }
});

app.on('window-all-closed', () => {
  killBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', killBackend);

function killBackend() {
  if (backendProcess && !backendProcess.killed) {
    console.log('[Backend] Killing process...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(backendProcess.pid), '/f', '/t']);
    } else {
      backendProcess.kill('SIGTERM');
    }
    backendProcess = null;
  }
}
