# New Batch Wizard UX Tightening Pass

## Summary
Tighten the existing New Batch wizard by moving starting-point selection into Step 1, embedding compact progress inside the active step card, fixing scroll-to-top on step changes, decluttering the recipe/results page, and making the finalize page feel like a lightweight finish step instead of another recipe readout.

## Why
The current wizard already works functionally, but the presentation is still heavier than it needs to be:
1. The persistent starting-point area in the header keeps taking space above every step.
2. The standalone progress block consumes vertical space before the active question even starts.
3. The recipe step behaves more like a report than a focused answer screen.
4. Mobile step transitions can leave the user partway down the next step instead of returning them to the top.
5. The finalize step still repeats recipe information more than necessary.

## Scope
In scope:
1. Lighten `NewBatchWizardHeader` and move starting-point controls into Step 1 only.
2. Remove the standalone top-level progress section and embed compact progress inside each step card.
3. Add robust scroll-to-top behavior for step transitions and major prefill transitions.
4. Declutter the recipe step by hiding explanations/context behind on-demand dialogs and collapsing manual adjustments by default.
5. Move estimated first taste window into the main recipe breakdown area.
6. Reduce duplicate starter emphasis across recipe and finalize surfaces.
7. Simplify finalize-step recap and copy.

Out of scope:
1. Rebuilding the wizard architecture.
2. Changing step order.
3. Changing recipe generation rules, total-volume logic, or persistence semantics.
4. Reworking the save-as-recipe dialog itself.
5. Adding schema changes or migrations.

## Current state
1. `src/components/f1/new-batch-wizard/NewBatchWizard.tsx` currently renders a header, a standalone `NewBatchWizardProgress`, the step content, and the footer.
2. `src/components/f1/new-batch-wizard/NewBatchWizardHeader.tsx` currently contains a large persistent starting-point card with recipe/scratch/brew-again controls.
3. `src/components/f1/new-batch-wizard/NewBatchWizardProgress.tsx` currently renders as a separate block above every step.
4. Each step component currently has its own large `Step N` label instead of a shared compact embedded progress header.
5. `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx` already contains volume and starter-source inputs, but it does not yet own starting-point selection.
6. `src/components/f1/new-batch-wizard/steps/RecipeStep.tsx` currently keeps the reasons block, caution block, recommendation section, and manual adjustment fields all visible inline by default.
7. `src/components/f1/new-batch-wizard/steps/FinalizeStep.tsx` still shows a recipe recap card large enough to make the page feel like another review screen.
8. `src/components/f1/new-batch-wizard/useNewBatchWizard.ts` currently centralizes mode, step, recipe generation, lineage, overrides, and persistence, but it does not yet explicitly reset scroll position on wizard transitions.
9. Timing guidance already exists in `src/lib/batch-timing.ts`, which can be reused to derive a first tasting window without inventing a separate timing rule.

## Intended outcome
1. The page opens with a light title bar and then the active step card, without a large persistent starting-point block or standalone progress block above it.
2. Step 1 contains the starting-point controls for scratch, saved recipe, and brew again when available.
3. Each step card contains a compact internal progress header showing step number, label, and a light progress indicator.
4. Every next/back/programmatic transition resets the viewport to the top.
5. The recipe step focuses on the answer:
   - batch breakdown
   - recipe composition
   - manual adjustment trigger
   - optional explanation/context triggers
6. Reasons, cautions, and secondary context are still available, but only on demand.
7. The finalize step focuses on metadata and finish, with only a very compact recipe reminder if any.

## Files and systems involved
1. `src/components/f1/new-batch-wizard/NewBatchWizard.tsx`
2. `src/components/f1/new-batch-wizard/NewBatchWizardHeader.tsx`
3. `src/components/f1/new-batch-wizard/NewBatchWizardProgress.tsx`
4. `src/components/f1/new-batch-wizard/useNewBatchWizard.ts`
5. `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx`
6. `src/components/f1/new-batch-wizard/steps/TeaStep.tsx`
7. `src/components/f1/new-batch-wizard/steps/SugarStep.tsx`
8. `src/components/f1/new-batch-wizard/steps/VesselStep.tsx`
9. `src/components/f1/new-batch-wizard/steps/SweetnessStep.tsx`
10. `src/components/f1/new-batch-wizard/steps/TemperatureStep.tsx`
11. `src/components/f1/new-batch-wizard/steps/RecipeStep.tsx`
12. `src/components/f1/new-batch-wizard/steps/FinalizeStep.tsx`
13. `src/components/f1/F1RecommendationSection.tsx`
14. `src/lib/batch-timing.ts`

## Risks and compatibility checks
1. Breaking the existing saved-recipe, scratch, or brew-again flows while moving starting-point controls into Step 1.
2. Breaking no-forward-navigation or back behavior while adding scroll reset.
3. Hiding too much recipe detail and making it hard to access required manual sugar entry.
4. Repeating timing logic incorrectly instead of reusing existing batch timing helpers.
5. Reintroducing duplicate starter emphasis through multiple summary surfaces.
6. Making the finalize step so minimal that save-as-recipe becomes hard to find.
7. Breaking persistence indirectly by changing only UI but not preserving the existing create path.

## Milestones

### Milestone 1: Lighten shell and move starting-point controls into Step 1
Goal:
Remove the large persistent header block and standalone progress block, and embed both concerns into the active step experience.

Acceptance criteria:
1. `NewBatchWizardHeader` is light and no longer contains large starting-point controls.
2. `NewBatchWizardProgress` is no longer rendered as a separate top-level block.
3. Step 1 contains the starting-point choice for scratch, saved recipe, and brew again when available.
4. Each step uses a compact embedded progress header inside the step card.

Files expected:
1. `src/components/f1/new-batch-wizard/NewBatchWizard.tsx`
2. `src/components/f1/new-batch-wizard/NewBatchWizardHeader.tsx`
3. `src/components/f1/new-batch-wizard/NewBatchWizardProgress.tsx`
4. `src/components/f1/new-batch-wizard/steps/*.tsx`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`

Status: completed

### Milestone 2: Tighten recipe and finalize steps
Goal:
Reduce visible clutter in the end of the wizard and make explanations optional instead of always open.

Acceptance criteria:
1. Recipe page keeps only the core recipe and breakdown visible by default.
2. Reasons/cautions are moved behind an on-demand overlay.
3. Secondary recommendation/context is moved behind an on-demand overlay.
4. Manual adjustments are collapsed by default unless required or already edited.
5. Estimated first taste window appears near the top of the recipe breakdown.
6. Finalize page no longer feels like another recipe report.

Files expected:
1. `src/components/f1/new-batch-wizard/steps/RecipeStep.tsx`
2. `src/components/f1/new-batch-wizard/steps/FinalizeStep.tsx`
3. `src/components/f1/F1RecommendationSection.tsx` if small support changes are needed
4. `src/lib/batch-timing.ts` only if read-only reuse requires small extraction

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`

Status: completed

### Milestone 3: Scroll reset and final compatibility pass
Goal:
Make step transitions reliably open from the top and confirm the tightened wizard still builds and saves correctly.

Acceptance criteria:
1. Next/back/programmatic transitions reset scroll to top.
2. Existing wizard behavior, save flow, and persistence are preserved.
3. The updated wizard builds successfully.

Files expected:
1. `src/components/f1/new-batch-wizard/NewBatchWizard.tsx`
2. `src/components/f1/new-batch-wizard/useNewBatchWizard.ts`
3. any touched wizard files from earlier milestones

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Status: completed

## Progress log
1. Re-read `AGENTS.md` and `PLANS.md`.
2. Inspected `src/components/f1/new-batch-wizard/NewBatchWizard.tsx`, `NewBatchWizardHeader.tsx`, `NewBatchWizardProgress.tsx`, and `NewBatchWizardFooter.tsx` to confirm the current shell structure and the two large persistent blocks above the active step.
3. Inspected `src/components/f1/new-batch-wizard/useNewBatchWizard.ts` to confirm current step transitions, mode handling, and the right hook-level place to support scroll resets.
4. Inspected `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx`, `RecipeStep.tsx`, and `FinalizeStep.tsx` to confirm the current clutter points and recap duplication.
5. Inspected `src/components/f1/new-batch-wizard/steps/TeaStep.tsx`, `SugarStep.tsx`, `VesselStep.tsx`, `SweetnessStep.tsx`, and `TemperatureStep.tsx` to prepare a shared embedded progress header across all step cards.
6. Inspected `src/lib/batch-timing.ts` to confirm the existing first-taste timing helper can be reused instead of inventing separate timing logic.
7. Recorded baseline validation before Milestone 1:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
8. Lightened `src/components/f1/new-batch-wizard/NewBatchWizardHeader.tsx` so it now stays as a title bar plus compact mode badge instead of a persistent starting-point control surface.
9. Removed the standalone top-level progress block from `src/components/f1/new-batch-wizard/NewBatchWizard.tsx` and reused `src/components/f1/new-batch-wizard/NewBatchWizardProgress.tsx` as a compact embedded progress header inside each step card.
10. Moved the starting-point controls for scratch, saved recipe, and brew again into `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx`, keeping them available only in Step 1.
11. Milestone 1 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files after fixing one new hook-dependency warning in `NewBatchWizard.tsx`
   - `npm run test`: passed
12. Reworked `src/components/f1/new-batch-wizard/steps/RecipeStep.tsx` into a tighter answer-first layout with the main batch breakdown up top, estimated first taste window surfaced early, manual adjustments collapsed until needed, and two on-demand dialogs for calculation details and extra context.
13. Reused `getBatchStageTiming(...)` from `src/lib/batch-timing.ts` inside `src/components/f1/new-batch-wizard/useNewBatchWizard.ts` so the recipe step can show a first tasting window without inventing separate timing rules.
14. Simplified `src/components/f1/new-batch-wizard/steps/FinalizeStep.tsx` so the page is metadata-first with only a compact recipe reminder line and a smaller save-recipe prompt.
15. Milestone 2 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files after fixing one new hook-order lint error in `RecipeStep.tsx`
   - `npm run test`: passed
16. Added scroll-to-top support in `src/components/f1/new-batch-wizard/useNewBatchWizard.ts` for next/back/reset/prefill transitions and a wizard-level top-reset effect in `src/components/f1/new-batch-wizard/NewBatchWizard.tsx` keyed to step changes for mobile reliability.
17. Final validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the same pre-existing Browserslist age notice and chunk-size warning

## Decision log
1. Keep the existing wizard architecture and reducer/controller intact; only tighten the shell and end-step presentation.
2. Reuse `NewBatchWizardProgress` as a compact embedded progress header instead of creating a second parallel progress system.
3. Reuse `getBatchStageTiming(...)` from `src/lib/batch-timing.ts` for the recipe-step first-taste window so timing guidance stays consistent with the rest of the app.

## Open questions
1. None currently.

## Done when
1. The standalone progress block is gone.
2. Starting-point controls live in Step 1 only.
3. Each step has compact embedded progress inside the active card.
4. Scroll resets to the top on next/back/programmatic transitions.
5. The recipe page is visibly simpler, with explanation/context hidden until requested.
6. Duplicate starter emphasis is reduced.
7. The finalize page is light and metadata-first.
8. Validation passes with only documented pre-existing warnings/notices remaining.

## Final validation
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
