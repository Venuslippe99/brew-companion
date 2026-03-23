# New Batch Phase 3 UX Overhaul

## Summary
Rebuild `src/pages/NewBatch.tsx` from a long single-page setup form into a guided, mobile-first, multi-step F1 batch creation flow that centers the existing Phase 3 recommendation system as the core review moment before batch creation.

## Why
The current `NewBatch` implementation is functionally rich, but it still feels like editing a large internal setup object rather than being guided through a calm brewing workflow.

Today the page asks the user to manage:
1. recipe source
2. brew-again context
3. composition fields
4. starter lineage
5. vessel choice
6. advanced notes
7. recommendation review
8. recipe saving
9. final batch creation

all inside one long vertical form.

That creates several product problems:
1. the recommendation engine exists, but it is visually treated like one more section inside a form instead of the key confidence-building review step
2. vessel and library-management actions compete with the main goal of starting today’s batch
3. the copy still exposes system-facing language such as “explainable”, “baseline guidance”, “history-backed notes”, and “actual values”, which does not feel like a brewing companion
4. the mobile experience still reads like a responsive web form instead of an app flow with clear progress and one decision at a time
5. the CTA hierarchy is noisy, with multiple secondary actions competing with the primary path

This overhaul is needed so the user experience feels like:
1. choose how to begin
2. enter what you are brewing today
3. review helpful suggestions
4. create the batch with confidence

instead of:
1. configure a complex setup object
2. manage supporting libraries while brewing
3. parse recommendation-system output
4. hunt for the real next action

## Scope
In scope:
1. Restructure `src/pages/NewBatch.tsx` into a step-based guided flow.
2. Introduce explicit step state, step progression, and a clearer primary CTA hierarchy.
3. Promote the existing Phase 3 recommendation system into the dedicated review step.
4. Rework step grouping into:
   - start choice
   - today’s brew
   - vessel and starter context
   - review and suggestions
5. Rewrite visible user-facing copy across the New Batch flow.
6. Rewrite recommendation section copy and recommendation-card presentation copy where needed.
7. Reduce action noise from recipe-library, vessel-library, and duplicate save actions.
8. Improve the mobile-first layout so one step is visible at a time and primary progression is obvious.
9. Keep current recipe loading, vessel loading, starter source loading, recommendation loading, recommendation apply actions, batch creation, and F1 setup snapshot persistence compatible.
10. Keep current recommendation snapshot persistence and accepted recommendation ID persistence compatible.
11. Add view-specific components/helpers if needed to keep `NewBatch.tsx` maintainable.

Out of scope:
1. Changes to brewing-rule logic in `src/lib/f1-recommendations.ts` or its rule helpers unless implementation finds a true UI-blocking bug.
2. Schema changes by default.
3. Changes to `kombucha_batches` insert semantics.
4. Changes to `batch_f1_setups` persistence semantics beyond UI-driven compatibility work.
5. Changes to starter lineage rules in `src/lib/lineage.ts`.
6. Reworking unrelated routes such as `F1Recipes`, `F1Vessels`, `BatchDetail`, or broader app navigation.
7. Replacing the Phase 3 recommendation engine with a simpler or weaker system.
8. Broad visual redesign of the whole app outside the New Batch flow.
9. New migrations unless implementation proves a real blocker.

## Current state
1. **Route role**
   - `src/pages/NewBatch.tsx` is the route-level owner for F1 batch creation.
   - It handles direct `kombucha_batches` insertion and then calls `saveBatchF1Setup(...)` to persist the F1 setup snapshot.

2. **Current page structure in `src/pages/NewBatch.tsx`**
   - The page is a long scrollable flow inside one route surface.
   - It currently stacks:
     - route header
     - beginner helper panel
     - recipe source panel
     - optional Brew Again panel
     - `F1SetupSummary`
     - `F1RecommendationSection`
     - all batch form fields
     - starter source selector
     - vessel section with manual-entry fields
     - advanced options
     - save-as-recipe and create-batch actions
   - This means the user sees setup review and recommendations before they have clearly finished entering the batch.

3. **Current recommendation placement**
   - `src/components/f1/F1RecommendationSection.tsx` already renders the Phase 3 recommendation cards.
   - `src/lib/f1-recommendations.ts` already builds the recommendation view model from:
     - baseline rules
     - transition logic
     - lineage signals
     - similar saved setups
     - F1 outcomes
   - `NewBatch.tsx` already loads recommendation history via `loadF1RecommendationHistoryContext(...)` and already persists the final recommendation snapshot through `saveBatchF1Setup(...)`.
   - The recommendation engine is real and already part of the current batch creation path, but it is not yet treated as the review step.

4. **Current recommendation UI tone**
   - `src/components/f1/F1RecommendationSection.tsx` uses:
     - “F1 guidance”
     - “Explainable setup recommendations”
     - “Kombloom starts with baseline brewing guidance...”
     - “history-backed notes”
   - `src/components/f1/F1RecommendationCard.tsx` exposes chips such as:
     - raw `sourceType`
     - `confidence`
     - `evidenceCount`
     - button label `Applied`
   - These are useful internally but still read like system output rather than brewing guidance.

5. **Current setup summary tone**
   - `src/components/f1/F1SetupSummary.tsx` is already useful, but the visible copy still includes phrases like:
     - “Live setup summary”
     - “Review today’s F1 setup”
     - “actual values”
     - “Plain-language summary”
   - It also appears before the user has clearly entered and confirmed the setup, so it currently behaves more like a live status panel than a review step.

6. **Current recipe-start flow**
   - `src/components/f1/F1RecipePicker.tsx` already supports selecting a saved recipe in a bottom sheet.
   - `src/components/f1/F1RecipeEditor.tsx` already supports saving a recipe from current setup values.
   - `NewBatch.tsx` lets the user:
     - start from scratch
     - use saved recipe
     - save current setup as recipe
   - However, these actions appear early and repeatedly, so the page feels partly like a recipe-management screen.

7. **Current vessel flow**
   - `src/components/f1/F1VesselPicker.tsx` already supports choosing a saved vessel.
   - `src/pages/NewBatch.tsx` includes a large vessel block with:
     - current vessel summary
     - manual vessel entry
     - manual vessel save action
     - manage-vessels action
   - This works, but it dominates a large part of the page and feels library-management heavy during batch setup.

8. **Current starter lineage flow**
   - `src/components/lineage/StarterSourceSelector.tsx` already supports linking a previous batch as a starter source.
   - `src/lib/lineage.ts` already loads starter-source candidates from reusable stages.
   - The selector copy is useful but still somewhat system-facing:
     - “Starter lineage”
     - “This only records lineage”
   - It is also embedded inside the long main form rather than grouped as context for the setup.

9. **Current business-logic dependencies**
   - `src/lib/f1-recommendations.ts` assembles the recommendation cards and snapshot payload.
   - `src/lib/f1-recommendation-types.ts` defines the recommendation card and snapshot model.
   - `src/lib/f1-recipe-types.ts` defines the setup and recipe shape used by the page.
   - `src/lib/f1-vessel-types.ts` defines selected vessel and vessel draft shapes.
   - `src/lib/f1-setups.ts` persists both setup snapshot and recommendation snapshot into `batch_f1_setups`.
   - `src/lib/lineage.ts` provides starter lineage candidates and lineage relationships.
   - These should remain the domain source of truth, with the UX overhaul staying primarily in page/component orchestration and copy.

10. **Current persistence path that must stay intact**
    - `NewBatch.tsx` inserts the batch row into `kombucha_batches`.
    - It then calls `saveBatchF1Setup(...)`.
    - `saveBatchF1Setup(...)` currently persists:
      - setup snapshot
      - recommendation snapshot
      - recommendation engine version
      - accepted recommendation ids
    - No schema change is expected for this UX overhaul unless implementation proves otherwise.

11. **Current UX weaknesses this overhaul must solve**
    - too much visible surface at once
    - unclear progression
    - recommendation review happens too early and feels bolted on
    - too many competing secondary actions
    - copy still exposes internal/system language
    - mobile flow lacks an app-like step progression

## Intended outcome
1. **Step 1: Choose how to start**
   - The user first sees a focused start step that helps them choose:
     - start from scratch
     - use a saved recipe
     - continue from Brew Again context when present
   - The step explains each option in calm human language.
   - If a recipe is chosen, the page shows a short summary and reassures the user that today’s brew can still be adjusted.
   - If the page arrived from Brew Again, the page shows a concise human summary of what the new batch is based on, without dumping too much outcome data.

2. **Step 2: Today’s brew**
   - The user enters what they are actually brewing today.
   - Fields are grouped by brewing intent instead of appearing as one long form:
     - batch basics
     - tea and sugar
     - starter and environment
   - Helper cues such as liters, starter ratio, sugar per liter, or tea concentration can appear where they genuinely improve clarity.
   - Advanced details such as pH and notes are clearly subordinate.

3. **Step 3: Vessel and starter context**
   - The user chooses today’s vessel and optional starter-source linkage in one calmer context step.
   - Saved vessel selection is easy.
   - Custom vessel entry is available but progressive instead of dominating the page.
   - Manage-library actions remain available but are visually demoted.
   - Starter source selection is framed as context for this batch, not as a technical lineage-management task.

4. **Step 4: Review and suggestions**
   - The user reaches a clear review step with:
     - a concise batch summary
     - a more human recommendation section
     - higher-priority suggestions first
     - lower-priority context secondary
     - one clear create-batch action
   - The recommendation engine feels like Kombloom noticing helpful things about the batch, not like a structured system report.

5. **Copy tone**
   - All visible strings in the flow feel calm, practical, beginner-friendly, and intentional.
   - Internal phrasing such as:
     - explainable
     - source type
     - confidence
     - evidence count
     - draft
     - actual values
     - applied
   - is either translated into human language or hidden from the visible surface where it does not help the user.

6. **CTA hierarchy**
   - Each step has one clear primary action.
   - Secondary actions exist, but they no longer compete with the main path.
   - Saving a recipe remains possible without visually distracting from creating today’s batch.

7. **Mobile behavior**
   - One step is visible at a time on mobile.
   - Progress is clear.
   - The primary CTA remains obvious and easy to reach.
   - The flow feels like an app journey, not a long responsive admin form.

8. **Compatibility**
   - Recipe loading, vessel loading, starter-source loading, recommendation history loading, recommendation application, batch creation, setup snapshot persistence, recommendation snapshot persistence, and accepted recommendation ID persistence all remain compatible.
   - No schema change is expected for this task unless implementation proves a true blocker.

## Files and systems involved
1. **Primary route file**
   - `src/pages/NewBatch.tsx`

2. **Current F1 setup and recommendation components**
   - `src/components/f1/F1RecommendationSection.tsx`
   - `src/components/f1/F1RecommendationCard.tsx`
   - `src/components/f1/F1SetupSummary.tsx`
   - `src/components/f1/F1RecipePicker.tsx`
   - `src/components/f1/F1RecipeEditor.tsx`
   - `src/components/f1/F1VesselPicker.tsx`
   - `src/components/lineage/StarterSourceSelector.tsx`

3. **Likely new or refactored step/view components**
   - likely `src/components/f1/new-batch/` namespace or similar, for example:
     - `NewBatchStepHeader.tsx`
     - `NewBatchProgress.tsx`
     - `NewBatchStartStep.tsx`
     - `NewBatchBrewStep.tsx`
     - `NewBatchContextStep.tsx`
     - `NewBatchReviewStep.tsx`
     - `NewBatchStickyFooter.tsx`
   - Exact names can vary, but component extraction is recommended if it keeps `NewBatch.tsx` from becoming more complex.

4. **Business-logic helpers that must remain compatible**
   - `src/lib/f1-recommendations.ts`
   - `src/lib/f1-recommendation-types.ts`
   - `src/lib/f1-recipe-types.ts`
   - `src/lib/f1-vessel-types.ts`
   - `src/lib/f1-setups.ts`
   - `src/lib/lineage.ts`

5. **Supporting helpers likely to be read or lightly reused**
   - `src/lib/f1-setup-summary.ts`
   - `src/lib/f1-vessel-fit.ts`
   - `src/lib/f1-baseline-rules.ts`
   - `src/lib/f1-transition-rules.ts`
   - `src/lib/f1-similarity.ts`
   - `src/lib/f1-lineage-signals.ts`
   - `src/lib/f1-outcome-signals.ts`

6. **Persistence and tables**
   - `public.kombucha_batches`
   - `public.batch_f1_setups`
   - `public.batch_phase_outcomes`
   - `public.f1_recipes`
   - `public.fermentation_vessels`

7. **Generated types**
   - `src/integrations/supabase/types.ts`
   - No generated type change is expected unless implementation unexpectedly proves a schema gap.

8. **Schema and migrations**
   - `supabase/migrations/`
   - Default expectation: no migration should be needed for this UX and copy overhaul.

## Risks and compatibility checks
1. **Batch creation regression**
   - The new step flow must not break the current `kombucha_batches` insert path in `src/pages/NewBatch.tsx`.

2. **F1 setup snapshot regression**
   - The new UX must not break `saveBatchF1Setup(...)` writes to `batch_f1_setups`.

3. **Recommendation snapshot regression**
   - The new review flow must preserve recommendation snapshot persistence, engine version persistence, and accepted recommendation ID persistence.

4. **Recommendation logic drift**
   - The UX overhaul must not move recommendation logic into page-local JSX or weaken the current rule/history engine in `src/lib/f1-recommendations.ts`.

5. **Copy-only surface drift**
   - Visible copy should become more human, but implementation must not accidentally delete useful context that the recommendation system or save path relies on.

6. **Too much UI churn in `NewBatch.tsx`**
   - If the route file absorbs all step logic inline, it may become harder to maintain than the current version.
   - Focused extracted step components are likely safer.

7. **Secondary action overload**
   - Recipe-library, vessel-library, and save-as-recipe actions must be demoted without becoming impossible to find.

8. **Recommendation overexposure**
   - The recommendation system must feel central but not overwhelming.
   - Lower-priority context should be progressively disclosed or visually softened.

9. **Beginner confusion**
   - Step labels, helper text, and CTA wording must make the path obvious for non-expert brewers.
   - Beginner clarity is part of acceptance criteria, not optional polish.

10. **Mobile interaction quality**
    - The step flow must work on narrow screens without turning into another long scroll stack.

11. **Timeline/history compatibility**
    - This task should not affect `batch_stage_events` or `batch_logs`.
    - If implementation unexpectedly touches lifecycle history, that must be recorded explicitly.

12. **Backwards compatibility**
    - Existing saved recipes, vessels, starter lineage relationships, and saved F1 recommendation snapshots must remain readable and usable.

13. **Schema scope creep**
    - No schema change is expected.
    - If implementation discovers one, the plan must be updated before code changes proceed.

14. **Validation gaps**
    - Because the task is primarily UX and copy, it would be easy to skip verifying the save path.
    - Validation must still cover:
      - type safety
      - lint
      - tests
      - build
      - manual code-path review of create-batch and F1 snapshot persistence

Because this touches brewing setup and batch creation, implementation must explicitly check:
1. batch stage consistency remains unchanged
2. next-action logic in shared helpers remains unchanged
3. timeline/history expectations remain unchanged
4. saved batches, saved F1 setups, recipes, and vessels remain compatible
5. user-facing brewing guidance remains safe, calm, and not falsely certain

## Milestones

### Milestone 1: Inspect current flow and finalize execution plan
Goal:
Document the current New Batch route, supporting components, recommendation surfaces, and compatibility constraints in a self-contained implementation plan.

Acceptance criteria:
1. The plan is created at `plans/2026-03-23-new-batch-phase3-ux-overhaul.md`.
2. The current New Batch flow, supporting components, recommendation helpers, and persistence path are described repo-specifically.
3. The plan explicitly states that no schema change is expected unless implementation proves otherwise.
4. The plan explicitly calls out copy rewrite as required work.

Files expected:
1. `plans/2026-03-23-new-batch-phase3-ux-overhaul.md`

Validation:
1. No code validation required for this planning-only milestone.
2. Record known baseline validation context in the plan:
   - `npm run lint` currently has existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run build` currently has existing Browserslist age and chunk-size warnings

Status: completed

### Milestone 2: Build multi-step New Batch flow shell
Goal:
Restructure `src/pages/NewBatch.tsx` into a step-based flow with explicit progression, step visibility, and primary CTA hierarchy.

Acceptance criteria:
1. The route has clear step state for:
   - choose how to start
   - today’s brew
   - vessel and starter context
   - review and suggestions
2. The page shows one primary step at a time on mobile.
3. The primary CTA for each step is visually obvious and tied to progression.
4. Current form state and current data loading behavior still feed the same batch draft model.
5. Batch creation path remains compatible.

Files expected:
1. `src/pages/NewBatch.tsx`
2. likely new step-shell or progress components under `src/components/f1/` or `src/components/f1/new-batch/`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. Confirm no regression in current batch creation path by reviewing the final create handler and `saveBatchF1Setup(...)` call contract

Status: completed

### Milestone 3: Rework start, vessel, and context step structure
Goal:
Make the beginning of the flow calmer and simplify vessel/starter-context interactions so the user can progress without feeling pulled into library management.

Acceptance criteria:
1. Step 1 cleanly handles scratch, saved-recipe, and Brew Again starts.
2. Recipe summaries and Brew Again context are concise and human-readable.
3. Step 3 groups vessel selection and starter-source context coherently.
4. Custom vessel entry becomes more progressive and less visually dominant.
5. Library-management actions remain available but are demoted relative to the primary path.

Files expected:
1. `src/pages/NewBatch.tsx`
2. `src/components/f1/F1RecipePicker.tsx`
3. `src/components/f1/F1VesselPicker.tsx`
4. `src/components/lineage/StarterSourceSelector.tsx`
5. likely new extracted step components if needed

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. Confirm recipe loading, vessel loading, and starter-source loading still behave compatibly

Status: completed

### Milestone 4: Promote recommendations into the review step
Goal:
Turn the recommendation system into the core review stage rather than a mid-form panel.

Acceptance criteria:
1. Review becomes a dedicated final step before batch creation.
2. The existing recommendation view model from `src/lib/f1-recommendations.ts` stays in place and is reused.
3. Recommendation apply actions still work.
4. The review step includes a clear batch summary plus suggestions.
5. Lower-priority recommendation context is visually calmer than the highest-priority suggestions.
6. Final create action remains compatible with recommendation snapshot and accepted recommendation ID persistence.

Files expected:
1. `src/pages/NewBatch.tsx`
2. `src/components/f1/F1RecommendationSection.tsx`
3. `src/components/f1/F1RecommendationCard.tsx`
4. `src/components/f1/F1SetupSummary.tsx`
5. optional new review-step component(s)

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. Confirm:
   - recommendation apply flow still updates the draft
   - recommendation snapshot is still passed into `saveBatchF1Setup(...)`
   - accepted recommendation ids are still persisted

Status: completed

### Milestone 5: Rewrite user-facing copy across the New Batch flow
Goal:
Audit and rewrite visible strings so the entire flow sounds like a brewing companion instead of a system interface.

Acceptance criteria:
1. Step titles are rewritten in calm, practical, user-facing language.
2. Section headings and helper copy are rewritten.
3. Recommendation section intro copy is rewritten.
4. Recommendation card titles, summaries, explanations, and button labels are reviewed and updated where needed.
5. CTA labels are rewritten to sound like brewing actions rather than generic system actions.
6. Loading states and empty states are rewritten where touched.
7. No obviously robotic or system-facing terms remain on the visible path unless they genuinely help the user.

Files expected:
1. `src/pages/NewBatch.tsx`
2. `src/components/f1/F1RecommendationSection.tsx`
3. `src/components/f1/F1RecommendationCard.tsx`
4. `src/components/f1/F1SetupSummary.tsx`
5. `src/components/f1/F1RecipePicker.tsx`
6. `src/components/f1/F1RecipeEditor.tsx`
7. `src/components/f1/F1VesselPicker.tsx`
8. `src/components/lineage/StarterSourceSelector.tsx`

Validation:
1. Inspect changed strings directly in touched files.
2. Confirm no obvious old robotic phrasing remains on visible New Batch surfaces.
3. `npx tsc -b`
4. `npm run lint`
5. `npm run test`
6. `npm run build`

Status: completed

### Milestone 6: Polish step interactions, compatibility pass, and final validation
Goal:
Tighten interaction details, verify data integrity, and complete the final plan update and validation pass.

Acceptance criteria:
1. Mobile and desktop flows both feel coherent.
2. No obvious CTA dead ends remain.
3. Batch creation path remains compatible.
4. F1 setup snapshot persistence remains compatible.
5. Recommendation snapshot persistence remains compatible.
6. Accepted recommendation ID persistence remains compatible.
7. The plan file is updated to final state with progress, decisions, and validation notes.

Files expected:
1. `src/pages/NewBatch.tsx`
2. touched supporting components
3. `plans/2026-03-23-new-batch-phase3-ux-overhaul.md`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. Distinguish pre-existing warnings/failures from any new ones

Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md` to confirm the repo’s guidance, validation, and execution-plan requirements.
2. Inspected `src/pages/NewBatch.tsx` and confirmed the current route already owns:
   - recipe loading
   - vessel loading
   - starter-source loading
   - recommendation-history loading
   - recommendation apply actions
   - `kombucha_batches` insert
   - `saveBatchF1Setup(...)` persistence
3. Inspected `src/components/f1/F1RecommendationSection.tsx` and confirmed the current recommendation surface is functionally useful but still too system-facing in title, intro copy, and section framing.
4. Inspected `src/components/f1/F1RecommendationCard.tsx` and confirmed the current visible metadata chips and action label still expose internal recommendation-system concepts too directly.
5. Inspected `src/components/f1/F1SetupSummary.tsx` and confirmed the current summary component is helpful but currently positioned and worded more like a live system panel than a review step.
6. Inspected `src/components/f1/F1RecipePicker.tsx`, `src/components/f1/F1RecipeEditor.tsx`, and `src/components/f1/F1VesselPicker.tsx` to confirm current recipe/vessel workflows are already usable and should be retained but demoted relative to the main path.
7. Inspected `src/components/lineage/StarterSourceSelector.tsx` and confirmed current starter-source linking is compatible but needs calmer user-facing framing.
8. Inspected `src/lib/f1-recommendations.ts`, `src/lib/f1-recommendation-types.ts`, `src/lib/f1-recipe-types.ts`, `src/lib/f1-vessel-types.ts`, `src/lib/f1-setups.ts`, and `src/lib/lineage.ts` to confirm the recommendation engine and persistence model are already real and must be preserved during the UX overhaul.
9. Confirmed the current batch creation path and F1 setup persistence path are already compatible with Phase 3 and should stay intact.
10. Confirmed this task is a multi-file UX and copy overhaul with no schema change expected by default.
11. Implemented the Milestone 2 shell in `src/pages/NewBatch.tsx` with explicit step state for start, brew, context, and review.
12. Added `src/components/f1/new-batch/NewBatchProgress.tsx` and `src/components/f1/new-batch/NewBatchStepFooter.tsx` so the page now has a progress surface and a persistent primary CTA without moving batch-creation logic out of the route.
13. Kept the existing `kombucha_batches` insert and `saveBatchF1Setup(...)` contract intact while tightening start-mode handling so Brew Again only persists when that start path is actually selected.
14. Milestone 2 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the same pre-existing Browserslist age notice and chunk-size warning
15. Reworked the start step, recipe selection framing, vessel-context step, and starter-source placement so the user moves through setup origin, brew details, and context in clearer groups instead of one long stack.
16. Demoted library-management actions in the recipe and vessel pickers and made custom vessel details progressively disclosed inside the context step instead of always expanded.
17. Moved the existing recommendation surface into the dedicated review step alongside the batch summary and preserved recommendation apply behavior plus the final `saveBatchF1Setup(...)` snapshot contract.
18. Rewrote visible copy across the New Batch route and touched F1 surfaces so labels, helper text, CTA wording, and recommendation framing sound more like brewing guidance and less like exposed system output.
19. Updated recommendation presentation metadata to user-facing phrasing such as clearer source cues, signal strength labels, and more natural apply-state wording.
20. Milestone 3 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the same pre-existing Browserslist age notice and chunk-size warning
21. Milestone 4 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the same pre-existing Browserslist age notice and chunk-size warning
22. Milestone 5 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the same pre-existing Browserslist age notice and chunk-size warning
23. Milestone 6 polish tightened smaller interaction details such as review-step helper text and hiding manual-vessel detail panels after choosing a saved vessel.
24. Final validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the same pre-existing Browserslist age notice and chunk-size warning

## Decision log
1. The UX overhaul should preserve the current `kombucha_batches` insert plus `saveBatchF1Setup(...)` follow-up write path instead of introducing a new create-batch flow.
2. The current recommendation engine should remain in `src/lib` and be promoted in presentation, not replaced or weakened.
3. The New Batch experience should become a step-based route-level flow rather than a reordered long page.
4. Recommendations should become the dedicated review step, not a mid-form section.
5. Recipe-library and vessel-library management should remain available, but they should be demoted relative to the main “create today’s batch” path.
6. Saving the current setup as a recipe should remain available, but it should not compete visually with the main create-batch CTA across multiple places.
7. No schema change is expected unless implementation proves a real blocker.
8. Copy rewrite is part of the feature scope and part of done, not optional polish.
9. Beginner clarity should be treated as a concrete acceptance criterion, not a vague aspiration.
10. The existing recommendation card data model can remain, but visible UI copy should translate internal metadata into user language wherever possible.
11. Mobile should be treated as the primary flow context, with one visible step at a time and clear primary progression.
12. If `NewBatch.tsx` becomes too dense during implementation, focused step components should be introduced rather than keeping a larger monolith.
13. Brew Again should remain an explicit start mode instead of silently persisting whenever navigation state exists.
14. No schema change has been needed so far; the current recommendation and F1 setup persistence path remains sufficient for this overhaul.
15. Step-specific UI structure and mobile CTA behavior are best handled in small New Batch view components, while keeping the route responsible for orchestration and persistence.
16. Recommendation metadata can stay in the existing card model, but the visible UI should translate that metadata into user-facing language instead of exposing raw source/confidence jargon.
17. The copy rewrite should extend into touched recommendation-rule strings where the saved text reads awkwardly or overly technical on-card.

## Open questions
1. No blocking product questions remain for this implementation pass.

## Done when
1. `src/pages/NewBatch.tsx` behaves as a guided multi-step setup flow instead of a long single-page form.
2. The flow clearly separates:
   - how to start
   - what is being brewed today
   - vessel and starter context
   - review and suggestions
3. The Phase 3 recommendation system is preserved and promoted into the main review step.
4. Recommendation apply behavior still works.
5. Batch creation still inserts into `kombucha_batches` and still persists the F1 setup snapshot via `saveBatchF1Setup(...)`.
6. Recommendation snapshot persistence and accepted recommendation ID persistence remain compatible.
7. No schema change is introduced unless implementation proves a blocker and the plan is updated first.
8. Visible copy across the flow is rewritten to be calm, practical, human, and beginner-first.
9. Obvious system-facing language is removed or translated on touched New Batch surfaces.
10. The mobile flow clearly communicates progress and one primary next action at a time.

## Final validation
Run after each implementation milestone and again at the end:

1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Known baseline validation context to record during implementation:
1. `npm run lint` currently has existing `react-refresh/only-export-components` warnings in shared UI/context files.
2. `npm run build` currently has existing Browserslist age and large chunk warnings.

If implementation discovers any additional failure, distinguish clearly between:
1. pre-existing warnings/failures
2. new issues introduced by the New Batch UX overhaul
