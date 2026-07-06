import base64
import httpx
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError

from app.core.config import settings

security = HTTPBearer()

_jwks_cache: dict | None = None


def _get_jwks_url() -> str:
    """Derive the JWKS URL from the Clerk publishable key."""
    pk = settings.clerk_publishable_key
    b64 = pk.replace("pk_test_", "").replace("pk_live_", "")
    b64 += "=" * (4 - len(b64) % 4)
    frontend_api = base64.b64decode(b64).decode().rstrip("$")
    return f"https://{frontend_api}/.well-known/jwks.json"


async def get_clerk_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    jwks_url = _get_jwks_url()
    async with httpx.AsyncClient() as client:
        resp = await client.get(jwks_url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        return _jwks_cache


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    token = credentials.credentials
    try:
        jwks = await get_clerk_jwks()
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Invalid token key")

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return user_id
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {e}")
