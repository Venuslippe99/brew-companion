# F2 Setup Wizard Overhaul

## Summary
Refactor the existing F2 setup flow into a cleaner guided wizard, replace the user-facing "reserve for sediment" framing with intentional starter reserve language, and tighten the saved F2 summary without breaking the existing F2 persistence model or lifecycle actions.

## Why
The current F2 flow already has useful planner math and persistence, but the product experience still feels like a dense utility panel. Users need a bottling guide that helps them answer "How exactly do I bottle this batch?" one decision at a time, while keeping F2 connected to the batch journey and preserving bottle creation, ingredient rows, saved setup reloads, and later F2 actions.

## Scope
In scope:
1. Refactor the existing `src/components/f2/F2SetupWizard.tsx` into a more guided multi-step flow.
2. Rename the user-facing sediment reserve concept to starter reserve / hold-back-for-starter while preserving compatible persistence.
3. Update F2 planner types and copy so the volume breakdown is explicit: total available, starter reserve, available for bottling.
4. Improve bottle planning UX with stronger cards, quick presets, and live summaries.
5. Reframe flavour setup around user intent while keeping saved recipes, presets, flavour presets, guided mode, and custom editing.
6. Tighten the review step into a concise bottling-plan answer screen.
7. Clean up the saved F2 setup view and the surrounding Batch Overview summary so it reads as a chapter summary rather than a raw dump.

Out of scope:
1. Changing the overall F2 persistence schema unless clearly necessary.
2. Removing existing post-setup lifecycle actions.
3. Moving F2 to a new route.
4. Changing F2 timing rules, stage names, or next-action semantics outside the existing active-action flow.

## Current state
Today, `src/components/f2/F2SetupWizard.tsx` uses a dense 3-step planner with tab-like step buttons:
1. Step 1 mixes sediment reserve, ambient temperature, carbonation target, bottle groups, and a live summary.
2. Step 2 mixes recipe source selection, carbonation target again, guided/advanced mode, recipe saving, and item editing.
3. Step 3 shows review, per-bottle instructions, totals, and risk notes.

Relevant helpers:
1. `src/lib/f2-planner.ts` calculates target fills, scaled ingredient items, kombucha need, remaining volume, and risk notes using `reserveForSedimentMl`.
2. `src/lib/f2-persistence.ts` writes `batch_f2_setups`, `batch_f2_bottle_groups`, `batch_bottles`, `batch_bottle_ingredients`, `batch_stage_events`, and `batch_logs` via `startF2FromWizard`.
3. `src/lib/f2-current-setup.ts` reloads saved F2 setup rows and bottle/ingredient detail.
4. `src/lib/f2-active-actions.ts` preserves later F2 lifecycle actions and stage transitions after setup.
5. `src/components/batch-detail/BatchOverviewSurface.tsx` embeds the wizard inside the batch journey and shows an additional `F2Snapshot` summary above it when a setup already exists.

Supabase tables and persisted data touched by this area:
1. `kombucha_batches`
2. `batch_f2_setups`
3. `batch_f2_bottle_groups`
4. `batch_bottles`
5. `batch_bottle_ingredients`
6. `batch_stage_events`
7. `batch_logs`
8. `f2_recipes`
9. `f2_recipe_items`
10. `flavour_presets`

## Intended outcome
The F2 flow should feel like a dedicated bottling guide inside the batch chapter:
1. Step 1 asks how much kombucha is available and how much to keep aside as starter for another batch.
2. Step 2 asks how fizzy the user wants it and what room temperature they expect.
3. Step 3 focuses on bottles with clearer cards, live usage math, and quick presets.
4. Step 4 focuses on flavour intent: saved recipe, preset, or custom plan.
5. Step 5 gives one concise bottling plan review and start action.

Saved-state presentation should become cleaner:
1. Current F2 status and next action first.
2. Bottle plan summary next.
3. Recipe summary next.
4. Detailed bottle and ingredient lists collapsed or secondary.

The user-facing language should consistently describe this held-back volume as intentional starter reserve, not sediment loss.

## Files and systems involved
1. Route / orchestration:
   - `src/pages/BatchDetail.tsx`
   - `src/components/batch-detail/BatchOverviewSurface.tsx`
2. Shared F2 UI:
   - `src/components/f2/F2SetupWizard.tsx`
3. Domain helpers:
   - `src/lib/f2-planner.ts`
   - `src/lib/f2-persistence.ts`
   - `src/lib/f2-current-setup.ts`
   - `src/lib/f2-active-actions.ts`
   - `src/lib/f2-types.ts`
   - `src/lib/batches.ts`
4. Persistence / data consumers:
   - `batch_f2_setups`
   - `batch_f2_bottle_groups`
   - `batch_bottles`
   - `batch_bottle_ingredients`
   - `batch_stage_events`
   - `batch_logs`
   - `f2_recipes`
   - `f2_recipe_items`
   - `flavour_presets`

## Risks and compatibility checks
1. Breaking backwards compatibility for existing `batch_f2_setups` rows that still use `reserved_for_sediment_ml`.
2. Breaking the `startF2FromWizard` write path or failing to keep bottle / ingredient row creation intact.
3. Accidentally changing stage progression or next-action behavior for `f2_active`, `refrigerate_now`, `chilled_ready`, or `completed`.
4. Diverging user-facing bottle math from persisted volume calculations.
5. Weakening validation when bottle plans exceed available bottling volume.
6. Regressing saved recipe / preset / custom flavour paths.
7. Making the batch overview chapter denser instead of cleaner.

## Milestones

### Milestone 1: Rename starter-reserve concept and align planner contract
Goal:
Replace user-facing sediment language with starter reserve wording and make planner outputs explicitly distinguish total F1 available, starter reserve, and available for bottling.
Acceptance criteria:
1. Planner types and summary output include clear starter-reserve naming.
2. Persistence remains compatible with existing schema and saved setups.
3. Existing validation still blocks over-allocation and invalid bottle math.
Files expected:
1. `src/lib/f2-types.ts`
2. `src/lib/f2-planner.ts`
3. `src/lib/f2-persistence.ts`
4. `src/lib/f2-current-setup.ts`
5. `src/components/f2/F2SetupWizard.tsx`
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
Status: completed

### Milestone 2: Rework F2 setup into a guided five-step wizard
Goal:
Turn the dense planner into a clearer guided wizard with a stronger step sequence and improved bottle / flavour UX.
Acceptance criteria:
1. Step order reflects the user’s bottling decisions.
2. Bottle planning has quick presets, clearer group cards, and live inline math.
3. Carbonation and ambient temperature get a dedicated step.
4. Flavour planning is organized around saved recipe, preset, or custom intent.
5. Navigation is guided rather than tab-like.
Files expected:
1. `src/components/f2/F2SetupWizard.tsx`
2. `src/lib/f2-planner.ts`
3. `src/lib/f2-types.ts`
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
Status: completed

### Milestone 3: Tighten saved F2 chapter presentation and final review
Goal:
Make the saved F2 view and final review cleaner, more action-oriented, and less dump-like while keeping batch lifecycle actions intact.
Acceptance criteria:
1. Saved F2 setup view is reorganized into a clearer hierarchy.
2. Review step prioritizes the bottling plan, totals, instructions, and risk watchouts.
3. Batch Overview’s extra summary no longer duplicates too much detail.
4. Existing post-setup F2 lifecycle actions still work.
Files expected:
1. `src/components/f2/F2SetupWizard.tsx`
2. `src/components/batch-detail/BatchOverviewSurface.tsx`
3. `src/lib/f2-current-setup.ts`
4. `src/lib/f2-active-actions.ts`
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`.
2. Inspected `src/pages/BatchDetail.tsx` and confirmed F2 setup is loaded through `loadCurrentF2Setup(batch.id)` and refreshed after F2 lifecycle updates.
3. Inspected `src/components/batch-detail/BatchOverviewSurface.tsx` and confirmed F2 remains embedded in the batch journey, with an additional saved `F2Snapshot` summary above the wizard.
4. Inspected `src/components/f2/F2SetupWizard.tsx` and confirmed the current implementation is a dense 3-step planner that mixes volume, carbonation, bottles, recipe selection, recipe editing, and review.
5. Inspected `src/lib/f2-planner.ts`, `src/lib/f2-persistence.ts`, `src/lib/f2-current-setup.ts`, `src/lib/f2-active-actions.ts`, `src/lib/f2-types.ts`, and `src/lib/batches.ts` to trace F2 volume math, persistence writes, saved setup reads, and later F2 stage actions.
6. Confirmed the existing schema still stores the reserve in `batch_f2_setups.reserved_for_sediment_ml`, so the overhaul should preserve persistence compatibility and reframe the concept in the planner/UI rather than requiring a schema rewrite.
7. Baseline validation before edits:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
8. Updated `src/lib/f2-types.ts`, `src/lib/f2-planner.ts`, `src/lib/f2-persistence.ts`, `src/lib/f2-current-setup.ts`, and `src/components/f2/F2SetupWizard.tsx` so the domain layer and active wizard now use starter-reserve / bottling-volume terminology while still writing to the existing `reserved_for_sediment_ml` column for compatibility.
9. Milestone 1 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings
   - `npm run test`: passed
10. Rebuilt `src/components/f2/F2SetupWizard.tsx` in place into a five-step guided flow:
   - bottling volume
   - carbonation
   - bottle plan
   - flavour plan
   - bottling review
11. Improved the saved F2 state view inside `src/components/f2/F2SetupWizard.tsx` so it now leads with current status and next action, summarizes the saved bottle plan and recipe more cleanly, and keeps created bottles collapsed behind an optional reveal.
12. Removed the extra inline saved F2 summary block from `src/components/batch-detail/BatchOverviewSurface.tsx` so the dedicated F2 wizard / saved-state surface is the primary chapter UI.
13. Milestone 2 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings
   - `npm run test`: passed
14. Final validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice and chunk-size warning

## Decision log
1. Keep the current F2 route placement inside the Batch Overview chapter and refactor the wizard in place, because the user explicitly wants a major UX overhaul without disconnecting F2 from the batch journey.
2. Preserve the existing `batch_f2_setups.reserved_for_sediment_ml` column for compatibility and translate it into starter-reserve terminology in the domain/UI layer unless a schema change becomes clearly necessary.
3. Derive `LoadedF2Setup.totalF1AvailableMl` from the stored post-reserve volume plus the stored reserve value so older saved setups can present the new starter-reserve framing without a migration.
4. Keep the F2 overhaul inside `src/components/f2/F2SetupWizard.tsx` and the existing Batch Overview embedding so the interaction model improves without disconnecting the F2 chapter from the batch journey.

## Open questions
1. None currently blocking implementation.

## Done when
1. The F2 setup flow is substantially more guided and less dense than the current 3-step planner.
2. User-facing sediment wording is replaced with starter reserve / hold-back-for-starter language.
3. Planner outputs clearly distinguish total F1 available, starter reserve, and available for bottling.
4. Bottle planning is easier to understand and gives live assignment feedback.
5. Flavour planning is organized around user intent rather than a mixed control panel.
6. The saved F2 chapter is cleaner and less audit-like.
7. `startF2FromWizard`, saved setup reloads, batch lifecycle actions, and stage transitions still work.

## Final validation
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
