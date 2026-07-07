# Project ARGUS

**A**I **R**isk & **G**overnance **U**nauthorized-endpoint **S**canner

A decentralized security framework to detect **Shadow AI** across enterprise endpoints. Lightweight agents scan for unauthorized AI tools and report findings to a central backend.

---

## Architecture

```
┌─────────────────┐     POST /api/scan     ┌──────────────────────┐
│  Agent (Linux)   │ ─── X-API-Key ──────▶ │                      │
└─────────────────┘                        │   Backend (FastAPI)  │
                                           │   + SQLite           │
┌─────────────────┐     POST /api/scan     │                      │
│  Agent (macOS)   │ ─── X-API-Key ──────▶ │   VPS :8000          │
└─────────────────┘                        │                      │
                                           │                      │
┌─────────────────┐     POST /api/scan     │  ◀── GET /api/* ──── │
│  Agent (Windows) │ ─── X-API-Key ──────▶ │                      │
└─────────────────┘                        └──────────────────────┘
                                                    ▲
                                            ┌───────┴────────┐
                                            │  Dashboard (JS) │
                                            │  (separate       │
                                            │   container)     │
                                            └────────────────┘
```

---

## Team

| Member   | Role            | Deliverable                       |
| -------- | --------------- | --------------------------------- |
| Member 1 | Backend         | `backend/` — FastAPI + SQLite API |
| Member 2 | Agent (Linux)   | `agents/agent_linux.py`           |
| Member 3 | Agent (macOS)   | `agents/agent_macos.py`           |
| Member 4 | Agent (Windows) | `agents/agent_windows.py`         |
| Member 5 | Dashboard       | `dashboard/` — HTML/JS UI         |

---

## Payload Contract (Agent → Backend)

All agents send the same JSON format. See the full schema:

- **Schema**: [`docs/payload-schema.json`](docs/payload-schema.json)
- **Example**: [`docs/example-payload.json`](docs/example-payload.json)

### Quick Reference

```json
{
    "hostname": "dev-machine-01",
    "os": "linux",
    "os_version": "Ubuntu 22.04 LTS",
    "kernel": "6.2.0-26-generic",
    "agent_version": "0.1.0",
    "scanned_at": "2025-07-05T14:30:00Z",
    "uptime_seconds": 284000,
    "ip_address": "192.168.1.42",
    "findings": [
        {
            "category": "local_llm",
            "name": "ollama",
            "severity": "high",
            "status": "detected",
            "evidence": "Port 11434 open (PID 12345)",
            "pid": 12345,
            "port": 11434,
            "user": "john",
            "detected_at": "2025-07-05T14:29:55Z"
        }
    ]
}
```

All three agents (Linux, macOS, Windows) produce the **exact same schema**. Only file paths and OS-specific logic differ per script.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|---|
| `GET` | `/health` | None | Health check |
| `POST` | `/api/scan` | `X-API-Key` (write) | Ingest agent payload |
| `GET` | `/api/findings` | `X-API-Key` (read) | All scans (supports `?hostname=&severity=&limit=&offset=`) |
| `GET` | `/api/findings/{id}` | `X-API-Key` (read) | Single scan detail |
| `GET` | `/api/hosts` | `X-API-Key` (read) | Unique hosts with latest scan + risk summary |
| `GET` | `/api/stats` | `X-API-Key` (read) | Summary counts for dashboard |

---

## For Each Team Member — How to Test

### Agent Developers (Linux / macOS / Windows)

Your agent script must:
1. Scan the machine for Ollama, Cursor, and MCP configs
2. Build the JSON payload (see schema above)
3. POST it to the shared backend with an API key

```bash
# Example: your agent sends this request
curl -X POST http://<vps-ip>:8000/api/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-assigned-key>" \
  -d @your_scan_result.json

# Expected response (201 Created):
{"id": 42, "hostname": "my-machine", "findings_count": 2}
```

Your Python script should use the `requests` library:

```python
import requests

response = requests.post(
    "http://<vps-ip>:8000/api/scan",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "<your-assigned-key>",
    },
    json=payload,
)
print(response.status_code, response.json())
```

**API keys** — ask the backend lead to generate a **write** key for your agent. Keys are configured via `.env` file (see `backend/.env.example`), never hardcoded in source.

### Dashboard Developer

Your dashboard needs a **read** API key to call the backend. Add `X-API-Key` header to all fetch calls:

```javascript
const headers = { "X-API-Key": "<your-read-key>" };

// Get stats for dashboard cards
const stats = await fetch("http://<vps-ip>:8000/api/stats", { headers }).then(r => r.json());

// Get all hosts with latest scan info
const hosts = await fetch("http://<vps-ip>:8000/api/hosts", { headers }).then(r => r.json());

// Get all findings (paginated)
const findings = await fetch("http://<vps-ip>:8000/api/findings?limit=50", { headers }).then(r => r.json());

// Get findings for a specific host
const hostFindings = await fetch("http://<vps-ip>:8000/api/findings?hostname=my-machine", { headers }).then(r => r.json());
```

CORS is enabled on the backend — your dashboard can call it from any domain during development.

**Lock down CORS in production** — update `allow_origins` in `backend/main.py` to your actual frontend URL.

### Backend Developer (Local Testing)

```bash
# 1. Setup
cd backend
python3 -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt

# 2. Configure API keys (copy example, then edit if needed)
cp .env.example .env

# 3. Seed API keys + test data
python seed.py
python test_data.py

# 4. Start server
uvicorn main:app --reload --port 8000

# 5. Test endpoints (new terminal)
curl http://localhost:8000/health

# Send a scan (uses write key)
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-write-key>" \
  -d @../docs/example-payload.json

# View data (uses read key)
curl -H "X-API-Key: <your-read-key>" http://localhost:8000/api/findings
curl -H "X-API-Key: <your-read-key>" http://localhost:8000/api/stats
curl -H "X-API-Key: <your-read-key>" http://localhost:8000/api/hosts
```

### API Keys Reference

Keys are stored in `backend/.env` (gitignored) and read at runtime by `seed.py`:

| Env Variable | Role | Used by |
|---|---|---|
| `ARGUS_KEY_TEST` | write | Local dev / curl |
| `ARGUS_KEY_LINUX` | write | Linux agent |
| `ARGUS_KEY_MACOS` | write | macOS agent |
| `ARGUS_KEY_WINDOWS` | write | Windows agent |
| `ARGUS_KEY_DASHBOARD` | read | Dashboard JS |

### Stop / Restart

```bash
# Stop
pkill -f "uvicorn main:app"

# Full reset
rm -rf backend/data/
cp backend/.env.example backend/.env
python backend/seed.py
python backend/test_data.py
cd backend && uvicorn main:app --reload --port 8000
```

---

## Deployment (Backend Lead)

See full guide: [`docs/deployment-guide.md`](docs/deployment-guide.md)

### Quick Deploy

```bash
# Local: build multi-arch (amd64 + arm64) and push to Docker Hub
cd backend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <your-dockerhub>/argus-backend:latest \
  --push \
  .

# VPS: create .env file with real keys
mkdir -p ~/argus-config
# Edit ~/argus-config/.env with your production keys

# Pull and run (mount .env read-only)
docker pull <your-dockerhub>/argus-backend:latest
docker run -d \
  -p 8000:8000 \
  -v argus-data:/app/data \
  -v ~/argus-config/.env:/app/.env:ro \
  --restart unless-stopped \
  <your-dockerhub>/argus-backend:latest

# First-time: seed keys inside container
docker exec <container-id> python seed.py
```

---

## Detection Scope

| Category                | Target      | Detection Method                                             |
| ----------------------- | ----------- | ------------------------------------------------------------ |
| **Cat 1** — Local LLM   | Ollama      | Process scan + port check (`11434`)                          |
| **Cat 2** — AI IDE      | Cursor      | Directory scan (`~/.cursor` / `%APPDATA%\Cursor`)            |
| **Cat 5** — MCP Servers | MCP Configs | Config file scan (`.mcp.json`, `claude_desktop_config.json`) |

---

## Tech Stack

| Component | Technology |
|---|---|---|
| **Agents** | Python, `psutil`, `requests` |
| **Backend** | FastAPI, SQLAlchemy, SQLite, Uvicorn |
| **Dashboard** | HTML, TailwindCSS, Vanilla JS |
| **Alerting** | Discord / Slack webhooks (planned) |
| **Deployment** | Docker, Docker Hub, BuildX (multi-arch) |

---

## Docs Index

| Doc                                                      | Description                                      |
| -------------------------------------------------------- | ------------------------------------------------ |
| [`docs/payload-schema.json`](docs/payload-schema.json)   | Formal JSON Schema for agent payloads            |
| [`docs/example-payload.json`](docs/example-payload.json) | Example payload with all 3 findings              |
| [`docs/backend-plan.md`](docs/backend-plan.md)           | Backend architecture, DB schema, testing guide   |
| [`docs/deployment-guide.md`](docs/deployment-guide.md)   | Multi-arch Docker build, VPS deploy, CORS config |
