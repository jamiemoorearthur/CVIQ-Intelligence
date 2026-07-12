from typing import Optional

from fastapi import Depends, HTTPException, Header
from supabase import create_client, Client

from app.core.config import settings


def _get_supabase() -> Optional[Client]:
    if not settings.supabase_url or not settings.supabase_service_key:
        return None
    return create_client(settings.supabase_url, settings.supabase_service_key)


async def get_current_user(authorization: Optional[str] = Header(default=None)) -> Optional[dict]:
    """
    Extracts and verifies the Supabase JWT from the Authorization header.
    Returns the user dict if valid, None if no token provided.
    Raises 401 if a token is present but invalid.
    """
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format.")

    token = authorization.removeprefix("Bearer ").strip()

    supabase = _get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Auth service not configured.")

    try:
        response = supabase.auth.get_user(token)
        return {"id": response.user.id, "email": response.user.email}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


async def require_user(user: Optional[dict] = Depends(get_current_user)) -> dict:
    """Use this dependency on routes that must be authenticated."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user


def get_user_tier(user: Optional[dict]) -> str:
    """Return 'paid' if the user has an active pro subscription, otherwise 'free'."""
    if not user:
        return "free"
    supabase = _get_supabase()
    if not supabase:
        return "free"
    try:
        result = (
            supabase.table("user_profiles")
            .select("is_pro")
            .eq("user_id", user["id"])
            .execute()
        )
        if result.data and result.data[0].get("is_pro"):
            return "paid"
    except Exception as e:
        print(f"[auth] tier check failed for user={user['id']}: {e}")
    return "free"
