# Deployment Guide

## Architecture

```
Browser/Agent ────→ NPM (port 443, SSL termination)
                     │
                     ├── /         → argus-frontend:80   (static files)
                     ├── /api/*    → argus-backend:8000  (FastAPI)
                     └── /health   → argus-backend:8000  (health check)
```

---

## Local Development (No Docker)

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

### Test

```bash
# Health check
curl http://localhost:8000/health

# Send a scan
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-write-key>" \
  -d @../docs/example-payload.json

# View data
curl -H "X-API-Key: <your-read-key>" http://localhost:8000/api/findings
```

---

## Local Testing (Docker)

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

The frontend runs on port 80, which is a different origin from port 8000. Add both origins to `backend/.env`:

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

# Frontend — open http://localhost in browser
# Login with dashboard read key from .env

# Logs
docker logs argus-backend
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

---

## Production Deployment (VPS)

### Prerequisites

- VPS with Docker installed
- Nginx Proxy Manager (NPM) running on port 81
- DuckDNS domain pointing to VPS IP
- Docker Hub account (`kpzik`)

### Step 1: Prepare .env on VPS

```bash
# SSH into VPS
ssh root@<vps-ip>

# Create config directory
mkdir -p ~/argus-config

# Create .env with production keys
cat > ~/argus-config/.env << 'EOF'
ARGUS_KEY_TEST=<your-test-key>
ARGUS_KEY_LINUX=<your-linux-key>
ARGUS_KEY_MACOS=<your-macos-key>
ARGUS_KEY_WINDOWS=<your-windows-key>
ARGUS_KEY_DASHBOARD=<your-dashboard-key>
CORS_ORIGINS=https://argus-scanner.duckdns.org
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
EOF
```

### Step 2: Build and Push Docker Images (from local machine)

#### Backend

```bash
cd backend

# Build multi-arch image
docker buildx create --name multiarch --use
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t kpzik/argus-backend:latest \
  --push .
```

#### Frontend

```bash
cd frontend

# Build multi-arch with domain URL (no /api suffix)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg VITE_API_URL=https://argus-scanner.duckdns.org \
  -t kpzik/argus-frontend:latest \
  --push .
```

**Important:** `VITE_API_URL` is a **build-time** variable. It gets inlined into the JavaScript bundle during `npm run build`. You CANNOT change it by restarting the container — you must rebuild the image.

| Deployment | VITE_API_URL |
|---|---|
| Local (no NPM) | `http://localhost:8000` |
| VPS without NPM | `http://<vps-ip>:8000` |
| VPS with NPM (HTTPS) | `https://argus-scanner.duckdns.org` |

> **Do NOT append `/api`** to `VITE_API_URL`. The frontend code already appends `/api` when calling backend endpoints (e.g., `${BASE_URL}/api/stats`). Adding `/api` to the URL causes double prefix (`/api/api/stats`).

### Step 3: Deploy Backend on VPS

**Without NPM (agents access backend directly):**

```bash
docker pull kpzik/argus-backend:latest
docker run -d \
  --name argus-backend \
  -p 8000:8000 \
  -v argus-data:/app/data \
  -v ~/argus-config/.env:/app/.env:ro \
  --restart unless-stopped \
  kpzik/argus-backend:latest

# Seed API keys (first time only)
docker exec argus-backend python seed.py
```

**With NPM (recommended — backend hidden from internet):**

```bash
docker pull kpzik/argus-backend:latest
docker run -d \
  --name argus-backend \
  --network npm_default \
  -v argus-data:/app/data \
  -v ~/argus-config/.env:/app/.env:ro \
  --restart unless-stopped \
  kpzik/argus-backend:latest

# Seed API keys (first time only)
docker exec argus-backend python seed.py
```

> No `-p` flag — backend is completely hidden from the public internet. Only accessible via NPM on the internal Docker network.

| Flag | Purpose |
|------|---------|
| `-d` | Run in background |
| `--name argus-backend` | Container name for docker commands |
| `--network npm_default` | Attach to NPM's Docker network |
| `-v argus-data:/app/data` | Persist SQLite database |
| `-v ~/argus-config/.env:/app/.env:ro` | Mount .env read-only |
| `--restart unless-stopped` | Auto-restart on reboot |

### Step 4: Deploy Frontend on VPS

**Without NPM:**

```bash
docker pull kpzik/argus-frontend:latest
docker run -d \
  --name argus-frontend \
  -p 80:80 \
  --restart unless-stopped \
  kpzik/argus-frontend:latest
```

**With NPM (recommended — frontend hidden from internet):**

```bash
docker pull kpzik/argus-frontend:latest
docker run -d \
  --name argus-frontend \
  --network npm_default \
  --restart unless-stopped \
  kpzik/argus-frontend:latest
```

> No `-p` flag — only NPM can reach the frontend via the internal Docker network.

### Step 5: Connect Containers to NPM Network

If containers were started without `--network npm_default`, connect them:

```bash
docker network connect npm_default argus-backend
docker network connect npm_default argus-frontend
```

Verify all three are on the same network:

```bash
docker network inspect npm_default | grep Name
# Should show: argus-backend, argus-frontend, nginx-proxy-manager (or npm-app)
```

### Step 6: Configure Nginx Proxy Manager

1. Access NPM: `http://vps-ip:81`
2. Login with your NPM credentials

**Create Proxy Host:**

| Tab | Field | Value |
|-----|-------|-------|
| Details | Domain Names | `argus-scanner.duckdns.org` |
| Details | Scheme | `http` |
| Details | Forward Hostname | `argus-frontend` |
| Details | Forward Port | `80` |
| Details | Block Common Exploits | ✅ |
| Details | Websockets Support | ✅ |

**Custom Locations Tab:**

Add **two** custom locations:

| # | Location | Scheme | Forward Hostname | Forward Port |
|---|----------|--------|-----------------|--------------|
| 1 | `/api` | `http` | `argus-backend` | `8000` |
| 2 | `/health` | `http` | `argus-backend` | `8000` |

> No rewrite rule needed — the backend routes already include `/api` (e.g., `/api/stats`, `/api/hosts`).

**SSL Tab:**

| Field | Value |
|-------|-------|
| SSL Certificate | Let's Encrypt |
| Email Address | your-email@example.com |
| Force SSL | ✅ |
| HTTP/2 Support | ✅ |

Click **Save**.

### Step 7: Update Agents

```bash
# On each agent machine
export ARGUS_BACKEND_URL="https://argus-scanner.duckdns.org"

# Run agent
python3 agents/agent_linux.py
```

### Step 8: Verify

```bash
# Backend health via NPM
curl https://argus-scanner.duckdns.org/health

# Frontend — open in browser
# https://argus-scanner.duckdns.org
# Login with dashboard API key
```

---

## Updating on VPS

### Backend Update

```bash
# Local: rebuild and push
cd backend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t kpzik/argus-backend:latest \
  --push .

# VPS: pull and restart
ssh root@<vps-ip>
docker pull kpzik/argus-backend:latest
docker stop argus-backend && docker rm argus-backend
docker run -d \
  --name argus-backend \
  --network npm_default \
  -v argus-data:/app/data \
  -v ~/argus-config/.env:/app/.env:ro \
  --restart unless-stopped \
  kpzik/argus-backend:latest

# Re-seed if schema changed
docker exec argus-backend python seed.py
```

### Frontend Update

```bash
# Local: rebuild multi-arch with domain URL and push
cd frontend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg VITE_API_URL=https://argus-scanner.duckdns.org \
  -t kpzik/argus-frontend:latest \
  --push .

# VPS: pull and restart
ssh root@<vps-ip>
docker pull kpzik/argus-frontend:latest
docker stop argus-frontend && docker rm argus-frontend
docker run -d \
  --name argus-frontend \
  --network npm_default \
  --restart unless-stopped \
  kpzik/argus-frontend:latest
```

---

## Docker Compose (VPS — Alternative)

```yaml
# docker-compose.yml
services:
  backend:
    image: kpzik/argus-backend:latest
    container_name: argus-backend
    networks:
      - npm_default
    volumes:
      - argus-data:/app/data
      - ~/argus-config/.env:/app/.env:ro
    restart: unless-stopped

  frontend:
    image: kpzik/argus-frontend:latest
    container_name: argus-frontend
    networks:
      - npm_default
    restart: unless-stopped

networks:
  npm_default:
    external: true

volumes:
  argus-data:
```

```bash
docker compose up -d
docker compose logs -f
docker compose down
```

---

## Alerting Setup

### Discord

1. Create Discord webhook:
   - Server Settings → Integrations → Webhooks → New Webhook
   - Copy webhook URL

2. Add to `.env`:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```

3. Restart backend container

### Slack

1. Create Slack webhook:
   - api.slack.com → Incoming Webhooks → Add New Webhook
   - Copy webhook URL

2. Add to `.env`:
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
   ```

3. Restart backend container

---

## CORS Configuration

CORS is configured via environment variable:

```python
# backend/main.py
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
```

### When is CORS needed?

| Scenario | Frontend Origin | Backend Origin | CORS Needed? |
|----------|----------------|----------------|--------------|
| Local dev (Vite) | `http://localhost:5173` | `http://localhost:8000` | Yes |
| Docker local (port 80) | `http://localhost` | `http://localhost:8000` | Yes |
| VPS with NPM | `https://argus-scanner.duckdns.org` | `https://argus-scanner.duckdns.org` | No (same origin) |
| VPS without NPM | `http://vps-ip` | `http://vps-ip:8000` | Yes |

### CORS_ORIGINS values

| Environment | CORS_ORIGINS |
|-------------|--------------|
| Local dev | `http://localhost:5173` |
| Docker local | `http://localhost,http://localhost:80,http://localhost:5173` |
| VPS with NPM | not needed (same origin) |
| VPS without NPM | `http://<vps-ip>` |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Container won't start | Check logs: `docker logs argus-backend` |
| "readonly database" error | Recreate volume: `docker volume rm argus-data` then rerun |
| "unable to open database file" | `appuser` can't write — rebuild image (Dockerfile fixes permissions) |
| 502 Bad Gateway | Check containers are on same network as NPM |
| CORS error in browser | Add browser origin to CORS_ORIGINS, restart backend |
| Frontend can't reach backend | Rebuild frontend with correct `VITE_API_URL` (no `/api` suffix) |
| SSL certificate fails | Verify DuckDNS IP matches VPS IP |
| Discord alerts not firing | Check DISCORD_WEBHOOK_URL in .env, restart backend |
| Data lost | Check `docker volume ls` — volume should exist |
| "Disconnected" in dashboard | Add `/health` custom location in NPM pointing to backend |

---

## Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| Dashboard shows "Disconnected" despite working connection | Known | The frontend health check calls `GET /health`. If NPM doesn't have a `/health` custom location pointing to the backend, this request goes to the frontend container which doesn't serve `/health`. Add `/health` custom location in NPM to fix. |

---

## Security Checklist

**Without NPM (direct access):**
- [ ] Backend port 8000 exposed (agents need direct access)
- [ ] Frontend port 80 exposed (browser needs direct access)
- [ ] Use HTTPS when possible (agents send API keys in headers)

**With NPM (recommended):**
- [ ] All containers on same Docker network (`npm_default`)
- [ ] Backend has NO `-p` flag (hidden from internet)
- [ ] Frontend has NO `-p` flag (hidden from internet)
- [ ] NPM handles all SSL termination
- [ ] HTTP redirects to HTTPS
- [ ] NPM has `/api` custom location pointing to backend
- [ ] NPM has `/health` custom location pointing to backend
- [ ] Agents use `https://` URL
- [ ] Frontend built with `VITE_API_URL=https://argus-scanner.duckdns.org` (no `/api` suffix)

**Both setups:**
- [ ] API keys in .env (not hardcoded)
- [ ] .env mounted read-only in container
- [ ] Docker containers run as non-root user (semgrep: missing-user)

---

*Last updated: July 2026*
