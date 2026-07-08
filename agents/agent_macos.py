"""ARGUS macOS agent — scans the local machine for Shadow AI tools and
reports findings to the ARGUS backend.

Detects:
  - Cat 1 (local_llm): Ollama, via process scan + port 11434 check
  - Cat 2 (ai_ide):     Cursor, via ~/.cursor directory
  - Cat 5 (mcp_server): MCP config files (.mcp.json, claude_desktop_config.json)

Usage:
    python agent_macos.py

Configuration (environment variables):
    ARGUS_SERVER_URL   Base URL of the backend, e.g. http://localhost:8000
    ARGUS_API_KEY      Write-role API key for this agent (X-API-Key header)
"""

import os
import platform
import socket
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import psutil
import requests

AGENT_VERSION = "0.1.0"
DEFAULT_SERVER_URL = "http://localhost:8000"

OLLAMA_PORT = 11434

MCP_CONFIG_PATHS = [
    Path.home() / ".mcp.json",
    Path.home() / ".cursor" / "mcp.json",
    Path.home() / "Library" / "Application Support" / "Claude" / "claude_desktop_config.json",
]


def get_hostname() -> str:
    return socket.gethostname()


def get_os_version() -> str:
    mac_ver = platform.mac_ver()[0] or "unknown"
    return f"macOS {mac_ver}"


def get_kernel() -> str:
    return platform.release()


def get_uptime_seconds() -> int:
    return int(datetime.now().timestamp() - psutil.boot_time())


def get_ip_address() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _process_owner(proc: psutil.Process) -> str | None:
    try:
        return proc.username()
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return None


_NOT_FOUND = object()


def _find_ollama_listener_pid():
    """Scan for a LISTEN socket on OLLAMA_PORT. Returns the owning PID (may be
    None if the OS reports no owner), or the _NOT_FOUND sentinel if no such
    listener was found. On macOS, the system-wide psutil.net_connections()
    requires root (it iterates every process's file descriptors), so this
    falls back to checking connections process-by-process, skipping ones we
    don't have permission to inspect."""
    try:
        for conn in psutil.net_connections(kind="inet"):
            if conn.status == psutil.CONN_LISTEN and conn.laddr and conn.laddr.port == OLLAMA_PORT:
                return conn.pid
        return _NOT_FOUND
    except psutil.AccessDenied:
        pass

    for proc in psutil.process_iter(attrs=["pid"]):
        try:
            for conn in proc.net_connections(kind="inet"):
                if conn.status == psutil.CONN_LISTEN and conn.laddr and conn.laddr.port == OLLAMA_PORT:
                    return proc.info["pid"]
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    return _NOT_FOUND


def _port_is_open(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def detect_ollama() -> dict:
    """Cat 1: local LLM runtime. Looks for a listening socket on 11434,
    falling back to a process-name scan, then a raw port probe."""
    detected_at = now_iso()

    pid = _find_ollama_listener_pid()
    if pid is not _NOT_FOUND:
        user = None
        if pid:
            try:
                user = _process_owner(psutil.Process(pid))
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return {
            "category": "local_llm",
            "name": "ollama",
            "severity": "high",
            "status": "detected",
            "evidence": f"Port {OLLAMA_PORT} open (PID {pid})" if pid else f"Port {OLLAMA_PORT} open",
            "pid": pid,
            "port": OLLAMA_PORT,
            "user": user,
            "detected_at": detected_at,
        }

    for proc in psutil.process_iter(attrs=["pid", "name"]):
        name = (proc.info.get("name") or "").lower()
        if "ollama" in name:
            return {
                "category": "local_llm",
                "name": "ollama",
                "severity": "high",
                "status": "detected",
                "evidence": f"Process 'ollama' running (PID {proc.info['pid']})",
                "pid": proc.info["pid"],
                "user": _process_owner(proc),
                "detected_at": detected_at,
            }

    if _port_is_open("127.0.0.1", OLLAMA_PORT):
        return {
            "category": "local_llm",
            "name": "ollama",
            "severity": "high",
            "status": "detected",
            "evidence": f"Port {OLLAMA_PORT} open",
            "port": OLLAMA_PORT,
            "detected_at": detected_at,
        }

    return {
        "category": "local_llm",
        "name": "ollama",
        "severity": "high",
        "status": "not_detected",
        "evidence": f"No process or listener found on port {OLLAMA_PORT}",
        "detected_at": detected_at,
    }


def detect_cursor() -> dict:
    """Cat 2: AI IDE. Looks for the ~/.cursor config directory."""
    detected_at = now_iso()
    cursor_dir = Path.home() / ".cursor"

    if cursor_dir.exists():
        return {
            "category": "ai_ide",
            "name": "cursor",
            "severity": "medium",
            "status": "detected",
            "evidence": f"Config found: {cursor_dir}",
            "path": str(cursor_dir),
            "user": os.environ.get("USER"),
            "detected_at": detected_at,
        }

    return {
        "category": "ai_ide",
        "name": "cursor",
        "severity": "medium",
        "status": "not_detected",
        "evidence": f"No Cursor config found at {cursor_dir}",
        "detected_at": detected_at,
    }


def detect_mcp() -> dict:
    """Cat 5: MCP servers. Scans known MCP config file locations."""
    detected_at = now_iso()

    for config_path in MCP_CONFIG_PATHS:
        if config_path.exists():
            return {
                "category": "mcp_server",
                "name": "mcp_config",
                "severity": "high",
                "status": "detected",
                "evidence": f"MCP config found: {config_path}",
                "path": str(config_path),
                "user": os.environ.get("USER"),
                "detected_at": detected_at,
            }

    return {
        "category": "mcp_server",
        "name": "mcp_config",
        "severity": "high",
        "status": "not_detected",
        "evidence": "No MCP config files found",
        "detected_at": detected_at,
    }


def build_payload() -> dict:
    findings = [detect_ollama(), detect_cursor(), detect_mcp()]

    return {
        "hostname": get_hostname(),
        "os": "darwin",
        "os_version": get_os_version(),
        "kernel": get_kernel(),
        "agent_version": AGENT_VERSION,
        "scanned_at": now_iso(),
        "uptime_seconds": get_uptime_seconds(),
        "ip_address": get_ip_address(),
        "findings": findings,
    }


def send_payload(payload: dict, server_url: str, api_key: str) -> requests.Response:
    return requests.post(
        f"{server_url.rstrip('/')}/api/scan",
        headers={
            "Content-Type": "application/json",
            "X-API-Key": api_key,
        },
        json=payload,
        timeout=10,
    )


def main():
    server_url = os.environ.get("ARGUS_SERVER_URL", DEFAULT_SERVER_URL)
    api_key = os.environ.get("ARGUS_API_KEY")

    if not api_key:
        raise SystemExit("ARGUS_API_KEY environment variable is required (write-role API key)")

    payload = build_payload()

    print(f"Scanning {payload['hostname']} ({payload['os_version']})...")
    for f in payload["findings"]:
        print(f"  [{f['status']:12s}] {f['category']:12s} {f['name']:12s} {f['evidence']}")

    response = send_payload(payload, server_url, api_key)

    if response.ok:
        print(f"\nScan submitted: {response.json()}")
    else:
        print(f"\nFailed to submit scan: {response.status_code} {response.text}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
