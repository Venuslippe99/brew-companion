# New Batch Wizard Volume And Tea Update

## Summary
Update the existing New Batch wizard so tea recommendations are tea-type-specific, total volume is explicitly treated as final batch volume including starter, starter source moves from the recipe step to the first volume step, and the generator plus recipe UI clearly explain the fresh sweet tea versus starter breakdown.

## Why
The current wizard structure is already in place, but two important brewing behaviors are still too ambiguous:
1. Tea recommendations are currently too blunt because every tea family shares the same 8 g/L baseline and broad range.
2. The wizard currently asks for total volume without making it clear that starter is included inside that total, which makes the recipe math easy to misread.
3. Starter source is currently asked late in the recipe step even though it affects lineage confidence and starter behavior earlier in the recommendation process.

## Scope
In scope:
1. Update `src/lib/f1-tea-profiles.ts` with realistic tea-type-specific defaults and ranges.
2. Extend the generator contract in `src/lib/f1-generator-types.ts` and `src/lib/f1-recipe-generator.ts` so final total volume, starter amount, and fresh sweet tea volume are explicit.
3. Move `StarterSourceSelector` from Step 7 to Step 1 in the existing wizard.
4. Update wizard copy so Step 1 and Step 7 clearly explain that starter is included inside the final total volume.
5. Preserve existing similarity, lineage, outcome refinement, override behavior, save flow, and setup snapshot persistence.
6. Keep `kombucha_batches.total_volume_ml` as the final total batch size and `starter_liquid_ml` as the starter amount.

Out of scope:
1. Rebuilding or redesigning the wizard architecture.
2. Reordering steps.
3. Changing F1 lifecycle rules, timing rules, or stage behavior.
4. Schema migrations unless a blocker is discovered.
5. Replacing the current recommendation-card system beyond the minimum needed for compatibility.

## Current state
1. `src/components/f1/new-batch-wizard/NewBatchWizard.tsx` mounts the existing step sequence and currently passes `StarterSourceSelector` props into `RecipeStep`.
2. `src/components/f1/new-batch-wizard/useNewBatchWizard.ts` already centralizes wizard state, generator execution, history loading, lineage state, overrides, persistence, coach popups, and save/create flows.
3. `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx` currently asks “How much kombucha do you want to brew?” and only renders volume presets and a numeric input.
4. `src/components/f1/new-batch-wizard/steps/RecipeStep.tsx` currently renders tea, sugar, starter summaries, reasons, overrides, and `StarterSourceSelector`.
5. `src/lib/f1-tea-profiles.ts` currently assigns the same 8 g/L default and 5–12 g/L range to every tea type.
6. `src/lib/f1-recipe-generator.ts` currently computes tea, sugar, and starter using `totalVolumeMl`, but it does not surface `finalBatchVolumeMl` or `freshTeaVolumeMl`, and its reason text does not spell out that starter is part of the total.
7. `src/lib/f1-setups.ts` already saves generator-first snapshot context additively in `setup_snapshot_json.generatorContext` while keeping existing `batch_f1_setups` compatibility intact.
8. The create path still inserts into `kombucha_batches` from `src/components/f1/new-batch-wizard/useNewBatchWizard.ts`, so any volume semantics change must stay compatible with downstream reads in `src/lib/f1-setups.ts` and batch detail surfaces.

## Intended outcome
1. The wizard still opens and behaves like the current linear flow.
2. Step 1 asks for final batch size explicitly and explains that starter is included inside that total.
3. Step 1 shows starter source selection directly below the volume question, while Step 7 no longer asks for it.
4. Tea recommendations differ realistically across tea types and still allow history-based refinement inside tea-specific bounds.
5. The generator returns explicit final-volume fields so the UI can show:
   - final batch volume
   - fresh sweet tea to brew
   - starter to add
6. The recipe step clearly explains that the user brews the fresh sweet tea portion first and then adds starter to land at the chosen final total.
7. Persistence continues storing the final total in `kombucha_batches.total_volume_ml` and the starter portion in `kombucha_batches.starter_liquid_ml`.

## Files and systems involved
1. `src/components/f1/new-batch-wizard/NewBatchWizard.tsx`
2. `src/components/f1/new-batch-wizard/useNewBatchWizard.ts`
3. `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx`
4. `src/components/f1/new-batch-wizard/steps/RecipeStep.tsx`
5. `src/components/lineage/StarterSourceSelector.tsx`
6. `src/lib/f1-tea-profiles.ts`
7. `src/lib/f1-generator-types.ts`
8. `src/lib/f1-recipe-generator.ts`
9. `src/lib/f1-setups.ts`
10. `src/lib/f1-recipe-generator.test.ts`
11. `kombucha_batches`
12. `batch_f1_setups`

## Risks and compatibility checks
1. Accidentally treating `totalVolumeMl` as fresh sweet tea volume instead of final total volume.
2. Breaking history-based tea adjustments by not clamping them to the new tea-specific min/max ranges.
3. Breaking lineage refinement when moving starter source selection from Step 7 to Step 1.
4. Making the generator snapshot incompatible with current `batch_f1_setups` readers.
5. Confusing users if Step 1 copy and Step 7 copy do not use the same total-volume language.
6. Regressing save-as-recipe or create-batch flows by changing output fields without keeping existing setup shapes intact.
7. Accidentally introducing a UI-only copy fix while leaving persisted semantics ambiguous.

## Milestones

### Milestone 1: Update generator contract and tea profiles
Goal:
Make tea recommendations realistic by tea type and make final-volume semantics explicit in generator output and reasons.

Acceptance criteria:
1. Tea defaults and min/max ranges differ by tea type as requested.
2. Generator output includes `finalBatchVolumeMl`, `freshTeaVolumeMl`, and a starter-included indicator.
3. Reasons explain that starter is part of the final total.
4. Existing lineage, similarity, and outcome refinement still apply.
5. Focused generator tests cover the new tea defaults and total-volume breakdown.

Files expected:
1. `src/lib/f1-tea-profiles.ts`
2. `src/lib/f1-generator-types.ts`
3. `src/lib/f1-recipe-generator.ts`
4. `src/lib/f1-recipe-generator.test.ts`
5. `src/lib/f1-setups.ts`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`

Status: completed

### Milestone 2: Move starter source to Step 1 and update wizard copy
Goal:
Keep the existing wizard structure but move starter source selection to the volume step and update the recipe display to explain the corrected total-volume math.

Acceptance criteria:
1. `StarterSourceSelector` appears in Step 1 below the volume input.
2. Step 7 no longer renders starter source selection.
3. Step 1 copy clearly says the entered volume is the final total including starter.
4. Step 7 shows final batch volume, fresh sweet tea volume, and starter volume distinctly.
5. Existing coach popups, step order, and override behavior remain intact.

Files expected:
1. `src/components/f1/new-batch-wizard/NewBatchWizard.tsx`
2. `src/components/f1/new-batch-wizard/useNewBatchWizard.ts`
3. `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx`
4. `src/components/f1/new-batch-wizard/steps/RecipeStep.tsx`
5. `src/components/lineage/StarterSourceSelector.tsx`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`

Status: completed

### Milestone 3: Confirm persistence and final compatibility
Goal:
Validate that the updated wizard still creates batches correctly, keeps saved setup snapshots compatible, and builds cleanly.

Acceptance criteria:
1. `total_volume_ml` still represents final batch size.
2. `starter_liquid_ml` still represents starter amount.
3. Generator-first snapshot saving still works.
4. The app builds successfully with the updated wizard.

Files expected:
1. `src/lib/f1-setups.ts`
2. any touched wizard or generator files from earlier milestones

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Status: completed

## Progress log
1. Re-read `AGENTS.md` and `PLANS.md`.
2. Inspected the current wizard entry and controller in `src/components/f1/new-batch-wizard/NewBatchWizard.tsx` and `src/components/f1/new-batch-wizard/useNewBatchWizard.ts`.
3. Inspected `src/lib/f1-tea-profiles.ts`, `src/lib/f1-generator-types.ts`, and `src/lib/f1-recipe-generator.ts` to confirm the current tea defaults and generator output contract.
4. Inspected `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx` and `src/components/f1/new-batch-wizard/steps/RecipeStep.tsx` to confirm the current starter-source placement and recipe presentation.
5. Inspected `src/lib/f1-setups.ts` to confirm the current `kombucha_batches` write path and `batch_f1_setups` snapshot shape that must remain compatible.
6. Recorded baseline validation before Milestone 1:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
7. Updated `src/lib/f1-tea-profiles.ts` with tea-type-specific defaults and min/max ranges so black, blends, green, and white teas no longer share the same baseline.
8. Extended `src/lib/f1-generator-types.ts` and `src/lib/f1-recipe-generator.ts` so the generator now returns `finalBatchVolumeMl`, `freshTeaVolumeMl`, and `starterIncludedInTotal`, while keeping tea and sugar calculations based on the chosen final total volume.
9. Updated generator reason text to explain the fresh sweet tea versus starter breakdown without making starter sound additive on top of the target total.
10. Extended the saved generator snapshot in `src/lib/f1-setups.ts` to persist the new volume-breakdown fields alongside the existing generator-first context.
11. Updated `src/lib/f1-recipe-generator.test.ts` to reflect the new tea baselines, total-volume breakdown, and lighter white-tea recommendation.
12. Milestone 1 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
13. Updated `src/components/f1/new-batch-wizard/NewBatchWizard.tsx` and `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx` so starter source selection now appears in Step 1 directly below the final batch volume question while reusing the existing lineage loading and selection behavior.
14. Updated Step 1 copy in `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx` and `stepHelperText` in `src/components/f1/new-batch-wizard/useNewBatchWizard.ts` so the entered amount is clearly described as the final batch volume with starter included.
15. Updated `src/components/f1/new-batch-wizard/steps/RecipeStep.tsx` so the recipe screen now shows final batch volume, fresh sweet tea to brew, and starter to add, and no longer renders `StarterSourceSelector`.
16. Milestone 2 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
17. Confirmed the updated generator output still feeds the existing `kombucha_batches` insert path and `saveBatchF1Setup(...)` snapshot save without changing `total_volume_ml` semantics or `starter_liquid_ml` storage.
18. Final validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the same pre-existing Browserslist age notice and chunk-size warning

## Decision log
1. Reuse the current wizard shell and reducer-driven controller rather than rebuilding any flow structure.
2. Keep `totalVolumeMl` as the final total batch size and expose fresh sweet tea volume as an additive generator output instead of changing persistence semantics.
3. Keep generator logic in `src/lib` and use the existing wizard only for orchestration and display.

## Open questions
1. None currently.

## Done when
1. Step 1 asks for final batch size clearly and includes starter source selection below the volume input.
2. Step 7 no longer renders starter source selection.
3. Tea recommendations differ materially across tea types and stay clamped inside tea-specific ranges.
4. Generator output and reasons clearly distinguish final total volume, fresh sweet tea volume, and starter volume.
5. Existing history, lineage, similarity, override, save-as-recipe, and create-batch flows still work.
6. Validation passes with only documented pre-existing warnings/notices remaining.

## Final validation
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
