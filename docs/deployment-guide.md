# Deployment Guide

## Architecture Mismatch Problem

Local machine: `x86_64` (amd64)
VPS: `aarch64` (arm64)

Docker images are architecture-specific. Pulling an amd64 image on an arm64 machine gives:

```
no matching manifest for linux/arm64/v8 in the manifest list entries
```

## Fix: Multi-Arch Build with Docker BuildX

### Prerequisites on Local Machine

```bash
# Check if buildx is available
docker buildx version

# If missing, install it
# (Docker Desktop / Docker Engine 19.03+ has it built-in)
```

### Step 1: Create a multi-arch builder

```bash
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap
```

### Step 2: Build and push for both architectures

```bash
cd backend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <your-dockerhub-username>/argus-backend:latest \
  --push \
  .
```

This single command:
- Builds for both `amd64` (x86) and `arm64` (ARM)
- Pushes both images as a single multi-arch manifest to Docker Hub
- The VPS will automatically pull the correct architecture

### Step 3: Pull and run on VPS

First, create a `.env` file on the VPS with the API keys:

```bash
# On VPS
mkdir -p ~/argus-config
cat > ~/argus-config/.env << EOF
ARGUS_KEY_TEST=<your-local-test-key>
ARGUS_KEY_LINUX=<your-linux-agent-key>
ARGUS_KEY_MACOS=<your-macos-agent-key>
ARGUS_KEY_WINDOWS=<your-windows-agent-key>
ARGUS_KEY_DASHBOARD=<your-dashboard-read-key>
EOF
```

Then pull and run, mounting the `.env` file into the container:

```bash
docker pull <your-dockerhub-username>/argus-backend:latest

docker run -d \
  -p 8000:8000 \
  -v argus-data:/app/data \
  -v ~/argus-config/.env:/app/.env:ro \
  --restart unless-stopped \
  <your-dockerhub-username>/argus-backend:latest
```

| Flag | Purpose |
|---|---|
| `-d` | Run in background (detached) |
| `-p 8000:8000` | Map host port 8000 to container port 8000 |
| `-v argus-data:/app/data` | Persist SQLite database on a Docker volume |
| `-v ~/argus-config/.env:/app/.env:ro` | Mount .env file read-only (keys never baked into image) |
| `--restart unless-stopped` | Auto-restart if VPS reboots |

**Important:** Seeds must be run inside the container after first deploy:

```bash
docker exec <container-id> python seed.py
```

**Auto-migration:** If you update the code and add new columns to the database schema, the backend automatically detects and applies them at startup. No manual `ALTER TABLE` needed. Existing data is preserved.

### Step 4: Verify

```bash
# Check running containers
docker ps

# View logs
docker logs -f <container-id>

# Hit the health endpoint
curl http://localhost:8000/health
```

## Updating the Image

```bash
# Local: rebuild and push
cd backend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <your-dockerhub-username>/argus-backend:latest \
  --push \
  .

# VPS: pull latest and restart (include .env mount and seed)
docker pull <your-dockerhub-username>/argus-backend:latest
docker stop <container-id>
docker rm <container-id>
docker run -d \
  -p 8000:8000 \
  -v argus-data:/app/data \
  -v ~/argus-config/.env:/app/.env:ro \
  --restart unless-stopped \
  <your-dockerhub-username>/argus-backend:latest
docker exec <container-id> python seed.py
```

## Alternative: Direct Transfer (No Docker Hub)

If you don't want to use Docker Hub, transfer the image file directly:

```bash
# Local: build for your VPS architecture and save
docker build --platform linux/arm64 -t argus-backend:arm64 ./backend
docker save -o argus-backend-arm64.tar argus-backend:arm64

# Transfer to VPS
scp argus-backend-arm64.tar user@your-vps:~

# VPS: load and run
docker load -i argus-backend-arm64.tar
docker run -d -p 8000:8000 -v argus-data:/app/data --restart unless-stopped argus-backend:arm64
```

## VPS Firewall Setup

Ensure port 8000 is open:

```bash
# Ubuntu (ufw)
sudo ufw allow 8000/tcp
sudo ufw reload

# Check cloud provider firewall (DigitalOcean, AWS, etc.)
# Add an inbound rule for TCP port 8000
```

## Docker Compose (Optional, for future full-stack)

```yaml
# docker-compose.yml
services:
  backend:
    image: <your-dockerhub-username>/argus-backend:latest
    ports:
      - "8000:8000"
    volumes:
      - argus-data:/app/data
    restart: unless-stopped

volumes:
  argus-data:
```

Then on VPS:

```bash
docker compose up -d
```

## CORS Configuration

The frontend and backend run on separate containers, so CORS must be enabled on the backend.

In `backend/main.py`, `CORSMiddleware` is already added with `allow_origins=["*"]` for development.

**Before going to production**, restrict origins to your actual frontend URL:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
