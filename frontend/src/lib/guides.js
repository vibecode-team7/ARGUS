import {
  Download,
  ShieldCheck,
  BarChart3,
  Server,
  KeyRound,
  Bell,
} from "lucide-react";

const guides = [
  {
    id: "getting-started",
    title: "Getting Started with ARGUS",
    description:
      "Learn what ARGUS does and how to check your endpoint's security status in the dashboard.",
    tags: ["client"],
    icon: ShieldCheck,
    content: [
      {
        heading: "What is ARGUS?",
        body: "ARGUS (AI Risk & Governance Unauthorized-endpoint Scanner) detects unauthorized AI tools running on enterprise endpoints. It monitors for local LLMs, AI-powered IDEs, and MCP servers.",
      },
      {
        heading: "How to Access the Dashboard",
        body: "After your administrator provides you with a read-only API key, click the Login button and enter it. You'll gain access to the dashboard showing all scanned endpoints and their findings.",
      },
      {
        heading: "Understanding the Dashboard",
        body: "The dashboard displays an overview of all hosts, severity distribution of findings, and recent activity. Use the sidebar to navigate between Hosts, Findings, and Trends views.",
      },
    ],
  },
  {
    id: "understanding-findings",
    title: "Understanding Your Findings",
    description:
      "How to read severity levels, categories, and evidence for each detected item.",
    tags: ["client"],
    icon: BarChart3,
    content: [
      {
        heading: "Severity Levels",
        body: "Findings are classified as High (unauthorized AI tools actively running), Medium (AI tools installed but not currently active), or Low (configuration files or remnants detected).",
      },
      {
        heading: "Categories",
        body: "Local LLM — tools like Ollama running local language models. AI IDE — editors with AI features like Cursor or GitHub Copilot. MCP Server — Model Context Protocol configuration files.",
      },
      {
        heading: "Reading Evidence",
        body: "Each finding includes human-readable evidence describing exactly what was detected, including file paths, process IDs, and running ports where applicable.",
      },
    ],
  },
  {
    id: "agent-installation",
    title: "Agent Installation",
    description:
      "Step-by-step guide to install and run the ARGUS agent on your machine.",
    tags: ["client"],
    icon: Download,
    content: [
      {
        heading: "Prerequisites",
        body: "Python 3.10 or later must be installed on your machine. Your administrator will provide you with a write API key and the backend URL.",
      },
      {
        heading: "Installation Steps",
        body: "1. Download the agent script for your OS (Linux, macOS, or Windows). 2. Install dependencies: pip install requests psutil. 3. Configure the agent with your API key and backend URL. 4. Run the agent: python agent_<your_os>.py",
      },
      {
        heading: "Scheduling Regular Scans",
        body: "For continuous monitoring, set up a cron job (Linux/macOS) or Task Scheduler (Windows) to run the agent periodically. A scan every 30 minutes is recommended.",
      },
    ],
  },
  {
    id: "backend-setup",
    title: "Backend Setup",
    description:
      "Deploy the FastAPI backend with Docker and configure the environment.",
    tags: ["admin"],
    icon: Server,
    content: [
      {
        heading: "Docker Deployment",
        body: "Pull the latest image: docker pull <your-user>/argus-backend:latest. Run with: docker run -d -p 8000:8000 -v argus-data:/app/data -v ~/argus-config/.env:/app/.env:ro --restart unless-stopped <your-user>/argus-backend:latest",
      },
      {
        heading: "Environment Configuration",
        body: "Create a .env file with your API keys: ARGUS_KEY_TEST, ARGUS_KEY_LINUX, ARGUS_KEY_MACOS, ARGUS_KEY_WINDOWS (all write role), and ARGUS_KEY_DASHBOARD (read role). Use the .env.example as a template.",
      },
      {
        heading: "First-Time Setup",
        body: "After the container starts, seed the API keys: docker exec <container-id> python seed.py. Verify with: curl http://localhost:8000/health",
      },
    ],
  },
  {
    id: "api-key-management",
    title: "Managing API Keys",
    description:
      "How to create, rotate, and manage read/write API keys for agents and dashboards.",
    tags: ["admin"],
    icon: KeyRound,
    content: [
      {
        heading: "Key Roles",
        body: "Write keys are for agent submissions (POST /api/scan). Read keys are for dashboard access (GET /api/*). Never share write keys with dashboard users.",
      },
      {
        heading: "Creating Keys",
        body: "Generate a secure random key, then add its SHA-256 hash to the api_keys table with the appropriate role. Use the seed.py script to automate this from your .env file.",
      },
      {
        heading: "Key Rotation",
        body: "To rotate a key: 1. Generate a new key. 2. Update the .env file. 3. Re-run seed.py. 4. Update the agent or dashboard configuration. 5. Deactivate the old key in the database.",
      },
    ],
  },
  {
    id: "alert-configuration",
    title: "Alert Configuration",
    description:
      "Set up Discord and Slack webhook alerts for real-time notification of new findings.",
    tags: ["admin"],
    icon: Bell,
    content: [
      {
        heading: "Discord Webhooks",
        body: "Create a webhook in your Discord server settings (Integrations → Webhooks). Copy the webhook URL and add it to your backend configuration.",
      },
      {
        heading: "Slack Webhooks",
        body: "Create an incoming webhook in your Slack workspace (Apps → Incoming Webhooks). Copy the webhook URL and add it to your backend configuration.",
      },
      {
        heading: "Alert Triggers",
        body: "Alerts are sent when new high-severity findings are ingested via POST /api/scan. Each alert includes the hostname, finding details, and severity level.",
      },
    ],
  },
];

export default guides;
