"""Seed test scan data into the database for local development.

Usage:
    python test_data.py

Requires: seed.py has been run first so the test API key exists.
"""

import hashlib
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv
from database import init_db, get_session, Scan, Finding, ApiKey
from sqlalchemy import select

load_dotenv(Path(__file__).parent / ".env")


def hash_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode()).hexdigest()


TEST_HOSTS = [
    {
        "hostname": "dev-machine-01",
        "os": "linux",
        "os_version": "Ubuntu 22.04 LTS",
        "kernel": "6.2.0-26-generic",
        "agent_version": "0.1.0",
        "findings": [
            {
                "category": "local_llm", "name": "ollama", "severity": "high",
                "status": "detected", "evidence": "Port 11434 open (PID 12345)",
                "pid": 12345, "port": 11434, "user": "john",
            },
            {
                "category": "ai_ide", "name": "cursor", "severity": "medium",
                "status": "detected", "evidence": "Config found: /home/john/.cursor",
                "path": "/home/john/.cursor", "user": "john",
            },
        ],
    },
    {
        "hostname": "mac-workstation-02",
        "os": "darwin",
        "os_version": "macOS 14.5",
        "kernel": "23F79",
        "agent_version": "0.1.0",
        "findings": [
            {
                "category": "local_llm", "name": "ollama", "severity": "high",
                "status": "detected", "evidence": "Port 11434 open (PID 67890)",
                "pid": 67890, "port": 11434, "user": "sarah",
            },
            {
                "category": "mcp_server", "name": "mcp_config", "severity": "high",
                "status": "detected", "evidence": "MCP config: /Users/sarah/.mcp.json",
                "path": "/Users/sarah/.mcp.json", "user": "sarah",
            },
        ],
    },
    {
        "hostname": "win-dev-03",
        "os": "windows",
        "os_version": "Windows 11 Pro",
        "kernel": "22631.2428",
        "agent_version": "0.1.0",
        "findings": [
            {
                "category": "ai_ide", "name": "cursor", "severity": "medium",
                "status": "detected", "evidence": "Config found: C:\\Users\\alex\\AppData\\Roaming\\Cursor",
                "path": "C:\\Users\\alex\\AppData\\Roaming\\Cursor", "user": "alex",
            },
        ],
    },
    {
        "hostname": "clean-box-04",
        "os": "linux",
        "os_version": "Debian 12",
        "kernel": "6.1.0-17-amd64",
        "agent_version": "0.1.0",
        "findings": [],
    },
    {
        "hostname": "dev-machine-01",
        "os": "linux",
        "os_version": "Ubuntu 22.04 LTS",
        "kernel": "6.2.0-26-generic",
        "agent_version": "0.1.0",
        "findings": [
            {
                "category": "local_llm", "name": "ollama", "severity": "high",
                "status": "detected", "evidence": "Port 11434 open (PID 9876)",
                "pid": 9876, "port": 11434, "user": "john",
            },
            {
                "category": "ai_ide", "name": "cursor", "severity": "medium",
                "status": "detected", "evidence": "Config found: /home/john/.cursor",
                "path": "/home/john/.cursor", "user": "john",
            },
            {
                "category": "mcp_server", "name": "mcp_config", "severity": "high",
                "status": "detected", "evidence": "MCP config: /home/john/.mcp.json",
                "path": "/home/john/.mcp.json", "user": "john",
            },
        ],
    },
]


def seed_test_data():
    init_db()

    key_hash = hash_key(os.environ["ARGUS_KEY_TEST"])
    with get_session() as session:
        api_key = session.execute(
            select(ApiKey).where(ApiKey.key_hash == key_hash)
        ).scalar_one_or_none()

    if api_key is None:
        print("ERROR: No API key found. Run `python seed.py` first.")
        return

    now = datetime.now(timezone.utc)
    count = 0

    for i, host in enumerate(TEST_HOSTS):
        scanned_at = now - timedelta(hours=i * 4)

        scan = Scan(
            hostname=host["hostname"],
            os=host["os"],
            os_version=host["os_version"],
            kernel=host["kernel"],
            agent_version=host["agent_version"],
            scanned_at=scanned_at,
            uptime_seconds=3600 * (24 + i * 8),
            ip_address=f"192.168.1.{10 + i}",
            api_key_id=api_key.id,
            received_at=now - timedelta(hours=i * 4, minutes=2),
        )

        with get_session() as session:
            session.add(scan)
            session.flush()

            for f in host["findings"]:
                finding = Finding(
                    scan_id=scan.id,
                    category=f["category"],
                    name=f["name"],
                    severity=f["severity"],
                    status=f["status"],
                    evidence=f["evidence"],
                    pid=f.get("pid"),
                    port=f.get("port"),
                    path=f.get("path"),
                    user=f.get("user"),
                    detected_at=scanned_at - timedelta(seconds=30),
                )
                session.add(finding)

            session.commit()
            count += 1

    print(f"Seeded {count} scans with findings.")
    print("\nTest hosts:")
    for host in TEST_HOSTS:
        fc = len(host["findings"])
        status = f"{fc} finding{'s' if fc != 1 else ''}"
        print(f"  {host['hostname']:25s} ({host['os']:8s}) → {status}")


if __name__ == "__main__":
    seed_test_data()
