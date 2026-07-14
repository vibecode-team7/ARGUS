# Project ARGUS

**A**I **R**isk & **G**overnance **U**nauthorized-endpoint **S**canner

A decentralized security framework to detect **Shadow AI** across enterprise endpoints. Lightweight agents scan for unauthorized AI tools and report findings to a central backend.

---

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │         Nginx Proxy Manager (NPM)       │
                    │         Port 443 (HTTPS)                │
                    │         Let's Encrypt SSL               │
Agent (Linux) ─────┤         argus.duckdns.org               │
  POST /api/scan    │                                         │
                    │  ┌──────────────┐   ┌──────────────┐   │
Agent (macOS) ─────┤  │ Frontend     │   │ Backend      │   │
  POST /api/scan    │  │ React + Vite │   │ FastAPI      │   │
                    │  │ Port 80      │──▶│ Port 8000    │───┼──▶ Discord / Slack
Agent (Windows) ───┤  │ (nginx)      │   │ (internal)   │   │    Webhook Alerts
  POST /api/scan    │  └──────────────┘   └──────────────┘   │    (high severity)
                    │         ▲                    │          │
                    │         │ GET /api/*         │          │
                    │         └────────────────────┘          │
                    └─────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │          SQLite DB            │
                    │     argus-data volume         │
                    └───────────────────────────────┘
```

---

## Team

| Member | GitHub | Role |
|--------|--------|------|
| KiZINnO | @KiZINnO | Backend, CI/CD, DevOps |
| Thuyein | @Thuyein-Thet | Frontend, Agents |
| Oliver | @oliverhenry-dev | Frontend |
| Wint | @Wint-Theingi-Aung | Agents |
| Ko Htun | @kohtun386 | Agents |

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
|--------|------|------|-------------|
| `GET` | `/health` | None | Health check |
| `POST` | `/api/scan` | `X-API-Key` (write) | Ingest agent payload |
| `GET` | `/api/findings` | `X-API-Key` (read) | All scans (supports `?hostname=&severity=&limit=&offset=`) |
| `GET` | `/api/findings/{id}` | `X-API-Key` (read) | Single scan detail |
| `GET` | `/api/hosts` | `X-API-Key` (read) | Unique hosts with latest scan + risk summary |
| `GET` | `/api/stats` | `X-API-Key` (read) | Summary counts for dashboard |
| `GET` | `/api/trends` | `X-API-Key` (read) | Findings over time (supports `?days=`) |

---

## Local Development

### Backend

```bash
cd backend
python3 -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
python seed.py
python test_data.py

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev    # Starts on http://localhost:5173
```

### Test Endpoints

```bash
# Health check
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

---

## Docker Deployment

### Local Build (single arch)

```bash
# Backend
cd backend
docker build -t argus-backend:latest .
docker run -d -p 8000:8000 \
  -v argus-data:/app/data \
  --restart unless-stopped \
  argus-backend:latest

# Frontend
cd frontend
docker build -t argus-frontend:latest .
docker run -d -p 80:80 --restart unless-stopped argus-frontend:latest
```

### Multi-Arch Build (for VPS with arm64)

```bash
cd backend
docker buildx create --name multiarch --use
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <dockerhub-user>/argus-backend:latest \
  --push .
```

### Docker Compose (recommended)

```bash
# Backend
cd backend
docker compose up -d
docker compose logs -f backend
docker compose down

# First-time setup
docker compose exec backend python seed.py
```

### VPS Setup

```bash
# 1. Create .env on VPS
mkdir -p ~/argus-config
# Edit ~/argus-config/.env with production keys

# 2. Pull and run
docker pull <dockerhub-user>/argus-backend:latest
docker run -d \
  -p 127.0.0.1:8000:8000 \
  -v argus-data:/app/data \
  -v ~/argus-config/.env:/app/.env:ro \
  --restart unless-stopped \
  <dockerhub-user>/argus-backend:latest

# 3. Seed API keys
docker exec <container-id> python seed.py
```

### HTTPS/SSL with Nginx Proxy Manager

```bash
# 1. Set up DuckDNS domain (argus.duckdns.org → VPS IP)

# 2. In NPM web UI (http://vps-ip:81):
#    - Add Proxy Host
#    - Domain: argus.duckdns.org
#    - Forward to: frontend:80
#    - Enable SSL → Let's Encrypt

# 3. Update agent BACKEND_URL
export ARGUS_BACKEND_URL="https://argus.duckdns.org"

# 4. Update frontend .env
VITE_API_URL=https://argus.duckdns.org
```

---

## API Keys Reference

| Env Variable | Role | Used by |
|--------------|------|---------|
| `ARGUS_KEY_TEST` | write | Local dev / curl |
| `ARGUS_KEY_LINUX` | write | Linux agent |
| `ARGUS_KEY_MACOS` | write | macOS agent |
| `ARGUS_KEY_WINDOWS` | write | Windows agent |
| `ARGUS_KEY_DASHBOARD` | read | Dashboard JS |
| `DISCORD_WEBHOOK_URL` | — | Discord alerts (optional) |
| `SLACK_WEBHOOK_URL` | — | Slack alerts (optional) |
| `CORS_ORIGINS` | — | CORS allowed origins (optional) |
| `ARGUS_DB_DIR` | — | Override DB directory (optional) |

---

## Detection Scope

| Category | Target | Detection Method |
|----------|--------|------------------|
| **Cat 1** — Local LLM | Ollama | Process scan + port check (`11434`) |
| **Cat 2** — AI IDE | Cursor | Directory scan (`~/.cursor` / `%APPDATA%\Cursor`) |
| **Cat 5** — MCP Servers | MCP Configs | Config file scan (`.mcp.json`, `claude_desktop_config.json`) |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Agents** | Python, `psutil`, `requests` |
| **Backend** | FastAPI, SQLAlchemy, SQLite, Uvicorn |
| **Frontend** | React 19, Vite 8, TailwindCSS 4 |
| **Alerting** | Discord / Slack webhooks |
| **Deployment** | Docker, Docker Compose, Nginx Proxy Manager |
| **CI/CD** | GitHub Actions, Semgrep, Trivy, Dependabot |
| **SSL** | Let's Encrypt (via NPM) |

---

## CI/CD

Workflows run on push to `main` and on pull requests:

| Workflow | Purpose |
|----------|---------|
| `ci.yml` | Lint, test, Docker build |
| `security.yml` | Semgrep SAST, Trivy container scan, Gitleaks secrets scan |
| `dependabot.yml` | Auto-update dependencies (pip, npm, Docker, GitHub Actions) |

### Branch Protection

- `ci` check must pass before merge
- `security` check is advisory (enforce later)
- CODEOWNERS auto-assigns reviewers

---

## Alerting

When high-severity findings are detected, ARGUS sends alerts to Discord/Slack:

```
Agent → POST /api/scan → Backend → send_high_risk_alert()
                                       ↓
                              Discord / Slack webhook
```

Configure in `.env`:
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## Docs Index

| Doc | Description |
|-----|-------------|
| [`docs/payload-schema.json`](docs/payload-schema.json) | Formal JSON Schema for agent payloads |
| [`docs/example-payload.json`](docs/example-payload.json) | Example payload with all 3 findings |
| [`docs/backend-plan.md`](docs/backend-plan.md) | Backend architecture, DB schema, testing guide |
| [`docs/deployment-guide.md`](docs/deployment-guide.md) | Multi-arch Docker build, VPS deploy |
| [`docs/architecture.md`](docs/architecture.md) | Mermaid diagrams, system design |
| [`backend/README.md`](backend/README.md) | Backend-specific setup and API reference |

---

*Last updated: July 2025*
