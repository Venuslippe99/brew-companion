# Outcome-Aware Brew Again

## Summary
Design an outcome-aware Brew Again flow that starts a new kombucha batch from a previous batch while using separate F1 and F2 outcome memory in a visible, explainable way. The MVP should launch from BatchDetail, summarize what happened in F1 and F2, offer three restart modes, hand off into the existing `/new-batch` flow with explicit prefilled state, and store provenance that the new batch came from the previous one.

## Why
The app now has separate phase outcomes, but users still have no practical shortcut for turning that memory into a better next batch. A blind clone button would ignore what went right or wrong. Outcome-aware Brew Again should help users repeat a good batch confidently, or restart from the same baseline with clear adjustments, without pretending to be a complex recommendation engine.

## Scope
In scope:
1. Outcome-aware Brew Again launcher from past-batch detail
2. Loading the previous batch setup, current F1/F2 phase outcomes, and current saved F2 setup
3. Compact outcome summary and three-mode decision UI
4. Structured suggestion generation that is explainable and reviewable
5. Handoff into the existing `NewBatch` route with explicit prefilled state
6. Provenance tracking so the new batch records which batch it came from

Out of scope:
1. Generic duplicate/clone behavior with no outcome awareness
2. Aggregate analytics across multiple past batches
3. Archive/list action buttons in MVP
4. Advanced automatic recipe optimization
5. Automatic F2 setup creation for the new batch
6. Reference-batch labels, archive filters, or repeated-batch summaries

## Current state
The relevant code and data paths today:

1. Route structure
   - `src/App.tsx` exposes `/batch/:id` and `/new-batch`
   - `NewBatch` is a dedicated page, not a modal or wizard nested in BatchDetail
   - There is no existing Brew Again route or duplication route

2. BatchDetail structure and action areas
   - `src/pages/BatchDetail.tsx` is the main batch-centered screen
   - The header currently shows batch title, stage badges, and tabs
   - `Overview` already holds the action-oriented cards for timing, reminders, recipe summary, and phase outcomes
   - This is the best current place for a Brew Again launcher

3. New batch flow
   - `src/pages/NewBatch.tsx` owns the batch creation form and inserts directly into `kombucha_batches`
   - It currently keeps form state local in the page and does not read `useLocation`, query params, or any other prefill source
   - It only exposes F1-start fields today:
     - `name`
     - `brewDate`
     - `totalVolumeMl`
     - `teaType`
     - `sugarG`
     - `starterLiquidMl`
     - `scobyPresent`
     - `avgRoomTempC`
     - `vesselType`
     - `targetPreference`
     - `initialPh`
     - `initialNotes`

4. Current batch creation path and schema fit
   - `NewBatch` inserts into `kombucha_batches` with `status = active` and `current_stage = f1_active`
   - It does not currently set:
     - `starter_source_type`
     - `starter_source_batch_id`
     - `brewing_method_notes`
     - `initial_observations`
     - `tea_strength_notes`
     - `cover_type`
   - Any Brew Again MVP that reuses `NewBatch` must work within this narrower form or explicitly extend it

5. Phase outcome data model and helpers
   - `src/lib/phase-outcomes.ts` now loads and saves one `batch_phase_outcomes` record per phase per batch
   - Stored fields already useful for Brew Again are:
     - F1: `f1_taste_state`, `f1_readiness`, `selected_tags`, `note`, `next_time_change`
     - F2: `f2_overall_result`, `f2_brew_again`, `selected_tags`, `note`, `next_time_change`
   - These are enough for a first-pass suggestion engine without new outcome schema

6. F2 setup persistence and saved setup structure
   - `src/lib/f2-current-setup.ts` loads the current F2 setup, bottle groups, bottles, and bottle ingredients
   - `src/lib/f2-persistence.ts` shows how F2 setup is persisted separately from initial batch creation
   - F2 setup data exists, but `NewBatch` does not currently collect or save any F2 setup
   - That means Brew Again can use F2 setup for suggestions and review, but not as a direct create-time write in MVP unless the flow is expanded

7. Notes, reminders, and timing guidance
   - `BatchDetail` reads reminders directly from `batch_reminders`
   - `src/lib/batch-timing.ts` centralizes stage/timing estimates
   - `src/lib/batches.ts` centralizes stage labels and `getNextAction`
   - There is no centralized reminder-generation helper exposed in the frontend today

8. Provenance in current schema
   - `kombucha_batches` already has `starter_source_batch_id` and `starter_source_type`
   - This field is specifically about starter liquid source, enforced by lifecycle constraints in the SQL migrations
   - It is not the right provenance field for “this batch was brewed again from that batch” because those are different concepts
   - There is no current duplication/reference field for Brew Again provenance

9. Reusable UI primitives
   - `src/components/ui/drawer.tsx` and `src/components/ui/dialog.tsx` are available
   - `src/components/ui/button.tsx` and the existing `ScrollReveal`/card patterns from `BatchDetail` are suitable for the launcher
   - `BatchDetail` already uses drawers for fast, contextual flows and `NewBatch` is already the full-page review/create surface

10. Batch list/archive surfaces
   - `src/pages/MyBatches.tsx` renders list cards only and has no per-batch secondary action controls
   - Adding Brew Again there in MVP would require denser list UI and additional reads
   - The repo clearly supports starting with BatchDetail-only

## Intended outcome
The MVP should behave like this:

1. On a completed or archived batch, the user can tap `Brew Again`
2. The app loads:
   - the original batch’s F1-start setup
   - saved F1 outcome if present
   - saved F2 outcome if present
   - current F2 setup summary if present
3. The launcher shows a compact “what happened last time” summary
4. The launcher classifies the batch at runtime as one of:
   - repeat candidate
   - repeat with adjustments
   - not ideal reference
5. The launcher offers three modes:
   - Repeat exactly
   - Repeat with suggested changes
   - Start from this batch and edit manually
6. The user can review which suggestions are being applied
7. The flow hands off into `NewBatch` with explicit prefilled state and a visible source summary
8. Creating the new batch stores provenance on the new batch record

## Files and systems involved
1. Route files
   - `src/App.tsx`
   - likely no new route in MVP

2. Batch detail files
   - `src/pages/BatchDetail.tsx`
   - new Brew Again launcher component(s), likely under `src/components/brew-again/`

3. New batch files
   - `src/pages/NewBatch.tsx`
   - likely needs `useLocation` support plus a visible “based on previous batch” review card

4. Domain helpers in `src/lib`
   - `src/lib/phase-outcomes.ts`
   - `src/lib/f2-current-setup.ts`
   - `src/lib/batches.ts`
   - `src/lib/batch-timing.ts` only if suggestion copy references timing concepts
   - new helper(s), likely:
     - `src/lib/brew-again.ts`
     - `src/lib/brew-again-types.ts`

5. Supabase tables
   - `kombucha_batches`
   - `batch_phase_outcomes`
   - `batch_f2_setups`
   - `batch_f2_bottle_groups`
   - `batch_bottles`
   - `batch_bottle_ingredients`

6. Migrations
   - new migration if provenance is added to `kombucha_batches`

7. Generated types
   - `src/integrations/supabase/types.ts`

## Risks and compatibility checks
1. Reusing the wrong provenance field
   - `starter_source_batch_id` must not be repurposed for Brew Again provenance

2. Overpromising recommendations
   - Suggestion logic must remain simple, visible, and explainable

3. Duplicating stage logic in components
   - The launcher should use runtime classification helpers, not embed ad hoc rules in JSX

4. Copying stale batch state
   - Current stage, history, reminders, outcomes, photos, and completion flags must never be copied into the new record

5. Pretending F2 can be fully copied into new-batch creation
   - The repo stores F2 setup later in the lifecycle, so F2 suggestions must mostly be review guidance in MVP unless the flow is expanded

6. Losing handoff state on refresh
   - Navigation state is the simplest MVP handoff, but it is ephemeral
   - `NewBatch` must gracefully fall back to default create mode if state is missing

7. Provenance compatibility for existing batches
   - New provenance must be nullable so historical batches remain valid

8. Scope creep into archive/list UI
   - The MVP should stay on BatchDetail only

## Milestones

### Milestone 1: Define provenance and suggestion engine shape
Goal:
Lock the provenance model, handoff model, and suggestion engine input/output.
Acceptance criteria:
1. The plan names the exact provenance field or relation
2. The plan explains how `NewBatch` will receive prefilled state
3. The plan defines a structured suggestion output shape and runtime classification approach
Files expected:
1. `supabase/migrations/<timestamp>_brew_again_provenance.sql` if provenance is added
2. `src/integrations/supabase/types.ts`
3. new helper file(s) in `src/lib/`
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 2: Add BatchDetail launcher and outcome summary
Goal:
Implement the BatchDetail entry point and first-step review UI.
Acceptance criteria:
1. Brew Again is available from completed/archived BatchDetail
2. The launcher summarizes prior F1 and F2 outcomes
3. The user can choose among the three restart modes
Files expected:
1. `src/pages/BatchDetail.tsx`
2. new Brew Again component(s)
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
Status: completed

### Milestone 3: Add structured suggestions and review controls
Goal:
Implement explainable suggestion generation and user review of applied changes.
Acceptance criteria:
1. Repeat with suggested changes shows a small, structured list of adjustments
2. Suggestions are reviewable and toggleable
3. The default highlighted mode responds to the prior outcome classification
Files expected:
1. new `src/lib/brew-again*.ts`
2. new Brew Again UI component(s)
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
Status: completed

### Milestone 4: Handoff into NewBatch and persist provenance
Goal:
Wire the chosen mode into `NewBatch`, prefill the form, and create the new batch with provenance.
Acceptance criteria:
1. `NewBatch` can receive Brew Again prefill state safely
2. The page shows a compact source/suggestion summary before creation
3. Creating the batch stores provenance on the new batch record
Files expected:
1. `src/pages/NewBatch.tsx`
2. `src/pages/BatchDetail.tsx`
3. `src/integrations/supabase/types.ts`
4. provenance migration if used
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

### Milestone 5: Cleanup, compatibility checks, and deferrals
Goal:
Finalize the MVP boundary and record follow-up work without expanding scope.
Acceptance criteria:
1. Existing batches still work without provenance
2. Deferred ideas are captured clearly
Files expected:
1. plan update only unless small cleanup is needed
Validation:
1. final repo checks
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`
2. Inspected `src/pages/NewBatch.tsx` and confirmed there is no current prefill mechanism, no `useLocation` handling, and only F1-start fields are exposed today
3. Inspected `src/pages/BatchDetail.tsx` and confirmed it is the best MVP launch point because it already contains phase outcomes, completed/archived context, and action-area cards
4. Inspected `src/lib/phase-outcomes.ts` and confirmed the new F1/F2 outcome model already contains `next_time_change`, tags, notes, and per-phase result fields
5. Inspected `src/lib/f2-persistence.ts` and `src/lib/f2-current-setup.ts` and confirmed F2 setup is persisted later in the lifecycle, separately from initial batch creation
6. Inspected `src/App.tsx` and confirmed the best handoff target is still the existing `/new-batch` route
7. Inspected `src/pages/MyBatches.tsx` and confirmed list surfaces do not currently support dense secondary actions, so BatchDetail-only entry is the right MVP
8. Checked `kombucha_batches` in `src/integrations/supabase/types.ts` and confirmed `starter_source_batch_id` exists but is semantically tied to starter source, not Brew Again provenance
9. Added `supabase/migrations/20260322010805_brew_again_provenance.sql` and updated `src/integrations/supabase/types.ts` with `brew_again_source_batch_id`
10. Added `src/lib/brew-again-types.ts` and `src/lib/brew-again.ts` to centralize Brew Again prefill, classification, suggestion generation, and navigation-state handling
11. Ran `npx tsc -b` and `npm run lint` after Milestone 1; typecheck passed and lint still only reported the existing fast-refresh warnings in shared UI/context files
12. Added `src/components/brew-again/BrewAgainLauncher.tsx` and wired it into completed/archived `BatchDetail` as the BatchDetail-only MVP entry point
13. Ran `npx tsc -b`, `npm run lint`, and `npm run test` after the launcher milestone; typecheck passed, lint stayed warning-only, and tests still failed inside the sandbox with the existing `spawn EPERM`
14. Extended the launcher to show structured outcome-aware suggestions with toggle controls that only apply in `Repeat with suggested changes`
15. Ran `npx tsc -b`, `npm run lint`, and `npm run test` after the suggestion-review milestone; typecheck passed, lint stayed warning-only, and tests still failed inside the sandbox with the same `spawn EPERM`
16. Updated `src/pages/NewBatch.tsx` to accept Brew Again navigation state, prefill the existing create form, render a source-summary card, and save `brew_again_source_batch_id` on insert
17. Ran `npx tsc -b`, `npm run lint`, `npm run test`, and `npm run build` after the final handoff milestone
18. Confirmed `npm run test` and `npm run build` pass outside the sandbox; the earlier failures were environment-only `spawn EPERM` limitations, not repo-code failures

## Decision log
1. MVP entry point should live in `BatchDetail` only.
Why:
   - The previous batch context, phase outcomes, and current status are already loaded there
   - `MyBatches` cards are intentionally simple and would need wider UI changes for per-item actions

2. Use a lightweight launcher from `BatchDetail`, then hand off into the existing `/new-batch` route.
Why:
   - `NewBatch` already owns batch creation
   - This avoids duplicating creation logic in a modal or dedicated route
   - The launcher can stay focused on summary and mode selection

3. The simplest safe MVP handoff is navigation state into `NewBatch`.
Why:
   - There is no current prefill mechanism
   - Navigation state is sufficient for a same-session handoff and keeps the implementation local to `BatchDetail` and `NewBatch`
   - `NewBatch` can fall back to normal defaults if the state is missing after refresh

4. Provenance should be stored on `kombucha_batches` directly via a new nullable source-batch field, not in a separate relation table.
Why:
   - MVP only needs one optional source batch reference
   - This matches the rest of the current schema style
   - A separate relation table would add complexity without helping the first pass
Recommended field:
   - `brew_again_source_batch_id uuid REFERENCES public.kombucha_batches(id) ON DELETE SET NULL`

5. Do not reuse `starter_source_batch_id` for Brew Again provenance.
Why:
   - It already has different semantics and validation rules
   - A user may brew again from a batch without using that exact batch as starter liquid

6. Suggested changes should be represented as structured suggestion objects, not hidden direct mutations.
Why:
   - The product intent requires explainable recommendations
   - The user must stay in control
Recommended shape:
   - `id`
   - `phase`
   - `kind`
   - `reason`
   - `summary`
   - `effectType` (`prefill_patch` or `advisory_only`)
   - optional `prefillPatch` for fields `NewBatch` can really change

7. Most F2 suggestions should remain advisory-only in MVP.
Why:
   - `NewBatch` does not create F2 setup today
   - The repo stores F2 setup separately through the later F2 wizard
Examples:
   - “chill earlier next time”
   - “reduce flavour strength”
   - “allow more carbonation time”

8. Only suggestions that map to real `NewBatch` form fields should auto-apply in `Repeat with suggested changes`.
Likely candidates:
   - batch name normalization only
   - possibly `targetPreference` if the outcome-to-target mapping is simple and clearly explained
Current lean:
   - keep even these conservative, and prefer advisory text over automatic field changes unless the mapping is obvious

9. Brew Again classification should exist in MVP, but computed at runtime, not persisted.
Why:
   - It is derived from existing F2/F1 outcomes
   - There is no need to store a separate classification field yet
Recommended effects:
   - `repeat_candidate` highlights `Repeat exactly`
   - `repeat_with_adjustments` highlights `Repeat with suggested changes`
   - `not_ideal_reference` highlights `Edit manually` or `Repeat with suggested changes`, while still keeping `Repeat exactly` available

10. Outcome summaries should appear in both places:
   - full compact summary in the Brew Again launcher
   - smaller source-summary card in `NewBatch`
Why:
   - The launcher helps mode selection
   - The `NewBatch` reminder keeps accepted suggestions visible before create

11. Keep the first Brew Again handoff on the existing `NewBatch` page instead of adding a separate review route.
Why:
   - `NewBatch` already owns the insert path
   - Navigation state plus a source-summary card keeps the implementation small and reviewable

12. Use navigation state for the MVP handoff and let `NewBatch` fall back to normal create mode if that state is missing.
Why:
   - This keeps the feature scoped to the current route structure
   - It avoids introducing temporary persistence or a parallel create draft store

## Open questions
1. Whether any outcome-derived change is safe enough to auto-apply to a real `NewBatch` field beyond the source batch name.
Current lean:
   - likely very few
   - use structured advisory suggestions for most learning in MVP

2. Whether the team wants the source-batch provenance field to be named `brew_again_source_batch_id`, `reference_batch_id`, or `duplicated_from_batch_id`.
Current lean:
   - `brew_again_source_batch_id` is clearest for this feature and least likely to be confused with starter source
Resolved:
   - implemented as `brew_again_source_batch_id`

## Done when
1. The repo has a concrete plan for an outcome-aware Brew Again launcher from BatchDetail
2. The plan defines the three restart modes and the runtime classification logic
3. The plan explains how `NewBatch` will receive prefilled state and how it should render source/suggestion context
4. The plan distinguishes what will be truly prefilled versus what remains advisory-only
5. The plan names the exact provenance schema change, types update, and frontend read/write paths
6. The plan keeps the MVP scoped to explainable, beginner-friendly behavior without turning into a recommendation engine

## Final validation
Baseline for this planning task:
1. `npx tsc -b` passed during the recent outcome-logging implementation
2. `npm run lint` passed with the same existing fast-refresh warnings only
3. `npm run test` and `npm run build` are still valid repo commands but continue to fail in this sandbox with `spawn EPERM` while starting Vitest/Vite

Commands to run during implementation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Implementation notes for the eventual coding pass:
1. Exact migration likely needed:
   - add `brew_again_source_batch_id uuid NULL REFERENCES public.kombucha_batches(id) ON DELETE SET NULL` to `public.kombucha_batches`
   - add an index on `brew_again_source_batch_id`
   - update any relevant RLS-safe foreign-key type generation
2. Exact generated types update needed:
   - update `src/integrations/supabase/types.ts` for the new `kombucha_batches` field
3. Exact frontend read/write paths to change:
   - read source batch, phase outcomes, and current F2 setup from `src/pages/BatchDetail.tsx`
   - generate suggestions in a new `src/lib/brew-again.ts`
   - pass prefill/navigation state from `src/pages/BatchDetail.tsx` into `src/pages/NewBatch.tsx`
   - write `brew_again_source_batch_id` from `src/pages/NewBatch.tsx` during insert
4. Steps Codex can do in-repo:
   - add the migration file
   - update the generated types file in the repo
   - implement the launcher, suggestion helper, and `NewBatch` prefill support
5. Steps that must be run manually against Supabase:
   - apply the migration to the target Supabase project
   - regenerate types from the live schema if the team relies on remote-schema generation

Recommended MVP data categories

Category A: Always copy into `NewBatch` prefill
1. `total_volume_ml`
2. `tea_type`
3. `sugar_g`
4. `starter_liquid_ml`
5. `scoby_present`
6. `avg_room_temp_c`
7. `vessel_type`
8. `target_preference`

Category B: Copy but require review/edit
1. `name`
   - should be normalized for a new batch, not reused blindly
2. `brewDate`
   - should default to today, not the old brew date
3. `initial_ph`
   - likely better left blank by default because it was a one-time measurement, unless the user chooses to keep it
4. `initial_notes`
   - likely replace with Brew Again review context rather than copy stale setup notes directly
5. outcome-derived suggestions
   - shown explicitly and accepted/rejected before handoff

Category C: Never copy
1. `status`
2. `current_stage`
3. `next_action`
4. `readiness_window_start`
5. `readiness_window_end`
6. `completed_at`
7. `archived_at`
8. `discarded_at`
9. `discard_reason`
10. `updated_at`
11. timeline/history rows in `batch_stage_events` and `batch_logs`
12. `batch_phase_outcomes`
13. `batch_reminders`
14. `batch_photos`
15. existing F2 live state
16. `batch_f2_setups`
17. `batch_f2_bottle_groups`
18. `batch_bottles`
19. `batch_bottle_ingredients`

Recommended runtime classification
1. `repeat_candidate`
   - F2 outcome exists
   - `f2_brew_again = yes`
   - `f2_overall_result` is `excellent` or `good`
   - no strongly negative tags like `too_fizzy` plus `bad`
2. `repeat_with_adjustments`
   - `f2_brew_again = maybe_with_changes`
   - or mixed outcome with useful change signals from F1/F2 tags or `next_time_change`
3. `not_ideal_reference`
   - `f2_brew_again = no`
   - or `f2_overall_result` is `disappointing` or `bad`
   - or only negative signals exist and there is no clear “repeat exactly” case

Recommended first-pass suggestion mapping
1. F1-derived, mostly advisory:
   - `too_sweet` or `maybe_early` -> suggest later F1 check / allow more F1 time
   - `tart`, `too_sour`, or `maybe_late` -> suggest earlier F1 tasting / shorter F1 window
   - `weak_tea_base` or `strong_tea_base` -> advisory only unless `NewBatch` later exposes tea-strength fields
2. F2-derived, advisory-only in MVP:
   - `too_flat` -> suggest allowing more F2 time before chilling
   - `too_fizzy` -> suggest checking sooner and chilling earlier
   - `flavor_too_weak` -> suggest stronger flavouring next time
   - `flavor_too_strong` -> suggest reducing flavouring next time
3. `next_time_change`
   - should be surfaced verbatim as the highest-trust user-authored suggestion, not overwritten by generated copy

Recommended MVP UI flow
1. `BatchDetail` on completed/archived batch:
   - `Brew Again` button in the header area or near the outcome cards
2. Brew Again launcher:
   - compact previous-batch summary
   - compact F1 summary
   - compact F2 summary
   - source-quality classification
   - three modes
   - visible suggestion list with toggles for `Repeat with suggested changes`
3. Handoff to `NewBatch`:
   - navigation state carries source batch summary, accepted suggestions, and prefill object
   - `NewBatch` shows a “Based on <batch name>” card above the form
   - user can still edit everything before creating

Recommended MVP boundary
1. Include now:
   - BatchDetail-only launcher on completed/archived batches
   - F1/F2 summary in the launcher
   - runtime classification
   - three modes
   - small structured suggestion list
   - navigation-state handoff into `NewBatch`
   - provenance column on `kombucha_batches`
2. Defer:
   - list/archive Brew Again buttons
   - automatic F2 setup duplication
   - aggregate multi-batch learning
   - repeated-batch analytics
   - archive filters and reference labels
   - advanced recommendation logic
