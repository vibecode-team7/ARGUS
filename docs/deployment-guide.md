# Deployment Guide

## Architecture

```
Agent/Browser → https://argus.duckdns.org (NPM:443)
                      ↓
              ┌───────┴───────┐
              │  Frontend     │
              │  (nginx:80)   │
              └───────┬───────┘
                      │ proxy /api/*
              ┌───────┴───────┐
              │  Backend      │
              │  (FastAPI:8000)│
              └───────┬───────┘
                      │
              ┌───────┴───────┐
              │  SQLite DB    │
              │  (argus-data) │
              └───────────────┘
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
CORS_ORIGINS=http://localhost,https://argus.duckdns.org
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

# Build multi-arch with VPS backend URL (REQUIRED — this is baked into the JS bundle)
# Replace <vps-ip> with your actual VPS IP address
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg VITE_API_URL=http://<vps-ip>:8000 \
  -t kpzik/argus-frontend:latest \
  --push .
```

**⚠️ Important:** `VITE_API_URL` is a **build-time** variable. It gets inlined into the JavaScript bundle during `npm run build`. You CANNOT change it by restarting the container — you must rebuild the image.

| Deployment | VITE_API_URL |
|---|---|
| Local (no NPM) | `http://localhost:8000` |
| VPS without NPM | `http://<vps-ip>:8000` |
| VPS with NPM (HTTPS) | `https://argus.duckdns.org` |

**When switching from HTTP to HTTPS (after NPM setup):** rebuild the frontend image with the new URL:

```bash
cd frontend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg VITE_API_URL=https://argus.duckdns.org \
  -t kpzik/argus-frontend:latest \
  --push .
```

### Step 3: Deploy Backend on VPS

**Port binding depends on your setup:**

| Setup | Port Flag | Why |
|---|---|---|
| Without NPM (direct access) | `-p 8000:8000` | Agents need to reach backend directly |
| With NPM (proxied) | `-p 127.0.0.1:8000:8000` | NPM proxies internally, no direct access needed |

**Without NPM (current setup — agents access backend directly):**

```bash
# SSH into VPS
ssh root@<vps-ip>

# Pull and run — exposed to internet (needed for agents without NPM)
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

**With NPM (after HTTPS setup — agents access via https://argus.duckdns.org):**

```bash
# Bind to localhost only — NPM proxies to it internally
docker run -d \
  --name argus-backend \
  -p 127.0.0.1:8000:8000 \
  -v argus-data:/app/data \
  -v ~/argus-config/.env:/app/.env:ro \
  --restart unless-stopped \
  kpzik/argus-backend:latest
```

| Flag | Purpose |
|------|---------|
| `-d` | Run in background |
| `--name argus-backend` | Container name for docker commands |
| `-p 8000:8000` | Expose to internet (agents need direct access without NPM) |
| `-p 127.0.0.1:8000:8000` | Localhost only (NPM handles external access) |
| `-v argus-data:/app/data` | Persist SQLite database |
| `-v ~/argus-config/.env:/app/.env:ro` | Mount .env read-only |
| `--restart unless-stopped` | Auto-restart on reboot |

### Step 4: Deploy Frontend on VPS

**Port binding depends on your setup:**

| Setup | Port Flag | Why |
|---|---|---|
| Without NPM | `-p 80:80` | Browser needs to access frontend directly |
| With NPM | `-p 127.0.0.1:80:80` | NPM proxies internally |

**Without NPM:**

```bash
docker pull kpzik/argus-frontend:latest
docker run -d \
  --name argus-frontend \
  -p 80:80 \
  --restart unless-stopped \
  kpzik/argus-frontend:latest
```

**With NPM:**

```bash
docker run -d \
  --name argus-frontend \
  -p 127.0.0.1:80:80 \
  --restart unless-stopped \
  kpzik/argus-frontend:latest
```

### Step 5: Configure Nginx Proxy Manager

1. Access NPM: `http://vps-ip:81`
2. Login with your NPM credentials
3. **Add Proxy Host**:

| Field | Value |
|-------|-------|
| Domain Names | `argus.duckdns.org` |
| Scheme | `http` |
| Forward Hostname | `localhost` |
| Forward Port | `80` |
| Block Common Exploits | ✅ |
| Websockets Support | ✅ |

4. **SSL Tab**:

| Field | Value |
|-------|-------|
| SSL Certificate | Let's Encrypt |
| Email | your-email@example.com |
| Force SSL | ✅ |
| HTTP/2 Support | ✅ |

5. Click **Save**

### Step 6: Update Agents

```bash
# On each agent machine
export ARGUS_BACKEND_URL="https://argus.duckdns.org"

# Run agent
python3 agents/agent_linux.py
```

### Step 7: Verify

```bash
# Check backend
curl https://argus.duckdns.org/health

# Check frontend
curl -I https://argus.duckdns.org

# Check agent
python3 agents/agent_linux.py

# Check Discord alerts
# (Send a scan with severity=high, check Discord channel)
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
  -p 127.0.0.1:8000:8000 \
  -v argus-data:/app/data \
  -v ~/argus-config/.env:/app/.env:ro \
  --restart unless-stopped \
  kpzik/argus-backend:latest

# Re-seed if schema changed
docker exec argus-backend python seed.py
```

### Frontend Update

```bash
# Local: rebuild multi-arch with VPS URL and push
cd frontend
# Replace <vps-ip> with your actual VPS IP (or use https://argus.duckdns.org if using NPM)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg VITE_API_URL=http://<vps-ip>:8000 \
  -t kpzik/argus-frontend:latest \
  --push .

# VPS: pull and restart
ssh root@<vps-ip>
docker pull kpzik/argus-frontend:latest
docker stop argus-frontend && docker rm argus-frontend
docker run -d \
  --name argus-frontend \
  -p 127.0.0.1:80:80 \
  --restart unless-stopped \
  kpzik/argus-frontend:latest
```

---

## Docker Compose (VPS — Alternative)

### Backend

```yaml
# backend/docker-compose.yml
services:
  backend:
    image: kpzik/argus-backend:latest
    container_name: argus-backend
    ports:
      - "127.0.0.1:8000:8000"
    volumes:
      - argus-data:/app/data
      - ~/argus-config/.env:/app/.env:ro
    restart: unless-stopped

volumes:
  argus-data:
```

```bash
cd backend
docker compose up -d
docker compose logs -f backend
docker compose down
```

### Common Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start in background |
| `docker compose down` | Stop and remove |
| `docker compose down -v` | Stop, remove, and delete volume |
| `docker compose logs -f backend` | View logs |
| `docker compose exec backend python seed.py` | Seed API keys |
| `docker compose ps` | Check status |

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
| Local dev (Vite) | `http://localhost:5173` | `http://localhost:8000` | ✅ Yes |
| Docker local (port 80) | `http://localhost` | `http://localhost:8000` | ✅ Yes |
| VPS with NPM | `https://argus.duckdns.org` | `https://argus.duckdns.org` | ❌ No (same origin) |
| VPS without NPM | `http://vps-ip` | `http://vps-ip:8000` | ✅ Yes |

### CORS_ORIGINS values

| Environment | CORS_ORIGINS |
|-------------|--------------|
| Local dev | `http://localhost:5173` |
| Docker local | `http://localhost,http://localhost:80,http://localhost:5173` |
| VPS with NPM | not needed (same origin) |
| VPS without NPM | `http://<vps-ip>,https://argus.duckdns.org` |

### Troubleshooting CORS

If you see `No 'Access-Control-Allow-Origin' header` in browser console:

1. Check the **exact origin** in the error message (e.g. `http://localhost`)
2. Add that origin to `CORS_ORIGINS` in `.env`
3. Restart backend: `docker restart argus-backend`
4. Verify: `curl -H "Origin: http://localhost" -v http://localhost:8000/api/stats 2>&1 | grep access-control`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Container won't start | Check logs: `docker logs argus-backend` |
| "readonly database" error | Recreate volume: `docker volume rm argus-data` then rerun |
| "unable to open database file" | `appuser` can't write — rebuild image (Dockerfile fixes permissions) |
| CORS error in browser | Add browser origin to CORS_ORIGINS, restart backend |
| Frontend can't reach backend | Rebuild frontend with correct `VITE_API_URL` |
| 502 Bad Gateway | Backend not running or wrong hostname in NPM |
| SSL certificate fails | Verify DuckDNS IP matches VPS IP |
| Discord alerts not firing | Check DISCORD_WEBHOOK_URL in .env, restart backend |
| Data lost | Check `docker volume ls` — volume should exist |

---

## Security Checklist

**Without NPM (direct access):**
- [ ] Backend port 8000 exposed (agents need direct access)
- [ ] Frontend port 80 exposed (browser needs direct access)
- [ ] Use HTTPS when possible (agents send API keys in headers)

**With NPM (recommended):**
- [ ] Backend port 8000 bound to `127.0.0.1` only
- [ ] Frontend port 80 bound to `127.0.0.1` only
- [ ] NPM handles all SSL termination
- [ ] HTTP redirects to HTTPS
- [ ] Agents use `https://` URL
- [ ] Frontend built with `VITE_API_URL=https://argus.duckdns.org`

**Both setups:**
- [ ] API keys in .env (not hardcoded)
- [ ] .env mounted read-only in container
- [ ] Docker containers run as non-root user (semgrep: missing-user)

---

*Last updated: July 2026*
