---
marp: true
paginate: true
transition: fade
auto-advance: 20
theme: default
style: |
  section {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  }
  h1 {
    color: #1a1a2e;
  }
  h2 {
    color: #16213e;
  }
  table {
    font-size: 0.75em;
  }
  code {
    font-size: 0.7em;
  }
---

<!-- _class: lead -->

# Project ARGUS
## AI Risk & Governance Unauthorized-endpoint Scanner

A decentralized security framework to discover, track, and alert on **Shadow AI** across enterprise endpoints.


---

# What is Shadow AI?

**Shadow AI** = Any AI tool, model, or service used within an organization **without explicit approval from IT/security governance.**

It's the AI equivalent of Shadow IT — **unauthorized, untracked, and ungoverned.**

> Employees running local LLMs, using unapproved AI IDE extensions, or deploying MCP servers — all without security team knowledge.

---

# Shadow AI Categories

| Category | Description | Example Threat |
|---|---|---|
| **Cat 1** — Local LLM Instances | Models running locally on company machines | Ollama, llama.cpp, LM Studio |
| **Cat 2** — AI IDE Extensions | AI assistants embedded in dev environments | Cursor, Copilot, Codeium |
| **Cat 5** — MCP Servers & AI Agents | Model Context Protocol servers and autonomous agents | MCP configs, LangChain agents |

> **Cat 3** (AI SDK imports in code) and **Cat 4** (Desktop AI apps) deferred to future phases.

---

# Our Detection Scope

We focus on **3 high-impact detections** — one per priority category:

| Category | Target | Detection Method |
|---|---|---|
| 🔴 **Cat 1** | **Ollama** | Process scan + port check (`11434`) |
| 🔴 **Cat 2** | **Cursor** | Directory scan (`~/.cursor`) |
| 🔴 **Cat 5** | **MCP Servers** | Config file scan (`.mcp.json`, `claude_desktop_config.json`) |

### Why These Three?
- Demonstrates **two detection methods**: process-based + file-based
- Easy to detect, hard to justify as "approved"
- Strongest "why should you care" story for demo

---

# Architecture Overview

```
┌─────────────────┐     HTTPS POST      ┌──────────────────┐
│  Agent (Linux)   │ ──────────────────▶ │                  │
└─────────────────┘                      │                  │
                                         │   Aggregator     │
┌─────────────────┐     HTTPS POST      │   Backend        │
│  Agent (macOS)   │ ──────────────────▶ │   (FastAPI +     │
└─────────────────┘                      │    SQLite)       │
                                         │                  │
┌─────────────────┐     HTTPS POST      │                  │
│  Agent (Windows) │ ──────────────────▶ │                  │
└─────────────────┘                      └──────┬───────────┘
                                                │
                                           ┌────▼────┐
                                           │Dashboard│
                                           │  (Web)  │
                                           └─────────┘
```

---

# Agent Design: One Script Per OS

Each team member writes **one Python script** for their own OS.

```
agents/
├── agent_linux.py
├── agent_macos.py
└── agent_windows.py
```

| Detection | Linux | macOS | Windows |
|---|---|---|---|
| **Ollama process** | `psutil` | `psutil` | `psutil` |
| **Ollama port 11434** | `psutil.net_connections()` | Same | Same (may need admin) |
| **Cursor config dir** | `~/.cursor` | `~/.cursor` | `%APPDATA%\Cursor` |
| **MCP config files** | `~/.mcp.json` | `~/.mcp.json` | `%USERPROFILE%\.mcp.json` |

> **Key insight:** `psutil` is cross-platform. Only **file paths** differ per OS.

---

# Why Python Over Shell Scripts?

| Criteria | `.sh` (Bash) | `.py` (Python) |
|---|---|---|
| Linux | ✅ Native | ✅ `psutil` works |
| macOS | ✅ Native | ✅ `psutil` works |
| **Windows** | ❌ Needs WSL/Git Bash | ✅ Native |
| JSON handling | ❌ Needs `jq` | ✅ Built-in |
| Port scanning | ❌ `ss`/`netstat` varies | ✅ `psutil` consistent |
| HTTP POST | ⚠️ `curl` varies | ✅ `requests` library |

### Verdict
Shell scripts would require **3 completely different languages** (bash, PowerShell). Python gives us **90% code reuse** across OS variants.

---

# Detection Logic: Ollama (Cat 1)

```python
import psutil

OLLAMA_PORTS = [11434]

def detect_ollama():
    findings = []
    # Check running processes
    for proc in psutil.process_iter(['name', 'pid']):
        if 'ollama' in proc.info['name'].lower():
            findings.append({
                "category": "local_llm",
                "name": "ollama",
                "severity": "high",
                "evidence": f"Process running: {proc.info['name']} (PID {proc.info['pid']})"
            })
    # Check listening ports
    for conn in psutil.net_connections():
        if hasattr(conn, 'laddr') and conn.laddr.port in OLLAMA_PORTS:
            findings.append({
                "category": "local_llm",
                "name": "ollama",
                "severity": "high",
                "evidence": f"Port {conn.laddr.port} open (PID {conn.pid})"
            })
    return findings
```

---

# Detection Logic: Cursor (Cat 2)

```python
import os
import platform

def get_cursor_dirs():
    if platform.system() == "Windows":
        return [os.path.join(os.environ['APPDATA'], 'Cursor')]
    elif platform.system() == "Darwin":
        return [os.path.expanduser('~/.cursor')]
    else:  # Linux
        return [os.path.expanduser('~/.cursor')]

def detect_cursor():
    findings = []
    for cursor_dir in get_cursor_dirs():
        if os.path.exists(cursor_dir):
            findings.append({
                "category": "ai_ide",
                "name": "cursor",
                "severity": "medium",
                "evidence": f"Cursor config found: {cursor_dir}"
            })
    return findings
```

---

# Detection Logic: MCP Servers (Cat 5)

```python
import os
import platform

def get_mcp_config_paths():
    if platform.system() == "Windows":
        home = os.environ['USERPROFILE']
        appdata = os.environ['APPDATA']
    else:
        home = os.path.expanduser('~')
        appdata = os.path.join(home, '.config')

    return [
        os.path.join(home, '.mcp.json'),
        os.path.join(appdata, 'claude', 'claude_desktop_config.json'),
        os.path.join(home, '.cursor', 'mcp.json'),
    ]

def detect_mcp():
    findings = []
    for config_path in get_mcp_config_paths():
        if os.path.exists(config_path):
            findings.append({
                "category": "mcp_server",
                "name": "mcp_config",
                "severity": "high",
                "evidence": f"MCP config found: {config_path}"
            })
    return findings
```

---

# Shared Payload Schema

All agents output the **same JSON format**, regardless of OS:

```json
{
    "hostname": "dev-machine-01",
    "os": "linux",
    "agent_version": "0.1",
    "timestamp": "2025-07-05T14:30:00Z",
    "findings": [
        {
            "category": "local_llm",
            "name": "ollama",
            "severity": "high",
            "evidence": "Port 11434 open (PID 12345)"
        },
        {
            "category": "ai_ide",
            "name": "cursor",
            "severity": "medium",
            "evidence": "Cursor config found: /home/user/.cursor"
        }
    ]
}
```

> The backend doesn't care which OS sent the data — it just ingests JSON.

---

# Future Enhancement: Blocklist Config

Enterprises can customize what to detect via a config file:

```json
{
    "blocked_processes": ["ollama", "llama-server", "lm-studio"],
    "blocked_ports": [11434, 8080],
    "blocked_directories": ["~/.cursor", "~/.lmstudio"],
    "blocked_imports": ["openai", "langchain", "anthropic"],
    "blocked_mcp_configs": [".mcp.json", "claude_desktop_config.json"]
}
```

This turns ARGUS from a simple scanner into a **policy engine** — different organizations can define what counts as "shadow" vs. "approved."

---

# Backend & Dashboard

| Component | Tech Choice | Purpose |
|---|---|---|
| **API Server** | FastAPI | Receive agent payloads, serve dashboard data |
| **Database** | SQLite (WAL mode) | Store endpoint states, findings, timestamps |
| **Dashboard** | HTML + TailwindCSS + vanilla JS | Real-time table of all scanned endpoints |
| **Alerting** | Discord / Slack webhooks | Push alerts on high-risk findings |

### Alert Flow
```
Agent POST → Backend API → SQLite → High-risk flag?
                                    ├── Yes → Discord/Slack webhook
                                    └── No  → Log & store
```

---

# Definition of Done

- [ ] **Agent Scanning:** Each agent detects Ollama, Cursor, and MCP configs
- [ ] **Data Transmission:** JSON payload sent via HTTPS without timeout
- [ ] **Backend Ingestion:** API receives, authenticates, and stores data
- [ ] **Dashboard:** Live table showing 3+ remote machines and their findings
- [ ] **Alerting:** Discord/Slack webhook fires on high-risk findings

---

# Team Workflow

| Team Member | OS | Script | Focus |
|---|---|---|---|
| Member 1 | **Linux** | `agent_linux.py` | Test on Linux workstation |
| Member 2 | **macOS** | `agent_macos.py` | Test on Mac development machine |
| Member 3 | **Windows** | `agent_windows.py` | Test on Windows dev machine |

### How It Works
1. Each person writes and tests their own agent independently
2. All agents send data to the **shared central backend**
3. Dashboard shows findings from all 3 machines
4. Compare results across OS to validate detection consistency

---

<!-- _class: lead -->

# Summary

| What | Status |
|---|---|
| **Problem** | Shadow AI is ungoverned and undetected |
| **Solution** | ARGUS — decentralized endpoint scanner |
| **Detections** | Ollama (Cat 1), Cursor (Cat 2), MCP (Cat 5) |
| **Tech** | Python + psutil + FastAPI + SQLite |
| **Strategy** | 1 script per OS, same payload schema |
| **Next Step** | Build the 3 agent scripts |

---

<!-- _class: lead -->

# Thank You

**Project ARGUS** — AI Risk & Governance Unauthorized-endpoint Scanner

Questions?
