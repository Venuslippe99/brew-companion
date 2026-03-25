# F1 Setup Flow Overhaul

## Summary
A product-level UX and copy overhaul for the F1 "Start a new batch" experience centered on `src/pages/NewBatch.tsx`, reusing the existing recommendation engine, recipe defaults, vessel fit logic, lineage support, and F1 setup persistence while making the flow feel like a brewing assistant instead of a structured data-entry form.

## Why
The current F1 setup flow has strong domain foundations, but the user experience still feels like the user is filling in a batch object and only later getting help interpreting it.

This work is needed because:
1. The route already knows useful things about ratios, timing, vessel fit, and lineage while the user is editing, but most of that help is delayed until review.
2. The current step flow is clearer than the older long page, but Step 2 still reads like a grouped form rather than a guided brewing conversation.
3. Beginner mode is currently too thin. It adds one reminder panel, but it does not materially simplify the interaction model or copy.
4. Recommendation cards still expose internal framing such as "review notes", confidence, source provenance, and other system-flavored language instead of brewer-friendly guidance.
5. The current copy is often accurate but still too generic, explanatory, or product-internal for a calm brewing companion.
6. The strongest logic in the flow, especially starter ratio, sugar per liter, tea strength, and vessel fit, is underexposed relative to the basic inputs.

## Scope
In scope:
1. Overhaul the F1 setup UX inside `src/pages/NewBatch.tsx`.
2. Rework the end-to-end flow structure for:
   - start mode
   - today's brew
   - vessel and lineage context
   - review and create
3. Promote derived ratios and setup interpretation much earlier in the flow.
4. Reposition the existing recommendation engine output across Steps 2 to 4 without replacing the engine.
5. Rewrite user-facing copy across the F1 setup flow, including:
   - page title and intro
   - step titles and descriptions
   - section titles and helper text
   - field labels where helpful
   - inline hints
   - validation and helper copy
   - recommendation titles, summaries, explanations, badges, and CTA labels
   - summary language
   - vessel and starter-source language
   - recipe reuse language
   - toasts and success states touched by this flow
6. Add stronger step-state, completion, warning, and blocking behavior for the flow.
7. Create a true beginner-oriented variant that simplifies the experience without changing the underlying save model.
8. Keep recipe reuse, brew-again, vessel library, lineage linking, recommendation snapshot persistence, and F1 setup snapshot persistence compatible.

Out of scope:
1. Replacing the existing recommendation engine or introducing an unrelated AI assistant layer.
2. Full schema redesign or destructive data changes.
3. Changing the `kombucha_batches` insert semantics unless a true blocker is discovered.
4. Changing `batch_f1_setups` persistence semantics except where presentation-driven compatibility work requires small safe adjustments.
5. Broad redesign of unrelated routes such as `F1Recipes`, `F1Vessels`, or `BatchDetail`.
6. Refactoring brewing logic for its own sake when the real issue is placement, hierarchy, or wording.
7. Removing the distinction between today's actual batch setup and reusable recipe defaults.

## Current state
### Flow structure today
1. `src/pages/NewBatch.tsx` is already a four-step route:
   - `start`
   - `brew`
   - `context`
   - `review`
2. This is an improvement over the older long page, but the internal feel is still "complete the form, then review the app's thoughts" rather than "make decisions with guidance as you go."
3. The stepper in `src/components/f1/new-batch/NewBatchProgress.tsx` allows direct step clicks without checking step readiness, so users can jump ahead without understanding whether they are skipping required setup.
4. The sticky footer in `src/components/f1/new-batch/NewBatchStepFooter.tsx` gives a single helper line, but that line is often generic rather than telling the user exactly what matters next.

### What is already strong
1. The start-mode foundation is strong:
   - scratch
   - saved recipe
   - brew again
2. The route already carries live draft state cleanly through the flow and reuses the same model for saving.
3. The recommendation engine is real and worth preserving:
   - `src/lib/f1-recommendations.ts`
   - `src/lib/f1-baseline-rules.ts`
   - `src/lib/f1-transition-rules.ts`
   - `src/lib/f1-lineage-signals.ts`
   - `src/lib/f1-outcome-signals.ts`
4. Vessel fit logic already exists and is useful:
   - `src/lib/f1-vessel-fit.ts`
   - `src/lib/f1-vessel-types.ts`
5. Setup summary logic already exists and translates raw inputs into brewer-facing summary text:
   - `src/lib/f1-setup-summary.ts`
6. Starter lineage support is already present and persisted:
   - `src/components/lineage/StarterSourceSelector.tsx`
   - `src/lib/lineage.ts`
7. Recipe save, recipe reuse, vessel reuse, and batch creation all already work with the current persistence path.

### What currently feels cluttered or form-first
1. Step 2 is visually a grouped form with helpful numbers appended as helper text rather than a guided interpretation space.
2. Ratios are present, but they are visually secondary:
   - volume is primary
   - tea amount is primary
   - sugar amount is primary
   - starter amount is primary
   - the truly useful normalized reads are small afterthoughts
3. "Batch basics", "Tea and sugar", and "Starter and environment" are structurally clean, but still read like admin group labels rather than brewing decisions.
4. The context step still feels like a library-management screen once custom vessel details expand.
5. Review currently carries too much responsibility: summary, recommendation interpretation, recipe save action, and the final confidence-building moment all pile up there.

### Where decisions are hidden behind form structure
1. The user can set total volume, tea amount, sugar, and starter without seeing a prominent "is this a sensible proportion?" read until late.
2. Target taste affects timing expectations through `src/lib/batch-timing.ts`, but that interpretation is not surfaced when the user chooses the target.
3. Vessel fit is already derivable during editing if a vessel is known, but the strongest vessel interpretation is still deferred to summary and recommendations.
4. Starter source is currently treated as an optional context link, but its real value is that it changes how the app interprets continuity and transitions.
5. Brew-again context pre-fills data well, but the user is not guided through what stayed the same versus what changed today.

### Where guidance arrives too late
1. Recommendation cards only render in Step 4 through `F1RecommendationSection`.
2. `F1SetupSummary` only appears in Step 4, so the plain-language read arrives after the user has already made all key decisions.
3. Vessel fit notes are mostly review-stage content even though overfill or tight-fit feedback would be more useful during volume and vessel selection.
4. Timing expectation is generated in the recommendation engine, but the user does not see the likely tasting window while choosing starter ratio, room temperature, and taste target.
5. Transition guidance is calculated once lineage context exists, but it does not help shape the current tea and sugar choices in Step 2.

### Where copy is weak, robotic, or still too system-like
1. Page intro:
   - "Set up first fermentation one step at a time."
   - Clear, but flat and generic.
2. Step 2 helper:
   - "Enter the actual setup for this batch."
   - Correct, but form-like and not interpretive.
3. Section copy:
   - "These details help the batch record stay useful later."
   - System-facing and archival in tone rather than brewer-facing.
4. Recommendation section framing:
   - "Review notes"
   - "Suggestions for this batch"
   - Better than before, but still reads like an inspection report.
5. Recommendation card metadata:
   - "Based on a standard kombucha setup"
   - "Strong signal"
   - "2 similar batches"
   - These read like source provenance and confidence reporting, not brewing guidance.
6. Starter source copy:
   - "This just keeps the batch history connected."
   - Technically true, but it undersells why the user should care in the moment.
7. Footer helper text:
   - "You can keep editing these values later in the flow."
   - Reassuring, but not actionable.
8. Save and success copy:
   - "Recipe saved and linked to this batch setup."
   - Accurate, but transactional and internal.

### Where product logic is strong but underexposed
1. `buildF1BaselineMetrics(...)` already computes:
   - starter ratio percent
   - recommended starter amount
   - sugar per liter
   - tea grams per liter
   - tea family
   - sugar family
2. `buildF1VesselFitResult(...)` already computes:
   - fill ratio
   - fit state
   - recommended max fill
   - plain-language fit summary
   - caution notes
3. `getBatchStageTiming(...)` already computes tasting-window guidance from:
   - brew date
   - temperature
   - target preference
   - starter ratio
4. `buildF1TransitionCards(...)` already knows when tea or sweetener changes are continuity changes versus stronger transitions.
5. `findSimilarF1Setups(...)` and outcome signals already let the app say "this resembles things you have brewed before" without inventing new rules.
6. `buildF1SetupSummary(...)` already creates a concise high-level read, but that read is being treated as a final review summary rather than a running brewing interpretation.

## Intended outcome
### UX structure
The target flow should still reuse the existing four-step shell, but the step purpose should shift from data-entry stages to brewing decisions:

1. Step 1: Choose how to begin
   - Keep scratch, saved recipe, and brew again.
   - Reframe each option around confidence and editing freedom.
   - Show concise summaries when recipe or brew-again is selected.
   - Make it obvious that today's setup remains editable.
   - If beginner mode is on, recommend the calmest path instead of merely listing options.

2. Step 2: Build today's brew
   - This becomes the core guided decision step.
   - Reorganize around the brewing questions the user is actually answering:
     - how much are you brewing?
     - how strong is the tea base?
     - how sweet is the setup?
     - how much starter are you using?
     - what result are you aiming for?
   - Keep absolute inputs as the source of truth for persistence.
   - Elevate ratios and normalized reads as first-class guidance beside the inputs.
   - Show inline interpretation while the user edits instead of holding it for review.

3. Step 3: Confirm vessel and culture context
   - Group vessel choice and starter source because both shape how the batch is interpreted.
   - Show vessel fit immediately in this step, not only later in summary and recommendations.
   - Treat starter source as meaningful context for this brew, not as a database link.
   - Keep custom vessel editing available, but progressive and subordinate.

4. Step 4: Final check and create
   - Compress this into a confidence step:
     - concise batch summary
     - unresolved key guidance
     - recipe reuse action
     - final create CTA
   - Do not repeat every detail the user already saw inline.
   - Use this step to confirm, not to reveal the first meaningful interpretation.

### Ratio strategy
Ratios should become central to the experience, but not replace the current persisted source model.

1. Keep editing the current fields:
   - `totalVolumeMl`
   - `teaAmountValue`
   - `sugarG`
   - `starterLiquidMl`
   - `targetPreference`
2. Promote companion reads that update immediately:
   - liters
   - tea strength
   - sugar per liter
   - starter ratio
   - tasting window read
3. In Step 2, present a compact "brew read" panel that tells the user what the proportions mean right now.
4. Add light quick actions where the logic already supports them:
   - use about X ml starter
   - use about X g sugar
   - use bridge tea type
5. Do not introduce a separate ratio-only editing model unless the current route becomes too hard to reason about. The existing save path depends on the current absolute-value fields and should remain the source of truth.

### Inline recommendation placement
1. Step 2 should show only the recommendations directly relevant to current editing:
   - starter amount
   - sugar amount
   - tea amount
   - tea base choice
   - timing expectation tied to target preference, temperature, and starter ratio
2. Step 3 should show context-driven recommendations:
   - vessel fit
   - vessel material caution
   - lineage continuity
   - tea and sugar transition warnings that require starter-source or brew-again context
3. Step 4 should show:
   - unresolved cautions
   - condensed "worth checking" guidance
   - similar-batch and next-time notes
   - any remaining context the user might want before creating
4. Recommendation cards should be filtered or grouped by step so the user is not hit with the entire engine output at once.

### Beginner mode design
Beginner mode should become a real variant rather than a single reminder banner.

1. Simplify the layout:
   - show fewer fields at once
   - group secondary inputs under "More detail" or "Advanced details"
2. Show the most important decisions first:
   - volume
   - tea base
   - tea amount
   - sugar amount
   - starter amount
   - target taste
3. Treat these as secondary for beginners unless needed:
   - tea source form
   - sugar type
   - SCOBY present
   - pH
   - freeform notes
4. Rewrite copy to explain relevance without teaching too much at once.
5. Limit inline guidance to the highest-value items in beginner mode:
   - one main brew read
   - one or two top recommendations
   - one clear next action
6. Let experienced users see denser context sooner, but keep the same underlying save behavior.

### Copy strategy
The copy overhaul is a core deliverable, not surface polish.

Tone principles:
1. Calm, practical, and direct.
2. User-oriented, not system-oriented.
3. Confident but never absolute about fermentation timing.
4. Specific enough to help, short enough to scan.
5. Supportive without sounding cute, clinical, or over-branded.

Patterns to remove:
1. Internal framing such as:
   - review notes
   - signal
   - source type
   - confidence
   - actual values
   - continuity lane
   - recommendation engine
2. Passive archive language such as:
   - keeps the batch record useful later
   - keeps the history connected
3. Explanations that read like product documentation instead of brew guidance.

Preferred copy moves:
1. Replace system framing with brewing interpretation:
   - "Review notes" -> "A few things worth checking"
   - "Strong signal" -> remove visible confidence badge
   - "Based on similar past batches" -> "Seen in similar batches"
2. Replace generic helpers with decision framing:
   - "Enter the actual setup for this batch." -> "Use the setup you are actually brewing today."
   - "These details help the batch record stay useful later." -> "These details change how this batch is likely to behave."
3. Replace transactional success copy with user-facing outcomes:
   - "Recipe saved and linked to this batch setup." -> "Recipe saved. You can reuse this starting point next time."
   - "Batch created." -> "Batch started."

Section-by-section rewrite direction:
1. Page header
   - Current direction is generic.
   - New direction should promise guided setup and confidence.
   - Example direction: "Set up today's first fermentation with guidance as you go."
2. Start step
   - Make each starting mode sound like a path, not an object source.
   - Emphasize editability and what each path is good for.
3. Brew step
   - Rename group headers to brewer questions or plain decisions.
   - Pair each important field with the interpretation it drives.
4. Context step
   - Frame vessel as "what this batch is going into".
   - Frame starter source as "where this culture is coming from today".
5. Review step
   - Make it a calm final check, not a report.
6. Recommendation cards
   - Titles should sound like concise brewer reads.
   - Summaries should say what looks okay, what is worth checking, or what will likely shift timing.
   - Explanations should say why it matters in plain language.
7. Footer helper copy
   - Must tell the user what is missing, what looks okay, or what the next step is for.
   - Avoid filler reassurance.

Button and CTA guidance:
1. Prefer action labels tied to brewing progress:
   - "Choose recipe" can stay where it is literal.
   - "Continue" should become step-specific when possible.
   - "Create batch" should likely become "Start batch" or "Start this batch" if that matches the rest of the product tone.
2. Secondary actions should sound optional and supportive:
   - "Save as recipe" -> "Save this setup as a recipe"
   - "View vessel library" -> "Open vessel library"
3. Recommendation apply buttons should sound like practical fixes:
   - "Use this change" -> "Use this amount" / "Switch to this tea" / "Try this adjustment"

Toast and validation guidance:
1. Keep them short and human.
2. State the problem and next action when blocked:
   - "Please enter a batch name." -> "Add a batch name to keep going."
   - "Please select a brew date." -> "Choose today's brew date first."
3. Keep non-blocking saves encouraging:
   - "Could not save vessel." -> "Couldn't save that vessel right now."
4. Partial-success messages should stay honest but calmer:
   - "Batch created, but the detailed F1 setup snapshot could not be saved..." should stay explicit, but the UI surface around it should read as a save-followup issue, not a failure of the brew itself.

Recommendation card rewrite rules:
1. Do not show confidence labels or raw evidence counts as standalone chips.
2. If provenance matters, show it in human phrasing:
   - "Seen in similar batches"
   - "From your chosen starter path"
   - "General F1 guidance"
3. Titles should be short and decision-oriented.
4. Summaries should say whether something looks steady, light, strong, tight, or worth checking.
5. Explanations should avoid sounding like model output or research citation.
6. Apply labels should say exactly what will change.

Rules for avoiding robotic or dashboard-like phrasing:
1. Avoid nouns like "signal", "context", "review notes", "system", and "engine" on visible UI.
2. Avoid "based on" as the default lead-in when it adds no user value.
3. Avoid talking about data storage or records unless the user is explicitly saving a recipe.
4. Prefer "batch", "brew", "starter", "vessel", "taste", "check", "fit", and "worth checking" over product-analytics phrasing.
5. Prefer "looks", "should", "may", and "worth checking" over absolute certainty.

### Information hierarchy
1. Page header
   - Primary: route title and calm promise
   - Secondary: one sentence explaining the flow helps interpret the brew while the user edits
   - Beginner support: contextual tip, not a generic banner
2. Progress stepper
   - Show short action labels
   - Show readiness state or unresolved items, not just step number
   - Do not imply all steps are equally freeform if they are not
3. Core brew inputs
   - Inputs first, but paired with live derived reads
   - Batch name/date should not visually compete with proportion guidance
4. Interpretation / brew health feedback
   - Surface next to the inputs it explains
   - Use compact cards or readouts instead of a giant review block
5. Vessel and lineage context
   - After core proportions, before final create
   - Fit and continuity should be more prominent than library-management actions
6. Review state
   - Condensed summary plus unresolved cautions
   - No repeated full-form restatement
7. Recipe reuse actions
   - Stay secondary to starting today's batch
   - Present as optional reuse, not as part of required setup

### Recommendation placement and reframing
1. Recommendations are not a new feature. The change is distribution and reframing.
2. Inline during Step 2:
   - starter ratio low/high
   - sugar per liter low/high/standard
   - tea amount light/strong/standard
   - tea-base fit for beginner-friendly brewing
   - timing expectation after target taste and room temp are known
3. Step 3:
   - overfilled/tight vessel
   - vessel material caution
   - lineage anchor note
   - tea or sweetener transition caution
4. Final review:
   - unresolved cautions from prior steps
   - similar-batch comparison
   - next-time lessons
   - condensed timing reminder
5. To avoid overload:
   - show at most one inline card per brew dimension in Step 2
   - collapse low-priority affirmations behind a lighter "Looks steady" section
   - reserve history-rich cards for later in the flow
6. Reframe cards as brewing guidance:
   - top section label: "A few things worth checking"
   - secondary label: "Also useful context"
   - no provenance-heavy badges unless hidden inside low-emphasis subtext

### Step gating and validation
The overhaul should replace the current loose step-clicking plus generic footer messaging with explicit step-state logic.

1. Step click behavior
   - Users should always be able to go backward.
   - Users should only jump ahead to steps already completed or conditionally ready.
   - Review should stay locked until brew essentials are complete.
2. Step states
   - `blocked`: missing required fields or impossible values
   - `warning`: unusual but still allowed
   - `ready`: enough info to continue
   - `complete`: current step has everything needed and any warnings are acknowledged
3. Brew-step blocked cases
   - missing batch name
   - missing brew date
   - non-positive volume
   - non-positive tea amount
   - non-positive sugar amount
   - non-positive starter amount
4. Brew-step warning cases
   - starter ratio far from baseline
   - sugar per liter outside the central band
   - tea amount very light or strong
   - outside-core tea choice
5. Context-step warning cases
   - tight vessel fit
   - caution-material vessel
   - lineage selected but older setup unreadable
   - meaningful tea and sugar transition from chosen source
6. Strong create blocks
   - impossible or missing required brew data
   - known vessel overfill when capacity or max-fill data clearly shows the plan does not fit
7. Strong but non-blocking cautions
   - not recommended vessel material
   - high-caution combined lineage transition
   - highly unusual sugar or starter amounts
8. Footer helper text must become specific:
   - "Add a batch name and brew date to continue."
   - "This sugar amount is workable, but it is lower than the usual range."
   - "Your vessel looks too full for this plan. Adjust the volume or switch vessels."
9. Unresolved issues should be presented calmly:
   - "Worth checking before you start"
   - "This can still work, but double-check it first"
   - avoid alarming red-alert language unless the issue is truly blocking

### Save-as-recipe placement
1. The main "save as recipe" CTA should remain near the review/create step so it does not compete with building today's batch.
2. Earlier steps can mention recipe reuse lightly:
   - scratch path: "If this turns into a setup you repeat, you can save it later."
3. Do not move recipe saving into Step 2 in a way that makes the user feel they are naming and managing a recipe before finishing today's brew.

## Files and systems involved
1. Route files
   - `src/pages/NewBatch.tsx`

2. Shared F1 components already on the path
   - `src/components/f1/F1RecommendationSection.tsx`
   - `src/components/f1/F1RecommendationCard.tsx`
   - `src/components/f1/F1SetupSummary.tsx`
   - `src/components/f1/F1RecipePicker.tsx`
   - `src/components/f1/F1RecipeEditor.tsx`
   - `src/components/f1/F1VesselPicker.tsx`
   - `src/components/f1/new-batch/NewBatchProgress.tsx`
   - `src/components/f1/new-batch/NewBatchStepFooter.tsx`
   - `src/components/lineage/StarterSourceSelector.tsx`

3. Likely new or refactored New Batch view helpers
   - `src/components/f1/new-batch/` additions for:
     - brew read / ratio panel
     - inline recommendation rail
     - step-state helper copy
     - beginner and experienced field grouping

4. Domain helpers that shape the flow and should remain the logic source of truth
   - `src/lib/f1-recommendations.ts`
   - `src/lib/f1-recommendation-types.ts`
   - `src/lib/f1-baseline-rules.ts`
   - `src/lib/f1-transition-rules.ts`
   - `src/lib/f1-lineage-signals.ts`
   - `src/lib/f1-outcome-signals.ts`
   - `src/lib/f1-similarity.ts`
   - `src/lib/f1-setup-summary.ts`
   - `src/lib/f1-vessel-fit.ts`
   - `src/lib/f1-recipe-types.ts`
   - `src/lib/f1-vessel-types.ts`
   - `src/lib/f1-recipes.ts`
   - `src/lib/f1-vessels.ts`
   - `src/lib/lineage.ts`
   - `src/lib/batch-timing.ts`
   - `src/lib/f1-setups.ts`

5. Persistence and data tables that must remain compatible
   - `public.kombucha_batches`
   - `public.batch_f1_setups`
   - `public.f1_recipes`
   - `public.fermentation_vessels`
   - recommendation history reads that join prior batch setup snapshots and outcomes

6. Generated types
   - `src/integrations/supabase/types.ts`
   - No generated type change is expected unless implementation proves a schema gap.

7. Migrations
   - `supabase/migrations/`
   - Default expectation: no schema change for this overhaul.

## Risks and compatibility checks
1. Breaking the current create path in `src/pages/NewBatch.tsx`, especially the `kombucha_batches` insert and `saveBatchF1Setup(...)` follow-up write.
2. Accidentally moving recommendation logic into component-local presentation code and creating rule drift from `src/lib`.
3. Overcomplicating Step 2 with too many inline cards and making the guided experience more crowded instead of calmer.
4. Making beginner mode too sparse and hiding important inputs without enough explanation.
5. Introducing inconsistent copy between:
   - start step
   - inline brew guidance
   - summary
   - recommendation cards
   - toasts
6. Blocking create too aggressively for unusual but still viable brews.
7. Failing to block clearly impossible vessel-fit cases when the app has concrete capacity data.
8. Losing the distinction between recipe defaults and today's actual setup.
9. Regressing brew-again, recipe, or vessel reuse flows while simplifying surface area.
10. Leaving starter-source messaging so archival that users still do not understand why lineage matters.
11. Surfacing timing guidance too strongly and accidentally implying certainty instead of estimates.
12. Breaking existing saved recipes, saved vessels, starter-source linking, or saved recommendation snapshots.
13. Scope creep into recipe or vessel library redesigns that are not required for the F1 setup overhaul.
14. Validation gaps caused by treating this as "mostly copy" when it still touches batch creation and F1 snapshot persistence.

Because this touches brewing setup and batch creation, implementation must explicitly check:
1. Batch stage consistency remains unchanged.
2. Next-action logic and timing helpers remain unchanged unless intentionally revised.
3. Timeline and history behavior is unaffected because this flow does not write `batch_stage_events` or `batch_logs`.
4. Saved batches, saved F1 setups, recipes, vessels, and lineage links remain readable and reusable.
5. User-facing brewing guidance stays safe, calm, and non-absolute.

## Milestones

### Milestone 1: Lock the product plan and step-state model
Goal:
Translate this repo read into an implementation-ready step-state model, copy framework, and component map before changing the route.

Acceptance criteria:
1. The plan captures the current flow, existing helper ownership, and the target interaction model.
2. The team agrees that ratios become first-class guidance but not the persisted source model.
3. The step-state model defines blocked, warning, ready, and complete behavior.
4. The copy strategy is explicit enough that implementation does not improvise tone per component.

Files expected:
1. `plans/2026-03-24-f1-setup-flow-overhaul.md`

Validation:
1. Planning-only milestone, no code validation required.
2. Before implementation starts, record baseline `tsc`, `lint`, `test`, and `build` results in this plan.

Status: completed

### Milestone 2: Rebuild the Step 2 brew experience around live interpretation
Goal:
Turn Step 2 from a grouped form into a guided "today's brew" experience with live ratio reads and inline brew feedback.

Acceptance criteria:
1. Step 2 is organized around brewing decisions, not field buckets.
2. Ratios and normalized measures are prominent while editing:
   - liters
   - tea strength
   - sugar per liter
   - starter ratio
3. The user sees useful interpretation before reaching review.
4. Beginner mode shows fewer fields up front and hides advanced detail behind progressive disclosure.
5. The route still writes the same underlying batch setup fields.

Files expected:
1. `src/pages/NewBatch.tsx`
2. `src/components/f1/new-batch/NewBatchStepFooter.tsx`
3. `src/components/f1/new-batch/NewBatchProgress.tsx`
4. likely new Step 2 helper component(s) under `src/components/f1/new-batch/`
5. `src/lib/f1-setup-summary.ts` if summary text needs a more reusable mid-flow variant
6. `src/lib/f1-baseline-rules.ts` only if specific visible strings need rewording for inline use

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. Review Step 2 behavior for:
   - scratch
   - recipe
   - brew again
5. Confirm existing create payload fields are unchanged.

Status: completed

### Milestone 3: Move recommendation output into the moments where decisions happen
Goal:
Distribute the existing recommendation engine output across Step 2, Step 3, and Step 4 instead of treating review as the first meaningful guidance moment.

Acceptance criteria:
1. Step 2 shows only brew-edit recommendations.
2. Step 3 shows vessel and lineage-driven recommendations.
3. Step 4 shows condensed unresolved issues plus lower-priority historical context.
4. Recommendation cards no longer read like system output.
5. Apply actions still work and keep updating the same draft state plus accepted recommendation ids.

Files expected:
1. `src/pages/NewBatch.tsx`
2. `src/components/f1/F1RecommendationSection.tsx`
3. `src/components/f1/F1RecommendationCard.tsx`
4. likely new recommendation-grouping helper(s) under `src/components/f1/new-batch/` or `src/lib/`
5. `src/lib/f1-recommendations.ts` only if step-level grouping helpers are added without changing the core card generation contract
6. touched recommendation rule files where visible strings need rewrites:
   - `src/lib/f1-baseline-rules.ts`
   - `src/lib/f1-transition-rules.ts`
   - `src/lib/f1-lineage-signals.ts`
   - `src/lib/f1-outcome-signals.ts`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. Confirm recommendation apply actions still update the draft.
5. Confirm recommendation snapshot and accepted recommendation ids still persist through `saveBatchF1Setup(...)`.

Status: completed

### Milestone 4: Rework vessel and starter-source context into a confidence step
Goal:
Make Step 3 feel like confirming the physical and culture context of today's batch rather than managing libraries.

Acceptance criteria:
1. Vessel fit is legible in Step 3 before review.
2. Tight-fit or overfill feedback is visible as soon as the user has enough vessel data.
3. Starter-source language explains why lineage matters to this brew.
4. Custom vessel editing is progressive and secondary.
5. Library-management actions remain available but demoted.
6. Step 3 can surface transition cautions when a source batch is linked.

Files expected:
1. `src/pages/NewBatch.tsx`
2. `src/components/lineage/StarterSourceSelector.tsx`
3. `src/components/f1/F1VesselPicker.tsx`
4. `src/lib/f1-vessel-fit.ts` only if additional fit phrasing or helper output is needed
5. `src/lib/f1-lineage-signals.ts` and `src/lib/f1-transition-rules.ts` for copy rewrites if surfaced inline

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. Confirm saved-vessel selection, manual vessel use, and starter-source selection still behave correctly.
5. Confirm create path still writes vessel and lineage fields consistently.

Status: completed

### Milestone 5: Rewrite the full F1 flow copy system
Goal:
Replace robotic, generic, or product-internal language across the flow with calm, practical brewer-facing copy.

Acceptance criteria:
1. Page, steps, section headers, and helper text all follow one tone system.
2. Recommendation cards no longer show confidence and source jargon as primary UI.
3. Footer helper text becomes actionable and specific.
4. Toasts and validation messages become shorter and more human.
5. Summary copy is concise and readable without sounding like a generated report.
6. Beginner copy explains only what matters now.

Files expected:
1. `src/pages/NewBatch.tsx`
2. `src/components/f1/F1RecommendationSection.tsx`
3. `src/components/f1/F1RecommendationCard.tsx`
4. `src/components/f1/F1SetupSummary.tsx`
5. `src/components/f1/F1RecipePicker.tsx`
6. `src/components/f1/F1RecipeEditor.tsx` if the recipe-save dialog wording is updated
7. `src/components/f1/F1VesselPicker.tsx`
8. `src/components/lineage/StarterSourceSelector.tsx`
9. touched `src/lib` recommendation-rule files for card title, summary, and explanation rewrites
10. possibly `src/lib/f1-setup-summary.ts`

Validation:
1. Inspect visible strings in all touched files.
2. Check that no obvious system-facing phrases remain on the main F1 path.
3. `npx tsc -b`
4. `npm run lint`
5. `npm run test`

Status: completed

### Milestone 6: Add stronger gating, final review compression, and acceptance pass
Goal:
Tighten progression, make unresolved issues legible, and turn the review step into a final confidence check rather than a full secondary form.

Acceptance criteria:
1. Step clicks respect readiness state.
2. Footer helper text reflects blocked vs warning vs ready state.
3. Final review is shorter and more confidence-building.
4. Overfill and missing-required-data cases block create appropriately.
5. Warning cases allow continuation without sounding alarming.
6. Save-as-recipe remains fully supported without competing with the primary create action.

Files expected:
1. `src/pages/NewBatch.tsx`
2. `src/components/f1/new-batch/NewBatchProgress.tsx`
3. `src/components/f1/new-batch/NewBatchStepFooter.tsx`
4. `src/components/f1/F1SetupSummary.tsx`
5. `src/components/f1/F1RecommendationSection.tsx`
6. plan updates in `plans/2026-03-24-f1-setup-flow-overhaul.md`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. Manual code-path review of:
   - scratch create
   - recipe create
   - brew-again create
   - recipe save from review
   - accepted recommendation id persistence

Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md` to confirm repo-specific planning and validation requirements.
2. Inspected `src/pages/NewBatch.tsx` and confirmed the route currently owns start-mode selection, draft editing, recommendation history loading, recommendation apply actions, batch creation, and F1 setup snapshot persistence.
3. Confirmed the current route is already step-based, but Step 2 still behaves like a structured form and the strongest guidance still arrives in Step 4.
4. Inspected `src/components/f1/F1RecommendationSection.tsx` and `src/components/f1/F1RecommendationCard.tsx` and confirmed the recommendation engine is useful but still framed with system-flavored section labels and metadata.
5. Inspected `src/components/f1/F1SetupSummary.tsx` and `src/lib/f1-setup-summary.ts` and confirmed the setup summary is strong but underused earlier in the flow.
6. Inspected `src/components/f1/new-batch/NewBatchProgress.tsx` and `src/components/f1/new-batch/NewBatchStepFooter.tsx` and confirmed step navigation and helper text are currently too generic for a guided decision flow.
7. Inspected `src/components/lineage/StarterSourceSelector.tsx` and confirmed lineage copy currently emphasizes history linkage more than in-the-moment brewing meaning.
8. Inspected `src/components/f1/F1RecipePicker.tsx`, `src/components/f1/F1RecipeEditor.tsx`, and `src/components/f1/F1VesselPicker.tsx` to confirm recipe and vessel reuse flows should stay intact but more secondary.
9. Inspected `src/lib/f1-recommendations.ts`, `src/lib/f1-baseline-rules.ts`, `src/lib/f1-transition-rules.ts`, `src/lib/f1-lineage-signals.ts`, `src/lib/f1-outcome-signals.ts`, and `src/lib/f1-similarity.ts` and confirmed the recommendation system already contains the right signals for this overhaul.
10. Inspected `src/lib/f1-vessel-fit.ts` and `src/lib/batch-timing.ts` and confirmed fit and timing logic already provide meaningful inline guidance opportunities.
11. Inspected `src/lib/f1-setups.ts` and `src/lib/lineage.ts` and confirmed the persistence and starter-source read/write path should remain compatible during a presentation-first overhaul.
12. Created this execution plan file for the F1 setup overhaul.
13. Recorded baseline validation before implementation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the pre-existing Browserslist age notice and large chunk-size warning
14. Added a brew-focused plain-language summary field to `src/lib/f1-setup-summary.ts` so the route can reuse shared wording earlier in the flow without inventing page-local summary logic.
15. Added `src/components/f1/new-batch/NewBatchBrewRead.tsx` and rewired Step 2 in `src/pages/NewBatch.tsx` so the user now sees an early brew read with batch size, tea read, sugar read, starter read, and a likely first-taste estimate while editing.
16. Reorganized Step 2 around brewing decisions:
   - name and batch size
   - build the tea base
   - starter and fermentation pace
17. Made beginner-mode density lighter by moving tea form, sugar type, and SCOBY details behind a secondary "Show details" panel while keeping experienced users expanded by default.
18. Milestone 2 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
19. Safeguarded `src/lib/f1-recommendations.ts` so timing recommendations no longer assume the brew date is always present while the user is still editing Step 2.
20. Repositioned the existing recommendation output across the flow in `src/pages/NewBatch.tsx`:
   - brew-focused cards in Step 2
   - vessel and lineage cards in Step 3
   - condensed high-caution and history-driven cards in Step 4
21. Reworked recommendation framing in `src/components/f1/F1RecommendationSection.tsx` and `src/components/f1/F1RecommendationCard.tsx` so the section and cards use brewing-language copy instead of source, confidence, and system-report phrasing.
22. Reworked Step 3 in `src/pages/NewBatch.tsx` so the vessel context now shows fit and suitability earlier, and the starter-source panel is followed by context-specific guidance.
23. Rewrote copy across the touched New Batch flow surfaces, including:
   - route header and step copy in `src/pages/NewBatch.tsx`
   - batch summary copy in `src/components/f1/F1SetupSummary.tsx`
   - starter-source copy in `src/components/lineage/StarterSourceSelector.tsx`
   - recipe and vessel picker copy in `src/components/f1/F1RecipePicker.tsx`, `src/components/f1/F1RecipeCard.tsx`, `src/components/f1/F1VesselPicker.tsx`, and `src/components/f1/F1VesselCard.tsx`
   - visible recommendation titles and explanations in `src/lib/f1-recommendations.ts`, `src/lib/f1-lineage-signals.ts`, `src/lib/f1-transition-rules.ts`, and `src/lib/f1-baseline-rules.ts`
24. Milestones 3 to 5 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
25. Added stronger step-state logic in `src/pages/NewBatch.tsx` so the flow now distinguishes blocked, warning, complete, and ready states for start, brew, context, and review.
26. Updated `src/components/f1/new-batch/NewBatchProgress.tsx` so the stepper shows readiness labels and disables forward jumps when earlier steps are still blocked.
27. Updated `src/components/f1/new-batch/NewBatchStepFooter.tsx` so footer helper text can reflect blocked and warning states more clearly.
28. Added stronger final-create guards in `src/pages/NewBatch.tsx` for missing brew essentials and clearly overfilled vessel fits.
29. Compressed the final review in `src/pages/NewBatch.tsx` by adding a short "Still worth a last look" summary and limiting the recommendation section there to history-backed context instead of repeating the whole recommendation list.
30. Final validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the same Browserslist age notice and chunk-size warning seen in baseline

## Decision log
1. This should be an overhaul of placement, hierarchy, copy, and gating, not a full rewrite of brewing logic or persistence.
2. The existing four-step shell is good enough to keep, but Step 2 and Step 3 need a different interaction model inside that shell.
3. Ratios should become a first-class UX layer without replacing the current absolute-value source fields.
4. The recommendation engine should be redistributed across the flow, not treated as a new feature or reserved for final review.
5. Beginner mode needs a real simplified presentation path instead of a single informational panel.
6. Save-as-recipe should stay near review and create so the user remains focused on today's actual batch.
7. Recommendation copy should translate internal reasoning into brewer language rather than expose confidence and source vocabulary.
8. The create path should only hard block on concrete missing data or clearly impossible fit issues, not on every unusual brewing choice.
9. No schema change is expected for this overhaul unless implementation discovers a true blocker.
10. Recommendation grouping is page-orchestration logic, so it is safer to keep that routing logic in `src/pages/NewBatch.tsx` rather than splitting it into a second `src/lib` rules layer.
11. The final review should no longer repeat every recommendation; it should hold high-caution checks and the most useful history-backed context.
12. Strong create blocking should stay narrow: missing required brew data and clearly impossible vessel fit are blocked, while unusual but still viable brewing choices remain warnings.

## Open questions
1. No blocking technical unknowns were found during planning.
2. Product choice to confirm during implementation if needed: whether the primary final CTA should remain "Create batch" or shift to "Start batch" for better tone alignment.

## Done when
1. Key guidance appears before final review, especially for:
   - volume
   - tea amount
   - sugar amount
   - starter amount
   - target taste
   - vessel fit
   - starter-source and lineage context
2. A first-time brewer can tell what matters in the setup without reading every helper paragraph.
3. The F1 setup flow reads like a brewing companion, not an admin form or recommendation report.
4. Recommendation cards no longer sound like internal scoring or model output.
5. Ratios and normalized reads are visually central to Step 2.
6. Beginner mode meaningfully reduces cognitive load.
7. Footer helper text is specific and actionable at each step.
8. Review is a calm final check, not the first time the app becomes useful.
9. Recipe, brew-again, vessel, and lineage paths remain fully supported.
10. The `kombucha_batches` insert path and `saveBatchF1Setup(...)` snapshot persistence remain compatible.
11. No schema change is introduced unless this plan is updated first.

## Final validation
Run after each implementation milestone and again at the end:

1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Implementation-specific validation to add to the milestone notes:
1. Verify scratch, recipe, and brew-again all still reach batch creation.
2. Verify accepted recommendation ids still persist through `batch_f1_setups`.
3. Verify starter-source and vessel selections still save correctly.
4. Verify review only condenses guidance instead of hiding unresolved cautions.

Baseline note:
1. Baseline before Milestone 2:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the pre-existing Browserslist age notice and large chunk-size warning
2. Distinguish those baseline warnings from any new issues introduced by the overhaul.
