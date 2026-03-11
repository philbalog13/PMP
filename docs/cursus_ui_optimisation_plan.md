# Cursus and Module UI Optimization Plan

## Current implementation map

### Frontend pages
- `frontend/portal/src/app/student/cursus/page.tsx`: list of cursus (`GET /api/cursus`), filters, global progression.
- `frontend/portal/src/app/student/cursus/[cursusId]/page.tsx`: module list in a cursus (`GET /api/cursus/:id`).
- `frontend/portal/src/app/student/cursus/[cursusId]/[moduleId]/page.tsx`: chapter reader + quiz + exercise (`GET /api/cursus/:id/module/:moduleId`).
- `frontend/portal/src/components/cursus/CourseRichRenderer.tsx`: markdown renderer used by chapter pages.

### Backend endpoints
- `backend/api-gateway/src/routes/cursus.routes.ts`
- `backend/api-gateway/src/controllers/cursus.controller.ts`

### Data layer
- Cursus content lives in SQL seeds under `backend/api-gateway/src/database/seeds`.
- Existing blocks: `011` to `032`.

## Key optimization axes

1. Diagram rendering quality
- Problem: many chapters contain plain-text diagrams in code fences.
- Improvement: parser now builds node/edge graphs and renders a visual schema block before raw text.
- Benefit: faster comprehension for learners, less cognitive load than ASCII diagrams.

2. Quiz progression reliability
- Problem: module-level best quiz score query used legacy/non-existent table.
- Improvement: query now reads `learning.cursus_quiz_results` and uses best percentage.
- Benefit: module mastery and quiz score indicators become accurate.

3. Quiz content robustness
- Problem: `json_agg` could contain null-like entries when no question row matched.
- Improvement: `json_agg ... FILTER (WHERE qq.id IS NOT NULL)` with `COALESCE(..., '[]')`.
- Benefit: cleaner quiz payload, fewer frontend edge cases.

## New cursus expansion

Added `backend/api-gateway/src/database/seeds/051_cursus_expansion_pack.sql` with 5 new cursus:

1. `bloc-6-open-banking`
2. `bloc-7-fraud-advanced`
3. `bloc-8-cloud-devsecops`
4. `bloc-9-incident-response`
5. `bloc-10-regtech-compliance`

Each cursus includes:
- 2 starter modules
- 2 chapters per module
- idempotent inserts (`ON CONFLICT DO NOTHING`)

## Semestre 5 integration (3 official modules)

Added `backend/api-gateway/src/database/seeds/052_cursus_sem5_734_732_722.sql`:

1. `bloc-s5-734-principes` (Module 734-2)
2. `bloc-s5-732-cp-cnp` (Module 732-2)
3. `bloc-s5-722-issuer-acq` (Module 722-2)

Delivered content:
- 3 cursus
- 3 modules
- 17 chapters with `flow` diagram blocks (visual schema rendering, not plain ASCII only)
- 3 quizzes
- 12 quiz questions (4 per module, from `exo.pdf`)
- 12 exercises (Ex1 to Ex12, from `exo.pdf`)

## API/UI alignment update

Issue discovered during runtime validation:
- `GET /api/cursus/:id/module/:moduleId` returned only one exercise (`rows[0]`), which hid most exercises from `exo.pdf`.

Fix delivered:
- Backend now returns `exercises` (full ordered list) and keeps `exercise` for backward compatibility.
- Frontend module page now supports multi-exercise navigation and submission per selected exercise.

## Runtime validation snapshot

Validated on running stack (`pmp-postgres`, `pmp-api-gateway`):
- DB objects inserted: `3 cursus`, `3 modules`, `17 chapters`, `3 quizzes`, `12 questions`, `12 exercises`.
- API `GET /api/cursus` returns the 3 new cursus.
- API `GET /api/cursus/:id/module/:moduleId` returns:
  - chapters with `flow` blocks
  - quiz with 4 questions
  - full exercise lists: `4` (734), `3` (732), `5` (722)

## Next practical step

1. Add explicit exercise ordering column in DB (`exercise_order`) instead of sorting by `id`.
2. Add chapter-level mini diagrams where sequence complexity is high (3DS, CB2A, settlement).
3. Extend the same multi-exercise pattern to older blocks (`020`, `024`, `028`, `032`) for consistency.
