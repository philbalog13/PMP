# THM_LIKE_IMPLEMENTATION_TODO.md

## Purpose
Persistent execution tracker for the TryHackMe-like CTF migration.
Update this file at every meaningful step so work can resume exactly after context loss.

## Request Snapshot
Implement the full TryHackMe-like plan on PMP infra with:
- Hybrid isolation
- Web AttackBox now, VPN later
- 20 concurrent sessions target
- PMP-native orchestration

## Locked Decisions
- Isolation model: `hybrid`
- Access mode: `web_attackbox_now`
- Concurrency target: `20`
- Orchestrator model: `pmp_native`

## Current Global Status
- Start time: `2026-02-24`
- Last checkpoint: `Phase 7 completed with live student accounts georges/bibi`
- Repo mutation state for THM feature: `phase plan completed`
- Critical note: runtime stack has been rebuilt with lab services and phase-7 acceptance checks are passing.

## Phase Order Policy (must follow)
1. Complete Phase 0
2. Complete Phase 1
3. Continue with Phase 2+

No further Phase 2+ implementation should be done until Phase 0 and Phase 1 are checked.

## Execution Checklist

### Phase 0 - Baseline / guardrails
- [x] Snapshot current CTF behavior assumptions in docs
- [x] Define MVP SLO constants in config/docs
- [x] Add baseline metric placeholders (start/stop/error rates)

### Phase 1 - Control plane
- [x] Add `lab-orchestrator` service (Node/TS)
- [x] Add Docker Socket Proxy service
- [x] Remove `docker.sock` mount from shared attackbox service
- [x] Implement session lifecycle states: `PROVISIONING/RUNNING/STOPPED/EXPIRED/FAILED`
- [x] Enforce active session cap = 20

### Phase 2 - Data model
- [x] Create migration `023_ctf_lab_sessions.sql`
- [x] Add tables:
  - [x] `learning.ctf_lab_templates`
  - [x] `learning.ctf_lab_tasks`
  - [x] `learning.ctf_lab_sessions`
  - [x] `learning.ctf_lab_instances`
  - [x] `learning.ctf_lab_events`
- [x] Seed 5 room templates: `PAY-001 PCI-001 SOC-001 API-001 DORA-001`
- [x] Implement /28 subnet allocation from `10.60.0.0/16`

### Phase 3 - Backend API integration
- [x] Add lab session service in API Gateway
- [x] Integrate session provisioning into `POST /api/ctf/challenges/:code/start`
- [x] Add `GET /api/ctf/challenges/:code/session`
- [x] Add `POST /api/ctf/sessions/:sessionId/extend`
- [x] Add `POST /api/ctf/sessions/:sessionId/reset`
- [x] Add `DELETE /api/ctf/sessions/:sessionId`
- [x] Add internal proxy-target endpoint for lab-access-proxy
- [x] Add expiry cleanup + reconciliation jobs

### Phase 4 - Frontend integration
- [x] Introduce `CtfLabSession` + `CtfTask` types
- [x] Replace static machine IP usage with dynamic session `machineIp`
- [x] Show session timer + controls (start/reset/extend/terminate)
- [x] Update terminal page to use session-specific attackbox path
- [x] Keep existing flag submission compatibility

### Phase 5 - Infra routing and services
- [x] Add `lab-access-proxy` service with short JWT validation
- [x] Add `/lab/*` routing (Next rewrites + Nginx)
- [x] Wire API gateway internal auth secret for proxy target lookup
- [x] Add required env vars (`LAB_*`, internal secrets)

### Phase 6 - Room packaging (5 rooms)
- [x] Add challenge seeds for `PAY-001 PCI-001 SOC-001 API-001 DORA-001`
- [x] Add/seed task-based room metadata
- [x] Add container images/manifests for machine-backed rooms

### Phase 7 - Verification
- [x] TypeScript compile checks (`api-gateway`, `lab-orchestrator`, `lab-access-proxy`, `portal`)
- [x] Basic API smoke checks for new endpoints
- [x] Session lifecycle test (start/extend/reset/terminate)
- [x] Isolation smoke test (two users same room)
- [x] Document known gaps

## Work Log (append-only)
- `2026-02-24` Created tracker file before implementation mutations.
- `2026-02-24` Verified migration 023 does not exist yet (safe to create cleanly).
- `2026-02-24` Added `backend/api-gateway/src/database/migrations/023_ctf_lab_sessions.sql`.
- `2026-02-24` Updated tracker policy: enforce Phase 0 and Phase 1 completion before continuing Phase 2+.
- `2026-02-24` Phase 0 baseline added (`docs/ctf/THM_LAB_BASELINE.md`) + env SLO/session vars in `.env.example`.
- `2026-02-24` Added placeholder lab metrics service (`backend/api-gateway/src/services/ctfLabMetrics.service.ts`).
- `2026-02-24` Phase 1 implemented: `backend/lab-orchestrator/*` + socket proxy wiring and attackbox hardening in `docker-compose*.yml`.
- `2026-02-24` Session lifecycle + capacity guard implemented in `backend/api-gateway/src/services/ctfLab.service.ts`.
- `2026-02-24` CTF controller/routes wired for lab sessions (`start/get/extend/reset/terminate` + resolve access).
- `2026-02-24` Added reconciliation logic and stale provisioning cleanup in `backend/api-gateway/src/services/ctfLab.service.ts`.
- `2026-02-24` Added `lab-access-proxy` service (`backend/lab-access-proxy/*`) with JWT validation and API gateway internal resolve flow.
- `2026-02-24` Wired `/lab/*` routing across `frontend/portal/next.config.ts`, `nginx/nginx.conf`, and `docker-compose*.yml`.
- `2026-02-24` Updated student CTF UI for session-aware machine controls and timer in `frontend/portal/src/app/student/ctf/[code]/page.tsx`.
- `2026-02-24` Updated terminal page to consume session `attackboxPath` in `frontend/portal/src/app/student/ctf/[code]/terminal/page.tsx`.
- `2026-02-24` Added THM lab session frontend types in `frontend/portal/src/lib/ctf-lab.ts`.
- `2026-02-24` Validation run: `api-gateway`, `lab-access-proxy`, and targeted `portal` lint checks are passing.
- `2026-02-24` Added lab proxy token transport for iframe/new-tab access (`access_token` query validated as JWT in `backend/lab-access-proxy/src/index.ts`).
- `2026-02-24` Added THM room challenge seeds in `backend/api-gateway/src/data/ctfChallenges.ts` and dynamic flag support in `backend/api-gateway/src/services/ctfFlag.service.ts`.
- `2026-02-24` Added AttackBox catalog entries for THM rooms in `docker/ctf-attackbox/ctf-data/all-challenges.ts`.
- `2026-02-24` Added room packaging under `labs/rooms/*` with manifests, compose files, vulnerable services, and build scripts.
- `2026-02-24` Added metadata migration `024_ctf_lab_room_packaging.sql` for enriched template/task payloads.
- `2026-02-24` Added validation tooling: `scripts/ctf/run-thm-session-lifecycle-smoke.js`, `scripts/ctf/run-thm-isolation-smoke.js`, and `docs/ctf/THM_LAB_ACCEPTANCE.md`.
- `2026-02-24` Validation pass: `api-gateway` lint OK, Node syntax checks for new smoke scripts OK, python compile checks for room service apps OK.
- `2026-02-24` Validation pass: all room compose files (`PAY-001`, `PCI-001`, `API-001`, `DORA-001`) pass `docker compose config -q`.
- `2026-02-24` Created real student accounts via auth API: `georges@pmp.local` and `bibi@pmp.local` (`ROLE_ETUDIANT`, `ACTIVE`).
- `2026-02-24` Applied runtime DB updates on active stack: migrations `023_ctf_lab_sessions.sql`, `024_ctf_lab_room_packaging.sql`, and seeded 5 THM challenges + guided steps + hints.
- `2026-02-24` Rebuilt/redeployed runtime services: `api-gateway`, `lab-orchestrator`, `lab-access-proxy` via `docker compose up -d --build`.
- `2026-02-24` Phase 7 live checks passed with `georges`/`bibi`:
  - API smoke: `/api/ctf/challenges`, `/api/ctf/challenges/PAY-001/session`, `/api/ctf/challenges/PAY-001/start`, `/api/ctf/challenges/PAY-001`.
  - Lifecycle smoke script: `scripts/ctf/run-thm-session-lifecycle-smoke.js` passed.
  - Isolation smoke script: `scripts/ctf/run-thm-isolation-smoke.js` passed (distinct session IDs/codes/IPs).

## Resume Instructions (for future context)
1. Read this file first.
2. All planned phases are complete; continue with regression checks or next feature scope.
3. After each completed sub-step:
   - mark checkbox
   - append one line to Work Log with timestamp + changed files.
4. Never skip Work Log updates.
