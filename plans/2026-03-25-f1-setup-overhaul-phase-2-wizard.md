# F1 Setup Overhaul Phase 2: Generated-First Guided Wizard

## Summary
Replace the current `src/pages/NewBatch.tsx` staged form with a true guided wizard that asks one primary question per step, uses `src/lib/f1-recipe-generator.ts` as the recipe source of truth, delays manual tea/sugar/starter editing until after generation, and preserves the current create-batch and `batch_f1_setups` persistence path.

## Why
The repo already has the right brewing foundations, but the interaction model is still wrong for the intended product:
1. `src/pages/NewBatch.tsx` still behaves like a large route-local editor with grouped form state, step routing, library dialogs, recommendation cards, and final create logic mixed together.
2. `src/components/f1/new-batch/NewBatchProgress.tsx` still presents clickable steps, which keeps the mental model as “navigate the page” instead of “move through the guided flow.”
3. `src/components/f1/F1RecommendationSection.tsx` still interprets a manually built draft instead of defining the recipe.
4. Tea, sugar, and starter amounts are still front-loaded before the app has generated a recommendation.
5. The Phase 1 generator now exists and returns a real recipe recommendation contract, so the UI should stop treating recommendation as secondary commentary.

## Scope
In scope:
1. Keep the route entry at `src/pages/NewBatch.tsx`.
2. Replace the current internals with a dedicated wizard shell under `src/components/f1/new-batch-wizard/`.
3. Use the Phase 1 generator and supporting history/lineage helpers as the primary engine.
4. Add a generated recipe step with override controls after generation.
5. Add a dedicated micro-popup coaching pattern.
6. Keep `kombucha_batches` and `batch_f1_setups` compatibility.

Out of scope:
1. Steep-time logic
2. Schema rewrites unless blocked
3. Broad recipe- or vessel-library redesign
4. Stage-model or timing-rule changes
5. UI-side reimplementation of recipe logic

## Current state
### 1. Current-state diagnosis
1. `src/pages/NewBatch.tsx` still renders inside `AppLayout` as a stacked page with a header, step grid, summary surfaces, recommendation sections, dialogs, and a sticky footer. That is a page-first layout, not an immersive wizard shell.
2. The current step sequence is still `start`, `brew`, `context`, `review`. Even with gating, each step contains several decisions. The “brew” step still exposes batch basics, tea, sugar, starter, environment, and metadata details together.
3. `NewBatchProgress` is still a clickable stepper, and `goToStep(...)` still allows moving to later steps once earlier ones are not blocked. That is better than unbounded jumping, but it still violates the strict no-forward-navigation rule for the final product.
4. `F1RecommendationSection` is still secondary. `NewBatch.tsx` imports `buildF1Recommendations(...)`, not `generateF1RecipeRecommendation(...)`, so the current primary flow is still:
   - user manually edits tea/sugar/starter
   - app interprets the draft with cards
5. `buildInitialForm(...)` still seeds manual `teaAmountValue`, `sugarG`, and `starterLiquidMl` before the app has generated a recipe. That is the opposite of the target product order.
6. `StarterSourceSelector` still appears as context after the main composition is already assembled, even though lineage should refine the generated recommendation rather than act like an archival link.
7. `NewBatchBrewRead` and `F1SetupSummary` are useful readouts, but they still reinforce “here is the draft you built” rather than “here is the recipe the app recommends from your answers.”

## Intended outcome
### 2. Proposed Phase 2 architecture
1. Keep `src/pages/NewBatch.tsx` as the route entry, but replace its internals almost entirely.
2. Add a dedicated shell:
   - `src/components/f1/new-batch-wizard/NewBatchWizard.tsx`
3. Add a dedicated controller hook:
   - `src/components/f1/new-batch-wizard/useNewBatchWizard.ts`
4. Move the flow into eight dedicated step components under:
   - `src/components/f1/new-batch-wizard/steps/`
5. Treat the generator result as the system recipe, and keep manual overrides as a separate layer that only appears in Step 7.
6. Keep low-level pickers and domain helpers where they still solve bounded subproblems:
   - `F1RecipePicker`
   - `F1VesselPicker`
   - `buildF1VesselFitResult(...)`
   - `saveBatchF1Setup(...)`
7. Demote or replace current staged-page surfaces:
   - `NewBatchProgress`: replace
   - `NewBatchStepFooter`: replace
   - `F1RecommendationSection`: demote to secondary explanation
   - `NewBatchBrewRead`: retire
   - `F1SetupSummary`: demote to recap/final confirmation

### 3. Step-by-step wizard design
1. Step 1, Volume
   - Purpose: set `totalVolumeMl`
   - Copy: “How much kombucha do you want to brew?”
   - Validation: required, greater than 0
   - Draft write: `totalVolumeMl`
   - Guidance: only if the amount is unusually small/large for saved vessel context
   - Skip: no
   - Continue: “Continue to tea”
2. Step 2, Tea
   - Purpose: set `teaType`
   - Copy: “What tea do you want to use?”
   - Validation: required
   - Draft write: `teaType`
   - Guidance: popup for less-conservative tea families
   - Skip: no
   - Continue: “Continue to sugar”
3. Step 3, Sugar
   - Purpose: set `sugarType`
   - Copy: “What sugar do you want to use?”
   - Validation: required
   - Draft write: `sugarType`
   - Guidance: popup for `Honey` or `Other`
   - Skip: no
   - Continue: “Continue to vessel”
4. Step 4, Vessel
   - Purpose: select saved vessel or lightweight custom vessel details
   - Copy: “What are you brewing in?”
   - Validation: some vessel choice required; capacity strongly encouraged
   - Draft write: `selectedVessel` and persistence-compatible vessel label
   - Guidance: inline fit preview, popup for `tight_fit`, `overfilled`, or material caution
   - Skip: no
   - Continue: “Continue to taste target”
5. Step 5, Sweetness target
   - Purpose: set `targetPreference`
   - Copy: “How sweet do you want the finished batch to feel?”
   - Validation: required
   - Draft write: `targetPreference`
   - Guidance: compact explanation of how this shifts the starting recipe
   - Skip: no
   - Continue: “Continue to temperature”
6. Step 6, Temperature
   - Purpose: set `avgRoomTempC`
   - Copy: “What room temperature do you expect?”
   - Validation: required numeric range
   - Draft write: `avgRoomTempC`
   - Guidance: popup for cool or warm pace expectations
   - Skip: no
   - Continue: “Show my recipe”
7. Step 7, Recommended F1 recipe
   - Purpose: reveal system recommendation, lineage refinement, reasons, cautions, and manual overrides
   - Copy: “Your recommended F1 recipe”
   - Validation: generator result must exist; overrides must be valid; overfilled vessel must block until resolved
   - Draft write: generator result, lineage choice, overrides, final chosen composition
   - Guidance: popup when lineage or overrides materially change interpretation
   - Skip: no
   - Continue: “Continue to final details”
8. Step 8, Finalize
   - Purpose: collect `name`, `brewDate`, `initialNotes`, optional `initialPh`, and create the batch
   - Copy: “Final details and start batch”
   - Validation: name and brew date required
   - Draft write: final metadata
   - Guidance: none by default; only compact recap
   - Skip: notes and pH optional, step not skippable
   - Continue: “Start batch”

### 4. Generator integration plan
1. `generateF1RecipeRecommendation(...)` should become the primary recipe computation path in the wizard.
2. The generator should first run as soon as the required pre-generation inputs exist:
   - `totalVolumeMl`
   - `teaType`
   - `sugarType`
   - `targetPreference`
3. It should rerun whenever those fields or lineage-related inputs change:
   - `starterSourceBatchId`
   - `brewAgainSourceBatchId`
4. Similar-batch history should be loaded once near wizard start, stored in the controller hook, and reused for generator recomputation instead of being fetched per step.
5. Step 7 should own lineage refinement:
   - choosing a starter source reruns the generator immediately
   - reasons, confidence, and starter recommendation update from that result
6. Manual overrides must layer on top of generated values, not replace the generated snapshot:
   - `finalTeaG = overrideTeaG ?? recommendedTeaG`
   - `finalSugarG = overrideSugarG ?? recommendedSugarG`
   - `finalStarterMl = overrideStarterMl ?? recommendedStarterMl`
7. The system recommendation and the user’s final chosen recipe must be saved as distinct concepts in state and snapshot data.

### 5. State model
1. Recommended pattern: one reducer inside `useNewBatchWizard`.
2. Why reducer:
   - the flow is a real state machine
   - answers, generated data, overrides, metadata, popup state, and loading state all interact
3. Proposed state groups:
   - `mode`: `scratch | recipe | brew_again`
   - `step`: `volume | tea | sugar | vessel | sweetness | temperature | recipe | finalize`
   - `answers`: volume, tea type, sugar type, target preference, temperature, selected vessel, starter lineage ids, selected recipe id
   - `generated`: `status`, `result`, `historyEntries`, `similarityMatches`
   - `overrides`: tea grams, sugar grams, starter ml
   - `finalMetadata`: name, brew date, notes, pH
   - `ui`: picker dialogs, custom vessel expansion, popup state, saving state
   - `derived`: final chosen setup, vessel fit, blocking issue, continue eligibility

### 6. Micro popup coaching system
1. Use a dedicated popup component, not toasts.
2. Desktop: anchored to the active question card or control.
3. Mobile: compact bottom sheet above the footer.
4. Trigger only when interpretation changes meaningfully:
   - honey / other sugar
   - less-conservative tea
   - cool/warm temperature
   - tight or overfilled vessel fit
   - caution / not-recommended vessel material
   - unknown lineage or lineage change
   - override drift far from recommendation
5. Priority order:
   - blocking fit issues
   - other-sugar conversion limitation
   - honey conversion caution
   - lineage change / unknown lineage
   - vessel material caution
   - temperature pace note
   - tea-family note
6. Deduplication:
   - store shown popups by type + value signature
   - only one visible at a time
   - dismissed popups stay dismissed until the user crosses out of and back into the trigger state
7. Tone:
   - calm
   - one thought at a time
   - practical, never alarmist
8. Visibility:
   - persistent until dismissed or until step advance
   - not fast auto-dismiss like a toast
9. Example copy:
   - Honey: “Honey changes the sugar conversion a bit, so treat these grams as a starting point.”
   - Other: “The app can keep the sweetness target, but you’ll choose the exact sugar grams yourself.”
   - Tight fit: “This vessel is getting close to its recommended fill. A slightly smaller batch may feel calmer to manage.”

### 7. UI composition and layout
1. Overall shell:
   - immersive, centered wizard panel
   - quieter surrounding chrome than the current stacked page
2. Header:
   - title
   - short progress text
   - exit action
3. Progress:
   - non-clickable linear or breadcrumb indicator
   - shows current step and completion only
4. Question card:
   - one main card per step
   - primary input only
   - compact secondary guidance below it
5. Footer:
   - fixed back / continue / start buttons
   - one concise helper or blocking line
6. Mobile:
   - full-height feeling
   - large tap targets
   - popup uses bottom-sheet pattern
7. Desktop:
   - centered shell
   - optional side recap only on Step 7
8. Motion:
   - subtle slide/fade between steps
   - stronger reveal on Step 7 so the recipe feels like the reward moment
9. Recipe screen:
   - recommendation first
   - reasons and cautions second
   - overrides third
   - lineage refinement last
10. Final details:
   - visually secondary to the recipe recap

### 8. Reuse vs replacement map
1. `src/pages/NewBatch.tsx`: replace internally
2. `src/components/f1/new-batch/NewBatchProgress.tsx`: replace
3. `src/components/f1/new-batch/NewBatchStepFooter.tsx`: replace
4. `src/components/f1/F1RecommendationSection.tsx`: demote to secondary use
5. `src/components/lineage/StarterSourceSelector.tsx`: reuse with modification
6. `src/components/f1/F1RecipePicker.tsx`: reuse with modification
7. `src/components/f1/F1VesselPicker.tsx`: reuse with modification
8. `src/components/f1/new-batch/NewBatchBrewRead.tsx`: retire
9. `src/components/f1/F1SetupSummary.tsx`: demote to recap/final-use
10. `src/lib/f1-recipe-generator.ts`: reuse as-is as core engine
11. `src/lib/f1-generator-types.ts`: reuse as shared contract
12. `src/lib/f1-recommendations.ts`: demote or split for secondary explanation/history reuse

### 9. Copy strategy for Phase 2
1. Tone principles:
   - brewing guide, not dashboard
   - calm, short, practical
   - helpful without sounding absolute
2. Remove current system-like phrasing:
   - “review”
   - “context read”
   - “suggestions for this batch”
   - any UI that sounds like the app is auditing a form
3. Question copy examples:
   - “How much kombucha do you want to brew?”
   - “What tea do you want to use?”
   - “What sugar do you want to use?”
   - “What are you brewing in?”
   - “How sweet do you want the finished batch to feel?”
   - “What room temperature do you expect?”
4. Generated explanation style should reuse Phase 1 reason language directly where possible:
   - “Tea is being calculated from an 8 g/L true-tea baseline.”
   - “Balanced starts from 75 g/L sucrose-equivalent before sugar-type conversion.”
   - “Starter is being kept slightly higher because this culture line is unknown.”
5. Cautions should sound like guidance:
   - “This is a starting point.”
   - “Worth checking before you brew.”
   - “May move the batch faster or slower.”
6. Action labels should name the next decision:
   - “Continue to tea”
   - “Show my recipe”
   - “Start batch”
7. Completion language:
   - “Batch started.”
   - “Recipe saved. You can reuse this starting point next time.”

### 10. Data persistence and create-batch behavior
1. Persist the final chosen recipe values into the existing `kombucha_batches` fields:
   - final tea amount
   - final sugar grams
   - final starter ml
2. Keep the create path compatible with the existing insert plus `saveBatchF1Setup(...)`.
3. Keep recommendation snapshot saving, but evolve the snapshot to reflect generator-first behavior if needed:
   - generated recommendation
   - override values
   - final chosen values
4. Preserve selected recipe id, selected vessel id, fit snapshot, and lineage snapshot behavior.
5. Keep “save as recipe” late in the flow so it does not compete with the main guided setup.

## Files and systems involved
1. `src/pages/NewBatch.tsx`
2. new `src/components/f1/new-batch-wizard/*`
3. `src/components/lineage/StarterSourceSelector.tsx`
4. `src/components/f1/F1RecipePicker.tsx`
5. `src/components/f1/F1VesselPicker.tsx`
6. `src/components/f1/F1SetupSummary.tsx`
7. `src/lib/f1-recipe-generator.ts`
8. `src/lib/f1-generator-types.ts`
9. `src/lib/f1-vessel-fit.ts`
10. `src/lib/f1-setups.ts`
11. `kombucha_batches`
12. `batch_f1_setups`

## Risks and compatibility checks
1. Accidentally preserving the current page-shaped interaction model.
2. Recreating recipe logic in UI components instead of calling the generator.
3. Losing the distinction between generated and chosen recipe values.
4. Letting starter lineage remain an afterthought instead of a recipe refinement.
5. Making popups noisy or toast-like.
6. Breaking the existing create path or setup snapshot save.
7. Reintroducing early metadata entry and form-first behavior.
8. Breaking saved-batch, saved-recipe, saved-vessel, or lineage compatibility.
9. Keeping the old recommendation-card system too prominent and undermining the generated-first model.

## Milestones
### Milestone 1: Lock wizard architecture and state contract
Goal:
Finalize the shell, reducer contract, step list, and no-forward-navigation behavior.

Acceptance criteria:
1. Dedicated wizard shell and hook are defined.
2. Reducer contract separates answers, generated result, overrides, metadata, and popup state.
3. The no-forward-navigation rule is encoded in the design.

Files expected:
1. `plans/2026-03-25-f1-setup-overhaul-phase-2-wizard.md`

Validation:
1. Planning milestone only.

Status: completed

### Milestone 2: Build shell and linear steps
Goal:
Replace the current staged page with the dedicated wizard shell and one-question steps.

Acceptance criteria:
1. Progress is non-clickable.
2. Only continue, back, and exit remain.
3. The first six steps collect only generator inputs.

Files expected:
1. `src/pages/NewBatch.tsx`
2. `src/components/f1/new-batch-wizard/*`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`

Status: completed

### Milestone 3: Wire generator-first recipe step
Goal:
Make Step 7 the first place manual tea, sugar, and starter editing appears.

Acceptance criteria:
1. Generator output appears as the system recommendation.
2. Overrides are layered, not merged away.
3. Lineage refinement reruns the generator.

Files expected:
1. `src/components/f1/new-batch-wizard/useNewBatchWizard.ts`
2. `src/components/f1/new-batch-wizard/steps/RecipeStep.tsx`
3. possibly `src/lib/f1-setups.ts`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`

Status: completed

### Milestone 4: Add popup coaching and supporting context
Goal:
Introduce the popup guidance system and secondary explanation surfaces without making them primary.

Acceptance criteria:
1. Only one popup is visible at a time.
2. Popup triggers, priority, and dedupe work.
3. Secondary recommendation/context surfaces remain supportive rather than primary.

Files expected:
1. `src/components/f1/new-batch-wizard/NewBatchCoachPopup.tsx`
2. `src/components/lineage/StarterSourceSelector.tsx`
3. supporting wizard files

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`

Status: completed

### Milestone 5: Final details and persistence pass
Goal:
Complete Step 8 and confirm compatibility with batch creation and snapshot persistence.

Acceptance criteria:
1. Metadata is delayed to the final step.
2. Final chosen recipe values persist correctly.
3. Recommendation snapshot saving still works.

Files expected:
1. `src/pages/NewBatch.tsx`
2. `src/components/f1/new-batch-wizard/steps/FinalizeStep.tsx`
3. `src/lib/f1-setups.ts`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`.
2. Inspected `src/pages/NewBatch.tsx` and confirmed the current flow is still a staged page built around route-local form state and card-based interpretation.
3. Inspected `NewBatchProgress`, `NewBatchStepFooter`, `F1RecommendationSection`, `StarterSourceSelector`, `F1RecipePicker`, `F1VesselPicker`, `NewBatchBrewRead`, and `F1SetupSummary` to map the current interaction model and reuse candidates.
4. Inspected `src/lib/f1-recipe-generator.ts` and `src/lib/f1-generator-types.ts` and confirmed the Phase 1 generator now provides the contract Phase 2 should center on.
5. Inspected `src/lib/f1-setups.ts`, `src/lib/f1-vessel-fit.ts`, `src/lib/f1-vessel-types.ts`, and `src/lib/f1-setup-summary.ts` to confirm the current persistence and vessel-fit model can survive a new wizard shell.
6. Noted that the existing `plans/2026-03-24-f1-setup-flow-overhaul.md` improves the staged page but does not match the final generated-first wizard target.
7. Created this dedicated Phase 2 wizard plan.
8. Re-read `AGENTS.md`, `PLANS.md`, this plan, and the currently affected repo areas before implementation:
   - `src/pages/NewBatch.tsx`
   - `src/lib/f1-recipe-generator.ts`
   - `src/lib/f1-generator-types.ts`
   - `src/lib/f1-setups.ts`
   - `src/components/lineage/StarterSourceSelector.tsx`
   - `src/components/f1/F1RecipePicker.tsx`
   - `src/components/f1/F1VesselPicker.tsx`
   - `src/components/f1/F1SetupSummary.tsx`
   - `src/components/f1/new-batch/NewBatchProgress.tsx`
   - `src/components/f1/new-batch/NewBatchStepFooter.tsx`
9. Recorded baseline validation before Milestone 2:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the pre-existing Browserslist age notice and chunk-size warning
10. Replaced the old route-local staged page in `src/pages/NewBatch.tsx` with a thin page entry that mounts a new wizard shell in `src/components/f1/new-batch-wizard/NewBatchWizard.tsx`.
11. Added the new wizard interaction layer under `src/components/f1/new-batch-wizard/`, including the non-clickable progress, wizard header/footer, dedicated step components, shared step types, and the reducer-driven `useNewBatchWizard.ts` controller.
12. Milestone 2 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
13. Wired the Phase 1 generator into the wizard controller in `src/components/f1/new-batch-wizard/useNewBatchWizard.ts`, including background generation, similarity-aware refinement, lineage reruns, final chosen recipe derivation, and compatibility with the existing `buildF1Recommendations(...)` snapshot path as secondary context.
14. Added the Step 7 recipe screen in `src/components/f1/new-batch-wizard/steps/RecipeStep.tsx` so the app recommendation appears before any manual tea, sugar, or starter edits, and the user’s chosen recipe is shown separately once overrides exist.
15. Milestone 3 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
16. Added the dedicated wizard coaching popup in `src/components/f1/new-batch-wizard/NewBatchCoachPopup.tsx`, wired it into `NewBatchWizard.tsx`, and finished the trigger and dedupe behavior in `useNewBatchWizard.ts` so only one calm popup appears at a time across tea, sugar, vessel, temperature, lineage, and override-drift moments.
17. Updated `StarterSourceSelector.tsx` so the lineage step reads like a brewing decision instead of archival metadata, and kept `F1RecommendationSection` explicitly secondary by feeding it background-history loading rather than primary recipe-state loading.
18. Extended the `batch_f1_setups` snapshot builder in `src/lib/f1-setups.ts` so saved setups now carry the generator-first system recommendation and the manual override layer alongside the final chosen composition without breaking existing snapshot readers.
19. Tightened the final step copy in `src/components/f1/new-batch-wizard/steps/FinalizeStep.tsx` so the metadata step stays lightweight and clearly optional outside the batch name and brew date.
20. Milestone 4 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files and no new warnings after fixing the popup dependency list
   - `npm run test`: passed
21. Milestone 5 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the same pre-existing Browserslist age notice and chunk-size warning

## Decision log
1. Keep the route but replace the interaction layer.
2. Make the Phase 1 generator the primary recipe source of truth.
3. Delay manual tea, sugar, and starter editing until Step 7.
4. Use a reducer-based wizard hook.
5. Treat recommendation cards as secondary explanation only.
6. Make popup coaching a dedicated component pattern, not a toast variant.
7. Preserve the route entry in `src/pages/NewBatch.tsx`, but move almost all flow orchestration into the new wizard shell and hook so the page no longer behaves like a staged form container.
8. Keep the old card-based recommendation system alive only as secondary explanation and snapshot compatibility while the Phase 1 generator becomes the recipe authority in Step 7.

## Open questions
1. Whether the recommendation snapshot should remain card-oriented plus generator metadata, or shift toward a richer generator-first shape while staying additive.
2. Whether starter lineage in Step 7 should be always visible or progressively disclosed when brew-again context already exists.

## Done when
### 11. Phased implementation plan
1. Shell and reducer contract are in place.
2. The staged page body is gone.
3. First six steps ask only generator inputs.
4. Step 7 shows generated-first recipe plus overrides.
5. Step 8 stays light and persistence-compatible.
6. Popup coaching works on mobile and desktop.

### 12. Acceptance criteria
1. The flow no longer feels like a large form page.
2. There is no forward navigation to future steps.
3. Each step has one obvious purpose.
4. Generator output defines the recipe before manual overrides appear.
5. Metadata entry is delayed to the end.
6. Popups are contextual, deduplicated, and calm.
7. Mobile remains focused and uncluttered.
8. Existing persistence remains compatible.
9. Recommendation snapshot saving still works.
10. Copy sounds like a brewing guide rather than a dashboard.

## Final validation
When implementation begins, run after each milestone and again at the end:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Baseline note:
1. Before Milestone 2:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the pre-existing Browserslist age notice and chunk-size warning
