# Project ARGUS — GitHub Kanban Tasks

## Labels

| Label | Color | Description |
|---|---|---|
| `agent` | #0E8A16 | Agent development tasks |
| `backend` | #1D76DB | Backend API tasks |
| `frontend` | #D93F0B | Dashboard tasks |
| `infra` | #FBCA04 | Infrastructure & config |
| `p0-critical` | #B60205 | Must-have for MVP |
| `p1-important` | #F9D0C4 | Important but not blocking |
| `p2-nice-to-have` | #FEF2C0 | Future enhancement |

---

## Milestone: Phase 0 — Project Setup

### Issue #1: Initialize repository structure
**Labels:** `infra`, `p0-critical`
**Assignee:** @KiZINnO (Project Lead)

- [ ] Create `agents/`, `backend/`, `dashboard/`, `config/`, `docs/` directories
- [ ] Add `.gitignore` for `venv/`, `__pycache__/`, `*.db`, `.env`
- [ ] Add `LICENSE` file
- [ ] Add `README.md` with project overview
- [ ] Add `presentation.md` (Marp slides)
- [ ] Add `KiZINnO.md` (proposal)

---

### Issue #2: Define shared payload schema
**Labels:** `p0-critical`
**Assignee:** @KiZINnO (Project Lead)

- [ ] Finalize JSON payload format in `docs/payload-schema.json`
- [ ] All 5 members review and agree on the schema
- [ ] Create `config/blocklist.json` with initial detection targets

---

## Milestone: Phase 1 — Agent Development (Week 1-2)

### Issue #3: Linux Agent — `agents/agent_linux.py`
**Labels:** `agent`, `p0-critical`
**Assignee:** Member 1 (Linux)

- [ ] **Ollama Detection (Cat 1)**
  - [ ] Scan running processes for `ollama` via `psutil.process_iter()`
  - [ ] Check listening ports for `11434` via `psutil.net_connections()`
  - [ ] Output finding with severity `high`

- [ ] **Cursor Detection (Cat 2)**
  - [ ] Check directory existence: `~/.cursor`
  - [ ] Output finding with severity `medium`

- [ ] **MCP Config Detection (Cat 5)**
  - [ ] Check file existence: `~/.mcp.json`
  - [ ] Check file existence: `~/.config/claude/claude_desktop_config.json`
  - [ ] Check file existence: `~/.cursor/mcp.json`
  - [ ] Output finding with severity `high`

- [ ] **Payload Generation**
  - [ ] Build JSON payload with `hostname`, `os`, `agent_version`, `timestamp`, `findings[]`
  - [ ] Use `socket.gethostname()` for hostname
  - [ ] Use `datetime.utcnow().isoformat()` for timestamp

- [ ] **Data Transmission**
  - [ ] POST JSON to backend URL via `requests.post()`
  - [ ] Handle connection errors gracefully
  - [ ] Print result to console

- [ ] **Testing**
  - [ ] Test with Ollama installed → verify detection
  - [ ] Test with Cursor installed → verify detection
  - [ ] Test with MCP config present → verify detection
  - [ ] Test with nothing installed → verify clean output

---

### Issue #4: macOS Agent — `agents/agent_macos.py`
**Labels:** `agent`, `p0-critical`
**Assignee:** Member 2 (macOS)

- [ ] **Ollama Detection (Cat 1)**
  - [ ] Scan running processes for `ollama` via `psutil.process_iter()`
  - [ ] Check listening ports for `11434` via `psutil.net_connections()`
  - [ ] Output finding with severity `high`

- [ ] **Cursor Detection (Cat 2)**
  - [ ] Check directory existence: `~/.cursor`
  - [ ] Output finding with severity `medium`

- [ ] **MCP Config Detection (Cat 5)**
  - [ ] Check file existence: `~/.mcp.json`
  - [ ] Check file existence: `~/.config/claude/claude_desktop_config.json`
  - [ ] Check file existence: `~/.cursor/mcp.json`
  - [ ] Output finding with severity `high`

- [ ] **Payload Generation**
  - [ ] Build JSON payload with `hostname`, `os`, `agent_version`, `timestamp`, `findings[]`
  - [ ] Use `socket.gethostname()` for hostname
  - [ ] Use `datetime.utcnow().isoformat()` for timestamp

- [ ] **Data Transmission**
  - [ ] POST JSON to backend URL via `requests.post()`
  - [ ] Handle connection errors gracefully
  - [ ] Print result to console

- [ ] **Testing**
  - [ ] Test with Ollama installed → verify detection
  - [ ] Test with Cursor installed → verify detection
  - [ ] Test with MCP config present → verify detection
  - [ ] Test with nothing installed → verify clean output

---

### Issue #5: Windows Agent — `agents/agent_windows.py`
**Labels:** `agent`, `p0-critical`
**Assignee:** Member 3 (Windows)

- [ ] **Ollama Detection (Cat 1)**
  - [ ] Scan running processes for `ollama` via `psutil.process_iter()`
  - [ ] Check listening ports for `11434` via `psutil.net_connections()`
  - [ ] Output finding with severity `high`

- [ ] **Cursor Detection (Cat 2)**
  - [ ] Check directory existence: `%APPDATA%\Cursor`
  - [ ] Check directory existence: `%LOCALAPPDATA%\Cursor`
  - [ ] Output finding with severity `medium`

- [ ] **MCP Config Detection (Cat 5)**
  - [ ] Check file existence: `%USERPROFILE%\.mcp.json`
  - [ ] Check file existence: `%APPDATA%\Claude\claude_desktop_config.json`
  - [ ] Check file existence: `%USERPROFILE%\.cursor\mcp.json`
  - [ ] Output finding with severity `high`

- [ ] **Payload Generation**
  - [ ] Build JSON payload with `hostname`, `os`, `agent_version`, `timestamp`, `findings[]`
  - [ ] Use `socket.gethostname()` for hostname
  - [ ] Use `datetime.utcnow().isoformat()` for timestamp
  - [ ] Set `os` field to `"windows"`

- [ ] **Data Transmission**
  - [ ] POST JSON to backend URL via `requests.post()`
  - [ ] Handle connection errors gracefully
  - [ ] Print result to console

- [ ] **Testing**
  - [ ] Test with Ollama installed → verify detection
  - [ ] Test with Cursor installed → verify detection
  - [ ] Test with MCP config present → verify detection
  - [ ] Test with nothing installed → verify clean output

---

## Milestone: Phase 2 — Backend (Week 1-2)

### Issue #6: FastAPI server setup — `backend/main.py`
**Labels:** `backend`, `p0-critical`
**Assignee:** Member 4 (Backend)

- [ ] Initialize FastAPI app with CORS middleware
- [ ] Add `POST /api/scan` endpoint (receives agent payload)
- [ ] Add `GET /api/hosts` endpoint (returns all scanned hosts)
- [ ] Add `GET /api/findings` endpoint (returns all findings)
- [ ] Add `GET /api/stats` endpoint (returns aggregate counts)
- [ ] Add `GET /health` endpoint (health check)
- [ ] Validate incoming JSON against payload schema
- [ ] Return proper HTTP status codes (201, 400, 404, 500)

---

### Issue #7: SQLite database — `backend/database.py`
**Labels:** `backend`, `p0-critical`
**Assignee:** Member 4 (Backend)

- [ ] Create `hosts` table: `id`, `hostname`, `os`, `agent_version`, `ip_address`, `first_seen`, `last_seen`
- [ ] Create `findings` table: `id`, `host_id` (FK), `category`, `name`, `severity`, `evidence`, `timestamp`
- [ ] Add auto-migration logic (check table existence on startup)
- [ ] Add helper functions: `insert_host()`, `insert_finding()`, `get_hosts()`, `get_findings()`
- [ ] Store database in `backend/data/argus.db`

---

### Issue #8: Backend — Alerting integration
**Labels:** `backend`, `p1-important`
**Assignee:** Member 4 (Backend)

- [ ] Add Discord webhook support (POST to `DISCORD_WEBHOOK_URL`)
- [ ] Add Slack webhook support (POST to `SLACK_WEBHOOK_URL`)
- [ ] Trigger alert when finding has `severity: "high"`
- [ ] Format alert message in Markdown
- [ ] Read webhook URLs from environment variables

---

### Issue #9: Backend — Agent authentication
**Labels:** `backend`, `p1-important`
**Assignee:** Member 4 (Backend)

- [ ] Add API key validation on `POST /api/scan`
- [ ] Agents must send `X-API-Key` header
- [ ] Store valid keys in a config file or environment variable
- [ ] Return `401 Unauthorized` for invalid/missing keys

---

### Issue #10: Backend — Deploy to VPS
**Labels:** `backend`, `infra`, `p0-critical`
**Assignee:** Member 4 (Backend)

- [ ] Set up Python 3.9+ on VPS
- [ ] Install dependencies: `pip install fastapi uvicorn`
- [ ] Run backend with `uvicorn main:app --host 0.0.0.0 --port 8000`
- [ ] Configure firewall to allow port 8000
- [ ] (Optional) Set up systemd service for auto-restart
- [ ] Share VPS IP with all team members

---

## Milestone: Phase 3 — Dashboard (Week 2-3)

### Issue #11: Dashboard — HTML structure — `dashboard/index.html`
**Labels:** `frontend`, `p0-critical`
**Assignee:** Member 5 (Frontend)

- [ ] Create responsive layout with TailwindCSS CDN
- [ ] Add header with ARGUS logo/title
- [ ] Add stats bar (total hosts, total findings, high-risk count)
- [ ] Add hosts table: `hostname`, `os`, `last seen`, `findings count`, `risk level`
- [ ] Add findings detail panel (expandable per host)
- [ ] Add auto-refresh indicator

---

### Issue #12: Dashboard — API integration — `dashboard/app.js`
**Labels:** `frontend`, `p0-critical`
**Assignee:** Member 5 (Frontend)

- [ ] Fetch data from `GET /api/hosts` on page load
- [ ] Fetch data from `GET /api/stats` on page load
- [ ] Render hosts table dynamically
- [ ] Render findings per host on row click
- [ ] Add 30-second auto-refresh
- [ ] Handle API errors gracefully (show error message)

---

### Issue #13: Dashboard — Risk severity styling
**Labels:** `frontend`, `p1-important`
**Assignee:** Member 5 (Frontend)

- [ ] Color-code risk levels: 🔴 High (red), 🟡 Medium (yellow), 🟢 Low (green)
- [ ] Add severity badges in the findings table
- [ ] Add visual indicator for hosts with high-risk findings
- [ ] Sort hosts by risk level (highest first)

---

### Issue #14: Dashboard — Responsive design
**Labels:** `frontend`, `p1-important`
**Assignee:** Member 5 (Frontend)

- [ ] Make table responsive on mobile (horizontal scroll or card layout)
- [ ] Test on different screen sizes
- [ ] Add dark mode toggle (optional)

---

## Milestone: Phase 4 — Integration & Testing (Week 3-4)

### Issue #15: End-to-end integration test
**Labels:** `p0-critical`
**Assignee:** @KiZINnO (Project Lead)

- [ ] All 3 agents send data to the backend successfully
- [ ] Backend stores data in SQLite correctly
- [ ] Dashboard displays all 3 hosts with findings
- [ ] Discord/Slack alert fires on high-risk finding
- [ ] Test from all 3 OS machines simultaneously

---

### Issue #16: Error handling & edge cases
**Labels:** `p1-important`
**Assignee:** All team members

- [ ] Agent handles backend being offline (retry or fail gracefully)
- [ ] Agent handles permission denied (non-admin on Windows)
- [ ] Backend handles malformed JSON (return 400)
- [ ] Backend handles duplicate submissions (idempotent)
- [ ] Dashboard handles empty database (show "no data" message)

---

### Issue #17: Documentation update
**Labels:** `infra`, `p1-important`
**Assignee:** @KiZINnO (Project Lead)

- [ ] Update `README.md` with final setup instructions
- [ ] Add troubleshooting section
- [ ] Add screenshots of dashboard
- [ ] Update `presentation.md` with demo screenshots

---

## Milestone: Phase 5 — Future Enhancements (Post-MVP)

### Issue #18: Expand detection — More Local LLMs
**Labels:** `agent`, `p2-nice-to-have`

- [ ] Detect llama.cpp / llamafile
- [ ] Detect LM Studio
- [ ] Detect vLLM

---

### Issue #19: Expand detection — More AI IDE Tools
**Labels:** `agent`, `p2-nice-to-have`

- [ ] Detect GitHub Copilot configs
- [ ] Detect Codeium / Windsurf
- [ ] Detect Continue.dev

---

### Issue #20: Blocklist configuration
**Labels:** `agent`, `backend`, `p2-nice-to-have`

- [ ] Agent reads `config/blocklist.json` at startup
- [ ] Only scan for items in the blocklist
- [ ] Backend accepts custom blocklist per host

---

### Issue #21: Historical trend dashboard
**Labels:** `frontend`, `p2-nice-to-have`

- [ ] Add chart showing findings over time
- [ ] Add chart showing new hosts over time
- [ ] Add date range filter

---

### Issue #22: Docker deployment
**Labels:** `infra`, `p2-nice-to-have`

- [ ] Create `Dockerfile` for backend
- [ ] Create `docker-compose.yml` with backend + SQLite volume
- [ ] Add deployment instructions to README
