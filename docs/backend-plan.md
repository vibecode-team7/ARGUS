# Backend Plan

## Stack

- **Framework:** FastAPI
- **ORM:** SQLAlchemy
- **Database:** SQLite (WAL mode)
- **Server:** Uvicorn

## File Structure

```
backend/
├── main.py              # FastAPI app, routes, middleware
├── database.py          # SQLAlchemy models + engine + session + auto-migration
├── auth.py              # API key hashing + verification
├── alerting.py          # Discord/Slack webhook alerts
├── seed.py              # One-time script to seed API keys
├── test_data.py         # Script to seed test scan data
├── requirements.txt     # Dependencies
├── Dockerfile           # Container build
├── docker-compose.yml   # Docker Compose config
├── .env                 # API keys (gitignored, never committed)
├── .env.example         # Template for .env (committed)
├── .dockerignore        # Excludes .env from Docker build context
└── README.md            # Backend-specific docs
```

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|---|
| `GET` | `/health` | None | Health check |
| `POST` | `/api/scan` | `X-API-Key` (write) | Ingest agent payload |
| `GET` | `/api/findings` | `X-API-Key` (read) | All scans with nested findings (supports `?hostname=&severity=&limit=&offset=`) |
| `GET` | `/api/findings/{id}` | `X-API-Key` (read) | Single scan detail |
| `GET` | `/api/hosts` | `X-API-Key` (read) | Unique hosts with latest scan + risk summary |
| `GET` | `/api/stats` | `X-API-Key` (read) | Summary counts for dashboard |
| `GET` | `/api/trends` | `X-API-Key` (read) | Findings over time (supports `?days=`) |

## Database Schema

### `api_keys`
| Column | Type | Notes |
|---|---|---|
| id | int PK | auto |
| key_hash | str | SHA-256 hash |
| name | str | e.g. "linux-agent" |
| role | str | "write" (agents) or "read" (dashboard) |
| is_active | bool | toggle |
| created_at | datetime | |

### `scans`
| Column | Type | Notes |
|---|---|---|
| id | int PK | auto |
| hostname | str | |
| os | str | |
| os_version | str | |
| kernel | str | nullable |
| agent_version | str | |
| scanned_at | datetime | from payload |
| uptime_seconds | int | nullable |
| ip_address | str | nullable |
| api_key_id | int FK | → api_keys.id |
| received_at | datetime | server timestamp |

### `findings`
| Column | Type | Notes |
|---|---|---|
| id | int PK | auto |
| scan_id | int FK | → scans.id |
| category | str | local_llm / ai_ide / mcp_server |
| name | str | |
| severity | str | high / medium / low |
| status | str | detected / not_detected |
| evidence | str | |
| pid | int | nullable |
| port | int | nullable |
| path | str | nullable |
| user | str | nullable |
| detected_at | datetime | |

## API Key Auth Flow

Two roles: **write** (agents) and **read** (dashboard).

| Env Variable | Role | Used by |
|---|---|---|
| `ARGUS_KEY_TEST` | write | Local dev / curl |
| `ARGUS_KEY_LINUX` | write | Linux agent |
| `ARGUS_KEY_MACOS` | write | macOS agent |
| `ARGUS_KEY_WINDOWS` | write | Windows agent |
| `ARGUS_KEY_DASHBOARD` | read | Dashboard JS |

### Other Environment Variables

| Env Variable | Purpose | Example |
|---|---|---|
| `DISCORD_WEBHOOK_URL` | Discord alert webhook | `https://discord.com/api/webhooks/...` |
| `SLACK_WEBHOOK_URL` | Slack alert webhook | `https://hooks.slack.com/services/...` |
| `CORS_ORIGINS` | CORS allowed origins | `http://localhost:5173` |
| `ARGUS_DB_DIR` | Override DB directory | `/custom/path` |

1. Client sends `X-API-Key: <plaintext>` in header
2. Backend SHA-256 hashes the incoming key
3. Looks up hash + role match in `api_keys` table
4. `POST /api/scan` requires `role == "write"`
5. All `GET /api/*` endpoints require `role == "read"`
6. If not found or role mismatch → `401 Unauthorized`
7. If high-severity findings detected → Discord/Slack alert

## Testing Without Agents

**API keys are read from environment variables.** Copy the example file and customize:

```bash
# From repo root
cd backend
cp .env.example .env   # create your local .env
```

The `.env` file is gitignored — it will never be committed to GitHub.

### 1. First time setup

```bash
# Create venv (one time)
python3 -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt

# Seed API keys (reads from .env)
python seed.py

# Seed test scan data (5 hosts with findings)
python test_data.py
```

### 2. Start server

```bash
# From backend/ directory
source ../venv/bin/activate
uvicorn main:app --reload --port 8000
```

Server runs at `http://localhost:8000`. The `--reload` flag auto-restarts on code changes.

### 3. Stop server

Press **`Ctrl + C`** in the terminal where uvicorn is running.

If it was started in the background and you need to find + kill it:

```bash
# Find the process
ps aux | grep uvicorn

# Kill it
kill <PID>

# Or kill all uvicorn processes at once
pkill -f "uvicorn main:app"
```

### 4. Restart

```bash
# Always activate venv first
source ../venv/bin/activate

# Delete old data (optional — starts fresh)
rm -rf data/

# Seed again (only needed if you deleted data/)
python seed.py
python test_data.py

# Start server
uvicorn main:app --reload --port 8000
```

### 5. Test endpoints

Open a new terminal (keep server running in the first one):

```bash
# Health check (no auth)
curl http://localhost:8000/health

# Send a scan payload (requires write key)
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-write-key>" \
  -d @../docs/example-payload.json

# Test auth failure — wrong key on POST
curl -s -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong_key" \
  -d @../docs/example-payload.json

# Test auth failure — write key on GET (should 401)
curl -H "X-API-Key: <your-write-key>" http://localhost:8000/api/stats

# View all findings (requires read key)
curl -H "X-API-Key: <your-read-key>" http://localhost:8000/api/findings

# With filters
curl -H "X-API-Key: <your-read-key>" \
  "http://localhost:8000/api/findings?severity=high&limit=3"

# Single scan detail
curl -H "X-API-Key: <your-read-key>" http://localhost:8000/api/findings/1

# Host list (deduped)
curl -H "X-API-Key: <your-read-key>" http://localhost:8000/api/hosts

# Dashboard stats
curl -H "X-API-Key: <your-read-key>" http://localhost:8000/api/stats
```

### 6. Full reset (clean slate)

```bash
pkill -f "uvicorn main:app"
rm -rf backend/data/
source ../venv/bin/activate
python backend/seed.py
python backend/test_data.py
cd backend && uvicorn main:app --reload --port 8000
```

## Deployment

See full guide: [`docs/deployment-guide.md`](deployment-guide.md)

```bash
# Build multi-arch (amd64 + arm64) and push
cd backend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <your-dockerhub>/argus-backend:latest \
  --push \
  .

# On VPS: pull and run with docker-compose
docker pull <your-dockerhub>/argus-backend:latest
docker compose up -d
docker compose exec backend python seed.py

# View logs
docker compose logs -f backend

# Stop
docker compose down
```

## Auto-Migration

When schema changes (e.g., adding a new column), `database.py` automatically detects and applies missing columns at startup via `PRAGMA table_info()` + `ALTER TABLE`. This prevents "no such column" errors when pulling a new image with an existing database volume.

New migrations are defined in the `MIGRATIONS` list inside `database.py`.
