# Troubleshooting Assistant MVP

## Summary
Plan the first implementation of a batch-aware Troubleshooting Assistant that helps beginners understand whether what they are seeing is likely normal, needs closer monitoring, needs conservative action, or should be discarded, while staying honest about uncertainty and reusing the repo's existing lifecycle, timing, and next-action logic.

## Why
The current app has strong batch tracking, timing guidance, reminders, F2 setup, and guide content, but it does not yet give users a calm, structured way to answer "is this normal?" when a batch looks strange, tastes off, stays sweet, goes flat, or feels over-pressurized. Beginners are likely to panic or overreact without context. This feature should lower that panic by turning the app's existing batch stage, timing, F2, and guide data into conservative troubleshooting guidance without pretending to diagnose contamination or safety with certainty.

## Scope
In scope for MVP:
1. Rework the existing protected `/assistant` route in `src/pages/Assistant.tsx` into a Troubleshooting Assistant MVP instead of adding a brand new top-level route.
2. Support both batch-attached troubleshooting and a general flow with no attached batch.
3. Support exactly these issue types in MVP:
   `too_sour`, `too_sweet_or_not_fermenting`, `no_carbonation`, `too_much_carbonation`, `not_sure_if_ready`, `strange_strands_or_sediment`, `mold_concern`.
4. Ask a small structured question set per issue, prefilled from existing batch/F2 data when available.
5. Return a calm result card with headline, severity, interpretation, why, immediate action, next check, related batch CTA, uncertainty note, and escalation note.
6. Reuse `src/lib/batches.ts`, `src/lib/batch-timing.ts`, existing F2 setup data, existing next-action logic, and existing lifecycle actions where possible.
7. Add entry points from `src/pages/BatchDetail.tsx`, the home dashboard in `src/pages/Index.tsx` when relevant, and the guides area in `src/pages/Guides.tsx`.
8. Keep MVP mostly rules/content-driven on the client with no new Supabase schema.

Explicitly out of scope for MVP:
1. Photo upload or image-based diagnosis.
2. AI image review or microbiology-style certainty claims.
3. Broad health or medical advice.
4. New backend RPCs, edge functions, views, or schema changes.
5. Persisting troubleshooting sessions or chat history in `assistant_conversations` / `assistant_messages`.
6. Highly personalized fermentation modeling beyond existing timing helpers and saved batch/F2 data.
7. Push notifications or new reminder automation.
8. Localization.

Recommended MVP boundary:
1. Full-page assistant flow on `/assistant`.
2. Rules-based evaluation with seven issue types.
3. Batch-aware personalization when launched from a batch or when a batch is selected in the assistant.
4. Clear severity states and conservative pressure/mold handling.
5. An explanation layer that shows why the app is leaning a certain way without overstating certainty.

Recommended deferrals:
1. Persisted troubleshooting history.
2. Timeline/log writes for passive reads.
3. One-tap corrective actions inside the assistant beyond reusing existing helpers for explicit confirmations.
4. Issue photos.
5. More advanced readiness modeling or adaptive temperature calibration.
6. Analytics beyond minimal route-level usage already available elsewhere in the app.

## Current state
Relevant flow today:
1. `src/App.tsx` defines the current protected `/assistant` route, alongside `/`, `/batches`, `/new-batch`, `/batch/:id`, `/guides`, and `/guides/:slug`.
2. `src/pages/Assistant.tsx` is currently a placeholder conversational screen with mock batches and no real Supabase or batch lifecycle integration.
3. `src/pages/BatchDetail.tsx` is the real source-of-truth batch screen. It already loads `kombucha_batches`, `batch_reminders`, `batch_stage_events`, and `batch_logs`, and exposes an `Assistant` tab that can become a strong batch-attached entry point.
4. `src/pages/Index.tsx` is now the Today / Next Actions dashboard and already groups batches by urgency; it is a natural place to surface a troubleshooting CTA for batches with caution or urgent attention.
5. `src/pages/Guides.tsx` and `src/content/guides.ts` already provide a help surface and include domain content for carbonation pressure, when to discard, tasting/readiness, and common mistakes.
6. `src/lib/batches.ts` defines the current lifecycle model:
   `f1_active`, `f1_check_window`, `f1_extended`, `f2_setup`, `f2_active`, `refrigerate_now`, `chilled_ready`, `completed`, `archived`, `discarded`.
7. `src/lib/batches.ts` also centralizes default next-action generation through `getNextAction(batch)`, while respecting persisted `batch.nextAction`.
8. `src/lib/batch-timing.ts` already derives stage-aware timing/status for F1 and F2, including `ready`, `approaching`, and `overdue`, plus `guidance`, `nextActionLabel`, `nextCheckText`, and explanation text.
9. `src/components/f2/F2SetupWizard.tsx`, `src/lib/f2-persistence.ts`, `src/lib/f2-current-setup.ts`, and `src/lib/f2-active-actions.ts` already encode important F2 data and actions:
   `batch_f2_setups`, `batch_f2_bottle_groups`, `batch_bottles`, `batch_bottle_ingredients`, `refrigerate-now`, `moved-to-fridge`, `needs-more-carbonation`, `checked-one-bottle`, `mark-completed`.
10. `src/pages/BatchDetail.tsx` already uses reminder and timeline/history context, and F2 actions already write `batch_logs` and sometimes `batch_stage_events`.

Current reusable data sources:
1. `kombucha_batches` already stores fields useful for troubleshooting, including `current_stage`, `status`, `brew_started_at`, `f2_started_at`, `target_preference`, `avg_room_temp_c`, `starter_liquid_ml`, `total_volume_ml`, `initial_ph`, `next_action`, `caution_level`, `discard_reason`, and `discarded_at`.
2. `batch_reminders` already captures due actions such as `f1_taste_check`, `start_f2`, `burp_bottles`, `refrigerate_now`, and `custom`.
3. `batch_logs` supports structured history including `ph_check`, `temp_check`, `sweetness_check`, `carbonation_check`, `custom_action`, and `refrigerated`, although current UI use is still limited.
4. `batch_stage_events` already provides lifecycle history and can be reused later if troubleshooting confirmations become stage changes.
5. Current F2 setup loaders already expose bottle groups, bottle ingredients, carbonation targets, ambient temperature assumptions, and risk metadata that can personalize flatness and pressure guidance.

Current gaps:
1. There is no structured troubleshooting issue schema.
2. There is no reusable severity model for beginner-safe troubleshooting outputs.
3. `src/pages/Assistant.tsx` does not yet use real batch, stage, timing, reminder, or F2 data.
4. The app has assistant-related Supabase tables, but the current UI does not use them, and they are not needed for an MVP rules engine.

## Intended outcome
The Troubleshooting Assistant MVP should:
1. Give users a dedicated, beginner-friendly troubleshooting flow at `/assistant`.
2. Work both with an attached batch and without one.
3. Use saved batch context when available so guidance reflects actual stage, elapsed time, F2 setup, reminders, and existing next actions.
4. Reuse existing lifecycle and timing helpers instead of inventing duplicate logic in UI components.
5. Return conservative, calm results that distinguish likely normal states from caution, urgent pressure action, and discard cases.
6. Be explicit that the app is not certain, especially when pH is unknown or the user is describing ambiguous visual changes.
7. Send the user back to the existing batch detail flow for deeper context and batch-specific actions.

Required severity ladder for MVP:
1. `likely normal`
2. `monitor / check soon`
3. `caution`
4. `urgent action`
5. `discard / unsafe to continue`

Recommended output shape for every result:
1. `headline`
2. `severityLabel`
3. `interpretation`
4. `whyTheAppThinksThis`
5. `immediateAction`
6. `nextCheck`
7. `relatedBatchAction`
8. `uncertaintyNote`
9. `escalationNote`

Recommended issue-evaluation pattern for MVP:
1. Load optional batch context.
2. Derive lifecycle/timing context from existing helpers.
3. Ask only the additional questions needed for the selected issue.
4. Evaluate the issue through issue-specific rule content plus shared helper outputs.
5. Render a shared result card component.

## Files and systems involved
Route files:
1. `src/App.tsx`
2. `src/pages/Assistant.tsx`
3. `src/pages/BatchDetail.tsx`
4. `src/pages/Index.tsx`
5. `src/pages/Guides.tsx`

Shared components:
1. Likely new `src/components/troubleshooting/TroubleshootingIssuePicker.tsx`
2. Likely new `src/components/troubleshooting/TroubleshootingQuestionFlow.tsx`
3. Likely new `src/components/troubleshooting/TroubleshootingResultCard.tsx`
4. Likely new `src/components/troubleshooting/TroubleshootingBatchContext.tsx`
5. Reuse `src/components/common/StageIndicator.tsx`
6. Reuse `src/components/ui/alert.tsx`
7. Reuse `src/components/ui/dialog.tsx`, `drawer.tsx`, or `sheet.tsx` only if a batch-detail quick-launch needs a light container later

Domain helpers in `src/lib`:
1. `src/lib/batches.ts`
2. `src/lib/batch-timing.ts`
3. `src/lib/f2-current-setup.ts`
4. `src/lib/f2-active-actions.ts`
5. `src/lib/f2-persistence.ts`
6. Likely new `src/lib/troubleshooting/types.ts`
7. Likely new `src/lib/troubleshooting/issue-definitions.ts`
8. Likely new `src/lib/troubleshooting/evaluate.ts`
9. Likely new `src/lib/troubleshooting/question-schema.ts` if the issue definitions get too dense for one file

Guides/content:
1. `src/content/guides.ts`
2. `src/pages/GuideDetail.tsx`

Supabase tables and views:
1. `kombucha_batches`
2. `batch_reminders`
3. `batch_logs`
4. `batch_stage_events`
5. `batch_f2_setups`
6. `batch_f2_bottle_groups`
7. `batch_bottles`
8. `batch_bottle_ingredients`
9. `assistant_conversations` and `assistant_messages` were inspected but are not recommended for MVP use

Generated types and client:
1. `src/integrations/supabase/types.ts`
2. `src/integrations/supabase/client.ts`

No migration files are expected for MVP.

## Risks and compatibility checks
1. Duplicated lifecycle logic: the biggest risk is re-encoding F1/F2 readiness, pressure urgency, or stage meaning inside components instead of reusing `getBatchStageTiming`, `getNextAction`, and existing F2 action helpers.
2. Overstated certainty: mold, contamination, acidity, and safety cannot be diagnosed confidently from limited user inputs. Result copy and evaluator outputs must stay conservative.
3. Pressure safety drift: the assistant must not conflict with existing F2 guidance in `src/lib/batch-timing.ts` and `src/lib/f2-active-actions.ts`, especially around `refrigerate_now`.
4. Ambiguous visual reports: stringy yeast, sediment, and new pellicle growth are often normal. The logic must not escalate these by default, but must escalate fuzzy colored surface growth.
5. pH overreach: if the user has not measured pH, the assistant must say so explicitly and not act as though it knows the batch has acidified enough.
6. Stale or partial batch context: general troubleshooting without an attached batch will have weaker context. The evaluator needs a clean fallback path that asks a few extra questions rather than silently assuming stored values.
7. Timeline/history inflation: creating `batch_logs` or `batch_stage_events` for every troubleshooting session would add noise. MVP should keep sessions ephemeral unless the user explicitly confirms an action that already maps to a real workflow helper.
8. F2 performance risk: attached-batch pressure and flatness flows may need F2 setup and bottle data. MVP should load those only when needed, not for every assistant visit.
9. Route complexity: a multi-step flow can become noisy if it tries to behave like chat. MVP should stay form-driven and result-card driven.
10. Existing batch compatibility: no schema changes are planned, so compatibility risk is low if troubleshooting only reads current batch/F2/reminder data and reuses existing action helpers for any confirmed lifecycle changes.

Required compatibility checks for this repo:
1. Batch stage consistency across `src/lib/batches.ts`, `src/lib/batch-timing.ts`, `src/pages/BatchDetail.tsx`, and the troubleshooting evaluator.
2. Next-action consistency with `getNextAction(batch)` and persisted `next_action`.
3. Timeline/history impact if any troubleshooting confirmation triggers `batch_logs` or `batch_stage_events`.
4. Backwards compatibility for saved batches and saved F2 setups loaded through `src/lib/f2-current-setup.ts`.
5. Safety and clarity of user-facing sourness, carbonation, mold, and readiness guidance.

## Milestones

### Milestone 1: Confirm route, entry points, and attached-batch model
Goal:
Decide where the assistant should live, how it is entered, and how it should behave with and without a linked batch.
Acceptance criteria:
1. The primary route is decided and documented.
2. Entry points from batch detail, dashboard, and guides are identified concretely.
3. A decision is recorded for batch-attached vs general troubleshooting.
4. Query-parameter or navigation-state handoff is defined for preselecting batch and issue type.
Files expected:
1. `src/App.tsx`
2. `src/pages/Assistant.tsx`
3. `src/pages/BatchDetail.tsx`
4. `src/pages/Index.tsx`
5. `src/pages/Guides.tsx`
Validation:
1. Inspect route structure and current assistant route ownership.
2. Inspect current batch detail tabs and dashboard card navigation surfaces.
3. Confirm there is a natural guides/help entry without adding new nav complexity.
Status: completed

### Milestone 2: Define the troubleshooting domain model and issue registry
Goal:
Create the planned schema for issue definitions, question definitions, severity values, evaluation inputs, and result output shape.
Acceptance criteria:
1. The severity ladder is documented and explainable.
2. A rules/content-driven architecture is chosen over component-local conditionals.
3. Exact MVP issue types are documented.
4. The shared result card shape is documented.
Files expected:
1. Likely new `src/lib/troubleshooting/types.ts`
2. Likely new `src/lib/troubleshooting/issue-definitions.ts`
3. Likely new `src/lib/troubleshooting/evaluate.ts`
4. `src/pages/Assistant.tsx`
Validation:
1. Verify the evaluator can consume existing batch/timing/F2 context without new schema.
2. Verify the issue registry can stay extensible for later issue types.
Status: completed

### Milestone 3: Map reusable batch, timing, reminder, and F2 context
Goal:
Identify exactly which existing repo fields and helpers should power troubleshooting outputs and which data must be loaded conditionally.
Acceptance criteria:
1. Existing batch fields that support troubleshooting are listed explicitly.
2. Existing timing and next-action helpers are mapped to issue types.
3. Existing F2 setup and bottle data reuse is documented for flatness and pressure issues.
4. Reminder, log, and stage-event usage is documented for MVP and later.
Files expected:
1. `src/lib/batches.ts`
2. `src/lib/batch-timing.ts`
3. `src/lib/f2-current-setup.ts`
4. `src/lib/f2-active-actions.ts`
5. `src/lib/f2-persistence.ts`
6. `src/pages/BatchDetail.tsx`
7. `src/integrations/supabase/types.ts`
Validation:
1. Verify no new backend shaping is required for MVP.
2. Verify pressure and readiness rules can reuse existing stage/timing logic rather than cloning it.
Status: completed

### Milestone 4: Define the exact MVP question sets and issue-specific logic
Goal:
Document the smallest useful structured follow-up questions and the high-level severity/escalation logic for each issue type.
Acceptance criteria:
1. Each of the 7 issue types has an exact MVP question set.
2. Each issue has documented logic sources, severity mapping, immediate action, escalation threshold, and deferred items.
3. The plan distinguishes likely normal visuals from discard-worthy mold cues.
4. The plan distinguishes quality/preference issues from safety states.
Files expected:
1. Likely new `src/lib/troubleshooting/issue-definitions.ts`
2. Likely new `src/lib/troubleshooting/evaluate.ts`
3. `src/lib/batch-timing.ts`
4. `src/lib/f2-active-actions.ts`
5. `src/content/guides.ts`
Validation:
1. Verify the question count stays small and repo-compatible.
2. Verify pH-dependent guidance is conditional on measured pH being available.
3. Verify pressure and mold outputs are conservative.
Status: completed

### Milestone 5: Plan the MVP UI composition and CTA wiring
Goal:
Define the minimum page/component structure needed to ship the assistant without bloating the route or scattering logic.
Acceptance criteria:
1. The page layout is decided as a full-page assistant flow on `/assistant`.
2. New components are scoped cleanly between issue picker, question flow, result card, and batch context banner.
3. Result CTAs back to batch detail and existing lifecycle actions are documented.
4. The plan states what should remain on the batch detail Assistant tab versus linking out to the main assistant route.
Files expected:
1. `src/pages/Assistant.tsx`
2. Likely new `src/components/troubleshooting/TroubleshootingIssuePicker.tsx`
3. Likely new `src/components/troubleshooting/TroubleshootingQuestionFlow.tsx`
4. Likely new `src/components/troubleshooting/TroubleshootingResultCard.tsx`
5. `src/pages/BatchDetail.tsx`
6. `src/pages/Index.tsx`
7. `src/pages/Guides.tsx`
Validation:
1. Verify the UI stays beginner-friendly and action-oriented.
2. Verify component boundaries keep decision logic out of JSX.
Status: completed

### Milestone 6: Record validation path, baseline failures, and MVP deferrals
Goal:
Document the exact validation commands, known baseline failures, and what later versions should add.
Acceptance criteria:
1. Repo validation commands are recorded correctly.
2. Known baseline failures are distinguished from feature-induced failures.
3. MVP deferrals are explicit so the first pass stays narrow.
Files expected:
1. `package.json`
2. `PLANS.md`
3. This plan file
Validation:
1. Confirm `npx tsc -b`, `npm run lint`, `npm run test`, and `npm run build` exist and are the right commands.
2. Record known current blockers accurately.
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`.
2. Inspected route structure in `src/App.tsx` and confirmed `/assistant` already exists as a protected route.
3. Inspected `src/pages/Assistant.tsx` and confirmed it is currently a placeholder with mock data rather than real batch-aware troubleshooting.
4. Inspected `src/pages/BatchDetail.tsx` and confirmed it already loads reminders, timeline/history, F2 data entry points, and has an `Assistant` tab that can launch troubleshooting.
5. Inspected `src/pages/Index.tsx` and confirmed the home dashboard is now an action-oriented surface that could link users into troubleshooting when relevant.
6. Inspected `src/pages/Guides.tsx`, `src/pages/GuideDetail.tsx`, and `src/content/guides.ts` and confirmed there is an existing help/guides surface with content relevant to discard, carbonation pressure, and readiness.
7. Inspected `src/lib/batches.ts` and confirmed the current stage model and centralized next-action helper.
8. Inspected `src/lib/batch-timing.ts` and confirmed reusable F1/F2 timing outputs, including `ready`, `approaching`, `overdue`, and conservative F2 guidance.
9. Inspected `src/components/f2/F2SetupWizard.tsx`, `src/lib/f2-persistence.ts`, `src/lib/f2-current-setup.ts`, and `src/lib/f2-active-actions.ts` and confirmed saved F2 setup plus bottle data can personalize flatness and pressure troubleshooting.
10. Inspected `src/integrations/supabase/types.ts` and confirmed relevant tables already exist for batches, reminders, stage events, logs, F2 setup, and unused assistant conversation storage.
11. Confirmed the repo validation commands from `package.json`: `npx tsc -b`, `npm run lint`, `npm run test`, and `npm run build`.
12. Reworked `src/pages/Assistant.tsx` from a mock chat screen into a batch-aware troubleshooting route that accepts `batchId` and `issue` query params.
13. Added dashboard and guides entry points into `/assistant`, and replaced the batch-detail Assistant placeholder with a batch-attached launch panel.
14. Added `src/lib/troubleshooting/types.ts`, `src/lib/troubleshooting/issue-definitions.ts`, and `src/lib/troubleshooting/evaluate.ts` so issue definitions, question schema, severity, and rule evaluation live outside JSX.
15. Added `src/components/troubleshooting/TroubleshootingBatchContext.tsx`, `src/components/troubleshooting/TroubleshootingIssuePicker.tsx`, `src/components/troubleshooting/TroubleshootingQuestionFlow.tsx`, and `src/components/troubleshooting/TroubleshootingResultCard.tsx` for the MVP UI composition.
16. Wired real batch context into the assistant by loading `kombucha_batches`, the nearest pending `batch_reminders` row, computed timing from `getBatchStageTiming`, and the current saved F2 setup via `loadCurrentF2Setup`.
17. Implemented issue-specific guided question flows and conservative result cards for all 7 MVP issue types.
18. Kept troubleshooting sessions ephemeral in MVP and did not add `batch_logs`, `batch_stage_events`, or assistant-conversation writes for passive reads.
19. After Milestones 1 through 5, reran `npx tsc -b`, `npm run lint`, `npm run test`, and `npm run build`; each run showed the same pre-existing `tsc` failures in `src/components/f2/F2SetupWizard.tsx` and `src/pages/GuideDetail.tsx`, the same pre-existing lint failures in unrelated files, and the same sandbox `spawn EPERM` failures for `test` and `build`.

## Decision log
1. Recommended route placement for MVP: reuse the existing `/assistant` route in `src/pages/Assistant.tsx` rather than adding a new route. This keeps navigation stable and upgrades an existing placeholder.
2. Recommended entry-point model: support both batch-attached and general troubleshooting. Launches from batch detail, dashboard, or guides should pass `batchId` and optionally `issue` into `/assistant`; direct visits can start without a batch.
3. Recommended page form factor: use a full-page flow rather than a modal or drawer for MVP. The issue picker, question flow, and result card need room, and the route already exists.
4. Recommended persistence model: keep troubleshooting sessions ephemeral in MVP even though `assistant_conversations` and `assistant_messages` exist in Supabase. The current UI does not use them, and the MVP does not need stored history.
5. Recommended evaluation architecture: use a rules/content-driven issue registry plus evaluator helpers in `src/lib/troubleshooting/*`, not giant conditional UI blocks in `src/pages/Assistant.tsx`.
6. Recommended data-shaping model: keep MVP client-side. Existing batch, reminder, timing, and F2 setup data are sufficient, and no new backend shaping is clearly required.
7. Recommended timeline/log model: do not write `batch_logs` or `batch_stage_events` just because a user viewed troubleshooting guidance. Only explicit confirmed lifecycle actions in a later implementation should write history, ideally through existing helpers such as `applyF2ActiveAction`.
8. Recommended explanation model: every result should state what this probably means, why the app thinks that, what to do now, what to watch next, and what remains uncertain.
9. Recommended safety stance: pressure and mold issues should bias toward conservative immediate action. Sourness and flatness should not be framed as contamination by default.
10. Implemented the MVP as a full-page `/assistant` flow with optional batch attachment, rather than embedding the full troubleshooting interaction inside `src/pages/BatchDetail.tsx`.
11. Kept the batch-detail Assistant tab as a launch surface into `/assistant` so the troubleshooting evaluator stays centralized in one route.
12. Reused saved batch timing, reminders, and current F2 setup for personalization, but did not query timeline/history tables for passive troubleshooting reads.
13. For MVP, batch-attached carbonation and readiness results link back to the existing batch detail route rather than performing lifecycle writes directly from the assistant.

## Open questions
None at the moment.

## Done when
1. The plan names the best route and entry points for the Troubleshooting Assistant MVP.
2. The plan documents whether troubleshooting is batch-attached, general, or both.
3. The plan identifies the exact existing files, helpers, tables, and data fields that should power the feature.
4. The plan defines a rules/content-driven architecture for issue definitions, question schema, evaluation logic, and result rendering.
5. The plan includes exact MVP follow-up questions for all 7 issue types.
6. The plan defines the severity ladder, issue-specific immediate actions, escalation thresholds, and output shape.
7. The plan states that MVP should remain mostly client-side and ephemeral unless a future explicit action requires reuse of existing lifecycle/log helpers.
8. The plan clearly separates MVP scope from later enhancements.

## Final validation
Default repo checks for the eventual implementation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Baseline status already observed in this repo before Troubleshooting Assistant implementation:
1. `npx tsc -b` currently fails due to pre-existing TypeScript errors, including `replaceAll` usage in `src/components/f2/F2SetupWizard.tsx` and a missing `guides` reference in `src/pages/GuideDetail.tsx`.
2. `npm run lint` currently fails due to pre-existing lint issues in multiple files, including `src/components/ui/command.tsx`, `src/components/ui/textarea.tsx`, `src/integrations/supabase/types.ts`, `src/pages/BatchDetail.tsx`, `src/pages/MyBatches.tsx`, `src/pages/NewBatch.tsx`, and `tailwind.config.ts`.
3. `npm run test` is a valid repo command, but in this sandbox it currently fails with `spawn EPERM` while Vite/esbuild config is being loaded.
4. `npm run build` is a valid repo command, but in this sandbox it currently fails with `spawn EPERM` while Vite/esbuild config is being loaded.

Issue-specific MVP design details to carry into implementation:

1. `too_sour`
   Inputs:
   stage, timing context, refrigerated state, taste impression, smell impression, visible mold concern, optional measured pH.
   Logic sources:
   `kombucha_batches.current_stage`, `brew_started_at`, `f2_started_at`, `getBatchStageTiming`, optional attached batch reminders, optional user-reported pH.
   Exact MVP follow-up questions:
   - Is this batch in F1, F2, or already refrigerated?
   - Does it otherwise smell normal and acidic, or does it smell rotten or unusual?
   - Do you see any fuzz or unusual colored surface growth?
   - Is it just more sour than you wanted, or is it sharply vinegar-like?
   - Have you measured pH? If yes, what is it?
   Severity mapping:
   Usually `likely normal` or `monitor / check soon` if smell looks normal and there is no mold concern.
   `caution` if pH is known below 2.5 or if sourness is paired with another warning sign.
   Escalate to `discard / unsafe to continue` if mold indicators are present.
   Safe immediate action:
   Chill if the batch is otherwise normal and simply over-fermented; use as starter or adjust future timing rather than framing it as contamination.
   Escalation threshold:
   Visible fuzzy/colored growth, rotten smell, or strong spoilage cues.
   Defer to later:
   Personalized salvage ideas, dilution calculators, recipe reuse suggestions.

2. `too_sweet_or_not_fermenting`
   Inputs:
   stage, elapsed time, room temperature context, smell impression, mold concern, optional measured pH.
   Logic sources:
   `getBatchStageTiming`, `avg_room_temp_c`, `target_preference`, `brew_started_at`, reminders, optional pH input.
   Exact MVP follow-up questions:
   - Is this in F1 or F2?
   - How many days has it been fermenting or bottled?
   - Does it smell normal and lightly acidic, mostly like sweet tea, or rotten/off?
   - Do you see fuzz or unusual colored surface growth?
   - Have you measured pH? If yes, what is it?
   - Has the room been cool, moderate, or warm?
   Severity mapping:
   Usually `likely normal` or `monitor / check soon` when still early and no red flags.
   `caution` if the user is around day 7 and measured pH is still above 4.2.
   `discard / unsafe to continue` if the user is around day 10 and measured pH is still above 4.2, or if mold/spoilage cues are present.
   Safe immediate action:
   Keep observing if still early and otherwise normal; do not mark unsafe solely because it is still sweet.
   Escalation threshold:
   pH remains above 4.2 past day 10, or visible mold/spoilage concern.
   Defer to later:
   Richer culture health diagnostics and inoculum-strength troubleshooting.

3. `no_carbonation`
   Inputs:
   bottled/sealed state, days since bottling, refrigeration state, F2 additions, seal confidence, smell/look normality.
   Logic sources:
   `current_stage`, `f2_started_at`, `getBatchStageTiming`, attached F2 setup from `src/lib/f2-current-setup.ts`, bottle ingredients, carbonation target, ambient temperature assumptions.
   Exact MVP follow-up questions:
   - Is it bottled and sealed right now?
   - How many days has it been in F2?
   - Is it already refrigerated?
   - Did you add fruit, juice, sugar, or another fermentable flavoring?
   - Do the bottles seem well sealed?
   - Does it otherwise smell and look normal?
   Severity mapping:
   Usually `likely normal` or `monitor / check soon`.
   `caution` only if flatness is paired with spoilage concerns or a clearly inconsistent stage.
   Safe immediate action:
   Continue observing or adjust process assumptions; treat flatness as a process/quality issue by default, not a safety issue.
   Escalation threshold:
   Flatness plus rotten smell, fuzzy growth, or a contradictory stage/history signal.
   Defer to later:
   Root-cause scoring based on bottle type, closure type, sugar estimate, and ambient temperature history.

4. `too_much_carbonation`
   Inputs:
   bottled/sealed state, days since bottling, refrigeration state, warm-room context, sugar-rich additions, bottle behavior.
   Logic sources:
   `current_stage`, `f2_started_at`, `getBatchStageTiming`, attached F2 setup and bottle ingredients, carbonation target/risk metadata, existing `refrigerate-now` lifecycle handling in `src/lib/f2-active-actions.ts`.
   Exact MVP follow-up questions:
   - Is it bottled and sealed right now?
   - Are the bottles hard, bulging, leaking, or spraying hard when opened?
   - How many days has it been in F2?
   - Is it already refrigerated?
   - Did you add fruit, juice, or sugar in F2?
   - Has it been in a warm room?
   Severity mapping:
   At least `caution` once sealed-bottle pressure is a concern.
   `urgent action` if bottles are very hard, bulging, leaking, or geysering.
   `discard / unsafe to continue` is not the default here, but may be appropriate if the user reports an obviously compromised package plus spoilage concern.
   Safe immediate action:
   Refrigerate now and open carefully over a sink with protective caution language.
   Escalation threshold:
   Bulging, leaking, extreme hardness, explosive/gushing behavior, or warm prolonged F2 beyond expected timing.
   Defer to later:
   More tailored bottle-by-bottle pressure management flows and reminder integration.

5. `not_sure_if_ready`
   Inputs:
   stage, elapsed time, taste impression, refrigeration state, optional pH, optional recent bottle check.
   Logic sources:
   `getBatchStageTiming`, `getNextAction`, `current_stage`, reminders, attached F2 setup if the batch is in F2.
   Exact MVP follow-up questions:
   - Is this batch in F1 or F2?
   - Which best matches what you taste or observe: still sweet, balanced tang, very sour, carbonation feels right, or not enough carbonation?
   - Is it already refrigerated?
   - If this is F2, have you checked a bottle today?
   - Have you measured pH? If yes, what is it?
   Severity mapping:
   Usually `likely normal` or `monitor / check soon`, sometimes `caution` if timing is clearly overdue or the batch is pressurized and warm.
   Safe immediate action:
   Follow the existing next action and timing guidance; explicitly frame timing as an estimate that taste and observation should confirm.
   Escalation threshold:
   Overdue pressurized F2, mold cues, or measured pH concerns.
   Defer to later:
   More personalized taste-target calibration and guided readiness logging.

6. `strange_strands_or_sediment`
   Inputs:
   where the material appears, texture description, color description, smell impression, stage.
   Logic sources:
   Attached batch stage, existing guides content, conservative visual heuristics in issue rules.
   Exact MVP follow-up questions:
   - Is what you see submerged, on the surface, or both?
   - Does it look stringy, sediment-like, a smooth new layer, or fuzzy/furry?
   - Is the color cream/tan/brown, smooth white, or an unusual color such as green, blue, or black?
   - Does it smell normal and acidic, or rotten/off?
   - Is this in F1 or F2?
   Severity mapping:
   `likely normal` for stringy yeast, sediment, or smooth pellicle-like growth with normal smell.
   `monitor / check soon` when the description is incomplete or the user is unsure.
   Escalate to `caution` or `discard / unsafe to continue` when fuzzy texture, abnormal color, or spoilage cues appear.
   Safe immediate action:
   Continue observing if it matches common yeast/sediment/pellicle patterns and there are no red flags.
   Escalation threshold:
   Fuzzy surface growth, unusual colors, or rotten smell.
   Defer to later:
   Photo-assisted comparisons and richer visual examples.

7. `mold_concern`
   Inputs:
   surface location, texture, color, smell impression, ability to distinguish smooth wet pellicle vs fuzzy dry growth.
   Logic sources:
   Conservative issue rules plus existing guide content on danger signs/discard.
   Exact MVP follow-up questions:
   - Is the growth on the surface?
   - Does it look fuzzy, furry, or dry?
   - What color is it?
   - Does it smell normal and acidic, or rotten/off?
   - Can you tell whether this is a smooth wet layer or dry fuzzy spots?
   Severity mapping:
   `discard / unsafe to continue` when the user reports fuzzy/furry surface growth or abnormal colored surface contamination.
   `caution` when the user cannot tell and the description is ambiguous.
   Safe immediate action:
   Do not consume, do not reuse the culture, and discard when mold indicators are present.
   Escalation threshold:
   Any confident report of fuzzy colored surface growth.
   Defer to later:
   Photo review, richer comparison visuals, and more guided discard logging.
