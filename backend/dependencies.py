"""FastAPI 依赖：current_user_id 从 JWT 解出当前用户。"""
from fastapi import Header, HTTPException
from services.auth_service import decode_token


async def current_user_id(authorization: str | None = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "未登录")
    token = authorization[7:]
    try:
        payload = decode_token(token)
        return payload["sub"]
    except Exception as e:
        raise HTTPException(401, f"Token 无效或过期：{e}")
