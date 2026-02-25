# THM-like Lab Acceptance

This document defines acceptance checks for THM-like PMP rooms.

## Preconditions
- PMP stack running with:
  - api-gateway
  - lab-orchestrator
  - lab-access-proxy
  - portal
- Migration `023_ctf_lab_sessions.sql` applied.
- At least one student token (`PMP_TOKEN`) for lifecycle tests.
- Two student tokens (`PMP_TOKEN_A`, `PMP_TOKEN_B`) for isolation tests.

## Session Lifecycle Smoke
Command:
```bash
PMP_BASE_URL=http://localhost:8000 PMP_TOKEN=<student-jwt> CHALLENGE_CODE=PAY-001 node scripts/ctf/run-thm-session-lifecycle-smoke.js
```
Expected:
- start returns sessionId/sessionCode/machineIp
- get session returns RUNNING or PROVISIONING then RUNNING
- extend succeeds once when allowed
- reset creates a fresh session
- terminate returns STOPPED

## Isolation Smoke (Two Students)
Command:
```bash
PMP_BASE_URL=http://localhost:8000 PMP_TOKEN_A=<jwt-a> PMP_TOKEN_B=<jwt-b> CHALLENGE_CODE=PAY-001 node scripts/ctf/run-thm-isolation-smoke.js
```
Expected:
- session ids differ
- session codes differ
- machineIp differs between students

## Room Packaging Local Checks
Build images:
```bash
bash labs/rooms/scripts/build-images.sh
```

Per-room local launch:
```bash
docker compose -f labs/rooms/PAY-001/docker-compose.yml up --build
```

## Known Gaps (Current)
- `lab-access-proxy` currently resolves to shared attackbox endpoint (session-gated by token/session mapping), not yet dedicated attackbox container per session.
- SOC-001 task grading logic is still platform-flag oriented; richer per-task answer grading can be added in a later increment.
- Full load test target (20 parallel starts) should be run on a host matching production CPU/RAM profile.
