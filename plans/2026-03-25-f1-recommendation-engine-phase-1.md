# F1 Recommendation Engine Phase 1: Generator Layer

## Summary
Implement the Phase 1 data, config, and pure generator layer for F1 recipe recommendations.

## Why
The repo already has F1 recipe inputs, baseline tea and sugar family classification, similarity scoring, and structured F1 outcome tags. What is still missing is a deterministic generator that turns those inputs into reusable recommendation outputs for tea, sugar, and starter guidance without coupling the logic to `NewBatch` UI.

## Scope
In scope:
1. Add tea, sugar, and sweetness-target config modules in `src/lib`.
2. Add shared generator result and input types in `src/lib`.
3. Add a pure deterministic F1 recipe generator in `src/lib`.
4. Reuse existing tea-family, sugar-family, similarity-tier, and F1 outcome-tag infrastructure where practical.
5. Add focused unit tests for the requested generator scenarios.

Out of scope:
1. Rebuilding `src/pages/NewBatch.tsx`
2. Adding a new wizard flow
3. Adding steep-time logic
4. Changing batch lifecycle or stage progression
5. Changing Supabase schema, persistence, timeline, or `batch_logs` / `batch_stage_events`

## Current state
1. `src/lib/f1-recipe-types.ts` defines the current F1 tea, sugar, and target-preference enums used across recipes and batch setup flows.
2. `src/lib/f1-baseline-rules.ts` already owns shared `getTeaFamily(...)` and `getSugarFamily(...)` helpers that classify the current tea and sugar families.
3. `src/lib/f1-similarity.ts` already defines `F1SimilarityMatch` plus `very_close`, `close`, `related_transition`, and `weak_match` tiers.
4. `src/lib/f1-outcome-signals.ts` and `src/lib/phase-outcome-options.ts` already establish the relevant F1 outcome tags and taste/readiness vocabulary, including `weak_tea_base`, `strong_tea_base`, `too_sweet`, `too_sour`, `no`, and `maybe_late`.
5. `src/lib/f1-recommendations.ts` assembles card-based recommendation output for the current Phase 3 UX, but there is not yet a lower-level recipe generator that returns direct numeric recipe recommendations and structured reasoning for later UI use.

## Intended outcome
1. A pure function can accept total volume, tea type, sugar type, target preference, lineage-source ids, and history/similarity context.
2. The function returns deterministic tea grams, approximate tea bag count, sugar targets and converted sugar grams, starter ratio and starter milliliters, structured confidence, lineage status, history adjustments, caution flags, and user-facing reasons.
3. Honey uses its own conversion factor logic, `Other` sugar can intentionally return null sugar grams with low confidence, and repeated tea-base outcome tags can refine tea grams per liter by plus or minus 1 within the configured range.
4. Repeated too-sweet / not-ready or too-sour / maybe-late outcomes only add timing notes for now and do not directly rewrite sugar numerically.
5. The output contract is ready for later Phase 2 UI consumption without changing current route flows yet.

## Files and systems involved
1. Domain helpers in `src/lib`
   - `src/lib/f1-recipe-types.ts`
   - `src/lib/f1-baseline-rules.ts`
   - `src/lib/f1-similarity.ts`
   - `src/lib/phase-outcome-options.ts`
2. New generator-layer files in `src/lib`
   - `src/lib/f1-tea-profiles.ts`
   - `src/lib/f1-sugar-profiles.ts`
   - `src/lib/f1-sweetness-targets.ts`
   - `src/lib/f1-generator-types.ts`
   - `src/lib/f1-recipe-generator.ts`
3. Focused unit tests
   - likely a new `src/lib/f1-recipe-generator.test.ts`

## Risks and compatibility checks
1. Duplicating tea or sugar family classification instead of reusing `f1-baseline-rules.ts`
2. Returning advice that sounds more certain than the current conservative brewing guidance supports
3. Letting history directly rewrite sugar recommendations even though this phase only allows timing notes there
4. Breaking compatibility with existing `F1TeaType`, `F1SugarType`, `F1TargetPreference`, or `F1SimilarityMatch` contracts
5. Producing generator output that later UI code cannot consume cleanly because result fields or reason strings are inconsistent
6. Validation gaps if unit tests do not cover honey conversion, `Other` sugar, lineage-driven starter ratio changes, and tea history refinement
7. Batch stage consistency, next-action consistency, and timeline/history writes should remain unchanged because this phase is generator-only and must not affect `batch_stage_events`, `batch_logs`, or saved batch compatibility

## Milestones

### Milestone 1: Define config and generator contracts
Goal:
Add the new config modules and shared generator input/output types while reusing existing shared enums and family helpers.

Acceptance criteria:
1. Tea profile config matches the exact requested families, defaults, ranges, confidence, and UI ranks.
2. Sugar profile config matches the exact requested families, conversion factors, ranges, and confidence.
3. Sweetness targets match tart 50 g/L, balanced 75 g/L, and sweeter 100 g/L sucrose-equivalent.
4. Shared input/output types exist for generator consumers and tests.

Files expected:
1. `src/lib/f1-tea-profiles.ts`
2. `src/lib/f1-sugar-profiles.ts`
3. `src/lib/f1-sweetness-targets.ts`
4. `src/lib/f1-generator-types.ts`
5. Minimal export updates only if needed in `src/lib/f1-recipe-types.ts` or `src/lib/f1-baseline-rules.ts`

Validation:
1. `npx tsc -b`

Status: completed

### Milestone 2: Implement deterministic recipe generator
Goal:
Build the pure generator with tea, sugar, starter, confidence, lineage, history refinement, caution flags, and user-facing reasons.

Acceptance criteria:
1. Tea grams and approximate bags are always returned.
2. Honey uses separate factor logic, and `Other` returns null sugar grams with low confidence.
3. Starter ratio uses 10% by default and 12% for honey, other sugar, or unknown lineage.
4. History refinement increases or decreases tea by 1 g/L only when repeated close or very-close tea-base tags support it.
5. Too-sweet / too-sour patterns only add timing-oriented history notes in this phase.

Files expected:
1. `src/lib/f1-recipe-generator.ts`
2. Minimal shared helper extraction only if needed in existing similarity or baseline files

Validation:
1. `npx tsc -b`

Status: completed

### Milestone 3: Add focused tests and final validation
Goal:
Cover the requested scenarios and confirm the generator layer passes repo validation.

Acceptance criteria:
1. Tests cover the seven requested scenarios.
2. Generator output is deterministic and ready for Phase 2 UI consumption.
3. Final validation distinguishes any pre-existing issues from new ones introduced here.

Files expected:
1. `src/lib/f1-recipe-generator.test.ts`
2. Any tiny fixture or helper additions if justified

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build` only if the implementation unexpectedly affects build behavior

Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md` to confirm repo planning, validation, and scope rules.
2. Inspected `src/lib/f1-recipe-types.ts` to confirm the existing tea, sugar, and target-preference enums.
3. Inspected `src/lib/f1-baseline-rules.ts` to confirm shared tea-family and sugar-family helpers already exist.
4. Inspected `src/lib/f1-similarity.ts`, `src/lib/f1-outcome-signals.ts`, and `src/lib/phase-outcome-options.ts` to confirm similarity tiers and outcome tags available for history refinement.
5. Confirmed this phase is generator-only and should not touch batch stage progression, `batch_stage_events`, `batch_logs`, or Supabase schema.
6. Added `src/lib/f1-tea-profiles.ts`, `src/lib/f1-sugar-profiles.ts`, `src/lib/f1-sweetness-targets.ts`, and `src/lib/f1-generator-types.ts` to define the exact profile and generator contracts for Phase 1.
7. Milestone 1 validation: `npx tsc -b` passed.
8. Added `src/lib/f1-recipe-generator.ts` with deterministic tea, sugar, starter, confidence, lineage, history-adjustment, caution-flag, and reason generation.
9. Milestone 2 validation: `npx tsc -b` passed.
10. Added `src/lib/f1-recipe-generator.test.ts` with the seven requested scenarios plus an extra timing-note regression test to lock in the “do not rewrite sugar yet” rule.
11. Final validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice and chunk-size warning

## Decision log
1. Reuse existing `getTeaFamily(...)` and `getSugarFamily(...)` helpers instead of duplicating family classification logic in the new generator layer.
2. Keep the Phase 1 generator independent from `NewBatch` and current card-based UI assembly so later phases can consume the same deterministic result shape.
3. Keep history refinement conservative: tea can move by plus or minus 1 g/L, while repeated sweetness or sourness outcomes only produce timing notes for now.
4. Reuse `F1RecommendationConfidence`, `F1RecommendationHistoryEntry`, and `F1SimilarityMatch` as the shared confidence and history infrastructure instead of introducing duplicate generator-only equivalents.
5. Keep the new generator input typed to the existing F1 enums so Phase 2 UI work can plug into the same contract directly.

## Open questions
1. None currently. The scope and requested rules are specific enough to implement directly.

## Done when
1. The new config modules and generator types exist and match the requested values.
2. `buildF1RecipeRecommendation(...)` or equivalent pure generator logic returns all requested output fields.
3. The generator reuses current family and similarity infrastructure rather than forking it.
4. The requested unit tests pass.
5. No lifecycle, persistence, timeline, or stage logic is changed.

## Final validation
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build` if build behavior is affected
