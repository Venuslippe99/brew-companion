# F1 Recipe and Setup Studio Phase 1

## Summary
Introduce Phase 1 of the F1 Recipe and Setup Studio by adding reusable F1 recipes, a recipe-aware New Batch workflow, and a clear separation between reusable recipe defaults and actual brew-day batch values. This phase should modernize F1 setup without changing batch lifecycle rules, starter lineage behavior, or F2 persistence patterns.

## Why
`src/pages/NewBatch.tsx` is currently a flat F1 creation form that writes directly into `kombucha_batches`. That works for first-time creation, but it makes repeat brewing slow, hides the difference between reusable setup defaults and what was actually brewed, and leaves the app without a durable F1 recipe identity that later lineage-aware and outcome-aware features can build on.

Phase 1 is needed to:
1. Let users save and reuse F1 recipes without turning recipes into hidden mutable batch state
2. Make repeat brewing faster while keeping beginner review and edit steps explicit
3. Preserve actual brew-day truth on the created batch for timing, lineage, and history
4. Create a stable persistence model that later phases can extend with vessels, recommendations, and outcome learning without forcing a redesign

## Scope
In scope:
1. A new reusable `f1_recipes` persistence model for user-owned F1 recipe defaults
2. Recipe linkage from a created batch back to the chosen recipe
3. Expansion of actual F1 setup data on `kombucha_batches` where the current schema is too coarse
4. A recipe-aware `NewBatch` entry flow with:
   - start from scratch
   - start from saved recipe
   - save current setup as a recipe
5. A beginner-friendly live F1 setup summary in `NewBatch`
6. A Phase 1 F1 recipe library for browse, create, edit, duplicate, archive, and select-for-new-batch flows
7. Continued compatibility with current starter source lineage selection and Brew Again provenance
8. Concrete migration, RLS, frontend read/write, and generated-type planning

Out of scope:
1. Saved vessel library or vessel suitability intelligence
2. Lineage-driven smart recommendations
3. Outcome-aware recipe optimization
4. Full adaptive learning or recipe scoring systems
5. Major redesign of `BatchDetail` or unrelated routes
6. A new `batch_f1_setups` table in Phase 1 unless later implementation finds a blocker not visible in current schema review
7. Changes to batch stages, next-action rules, or F1/F2 lifecycle meaning
8. Moving deep per-batch workflow behavior out of `BatchDetail`

## Current state
The current repo state relevant to this feature:

1. `src/pages/NewBatch.tsx`
   - Owns the direct F1 batch creation flow
   - Keeps form state local in the page
   - Supports `brewAgainState` via route navigation state and already renders starter lineage context through `StarterSourceSelector`
   - Inserts directly into `kombucha_batches` with `status = active` and `current_stage = f1_active`
   - Currently captures only these F1 setup fields:
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
   - It also writes `starter_source_type`, `starter_source_batch_id`, and `brew_again_source_batch_id` when that context exists
   - It does not support reusable F1 recipes, recipe linkage, tea source form, tea amount, sugar type, or a recipe-aware editing/review flow

2. `src/lib/lineage.ts`
   - Treats lineage as a batch relationship, not a recipe relationship
   - `loadStarterSourceCandidates` reads `kombucha_batches` and filters valid prior batches for starter usage
   - `loadBatchLineage` assembles parent/child relationships using `starter_source_batch_id` and `brew_again_source_batch_id`
   - This confirms starter source selection must remain a batch-level choice in Phase 1

3. `src/lib/phase-outcomes.ts`
   - Persists F1 and F2 outcome memory in `batch_phase_outcomes`
   - Already provides the later compatibility anchor for correlating outcomes with recipes and actual setups
   - Phase 1 should preserve this future path but should not start generating smart recommendations from it yet

4. `src/lib/batches.ts`
   - Centralizes the `KombuchaBatch` shape, stage labels, and `getNextAction(...)`
   - Current F1 setup fields on the shared batch type are still coarse: `teaType`, `sugarG`, `starterLiquidMl`, `scobyPresent`, `avgRoomTempC`, `vesselType`, `targetPreference`, `initialPh`, `initialNotes`
   - There is no current F1 recipe identity or richer actual composition model here yet

5. `src/lib/batch-timing.ts`
   - Derives F1 timing from brew date, room temperature, target preference, starter liquid, and total volume
   - This means actual brew-day values for total volume and starter liquid must remain batch truth and cannot be replaced by recipe defaults
   - Starter ratio is already derivable from stored batch values and should stay derived, not separately persisted

6. `src/lib/f2-types.ts` and `src/lib/f2-persistence.ts`
   - F2 already has a more structured draft and persistence model
   - `batch_f2_setups` stores actual batch-linked setup state
   - F2 recipes are handled as reusable recipe entities plus batch-linked setup and recipe snapshot data
   - This is the closest in-repo pattern for separating reusable recipe defaults from actual per-batch data
   - Phase 1 should borrow the architectural lesson, but not copy the full F2 complexity where it is not needed yet

7. `src/pages/BatchDetail.tsx`
   - Already reads `kombucha_batches`, reminders, timeline, lineage, phase outcomes, and F2 setup context
   - It is a key consumer that will later need to display recipe linkage and richer F1 setup details without breaking its current lifecycle and history surfaces
   - This page already proves that lineage, outcomes, and setup context need to remain compatible across multiple features

8. `src/integrations/supabase/types.ts`
   - Confirms `kombucha_batches` currently includes:
     - `brew_again_source_batch_id`
     - `starter_source_batch_id`
     - `starter_source_type`
     - `tea_type`
     - `sugar_g`
     - `starter_liquid_ml`
     - `total_volume_ml`
   - It does not currently include:
     - `f1_recipe_id`
     - `tea_source_form`
     - `tea_amount_value`
     - `tea_amount_unit`
     - `sugar_type`
     - any F1 recipe snapshot or recipe-name snapshot field

9. Relevant schema history in `supabase/migrations`
   - `20260321094256_086299fa-5c95-4880-986a-654daa0944dd.sql` created `kombucha_batches` and the existing F2 tables
   - `20260321102419_e39d15db-2172-4e12-b4ed-f0cf90b1e4b3.sql` and `supabase/migrations/20260321113000_schema_hardening.sql` hardened lifecycle consistency and same-user starter lineage rules
   - `20260322010805_brew_again_provenance.sql` added `brew_again_source_batch_id`
   - There is no existing `f1_recipes` table or F1 recipe linkage schema yet

10. Current schema limitations for Phase 1
   - `kombucha_batches` cannot preserve actual tea source form, tea amount, tea amount unit, or sugar type for brew-day truth
   - There is no durable way to say "this batch was brewed from recipe X"
   - There is no recipe library table, no recipe RLS, and no generated types for recipe reads and writes

## Intended outcome
Phase 1 should deliver the following concrete user experience:

1. Start from scratch
   - The user opens `NewBatch`
   - The top of the page clearly offers `Start from scratch` and `Use saved recipe`
   - The user can fill the full F1 setup, including richer tea and sugar fields
   - The page shows a live setup summary that makes the configuration easy to review in plain language
   - Before saving the batch, the user can choose `Save as recipe` without losing the separation between recipe defaults and today's actual batch values

2. Start from a saved recipe
   - The user can open a recipe picker directly from `NewBatch`
   - Choosing a recipe pre-fills the editable setup form with recipe defaults
   - The recipe is shown as the source of defaults, not the locked truth of the batch
   - The user can still change actual brew-day values such as volume, starter amount, tea amount, room temperature, notes, and starter lineage before creating the batch
   - Creating the batch preserves both the actual brewed values and the linked recipe identity

3. Save a manual setup as a recipe
   - A user building a setup manually can save the current configuration as a reusable F1 recipe
   - Saving the recipe does not create a batch by itself
   - Creating the batch later from that setup does not silently overwrite the recipe

4. Preserve starter source and Brew Again compatibility
   - Starter source batch selection remains part of the actual batch creation review, not part of the reusable recipe
   - Existing `brewAgainState` prefill remains compatible and can coexist with recipe-derived defaults
   - Future analysis can correlate recipe, starter lineage, actual brew-day setup, and phase outcomes because the batch stores actual values and nullable recipe linkage separately

5. Beginner-friendly clarity
   - The UI explicitly distinguishes:
     - recipe defaults
     - today's actual batch values
   - The live summary keeps the setup legible without acting like a recommendation engine
   - The flow remains explicit and reviewable rather than collapsing into hidden smart automation

## Files and systems involved
1. Route files
   - `src/App.tsx`
   - recommended new route for a dedicated library page: `src/pages/F1Recipes.tsx`

2. Batch creation page
   - `src/pages/NewBatch.tsx`

3. Existing reusable components and related surfaces
   - `src/components/StarterSourceSelector.tsx`
   - any existing form or card primitives already used by `NewBatch`

4. Proposed new recipe surfaces
   - `src/pages/F1Recipes.tsx`
   - `src/components/f1/F1RecipePicker.tsx`
   - `src/components/f1/F1RecipeCard.tsx`
   - `src/components/f1/F1RecipeEditor.tsx`
   - `src/components/f1/F1SetupSummary.tsx`
   - names may vary, but Phase 1 should use a dedicated `src/components/f1/` namespace rather than overloading page-local JSX

5. Shared domain helpers in `src/lib`
   - `src/lib/lineage.ts`
   - `src/lib/phase-outcomes.ts`
   - `src/lib/batches.ts`
   - `src/lib/batch-timing.ts`
   - `src/lib/f2-types.ts`
   - `src/lib/f2-persistence.ts`
   - recommended new helpers:
     - `src/lib/f1-recipes.ts`
     - `src/lib/f1-recipe-types.ts`
     - optional `src/lib/f1-setup-summary.ts` if summary shaping becomes non-trivial

6. Persistence helpers and read/write orchestration
   - `src/pages/NewBatch.tsx` current insert path into `kombucha_batches`
   - recommended new recipe CRUD helper in `src/lib/f1-recipes.ts`
   - `src/pages/BatchDetail.tsx` later read-path consumer for recipe linkage and richer setup display

7. Supabase tables and views
   - existing `kombucha_batches`
   - existing `batch_phase_outcomes`
   - existing `batch_stage_events`
   - existing `batch_logs`
   - recommended new `f1_recipes`
   - no Phase 1 schema change required to `batch_phase_outcomes`, `batch_stage_events`, or `batch_logs`
   - no new view is required in Phase 1

8. Supabase migrations
   - new migration to create `public.f1_recipes`
   - new migration to add recipe linkage and richer actual F1 fields on `public.kombucha_batches`
   - RLS policies for `f1_recipes`
   - index creation for recipe ownership and recipe linkage

9. Generated types
   - `src/integrations/supabase/types.ts`

## Risks and compatibility checks
1. Mixing recipe defaults with actual batch values
   - The implementation must keep recipe defaults in `f1_recipes` and actual brew-day truth in `kombucha_batches`

2. Under-modeling actual F1 composition
   - If Phase 1 adds recipe persistence but does not expand batch fields, later timing, lineage, and outcome correlation will rely on incomplete brew-day data

3. Breaking the current `NewBatch` flow
   - Recipe support must remain additive and must not block start-from-scratch creation or current Brew Again prefill behavior

4. Destructive or ambiguous recipe editing
   - Editing a recipe must not silently mutate already-created batches
   - Duplication should be preferred over hidden overwrite when users want to branch a recipe

5. Losing starter lineage compatibility
   - `starter_source_batch_id` and `starter_source_type` must remain batch-level and continue to satisfy existing same-user and consistency constraints

6. Drifting into later-phase intelligence too early
   - Phase 1 should not compute lineage or outcome recommendations from `src/lib/lineage.ts` or `src/lib/phase-outcomes.ts`

7. Schema changes that fail to preserve existing batches
   - New `kombucha_batches` columns must be nullable or safely backfilled
   - Existing stored batches must remain valid without recipe linkage

8. Future inability to connect recipes, lineage, and outcomes
   - The plan must preserve nullable recipe linkage on batches and actual F1 composition fields so later features can join:
     - `kombucha_batches`
     - `f1_recipes`
     - lineage relationships
     - `batch_phase_outcomes`

9. Validation gaps across schema, frontend, and generated types
   - Any implementation must trace:
     - migration files
     - generated Supabase types
     - `NewBatch` write path
     - `BatchDetail` and future recipe-library read paths

10. Batch lifecycle consistency
   - Recipe support must not fork `getNextAction(...)`, stage labels, or timing semantics inside JSX

11. Timeline and history impact
   - Creating a batch from a recipe should not create fake stage-history or phase-outcome records
   - `batch_stage_events` and `batch_logs` behavior should remain tied to actual lifecycle events, not recipe selection

12. Backwards compatibility for existing F2 setups
   - Phase 1 must not alter `batch_f2_setups`, `batch_f2_bottle_groups`, `batch_bottles`, or `batch_bottle_ingredients`
   - It should stay compatible with the current F2 snapshot and recipe-linkage model

13. Safety and clarity of guidance
   - The live setup summary should stay descriptive and beginner-friendly, not falsely certain fermentation advice

## Milestones

### Milestone 1: Lock the Phase 1 data model and schema direction
Goal:
Define the exact separation between reusable recipe defaults and actual batch values, and confirm the minimal schema additions needed for Phase 1.
Acceptance criteria:
1. The plan names the exact Phase 1 `f1_recipes` fields
2. The plan names the exact `kombucha_batches` additions required for actual brew-day truth
3. The plan explicitly decides whether `batch_f1_setups` is deferred or required
Files expected:
1. `plans/2026-03-23-f1-recipe-studio-phase-1.md`
2. later implementation: `supabase/migrations/<timestamp>_f1_recipes.sql`
3. later implementation: `src/integrations/supabase/types.ts`
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 2: Define the F1 recipe object and derived-summary strategy
Goal:
Specify the recipe object shape, derived metrics policy, and shared helper boundaries.
Acceptance criteria:
1. The plan documents recipe identity fields and recipe default fields
2. The plan explicitly decides to derive starter ratio, sugar-per-liter, and any normalized setup metrics in shared helpers instead of storing them
3. The plan recommends concrete helper files under `src/lib/`
Files expected:
1. `plans/2026-03-23-f1-recipe-studio-phase-1.md`
2. later implementation: `src/lib/f1-recipe-types.ts`
3. later implementation: `src/lib/f1-recipes.ts`
4. optional later implementation: `src/lib/f1-setup-summary.ts`
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 3: Define the recipe-aware New Batch UX
Goal:
Lock the user flow for start-from-scratch, start-from-saved-recipe, and save-current-setup-as-recipe.
Acceptance criteria:
1. The plan gives a concrete recommendation for where recipe selection lives in `NewBatch`
2. The plan preserves starter source selection and Brew Again compatibility
3. The plan keeps recipe-derived values fully editable before batch creation
Files expected:
1. `plans/2026-03-23-f1-recipe-studio-phase-1.md`
2. later implementation: `src/pages/NewBatch.tsx`
3. later implementation: `src/components/f1/F1RecipePicker.tsx`
4. later implementation: `src/components/f1/F1SetupSummary.tsx`
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
Status: completed

### Milestone 4: Define the recipe library scope and management surface
Goal:
Choose the Phase 1 recipe-library surface strategy and document the minimum CRUD behavior.
Acceptance criteria:
1. The plan decides whether Phase 1 includes a dedicated page, an inline drawer, or both
2. The plan covers browse, choose, create, edit, duplicate, archive, and safe-delete behavior
3. The plan keeps management scope distinct from batch creation
Files expected:
1. `plans/2026-03-23-f1-recipe-studio-phase-1.md`
2. later implementation: `src/pages/F1Recipes.tsx`
3. later implementation: `src/components/f1/F1RecipeCard.tsx`
4. later implementation: `src/components/f1/F1RecipeEditor.tsx`
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
Status: completed

### Milestone 5: Define the live F1 setup summary and beginner-review layer
Goal:
Specify the live setup summary content, tone, and helper inputs.
Acceptance criteria:
1. The plan names the minimum summary fields shown in New Batch
2. The plan describes the plain-language setup summary
3. The plan keeps the summary descriptive rather than recommendation-driven
Files expected:
1. `plans/2026-03-23-f1-recipe-studio-phase-1.md`
2. later implementation: `src/components/f1/F1SetupSummary.tsx`
3. optional later implementation: `src/lib/f1-setup-summary.ts`
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 6: Define frontend read/write paths and Supabase persistence
Goal:
Trace the exact CRUD paths, migrations, indexes, foreign keys, policies, and type updates required for Phase 1.
Acceptance criteria:
1. The plan documents the exact `NewBatch` write path changes
2. The plan documents the new recipe CRUD path
3. The plan lists required foreign keys, indexes, RLS policies, and generated-type updates
Files expected:
1. `plans/2026-03-23-f1-recipe-studio-phase-1.md`
2. later implementation: `supabase/migrations/<timestamp>_f1_recipes.sql`
3. later implementation: `src/integrations/supabase/types.ts`
4. later implementation: `src/lib/f1-recipes.ts`
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

### Milestone 7: Confirm lineage, Brew Again, and future recommendation compatibility
Goal:
Document how Phase 1 preserves current lineage behavior and future recipe intelligence.
Acceptance criteria:
1. The plan states that starter source stays batch-level
2. The plan explains how recipe linkage can later correlate with lineage and outcomes
3. The plan confirms no lifecycle-rule drift from shared helpers
Files expected:
1. `plans/2026-03-23-f1-recipe-studio-phase-1.md`
2. later implementation touchpoints: `src/lib/lineage.ts`, `src/lib/phase-outcomes.ts`, `src/pages/NewBatch.tsx`, `src/pages/BatchDetail.tsx`
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 8: Record baseline validation and implementation blockers
Goal:
Capture the validation approach and any known baseline caveats before coding starts.
Acceptance criteria:
1. The plan lists the final repo validation commands
2. The plan distinguishes pre-existing failures from new implementation failures if any appear later
3. The plan is complete enough for milestone-by-milestone implementation without chat-history reconstruction
Files expected:
1. `plans/2026-03-23-f1-recipe-studio-phase-1.md`
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`
2. Inspected `src/pages/NewBatch.tsx` and confirmed the current flow is a direct local-state form that inserts into `kombucha_batches`
3. Confirmed `NewBatch` already supports starter source lineage selection and Brew Again prefill, which Phase 1 must preserve
4. Inspected `src/lib/lineage.ts` and confirmed starter lineage is modeled as a batch relationship, not a recipe relationship
5. Inspected `src/lib/phase-outcomes.ts` and confirmed outcome logging already exists for future recipe intelligence but should remain unused for smart recommendations in Phase 1
6. Inspected `src/lib/batches.ts` and `src/lib/batch-timing.ts` and confirmed lifecycle, next-action, and timing logic are centralized and must not be forked
7. Inspected `src/lib/f2-types.ts` and `src/lib/f2-persistence.ts` and confirmed F2 already follows a reusable-recipe plus batch-linked setup pattern that Phase 1 can partially mirror
8. Inspected `src/pages/BatchDetail.tsx` and confirmed it is a downstream consumer that will later need recipe-linkage compatibility
9. Inspected `src/integrations/supabase/types.ts` and confirmed the current `kombucha_batches` schema still lacks F1 recipe linkage and richer actual F1 composition fields
10. Inspected relevant `supabase/migrations` history and confirmed current schema hardening around starter lineage and lifecycle consistency
11. Created this Phase 1 execution plan file only; no feature code or schema changes were implemented
12. Added `supabase/migrations/20260323110000_f1_recipe_studio_phase_1.sql` with the new `f1_recipes` table, nullable `kombucha_batches` recipe linkage and richer actual F1 fields, same-user recipe safety checks, indexes, and RLS policies
13. Updated `src/integrations/supabase/types.ts` to include `f1_recipes` and the new `kombucha_batches` fields
14. Ran Milestone 1 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files; no new lint failures
15. Added `src/lib/f1-recipe-types.ts`, `src/lib/f1-recipes.ts`, and `src/lib/f1-setup-summary.ts`, then extended `src/lib/batches.ts` with the richer optional F1 fields used by recipe-aware flows
16. Milestone 2 validation initially failed in `npx tsc -b` because the new shared recipe helper needed explicit narrowing from the broader database enum and a missing summary field in the shared type; the helper was corrected before moving on
17. Re-ran Milestone 2 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same existing 9 `react-refresh/only-export-components` warnings; no new lint failures
18. Added a dedicated `src/components/f1/` surface set:
   - `F1RecipeEditor`
   - `F1RecipeCard`
   - `F1RecipePicker`
   - `F1SetupSummary`
19. Added `src/pages/F1Recipes.tsx` and routed `/f1-recipes` through `src/App.tsx` for recipe-library management
20. Rebuilt `src/pages/NewBatch.tsx` into a recipe-aware flow with:
   - start from scratch vs saved recipe entry
   - recipe picker
   - save-current-setup-as-recipe dialog
   - richer actual F1 fields
   - live setup summary
   - preserved Brew Again and starter lineage flow
21. Updated `src/lib/brew-again.ts`, `src/lib/brew-again-types.ts`, and `src/pages/BatchDetail.tsx` so Brew Again can carry the richer F1 setup fields into the new recipe-aware New Batch flow
22. Ran Milestones 3, 4, and 5 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same existing 9 `react-refresh/only-export-components` warnings; no new lint failures
   - `npm run test`: passed
23. Tightened the remaining compatibility path by:
   - adding `f1_recipe_id` and richer actual F1 setup fields to the Brew Again prefill model
   - updating `src/pages/BatchDetail.tsx` to read the new F1 fields from `kombucha_batches`
   - keeping starter-source lineage batch-level and unchanged
24. Added a safe delete guard in `src/pages/F1Recipes.tsx` so recipes linked to saved batches must be archived instead of hard-deleted
25. Polished the recipe editor so default SCOBY presence is an explicit yes/no choice
26. Ran Milestones 6, 7, and 8 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same existing 9 `react-refresh/only-export-components` warnings in shared UI/context files; no new lint failures
   - `npm run test`: passed
   - `npm run build`: passed
27. `npm run build` still reports the existing Browserslist age notice and large chunk warning; these are build-time warnings, not new feature failures

## Decision log
1. Recipes in Phase 1 should store reusable defaults, not actual brew-session state.
Why:
   - The core product principle is that a recipe is not the batch
   - Actual brew-day truth is required for timing, lineage, and later outcomes

2. Phase 1 should add a new `public.f1_recipes` table.
Recommended columns:
   - `id uuid primary key`
   - `user_id uuid not null`
   - `name text not null`
   - `description text null`
   - `target_total_volume_ml integer not null`
   - `tea_type text not null`
   - `tea_source_form text not null`
   - `tea_amount_value numeric not null`
   - `tea_amount_unit text not null`
   - `sugar_type text not null`
   - `sugar_amount_value numeric not null`
   - `sugar_amount_unit text not null`
   - `default_starter_liquid_ml integer not null`
   - `default_scoby_present boolean not null default true`
   - `target_preference brewing_goal_enum null`
   - `default_room_temp_c numeric null`
   - `default_notes text null`
   - `is_favorite boolean not null default false`
   - `archived_at timestamptz null`
   - `created_at timestamptz not null default now()`
   - `updated_at timestamptz not null default now()`
Why:
   - These fields cover the reusable F1 setup requested in Phase 1
   - User ownership, timestamps, and archive state are needed for a real library

3. Phase 1 should expand `public.kombucha_batches` rather than introduce `batch_f1_setups`.
Recommended new columns:
   - `f1_recipe_id uuid null references public.f1_recipes(id) on delete set null`
   - `tea_source_form text null`
   - `tea_amount_value numeric null`
   - `tea_amount_unit text null`
   - `sugar_type text null`
Why:
   - The batch itself is the source of actual F1 brew-day truth in the current architecture
   - A separate `batch_f1_setups` table would add complexity before there is a proven need for multiple F1 setup revisions per batch
   - Existing `kombucha_batches` already stores the other actual F1 setup fields

4. Phase 1 should not add a full F1 recipe snapshot JSON field on `kombucha_batches`.
Why:
   - Actual brew-day values belong directly on the batch and cover the main product need
   - Recipe linkage plus actual stored fields are sufficient for Phase 1 traceability
   - F2 needs snapshot JSON because its setup object is structurally richer; F1 does not yet need that overhead
Related rule:
   - Recipe archive should be the primary "remove from library" behavior
   - Hard delete, if offered, should be restricted to recipes with no linked batches or deferred behind an explicit confirmation flow

5. Normalized metrics such as starter ratio, sugar per liter, and any readable setup summaries should be derived in shared helpers, not stored.
Why:
   - Starter ratio is already derivable from `starter_liquid_ml` and `total_volume_ml`
   - Persisting normalized metrics would create drift risk
   - Tea-per-liter normalization is not reliably comparable across all units in Phase 1, so it should remain a calculated or display-only value when possible

6. Starter source batch selection remains batch-level, not recipe-level.
Why:
   - This matches current lineage modeling in `src/lib/lineage.ts`
   - It preserves same-user starter-source constraints and keeps recipe defaults from pretending to know today's lineage source

7. Creating a batch from a recipe should never silently mutate the recipe.
Why:
   - Users need freedom to adjust actual brew-day values
   - Recipes should be intentionally edited or duplicated through recipe-management flows, not side effects of batch creation

8. Recipe-derived batch creation should still allow full editing before save.
Why:
   - The app is beginner-first and review-oriented
   - Actual batch values must remain editable to reflect the real brew session

9. Phase 1 should include both:
   - a dedicated `F1Recipes` page for management
   - an inline recipe picker in `NewBatch` for selection
Recommended UX:
   - `NewBatch` gets a top-level recipe source card with `Start from scratch` and `Use saved recipe`
   - choosing a recipe opens a mobile-friendly drawer or sheet backed by reusable recipe-list content
Why:
   - Picking a recipe is contextual to batch creation
   - Managing recipes needs a fuller surface for edit, duplicate, archive, and favorites

10. The New Batch live summary should be descriptive, not advisory.
Minimum summary content:
   - total volume
   - starter amount
   - starter ratio
   - tea profile
   - sugar profile
   - target taste
   - short plain-language setup sentence
Why:
   - This makes the setup legible without blending into future smart recommendations

11. Phase 1 should preserve later compatibility with lineage and phase outcomes without implementing recommendation logic now.
Why:
   - `batch_phase_outcomes` and lineage relationships already exist
   - Recipe linkage plus actual batch composition are the foundational data needed for later phases

12. Recommended migration details for later implementation:
   - create `public.f1_recipes`
   - enable RLS on `public.f1_recipes`
   - add select, insert, update, and delete policies scoped to `user_id = auth.uid()`
   - add indexes on `f1_recipes(user_id)`, `f1_recipes(user_id, archived_at)`, and `f1_recipes(user_id, updated_at desc)`
   - alter `public.kombucha_batches` to add `f1_recipe_id`, `tea_source_form`, `tea_amount_value`, `tea_amount_unit`, and `sugar_type`
   - add an index on `kombucha_batches(f1_recipe_id)` where not null
Why:
   - These are the minimum schema pieces needed for recipe CRUD and linked-batch traceability

13. Keep Phase 1 actual sugar amount on batches in the existing `sugar_g` field and add only `sugar_type` as the new actual sugar composition field.
Why:
   - The repo already stores actual sugar quantity as grams on `kombucha_batches`
   - Adding a second actual sugar amount field in Phase 1 would duplicate data and increase drift risk

## Open questions
1. Whether Phase 1 should allow hard delete for linked recipes at all, or only archive them in the UI.
Current lean:
   - archive in normal UI
   - either disallow delete when linked batches exist or defer delete entirely

## Done when
1. The repo has a self-contained Phase 1 plan for F1 recipes and recipe-aware batch creation
2. The plan clearly separates reusable recipe defaults from actual batch values
3. The plan names the required Supabase migrations, RLS updates, indexes, foreign keys, and generated-type updates
4. The plan traces affected frontend read paths and write paths
5. The plan preserves starter lineage, Brew Again compatibility, lifecycle consistency, and F2 compatibility
6. The plan keeps scope tightly to Phase 1 and explicitly defers later intelligence features

## Final validation
Commands to run during later implementation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Baseline status for this planning task:
1. This task created a plan file only and did not run implementation validation commands
2. If any baseline failures are discovered during implementation, they must be recorded in this plan and distinguished from new failures introduced by Phase 1 changes

Implementation validation notes for the future coding pass:
1. Frontend write paths to update:
   - `src/pages/NewBatch.tsx` batch insert into `kombucha_batches`
   - new recipe create, update, and archive flows via `src/lib/f1-recipes.ts`
2. Frontend read paths to update:
   - `src/pages/NewBatch.tsx` recipe picker and recipe-derived prefill
   - `src/pages/F1Recipes.tsx` recipe library CRUD surface
   - `src/pages/BatchDetail.tsx` later recipe-linkage display and richer setup summary consumption
3. Generated types to keep aligned:
   - `src/integrations/supabase/types.ts`
4. Manual Supabase follow-through expected during implementation:
   - apply the migration or migrations to the target Supabase project
   - regenerate types if the team's workflow uses generated remote-schema output
