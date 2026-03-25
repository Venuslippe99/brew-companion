# F2 Group Recipe Route Redesign

## Summary
Redesign the F2 setup flow into a dedicated route-based bottling experience that supports multiple bottle groups using different flavour plans within the same F1 batch, fixes ingredient total math, removes bottle presets entirely, and preserves existing F2 lifecycle actions and saved setup compatibility.

## Why
The current F2 setup still behaves like an inline planner and still assumes one shared flavour plan for the entire F2 setup. That blocks a real-world use case where one batch is split into several bottle groups with different recipes, and it also produces incorrect ingredient totals because group counts are not applied when totals are aggregated. A proper redesign needs to move F2 into a dedicated setup mode, make groups own their flavour plans, and align planner, persistence, and saved-state rendering around that model.

## Scope
In scope:
1. Replace the inline F2 setup entry with a dedicated route such as `/batch/:id/f2/setup`.
2. Remove bottle presets from the product and code paths.
3. Redesign F2 draft types so each bottle group owns its flavour plan.
4. Refactor the planner to be group-aware and fix ingredient totals by multiplying per-bottle amounts by `bottleCount`.
5. Redesign persistence so each bottle group stores its own recipe identity and recipe snapshot.
6. Update saved setup loading so it can read and render group-level flavour summaries.
7. Update the dedicated F2 UI so flavour assignment happens per group rather than once per setup.
8. Add focused tests for planner math, group-aware persistence, and saved setup rendering.
9. Keep existing post-setup F2 lifecycle actions working.

Out of scope:
1. Changing the overall batch lifecycle stages.
2. Removing existing `batch_f2_setups`, `batch_bottles`, or `batch_bottle_ingredients` tables.
3. Rewriting existing F2 active-action flows after setup.
4. Changing F2 pressure-risk heuristics beyond the group-aware planner refactor needed for the redesign.

## Current state
Today the repo still has four blocking issues:
1. `src/components/f2/F2SetupWizard.tsx` renders inline inside the Batch Overview chapter instead of opening as a dedicated setup experience.
2. `src/lib/f2-planner.ts` aggregates ingredient totals once per group without multiplying by `group.bottleCount`.
3. `src/components/f2/F2SetupWizard.tsx` still defines `BottlePreset`, `BOTTLE_PRESETS`, and preset-driven bottle-plan UI.
4. `src/lib/f2-types.ts`, `src/lib/f2-planner.ts`, and `src/lib/f2-persistence.ts` still assume one shared setup-level flavour plan (`recipeSourceTab`, `selectedRecipeId`, `recipeItems`, etc.).

Relevant current files and flows:
1. `src/pages/BatchDetail.tsx` loads `currentF2Setup` through `loadCurrentF2Setup(batch.id)` and currently keeps F2 inside the batch detail journey.
2. `src/components/batch-detail/BatchOverviewSurface.tsx` still opens the F2 chapter inline and renders `F2SetupWizard`.
3. `src/components/batch-detail/BatchCurrentPhaseCard.tsx` owns the current “Move to Second Fermentation” CTA.
4. `src/lib/f2-persistence.ts` currently saves one setup-level selected recipe and one setup-level recipe snapshot, then applies one shared scaled recipe to every bottle.
5. `src/lib/f2-current-setup.ts` currently loads one setup-level recipe snapshot and bottle groups without per-group recipe metadata.
6. `src/lib/f2-active-actions.ts` updates stages and logs after F2 setup is already active; this must keep working.

Relevant tables and generated types:
1. `batch_f2_setups`
2. `batch_f2_bottle_groups`
3. `batch_bottles`
4. `batch_bottle_ingredients`
5. `f2_recipes`
6. `f2_recipe_items`
7. `flavour_presets`
8. `src/integrations/supabase/types.ts`

## Intended outcome
The finished flow should behave like this:
1. Starting F2 opens a dedicated route-level setup experience.
2. Step 1 sets total available kombucha and starter reserve.
3. Step 2 sets carbonation target and room temperature.
4. Step 3 builds bottle groups manually, with no presets.
5. Step 4 assigns a flavour plan to each bottle group independently: none, saved recipe, preset recipe, or custom plan.
6. Step 5 reviews the bottling plan with correct per-group instructions and correct total ingredients across all bottles.
7. Persistence stores recipe identity and snapshots on each bottle group, and bottle ingredient rows come from that group’s own scaled items.
8. Saved setup views show group-level flavour summaries and keep created bottles grouped under their flavour plans.

## Files and systems involved
1. Route files:
   - `src/App.tsx`
   - `src/pages/BatchDetail.tsx`
   - new `src/pages/F2Setup.tsx`
2. Batch-detail components:
   - `src/components/batch-detail/BatchOverviewSurface.tsx`
   - `src/components/batch-detail/BatchCurrentPhaseCard.tsx`
   - possibly `src/components/batch-detail/BatchDetailHero.tsx`
3. F2 UI:
   - `src/components/f2/F2SetupWizard.tsx`
   - optionally new supporting components under `src/components/f2/`
4. Domain helpers:
   - `src/lib/f2-types.ts`
   - `src/lib/f2-planner.ts`
   - `src/lib/f2-persistence.ts`
   - `src/lib/f2-current-setup.ts`
   - `src/lib/f2-active-actions.ts`
   - `src/lib/batch-detail-view.ts`
5. Schema / generated types:
   - new migration in `supabase/migrations/`
   - `src/integrations/supabase/types.ts`
6. Tests:
   - new or updated tests under `src/lib/*.test.ts`
   - possibly `src/components/**/*.test.tsx`

## Risks and compatibility checks
1. Breaking existing saved F2 rows that only have setup-level recipe snapshots.
2. Breaking `startF2FromWizard` writes to `batch_f2_setups`, `batch_f2_bottle_groups`, `batch_bottles`, or `batch_bottle_ingredients`.
3. Breaking stage progression or later `applyF2ActiveAction` updates.
4. Failing to keep `batch_stage_events` and `batch_logs` writes aligned with stage changes.
5. Diverging planner totals from persisted bottle ingredient rows.
6. Failing to support mixed saved/preset/custom/no-flavour groups in one run.
7. Forgetting to update generated Supabase types after a migration.
8. Leaving Batch Detail stuck in the old inline mental model after moving setup to a route.

## Milestones

### Milestone 1: Redesign schema, types, and group-aware planner
Goal:
Introduce group-owned flavour-plan types, add the required additive schema fields for group-level recipe snapshots, and fix planner math so totals scale by `bottleCount`.
Acceptance criteria:
1. `F2BottleGroupDraft` owns its recipe mode and recipe items.
2. Planner summaries are group-aware and ingredient totals multiply per-bottle amounts by group count.
3. Supabase schema supports storing group-level recipe identity and snapshots.
4. Planner tests cover mixed groups and correct totals.
Files expected:
1. `src/lib/f2-types.ts`
2. `src/lib/f2-planner.ts`
3. `src/integrations/supabase/types.ts`
4. new migration in `supabase/migrations/`
5. new planner tests
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
Status: completed

### Milestone 2: Rebuild persistence and saved-setup loading around group recipes
Goal:
Persist and reload group-level flavour assignments, custom recipe saves, per-group snapshots, and per-group bottle ingredient creation.
Acceptance criteria:
1. `startF2FromWizard` persists group-level recipe metadata and uses each group’s own items for bottle ingredients.
2. `loadCurrentF2Setup` returns group-level flavour summaries and bottle grouping data.
3. Persistence tests cover mixed group recipe modes.
Files expected:
1. `src/lib/f2-persistence.ts`
2. `src/lib/f2-current-setup.ts`
3. `src/lib/f2-types.ts`
4. persistence/load tests
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
Status: completed

### Milestone 3: Move F2 setup into a dedicated route and rebuild the wizard UI
Goal:
Replace the inline Batch Detail rendering with a dedicated setup route and a route-level wizard that supports manual bottle groups and per-group flavour assignment.
Acceptance criteria:
1. F2 setup opens in a dedicated route.
2. Bottle presets are fully removed from the UI and code path.
3. Step 4 clearly assigns flavour plans per bottle group.
4. Review shows per-group instructions and correct totals.
5. Batch Detail no longer renders the full setup inline.
Files expected:
1. `src/App.tsx`
2. `src/pages/BatchDetail.tsx`
3. new `src/pages/F2Setup.tsx`
4. `src/components/batch-detail/BatchOverviewSurface.tsx`
5. `src/components/batch-detail/BatchCurrentPhaseCard.tsx`
6. `src/components/f2/F2SetupWizard.tsx`
7. any new helper components
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`.
2. Inspected `src/components/f2/F2SetupWizard.tsx`, `src/lib/f2-planner.ts`, `src/lib/f2-types.ts`, `src/lib/f2-persistence.ts`, and `src/lib/f2-current-setup.ts`.
3. Confirmed the current wizard still renders inline, still contains `BottlePreset` / `BOTTLE_PRESETS`, and still uses setup-level recipe state.
4. Confirmed `src/lib/f2-planner.ts` currently merges ingredient totals from per-bottle scaled items without multiplying by `group.bottleCount`.
5. Inspected `src/pages/BatchDetail.tsx`, `src/components/batch-detail/BatchOverviewSurface.tsx`, and `src/components/batch-detail/BatchCurrentPhaseCard.tsx` to trace the current inline entry path and F2 stage handoff.
6. Inspected `src/App.tsx` and confirmed there is not yet a dedicated F2 setup route.
7. Inspected `src/integrations/supabase/types.ts` plus existing F2 migrations and confirmed `batch_f2_bottle_groups` currently has no recipe fields, while `batch_f2_setups` still stores one setup-level selected recipe and recipe snapshot.

## Decision log
1. Use an additive migration on `batch_f2_bottle_groups` for group-level recipe identity and snapshots rather than replacing `batch_f2_setups`, because the setup row still works as the chapter-level summary and lifecycle anchor.
2. Introduce a dedicated F2 setup route instead of keeping the wizard inline, because the product requirement explicitly calls for a full-window setup experience.

## Open questions
1. None currently blocking implementation.

## Done when
1. Opening F2 setup feels like entering a dedicated setup experience rather than an inline page section.
2. Bottle presets are removed from both UI and code paths.
3. Ingredient totals are correct across all bottles and groups.
4. Different bottle groups in the same F1 batch can use different flavour plans.
5. Planner output, persistence, and saved setup loading are all group-aware.
6. Bottle ingredient rows reflect each group’s own recipe plan.
7. Saved setup views and Batch Detail still work with the new model.
8. Existing post-setup F2 lifecycle actions still work.
9. Added the group-recipe migration, updated generated Supabase types, and refactored planner output around group-owned recipe plans.
10. Rebuilt `src/lib/f2-persistence.ts` so custom recipes can be saved per group, group snapshots live on `batch_f2_bottle_groups`, bottles keep `f2_bottle_group_id`, and bottle ingredient rows come from each group's own scaled items.
11. Rebuilt `src/lib/f2-current-setup.ts` so saved setups load group-level flavour summaries and can still fall back for older rows without bottle-group ids on `batch_bottles`.
12. Replaced the old preset-driven single-recipe `src/components/f2/F2SetupWizard.tsx` with a guided five-step wizard that supports manual bottle groups and per-group flavour assignment.
13. Added a dedicated route page at `src/pages/F2Setup.tsx` and wired `/batch/:id/f2/setup` in `src/App.tsx`.
14. Updated Batch Detail entry points so F2 setup opens in the dedicated route and the overview now shows only a lighter F2 chapter summary plus open action instead of the full inline wizard.
15. Validation passed with `npx tsc -b`, `npm run test`, and `npm run build`.
16. `npm run lint` passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files and no new lint errors.

## Final validation
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
