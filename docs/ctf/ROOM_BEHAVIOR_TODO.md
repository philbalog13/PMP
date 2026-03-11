# Room Behavior TODO (Room-by-Room)

Last Updated: 2026-02-25
Scope: Track room behavior work with persistent status, one room at a time.

## Global Workflow
- [x] Create persistent TODO tracking file.
- [x] Establish `TASK_VALIDATION` workflow capability (backend + frontend).
- [x] Apply first full implementation on Room 1 (`PAY-001`).
- [x] Roll out the same structure to remaining rooms after spec intake, one by one.

## Room 1 - PAY-001
Status: Implementation complete, verification pending.

1. Backend
- [x] Expose `workflowMode` in challenge detail.
- [x] Add per-step endpoint `POST /api/ctf/challenges/:code/step/:number/submit`.
- [x] Add PAY-001 step validators (5 tasks).
- [x] Block bypass routes (`/step/next` and direct `/submit`) for task-validation rooms.

2. Content
- [x] Replace PAY-001 guided steps with final task instructions.
- [x] Replace PAY-001 hints with room-specific hints.
- [x] Ensure custom guided steps/hints are preserved by normalization.

3. Frontend
- [x] Add answer input + `Verify` on active task.
- [x] Show per-task validation feedback.
- [x] Auto-advance after correct answer.
- [x] Hide final flag card when `workflowMode = TASK_VALIDATION`.
- [x] Keep legacy flow for non-task-validation rooms.

4. Build/Deploy
- [x] Build `api-gateway`.
- [x] Build `portal`.
- [x] Rebuild and restart Docker services (`api-gateway`, `portal`).

5. Verification
- [x] Endpoint protection/availability check completed.
- [ ] End-to-end UI check on PAY-001 tasks 1..5.
- [ ] Completion check for leaderboard/unlocks in real student flow.

## Room 2 - PCI-001
Status: Implemented. Verification pending in real student flow.

1. Validation Map (target behavior)
- [x] Task 1 (recon search GET params): accept `1` and optionally parameter name `q`.
- [x] Task 2 (SQLi db name): expected `ecommerce_db`.
- [x] Task 3 (user flag from `cards`): expected `PMP{pci_dss_weak_sql_5f3a2}`.
- [x] Task 4 (`/etc/passwd` UID 0 user): expected `root`.
- [x] Task 5 (PCI DSS forbidden column): expected `cvv` or `cvv2`.
- [x] Task 6 (root flag): expected `PMP{pci_dss_root_violation_8c4e7}`.
- [x] Task 7 (synthesis): keyword validation for SQL injection + CVV storage + weak password/clear secrets + PCI DSS non-compliance.

2. Implementation Checklist
- [x] Backend: add PCI-001 task validators (7 tasks).
- [x] Content: replace PCI-001 steps/hints with final room text.
- [x] Frontend: task-validation mode behavior reuse (no final flag card).
- [ ] Verification: end-to-end student flow + unlock/leaderboard side effects.

## Room 3 - SOC-001
Status: Implemented. Verification pending in real student flow.

1. Validation Map (target behavior)
- [x] Task 1 (`email1.eml` From): expected `support@banque-securite.com`.
- [x] Task 2 (`Return-Path`): expected `phisher@malicious.net`.
- [x] Task 3 (hidden URL): expected `http://192.168.1.105/fake-login`.
- [x] Task 4 (spoofed phone number): expected `01 23 45 67 89` (normalized phone format accepted).
- [x] Task 5 (fraud transfer details): expected `15000` and `IBAN FR76 1234 5678 9012 3456 7890 123`.
- [x] Task 6 (prevention synthesis): keyword validation on link caution + out-of-band verification + URL/identity checks + no code sharing.

2. Implementation Checklist
- [x] Backend: add SOC-001 task validators (6 tasks, no classic flag flow).
- [x] Content: replace SOC-001 guided steps/hints with artifact-driven steps.
- [x] Frontend: keep same task-validation UX; no machine-dependent assumptions.
- [ ] Verification: check document/audio workflow and completion scoring.

## Room 4 - API-001
Status: Implemented. Verification pending in real student flow.

1. Validation Map (target behavior)
- [x] Task 1 (endpoint discovery count): expected `5` (or configured real count).
- [x] Task 2 (JWT acquisition): accept token pattern starting with `eyJ`.
- [x] Task 3 (BOLA user flag): expected `PMP{api_bola_vulnerability_7d8e2}`.
- [x] Task 4 (transfer limit bypass): expected `oui`/`yes` + accept evidence like `status=success`.
- [x] Task 5 (admin exposure root flag): expected `PMP{api_admin_exposure_9f1b4}`.
- [x] Task 6 (synthesis): keyword validation for BOLA + rate limit bypass + broken access control/admin exposure.

2. Implementation Checklist
- [x] Backend: add API-001 task validators (6 tasks).
- [x] Content: replace API-001 steps/hints with endpoint-focused guided flow.
- [x] Frontend: reuse task-validation UX and keep answer flexibility for task 2/4.
- [ ] Verification: run full flow including admin stats access scenario.

## Room 5 - DORA-001
Status: Implemented with fixed logical defaults for example values. Verification pending.

1. Validation Map (target behavior)
- [x] Task 1 (ransom note filename): expected `README_RANSOM.txt`.
- [x] Task 2 (initial attacker source IP): expected currently `192.168.1.100` (marked as example in spec).
- [x] Task 3 (lateral movement user): expected `appuser`.
- [x] Task 4 (isolation command): accept `iptables ... -j DROP` pattern with correct source/destination semantics.
- [x] Task 5 (last clean full backup date): expected currently `2026-02-20` (marked as example in spec).
- [x] Task 6 (recovery flag): expected `PMP{dora_recovery_success_3e6d9}`.
- [x] Task 7 (health endpoint status): expected `200`.
- [x] Task 8 (DORA report synthesis): keyword validation for timeline + impact + corrective actions + recommendations.

2. Pre-Implementation Confirmations (required)
- [x] Confirm if Task 2 IP is fixed value or lab-generated dynamic value.
- [x] Confirm if Task 5 backup date is fixed value or dynamic per session.
- [x] Confirm if additional hidden flags must be scored or informational only.

3. Implementation Checklist
- [x] Backend: add DORA-001 task validators (8 tasks with mixed command/text checks).
- [x] Content: replace DORA-001 steps/hints with investigation/response/report phases.
- [x] Frontend: ensure long-text synthesis support and robust validation feedback.
- [ ] Verification: phase-by-phase run plus completion/unlock/score checks.

## Notes
- This file is the source of truth for continuation if context expires.
- For each new room, TODO is adapted first, then implementation starts.
- For DORA examples, fixed values were implemented as defaults: attacker IP `192.168.1.100` and backup date `2026-02-20`.
