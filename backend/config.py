"""配置加载，从 .env 读取。"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# PyInstaller 打包后 __file__ 在临时目录，用 sys.executable 同级目录存数据
if getattr(sys, 'frozen', False):
    _exe_dir = Path(sys.executable).parent
    BASE_DIR = Path(os.environ.get('APP_DATA_DIR', str(_exe_dir)))
    load_dotenv(BASE_DIR / ".env")
else:
    BASE_DIR = Path(__file__).resolve().parent
    load_dotenv(BASE_DIR / ".env")


class Config:
    ZHIPU_API_KEY = os.getenv("ZHIPU_API_KEY", "")
    GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "")
    GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
    NOTIFY_EMAIL = os.getenv("NOTIFY_EMAIL", "")
    OVERLEAF_COOKIE = os.getenv("OVERLEAF_COOKIE", "")

    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))

    DB_PATH = BASE_DIR / os.getenv("DB_PATH", "./data/life_os.db").lstrip("./")
    SNAPSHOT_DIR = BASE_DIR / os.getenv("SNAPSHOT_DIR", "./data/snapshots").lstrip("./")

    ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    ZHIPU_MODEL = os.getenv("ZHIPU_MODEL", "glm-5.1")


config = Config()
config.SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
