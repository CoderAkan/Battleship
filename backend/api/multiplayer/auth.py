"""Verify Supabase JWTs server-side."""

import os
from typing import Optional, TypedDict

import jwt
from jwt import PyJWKClient


SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else ""

_jwks_client: Optional[PyJWKClient] = None


class AuthClaims(TypedDict):
    user_id: str
    email: Optional[str]


def _get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client
    if not JWKS_URL:
        return None
    if _jwks_client is None:
        _jwks_client = PyJWKClient(JWKS_URL, cache_keys=True)
    return _jwks_client


def _verify_asymmetric(token: str) -> Optional[dict]:
    client = _get_jwks_client()
    if client is None:
        return None
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token, signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
    except Exception:
        return None


def _verify_symmetric(token: str) -> Optional[dict]:
    if not SUPABASE_JWT_SECRET:
        return None
    try:
        return jwt.decode(
            token, SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except Exception:
        return None


def verify_token(token: str) -> Optional[AuthClaims]:
    payload = _verify_asymmetric(token) or _verify_symmetric(token)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return AuthClaims(user_id=user_id, email=payload.get("email"))