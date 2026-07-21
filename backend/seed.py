"""One-time script to seed API keys into the database.

Usage:
    python seed.py

Keys are read from environment variables (via .env file).
Create a .env file in this directory based on .env.example.
"""

import hashlib
import os
from pathlib import Path

from dotenv import load_dotenv
from database import init_db, get_session, ApiKey

load_dotenv(Path(__file__).parent / ".env")

SEED_KEYS = [
    (os.environ["ARGUS_KEY_TEST"], "local-dev", "write"),
    (os.environ["ARGUS_KEY_LINUX"], "linux-agent", "write"),
    (os.environ["ARGUS_KEY_MACOS"], "macos-agent", "write"),
    (os.environ["ARGUS_KEY_WINDOWS"], "windows-agent", "write"),
    (os.environ["ARGUS_KEY_DASHBOARD"], "dashboard", "read"),
]


def hash_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode()).hexdigest()


def seed():
    init_db()
    with get_session() as session:
        for plaintext, name, role in SEED_KEYS:
            key_hash = hash_key(plaintext)
            exists = session.execute(
                __import__("sqlalchemy").select(ApiKey).where(ApiKey.key_hash == key_hash)
            ).scalar_one_or_none()
            if exists:
                print(f"  SKIP  {name:20s} (already exists)")
                continue
            session.add(ApiKey(key_hash=key_hash, name=name, role=role))
            print(f"  ADD   {name:20s} [{role}]")
        session.commit()

    print("\nDone. Keys have been hashed and stored.")
    print("Keep the plaintext keys secure. Share them with agent developers.")


if __name__ == "__main__":
    seed()
