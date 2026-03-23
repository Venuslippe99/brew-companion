# BatchDetail Journal Overhaul

## Summary
Redesign the `BatchDetail` Journal so it reads like the story of one batch instead of a grouped event feed, while staying grounded in existing `batch_stage_events`, `batch_logs`, phase outcomes, and the current BatchDetail architecture.

## Why
The deployed BatchDetail redesign already improved the page structure, but the Journal still feels like a formatted system history. The product now needs a stronger chapter-based brewing story that helps users understand what changed, what they checked, what they learned, and how the batch moved from First Fermentation to Second Fermentation to reflection.

## Scope
In scope:
1. Overhauling the Journal view model in a repo-specific way.
2. Improving chapter assignment for stage events, notes, taste tests, outcome reflections, F2 actions, and other `batch_logs`.
3. Defining a richer entry-kind model and recap model for the Journal.
4. Planning the Journal renderer so entries feel differentiated and more narrative.
5. Defining the minimum BatchDetail data-loading changes needed to support the new Journal model.
6. Designing the overhaul to benefit from the current quick-log flows and future richer quick-log inputs.

Out of scope:
1. Rewriting stage rules, next-action logic, timing logic, or persistence semantics.
2. Redesigning Overview, Assistant, or unrelated route surfaces except for small supporting Journal hooks.
3. Adding new schema by default.
4. Shipping photo upload/storage unless a real path already exists.
5. Turning the Journal into a freeform diary that invents details not present in stored data.

## Current state
`src/pages/BatchDetail.tsx` currently loads:
1. `batch_stage_events` with `id`, `created_at`, `from_stage`, `to_stage`, and `reason`
2. `batch_logs` with `id`, `logged_at`, `log_type`, `note`, and `structured_payload`
3. `batch_phase_outcomes` separately and passes them into the Journal helper as reflections

The current BatchDetail Journal path is:
1. `src/pages/BatchDetail.tsx` maps stage events and logs into generic `timelineEntries`
2. `src/lib/batch-journal.ts` assigns those entries to `first_fermentation`, `second_fermentation`, or `finish_reflection`
3. `src/lib/batch-journal.ts` also turns phase outcomes into separate reflection entries
4. `src/components/batch-detail/BatchJournal.tsx` renders chapter sections, then date groups, then repeated entry cards
5. `src/components/batch-detail/BatchJournalEntry.tsx` renders mostly uniform cards with title, body, source pill, and optional tags

Current repo-specific strengths:
1. The Journal already has chapter grouping and outcome-aware reflection entries.
2. The current quick-log flow in `src/lib/batch-quick-logs.ts` writes `structured_payload.stage_at_log`, which is useful for safer chapter assignment.
3. Other write paths already put useful metadata into `structured_payload`, including:
   - `src/lib/f2-persistence.ts`
   - `src/lib/f2-active-actions.ts`
   - `src/lib/phase-outcomes.ts`
   - BatchDetail stage-action writes in `src/pages/BatchDetail.tsx`
4. The current deployed BatchDetail architecture already isolates Journal shaping in `src/lib/batch-journal.ts`, which makes a larger Journal rewrite feasible without changing stage or persistence rules.

Current repo-specific weaknesses:
1. `src/lib/batch-journal.ts` still uses one generic `BatchJournalEntryView` shape for almost everything.
2. Generic logs like `note_only`, `custom_action`, and `photo_added` still fall back too coarsely when there is no strong stage hint.
3. Entries are grouped by date inside each chapter, which keeps chronology but still reads like a grouped event feed.
4. `BatchJournalEntry.tsx` uses one visual treatment for almost all entry types, so reflections, transitions, checks, and notes do not feel meaningfully different.
5. The Journal currently reads richer than the old timeline, but not yet like a brewing story.

Current quick-log and related write paths inspected:
1. `src/lib/batch-quick-logs.ts` writes `note_only` and `taste_test` logs with `structured_payload.stage_at_log`
2. `src/pages/BatchDetail.tsx` uses those write helpers from drawer-based quick capture flows
3. `src/lib/phase-outcomes.ts` writes `phase_outcome` logs with `structured_payload.phase` and selected tags
4. `src/lib/f2-persistence.ts` writes `moved_to_f2` and F2-related logs with structured metadata
5. `src/lib/f2-active-actions.ts` writes F2 operational logs with structured metadata

Current photo support status:
1. The repo has schema/types references for `batch_photos` and `photo_added`
2. I did not find a real frontend photo upload/storage flow or active `supabase.storage` integration in `src/`
3. The Journal should therefore remain compatible with `photo_added` entries, but a richer photo Journal path should be treated as future-facing unless a real upload flow is added separately

### Candidate redesign directions

#### Option A: Narrative beat journal
Journal structure:
1. Keep three brewing chapters, but replace the grouped feed with chapter recap blocks followed by story beats.
2. Within each chapter, render an ordered sequence of differentiated entry kinds instead of mostly identical cards.

Entry model:
1. Introduce explicit entry kinds such as `stage_transition`, `taste_test`, `note`, `photo`, `reflection`, `f2_action`, `completion`, and `system_event`.
2. Carry entry-specific fields such as stage context, taste impression, reflected learnings, and relationship to the next brewing step.

Chapter model:
1. Keep `first_fermentation`, `second_fermentation`, and `finish_reflection`.
2. Make chapter assignment more stage-aware using `structured_payload.stage_at_log`, phase metadata, stage transitions, and bounded fallback heuristics.

Recap behavior:
1. Each chapter begins with a recap block.
2. Recaps summarize what the chapter was for, what changed, and the strongest outcome or checkpoint recorded in that chapter.

Visual rendering implications:
1. `BatchJournalEntry.tsx` likely needs to become either multiple entry renderers or one wrapper with clear variants by kind.
2. Dates remain visible, but become supporting metadata rather than the dominant grouping frame.

Likely implementation complexity:
1. Medium-high.
2. Requires a meaningful view-model rewrite and some renderer split, but not a schema rewrite.

Tradeoffs:
1. Best match for product goal and current helper-layer architecture.
2. More ambitious than a copy pass, so it needs careful trust-preserving rules.

#### Option B: Mixed timeline and journal
Journal structure:
1. Keep the current chapter sections and date groups.
2. Improve copy and add a light chapter summary, but keep the event-list structure mostly intact.

Entry model:
1. Add only a few variants on top of the current generic entry model.
2. Continue treating many logs as the same card type.

Chapter model:
1. Slightly improve chapter assignment heuristics.
2. Keep the existing structure largely unchanged.

Recap behavior:
1. Add light chapter intros, but no strong recap-driven storytelling.

Visual rendering implications:
1. Lower-risk renderer change.
2. Easier to ship, but likely still feels like a nicer event feed.

Likely implementation complexity:
1. Medium-low.

Tradeoffs:
1. Safe for the current codebase.
2. Not bold enough for the stated product goal that the Journal should read like the story of a batch.

#### Option C: Chapter diary cards
Journal structure:
1. Make each chapter mostly a summary card or diary card with a condensed list of supporting events.
2. Emphasize chapter-level memory more than individual beats.

Entry model:
1. Fewer visible individual entries.
2. More summary-centric than event-centric.

Chapter model:
1. Strong chapter identity.
2. Less granular chronology on the main reading path.

Recap behavior:
1. Recap blocks become the dominant content.
2. Individual events are subordinate detail.

Visual rendering implications:
1. Cleaner visually.
2. Runs the risk of losing traceability and day-by-day trust.

Likely implementation complexity:
1. Medium.

Tradeoffs:
1. Could feel warm and polished.
2. Too summary-heavy for the current stored data and the product need to preserve chronology and traceability.

### Recommended direction
Recommend Option A: narrative beat journal.

Why it best fits this repo:
1. The current BatchDetail redesign already established chapter-based Journal surfaces, so the repo is ready for a stronger shaping layer rather than another top-level structural change.
2. `src/lib/batch-journal.ts` already acts as a Journal view-model helper, which is the right place to centralize richer entry-kind logic without pushing story rules into React components.
3. The app already writes useful `structured_payload` hints for many logs, especially `stage_at_log` for quick logs, so chapter assignment can become more trustworthy without schema changes.
4. The product goal is explicitly not “a prettier event list.” Option A is the only direction that meaningfully changes how the Journal reads while staying grounded in real data.
5. It fits the deployed BatchDetail redesign, because Overview remains the live cockpit while Journal becomes the batch’s readable brewing record.

## Intended outcome
The redesigned Journal should:
1. Read like the unfolding story of one batch.
2. Preserve chronology and traceability.
3. Use chapter recaps to orient the user before individual entries.
4. Use stronger entry kinds so transitions, checks, notes, reflections, and F2 actions feel different.
5. Assign entries to the right chapter more reliably by using stage-aware context already available in current data.
6. Make phase outcomes feel like chapter endings or reflective beats instead of bolted-on metadata.
7. Stay compatible with existing stored batches and current quick-log flows.

Recommended MVP outcome:
1. Keep the three existing chapters.
2. Add recap blocks for each visible chapter.
3. Replace the current single generic Journal entry model with a richer story-beat model.
4. Differentiate at least these entry kinds in MVP:
   - `stage_transition`
   - `taste_test`
   - `note`
   - `reflection`
   - `f2_action`
   - `completion`
   - `system_event`
5. Read `structured_payload` more deliberately for chapter assignment and copy shaping.
6. Keep reminder completion out of Journal history for now unless a future implementation adds a dedicated “action completed” write path that reflects a real brewing action rather than a dismissed reminder.

Deferred beyond MVP:
1. True photo Journal entries with uploaded media previews.
2. Freeform diary or long-form journaling.
3. New schema purely for Journal presentation.
4. AI-authored summaries or inferred details not stored in the repo.
5. Rewriting unrelated BatchDetail surfaces unless a small supporting hook is necessary.

## Files and systems involved
Expected implementation touch points:

Route files:
1. `src/pages/BatchDetail.tsx`

BatchDetail components:
1. `src/components/batch-detail/BatchJournal.tsx`
2. `src/components/batch-detail/BatchJournalEntry.tsx`
3. Likely new entry-variant components under `src/components/batch-detail/`, such as:
   - `BatchJournalRecap.tsx`
   - `BatchJournalStoryBeat.tsx`
   - `BatchJournalReflectionEntry.tsx`
   - `BatchJournalTransitionEntry.tsx`

Domain helpers in `src/lib`:
1. `src/lib/batch-journal.ts`
2. Possibly split into:
   - `src/lib/batch-journal.ts` as public orchestrator
   - `src/lib/batch-journal-entries.ts` or similar for shaping/classification rules
   - `src/lib/batch-journal-recaps.ts` or similar for chapter recap derivation
3. `src/lib/batch-detail-view.ts` only if the raw `timelineEntries` shape needs small additions

Related helpers and write paths to keep compatible:
1. `src/lib/batch-quick-logs.ts`
2. `src/lib/phase-outcomes.ts`
3. `src/lib/f2-persistence.ts`
4. `src/lib/f2-active-actions.ts`

Supporting UI already reusable:
1. `src/components/outcomes/PhaseOutcomeCard.tsx`
2. `src/components/outcomes/PhaseOutcomeDrawer.tsx`
3. Existing BatchDetail quick-log drawers and hero actions for future Journal feed improvements

Supabase tables and persisted data involved:
1. `batch_stage_events`
2. `batch_logs`
3. `batch_phase_outcomes`
4. Possibly `batch_photos` later, but not required for the MVP Journal overhaul

Schema and generated types:
1. No schema change is recommended for the MVP Journal overhaul
2. No generated type update should be required unless implementation reveals a missing frontend field

## Risks and compatibility checks
1. Narrative copy could overstate certainty if it tries to infer more than the stored data supports.
2. Over-aggressive chapter inference could misfile generic logs into the wrong brewing phase.
3. If the Journal becomes too summary-heavy, it could lose the trust benefit of chronology and traceability.
4. If `BatchDetail.tsx` does not read enough log metadata, the shaping layer may stay too generic.
5. Splitting the Journal helper too far could create drift if classification, recap, and rendering assumptions are not kept together clearly.
6. Older stored log rows may lack `structured_payload.stage_at_log`, so the model must preserve reliable fallbacks.
7. Reminder completion should not appear as a brewing action unless the data model can distinguish “acknowledged reminder” from “actually performed action.”
8. Any Journal rewrite must not break existing outcome, lineage, reminder, F2, or quick-log flows.
9. The Journal must remain beginner-readable; too many visual variants could become noisy on mobile.

Compatibility checks for implementation:
1. Preserve chronological ordering within chapters.
2. Preserve phase outcome visibility in both Overview and Journal.
3. Keep stage consistency with `src/lib/batches.ts` and BatchDetail timing surfaces.
4. Keep current quick-log writes valid without requiring a migration.
5. Treat missing `structured_payload` as normal for older rows.

## Milestones

### Milestone 1: Inspect and lock the Journal architecture
Goal:
Confirm the current Journal loading, shaping, rendering, log write paths, and `structured_payload` usage, then choose the target Journal architecture.

Acceptance criteria:
1. Inspected the current BatchDetail Journal path and adjacent write paths.
2. Compared three repo-specific redesign options.
3. Chosen one recommended direction with repo-specific reasoning.

Files expected:
1. `plans/2026-03-22-batchdetail-journal-overhaul.md`

Validation:
1. No code validation required for this planning-only milestone.
2. Record current known validation baseline and pre-existing warnings if relying on the last deployed state.

Status: completed

### Milestone 2: Define the new Journal data model
Goal:
Define the new entry kinds, chapter assignment rules, chronology constraints, and narrative shaping rules.

Acceptance criteria:
1. A richer Journal entry model is defined.
2. Chapter assignment rules are stage-aware and compatible with existing data.
3. Trust constraints are explicit.

Files expected:
1. `src/lib/batch-journal.ts`
2. Potentially new helper files under `src/lib/`
3. `plans/2026-03-22-batchdetail-journal-overhaul.md`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`

Status: completed

### Milestone 3: Define chapter recap and rendering model
Goal:
Define chapter recap blocks, visual differentiation by entry kind, and the renderer/component split.

Acceptance criteria:
1. Recap block behavior is specified.
2. Entry rendering variants are defined.
3. Mobile-first reading flow stays clear.

Files expected:
1. `src/components/batch-detail/BatchJournal.tsx`
2. `src/components/batch-detail/BatchJournalEntry.tsx`
3. Potentially new entry/recap components under `src/components/batch-detail/`
4. `plans/2026-03-22-batchdetail-journal-overhaul.md`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build` if component changes materially affect build output or route bundle shape

Status: completed

### Milestone 4: Define BatchDetail data-loading and compatibility changes
Goal:
Decide the minimum `BatchDetail.tsx` loading changes needed for better Journal shaping and confirm backwards compatibility for existing logs.

Acceptance criteria:
1. The plan clearly states whether `structured_payload` should be read now.
2. The plan clearly states whether `src/lib/batch-journal.ts` should be split.
3. The plan clearly defines MVP versus deferred Journal features.

Files expected:
1. `src/pages/BatchDetail.tsx`
2. `src/lib/batch-detail-view.ts`
3. `src/lib/batch-journal.ts`
4. `plans/2026-03-22-batchdetail-journal-overhaul.md`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`

Status: completed

### Milestone 5: Implement, verify, and record follow-ups
Goal:
Implement the approved Journal overhaul, validate it, and record any deferred items or compatibility decisions.

Acceptance criteria:
1. The Journal reads like a chapter-based brewing story rather than a grouped event feed.
2. Validation is run and pre-existing issues are distinguished from new ones.
3. Deferred items and risks are documented cleanly.

Files expected:
1. The files finalized in Milestones 2-4
2. `plans/2026-03-22-batchdetail-journal-overhaul.md`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build` if routing or bundle behavior is affected

Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md` to confirm repo rules and required plan structure.
2. Inspected the current Journal data-loading path in `src/pages/BatchDetail.tsx`.
3. Inspected the current Journal shaping logic in `src/lib/batch-journal.ts`.
4. Inspected the current BatchDetail timeline entry model in `src/lib/batch-detail-view.ts`.
5. Inspected the current Journal renderer in `src/components/batch-detail/BatchJournal.tsx`.
6. Inspected the current entry card renderer in `src/components/batch-detail/BatchJournalEntry.tsx`.
7. Rechecked the deployed BatchDetail hero and overview surfaces to confirm the Journal overhaul can stay scoped to the existing three-surface model.
8. Inspected current outcome UI in `src/components/outcomes/PhaseOutcomeCard.tsx` and `src/components/outcomes/PhaseOutcomeDrawer.tsx` so phase reflections can stay compatible with the broader BatchDetail experience.
9. Inspected current quick-log and `batch_logs` write paths in `src/lib/batch-quick-logs.ts`, `src/components/batch-detail/BatchQuickLogDrawer.tsx`, `src/lib/phase-outcomes.ts`, `src/lib/f2-persistence.ts`, and `src/lib/f2-active-actions.ts`.
10. Confirmed `structured_payload` is already meaningfully used and should be read more deliberately in the Journal model rather than ignored.
11. Confirmed there is no real frontend photo upload/storage flow to build on in this pass.
12. Wrote this execution plan before any code changes.
13. Confirmed `IMPLEMENT.md` was requested but is not present in this workspace, so implementation proceeded from `AGENTS.md`, `PLANS.md`, and the Journal plan itself.
14. Updated `src/lib/batch-detail-view.ts` and `src/pages/BatchDetail.tsx` so Journal entries now carry through `structured_payload`, `stageAtLog`, and `sourceHint` instead of losing that context during load.
15. Rebuilt `src/lib/batch-journal.ts` around a richer story-beat model with explicit entry kinds, stage-aware chapter inference, chapter recap generation, and ascending chronology within each brewing chapter.
16. Reworked `src/components/batch-detail/BatchJournal.tsx` to render recap-led chapter sections rather than date-grouped event buckets.
17. Replaced the uniform Journal card treatment in `src/components/batch-detail/BatchJournalEntry.tsx` with differentiated visual variants for transitions, taste checks, notes, reflections, F2 actions, completion moments, and system checks.
18. Added `src/components/batch-detail/BatchJournalRecap.tsx` for chapter-opening context and highlights.
19. Ran validation after the model pass and found two new implementation issues:
   - `src/components/batch-detail/BatchJournal.tsx` still expected `section.groups`
   - `src/lib/batch-detail-view.ts` still typed `structuredPayload` too narrowly
20. Fixed those issues in the renderer/type layer, reran validation, and reached a clean repo-code result.

## Decision log
1. Recommended Option A, the narrative beat journal, because the current helper-layer architecture and existing `structured_payload` usage already support a stronger story model without needing a schema rewrite.
2. Kept the existing three chapter names for MVP to stay aligned with the deployed BatchDetail redesign and stage model.
3. Chose to treat `structured_payload` as part of the MVP read path for Journal shaping, because current write paths already store stage and action hints that improve chapter assignment safely.
4. Chose not to recommend a schema migration for MVP, because the current data model is strong enough for a substantially better Journal if the frontend shaping is improved.
5. Recommended that `src/lib/batch-journal.ts` either be split into focused shaping helpers or internally refactored so classification, recap derivation, and public assembly stay explicit and maintainable.
6. Recommended moving away from one generic Journal entry renderer toward either multiple entry renderers or a clear variant-based rendering layer.
7. Chose to defer reminder-completion Journal entries until the product has a cleaner distinction between “reminder checked off” and “real brewing action completed.”
8. Chose to keep photo entries future-compatible in the Journal model, but not to make photo support part of the MVP without a real upload/storage path.
9. Kept the implementation in one `src/lib/batch-journal.ts` file for this pass instead of splitting immediately, because the new story model settled cleanly in one helper without creating parallel local logic.
10. Changed chapter chronology from reverse-chronological groups to chapter-ordered story beats in ascending order, because the Journal now needs to read like an unfolding batch story instead of a log export.
11. Chose to derive chapter recaps from the visible chapter entries themselves, with light chapter-specific copy, rather than pulling in unrelated BatchDetail state and risking mismatch between the recap and the rendered Journal.
12. Treated `custom_action` logs in the finish chapter as completion-style beats, but kept reminder completion out of the Journal because current reminder writes still represent acknowledgment, not a guaranteed brewing action.

## Open questions
1. Whether future iterations should collapse older chapter recaps by default on smaller mobile screens once there are many Journal beats.
2. Whether a later pass should add richer rendered note/photo subtypes after real photo persistence exists.

## Done when
1. The Journal uses a richer entry model than the current generic card feed.
2. Chapter assignment is more stage-aware for generic logs and quick logs.
3. Phase outcomes read like chapter-ending reflections instead of bolt-on metadata.
4. Chapter recap blocks help the user understand what happened in each brewing phase.
5. The Journal remains chronologically trustworthy and traceable to real stored data.
6. Existing stored batches still render without requiring a migration.
7. The implementation stays compatible with current quick-log, outcome, F2, lineage, and reminder flows.
8. Validation passes with only the same pre-existing warning-only baseline.

## Final validation
Final implementation pass:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Results:
1. `npx tsc -b` passed.
2. `npm run lint` passed with the same pre-existing `react-refresh/only-export-components` warnings in shared UI/context files only.
3. `npm run test` passed.
4. `npm run build` passed with the same existing chunk-size warning only.

Pre-existing warnings retained:
1. `npm run lint` still reports the same 9 `react-refresh/only-export-components` warnings in shared UI/context files.
2. `npm run build` still reports the existing large-chunk warning.

New failures introduced during implementation:
1. A first validation pass failed because `BatchJournal.tsx` still expected grouped sections and `BatchTimelineEntry.structuredPayload` was typed too narrowly.
2. Both were fixed during implementation; no new failures remain at the end.
