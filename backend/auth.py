import hashlib

from fastapi import Header, HTTPException
from sqlalchemy import select

from database import get_session, ApiKey


def hash_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode()).hexdigest()


def _verify(x_api_key: str, required_role: str) -> int:
    key_hash = hash_key(x_api_key)
    with get_session() as session:
        result = session.execute(
            select(ApiKey).where(
                ApiKey.key_hash == key_hash,
                ApiKey.is_active.is_(True),
                ApiKey.role == required_role,
            )
        )
        api_key = result.scalar_one_or_none()
    if api_key is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key",
        )
    return api_key.id


def verify_write_key(x_api_key: str = Header(...)) -> int:
    return _verify(x_api_key, "write")


def verify_read_key(x_api_key: str = Header(...)) -> int:
    return _verify(x_api_key, "read")
