# BatchDetail Redesign

## Summary
Create a major, repo-specific redesign plan for `src/pages/BatchDetail.tsx` so the page becomes a stage-aware brewing journal and live action cockpit instead of a flat detail page with many shallow tabs.

## Why
The current BatchDetail page already contains most of the right data, but it presents that data in a dry, fragmented way:
1. The hero is compact and informative, but not stage-driven enough.
2. `Overview` carries most of the meaningful product value, while several other tabs are placeholders.
3. F2 is isolated behind a top-level tab even though it is part of the same brewing journey.
4. Timeline, logs, phase outcomes, and reflections are split across surfaces instead of reading like one journal story.
5. Completed batches still look operational when they should feel reflective and rewarding.

This redesign is needed to make BatchDetail feel first-class for both active and completed batches, with stronger guidance about current stage and what to do next.

## Scope
In scope:
1. Redesign the BatchDetail information architecture and stage-aware behavior.
2. Replace the current top-level tab model with a more focused repo-specific surface model.
3. Reframe the hero into a stronger stage-aware status card.
4. Merge timeline, logs, and phase outcomes into a Journal surface.
5. Integrate F2 into the main BatchDetail flow instead of keeping it as a separate top-level tab.
6. Make reminders more prominent.
7. Make completed-batch reflection, outcomes, and Brew Again more prominent.
8. Define likely component splits and view-model helpers needed for implementation.
9. Define copy/tone direction for a warmer Kombloom voice.

Out of scope:
1. Changing batch stage meanings, next-action rules, or timing calculations.
2. Schema redesigns or persistence changes unless implementation later proves one is necessary.
3. New photo persistence, new note persistence, or new journaling schema in this planning pass.
4. Replacing the dedicated lineage explorer.
5. Broad redesigns of dashboard, batch list, or onboarding outside what BatchDetail should align with visually.

## Current state
Current route and page structure:
1. `src/App.tsx` serves BatchDetail at `/batch/:id`.
2. `src/pages/BatchDetail.tsx` is a single large page component with local helper subcomponents.
3. The page currently uses these top-level tabs:
   - `Overview`
   - `Timeline`
   - `Logs`
   - `F2 & Bottles`
   - `Photos`
   - `Notes`
   - `Guide`
   - `Assistant`

Current BatchDetail data flow:
1. BatchDetail loads `kombucha_batches` directly from Supabase.
2. It separately loads:
   - `batch_reminders`
   - `batch_stage_events`
   - `batch_logs`
   - `batch_phase_outcomes`
   - current lineage via `src/lib/lineage.ts`
   - current F2 setup via `src/lib/f2-current-setup.ts`
3. F1 and F2 timing UI is derived with `src/lib/batch-timing.ts`.
4. F1 workflow actions update `kombucha_batches`, `batch_stage_events`, and `batch_logs` directly in `BatchDetail`.
5. F2 setup and active F2 lifecycle actions are delegated into `src/components/f2/F2SetupWizard.tsx`, `src/lib/f2-current-setup.ts`, and `src/lib/f2-active-actions.ts`.

Current overview flow:
1. A compact hero shows:
   - batch name
   - `StageIndicator`
   - `CautionBadge`
   - large day count
   - small stat strip for room temp, tea, and target
2. `Overview` currently contains:
   - a simple stage-progress strip
   - timing card with F1/F2 estimate
   - F1/F2 phase outcome cards
   - lineage section
   - reminders list
   - recipe grid
3. The page already keeps day count visually large, which matches the redesign direction.

Current journal/history state:
1. `Timeline` already merges `batch_stage_events` and `batch_logs` into one chronological list.
2. `Logs` is still a placeholder tab rather than a real structured experience.
3. Phase outcomes are separate cards in `Overview`, not part of the story of the batch.

Current F2 state:
1. `F2 & Bottles` is a top-level tab.
2. `src/components/f2/F2SetupWizard.tsx` handles both:
   - setup flow when the batch is in `f2_setup`
   - saved F2 view and F2 lifecycle actions when a setup already exists
3. Saved F2 state already includes recipe snapshot, bottle groups, bottles, ingredients, carbonation info, and F2 actions.

Current lineage and outcome state:
1. `src/components/lineage/BatchLineageSection.tsx` is already a compact entry point into the dedicated `/batch/:id/lineage` route.
2. `src/components/outcomes/PhaseOutcomeCard.tsx` and `src/components/outcomes/PhaseOutcomeDrawer.tsx` already support quick F1/F2 reflection and editing.
3. `src/components/brew-again/BrewAgainLauncher.tsx` already gives completed and archived batches a strong repeat flow, but it currently lives inside the existing hero.

Relevant reusable patterns elsewhere:
1. `src/pages/Index.tsx` already uses sectional cards and a concise guided tone.
2. `src/components/batches/BatchCard.tsx` reinforces the repo pattern of:
   - large day number
   - stage badge
   - caution badge
   - one clear next-action summary
3. `src/pages/BatchLineage.tsx` already demonstrates:
   - mobile-first stacked behavior
   - desktop side column behavior
   - clearer section hierarchy than current BatchDetail

## Intended outcome
The redesigned BatchDetail should behave like a hybrid of:
1. Brewing Journal
2. Live Action Cockpit

Recommended top-level product model:
1. `Overview`
2. `Journal`
3. `Assistant`

Target behavior:
1. `Overview` becomes a stage-aware guided surface focused on current state, what to do next, why, reminders, and the current phase.
2. `Journal` becomes the narrative history of the batch, merging stage events, logs, and phase outcomes into brewing chapters.
3. `Assistant` remains batch-aware, but feels like a contextual help surface rather than a miscellaneous extra tab.
4. F2 setup and saved F2 state move into the stage-aware `Overview` flow instead of remaining a separate top-level tab.
5. Prior phase content becomes collapsible once the batch advances.
6. Completed batches pivot from operational guidance to results, reflections, learnings, and Brew Again.
7. Lineage remains present as a small supporting entry point, not a competing primary section.
8. Copy and visual hierarchy become warmer, more practical, and more human, using language like:
   - First Fermentation
   - Second Fermentation
   - brewing journey
   - journal
   - reflection
   - what to do next

Candidate redesign direction:

 Focused hybrid with three top-level surfaces
1. Tab/section model:
   - `Overview`
   - `Journal`
   - `Assistant`
2. Stage-aware behavior:
   - `Overview` changes strongly by stage and carries the live cockpit role.
3. Journal model:
   - dedicated Journal surface with grouped narrative entries and outcomes.
4. F2 integration:
   - F2 setup and saved F2 state live inside `Overview` as the current chapter when relevant.
5. Likely implementation complexity:
   - medium-high, but aligns well with the current code.
6. Tradeoffs:
   - still uses top-level switching, but removes the current clutter and placeholder noise.

## Decision addendum before implementation

1. Final top-level BatchDetail surfaces are locked to:
   - Overview
   - Journal
   - Assistant

2. No additional top-level tabs or placeholder surfaces are allowed in this redesign pass.

3. Navigation behavior is locked:
   - Overview is the default surface for every batch
   - mobile uses a segmented control beneath the hero
   - desktop keeps the same three-surface model rather than introducing different top-level information architecture

4. Journal shaping is locked:
   - group by brewing chapter first, chronological within chapter
   - chapters:
     - First Fermentation
     - Second Fermentation
     - Finish and Reflection
   - phase outcomes must appear as first-class Journal entries
   - do not invent fictional narrative detail beyond current saved data

5. Reminder behavior is locked:
   - unresolved reminders appear above the current phase card
   - reminders are directly actionable on BatchDetail
   - reminder urgency styling must outrank recipe and lineage sections

6. Stage behavior is locked:
   - F1 stages emphasize readiness window, why, reminders, and equal action buttons
   - f2_setup frames the F2 wizard inline within Overview
   - F2 stages show bottle summary, recipe snapshot, current next action, and F2 actions inline
   - prior phase sections collapse by default after stage advancement
   - completed and archived states emphasize results summary, learnings, and Brew Again

7. Copy direction is locked:
   - warmer and more reflective
   - use First Fermentation and Second Fermentation in user-facing copy where practical
   - do not overstate certainty in timing, fermentation, or safety guidance

## Files and systems involved
Likely file touch list for implementation:

Route files:
1. `src/pages/BatchDetail.tsx`
2. Possibly `src/App.tsx` only if route-level lazy loading or imports change, though no route change is expected

Likely new BatchDetail components:
1. `src/components/batch-detail/BatchDetailHero.tsx`
2. `src/components/batch-detail/BatchDetailSegmentedNav.tsx`
3. `src/components/batch-detail/BatchJourneyStrip.tsx`
4. `src/components/batch-detail/BatchCurrentPhaseCard.tsx`
5. `src/components/batch-detail/BatchReminderPanel.tsx`
6. `src/components/batch-detail/BatchJournal.tsx`
7. `src/components/batch-detail/BatchJournalEntry.tsx`
8. `src/components/batch-detail/BatchReflectionPanel.tsx`
9. `src/components/batch-detail/BatchCompletedSummary.tsx`
10. `src/components/batch-detail/BatchPhaseCollapse.tsx`
11. `src/components/batch-detail/BatchOverviewSidebar.tsx` or a similar desktop support component if the final layout uses a secondary column

Existing components likely reused as-is or with minimal adaptation:
1. `src/components/common/StageIndicator.tsx`
2. `src/components/outcomes/PhaseOutcomeCard.tsx`
3. `src/components/outcomes/PhaseOutcomeDrawer.tsx`
4. `src/components/lineage/BatchLineageSection.tsx`
5. `src/components/brew-again/BrewAgainLauncher.tsx`
6. `src/components/ui/button.tsx`
7. `src/components/ui/drawer.tsx`
8. `src/components/common/ScrollReveal.tsx`

Existing components likely reused but reframed:
1. `src/components/f2/F2SetupWizard.tsx`
   - keep domain behavior and persistence orchestration
   - likely wrap it in a stage-aware Overview section instead of presenting it as a top-level tab
2. `src/components/outcomes/PhaseOutcomeCard.tsx`
   - likely reused inside Overview and Journal with surrounding copy and framing changes

Likely new helper/view-model files:
1. `src/lib/batch-detail-view.ts`
2. Possibly `src/lib/batch-journal.ts`

Those helpers should shape:
1. stage-aware hero copy
2. grouped Journal entries from `batch_stage_events`, `batch_logs`, and outcomes
3. chapter visibility and collapse rules
4. completed-batch summary content inputs

Systems involved:
1. `kombucha_batches`
2. `batch_reminders`
3. `batch_stage_events`
4. `batch_logs`
5. `batch_phase_outcomes`
6. current F2 read helpers over:
   - `batch_f2_setups`
   - `batch_f2_bottle_groups`
   - `batch_bottles`
   - `batch_bottle_ingredients`

Expected route/schema impact:
1. No route change is needed.
2. No Supabase migration is expected for the redesign MVP.
3. No generated types update is expected unless implementation later reveals a missing field.

## Risks and compatibility checks
1. The biggest risk is duplicating lifecycle or next-action logic in page-specific components instead of reusing `src/lib/batches.ts`, `src/lib/batch-timing.ts`, and F2 helpers.
2. Moving F2 into `Overview` could accidentally bury important bottle actions if the new sections are not staged carefully.
3. The page already mixes reads, workflow writes, and presentation in `src/pages/BatchDetail.tsx`; a redesign could get harder to maintain unless shaping helpers and components are split intentionally.
4. Journal shaping must keep `batch_stage_events`, `batch_logs`, and phase outcomes chronologically trustworthy.
5. Reminders are currently secondary in the render order; the redesign must not make them less obvious.
6. Completed-batch sections must feel different without hiding lineage, outcomes, or Brew Again.
7. Mobile-first redesign can still become too long if every phase detail stays expanded at once.
8. F2 setup is currently a multi-step wizard; the redesign should frame it better, but should not force a risky rewrite of its persistence logic in the same pass.
9. Copy changes must stay warm without overstating certainty in timing or safety guidance.
10. Validation must keep routing/build behavior green because BatchDetail is a central page and this redesign will likely affect many components.

## Milestones

### Milestone 1: Lock The Redesign Direction And Information Architecture
Goal:
Inspect the current BatchDetail architecture, compare realistic redesign options, and lock the new surface model for this repo.

Acceptance criteria:
1. The plan compares at least three repo-specific redesign directions.
2. The plan chooses one recommended direction and explains why.
3. The final top-level surface model is decided.
4. The plan records whether the redesign is tab-based, inline, or hybrid.

Files expected:
1. `src/pages/BatchDetail.tsx`
2. `src/App.tsx`
3. `src/pages/Index.tsx`
4. `src/pages/MyBatches.tsx`
5. `src/components/batches/BatchCard.tsx`

Validation:
1. Confirm current BatchDetail tab model and placeholder surfaces.
2. Confirm current route shape and no route change requirement.

Status: completed

### Milestone 2: Define The New Overview And Stage-Aware Hero
Goal:
Plan the new top-level page structure, hero behavior, reminder prominence, and current-phase card model.

Acceptance criteria:
1. The plan defines the new hero/status card behavior by stage.
2. The plan defines how reminders and warnings are surfaced prominently.
3. The plan defines the current-phase card for F1, F2, refrigerate/chilled, and completed states.
4. The plan decides the segmented control or tab model for the redesigned page.

Files expected:
1. `src/pages/BatchDetail.tsx`
2. `src/components/common/StageIndicator.tsx`
3. Likely new `src/components/batch-detail/BatchDetailHero.tsx`
4. Likely new `src/components/batch-detail/BatchCurrentPhaseCard.tsx`
5. Likely new `src/components/batch-detail/BatchReminderPanel.tsx`

Validation:
1. Confirm stage-aware copy and next steps still reuse current helpers.
2. Confirm reminder prominence does not require schema changes.

Status: completed

### Milestone 3: Redesign The Journal Surface
Goal:
Define how timeline, logs, and outcomes become a narrative Journal.

Acceptance criteria:
1. The plan defines the new `Journal` surface.
2. The plan defines how `batch_stage_events`, `batch_logs`, and outcomes merge into one story.
3. The plan decides whether entries are grouped by brewing chapter, date, or both.
4. The plan defines how structured entries remain readable without looking like a raw audit log.

Files expected:
1. `src/pages/BatchDetail.tsx`
2. `src/lib/phase-outcomes.ts`
3. Likely new `src/lib/batch-journal.ts`
4. Likely new `src/components/batch-detail/BatchJournal.tsx`
5. Likely new `src/components/batch-detail/BatchJournalEntry.tsx`

Validation:
1. Confirm no existing history sources are dropped.
2. Confirm Journal shaping stays compatible with current `batch_logs` and `batch_stage_events`.

Status: completed

### Milestone 4: Integrate F2 Into The Main Journey Flow
Goal:
Remove F2 as a top-level tab and define how F2 setup, saved setup, and active F2 actions fit into the stage-aware Overview.

Acceptance criteria:
1. The plan removes `F2 & Bottles` as a top-level product surface.
2. The plan defines how F2 setup is launched from First Fermentation when relevant.
3. The plan defines how saved F2 state appears inline in Overview.
4. The plan defines how prior F1 content collapses once the batch advances.

Files expected:
1. `src/pages/BatchDetail.tsx`
2. `src/components/f2/F2SetupWizard.tsx`
3. `src/lib/f2-current-setup.ts`
4. `src/lib/f2-active-actions.ts`
5. Likely new `src/components/batch-detail/BatchPhaseCollapse.tsx`

Validation:
1. Confirm F2 persistence logic stays in existing helpers.
2. Confirm F2 actions remain accessible for `f2_active`, `refrigerate_now`, and `chilled_ready`.

Status: completed

### Milestone 5: Define The Completed-Batch Experience
Goal:
Plan how completed and archived batches shift from operational mode to reflective mode.

Acceptance criteria:
1. The plan defines how completed batches differ from active batches.
2. Results summary, learnings, and Brew Again are prominent.
3. Outcomes are treated as core reflections, not minor metadata.
4. Lineage remains present but secondary.

Files expected:
1. `src/pages/BatchDetail.tsx`
2. `src/components/brew-again/BrewAgainLauncher.tsx`
3. `src/components/outcomes/PhaseOutcomeCard.tsx`
4. `src/components/lineage/BatchLineageSection.tsx`
5. Likely new `src/components/batch-detail/BatchCompletedSummary.tsx`

Validation:
1. Confirm completed/archived batches still preserve access to history, outcomes, and lineage.
2. Confirm no lifecycle data is hidden in a way that makes old batches hard to understand.

Status: completed

### Milestone 6: Lock Layout, Component Boundaries, And Deferrals
Goal:
Define mobile-first layout behavior, desktop enhancements, component splits, helper layers, and deferred ideas.

Acceptance criteria:
1. The plan defines the mobile-first layout model.
2. The plan defines what desktop adds beyond mobile.
3. The plan defines exact likely component boundaries and view-model helpers.
4. The plan records what belongs in the redesign MVP versus later phases.

Files expected:
1. `src/pages/BatchDetail.tsx`
2. Likely new `src/components/batch-detail/*`
3. Likely new `src/lib/batch-detail-view.ts`
4. Possibly `src/components/layout/AppLayout.tsx` only if spacing constraints require it

Validation:
1. Final repo validation commands.
2. Scope check that no schema or lifecycle rule changes were introduced by the plan itself.

Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`.
2. Inspected `src/App.tsx` and confirmed BatchDetail stays on `/batch/:id`.
3. Inspected `src/pages/BatchDetail.tsx` and confirmed the current page is a large single route component with a compact hero, eight top-level tabs, and several placeholders still exposed.
4. Confirmed `Overview` already contains most of the meaningful product behavior:
   - timing guidance
   - workflow actions
   - phase outcomes
   - reminders
   - lineage
   - recipe summary
5. Confirmed `Timeline` already merges `batch_stage_events` and `batch_logs`, but `Logs` remains a placeholder rather than a real surface.
6. Confirmed F2 currently lives behind the top-level `F2 & Bottles` tab through `src/components/f2/F2SetupWizard.tsx`.
7. Inspected `src/pages/MyBatches.tsx`, `src/pages/Index.tsx`, and `src/components/batches/BatchCard.tsx` to understand the repo’s current mobile-first card hierarchy and action-oriented tone.
8. Inspected `src/components/common/StageIndicator.tsx` and confirmed stage/caution badges should be reused rather than redesigned from scratch.
9. Inspected `src/components/outcomes/PhaseOutcomeCard.tsx` and `src/components/outcomes/PhaseOutcomeDrawer.tsx` and confirmed outcomes already support the reflection goals, but are framed as isolated cards rather than part of a journal story.
10. Inspected `src/components/lineage/BatchLineageSection.tsx` and confirmed lineage should remain a compact BatchDetail entry point into the dedicated lineage page.
11. Inspected `src/lib/batches.ts`, `src/lib/batch-timing.ts`, `src/lib/phase-outcomes.ts`, `src/lib/f2-current-setup.ts`, and `src/lib/f2-active-actions.ts` to confirm timing, stage labels, next actions, outcomes, and F2 persistence already live in reusable helpers.
12. Inspected `src/components/brew-again/BrewAgainLauncher.tsx`, `src/lib/lineage.ts`, and `src/pages/BatchLineage.tsx` to confirm completed-batch memory and lineage flows already exist and should be repositioned, not reinvented.
13. Ran baseline validation before planning:
   - `npx tsc -b` passed
   - `npm run lint` passed with 9 pre-existing `react-refresh/only-export-components` warnings only
   - `npm run test` passed
   - `npm run build` passed with an existing chunk-size warning
14. Added `src/lib/batch-detail-view.ts` and `src/lib/batch-journal.ts` so stage-aware hero copy, chapter collapse rules, reminder formatting, and Journal shaping live outside `src/pages/BatchDetail.tsx`.
15. Added new `src/components/batch-detail/*` components for the segmented nav, hero, journey strip, reminder panel, current phase card, collapsible phase sections, Journal, assistant surface, completed summary, and overview orchestration.
16. Replaced the old eight-tab BatchDetail page with the locked three-surface model:
   - `Overview`
   - `Journal`
   - `Assistant`
17. Removed all placeholder top-level tabs from the product surface and moved Second Fermentation into the Overview flow.
18. Made reminders directly actionable on BatchDetail by updating `batch_reminders` inline and removing resolved reminders from the current page state.
19. Merged stage events, log entries, and phase outcomes into the new chapter-based Journal:
   - First Fermentation
   - Second Fermentation
   - Finish & Reflection
20. Kept F2 persistence grounded in the existing flow by rendering `src/components/f2/F2SetupWizard.tsx` inline inside the Overview journey instead of rewriting its persistence logic.
21. Added prior-phase collapsible sections so earlier chapters compress once the batch advances.
22. Added a completed-batch summary with stronger reflection copy and prominent Brew Again placement while keeping lineage secondary.
23. Validation after implementation:
   - `npx tsc -b` passed
   - `npm run lint` passed with the same 9 pre-existing `react-refresh/only-export-components` warnings only
   - `npm run test` passed
   - `npm run build` passed with the same existing bundle chunk-size warning
24. Inspected the shipped redesign files before the refinement pass:
   - `src/pages/BatchDetail.tsx`
   - `src/lib/batch-detail-view.ts`
   - `src/lib/batch-journal.ts`
   - `src/components/batch-detail/*`
   - `src/components/f2/F2SetupWizard.tsx`
   - `src/components/outcomes/PhaseOutcomeCard.tsx`
   - `src/components/outcomes/PhaseOutcomeDrawer.tsx`
25. Traced current `batch_logs` writes in:
   - `src/pages/BatchDetail.tsx`
   - `src/lib/f2-active-actions.ts`
   - `src/lib/f2-persistence.ts`
   - `src/lib/phase-outcomes.ts`
26. Confirmed the repo has `batch_photos` schema and `photo_added` log types, but no actual frontend photo upload/storage path using Supabase Storage or another live upload flow.
27. Added `src/lib/batch-quick-logs.ts` plus hero quick-log UI components so BatchDetail can save compact note and F1 taste-test entries without leaving the page.
28. Refined the hero so the stage-aware message is now the main headline, while the batch name remains visible as supporting context.
29. Added hero quick-log CTAs:
   - Add note for all stages
   - Taste test for `f1_active`, `f1_check_window`, and `f1_extended`
   - no Add Photo CTA because the repo still lacks a real photo upload/storage path
30. Implemented Drawer-based quick logging on BatchDetail:
   - quick notes save to `batch_logs` with `log_type: note_only`
   - F1 taste tests save to `batch_logs` with `log_type: taste_test`
   - both include `structured_payload.stage_at_log` for better Journal chapter assignment
31. Refined Journal shaping so generic note-like logs prefer the saved stage context from `structured_payload.stage_at_log` when present instead of defaulting too aggressively to Finish & Reflection.
32. Reworked Journal titles and bodies so entries read more like a brewing journal and less like telemetry while staying grounded in real saved data.
33. Fixed the duplicate F1 outcome display in Overview by keeping it as the active reflection card during First Fermentation and moving it into the historical F1 memory section only after the batch advances.
34. Refined F2 framing in Overview by keeping the existing wizard/persistence path but giving the inline section warmer chapter framing.
35. Kept reminder completion as a direct `batch_reminders` update only and did not add Journal-visible reminder-completion history because that would risk implying a real brewing action happened when the user may only have checked off a reminder.
36. Validation after the refinement pass:
   - `npx tsc -b` passed
   - `npm run lint` passed with the same 9 pre-existing `react-refresh/only-export-components` warnings only
   - `npm run test` passed
   - `npm run build` passed with the same existing bundle chunk-size warning

## Decision log
1. Recommend a hybrid three-surface BatchDetail model: `Overview`, `Journal`, and `Assistant`.
2. Keep the large day count as part of the redesigned hero.
3. Remove placeholder tabs from the product surface instead of polishing them.
4. Keep `Assistant` as a top-level surface because it already exists, is batch-aware, and supports action-oriented troubleshooting.
5. Move F2 into the stage-aware Overview flow rather than keeping it as a separate top-level tab.
6. Treat outcomes as reflection and memory, with presence in both `Overview` and `Journal`.
7. Keep lineage small on BatchDetail and continue to use the dedicated lineage route for deeper exploration.
8. Prefer new page-level shaping helpers for BatchDetail rather than keeping all orchestration inside one large route file.
9. Avoid schema changes in the redesign MVP unless implementation later proves that current history sources are insufficient.
10. Use a mobile-first three-surface layout everywhere, but add a desktop secondary column in Overview for reflections and lineage.
11. Keep `PhaseOutcomeCard` and `PhaseOutcomeDrawer` close to their existing data model in the redesign pass, and change the surrounding framing before rewriting those components deeply.
12. Keep reminder completion lightweight in MVP by updating `batch_reminders` directly without adding extra log writes.
13. Reuse `F2SetupWizard` inline inside Overview instead of splitting its saved-view and setup-view code in the same pass.
14. Skip new schema work; the redesign ships entirely on existing batch, reminder, lineage, F2, and phase-outcome reads/writes.
15. Do not ship a fake Add Photo CTA in BatchDetail because the repo still lacks a real frontend upload/storage path.
16. Use `batch_logs` plus `structured_payload.stage_at_log` for quick note and taste-test capture so Journal chapter placement can improve without schema changes.
17. Keep quick Taste Test as a capture action only; it must not change stage by itself.
18. Do not add Journal-visible reminder-completion history in this pass because completing a reminder is not always the same as performing the underlying brewing action.

## Open questions
1. `F2SetupWizard` now sits inline in Overview to avoid duplicating persistence behavior, but a later pass could still split its saved-state view from its setup flow if the section feels too long in practice.
2. The repo still has no real frontend photo upload/storage flow, so photo capture remains deferred until a genuine path is added.

## Done when
1. The plan clearly compares three realistic redesign directions and recommends one.
2. The final top-level BatchDetail surface model is defined.
3. The plan states exactly how Overview changes by stage.
4. The plan states exactly what the new Journal contains and how it is shaped from current history sources.
5. The plan states exactly how Assistant fits into the redesigned page.
6. The plan removes `F2 & Bottles` as a top-level design direction and defines how F2 moves into the Overview journey flow.
7. The plan defines how completed batches become more reflective and Brew Again-forward.
8. The plan lists likely file touches, likely new components, likely helper/view-model additions, and expected validation commands.
9. The plan records the current validation baseline and distinguishes the pre-existing lint warnings from actual failures.

## Final validation
Use the repo commands from `AGENTS.md` during implementation milestones and again at the end:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Current baseline before redesign work:
1. `npx tsc -b` passes
2. `npm run lint` passes with 9 pre-existing `react-refresh/only-export-components` warnings only
3. `npm run test` passes
4. `npm run build` passes with an existing bundle chunk-size warning
