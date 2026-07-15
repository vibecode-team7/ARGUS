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

## Production Deployment (VPS)

### Prerequisites

- VPS with Docker installed
- Nginx Proxy Manager (NPM) running on port 81
- DuckDNS domain pointing to VPS IP

### Step 1: Prepare .env on VPS

```bash
mkdir -p ~/argus-config
cat > ~/argus-config/.env << 'EOF'
ARGUS_KEY_TEST=<your-test-key>
ARGUS_KEY_LINUX=<your-linux-key>
ARGUS_KEY_MACOS=<your-macos-key>
ARGUS_KEY_WINDOWS=<your-windows-key>
ARGUS_KEY_DASHBOARD=<your-dashboard-key>
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
CORS_ORIGINS=http://localhost:5173
EOF
```

### Step 2: Build and Push Docker Image

```bash
# Local machine
cd backend
docker buildx create --name multiarch --use
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <dockerhub-user>/argus-backend:latest \
  --push .
```

### Step 3: Deploy Backend on VPS

```bash
# Pull and run
docker pull <dockerhub-user>/argus-backend:latest
docker run -d \
  --name argus-backend \
  -p 127.0.0.1:8000:8000 \
  -v argus-data:/app/data \
  -v ~/argus-config/.env:/app/.env:ro \
  --restart unless-stopped \
  <dockerhub-user>/argus-backend:latest

# Seed API keys
docker exec argus-backend python seed.py
```

| Flag | Purpose |
|------|---------|
| `-d` | Run in background |
| `--name argus-backend` | Container name for docker commands |
| `-p 127.0.0.1:8000:8000` | Bind to localhost only (not exposed to internet) |
| `-v argus-data:/app/data` | Persist SQLite database |
| `-v ~/argus-config/.env:/app/.env:ro` | Mount .env read-only |
| `--restart unless-stopped` | Auto-restart on reboot |

### Step 4: Deploy Frontend on VPS

```bash
# Build frontend
cd frontend
docker build \
  --build-arg VITE_API_URL=https://argus.duckdns.org \
  -t <dockerhub-user>/argus-frontend:latest .

# Run
docker run -d \
  --name argus-frontend \
  -p 127.0.0.1:80:80 \
  --restart unless-stopped \
  <dockerhub-user>/argus-frontend:latest
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

## Docker Compose (Recommended)

### Backend

```yaml
# backend/docker-compose.yml
services:
  backend:
    image: <dockerhub-user>/argus-backend:latest
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
| `docker compose logs -f backend` | View logs |
| `docker compose exec backend python seed.py` | Seed API keys |
| `docker compose ps` | Check status |

---

## Updating

### Backend Update

```bash
# Local: rebuild and push
cd backend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <dockerhub-user>/argus-backend:latest \
  --push .

# VPS: pull and restart
docker pull <dockerhub-user>/argus-backend:latest
docker compose down
docker compose up -d
```

### Frontend Update

```bash
# Local: rebuild
cd frontend
docker build \
  --build-arg VITE_API_URL=https://argus.duckdns.org \
  -t <dockerhub-user>/argus-frontend:latest .

# VPS: pull and restart
docker pull <dockerhub-user>/argus-frontend:latest
docker stop argus-frontend
docker rm argus-frontend
docker run -d \
  --name argus-frontend \
  -p 127.0.0.1:80:80 \
  --restart unless-stopped \
  <dockerhub-user>/argus-frontend:latest
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

| Environment | CORS_ORIGINS | Behavior |
|-------------|--------------|----------|
| Local dev | `http://localhost:5173` | Vite dev server allowed |
| Docker (NPM) | not set | nginx proxies, CORS never triggered |
| DuckDNS | add domain | only if backend exposed directly |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Container won't start | Check logs: `docker logs argus-backend` |
| 502 Bad Gateway | Backend not running or wrong hostname in NPM |
| SSL certificate fails | Verify DuckDNS IP matches VPS IP |
| CORS errors | Check CORS_ORIGINS in .env |
| Discord alerts not firing | Check DISCORD_WEBHOOK_URL in .env |
| Data lost | Check `docker volume ls` — volume should exist |

---

## Security Checklist

- [ ] Backend port 8000 bound to `127.0.0.1` only
- [ ] NPM handles all SSL termination
- [ ] HTTP redirects to HTTPS
- [ ] API keys in .env (not hardcoded)
- [ ] .env mounted read-only in container
- [ ] Agents use `https://` URL
- [ ] Frontend uses `https://` API URL

---

*Last updated: July 2025*
