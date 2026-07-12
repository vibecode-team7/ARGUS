#!/usr/bin/env python3
"""ARGUS Linux Agent — scans for Shadow AI tools and reports to the backend.

Detects:
  - Cat 1: Local LLM  (Ollama — process scan + port 11434)
  - Cat 2: AI IDE     (Cursor — directory scan ~/.cursor)
  - Cat 5: MCP Servers (Config files — .mcp.json, claude_desktop_config.json)

Usage:
    python agent_linux.py

Requires:
    pip install psutil requests
"""

import os
import platform
import socket
import glob
from datetime import datetime, timezone

import psutil
import requests

# ── Configuration ─────────────────────────────────────────────────────

BACKEND_URL = os.environ.get("ARGUS_BACKEND_URL", "http://localhost:8000")
API_KEY = os.environ.get("ARGUS_KEY_LINUX", "")
AGENT_VERSION = "0.1.0"

# MCP config file paths to search (relative to each user's home)
MCP_CONFIG_PATTERNS = [
    ".mcp.json",
    ".config/claude/claude_desktop_config.json",
    ".config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
]


# ── Detection: Ollama (Cat 1 — local_llm) ─────────────────────────────

def detect_ollama() -> list[dict]:
    """Check for Ollama running processes and open ports.

    Only returns a finding when Ollama is actively detected.
    Prints a subtle console log when clean.
    """
    findings = []
    ollama_pids = []
    now = datetime.now(timezone.utc).isoformat()

    # Check running processes
    for proc in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            name = proc.info["name"] or ""
            cmdline = " ".join(proc.info["cmdline"] or [])
            if "ollama" in name.lower() or "ollama" in cmdline.lower():
                ollama_pids.append(proc.info["pid"])
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    # Check if port 11434 is in use
    port_open = False
    port_pid = None
    for conn in psutil.net_connections(kind="inet"):
        if conn.laddr.port == 11434 and conn.status == "LISTEN":
            port_open = True
            port_pid = conn.pid
            break

    if ollama_pids or port_open:
        pids = list(set(ollama_pids + ([port_pid] if port_pid else [])))
        pid_str = ", ".join(str(p) for p in pids)
        evidence_parts = []
        if port_open:
            evidence_parts.append(f"Port 11434 open (PID {port_pid})")
        if ollama_pids:
            evidence_parts.append(f"Process found (PIDs: {pid_str})")

        findings.append({
            "category": "local_llm",
            "name": "ollama",
            "severity": "high",
            "status": "detected",
            "evidence": "; ".join(evidence_parts),
            "pid": pids[0] if len(pids) == 1 else None,
            "port": 11434 if port_open else None,
            "user": _get_proc_user(pids[0]) if pids else None,
            "detected_at": now,
        })
    else:
        print("🟢 ollama: not running")

    return findings


# ── Detection: Cursor (Cat 2 — ai_ide) ────────────────────────────────

def detect_cursor() -> list[dict]:
    """Scan for Cursor IDE installation via directory check.

    Checks common Cursor configuration/install directories on Linux.
    Only returns a finding when a Cursor directory is found.
    Prints a subtle console log when clean.
    """
    findings = []
    cursor_paths = []
    now = datetime.now(timezone.utc).isoformat()

    # Common Cursor locations on Linux
    check_paths = [
        os.path.expanduser("~/.cursor"),
        os.path.expanduser("~/.config/Cursor"),
        "/opt/Cursor",
    ]

    for path in check_paths:
        if os.path.exists(path):
            cursor_paths.append(path)

    if cursor_paths:
        findings.append({
            "category": "ai_ide",
            "name": "cursor",
            "severity": "medium",
            "status": "detected",
            "evidence": f"Config found: {cursor_paths[0]}",
            "path": cursor_paths[0],
            "user": _get_current_user(),
            "detected_at": now,
        })
    else:
        print("🟢 cursor: not found")

    return findings


# ── Detection: MCP Configs (Cat 5 — mcp_server) ──────────────────────

def detect_mcp_configs() -> list[dict]:
    """Scan for MCP server configuration files.

    Only returns a finding when an MCP config is actively detected.
    Prints a subtle console log when clean.
    """
    findings = []
    found_configs = []
    now = datetime.now(timezone.utc).isoformat()

    home = os.path.expanduser("~")

    for pattern in MCP_CONFIG_PATTERNS:
        full_path = os.path.join(home, pattern)
        if os.path.isfile(full_path):
            found_configs.append(full_path)

    # Also search common directories for .mcp.json
    search_dirs = [
        home,
        os.path.join(home, ".config"),
        os.path.join(home, "Documents"),
    ]
    for d in search_dirs:
        if os.path.isdir(d):
            matches = glob.glob(os.path.join(d, "**", ".mcp.json"), recursive=True)
            for m in matches:
                if m not in found_configs:
                    found_configs.append(m)

    if found_configs:
        findings.append({
            "category": "mcp_server",
            "name": "mcp_config",
            "severity": "high",
            "status": "detected",
            "evidence": f"MCP config found: {found_configs[0]}",
            "path": found_configs[0],
            "user": _get_current_user(),
            "detected_at": now,
        })
    else:
        print("🟢 mcp_config: no configs found")

    return findings


# ── Helpers ────────────────────────────────────────────────────────────

def _get_current_user() -> str:
    """Get the current system username."""
    return os.environ.get("USER") or os.environ.get("LOGNAME") or "unknown"


def _get_proc_user(pid: int) -> str:
    """Get the username that owns a process."""
    try:
        proc = psutil.Process(pid)
        return proc.username()
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return _get_current_user()


def get_system_info() -> dict:
    """Collect system metadata for the scan payload."""
    hostname = socket.gethostname()

    # OS info from /etc/os-release
    os_version = "unknown"
    if os.path.isfile("/etc/os-release"):
        with open("/etc/os-release") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    os_version = line.split("=", 1)[1].strip().strip('"')
                    break

    # Kernel version
    kernel = platform.release()

    # Uptime
    uptime_seconds = int(psutil.boot_time())
    uptime_seconds = int(datetime.now(timezone.utc).timestamp()) - uptime_seconds

    # IP address (non-loopback)
    ip_address = None
    for iface, addrs in psutil.net_if_addrs().items():
        if iface == "lo":
            continue
        for addr in addrs:
            if addr.family == socket.AF_INET:
                ip_address = addr.address
                break
        if ip_address:
            break

    return {
        "hostname": hostname,
        "os": "linux",
        "os_version": os_version,
        "kernel": kernel,
        "agent_version": AGENT_VERSION,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": uptime_seconds,
        "ip_address": ip_address,
    }


def build_payload() -> dict:
    """Build the full scan payload."""
    system_info = get_system_info()
    findings = []
    findings.extend(detect_ollama())
    findings.extend(detect_cursor())
    findings.extend(detect_mcp_configs())

    payload = {**system_info, "findings": findings}
    return payload


def send_scan(payload: dict) -> dict:
    """POST the scan payload to the backend API."""
    url = f"{BACKEND_URL}/api/scan"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
    }

    response = requests.post(url, json=payload, headers=headers, timeout=10)
    response.raise_for_status()
    return response.json()


# ── Main ───────────────────────────────────────────────────────────────

def main():
    if not API_KEY:
        print("ERROR: ARGUS_KEY_LINUX environment variable is not set.")
        print("  export ARGUS_KEY_LINUX='your-write-key-here'")
        return 1

    print(f"ARGUS Linux Agent v{AGENT_VERSION}")
    print(f"Backend: {BACKEND_URL}")
    print()

    # Scan
    payload = build_payload()

    # Summary
    print(f"Host: {payload['hostname']} ({payload['os_version']})")
    if payload["findings"]:
        print(f"Findings: {len(payload['findings'])} detected")
        for f in payload["findings"]:
            print(f"  🔴 [{f['category']}] {f['name']}: {f['evidence']}")
    else:
        print("No findings detected.")
    print()

    # Send
    try:
        result = send_scan(payload)
        print(f"✅ Scan submitted — ID: {result['id']}, hostname: {result['hostname']}, findings: {result['findings_count']}")
    except requests.exceptions.ConnectionError:
        print(f"❌ Failed to connect to backend at {BACKEND_URL}")
        print("   Is the server running? Check: curl http://localhost:8000/health")
        return 1
    except requests.exceptions.HTTPError as e:
        print(f"❌ Backend returned error: {e.response.status_code} — {e.response.text}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
