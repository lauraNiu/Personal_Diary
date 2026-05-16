from fastapi import APIRouter
from database import get_db, row_to_dict

router = APIRouter(prefix="/api/journals", tags=["journals"])


@router.get("")
async def list_journals(field: str | None = None, search: str | None = None):
    db = await get_db()
    try:
        sql = "SELECT * FROM journals WHERE 1=1"
        params = []
        if field:
            sql += " AND field=?"
            params.append(field)
        if search:
            sql += " AND (name LIKE ? OR abbreviation LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])
        sql += " ORDER BY abbreviation"
        cur = await db.execute(sql, params)
        return [row_to_dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()
