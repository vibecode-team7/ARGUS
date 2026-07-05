# Project ARGUS

**AI Risk & Governance Unauthorized-endpoint Scanner**

A decentralized security framework to discover, track, and alert on **Shadow AI** across enterprise endpoints.

---

## What is Shadow AI?

**Shadow AI** is any AI tool, model, or service used within an organization **without explicit approval from IT/security governance.** It's the AI equivalent of Shadow IT — unauthorized, untracked, and ungoverned.

---

## Why ARGUS?

- **Solves a Modern Threat:** Shadow AI is one of the most critical attack surfaces in cybersecurity today.
- **Demonstrates Full-Stack Security Engineering:** Decentralized client-server architecture, telemetry aggregation, and a unified threat dashboard.
- **Perfect for Distributed Teams:** Agents report back to a central Cloud VPS, so group members in different locations can test effortlessly.
- **Highly Actionable:** Translates raw endpoint data into real-time security alerts.

---

## Architecture

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

## Detection Scope

Each agent detects **3 Shadow AI signatures**:

| Category | Target | Detection Method |
|---|---|---|
| **Cat 1** — Local LLM | Ollama | Process scan + port check (`11434`) |
| **Cat 2** — AI IDE | Cursor | Directory scan (`~/.cursor`) |
| **Cat 5** — MCP Servers | MCP Configs | Config file scan (`.mcp.json`, `claude_desktop_config.json`) |

---

## Project Structure

```
ARGUS/
├── agents/
│   ├── agent_linux.py      # Linux endpoint agent
│   ├── agent_macos.py      # macOS endpoint agent
│   └── agent_windows.py    # Windows endpoint agent
├── backend/
│   ├── main.py             # FastAPI server
│   ├── database.py         # SQLite models
│   └── requirements.txt    # Backend dependencies
├── dashboard/
│   ├── index.html          # Web dashboard
│   ├── style.css           # TailwindCSS styles
│   └── app.js              # Dashboard logic
├── config/
│   └── blocklist.json      # Configurable detection targets
├── presentation.md         # Marp presentation slides
├── KiZINnO.md              # Project proposal
└── README.md               # This file
```

---

## Prerequisites

### All Agents
- Python 3.9+
- `pip install psutil requests`

### Backend
- Python 3.9+
- `pip install fastapi uvicorn`
- A Cloud VPS (DigitalOcean, AWS EC2, etc.)

### Dashboard
- Modern web browser
- No build step required (vanilla HTML/JS/CSS)

---

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/ARGUS.git
cd ARGUS
```

### 2. Install Agent Dependencies

```bash
pip install psutil requests
```

### 3. Configure the Backend URL

Edit the agent script for your OS and set the backend endpoint:

```python
AGGREGATOR_URL = "https://your-vps-ip/api/scan"
```

### 4. Run the Agent

**Linux:**
```bash
python agents/agent_linux.py
```

**macOS:**
```bash
python agents/agent_macos.py
```

**Windows:**
```bash
python agents\agent_windows.py
```

### 5. Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 6. Open the Dashboard

Open `dashboard/index.html` in your browser, or serve it:

```bash
cd dashboard
python -m http.server 3000
```

Navigate to `http://localhost:3000`

---

## Payload Schema

All agents send the same JSON format to the backend:

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

---

## Blocklist Configuration

Customize what to detect via `config/blocklist.json`:

```json
{
    "blocked_processes": ["ollama", "llama-server", "lm-studio"],
    "blocked_ports": [11434, 8080],
    "blocked_directories": ["~/.cursor", "~/.lmstudio"],
    "blocked_imports": ["openai", "langchain", "anthropic"],
    "blocked_mcp_configs": [".mcp.json", "claude_desktop_config.json"]
}
```

---

## Alerting

When the backend receives a **high-risk** finding, it pushes an alert via webhook:

- **Discord:** Configure `DISCORD_WEBHOOK_URL` in the backend
- **Slack:** Configure `SLACK_WEBHOOK_URL` in the backend

### Alert Format

```markdown
🔴 **ARGUS Alert — High Risk**

**Host:** dev-machine-01
**OS:** linux
**Finding:** MCP config detected
**Evidence:** /home/user/.mcp.json
**Time:** 2025-07-05 14:30:00 UTC
```

---

## Tech Stack

| Component | Technology |
|---|---|
| **Agent** | Python, psutil, requests |
| **Backend** | FastAPI, SQLite, Uvicorn |
| **Dashboard** | HTML, TailwindCSS, Vanilla JS |
| **Alerting** | Discord/Slack Webhooks |

---

## Definition of Done

- [ ] Agent detects Ollama, Cursor, and MCP configs on Linux, macOS, and Windows
- [ ] JSON payload transmits via HTTPS without timeout
- [ ] Backend receives, authenticates, and stores data in SQLite
- [ ] Dashboard displays live findings from 3+ remote machines
- [ ] Discord/Slack webhook fires on high-risk findings

---

## Team

| Member | OS | Script |
|---|---|---|
| Member 1 | Linux | `agent_linux.py` |
| Member 2 | macOS | `agent_macos.py` |
| Member 3 | Windows | `agent_windows.py` |

Each team member writes and tests their own agent independently. All agents send data to the shared central backend.

---

## Future Enhancements

- Expand detections to more Local LLM tools (llama.cpp, LM Studio, vLLM)
- Add AI coding agent detection (Copilot, Codeium, Continue)
- Implement allowlist for approved AI tools
- Add authentication (API keys per agent)
- Containerize the backend with Docker
- Add historical trend analysis to the dashboard

---

## License

MIT
