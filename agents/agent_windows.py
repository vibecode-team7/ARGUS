#!/usr/bin/env python3
"""
ARGUS Windows Agent v0.1.0

Scans a Windows endpoint for Shadow AI (unauthorized AI tools) and reports
findings to the central ARGUS backend.

Usage:
    1. Set the API key:  set ARGUS_API_KEY=<your-write-key>
    2. Set the backend:  set ARGUS_BACKEND_URL=http://your-server:8000
    3. Run:              python agent_windows.py

    Or dump the payload locally (no backend required):
        python agent_windows.py --json
        python agent_windows.py --json my_scan.json

Dependencies:
    pip install psutil requests
"""

import argparse
import json
import os
import platform
import socket
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import psutil
import requests

# ── Configuration ──────────────────────────────────────────────────────

AGENT_VERSION = "0.1.0"
API_KEY = os.environ.get("ARGUS_API_KEY", "")
BACKEND_URL = os.environ.get("ARGUS_BACKEND_URL", "http://localhost:8000")
SCAN_ENDPOINT = f"{BACKEND_URL}/api/scan"

OLLAMA_DEFAULT_PORT = 11434


# ── System Info ────────────────────────────────────────────────────────


def get_hostname() -> str:
    return socket.gethostname()


def get_os_version() -> str:
    """Return a human-readable OS version string."""
    ver = platform.version()
    release = platform.release()
    # Windows 10 reports '10' for release, Windows 11 also reports '10'
    # but version string starts with '10.0.22000+' for Win11
    try:
        build = int(ver.split(".")[-1]) if ver else 0
    except (ValueError, IndexError):
        build = 0

    if build >= 22000:
        name = "Windows 11"
    else:
        name = "Windows 10"

    product = platform.win32_edition() if hasattr(platform, "win32_edition") else ""
    if product:
        return f"{name} {product}"
    return f"{name} (Build {ver})"


def get_kernel() -> str:
    """Return the Windows build version (kernel equivalent)."""
    return platform.version()


def get_uptime_seconds() -> int:
    """Return system uptime in seconds."""
    return int(time.time() - psutil.boot_time())


def get_local_ip() -> str:
    """Get the machine's internal IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "unknown"


def get_username() -> str:
    return os.getlogin()


# ── Scan: Local LLM (Ollama) ─────────────────────────────────────────


def scan_ollama(findings: list, now: str) -> None:
    """Detect Ollama server process and port."""
    for proc in psutil.process_iter(["pid", "name", "username"]):
        try:
            name = proc.info["name"] or ""
            if name.lower() in ("ollama.exe", "ollama"):
                pid = proc.info["pid"]
                user = proc.info["username"] or get_username()
                findings.append({
                    "category": "local_llm",
                    "name": "ollama",
                    "severity": "high",
                    "status": "detected",
                    "evidence": f"Process running: {name} (PID {pid})",
                    "pid": pid,
                    "port": OLLAMA_DEFAULT_PORT,
                    "user": user,
                    "detected_at": now,
                })
                return
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    # Process not found — check if port is listening (sidecar or service)
    for conn in psutil.net_connections(kind="inet"):
        if conn.laddr.port == OLLAMA_DEFAULT_PORT and conn.status == "LISTEN":
            findings.append({
                "category": "local_llm",
                "name": "ollama",
                "severity": "high",
                "status": "detected",
                "evidence": f"Port {OLLAMA_DEFAULT_PORT} listening (no process info)",
                "port": OLLAMA_DEFAULT_PORT,
                "detected_at": now,
            })
            return

    findings.append({
        "category": "local_llm",
        "name": "ollama",
        "severity": "low",
        "status": "not_detected",
        "evidence": "Ollama process not found, port 11434 not listening",
        "detected_at": now,
    })


# ── Scan: AI IDEs ─────────────────────────────────────────────────────


def scan_cursor(findings: list, now: str) -> None:
    """Detect Cursor IDE installation."""
    user = get_username()
    appdata = os.environ.get("APPDATA", "")
    localappdata = os.environ.get("LOCALAPPDATA", "")

    cursor_paths = [
        Path(appdata) / "Cursor" if appdata else None,
        Path(localappdata) / "Programs" / "Cursor" if localappdata else None,
        Path(os.environ.get("PROGRAMFILES", "")) / "Cursor" if os.environ.get("PROGRAMFILES") else None,
        Path(os.environ.get("PROGRAMFILES(X86)", "")) / "Cursor" if os.environ.get("PROGRAMFILES(X86)") else None,
    ]

    for p in cursor_paths:
        if p and p.exists():
            findings.append({
                "category": "ai_ide",
                "name": "cursor",
                "severity": "medium",
                "status": "detected",
                "evidence": f"Cursor installation found: {p}",
                "path": str(p),
                "user": user,
                "detected_at": now,
            })
            return

    # Also check if Cursor process is running
    for proc in psutil.process_iter(["pid", "name"]):
        try:
            name = proc.info["name"] or ""
            if "cursor" in name.lower():
                findings.append({
                    "category": "ai_ide",
                    "name": "cursor",
                    "severity": "medium",
                    "status": "detected",
                    "evidence": f"Cursor process running: {name} (PID {proc.info['pid']})",
                    "pid": proc.info["pid"],
                    "user": user,
                    "detected_at": now,
                })
                return
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    findings.append({
        "category": "ai_ide",
        "name": "cursor",
        "severity": "low",
        "status": "not_detected",
        "evidence": "Cursor not found in standard paths or running processes",
        "detected_at": now,
    })


def scan_vscode_copilot(findings: list, now: str) -> None:
    """Detect VS Code with GitHub Copilot extension installed."""
    user = get_username()
    vscode_ext_dir = Path.home() / ".vscode" / "extensions"

    if vscode_ext_dir.exists():
        copilot_dirs = [
            d for d in vscode_ext_dir.iterdir()
            if d.is_dir() and "copilot" in d.name.lower()
        ]
        if copilot_dirs:
            findings.append({
                "category": "ai_ide",
                "name": "github_copilot",
                "severity": "medium",
                "status": "detected",
                "evidence": f"VS Code Copilot extension found: {copilot_dirs[0].name}",
                "path": str(copilot_dirs[0]),
                "user": user,
                "detected_at": now,
            })
            return

    findings.append({
        "category": "ai_ide",
        "name": "github_copilot",
        "severity": "low",
        "status": "not_detected",
        "evidence": "VS Code Copilot extension not found",
        "detected_at": now,
    })


# ── Scan: MCP Servers ─────────────────────────────────────────────────


MCP_CONFIG_LOCATIONS = [
    # Claude Desktop
    Path(os.environ.get("APPDATA", "~")) / "Claude" / "claude_desktop_config.json",
    # Global MCP configs
    Path.home() / ".mcp.json",
    Path.home() / ".mcp" / "config.json",
    # VS Code / Cursor workspace-level
    Path.home() / ".cursor" / "mcp.json",
    Path.home() / ".vscode" / "mcp.json",
    # Windsurf / Codeium
    Path.home() / ".codeium" / "mcp.json",
]


def scan_mcp_configs(findings: list, now: str) -> None:
    """Check for MCP server configuration files."""
    user = get_username()
    found_any = False

    for config_path in MCP_CONFIG_LOCATIONS:
        if config_path.exists():
            found_any = True
            # Try to read and count configured servers
            server_count = 0
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                # Claude Desktop format: { "mcpServers": { ... } }
                servers = data.get("mcpServers", data.get("servers", {}))
                if isinstance(servers, dict):
                    server_count = len(servers)
                elif isinstance(servers, list):
                    server_count = len(servers)
            except (json.JSONDecodeError, PermissionError):
                pass

            severity = "high" if server_count > 0 else "medium"
            evidence = f"MCP config found: {config_path}"
            if server_count > 0:
                evidence += f" ({server_count} server(s) configured)"

            findings.append({
                "category": "mcp_server",
                "name": "mcp_config",
                "severity": severity,
                "status": "detected",
                "evidence": evidence,
                "path": str(config_path),
                "user": user,
                "detected_at": now,
            })

    if not found_any:
        findings.append({
            "category": "mcp_server",
            "name": "mcp_config",
            "severity": "low",
            "status": "not_detected",
            "evidence": "No MCP config files found in standard locations",
            "detected_at": now,
        })


def scan_mcp_processes(findings: list, now: str) -> None:
    """Detect running MCP server processes (node/python-based)."""
    # Common MCP server process signatures
    mcp_signatures = [
        "mcp-server",
        "modelcontextprotocol",
        "mcp-server-filesystem",
        "mcp-server-fetch",
        "mcp-server-git",
        "mcp-server-sqlite",
        "mcp-server-memory",
    ]

    for proc in psutil.process_iter(["pid", "name", "cmdline", "username"]):
        try:
            cmdline = " ".join(proc.info["cmdline"] or []).lower()
            if any(sig in cmdline for sig in mcp_signatures):
                findings.append({
                    "category": "mcp_server",
                    "name": "mcp_server_process",
                    "severity": "high",
                    "status": "detected",
                    "evidence": f"MCP server process: {proc.info['name']} (PID {proc.info['pid']})",
                    "pid": proc.info["pid"],
                    "user": proc.info["username"] or get_username(),
                    "detected_at": now,
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue


# ── Additional AI Tool Checks ─────────────────────────────────────────


def scan_extra_ai_tools(findings: list, now: str) -> None:
    """Detect other common AI tools running on Windows."""
    extra_checks = [
        # (process name pattern, tool name, category, severity)
        ("lmstudio", "lm_studio", "local_llm", "medium"),
        ("ollama app", "ollama_desktop", "local_llm", "medium"),
        ("jan", "jan", "local_llm", "medium"),
        ("gpt4all", "gpt4all", "local_llm", "medium"),
        ("text-generation", "text_generation_webui", "local_llm", "medium"),
        ("kobold", "koboldcpp", "local_llm", "medium"),
        ("comfyui", "comfyui", "local_llm", "low"),
        ("stable.diffusion", "stable_diffusion", "local_llm", "low"),
    ]

    user = get_username()
    for proc in psutil.process_iter(["pid", "name", "username"]):
        try:
            name = (proc.info["name"] or "").lower()
            for pattern, tool_name, category, severity in extra_checks:
                if pattern in name:
                    findings.append({
                        "category": category,
                        "name": tool_name,
                        "severity": severity,
                        "status": "detected",
                        "evidence": f"AI tool process: {proc.info['name']} (PID {proc.info['pid']})",
                        "pid": proc.info["pid"],
                        "user": proc.info["username"] or user,
                        "detected_at": now,
                    })
                    break
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue


# ── Main ───────────────────────────────────────────────────────────────


def build_payload() -> dict:
    """Run all scans and build the API payload."""
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    findings: list = []

    scan_ollama(findings, now)
    scan_cursor(findings, now)
    scan_vscode_copilot(findings, now)
    scan_mcp_configs(findings, now)
    scan_mcp_processes(findings, now)
    scan_extra_ai_tools(findings, now)

    return {
        "hostname": get_hostname(),
        "os": "windows",
        "os_version": get_os_version(),
        "kernel": get_kernel(),
        "agent_version": AGENT_VERSION,
        "scanned_at": now,
        "uptime_seconds": get_uptime_seconds(),
        "ip_address": get_local_ip(),
        "findings": findings,
    }


def send_payload(payload: dict) -> dict:
    """POST the scan payload to the backend API."""
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
    }
    resp = requests.post(SCAN_ENDPOINT, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="ARGUS Windows Agent — scan for Shadow AI tools",
    )
    parser.add_argument(
        "--json",
        metavar="FILE",
        nargs="?",
        const="scan_output.json",
        default=None,
        help="Save the payload to a JSON file instead of sending to the backend. "
             "Optionally specify a filename (default: scan_output.json).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # ── Preflight checks ──────────────────────────────────────────
    if not args.json and not API_KEY:
        print("[ERROR] ARGUS_API_KEY environment variable is not set.", file=sys.stderr)
        print("  set ARGUS_API_KEY=<your-write-key>", file=sys.stderr)
        print("  (or use --json to save payload locally without sending)", file=sys.stderr)
        sys.exit(1)

    print(f"[ARGUS] Windows Agent v{AGENT_VERSION}")
    print(f"[ARGUS] Scanning {get_hostname()}...")

    # ── Run scan ──────────────────────────────────────────────────
    payload = build_payload()

    print(f"[ARGUS] OS:          {payload['os_version']}")
    print(f"[ARGUS] Kernel:      {payload['kernel']}")
    print(f"[ARGUS] IP:          {payload['ip_address']}")
    print(f"[ARGUS] Uptime:      {payload['uptime_seconds']}s")
    print(f"[ARGUS] Findings:    {len(payload['findings'])}")

    for f in payload["findings"]:
        icon = {"high": "!!!", "medium": "!", "low": "-"}.get(f["severity"], "?")
        status = "FOUND" if f["status"] == "detected" else "clean"
        print(f"  [{icon}] {f['category']}/{f['name']}: {status} — {f['evidence']}")

    # ── JSON dump mode ────────────────────────────────────────────
    if args.json:
        output_path = Path(args.json)
        with open(output_path, "w", encoding="utf-8") as fp:
            json.dump(payload, fp, indent=2, ensure_ascii=False)
        print(f"\n[ARGUS] Payload saved to {output_path.resolve()}")
        print("[ARGUS] No API key required in --json mode.")
        return

    # ── Send to backend ───────────────────────────────────────────
    print(f"\n[ARGUS] Sending to {BACKEND_URL}...")
    try:
        result = send_payload(payload)
        print(f"[ARGUS] Scan accepted (id={result['id']}, findings={result['findings_count']})")
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Could not connect to backend at {BACKEND_URL}", file=sys.stderr)
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(f"[ERROR] Backend rejected scan: {e}", file=sys.stderr)
        print(f"  Response: {e.response.text}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
