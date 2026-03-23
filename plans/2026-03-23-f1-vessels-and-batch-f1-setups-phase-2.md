# F1 Recipe and Setup Studio Phase 2: Vessels and Batch F1 Setups

## Summary
Phase 2 adds a reusable F1 vessel library, vessel-aware recipe defaults, vessel-aware batch creation, live vessel fit and suitability guidance, and a new `batch_f1_setups` snapshot layer so the actual F1 setup used for each batch is historically traceable without overloading `kombucha_batches`.

## Why
Phase 1 solved reusable F1 recipes and recipe-aware batch creation, but it still treats the fermentation vessel as a flat string and stores the applied F1 setup only as scattered batch columns. That leaves three product gaps:

1. Physical setup is under-modeled. Users cannot save, reuse, or compare their actual fermentation vessels.
2. Historical fidelity is incomplete. A batch remembers some F1 fields on `kombucha_batches`, but there is no stable snapshot of the full applied setup, recipe context, vessel context, and fit interpretation used on brew day.
3. Later intelligence has no clean anchor. Future lineage-aware and outcome-aware recommendation work will need a stable way to correlate recipe defaults, actual setup choices, vessel context, starter lineage, and F1 outcomes.

Phase 2 is the right place to introduce vessel structure and an applied F1 setup snapshot because Phase 1 already separated recipe defaults from batch truth, and the repo already uses an “operational record plus setup snapshot table” pattern for F2.

## Scope
In scope:
1. Add a reusable `fermentation_vessels` persistence model for user-owned F1 vessels.
2. Add optional preferred vessel linkage on `f1_recipes`.
3. Introduce `batch_f1_setups` as the applied F1 setup snapshot authority, with one current setup snapshot row per batch for Phase 2.
4. Evolve `src/pages/NewBatch.tsx` from string-only vessel selection into a vessel-aware workflow that supports recipe defaults, saved vessels, and manual fallback.
5. Add a dedicated vessel library route and management surface.
6. Add a generic vessel-fit helper that computes fill ratio, fit state, suitability state, and plain-language guidance from batch volume and vessel metadata.
7. Evolve the live F1 setup summary to include vessel and fit context.
8. Keep existing starter lineage selection, brew-again behavior, recipe linkage, and current batch lifecycle logic intact.
9. Add the required Supabase migrations, foreign keys, indexes, RLS policies, and generated type updates for the new tables and columns.

Out of scope:
1. Lineage-aware vessel or setup recommendations.
2. F1 outcome-aware optimization or adaptive setup suggestions.
3. Vessel material safety scoring beyond the explicit, interpretable Phase 2 fit and suitability model.
4. Broad redesign of unrelated pages or lifecycle flows.
5. Changes to stage progression, timing thresholds, or `getNextAction(...)`.
6. Moving detailed per-batch operational editing out of `src/pages/BatchDetail.tsx`.
7. Replacing current `kombucha_batches` F1 fields with snapshot-only storage.
8. Full Phase 3 or Phase 4 recommendation work.

## Current state
1. Route placement:
   `src/App.tsx` already exposes `/new-batch` and `/f1-recipes` behind the protected app shell. There is no vessel library route yet.
2. Current New Batch flow:
   `src/pages/NewBatch.tsx` is already recipe-aware from Phase 1. It loads `f1_recipes`, supports “start from scratch” versus “start from saved recipe”, preserves `brewAgainState`, and still uses `StarterSourceSelector` for lineage-aware starter source choice. It writes directly to `kombucha_batches`.
3. Current actual F1 batch fields:
   `NewBatch.tsx` already persists `f1_recipe_id`, `tea_source_form`, `tea_amount_value`, `tea_amount_unit`, `sugar_type`, `starter_source_type`, `starter_source_batch_id`, `brew_again_source_batch_id`, and the older F1 setup fields. The actual vessel is still only `vessel_type`, currently chosen from `F1_VESSEL_TYPES = ["Glass jar", "Ceramic crock", "Food-grade plastic"]`.
4. Current recipe domain model:
   `src/lib/f1-recipe-types.ts` defines `F1RecipeDraft`, `F1Recipe`, and `F1BatchSetupFields`. The recipe model includes reusable defaults for volume, tea, sugar, starter, target preference, and notes, but no preferred vessel identity. `F1BatchSetupFields` still holds `vesselType: string`.
5. Current recipe persistence:
   `src/lib/f1-recipes.ts` maps `f1_recipes` rows to domain types and back. The Phase 1 migration `supabase/migrations/20260323110000_f1_recipe_studio_phase_1.sql` created `public.f1_recipes`, added `f1_recipe_id` plus richer actual F1 composition columns on `public.kombucha_batches`, added an ownership trigger for recipe linkage, and enabled RLS for `f1_recipes`.
6. Current recipe library:
   `src/pages/F1Recipes.tsx` provides browse, create, edit, duplicate, favorite, archive, and guarded delete for recipes. It currently has no vessel support.
7. Current setup summary:
   `src/lib/f1-setup-summary.ts` produces a composition-focused summary with starter ratio, tea profile, sugar profile, target taste, and plain-language setup text. `src/components/f1/F1SetupSummary.tsx` renders that summary. There is no vessel fit or suitability guidance yet.
8. Current shared brewing logic:
   `src/lib/batches.ts` owns the `KombuchaBatch` shape and shared next-action/stage labels. It now includes Phase 1 recipe linkage and actual F1 composition fields, but still exposes `vesselType: string`. `src/lib/batch-timing.ts` derives F1 timing from brew date, room temperature, target preference, and starter ratio. Vessel logic does not belong there today and should remain separate.
9. Current lineage and outcome foundations:
   `src/lib/lineage.ts` keeps starter lineage batch-level through starter source selection and brew-again provenance. `src/lib/phase-outcomes.ts` persists F1/F2 outcome reflections in `batch_phase_outcomes`. Neither is used for smart setup recommendations yet, but both are already the right long-term correlation points.
10. Current Batch Detail role:
   `src/pages/BatchDetail.tsx` reads richer F1/F2 setup fields from `kombucha_batches`, `batch_reminders`, `batch_stage_events`, `batch_logs`, lineage helpers, phase outcomes, and the current F2 setup loader. It does not yet read any `batch_f1_setups` surface because that table does not exist.
11. Current F2 architecture as a comparison:
   `src/lib/f2-types.ts` and `src/lib/f2-persistence.ts` already use a more structured applied-setup pattern. `startF2FromWizard(...)` writes to `batch_f2_setups`, related bottle tables, `kombucha_batches`, `batch_stage_events`, and `batch_logs`. This is a strong repo-specific precedent for adding `batch_f1_setups` rather than overloading `kombucha_batches` further.
12. Current schema limitations:
   `src/integrations/supabase/types.ts` shows `f1_recipes` and the expanded `kombucha_batches` fields from Phase 1, but there is no `fermentation_vessels` table, no `batch_f1_setups` table, no `preferred_vessel_id` on `f1_recipes`, and no stable vessel identity on a created batch beyond the legacy `vessel_type` string.

## Intended outcome
1. Saved vessels:
   Users can maintain a reusable F1 vessel library from a dedicated route, with vessel name, material type, capacity, recommended max fill, notes, favorite state, and archived state.
2. Recipe preferred vessel:
   An F1 recipe can optionally point to a preferred saved vessel. That vessel is presented as the default when the recipe is used, but the recipe does not lock the batch to that vessel.
3. Vessel-aware New Batch:
   `src/pages/NewBatch.tsx` lets users start from scratch or from a recipe as it does today, but the vessel area becomes a guided choice between:
   - the recipe’s preferred vessel, when present
   - another saved vessel from the vessel library
   - a manual fallback vessel when the library is empty or the user is not ready to save a vessel
4. Actual vessel remains batch-level:
   Even when a recipe has a preferred vessel, the user can override it before saving the batch. The actual vessel used today is preserved independently from the recipe default.
5. Live fit and suitability guidance:
   As the user changes batch volume or vessel choice, the setup surface shows clear, beginner-friendly fit and suitability feedback such as fill ratio, fit state, and material caution notes. This remains generic and interpretable, not “smart”.
6. Setup summary evolution:
   The F1 setup summary expands beyond composition to show vessel summary, fit summary, and a short plain-language interpretation of how the selected vessel matches the planned brew.
7. Stable snapshot persistence:
   When a batch is created, the app still writes the operational batch record to `kombucha_batches`, but it also creates one `batch_f1_setups` row that snapshots:
   - actual composition used
   - recipe context used
   - vessel context used
   - derived fit interpretation
   - starter lineage compatibility context
8. Beginner-friendly clarity:
   The workflow stays explicit and calm. Users are not required to build a full vessel library before creating a batch, and the app does not overstate material safety or fermentation certainty.
9. Future compatibility:
   Later phases can correlate recipe, vessel, starter lineage, actual setup snapshot, and `batch_phase_outcomes` without redesigning Phase 2 persistence.

## Files and systems involved
1. Route files
   - `src/App.tsx`

2. Existing pages
   - `src/pages/NewBatch.tsx`
   - `src/pages/F1Recipes.tsx`
   - `src/pages/BatchDetail.tsx`

3. Proposed new page
   - `src/pages/F1Vessels.tsx`

4. Existing reusable F1 components
   - `src/components/f1/F1RecipeEditor.tsx`
   - `src/components/f1/F1RecipePicker.tsx`
   - `src/components/f1/F1RecipeCard.tsx`
   - `src/components/f1/F1SetupSummary.tsx`

5. Proposed new vessel components
   - `src/components/f1/F1VesselPicker.tsx`
   - `src/components/f1/F1VesselEditor.tsx`
   - `src/components/f1/F1VesselCard.tsx`
   - optionally `src/components/f1/F1VesselFitNotice.tsx` if fit messaging should stay reusable and not live inside the summary component

6. Existing domain helpers in `src/lib`
   - `src/lib/f1-recipe-types.ts`
   - `src/lib/f1-recipes.ts`
   - `src/lib/f1-setup-summary.ts`
   - `src/lib/lineage.ts`
   - `src/lib/phase-outcomes.ts`
   - `src/lib/batches.ts`
   - `src/lib/batch-timing.ts`
   - `src/lib/f2-types.ts`
   - `src/lib/f2-persistence.ts`

7. Proposed new domain and persistence helpers
   - `src/lib/f1-vessel-types.ts` or an expanded `src/lib/f1-recipe-types.ts` section for vessel enums and domain types
   - `src/lib/f1-vessels.ts`
   - `src/lib/f1-vessel-fit.ts`
   - `src/lib/f1-setups.ts`

8. Supabase tables
   - existing `public.kombucha_batches`
   - existing `public.f1_recipes`
   - proposed `public.fermentation_vessels`
   - proposed `public.batch_f1_setups`
   - existing `public.batch_phase_outcomes`
   - existing `public.batch_stage_events`
   - existing `public.batch_logs`

9. Supabase migrations
   - existing `supabase/migrations/20260323110000_f1_recipe_studio_phase_1.sql`
   - proposed new additive Phase 2 migration in `supabase/migrations/`

10. Generated types
   - `src/integrations/supabase/types.ts`

## Risks and compatibility checks
1. Recipe defaults and batch truth could blur together again if preferred vessel selection is treated as the batch’s actual vessel instead of only a default.
2. `batch_f1_setups` could become redundant churn if it duplicates `kombucha_batches` without being clearly defined as the applied setup snapshot authority.
3. If the snapshot does not include vessel context, recipe context, and lineage context together, later recommendation work will still lack a reliable correlation layer.
4. If New Batch forces saved-vessel workflows too early, beginners may feel blocked or confused. Manual fallback must remain available.
5. If recipe preferred vessel behaves like a hard requirement, recipe-driven creation will feel brittle and violate the “recipe is not the batch” rule.
6. Overbuilding vessel safety logic too early could create false certainty. Phase 2 guidance must stay interpretable and limited to fit plus broad suitability messaging.
7. Schema complexity could outpace UI clarity if too many new vessel states or snapshot fields appear in the UI directly instead of being grouped behind clean helpers.
8. `kombucha_batches` must remain operationally useful for current list/detail/timing surfaces even after `batch_f1_setups` is introduced. Existing fields should not be removed or made optional in ways that break current reads.
9. Frontend read/write paths must be traced carefully:
   - write path in `src/pages/NewBatch.tsx`
   - read path in `src/pages/BatchDetail.tsx`
   - recipe CRUD in `src/lib/f1-recipes.ts`
   - new vessel CRUD and setup snapshot persistence helpers
10. Timeline/history impact must be checked explicitly. Creating a `batch_f1_setups` row may not require new `batch_stage_events`, and Phase 2 should avoid inventing noisy journal entries unless there is a clear product reason.
11. Stage consistency and next-action consistency must remain unchanged. This work should not alter `src/lib/batches.ts` or `src/lib/batch-timing.ts` logic beyond shape extensions needed to carry vessel/setup data.
12. Backwards compatibility must hold for:
   - existing batches created before Phase 2
   - existing recipes created in Phase 1
   - saved F2 setups and downstream F2 persistence
13. Supabase migration work must include:
   - additive tables and columns only
   - indexes and foreign keys for recipe/vessel/setup linkage
   - RLS policies for `fermentation_vessels` and `batch_f1_setups`
   - generated type updates in `src/integrations/supabase/types.ts`
14. Validation gaps are likely if implementation changes UI, schema, and persistence in separate steps without milestone-by-milestone checks.
15. Phase 2 must not silently drift into Phase 3 by adding lineage-aware or outcome-aware recommendations before the data foundation is validated.

## Milestones

### Milestone 1: Confirm Phase 2 data model and migration direction
Goal:
Lock the additive schema direction for vessels, preferred recipe vessel support, and `batch_f1_setups`, including foreign keys, uniqueness, indexes, and RLS expectations before UI edits begin.
Acceptance criteria:
1. The planed schema explicitly includes `fermentation_vessels`, `batch_f1_setups`, and `f1_recipes.preferred_vessel_id`.
2. The plan states whether `batch_f1_setups.batch_id` is unique in Phase 2 and why.
3. The plan states which data remains on `kombucha_batches` and why it stays operationally useful.
4. Frontend read paths and write paths affected by the migration are named.
Files expected:
1. `plans/2026-03-23-f1-vessels-and-batch-f1-setups-phase-2.md`
2. future `supabase/migrations/<phase-2-migration>.sql`
3. future `src/integrations/supabase/types.ts`
Validation:
1. Review current Phase 1 migration and generated types.
2. Confirm no required Phase 2 table or linkage is left unspecified.
Status: completed

### Milestone 2: Define vessel object model and vessel library scope
Goal:
Define the reusable vessel domain model, material vocabulary, suitability vocabulary, and the minimum dedicated vessel-management surface needed for Phase 2.
Acceptance criteria:
1. The vessel model has concrete field names and concrete material and suitability enums.
2. The plan recommends a dedicated route for vessel management and explains why.
3. The plan states browse/create/edit/archive/favorite behavior and safe delete expectations.
4. Manual fallback remains explicitly supported for New Batch.
Files expected:
1. `plans/2026-03-23-f1-vessels-and-batch-f1-setups-phase-2.md`
2. future `src/pages/F1Vessels.tsx`
3. future `src/lib/f1-vessels.ts`
4. future `src/components/f1/F1VesselEditor.tsx`
5. future `src/components/f1/F1VesselCard.tsx`
Validation:
1. Check that the vessel model is specific enough to power fit guidance without adding Phase 3 recommendation complexity.
Status: completed

### Milestone 3: Define `batch_f1_setups` snapshot role and snapshot payload shape
Goal:
Specify `batch_f1_setups` as the applied F1 setup snapshot authority and define exactly what `setup_snapshot_json`, fit fields, and context fields must preserve.
Acceptance criteria:
1. The snapshot payload includes actual composition, recipe context, vessel context, derived fit context, and lineage compatibility context.
2. The plan distinguishes clearly between operational fields on `kombucha_batches` and historical snapshot fields on `batch_f1_setups`.
3. The plan states whether timeline/history writes should change during setup persistence.
Files expected:
1. `plans/2026-03-23-f1-vessels-and-batch-f1-setups-phase-2.md`
2. future `src/lib/f1-setups.ts`
3. future `src/pages/NewBatch.tsx`
4. future `src/pages/BatchDetail.tsx`
Validation:
1. Compare the Phase 2 F1 snapshot role with the existing Phase 2 F2 setup pattern in `src/lib/f2-persistence.ts`.
Status: completed

### Milestone 4: Define recipe preferred vessel support
Goal:
Extend recipes with an optional preferred vessel default while preserving the rule that recipes store defaults and batches store actual brew-day selections.
Acceptance criteria:
1. `f1_recipes.preferred_vessel_id` is specified with foreign key behavior.
2. The plan explains how recipe editor, recipe cards, and recipe picker should present the preferred vessel.
3. The plan explicitly states that creating a batch from a recipe does not mutate the recipe.
Files expected:
1. `plans/2026-03-23-f1-vessels-and-batch-f1-setups-phase-2.md`
2. future `src/lib/f1-recipe-types.ts`
3. future `src/lib/f1-recipes.ts`
4. future `src/pages/F1Recipes.tsx`
5. future `src/components/f1/F1RecipeEditor.tsx`
Validation:
1. Check that recipe default behavior stays aligned with Phase 1’s “recipe is not the batch” model.
Status: completed

### Milestone 5: Define vessel-aware New Batch UX and manual fallback behavior
Goal:
Plan the exact `NewBatch` workflow for recipe-default vessel selection, saved-vessel override, and manual fallback, without breaking starter source or brew-again behavior.
Acceptance criteria:
1. The plan describes how the vessel area behaves for scratch flow, recipe flow with preferred vessel, and empty-library flow.
2. The plan preserves starter source batch selection as batch-level.
3. The plan preserves brew-again prefill behavior.
4. The plan states when and how a manual vessel can be promoted into the vessel library.
Files expected:
1. `plans/2026-03-23-f1-vessels-and-batch-f1-setups-phase-2.md`
2. future `src/pages/NewBatch.tsx`
3. future `src/components/f1/F1VesselPicker.tsx`
4. future `src/lib/lineage.ts` only if read-only compatibility tracing requires it
Validation:
1. Trace the current `NewBatch.tsx` write path and confirm that no stage or next-action rules are changed.
Status: completed

### Milestone 6: Define vessel-fit helper and fit-state model
Goal:
Create a clear repo-level fit engine contract that turns actual batch volume plus vessel data into interpretable fit and suitability guidance.
Acceptance criteria:
1. The fit-state vocabulary is concrete, likely `roomy`, `good_fit`, `tight_fit`, and `overfilled`.
2. The helper outputs fill ratio, fit state, suitability state, plain-language summary, and caution notes.
3. The plan explicitly keeps this helper separate from timing logic and from future recommendation logic.
Files expected:
1. `plans/2026-03-23-f1-vessels-and-batch-f1-setups-phase-2.md`
2. future `src/lib/f1-vessel-fit.ts`
3. future `src/lib/f1-setup-summary.ts`
Validation:
1. Check that the fit helper uses actual setup inputs only and does not invent lineage or outcome intelligence.
Status: completed

### Milestone 7: Define updated setup summary behavior
Goal:
Specify how the current composition-only setup summary evolves to include vessel and fit context while staying readable for beginners.
Acceptance criteria:
1. The summary includes vessel summary, fit summary, and plain-language setup interpretation.
2. The summary still shows composition context clearly.
3. The plan states whether the summary component alone should render fit messaging or whether a dedicated subcomponent is warranted.
Files expected:
1. `plans/2026-03-23-f1-vessels-and-batch-f1-setups-phase-2.md`
2. future `src/lib/f1-setup-summary.ts`
3. future `src/components/f1/F1SetupSummary.tsx`
Validation:
1. Confirm the summary remains review-focused rather than becoming a dense expert diagnostic panel.
Status: completed

### Milestone 8: Define frontend persistence paths and Batch Detail compatibility
Goal:
Lock the exact read/write path changes so `NewBatch` creates the operational batch plus setup snapshot, and `BatchDetail` can later surface applied F1 setup context safely.
Acceptance criteria:
1. The plan names where vessel CRUD lives, where setup snapshot persistence lives, and where batch creation orchestration stays.
2. The plan explains how `BatchDetail.tsx` should read `batch_f1_setups` without regressing current reads from `kombucha_batches`.
3. The plan states whether `batch_stage_events` and `batch_logs` remain unchanged for initial Phase 2 setup persistence.
Files expected:
1. `plans/2026-03-23-f1-vessels-and-batch-f1-setups-phase-2.md`
2. future `src/lib/f1-setups.ts`
3. future `src/pages/NewBatch.tsx`
4. future `src/pages/BatchDetail.tsx`
5. future `src/integrations/supabase/types.ts`
Validation:
1. Trace the current Batch Detail batch read, lineage read, and timeline read paths before implementation.
Status: completed

### Milestone 9: Define compatibility with lineage and later F1 outcome-aware phases
Goal:
Make explicit how Phase 2 preserves the data foundation for future recommendation work without implementing that work now.
Acceptance criteria:
1. The plan preserves starter source batch selection and brew-again linkage as batch-level context.
2. The snapshot payload includes enough lineage-related fields to correlate later with `batch_phase_outcomes`.
3. The plan explicitly defers smart recommendation logic to a later phase.
Files expected:
1. `plans/2026-03-23-f1-vessels-and-batch-f1-setups-phase-2.md`
2. future `src/lib/lineage.ts` compatibility checks only if needed
3. future `src/lib/phase-outcomes.ts` compatibility checks only if needed
Validation:
1. Confirm no Phase 2 milestone requires changes to `src/lib/batch-timing.ts` or `src/lib/batches.ts` beyond shape extensions.
Status: completed

### Milestone 10: Define validation approach and baseline blockers
Goal:
Record the repo-standard validation path and distinguish any pre-existing failures from issues introduced by later Phase 2 implementation.
Acceptance criteria:
1. The plan lists `npx tsc -b`, `npm run lint`, `npm run test`, and `npm run build`.
2. The plan states that baseline failures must be recorded as pre-existing before implementation proceeds.
3. The plan keeps milestone-by-milestone validation mandatory.
Files expected:
1. `plans/2026-03-23-f1-vessels-and-batch-f1-setups-phase-2.md`
Validation:
1. None beyond maintaining the final validation section accurately.
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md` to confirm repo planning and lifecycle constraints.
2. Inspected `src/App.tsx` to confirm the current protected route shape and that `/f1-recipes` already exists while no vessel route exists yet.
3. Inspected `src/pages/NewBatch.tsx` to confirm the current Phase 1 recipe-aware batch creation flow, starter lineage flow, brew-again support, and direct write into `kombucha_batches`.
4. Inspected `src/pages/F1Recipes.tsx` to confirm the current recipe library management scope and the absence of vessel support.
5. Inspected `src/lib/f1-recipe-types.ts`, `src/lib/f1-recipes.ts`, and `src/lib/f1-setup-summary.ts` to confirm the current Phase 1 recipe model, persistence model, and composition-focused setup summary.
6. Inspected `src/lib/lineage.ts` and `src/lib/phase-outcomes.ts` to confirm lineage and outcome infrastructure already exist and should remain compatible with later phases.
7. Inspected `src/lib/batches.ts` and `src/lib/batch-timing.ts` to confirm current shared lifecycle and timing logic must remain centralized and should not absorb vessel-fit rules.
8. Inspected `src/lib/f2-types.ts` and `src/lib/f2-persistence.ts` to confirm the repo already uses a structured setup snapshot pattern for F2 that Phase 2 can mirror for F1.
9. Inspected `src/pages/BatchDetail.tsx` to confirm the current batch-detail read path still relies on `kombucha_batches`, reminders, stage events, logs, lineage, outcomes, and F2 setup reads, with no F1 setup snapshot yet.
10. Inspected `src/integrations/supabase/types.ts` and `supabase/migrations/20260323110000_f1_recipe_studio_phase_1.sql` to confirm the current Phase 1 schema shape, foreign keys, and RLS baseline.
11. Added `supabase/migrations/20260323143000_f1_recipe_studio_phase_2.sql` to introduce `fermentation_vessels`, `batch_f1_setups`, `f1_recipes.preferred_vessel_id`, ownership triggers, indexes, and RLS policies.
12. Updated `src/integrations/supabase/types.ts` to reflect the new Phase 2 tables, relationships, and enums.
13. Added shared vessel/setup helpers in `src/lib/f1-vessel-types.ts`, `src/lib/f1-vessel-fit.ts`, `src/lib/f1-vessels.ts`, and `src/lib/f1-setups.ts` so the UI can reuse one source of truth for vessel metadata, fit guidance, and setup snapshot persistence.
14. Baseline and Milestone 1 validation results remained consistent:
    - `npx tsc -b`: passed
    - `npm run lint`: passed with the pre-existing 9 `react-refresh/only-export-components` warnings
    - `npm run test`: passed
    - `npm run build`: passed with the pre-existing Browserslist age notice and large chunk warning
15. Added recipe preferred-vessel support to `src/lib/f1-recipe-types.ts`, `src/lib/f1-recipes.ts`, and `src/components/f1/F1RecipeEditor.tsx`.
16. Added the dedicated vessel management surface in `src/pages/F1Vessels.tsx` with reusable `src/components/f1/F1VesselEditor.tsx` and `src/components/f1/F1VesselCard.tsx`.
17. Wired `/f1-vessels` into `src/App.tsx` and updated `src/pages/F1Recipes.tsx` plus `src/components/f1/F1RecipeCard.tsx` so recipes can display and edit preferred vessel defaults.
18. Milestone 2 and Milestone 4 validation results remained consistent:
    - `npx tsc -b`: passed
    - `npm run lint`: passed with the pre-existing 9 `react-refresh/only-export-components` warnings
    - `npm run test`: passed
    - `npm run build`: passed with the pre-existing Browserslist age notice and large chunk warning
19. Updated `src/pages/NewBatch.tsx` to support saved-vessel selection, manual vessel fallback, recipe preferred-vessel defaults, inline manual vessel saving, live fit guidance, and `batch_f1_setups` snapshot persistence through `src/lib/f1-setups.ts`.
20. Added `src/components/f1/F1VesselPicker.tsx` and evolved `src/lib/f1-setup-summary.ts` plus `src/components/f1/F1SetupSummary.tsx` to show vessel and fit context alongside composition.
21. Wired `src/pages/BatchDetail.tsx` and `src/components/batch-detail/BatchOverviewSurface.tsx` to load and surface the saved F1 setup snapshot for both active F1 batches and later F1 memory views.
22. Final validation results remained consistent:
    - `npx tsc -b`: passed
    - `npm run lint`: passed with the pre-existing 9 `react-refresh/only-export-components` warnings
    - `npm run test`: passed
    - `npm run build`: passed with the pre-existing Browserslist age notice and large chunk warning

## Decision log
1. Phase 2 should introduce `public.fermentation_vessels` rather than extending `vessel_type` strings further, because the feature requires stable vessel identity, reusable defaults, and physically grounded fit calculations.
2. Phase 2 should add `preferred_vessel_id` to `public.f1_recipes` as an optional default only. Recipes store reusable defaults, not mandatory batch constraints.
3. Phase 2 should introduce `public.batch_f1_setups` and treat it as the applied F1 setup snapshot authority, while `public.kombucha_batches` remains the operational batch record for current stage, timing inputs, overview reads, and existing compatibility.
4. `batch_f1_setups.batch_id` should be unique in Phase 2 because the setup snapshot is intended to capture the applied brew-day setup once at creation time. If later phases need editable or versioned F1 setup histories, that can be expanded intentionally rather than implied now.
5. The `batch_f1_setups.setup_snapshot_json` payload should include actual composition, recipe context, vessel context, derived fit context, and lineage compatibility context so later recommendation work can correlate outcomes without rehydrating historical state from mutable tables.
6. Phase 2 should keep `kombucha_batches.vessel_type` for backwards compatibility and current operational reads, but treat it as a compatibility/display field derived from the actual selected or manual vessel choice rather than the new source of truth.
7. The vessel library should have its own dedicated route at `/f1-vessels` rather than an inline-only drawer, because users need a stable management surface similar to `/f1-recipes`, and the `f1-` prefix avoids implying bottle/F2 vessel management.
8. New Batch must preserve a manual vessel fallback path. Saved vessels should be encouraged but not required, especially for beginners or migrations from pre-Phase-2 data.
9. The Phase 2 fit engine should stay generic and interpretable, using concrete fit states such as `roomy`, `good_fit`, `tight_fit`, and `overfilled`, plus suitability states such as `recommended`, `acceptable`, `caution`, and `not_recommended`.
10. Phase 2 should not add lineage-aware or outcome-aware recommendations. It should only preserve the data foundation for those later phases.
11. Initial Phase 2 setup persistence should not introduce new `batch_stage_events` writes and should only add `batch_logs` entries if there is a clear product reason during implementation. The default recommendation is to keep timeline/history unchanged for setup creation to avoid noisy journals.
12. Phase 2 should mirror the repo’s F2 pattern by moving setup-specific persistence into dedicated helpers in `src/lib`, leaving `src/pages/NewBatch.tsx` focused on orchestration and user flow.

13. `batch_f1_setups.fit_notes_json` should use a compact object shape with `summary`, `notes`, and `fillRatioPercent` so the data stays readable in Supabase and easy to reuse in UI surfaces.
14. Vessel deletion should remain archive-first by default, with hard delete only allowed when no recipes or saved F1 setup snapshots reference the vessel.

## Open questions
None.

## Done when
1. The repo has an additive Phase 2 migration that creates `fermentation_vessels`, creates `batch_f1_setups`, and adds `preferred_vessel_id` to `f1_recipes` with appropriate foreign keys, indexes, RLS, and generated type updates.
2. `src/pages/NewBatch.tsx` supports saved-vessel selection, recipe preferred-vessel defaults, manual vessel fallback, and live fit/suitability guidance without breaking starter lineage selection or brew-again behavior.
3. The app persists both the operational batch row and the applied F1 setup snapshot when a new batch is created.
4. `src/pages/F1Recipes.tsx` and the recipe editor can display and edit an optional preferred vessel default clearly as a default, not a requirement.
5. The app has a dedicated vessel library route and surface for creating, editing, browsing, favoriting, and archiving vessels.
6. The setup summary reflects both composition and vessel-fit context in calm, beginner-friendly language.
7. Existing batches, existing recipes, existing starter lineage relationships, and saved F2 setups continue to work without data loss or lifecycle drift.
8. No stage progression, next-action logic, or timing logic is forked into components as part of this work.

## Final validation
Run after each milestone implementation and again at the end:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

If any of these already fail before implementation starts, record those failures in this plan as pre-existing and distinguish them from any new failures introduced during Phase 2 work.

Baseline before implementation:
1. `npx tsc -b`: passed
2. `npm run lint`: passed with 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
3. `npm run test`: passed
4. `npm run build`: passed with the pre-existing Browserslist age notice and large chunk warning
