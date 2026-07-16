# ARGUS Backend

FastAPI backend that ingests Shadow AI scan reports from endpoint agents and stores findings in SQLite.

---

## Tech Stack

| Component | Technology |
|---|---|
| Framework | FastAPI + Uvicorn |
| ORM | SQLAlchemy (DeclarativeBase) |
| Database | SQLite (WAL mode) |
| Auth | SHA-256 hashed API keys |
| Alerting | Discord / Slack webhooks |
| Container | Docker (Python 3.12-slim) |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Health check |
| `POST` | `/api/scan` | write | Ingest agent scan payload |
| `GET` | `/api/findings` | read | List scans (filterable, paginated) |
| `GET` | `/api/findings/{id}` | read | Single scan detail |
| `GET` | `/api/hosts` | read | Unique hosts + severity summary |
| `GET` | `/api/stats` | read | Aggregate counts |
| `GET` | `/api/trends` | read | Findings/new hosts over time |

### Query Parameters (`GET /api/findings`)

| Param | Type | Default | Description |
|---|---|---|---|
| `hostname` | str | None | Filter by exact hostname |
| `severity` | str | None | Filter by severity level |
| `limit` | int | 50 | Max results (1–200) |
| `offset` | int | 0 | Pagination offset |

---

## Local Development

### Prerequisites

- Python 3.12+
- `venv` module

### Setup

```bash
# From project root
cd backend

# Create virtualenv (one time)
python3 -m venv ../venv
source ../venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure API keys
cp .env.example .env
# Edit .env with your actual keys (see "API Keys" below)

# Seed API keys into database
python seed.py

# Seed sample scan data (optional, for dev)
python test_data.py
```

### Run

```bash
# From backend/
source ../venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Test

```bash
# Health check (no auth)
curl http://localhost:8000/health

# Send a scan (write key)
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-write-key>" \
  -d @../docs/example-payload.json

# View stats (read key)
curl -H "X-API-Key: <your-read-key>" http://localhost:8000/api/stats

# View all findings
curl -H "X-API-Key: <your-read-key>" http://localhost:8000/api/findings

# View hosts
curl -H "X-API-Key: <your-read-key>" http://localhost:8000/api/hosts
```

---

## API Keys

Keys are defined in `backend/.env` and seeded into the database via `python seed.py`.

| Env Variable | Role | Used By |
|---|---|---|
| `ARGUS_KEY_TEST` | write | Local dev / curl |
| `ARGUS_KEY_LINUX` | write | Linux agent |
| `ARGUS_KEY_MACOS` | write | macOS agent |
| `ARGUS_KEY_WINDOWS` | write | Windows agent |
| `ARGUS_KEY_DASHBOARD` | read | Dashboard JS |

**Webhook keys (optional):**

| Env Variable | Purpose |
|---|---|
| `DISCORD_WEBHOOK_URL` | Alert high-severity findings to Discord |
| `SLACK_WEBHOOK_URL` | Alert high-severity findings to Slack |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ARGUS_KEY_TEST` | Yes | — | Write API key for local dev |
| `ARGUS_KEY_LINUX` | Yes | — | Write API key for Linux agent |
| `ARGUS_KEY_MACOS` | Yes | — | Write API key for macOS agent |
| `ARGUS_KEY_WINDOWS` | Yes | — | Write API key for Windows agent |
| `ARGUS_KEY_DASHBOARD` | Yes | — | Read API key for dashboard |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Comma-separated allowed origins. Add `http://localhost` if running frontend container on port 80 |
| `DISCORD_WEBHOOK_URL` | No | — | Discord webhook for alerts |
| `SLACK_WEBHOOK_URL` | No | — | Slack webhook for alerts |
| `ARGUS_DB_DIR` | No | `backend/data/` | Override SQLite database directory |

---

## Database

SQLite database stored at `backend/data/argus.db` (created automatically on first run).

### Tables

**`api_keys`** — API key storage with role-based access
```
id, key_hash (SHA-256), name, role ("read"|"write"), is_active, created_at
```

**`scans`** — Agent scan submissions
```
id, hostname, os, os_version, kernel, agent_version, scanned_at,
uptime_seconds, ip_address, api_key_id FK, received_at
```

**`findings`** — Individual detection results per scan
```
id, scan_id FK, category, name, severity, status, evidence,
pid, port, path, user, detected_at
```

### Auto-Migration

New columns are added automatically at startup via `PRAGMA table_info()` + `ALTER TABLE`. Append new migrations to the `MIGRATIONS` list in `database.py`.

### Reset

```bash
# Local (no Docker): delete database file
rm -rf backend/data/
python backend/seed.py
python backend/test_data.py

# Docker (local): delete volume and re-seed
docker stop argus-backend && docker rm argus-backend
docker volume rm argus-data
docker run -d -p 8000:8000 \
  -v argus-data:/app/data \
  -v $(pwd)/.env:/app/.env:ro \
  --name argus-backend \
  argus-backend:latest
docker exec argus-backend python seed.py

# Docker (VPS): delete volume and re-seed
docker compose down -v
docker compose up -d
docker compose exec backend python seed.py
```

---

## Docker — Local Testing

### Build and Run Backend

```bash
cd backend

# Build image
docker build -t argus-backend:latest .

# Run container
docker run -d -p 8000:8000 \
  -v argus-data:/app/data \
  -v $(pwd)/.env:/app/.env:ro \
  --name argus-backend \
  argus-backend:latest

# Seed API keys (first time only)
docker exec argus-backend python seed.py
```

### Build and Run Frontend (with backend)

```bash
cd frontend

# Build image (points to local backend)
docker build \
  --build-arg VITE_API_URL=http://localhost:8000 \
  -t argus-frontend:latest .

# Run container
docker run -d -p 80:80 --name argus-frontend argus-frontend:latest
```

### CORS Configuration

The frontend container runs on port 80, which is a different origin from port 8000. Add both origins to `.env`:

```
CORS_ORIGINS=http://localhost,http://localhost:80,http://localhost:5173
```

Restart the backend after changing `.env`:

```bash
docker restart argus-backend
```

### Verify

```bash
# Backend health
curl http://localhost:8000/health

# Frontend
# Open http://localhost in browser → login with dashboard read key

# Backend logs
docker logs argus-backend

# Frontend logs
docker logs argus-frontend
```

### Stop and Clean Up

```bash
# Stop containers
docker stop argus-backend argus-frontend
docker rm argus-backend argus-frontend

# Remove volumes (deletes database)
docker volume rm argus-data
```

### Reset Database (Docker)

```bash
docker stop argus-backend && docker rm argus-backend
docker volume rm argus-data
docker run -d -p 8000:8000 \
  -v argus-data:/app/data \
  -v $(pwd)/.env:/app/.env:ro \
  --name argus-backend \
  argus-backend:latest
docker exec argus-backend python seed.py
docker exec argus-backend python test_data.py
```

---

## Docker — VPS Deployment

### Build and Push (from your local machine)

```bash
cd backend

# Build multi-arch image and push to Docker Hub
docker buildx create --name multiarch --use
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t kpzik/argus-backend:latest \
  --push .
```

### Prepare VPS

```bash
# SSH into VPS
ssh root@<vps-ip>

# Create config directory
mkdir -p ~/argus-config

# Create .env with production keys
cat > ~/argus-config/.env << 'EOF'
ARGUS_KEY_TEST=your_test_key_here
ARGUS_KEY_LINUX=your_linux_key_here
ARGUS_KEY_MACOS=your_macos_key_here
ARGUS_KEY_WINDOWS=your_windows_key_here
ARGUS_KEY_DASHBOARD=your_dashboard_key_here
CORS_ORIGINS=http://localhost,https://argus.duckdns.org
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
EOF
```

### Pull and Run (on VPS)

```bash
# Pull and start
cd ~/argus-backend
docker compose up -d

# Seed API keys (first time only)
docker compose exec backend python seed.py
```

### Verify (on VPS)

```bash
# Check container is running
docker compose ps

# View logs
docker compose logs -f backend

# Hit health endpoint
curl http://localhost:8000/health
```

### Update (on VPS)

```bash
cd ~/argus-backend

# Pull new image and recreate
docker compose pull
docker compose up -d

# Re-seed (if schema changed)
docker compose exec backend python seed.py
```

### Firewall

Ensure port 8000 is open (or only accessible from NPM):

```bash
sudo ufw allow 8000/tcp
sudo ufw reload
```

---

## Docker — VPS Deployment

### 1. Build and Push (from your local machine)

```bash
cd backend

# Build multi-arch image and push to Docker Hub
docker buildx create --name multiarch --use
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <your-dockerhub>/argus-backend:latest \
  --push .
```

### 2. Prepare VPS

```bash
# SSH into VPS
ssh root@<vps-ip>

# Create config directory
mkdir -p ~/argus-config

# Create .env with production keys
cat > ~/argus-config/.env << 'EOF'
ARGUS_KEY_TEST=your_test_key_here
ARGUS_KEY_LINUX=your_linux_key_here
ARGUS_KEY_MACOS=your_macos_key_here
ARGUS_KEY_WINDOWS=your_windows_key_here
ARGUS_KEY_DASHBOARD=your_dashboard_key_here
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
EOF
```

### 3. Pull and Run (on VPS)

Copy `docker-compose.yml` to VPS, then edit the image name:

```bash
# Copy compose file to VPS
scp docker-compose.yml root@<vps-ip>:~/argus-backend/

# SSH into VPS
ssh root@<vps-ip>
cd ~/argus-backend

# Edit image name in docker-compose.yml
sed -i 's|<your-dockerhub>|<your-actual-dockerhub>|g' docker-compose.yml

# Pull and start
docker compose up -d

# Seed API keys (first time only)
docker compose exec backend python seed.py
```

### 4. Verify

```bash
# Check container is running
docker compose ps

# View logs
docker compose logs -f backend

# Hit health endpoint
curl http://localhost:8000/health
```

### 5. Update (on VPS)

```bash
cd ~/argus-backend

# Pull new image
docker compose pull

# Stop, remove old container, and start new one
docker compose up -d

# Re-seed (if schema changed)
docker compose exec backend python seed.py
```

---

## Docker Compose Reference

The `docker-compose.yml` file (for VPS):

```yaml
services:
  backend:
    image: kpzik/argus-backend:latest
    container_name: argus-backend
    ports:
      - "8000:8000"
    volumes:
      - argus-data:/app/data
      - ~/argus-config/.env:/app/.env:ro
    restart: unless-stopped

volumes:
  argus-data:
```

### Common Commands

| Command | Description |
|---|---|
| `docker compose up -d` | Start container in background |
| `docker compose down` | Stop and remove container (volume preserved) |
| `docker compose down -v` | Stop, remove container AND volume (data deleted) |
| `docker compose pull` | Pull latest image |
| `docker compose up -d` | Recreate container with new image |
| `docker compose ps` | Check running status |
| `docker compose logs -f backend` | Tail logs |
| `docker compose exec backend python seed.py` | Run seed inside container |

---

## Docker — Architecture Reference

| File | Path in Container | Purpose |
|---|---|---|
| `main.py` | `/app/main.py` | FastAPI app, routes |
| `database.py` | `/app/database.py` | SQLAlchemy models, migrations |
| `auth.py` | `/app/auth.py` | API key verification |
| `alerting.py` | `/app/alerting.py` | Discord/Slack webhook alerts |
| `seed.py` | `/app/seed.py` | Seed API keys |
| `.env` | `/app/.env` | Environment variables (mounted read-only) |
| `data/argus.db` | `/app/data/argus.db` | SQLite database (Docker volume) |

---

## VPS Firewall

Ensure port 8000 is open:

```bash
# Ubuntu (ufw)
sudo ufw allow 8000/tcp
sudo ufw reload
```

---

## Troubleshooting

### "Invalid or inactive API key"
- Check you're using the actual key value, not the env variable name
- Verify the key is seeded: `docker exec argus-backend python seed.py`

### "attempt to write a readonly database" / "unable to open database file"
- The `appuser` in the Dockerfile can't write to the data directory
- Recreate the volume: `docker stop argus-backend && docker rm argus-backend && docker volume rm argus-data`
- Rebuild and run again (see "Build and Run Backend" above)

### CORS error in browser ("blocked by CORS policy")
- Add `http://localhost` (no port) to `CORS_ORIGINS` in `.env`:
  ```
  CORS_ORIGINS=http://localhost,http://localhost:80,http://localhost:5173
  ```
- Restart backend: `docker restart argus-backend`
- For VPS: add your domain, e.g. `CORS_ORIGINS=http://localhost,https://argus.duckdns.org`

### Frontend can't connect to backend
- Verify backend is running: `curl http://localhost:8000/health`
- Check CORS_ORIGINS includes the frontend origin (see above)
- Check backend logs: `docker logs argus-backend`

### Discord alerts not firing
- Check `DISCORD_WEBHOOK_URL` is set in `.env`
- Restart backend after adding the URL: `docker restart argus-backend`
- Check logs: `docker logs argus-backend`

### Database not persisting
- Check volume exists: `docker volume ls`
- Verify volume is mounted: `docker exec argus-backend ls /app/data`

### Container won't start
- Check logs: `docker logs argus-backend`
- Verify `.env` is mounted correctly: `docker exec argus-backend cat /app/.env`
- Ensure all required env vars are set (see Environment Variables table)
