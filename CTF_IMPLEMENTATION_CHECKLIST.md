# CTF Implementation Checklist

- [x] Phase 1 - Database (migration 011 + schema + leaderboard + badges CTF)
- [x] Phase 2 - Backend API (routes + controller + service + app.ts)
- [x] Phase 3 - Contenu (20 challenges + guided steps + hints)
- [x] Phase 4 - Frontend Etudiant (dashboard + detail + leaderboard + navigation + URLs)
- [x] Phase 5 - Frontend Instructeur (dashboard CTF + lab-control toggles)
- [x] Phase 6 - Integration Badges & XP (badges CTF + affichage points CTF dans /student)
- [x] Phase 7 - AttackBox Terminal (service Docker + outils + acces depuis chaque challenge)
- [x] Phase 8 - Post-Lab Remediation (page defensive par challenge + redirection a completion)

## Verification Notes
- [x] TypeScript backend compile
- [x] TypeScript frontend compile
- [x] Endpoint wiring reviewed
- [x] AttackBox wired (`ctf-attackbox` + `NEXT_PUBLIC_CTF_ATTACKBOX_URL` + panel `/student/ctf/[code]`)
- [x] Remediation flow wired (`/student/ctf/[code]/remediation` after challenge status becomes `COMPLETED`)

## Verified Runtime Checks
- [x] `npx ts-node src/database/runMigrations.ts` (migrations + seed CTF)
- [x] 20 challenges seeded (`learning.ctf_challenges=20`, `ctf_guided_steps=100`, `ctf_hints=40`)
- [x] `GET /api/ctf/challenges` auth required and returns challenge list
- [x] `POST /api/ctf/challenges/HSM-001/submit` incorrect flag -> `isCorrect=false`
- [x] `POST /api/ctf/challenges/HSM-001/submit` correct flag -> points awarded
- [x] Prerequisite lock/unlock verified (`HSM-002` locked before, unlocked after `HSM-001`)
- [x] Guided mode progressive steps verified
- [x] Free mode hint lock/unlock verified
- [x] Leaderboard ordered by points DESC (smoke check)
- [x] Instructor admin endpoints verified (`submissions`, `analytics`, `reset`)
