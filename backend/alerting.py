import os

import httpx

DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL", "")
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")


def _format_message(hostname: str, findings: list[dict]) -> str:
    lines = [f"**🚨 High-risk Shadow AI detected on `{hostname}`**", ""]
    for f in findings:
        lines.append(f"- **{f['name']}** ({f['category']}): {f['evidence']}")
    return "\n".join(lines)


def _send_discord(message: str) -> None:
    httpx.post(DISCORD_WEBHOOK_URL, json={"content": message}, timeout=5)


def _send_slack(message: str) -> None:
    httpx.post(SLACK_WEBHOOK_URL, json={"text": message}, timeout=5)


def send_high_risk_alert(hostname: str, findings: list[dict]) -> None:
    """Fire Discord/Slack webhook alerts for high-severity findings.

    Best-effort: webhook failures are swallowed so a flaky Discord/Slack
    endpoint can never fail scan ingestion. No-ops if neither webhook
    env var is set.
    """
    high_findings = [f for f in findings if f["severity"] == "high"]
    if not high_findings:
        return

    message = _format_message(hostname, high_findings)

    if DISCORD_WEBHOOK_URL:
        try:
            _send_discord(message)
        except httpx.HTTPError:
            pass

    if SLACK_WEBHOOK_URL:
        try:
            _send_slack(message)
        except httpx.HTTPError:
            pass
