import os
from datetime import datetime, timezone
from sqlalchemy import (
    create_engine, Column, Integer, String, Boolean,
    Text, DateTime, ForeignKey, UniqueConstraint, func, text
)
from sqlalchemy.orm import DeclarativeBase, relationship, Session

DB_DIR = os.environ.get("ARGUS_DB_DIR", os.path.join(os.path.dirname(__file__), "data"))
os.makedirs(DB_DIR, exist_ok=True)
DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'argus.db')}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)


class Base(DeclarativeBase):
    pass


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key_hash = Column(String(128), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    role = Column(String(16), default="write", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    scans = relationship("Scan", back_populates="api_key")


class Scan(Base):
    __tablename__ = "scans"
    __table_args__ = (
        UniqueConstraint("hostname", "scanned_at", name="uq_scan_hostname_scanned_at"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    hostname = Column(String(255), nullable=False, index=True)
    os = Column(String(64), nullable=False)
    os_version = Column(String(255), nullable=False)
    kernel = Column(String(255), nullable=True)
    agent_version = Column(String(32), nullable=False)
    scanned_at = Column(DateTime, nullable=False)
    uptime_seconds = Column(Integer, nullable=True)
    ip_address = Column(String(64), nullable=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=True)
    received_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    api_key = relationship("ApiKey", back_populates="scans")
    findings = relationship(
        "Finding", back_populates="scan", cascade="all, delete-orphan"
    )


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(Integer, ForeignKey("scans.id"), nullable=False)
    category = Column(String(64), nullable=False)
    name = Column(String(128), nullable=False)
    severity = Column(String(16), nullable=False)
    status = Column(String(32), nullable=False)
    evidence = Column(Text, nullable=False)
    pid = Column(Integer, nullable=True)
    port = Column(Integer, nullable=True)
    path = Column(String(512), nullable=True)
    user = Column(String(128), nullable=True)
    detected_at = Column(DateTime, nullable=False)

    scan = relationship("Scan", back_populates="findings")


MIGRATIONS = [
    {
        "table": "api_keys",
        "column": "role",
        "type": "VARCHAR(16) NOT NULL DEFAULT 'write'",
    },
]

INDEX_MIGRATIONS = [
    {
        "name": "ix_scans_hostname_scanned_at",
        "sql": "CREATE UNIQUE INDEX IF NOT EXISTS ix_scans_hostname_scanned_at ON scans(hostname, scanned_at)",
    },
]


def _get_columns(conn, table_name: str) -> set[str]:
    # nosemgrep: python.sqlalchemy.security.audit.avoid-sqlalchemy-text.avoid-sqlalchemy-text
    result = conn.execute(text(f"PRAGMA table_info({table_name})"))
    return {row[1] for row in result}


def _migrate():
    with engine.connect() as conn:
        existing_tables = {
            row[0]
            for row in conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            )
        }

        for migration in MIGRATIONS:
            table = migration["table"]
            column = migration["column"]

            if table not in existing_tables:
                continue

            columns = _get_columns(conn, table)
            if column in columns:
                continue

            col_type = migration["type"]
            print(f"  MIGRATE  Adding column {table}.{column} ({col_type})")
            conn.execute(
                # nosemgrep: python.sqlalchemy.security.audit.avoid-sqlalchemy-text.avoid-sqlalchemy-text
                text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
            )
            conn.commit()


def _migrate_indexes():
    with engine.connect() as conn:
        for idx in INDEX_MIGRATIONS:
            conn.execute(text(idx["sql"]))
        conn.commit()


def init_db():
    Base.metadata.create_all(engine)
    _migrate()
    _migrate_indexes()


def get_session():
    return Session(engine)
