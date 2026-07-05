# Project ARGUS — Proposal by @KiZINnO

## Gist

Project ARGUS (**A**I **R**isk & **G**overnance **U**nauthorized-endpoint **S**canner) is a decentralized security framework designed to discover, track, and alert on "Shadow AI." It utilizes lightweight client-side agents to scan remote endpoints for unauthorized AI tools and local LLMs, feeding telemetry to a central cloud aggregator for real-time risk visualization and alerting.

## Story

As a dedicated security analyst spending days auditing endpoints and maintaining infrastructure visibility, the daily routine centers on eliminating defensive blind spots. A real moment of friction occurs when performing a routine audit and discovering that an engineer has silently spun up an unauthorized local LLM instance or connected an unvetted AI coding agent directly to their development environment. Project ARGUS bridges this exact gap, fitting into the analyst's daily workflow by automatically identifying these rogue AI assets and transforming hidden risks into clear, actionable security alerts.

## Why

* **Solves a Modern Threat:** Shadow AI is one of the most critical and relevant attack surfaces in the modern cybersecurity landscape.
* **Demonstrates Full-Stack Security Engineering:** This project goes beyond a simple script. It proves the ability to build decentralized client-server architecture, handle telemetry aggregation, and build a unified threat dashboard.
* **Perfect for Distributed Teams:** Because the endpoint agents report back to a central Cloud VPS over the internet, this project is effortlessly tested by group members living in completely different geographical locations.
* **Highly Actionable:** It translates raw endpoint data into actionable security intelligence (real-time alerts).

## Why Not

* **Cross-Platform Complexity:** Building an endpoint agent that works flawlessly across Windows, macOS, and Linux requires handling varying file system permissions and process management APIs.
* **False Positives:** Relying on file paths and basic AST (Abstract Syntax Tree) parsing might occasionally flag legitimate, approved software as "Shadow AI" if not tuned correctly.
* **Privacy and Permissions:** To effectively scan a machine, the agent requires elevated local permissions (to read processes and developer directories). During testing, group members must ensure the scanner only targets specific, safe directories to protect personal privacy.

## Tech Spec

* **Endpoint Agent (The "Eyes"):** A lightweight, standalone Python script (compiled to an executable via PyInstaller or run natively).
* Uses `psutil` to scan running local processes and open ports (e.g., checking port `11434` for Ollama).
* Crawls user directories (`~/.cursor`, `~/.config`) for unauthorized IDE manifests.
* Scans project directories for unapproved AI libraries (e.g., `import openai`, `import langchain`).


* **Data Transport:** The agent bundles findings into a structured JSON payload and securely transmits it via TLS (HTTPS POST request) to the central aggregator.
* **Aggregator Backend (The "Brain"):** A lightweight REST API built with FastAPI or Flask, hosted on a central Cloud VPS (e.g., DigitalOcean or AWS EC2).
* **Database:** SQLite to store endpoint states, timestamps, and specific Shadow AI findings.
* **Web Dashboard:** A clean, responsive UI built with HTML/TailwindCSS and vanilla JS that queries the backend to display a real-time table of all infected enterprise endpoints, complete with risk severity scores.
* **Alerting Engine:** Native integration with Discord or Slack webhooks. When the backend receives a "High-Risk" flag (e.g., a locally exposed MCP server), it instantly pushes an alert to the team channel.

## Definition of Done

* [ ] **Agent Scanning:** The endpoint agent successfully runs locally and accurately detects at least 3 distinct Shadow AI signatures (running processes, configuration files, and code dependencies).
* [ ] **Data Transmission:** The agent successfully generates a JSON payload and transmits it to the remote Cloud VPS without timing out or crashing.
* [ ] **Backend Ingestion:** The Aggregator API successfully receives the data, authenticates the payload, and writes it to the database.
* [ ] **Dashboard Visualization:** The web dashboard displays a live, updated list of at least 3 different remote machines, showing what Shadow AI tools were found on each.
* [ ] **Real-Time Alerting:** A Slack or Discord webhook successfully fires off an alert formatted in Markdown immediately upon discovering a high-risk asset.
