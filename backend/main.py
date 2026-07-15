import os
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload

from database import init_db, get_session, Scan, Finding
from auth import verify_write_key, verify_read_key
from alerting import send_high_risk_alert

app = FastAPI(title="ARGUS Backend", version="0.1.0")

# CHANGED: CORS origins now read from env variable instead of wildcard "*"
# In production (Docker with nginx proxy), CORS is never triggered.
# For local dev, allow Vite dev server. For DuckDNS, add domain to CORS_ORIGINS.
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


# ── Pydantic models ──────────────────────────────────────────────────

class FindingIn(BaseModel):
    category: str
    name: str
    severity: str
    status: str
    evidence: str
    pid: int | None = None
    port: int | None = None
    path: str | None = None
    user: str | None = None
    detected_at: datetime


class ScanIn(BaseModel):
    hostname: str
    os: str
    os_version: str
    kernel: str | None = None
    agent_version: str
    scanned_at: datetime
    uptime_seconds: int | None = None
    ip_address: str | None = None
    findings: list[FindingIn]


# ── Routes ──────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/scan", status_code=201)
def ingest_scan(payload: ScanIn, api_key_id: int = Depends(verify_write_key)):
    now = datetime.now(timezone.utc)

    scan = Scan(
        hostname=payload.hostname,
        os=payload.os,
        os_version=payload.os_version,
        kernel=payload.kernel,
        agent_version=payload.agent_version,
        scanned_at=payload.scanned_at,
        uptime_seconds=payload.uptime_seconds,
        ip_address=payload.ip_address,
        api_key_id=api_key_id,
        received_at=now,
    )

    with get_session() as session:
        session.add(scan)
        session.flush()

        for f in payload.findings:
            finding = Finding(
                scan_id=scan.id,
                category=f.category,
                name=f.name,
                severity=f.severity,
                status=f.status,
                evidence=f.evidence,
                pid=f.pid,
                port=f.port,
                path=f.path,
                user=f.user,
                detected_at=f.detected_at,
            )
            session.add(finding)

        session.commit()
        session.refresh(scan)

    detected_findings = [
        {"name": f.name, "category": f.category, "severity": f.severity, "evidence": f.evidence}
        for f in payload.findings
        if f.status == "detected"
    ]
    send_high_risk_alert(payload.hostname, detected_findings)

    return {"id": scan.id, "hostname": scan.hostname, "findings_count": len(payload.findings)}


@app.get("/api/findings")
def list_findings(
    _: int = Depends(verify_read_key),
    hostname: str | None = Query(None),
    severity: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    with get_session() as session:
        q = select(Scan).order_by(desc(Scan.received_at))

        if hostname:
            q = q.where(Scan.hostname == hostname)
        if severity:
            q = q.join(Scan.findings).where(Finding.severity == severity).distinct()

        total = session.execute(select(func.count()).select_from(q.subquery())).scalar()
        scans = session.execute(q.offset(offset).limit(limit)).scalars().all()

        results = []
        for scan in scans:
            results.append({
                "id": scan.id,
                "hostname": scan.hostname,
                "os": scan.os,
                "os_version": scan.os_version,
                "kernel": scan.kernel,
                "agent_version": scan.agent_version,
                "scanned_at": scan.scanned_at.isoformat(),
                "uptime_seconds": scan.uptime_seconds,
                "ip_address": scan.ip_address,
                "received_at": scan.received_at.isoformat(),
                "findings": [
                    {
                        "id": f.id,
                        "category": f.category,
                        "name": f.name,
                        "severity": f.severity,
                        "status": f.status,
                        "evidence": f.evidence,
                        "pid": f.pid,
                        "port": f.port,
                        "path": f.path,
                        "user": f.user,
                        "detected_at": f.detected_at.isoformat(),
                    }
                    for f in scan.findings
                ],
            })

    return {"total": total, "offset": offset, "limit": limit, "scans": results}


@app.get("/api/findings/{scan_id}")
def get_finding(scan_id: int, _: int = Depends(verify_read_key)):
    with get_session() as session:
        scan = session.execute(
            select(Scan)
            .where(Scan.id == scan_id)
            .options(selectinload(Scan.findings))
        ).scalar_one_or_none()

        if scan is None:
            raise HTTPException(status_code=404, detail="Scan not found")

        result = {
            "id": scan.id,
            "hostname": scan.hostname,
            "os": scan.os,
            "os_version": scan.os_version,
            "kernel": scan.kernel,
            "agent_version": scan.agent_version,
            "scanned_at": scan.scanned_at.isoformat(),
            "uptime_seconds": scan.uptime_seconds,
            "ip_address": scan.ip_address,
            "received_at": scan.received_at.isoformat(),
            "findings": [
                {
                    "id": f.id,
                    "category": f.category,
                    "name": f.name,
                    "severity": f.severity,
                    "status": f.status,
                    "evidence": f.evidence,
                    "pid": f.pid,
                    "port": f.port,
                    "path": f.path,
                    "user": f.user,
                    "detected_at": f.detected_at.isoformat(),
                }
                for f in scan.findings
            ],
        }

    return result


@app.get("/api/hosts")
def list_hosts(_: int = Depends(verify_read_key)):
    with get_session() as session:
        subq = (
            select(
                Scan.hostname,
                Scan.os,
                Scan.ip_address,
                Scan.received_at,
                func.row_number()
                .over(partition_by=Scan.hostname, order_by=desc(Scan.received_at))
                .label("rn"),
            )
            .subquery()
        )

        latest = session.execute(
            select(subq).where(subq.c.rn == 1)
        ).all()

        results = []
        for row in latest:
            finding_counts = session.execute(
                select(
                    Finding.severity,
                    func.count(Finding.id),
                )
                .join(Scan, Finding.scan_id == Scan.id)
                .where(Scan.hostname == row.hostname)
                .group_by(Finding.severity)
            ).all()

            severity_map = {s: c for s, c in finding_counts}
            results.append({
                "hostname": row.hostname,
                "os": row.os,
                "ip_address": row.ip_address,
                "last_seen": row.received_at.isoformat(),
                "high": severity_map.get("high", 0),
                "medium": severity_map.get("medium", 0),
                "low": severity_map.get("low", 0),
                "total_findings": sum(severity_map.values()),
            })

    return results


@app.get("/api/stats")
def stats(_: int = Depends(verify_read_key)):
    with get_session() as session:
        total_hosts = session.execute(
            select(func.count(func.distinct(Scan.hostname)))
        ).scalar()

        total_findings = session.execute(
            select(func.count(Finding.id))
        ).scalar()

        high = session.execute(
            select(func.count(Finding.id)).where(Finding.severity == "high")
        ).scalar()

        medium = session.execute(
            select(func.count(Finding.id)).where(Finding.severity == "medium")
        ).scalar()

        low = session.execute(
            select(func.count(Finding.id)).where(Finding.severity == "low")
        ).scalar()

    return {
        "total_hosts": total_hosts,
        "total_findings": total_findings,
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": low,
    }


@app.get("/api/trends")
def trends(
    _: int = Depends(verify_read_key),
    days: int = Query(30, ge=1, le=365),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    since_naive = since.replace(tzinfo=None)

    with get_session() as session:
        findings_rows = session.execute(
            select(Finding.detected_at, Finding.severity)
            .where(Finding.detected_at >= since_naive)
        ).all()

        first_seen_rows = session.execute(
            select(Scan.hostname, func.min(Scan.received_at))
            .group_by(Scan.hostname)
        ).all()

    findings_by_day = defaultdict(lambda: {"high": 0, "medium": 0, "low": 0})
    for detected_at, severity in findings_rows:
        day = detected_at.date().isoformat()
        if severity in findings_by_day[day]:
            findings_by_day[day][severity] += 1

    new_hosts_by_day = defaultdict(int)
    for _hostname, first_received in first_seen_rows:
        if first_received >= since_naive:
            day = first_received.date().isoformat()
            new_hosts_by_day[day] += 1

    days_range = [
        (since_naive.date() + timedelta(days=i)).isoformat()
        for i in range(days + 1)
    ]

    findings_series = [
        {"date": day, **findings_by_day.get(day, {"high": 0, "medium": 0, "low": 0})}
        for day in days_range
    ]
    hosts_series = [
        {"date": day, "new_hosts": new_hosts_by_day.get(day, 0)}
        for day in days_range
    ]

    return {"days": days, "findings": findings_series, "new_hosts": hosts_series}
