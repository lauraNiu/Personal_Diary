"""注册/登录/当前用户。"""
import random
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from database import get_db, new_id, now_iso, init_user_data, row_to_dict
from services.auth_service import hash_password, verify_password, create_token
from dependencies import current_user_id

router = APIRouter(prefix="/api/auth", tags=["auth"])

AVATAR_COLORS = ["#6366F1", "#0EA5E9", "#10B981", "#F97316", "#EC4899",
                 "#8B5CF6", "#EAB308", "#06B6D4", "#22C55E", "#F43F5E"]


class RegisterIn(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=6, max_length=100)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    user: dict


def _user_public(row) -> dict:
    d = row_to_dict(row)
    d.pop("password_hash", None)
    return d


@router.post("/register", response_model=TokenOut)
async def register(body: RegisterIn):
    db = await get_db()
    try:
        cur = await db.execute("SELECT id FROM users WHERE lower(email)=?", (body.email.lower(),))
        if await cur.fetchone():
            raise HTTPException(400, "该邮箱已注册")

        uid = new_id()
        await db.execute(
            "INSERT INTO users (id, email, name, password_hash, avatar_color, created_at) VALUES (?,?,?,?,?,?)",
            (uid, body.email.lower(), body.name, hash_password(body.password),
             random.choice(AVATAR_COLORS), now_iso()),
        )
        await db.commit()

        # 自动初始化默认 spaces + areas
        await init_user_data(db, uid)

        cur = await db.execute("SELECT * FROM users WHERE id=?", (uid,))
        user = _user_public(await cur.fetchone())
        return TokenOut(access_token=create_token(uid, body.email.lower()), user=user)
    finally:
        await db.close()


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn):
    db = await get_db()
    try:
        cur = await db.execute("SELECT * FROM users WHERE lower(email)=?", (body.email.lower(),))
        row = await cur.fetchone()
        if not row or not verify_password(body.password, row["password_hash"]):
            raise HTTPException(401, "邮箱或密码错误")
        await db.execute("UPDATE users SET last_login_at=? WHERE id=?", (now_iso(), row["id"]))
        await db.commit()
        return TokenOut(access_token=create_token(row["id"], row["email"]), user=_user_public(row))
    finally:
        await db.close()


@router.get("/me")
async def me(uid: str = Depends(current_user_id)):
    db = await get_db()
    try:
        cur = await db.execute("SELECT * FROM users WHERE id=?", (uid,))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(401, "用户不存在")
        return _user_public(row)
    finally:
        await db.close()
