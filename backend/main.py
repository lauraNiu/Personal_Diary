"""Personal Life OS 后端入口。"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import config
from database import init_db
from services.scheduler import start_scheduler, stop_scheduler

from routers import (
    auth, spaces, areas, projects, tasks, collaborators,
    papers, meetings, journals, tags, notifications, stats, ai,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_scheduler()
    print(f"[life-os] backend ready at http://{config.HOST}:{config.PORT}")
    print(f"[life-os] frontend expected at {config.FRONTEND_URL}")
    yield
    stop_scheduler()


app = FastAPI(title="Personal Life OS", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, spaces, areas, projects, tasks, collaborators,
          papers, meetings, journals, tags, notifications, stats, ai):
    app.include_router(r.router)


@app.get("/")
async def root():
    return {
        "app": "Personal Life OS",
        "version": "1.0",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health():
    return {
        "ok": True,
        "ai_configured": bool(config.ZHIPU_API_KEY),
        "email_configured": bool(config.GMAIL_ADDRESS and config.GMAIL_APP_PASSWORD),
        "overleaf_configured": bool(config.OVERLEAF_COOKIE),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=False)
