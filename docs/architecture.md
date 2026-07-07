# ARGUS Architecture

**AI Risk & Governance Unauthorized-endpoint Scanner**

A decentralized security framework that detects **Shadow AI** (unauthorized AI tools) across enterprise endpoints.

---

## System Overview

```mermaid
graph TB
    subgraph "Endpoint Agents"
        LA[🖥️ Linux Agent<br>agent_linux.py<br>Python + psutil]
        MA[🍎 macOS Agent<br>agent_macos.py<br>Python + psutil]
        WA[🪟 Windows Agent<br>agent_windows.py<br>Python + psutil]
    end

    subgraph "Backend — FastAPI + SQLite"
        LB[Load Balancer / VPS<br>Port 8000]
        API[FastAPI App<br>main.py]
        AUTH[Auth Layer<br>auth.py<br>SHA-256 key verification]
        DB[SQLite DB<br>argus.db<br>WAL mode]
    end

    subgraph "Detection Targets"
        OLLAMA[Ollama<br>local_llm<br>Port 11434]
        CURSOR[Cursor IDE<br>ai_ide<br>~/.cursor]
        MCP[MCP Configs<br>mcp_server<br>.mcp.json]
    end

    subgraph "Consumers"
        DASH[Dashboard<br>HTML + TailwindCSS + JS]
        CURL[Dev Tools<br>curl / Postman]
    end

    LA -->|"POST /api/scan<br>X-API-Key: write"| LB
    MA -->|"POST /api/scan<br>X-API-Key: write"| LB
    WA -->|"POST /api/scan<br>X-API-Key: write"| LB

    LB --> API
    API --> AUTH
    AUTH --> DB

    DASH -->|"GET /api/*<br>X-API-Key: read"| LB
    CURL -->|"GET /api/*<br>X-API-Key: read"| LB

    LA -.->|scans for| OLLAMA
    LA -.->|scans for| CURSOR
    LA -.->|scans for| MCP
    MA -.->|scans for| OLLAMA
    MA -.->|scans for| CURSOR
    MA -.->|scans for| MCP
    WA -.->|scans for| CURSOR
```

---

## Request/Response Flow

### Scan Ingestion (Agent → Backend)

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Agent
    participant API as FastAPI
    participant Auth as auth.py
    participant DB as SQLite

    Agent->>Agent: Scan machine for AI tools<br>(Ollama, Cursor, MCP)

    Agent->>API: POST /api/scan<br>Headers: Content-Type: application/json<br>Headers: X-API-Key: <write-key><br>Body: { hostname, os, findings: [...] }

    API->>Auth: verify_write_key(key)
    Auth->>Auth: SHA-256 hash the key
    Auth->>DB: SELECT FROM api_keys<br>WHERE key_hash = ?<br>AND role = 'write'<br>AND is_active = 1

    alt Key valid
        DB-->>Auth: ApiKey row
        Auth-->>API: api_key_id
        API->>DB: INSERT INTO scans (hostname, os, ...) VALUES (...)
        DB-->>API: scan_id
        loop For each finding
            API->>DB: INSERT INTO findings (scan_id, category, severity, ...) VALUES (...)
        end
        DB-->>API: committed
        API-->>Agent: 201 Created<br>{ id: 42, hostname: "dev-01", findings_count: 2 }
    else Key invalid or wrong role
        DB-->>Auth: None
        Auth-->>API: 401 Unauthorized
        API-->>Agent: 401 { detail: "Invalid or inactive API key" }
    end
```

### Dashboard Read (Dashboard → Backend)

```mermaid
sequenceDiagram
    autonumber
    participant Dash as Dashboard
    participant API as FastAPI
    participant Auth as auth.py
    participant DB as SQLite

    Dash->>API: GET /api/hosts<br>Headers: X-API-Key: <read-key>

    API->>Auth: verify_read_key(key)
    Auth->>DB: SELECT FROM api_keys<br>WHERE key_hash = ?<br>AND role = 'read'
    DB-->>Auth: ApiKey row
    Auth-->>API: api_key_id

    API->>DB: SELECT hostname, os, ip_address,<br>received_at FROM scans<br>WHERE rn = 1 (latest per host)
    DB-->>API: host rows

    loop For each host
        API->>DB: SELECT severity, COUNT(*)<br>FROM findings<br>WHERE scan_id IN (...)<br>GROUP BY severity
        DB-->>API: severity counts
    end

    API-->>Dash: 200 OK<br>[{ hostname, os, high: 2, medium: 1, low: 0 }]
```

---

## Database Schema

```mermaid
erDiagram
    api_keys {
        int id PK "auto-increment"
        string key_hash UK "SHA-256, indexed"
        string name "e.g. linux-agent"
        string role "write or read"
        bool is_active "toggle"
        datetime created_at "UTC"
    }

    scans {
        int id PK "auto-increment"
        string hostname "indexed"
        string os "linux/darwin/windows"
        string os_version "e.g. Ubuntu 22.04 LTS"
        string kernel "nullable"
        string agent_version "semver"
        datetime scanned_at "from payload"
        int uptime_seconds "nullable"
        string ip_address "nullable"
        int api_key_id FK "→ api_keys.id"
        datetime received_at "server UTC timestamp"
    }

    findings {
        int id PK "auto-increment"
        int scan_id FK "→ scans.id, cascade delete"
        string category "local_llm/ai_ide/mcp_server"
        string name "ollama/cursor/mcp_config"
        string severity "high/medium/low"
        string status "detected/not_detected"
        string evidence "human-readable description"
        int pid "nullable"
        int port "nullable"
        string path "nullable, file path"
        string user "nullable, username"
        datetime detected_at "from payload"
    }

    api_keys ||--o{ scans : "created"
    scans ||--o{ findings : "contains"
```

---

## Authentication Flow

```mermaid
flowchart TD
    START([Client Request]) --> HASH["SHA-256 Hash<br>hashlib.sha256(key.encode()).hexdigest()"]
    HASH --> LOOKUP{"Lookup in api_keys<br>WHERE key_hash = ?<br>AND is_active = 1<br>AND role = ?"}

    LOOKUP -->|Found + correct role| SUCCESS["✅ Pass<br>Attach api_key_id to request"]
    LOOKUP -->|Not found or wrong role| FAIL["❌ 401 Unauthorized"]

    SUCCESS --> ROUTE{"Route Type"}

    ROUTE -->|POST /api/scan| REQUIRE_WRITE["Requires role = write"]
    ROUTE -->|GET /api/*| REQUIRE_READ["Requires role = read"]

    REQUIRE_WRITE --> PROC["Process Request"]
    REQUIRE_READ --> PROC
    PROC --> RESP["Return JSON Response"]

    style START fill:#4CAF50,color:#fff
    style SUCCESS fill:#4CAF50,color:#fff
    style FAIL fill:#f44336,color:#fff
```

---

## Agent Detection Matrix

```mermaid
graph LR
    subgraph "Detection Targets"
        direction TB
        CAT1["Cat 1: Local LLM<br>─────────────<br>Ollama<br>Port: 11434<br>Method: Process scan + port check"]
        CAT2["Cat 2: AI IDE<br>─────────────<br>Cursor<br>Paths: ~/.cursor<br>%APPDATA%\\Cursor<br>Method: Directory scan"]
        CAT5["Cat 5: MCP Servers<br>─────────────<br>MCP Configs<br>Files: .mcp.json<br>claude_desktop_config.json<br>Method: Config file scan"]
    end

    subgraph "Agent Platforms"
        direction TB
        LINUX["Linux Agent<br>Python + psutil"]
        MACOS["macOS Agent<br>Python + psutil"]
        WINDOWS["Windows Agent<br>Python + psutil"]
    end

    LINUX --> CAT1
    LINUX --> CAT2
    LINUX --> CAT5
    MACOS --> CAT1
    MACOS --> CAT2
    MACOS --> CAT5
    WINDOWS --> CAT2
    WINDOWS -.->|portable| CAT1
    WINDOWS -.->|portable| CAT5

    style CAT1 fill:#E53935,color:#fff
    style CAT2 fill:#FB8C00,color:#fff
    style CAT5 fill:#8E24AA,color:#fff
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Local Development"
        DEV["Dev Machine<br>x86_64 / amd64"]
        UVICORN["uvicorn main:app<br>--reload --port 8000"]
        LOCAL_DB["backend/data/argus.db"]
    end

    subgraph "Production (VPS)"
        VPS["VPS<br>aarch64 / arm64"]
        DOCKER["Docker Container<br>python:3.12-slim"]
        VOL_DATA["Volume: argus-data<br>/app/data/argus.db"]
        VOL_ENV["Volume: ~/argus-config/.env<br>/app/.env (read-only)"]
        UFW["Firewall<br>Port 8000 open"]
    end

    subgraph "CI/CD"
        BUILDX["Docker BuildX<br>linux/amd64 + arm64"]
        HUB["Docker Hub<br>argus-backend:latest"]
    end

    DEV -->|"docker buildx build<br>--push"| HUB
    BUILDX --> HUB

    HUB -->|"docker pull"| DOCKER
    DOCKER --> VOL_DATA
    DOCKER --> VOL_ENV
    DOCKER -->|"runs on"| VPS
    VPS -->|"port 8000"| UFW

    DEV -.->|local dev| UVICORN
    UVICORN --> LOCAL_DB

    style VPS fill:#1565C0,color:#fff
    style HUB fill:#0277BD,color:#fff
    style BUILDX fill:#F57C00,color:#fff
```

---

## Environment Variables

| Variable            | Purpose                              | Example Value               |
|---------------------|--------------------------------------|------------------------------|
| `ARGUS_KEY_TEST`    | Write key for local dev / curl       | `test-secret-key-abc123`    |
| `ARGUS_KEY_LINUX`   | Write key for Linux agent            | `linux-agent-key-xyz789`    |
| `ARGUS_KEY_MACOS`   | Write key for macOS agent            | `macos-agent-key-uvw456`    |
| `ARGUS_KEY_WINDOWS` | Write key for Windows agent          | `windows-agent-key-rst123`  |
| `ARGUS_KEY_DASHBOARD`| Read key for dashboard              | `dashboard-read-key-opq987` |
| `ARGUS_DB_DIR`      | Override DB directory (optional)     | `/custom/path`              |

---

## Summary

| Component     | Role                                          | File(s)                         |
|---------------|-----------------------------------------------|---------------------------------|
| **Agents**    | Scan endpoints for Shadow AI, POST findings   | `agents/*.py`                   |
| **Backend**   | Ingest, store, query scan data                | `backend/main.py`               |
| **Auth**      | Verify API keys via SHA-256 hashing           | `backend/auth.py`               |
| **Database**  | Persist scans + findings (SQLite)             | `backend/database.py`           |
| **Seeders**   | Initialize API keys + test data               | `backend/seed.py`, `test_data.py` |
| **Dashboard** | Visualize hosts, findings, risk scores        | `dashboard/` (planned)          |
| **Docker**    | Multi-arch containerized deployment           | `backend/Dockerfile`            |

---

*Last updated: July 2025*
