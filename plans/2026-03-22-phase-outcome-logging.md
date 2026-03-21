# Phase Outcome Logging

## Summary
Design a phase-based outcome logging system that treats F1 and F2 as separate evaluation moments for the same kombucha batch. The MVP should persist one editable F1 outcome and one editable F2 outcome per batch, show them as separate summary sections in batch detail, and keep the data shape useful for future "brew again" and repeat-with-changes flows.

## Why
The app already tracks what the user brewed, when it moved stages, and what actions happened. It does not yet capture how each phase turned out. That leaves a gap between process history and practical memory. Separate F1 and F2 outcome logging gives users a quick way to remember whether the base kombucha felt ready, whether carbonation/flavour worked, and what they would change next time without turning the product into a heavy tasting journal.

## Scope
In scope:
1. MVP architecture for separate F1 and F2 outcome logging on the existing batch detail flow
2. Supabase persistence design for one saved outcome per phase per batch
3. Repo-specific read/write helpers, CTA triggers, summary cards, and edit flow
4. Timeline/history decision for logging outcome events
5. Backwards compatibility for existing active, chilled, completed, archived, and discarded batches
6. Clear MVP boundary versus later enhancements

Out of scope:
1. Generic tasting journal or multi-entry tasting history
2. Duplicate batch flow changes in this pass
3. Dashboard/archive badges in MVP unless the implementation stays trivially additive
4. Advanced analytics, recommendations, or AI interpretation
5. Per-bottle or per-recipe-variation outcome logging

## Current state
The relevant code paths today:

1. Routes
   - `src/App.tsx` exposes `/`, `/batches`, `/batch/:id`, `/new-batch`, `/assistant`, `/guides`, and `/guides/:slug`
   - There is no current route dedicated to outcome logging, and none is needed for MVP

2. Batch lifecycle and stage model
   - `src/lib/batches.ts` defines `f1_active`, `f1_check_window`, `f1_extended`, `f2_setup`, `f2_active`, `refrigerate_now`, `chilled_ready`, `completed`, `archived`, `discarded`
   - `getNextAction` already centralizes stage-based next-step wording

3. Timing and readiness logic
   - `src/lib/batch-timing.ts` centralizes F1 and F2 timing/status guidance
   - `src/pages/BatchDetail.tsx` uses that helper in the Overview tab and already shows phase-relevant CTAs around F1 readiness

4. Batch detail structure and CTA patterns
   - `src/pages/BatchDetail.tsx` is the main batch-centered surface
   - Current tabs are `Overview`, `Timeline`, `Logs`, `F2 & Bottles`, `Photos`, `Notes`, `Guide`, `Assistant`
   - The `Logs` tab is still a placeholder, and the Overview tab already contains stage-aware cards and action prompts
   - F1 transition actions are triggered from the timing card via `handleStartF2` and `handleStillFermenting`

5. F2 setup and persistence
   - `src/components/f2/F2SetupWizard.tsx` is the existing F2 setup and F2 active action surface
   - `src/lib/f2-persistence.ts` creates `batch_f2_setups`, `batch_f2_bottle_groups`, `batch_bottles`, and `batch_bottle_ingredients`, then moves the batch to `f2_active`
   - `src/lib/f2-active-actions.ts` handles `checked-one-bottle`, `needs-more-carbonation`, `refrigerate-now`, `moved-to-fridge`, and `mark-completed`

6. Timeline and history
   - `src/pages/BatchDetail.tsx` merges `batch_stage_events` and `batch_logs` into the Timeline tab
   - `batch_logs` currently holds event-style logs like `taste_test`, `moved_to_f2`, `refrigerated`, `carbonation_check`, `note_only`
   - There is no dedicated outcome record type and no current edit-friendly structure for "one record per phase"

7. Reminders and next action
   - Reminders are queried directly from `batch_reminders` in `src/pages/BatchDetail.tsx` and `src/pages/Index.tsx`
   - I did not find a centralized reminders domain helper in `src/lib`; current reminder reads are page-local
   - Existing next-action logic lives in `src/lib/batches.ts`, so outcome logging should not duplicate lifecycle decision text in components

8. Existing reusable UI
   - `src/components/common/StageIndicator.tsx` provides stage and caution badges
   - `src/components/ui/dialog.tsx`, `src/components/ui/drawer.tsx`, and `src/components/ui/alert.tsx` already exist and are suitable for quick-log and edit flows
   - `src/components/batches/BatchCard.tsx` and `src/components/dashboard/TodayActionCard.tsx` show current summary-card patterns

9. Supabase schema and generated types
   - Current batch-owned child tables already follow a consistent pattern in `supabase/migrations/*.sql` and `src/integrations/supabase/types.ts`
   - Existing relevant tables are `kombucha_batches`, `batch_stage_events`, `batch_logs`, `batch_reminders`, `batch_f2_setups`, `batch_f2_bottle_groups`, `batch_bottles`, and `batch_bottle_ingredients`
   - There is no current `batch_phase_outcomes` table or equivalent

10. Existing data structures that partly support the feature
   - `batch_logs` could store outcome-like payloads, but it is not a good MVP persistence shape for one editable F1 record and one editable F2 record per batch
   - It lacks a direct unique-per-phase constraint and would force summary/edit logic to infer state from event history

## Intended outcome
The MVP should behave like this:

1. Each batch can have at most one saved F1 outcome and one saved F2 outcome
2. F1 and F2 remain separate in UI, wording, and saved fields, even if they share one persistence table
3. Batch detail shows separate `F1 Outcome` and `F2 Outcome` sections with:
   - log CTA when missing
   - saved summary when present
   - edit action
4. F1 outcome prompts appear when the batch is at or near the F1-to-F2 decision point, not on every batch view
5. F2 outcome prompts appear when the batch reaches `chilled_ready` or `completed`, and should also remain available later for archived/completed batches that missed logging earlier
6. Saved outcomes remain lightweight but useful for future duplicate flows by capturing:
   - what happened
   - whether timing felt right
   - whether the user would change something next time
7. Timeline/history remains coherent by recording that an outcome was logged, without making `batch_logs` the source of truth for outcome data

## Files and systems involved
1. Route files
   - `src/App.tsx`
   - No new route expected for MVP

2. Batch detail and entry-point files
   - `src/pages/BatchDetail.tsx`
   - `src/components/f2/F2SetupWizard.tsx`
   - `src/pages/Index.tsx` only if a later milestone adds non-blocking reminders for missing outcomes
   - `src/pages/MyBatches.tsx` only if list badges are later approved

3. Shared components
   - New outcome summary card component(s), likely under `src/components/batch-detail/` or `src/components/outcomes/`
   - New quick-log form component(s), likely drawer-based for mobile friendliness

4. Domain helpers in `src/lib`
   - `src/lib/batches.ts`
   - `src/lib/batch-timing.ts`
   - `src/lib/f2-current-setup.ts`
   - `src/lib/f2-active-actions.ts`
   - New outcome helpers, likely `src/lib/phase-outcomes.ts` and `src/lib/phase-outcome-options.ts`

5. Supabase tables
   - Existing reads from `kombucha_batches`, `batch_logs`, `batch_stage_events`, `batch_f2_setups`
   - New table proposed: `batch_phase_outcomes`

6. Migrations
   - New migration under `supabase/migrations/`

7. Generated types
   - `src/integrations/supabase/types.ts`

## Risks and compatibility checks
1. Duplicating lifecycle logic in components
   - Outcome prompts must reuse existing stage and timing helpers instead of component-local rules

2. Collisions with stage transition logic
   - Logging an outcome must not silently move stages or overwrite `next_action`
   - F1 and F2 transition actions in `BatchDetail` and `f2-active-actions` should remain the only stage-transition paths

3. Saved data compatibility
   - Existing batches will not have outcome rows, so UI must treat missing records as a normal null state
   - No placeholder rows should be generated for old batches

4. Timeline/history drift
   - If outcome saves write timeline events, the app must do that consistently on create and edit or clearly only on create

5. Over-heavy UX
   - Quick logging must stay lightweight enough that users can skip it or fill it in later

6. Future duplicate-flow compatibility
   - MVP fields need to preserve per-phase learnings without requiring later data migration

7. Archive/list surface creep
   - Adding summary badges across lists now would expand scope and increase read complexity

8. Reminder coupling
   - There is no centralized reminders helper today, so outcome prompts should not depend on new reminder automation in MVP

## Milestones

### Milestone 1: Lock schema and domain model
Goal:
Define the persistence model, shared/phase-specific fields, and timeline-write policy.
Acceptance criteria:
1. The plan names the exact table, columns, constraints, and generated type impact
2. The plan explains why one shared table with `phase` is preferred over separate F1/F2 tables
3. The plan states whether timeline writes happen on create, edit, both, or neither
Files expected:
1. `supabase/migrations/<timestamp>_batch_phase_outcomes.sql`
2. `src/integrations/supabase/types.ts`
3. New outcome helper file(s) in `src/lib/`
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 2: Add F1 quick outcome flow
Goal:
Implement batch-attached F1 outcome logging and F1 summary display.
Acceptance criteria:
1. Batch detail shows `F1 Outcome` with log CTA, summary, and edit path
2. F1 prompt appears only when the batch is in an F1-relevant stage or has moved to F2 without an F1 outcome
3. F1 form stays quick and phase-specific
Files expected:
1. `src/pages/BatchDetail.tsx`
2. New F1 outcome form/card components
3. New outcome read/write helpers
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
Status: completed

### Milestone 3: Add F2 quick outcome flow
Goal:
Implement batch-attached F2 outcome logging and F2 summary display.
Acceptance criteria:
1. Batch detail shows `F2 Outcome` with log CTA, summary, and edit path
2. F2 CTA appears for `chilled_ready`, `completed`, `archived`, and existing historical batches with no F2 outcome
3. F2 flow can read current F2 setup summary for context but does not duplicate F2 rules in the form
Files expected:
1. `src/pages/BatchDetail.tsx`
2. `src/components/f2/F2SetupWizard.tsx` or a nearby CTA hook if needed
3. Shared outcome helpers/components
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
Status: completed

### Milestone 4: Editing, timeline polish, and compatibility cleanup
Goal:
Support edits, finish batch-detail presentation, and confirm compatibility for existing batches.
Acceptance criteria:
1. Both phase records are editable without creating duplicates
2. Timeline/history behavior is implemented consistently
3. Existing completed/chilled/archived batches without outcomes render clear "log now" CTAs instead of broken empty states
Files expected:
1. `src/pages/BatchDetail.tsx`
2. New outcome helper/component files
3. Any timeline-label helper changes needed
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

### Milestone 5: Deferred follow-ups
Goal:
Capture non-MVP ideas that should not expand the first pass.
Acceptance criteria:
1. Future enhancements are recorded without blocking MVP
Files expected:
1. No code changes required
Validation:
1. None beyond final repo checks
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`
2. Inspected `src/App.tsx` to confirm route structure and that batch detail is the best MVP home
3. Inspected `src/lib/batches.ts` and confirmed the current stage model and centralized next-action helper
4. Inspected `src/lib/batch-timing.ts` and confirmed current F1/F2 timing status helpers
5. Inspected `src/pages/BatchDetail.tsx` and traced current tabs, F1 decision CTAs, reminder reads, and merged timeline/history behavior
6. Inspected `src/components/f2/F2SetupWizard.tsx`, `src/lib/f2-persistence.ts`, and `src/lib/f2-active-actions.ts` to confirm F2 save paths and final-stage triggers
7. Inspected `src/integrations/supabase/types.ts` and `supabase/migrations/*.sql` to confirm there is no existing outcome table and that child-table plus RLS patterns are already established
8. Inspected `src/components/ui/dialog.tsx`, `src/components/ui/drawer.tsx`, `src/components/ui/alert.tsx`, `src/components/batches/BatchCard.tsx`, and `src/components/common/StageIndicator.tsx` to identify reusable UI primitives
9. Added `supabase/migrations/20260322003929_batch_phase_outcomes.sql` with the new shared phase outcome table, enums, indexes, trigger, and RLS policies
10. Updated `src/integrations/supabase/types.ts` with the new table and enum types
11. Added `src/lib/phase-outcome-options.ts` and `src/lib/phase-outcomes.ts` to centralize option sets, labels, reads, and save behavior
12. Ran `npx tsc -b` and `npm run lint`; typecheck passed and lint still only reported the existing fast-refresh warnings in shared UI/context files
13. Added shared outcome UI in `src/components/outcomes/PhaseOutcomeCard.tsx` and `src/components/outcomes/PhaseOutcomeDrawer.tsx`
14. Updated `src/pages/BatchDetail.tsx` to load `batch_phase_outcomes`, show a separate F1 outcome section in `Overview`, and save F1 quick outcomes through `src/lib/phase-outcomes.ts`
15. Ran `npx tsc -b`, `npm run lint`, and `npm run test` after the F1 milestone; typecheck passed, lint stayed warning-only, and tests still failed only with the existing sandbox `spawn EPERM`
16. Updated `src/pages/BatchDetail.tsx` again to show a separate F2 outcome section, reuse the shared drawer for F2, and load the current F2 setup via `src/lib/f2-current-setup.ts` for saved-context copy
17. Ran `npx tsc -b`, `npm run lint`, and `npm run test` after the F2 milestone; results matched the existing baseline
18. Ran the full final validation set: `npx tsc -b`, `npm run lint`, `npm run test`, and `npm run build`; typecheck passed, lint stayed warning-only, and both test/build still failed only with the same sandbox `spawn EPERM`

## Decision log
1. Use one shared table with a `phase` field rather than separate F1 and F2 tables.
Why:
   - The UX and forms stay separate, but the repo already favors batch-owned child tables with consistent helper patterns
   - MVP needs one record max per phase per batch, which fits a unique `(batch_id, phase)` constraint cleanly
   - This shape is better for later duplicate-flow reads and compact summary badges than two parallel tables

2. Do not use `batch_logs` as the primary storage for phase outcomes.
Why:
   - `batch_logs` is event history, not an editable summary record
   - It would make "latest per phase" logic and editing more fragile
   - The current `log_type_enum` also has no phase-outcome concept

3. Keep the MVP batch-attached, not as a general free-floating route.
Why:
   - Outcome logging is about a specific batch and phase
   - `src/pages/BatchDetail.tsx` already has the right context, CTA patterns, timeline integration, and room for separate summary cards

4. Use drawer-based quick-log UI in MVP, not a standalone page.
Why:
   - The app already has a mobile-friendly drawer primitive
   - Quick logging should feel lightweight and stay close to batch detail

5. Do not generate placeholder outcome rows for existing batches.
Why:
   - Null state is simpler and safer
   - Existing batches can be backfilled opportunistically through explicit CTAs

6. Write a timeline/history event when an outcome is first logged, and likely when it is edited, but keep the saved outcome row as the source of truth.
Why:
   - Batch detail already merges `batch_stage_events` and `batch_logs`
   - Users should be able to see when an outcome was recorded
Uncertainty:
   - The exact log title strategy depends on whether MVP adds a new `log_type_enum` value such as `phase_outcome` or reuses `custom_action`. A dedicated `phase_outcome` log type is cleaner if schema work is already happening.

7. Keep archive/list badges out of MVP.
Why:
   - `src/pages/MyBatches.tsx` and `src/components/batches/BatchCard.tsx` do not currently read outcome data
   - Adding those reads now would widen scope and query shape before the core batch-detail flow is proven

8. Keep richer detail fields out of MVP and put them in a later milestone.
Why:
   - A quick log should stand on its own
   - The product requirement to remember "what to change next time" can be met in MVP with a short optional `next_time_change` field instead of a full tasting journal

9. Write a timeline log only when a phase outcome is created, not on every edit.
Why:
   - This keeps the timeline useful without turning outcome edits into noise
   - The editable record in `batch_phase_outcomes` remains the source of truth

10. Show outcome summary cards in the `Overview` tab for MVP.
Why:
   - `Overview` already holds the stage timing context and action-oriented CTA patterns
   - Replacing the `Logs` tab now would expand scope without adding needed value for the first pass

11. Use the existing `loadCurrentF2Setup` helper to personalize the F2 section with saved setup context instead of duplicating carbonation or bottle rules in the form.
Why:
   - The helper already reflects the persisted F2 run structure
   - A short saved-context summary is enough for MVP without making the form heavy

## Open questions
1. Whether the current Supabase project used by the app already has the new migration applied when the feature is tested manually.
Current note:
   - The repo implementation can add the migration and generated types, but runtime verification against live data still requires the migration to be applied in Supabase

## Done when
1. The repo has a clear implementation plan for one F1 outcome and one F2 outcome per batch
2. The plan names the exact schema addition, generated type update, frontend read paths, and frontend write paths
3. The plan identifies the concrete batch detail trigger points for F1 and F2 logging
4. The plan distinguishes MVP from later enhancements such as archive badges, richer details, duplicate-flow integration, and multi-entry logs
5. The plan explicitly covers timeline/history, backwards compatibility, and validation expectations

## Final validation
Baseline for this planning task:
1. `npx tsc -b` passed during the baseline cleanup task
2. `npm run lint` passed with warnings only during the baseline cleanup task
3. `npm run test` and `npm run build` are valid repo commands but still fail in this sandbox with `spawn EPERM` while starting Vite/Vitest, which should be documented as an environment limitation unless it changes in a later coding pass

Commands to run during implementation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Implementation notes for the eventual coding pass:
1. Exact migration needed:
   - Create `public.batch_phase_outcomes`
   - Add `phase` enum for `f1` and `f2`
   - Add `f1_taste_state`, `f1_readiness`, `f2_overall_result`, and `f2_brew_again` fields as phase-specific nullable enums or checked text fields
   - Add shared `selected_tags`, `note`, and `next_time_change` fields
   - Add `created_by_user_id`, timestamps, foreign key to `kombucha_batches`, unique `(batch_id, phase)`, indexes, RLS, and `updated_at` trigger
   - Optionally add a `phase_outcome` value to `log_type_enum` if timeline writes use a dedicated log type
2. Exact generated types update needed:
   - Regenerate or update `src/integrations/supabase/types.ts` so the new table and any new enums are available to frontend code
3. Exact frontend read/write paths to change:
   - Read outcomes in `src/pages/BatchDetail.tsx`
   - Write outcomes through a new helper in `src/lib/phase-outcomes.ts`
   - Optionally write related `batch_logs` rows from the same helper for timeline/history coherence
4. Steps Codex can do in-repo:
   - Add migration file
   - Update frontend code and generated types file in the repo
   - Add read/write helpers and UI components
5. Steps that must be run manually against Supabase:
   - Apply the new migration to the target Supabase project
   - Regenerate types from the live schema if the team’s normal workflow depends on the remote database rather than local SQL alone

Recommended MVP data model:
1. Shared table: `batch_phase_outcomes`
2. Shared fields:
   - `id`
   - `batch_id`
   - `phase`
   - `selected_tags`
   - `note`
   - `next_time_change`
   - `created_by_user_id`
   - `created_at`
   - `updated_at`
3. F1-specific fields:
   - `f1_taste_state`
   - `f1_readiness`
4. F2-specific fields:
   - `f2_overall_result`
   - `f2_brew_again`

Recommended MVP option sets:
1. F1 taste state:
   - `too_sweet`
   - `slightly_sweet`
   - `balanced`
   - `tart`
   - `too_sour`
2. F1 readiness:
   - `yes`
   - `maybe_early`
   - `maybe_late`
   - `no`
3. F1 tags, max 2:
   - `ready_for_f2`
   - `still_too_sweet`
   - `nice_balance`
   - `too_acidic`
   - `strong_tea_base`
   - `weak_tea_base`
   - `good_starter_for_next_batch`
   - `not_sure`
4. F2 overall result:
   - `excellent`
   - `good`
   - `okay`
   - `disappointing`
   - `bad`
5. F2 brew again:
   - `yes`
   - `maybe_with_changes`
   - `no`
6. F2 tags, max 2:
   - `carbonation_just_right`
   - `too_flat`
   - `too_fizzy`
   - `flavor_worked_well`
   - `flavor_too_weak`
   - `flavor_too_strong`
   - `too_sour`
   - `too_sweet`
   - `not_sure`

Recommended trigger points:
1. F1 outcome CTA:
   - In `BatchDetail` Overview when stage is `f1_check_window` or `f1_extended`
   - Also when the batch has already moved to any F2-or-later stage but has no F1 outcome yet
2. F2 outcome CTA:
   - In `BatchDetail` when stage is `chilled_ready`, `completed`, or `archived`
   - Also on older completed/chilled batches with no saved F2 outcome

Recommended MVP boundary:
1. Include now:
   - one F1 quick outcome record per batch
   - one F2 quick outcome record per batch
   - persistence and edit support
   - separate F1 and F2 summary cards in batch detail
   - optional short note
   - optional short `next_time_change`
   - timeline event on save
2. Defer:
   - richer detail fields like sweetness/acidity/carbonation sliders
   - archive or list badges
   - dashboard prompts for missing outcomes
   - duplicate batch integration
   - multiple entries per phase
   - per-bottle or per-recipe variation outcomes
