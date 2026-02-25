# AGENT REALTIME TODO

Last update: 2026-02-25
Owner: Codex
Purpose: keep a realtime, resumable task state when context/token resets.
Single source of truth: this file.

## Usage Rules
- Update this file at the end of each completed task.
- Keep exactly one task with `IN_PROGRESS`.
- For every change, add one line in `Execution Log` with date + action + result.
- If blocked, set task status to `BLOCKED` and describe unblock condition.
- Start every new session by reading this file first.

Status values:
- `TODO`
- `IN_PROGRESS`
- `BLOCKED`
- `DONE`

## Current Mission
- Build a robust cursus workflow with improved module UI and visual schemas.
- Expand cursus catalog with at least 5 additional cursus.
- Align content with the correct source document provided by the user.

## Action Plan
| ID | Task | Status | Priority | Done Criteria | Notes |
|---|---|---|---|---|---|
| A1 | Create persistent realtime TODO tracking file | DONE | P0 | File exists and is structured for resume | This file |
| A2 | Wait for correct PDF/source from user | DONE | P0 | User provides correct file path/name | Provided: c4.pdf, c4 (1).pdf, c4 (2).pdf, exo.pdf |
| A3 | Map source content to cursus/modules/chapters | DONE | P0 | Mapping table validated with user | Documented in docs/cursus_source_mapping_sem5.md |
| A4 | Finalize SQL seeds for new cursus content | DONE | P0 | Seeds added and idempotent | Seed 052 created |
| A5 | Validate API payload + UI rendering with new content | DONE | P1 | Manual checks + lint pass on touched files | Runtime API/DB checks completed |
| A6 | Produce final optimization proposals for schema UX | DONE | P1 | Proposal doc updated with concrete options | docs/cursus_ui_optimisation_plan.md updated |
| A7 | Prepare next iteration scope (new cursus batch) | IN_PROGRESS | P2 | Next source pack and priority list validated with user | Awaiting user input |

## Current Focus
- Active task ID: A7
- Why: implementation and validation for current source pack are complete.
- Immediate next step: collect next cursus source list from user and schedule the next seed batch.

## Blockers
- None.

## Resume Checklist
- Open this file.
- Check `Current Focus` and `Blockers`.
- Run `git status --short` to see working tree context.
- Continue with the first task not `DONE`, respecting dependencies.

## Execution Log
- 2026-02-25: Created `AGENT_REALTIME_TODO.md` as persistent realtime tracker with strict status workflow and resume protocol.
- 2026-02-25: Marked A2 as `BLOCKED` pending correct source PDF from user.
- 2026-02-25: User provided correct sources (`c4.pdf`, `c4 (1).pdf`, `c4 (2).pdf`, `exo.pdf`) -> A2 moved to `DONE`.
- 2026-02-25: Created `docs/cursus_source_mapping_sem5.md` and mapped 3 cursus to the single exercise source file -> A3 moved to `DONE`.
- 2026-02-25: Set A4 as next active focus (`IN_PROGRESS` operationally) for seed finalization from validated sources.
- 2026-02-25: Added `backend/api-gateway/src/database/seeds/052_cursus_sem5_734_732_722.sql` with 3 cursus (734-2, 732-2, 722-2), enriched chapters with `flow` schemas, 3 quizzes, 12 QCM and 12 exercises -> A4 moved to `DONE`.
- 2026-02-25: Ran backend lint (`npm run lint`) successfully and switched active focus to A5 (runtime/API/UI validation).
- 2026-02-25: Applied seed 052 in `pmp-postgres`, verified inserted counts and validated `/api/cursus` + `/api/cursus/:id/module/:moduleId` payloads on live API.
- 2026-02-25: Fixed multi-exercise API/UI path (`exercises` list + frontend exercise selector), rebuilt `pmp-api-gateway`, and revalidated runtime responses (4/3/5 exercises by module) -> A5 moved to `DONE`.
- 2026-02-25: Updated `docs/cursus_ui_optimisation_plan.md` with delivered Semestre 5 integration, API/UI alignment fix, and concrete next optimization steps -> A6 moved to `DONE`.
- 2026-02-25: Re-ran seed 052 and confirmed idempotence (`INSERT 0 0` on all statements).
- 2026-02-25: Normalized cursus titles to remove `BLOC ...` and `Module ...` prefixes via `backend/api-gateway/src/database/seeds/053_cursus_title_normalization.sql`, then applied to live DB and validated API output.
- 2026-02-25: Reintroduced accents on new Semestre 5 cursus titles/descriptions (seed 052 + live DB UPDATE with Unicode escapes) and validated API output.
