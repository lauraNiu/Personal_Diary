"""Overleaf 同步服务。

Overleaf 没有官方 API，用 Cookie 模拟登录态调用内部接口：
  GET https://www.overleaf.com/project/<project_id>/download/zip
  返回 ZIP 文件，本地解压后统计字数 + 保存快照。
"""
import re
import zipfile
import io
import json
from datetime import datetime
from pathlib import Path
import httpx
from config import config
from database import get_db, row_to_dict, new_id, now_iso


def count_words_in_tex(tex_content: str) -> int:
    """简单统计 .tex 字数（去除注释、命令、参数后按空格分词）。"""
    # 去掉注释
    text = re.sub(r"%.*", "", tex_content)
    # 去掉命令 \xxx{...} \xxx
    text = re.sub(r"\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})*", " ", text)
    # 去掉数学公式
    text = re.sub(r"\$[^$]*\$", " ", text)
    text = re.sub(r"\\\([^)]*\\\)", " ", text)
    # 按空格 + 中文字符分词
    words = re.findall(r"[a-zA-Z]+|[一-龥]", text)
    return len(words)


async def download_overleaf_zip(project_id: str) -> bytes:
    """下载 Overleaf 项目 ZIP。"""
    if not config.OVERLEAF_COOKIE:
        raise RuntimeError("OVERLEAF_COOKIE 未配置")
    url = f"https://www.overleaf.com/project/{project_id}/download/zip"
    headers = {
        "Cookie": config.OVERLEAF_COOKIE,
        "User-Agent": "Mozilla/5.0",
    }
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.get(url, headers=headers, follow_redirects=True)
        r.raise_for_status()
        return r.content


async def sync_one_paper(paper_id: str) -> dict:
    """同步一篇论文：拉取 ZIP、统计字数、生成快照。"""
    db = await get_db()
    try:
        cur = await db.execute("SELECT * FROM papers WHERE id=?", (paper_id,))
        row = await cur.fetchone()
        if not row:
            return {"ok": False, "error": "Paper not found"}
        paper = row_to_dict(row)

        if not paper.get("overleaf_project_id"):
            return {"ok": False, "error": "Paper 未绑定 Overleaf 项目"}

        try:
            zip_bytes = await download_overleaf_zip(paper["overleaf_project_id"])
        except Exception as e:
            return {"ok": False, "error": f"下载失败：{e}"}

        # 解析字数
        total_words = 0
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            for name in zf.namelist():
                if name.endswith(".tex"):
                    try:
                        content = zf.read(name).decode("utf-8", errors="ignore")
                        total_words += count_words_in_tex(content)
                    except Exception:
                        continue

        # 保存 ZIP 快照到本地
        snapshot_dir = config.SNAPSHOT_DIR / paper_id
        snapshot_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshot_path = snapshot_dir / f"{ts}.zip"
        snapshot_path.write_bytes(zip_bytes)

        # 取上一个快照对比 diff（简单字数差）
        cur = await db.execute(
            "SELECT * FROM paper_snapshots WHERE paper_id=? ORDER BY snapshot_at DESC LIMIT 1",
            (paper_id,)
        )
        prev = await cur.fetchone()
        diff_summary = ""
        if prev:
            prev_d = row_to_dict(prev)
            delta = total_words - (prev_d["word_count"] or 0)
            if delta > 0:
                diff_summary = f"新增约 {delta} 字"
            elif delta < 0:
                diff_summary = f"删减约 {-delta} 字"
            else:
                diff_summary = "字数无变化"
        else:
            diff_summary = f"初始快照，共 {total_words} 字"

        # 生成版本号
        cur = await db.execute(
            "SELECT COUNT(*) as c FROM paper_snapshots WHERE paper_id=?", (paper_id,)
        )
        version_num = (await cur.fetchone())["c"] + 1
        version_label = f"v{version_num}"

        # 写快照
        sid = new_id()
        await db.execute(
            """INSERT INTO paper_snapshots
               (id, paper_id, version_label, snapshot_at, word_count, diff_summary, file_path)
               VALUES (?,?,?,?,?,?,?)""",
            (sid, paper_id, version_label, now_iso(), total_words, diff_summary, str(snapshot_path)),
        )

        # 更新 paper 当前字数
        await db.execute(
            "UPDATE papers SET current_word_count=?, updated_at=? WHERE id=?",
            (total_words, now_iso(), paper_id),
        )
        await db.commit()
        return {
            "ok": True,
            "version": version_label,
            "word_count": total_words,
            "diff_summary": diff_summary,
        }
    finally:
        await db.close()


async def sync_all_papers():
    """每日定时同步全部论文。"""
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id FROM papers WHERE overleaf_project_id IS NOT NULL AND overleaf_project_id != ''"
        )
        ids = [r["id"] for r in await cur.fetchall()]
    finally:
        await db.close()

    print(f"[overleaf] syncing {len(ids)} papers...")
    for pid in ids:
        try:
            await sync_one_paper(pid)
        except Exception as e:
            print(f"[overleaf] sync {pid} failed: {e}")
