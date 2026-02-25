# THM-Like Lab Baseline and SLO

## Scope
This baseline records the starting point before full THM-like room/session orchestration.
It is used as the reference to measure migration progress and regressions.

## Current Baseline (before full migration)
- Room lifecycle is CTF challenge-driven (`/api/ctf/challenges/:code/start`).
- AttackBox exists as a shared service (`ctf-attackbox`).
- Machine IP in student room UI is currently derived from mapping and/or challenge context.
- Flag validation is platform-side (dynamic HMAC-capable), not VM-side.
- CTF user progress, hints, submissions, and leaderboard are already persisted.

## Target Operating Model
- One active lab session per student per room challenge.
- Session state model:
  - `PROVISIONING`
  - `RUNNING`
  - `STOPPED`
  - `EXPIRED`
  - `FAILED`
- Session TTL default: 120 minutes.
- Single extension: +60 minutes.
- Global active session cap: 20.
- Per-session network allocation: `/28` from `10.60.0.0/16`.
- Web AttackBox per session path routed under `/lab/...`.

## MVP SLO Targets
- `start machine p95 < 25s` (`LAB_SLO_START_P95_MS=25000`)
- `stop machine p95 < 20s` (`LAB_SLO_STOP_P95_MS=20000`)
- Isolation success between two concurrent students on same room: `100%`.

## Baseline Metrics Placeholders
The migration tracks these metrics across the API Gateway + orchestration path:
- `ctf_lab_start_total`
- `ctf_lab_start_failed_total`
- `ctf_lab_stop_total`
- `ctf_lab_stop_failed_total`
- `ctf_lab_start_duration_ms`
- `ctf_lab_stop_duration_ms`
- `ctf_lab_active_sessions`

## Validation Plan
1. Capture pre-migration values from existing runtime (response time + errors).
2. Compare against SLO targets after session orchestration is enabled.
3. Keep this file updated when SLO or lifecycle rules change.
