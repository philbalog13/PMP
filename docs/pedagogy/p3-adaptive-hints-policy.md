# Adaptive paths + anti-spoil hints (P3-07 / P3-08)

Implementation:
- `backend/api-gateway/src/services/ctfLearning.service.ts`
- `backend/api-gateway/src/controllers/ctf.controller.ts`
- `frontend/portal/src/app/student/ctf/[code]/page.tsx`

## Adaptive learner profiles
Profiles:
- `NOVICE`
- `INTERMEDIATE`
- `ADVANCED`

Behavior:
- Challenge detail API returns profile-specific guidance for each guided step.
- Student can switch profile from challenge UI.
- Profile is persisted in student progress (`learner_profile`).

## Progressive anti-spoil hint policy
Hint gates enforce sequence + threshold:
- Hint 1: immediate (no threshold)
- Hint 2: requires hint 1 and (`elapsed >= 6 min` OR `failed_attempts >= 2`)
- Hint 3: requires hint 2 and (`elapsed >= 12 min` OR `failed_attempts >= 4`)

API behavior:
- Locked unlock attempts return `423` with explicit reason and thresholds.
- Hint metadata exposes current elapsed minutes / failed attempts to make the gate transparent.
