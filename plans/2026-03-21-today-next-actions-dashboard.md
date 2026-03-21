# Today / Next Actions Dashboard

## Summary
Plan the first implementation of a dedicated Today / Next Actions dashboard that helps users see which kombucha batches need attention today, which ones should be checked soon, and which were updated recently, without duplicating lifecycle or next-action rules in UI components.

## Why
The current home dashboard in `src/pages/Index.tsx` shows urgent reminders, summary stats, and a flat list of active batches, but it does not organize work by what the user should do today. The app already has batch lifecycle, timing, reminders, and next-action helpers; this feature should turn those existing signals into a more actionable cross-batch view for beginners.

## Scope
In scope for the first pass:
1. Evolve the existing protected home route `/` in `src/pages/Index.tsx` into the Today / Next Actions dashboard rather than adding a second top-level dashboard route.
2. Group active batch items into beginner-friendly sections such as `Do now`, `Check soon`, `Ready now`, `Overdue`, and `Recently updated`.
3. Show per-batch cards with batch name, current stage, timing/status summary, one primary next action, caution badge if relevant, and navigation to `/batch/:id`.
4. Reuse `getNextAction`, `getBatchStageTiming`, `StageIndicator`, and `CautionBadge`.
5. Reuse reminder data from `batch_reminders` for urgency and action grouping where it strengthens what the timing helper already says.
6. Keep grouping and classification logic out of the page component by introducing a small shared dashboard-specific helper.

Explicitly out of scope for MVP:
1. New Supabase schema, migrations, RPCs, or views.
2. Editing reminders from the dashboard.
3. Inline batch actions from the dashboard such as starting F2 or marking a batch complete.
4. Per-batch timeline fetches or a dashboard activity feed built from `batch_timeline_view`.
5. Reworking `MyBatches` sorting/filtering beyond linking into the existing batch detail flow.

Recommended MVP scope:
1. Keep the route at `/` and update `src/pages/Index.tsx`.
2. Add a small domain helper to classify batches into dashboard sections using existing batch fields, `getBatchStageTiming`, `getNextAction`, `updated_at`, and loaded reminders.
3. Add one reusable Today-action card component rather than extending `BatchCard` with dashboard-specific layout.
4. Expand the existing dashboard batch query to include `f2_started_at` and `next_action` so timing and primary action can be computed without fallback gaps.

Recommended deferrals:
1. A separate `/today` route or new nav item.
2. Backend-shaped dashboard data via a new view/RPC.
3. Activity-feed enrichment from `batch_timeline_view`, `latest_log_at`, or `latest_photo_at`.
4. One-click reminder completion or workflow actions from dashboard cards.

## Current state
Relevant flow today:
1. Route structure lives in `src/App.tsx`. `/` renders `src/pages/Index.tsx`, `/batches` renders `src/pages/MyBatches.tsx`, and `/batch/:id` renders `src/pages/BatchDetail.tsx`.
2. `src/components/layout/AppLayout.tsx` already treats `/` as the primary home destination in both mobile and desktop navigation.
3. `src/pages/Index.tsx` currently loads `kombucha_batches` and `batch_reminders`, shows `Needs Attention`, summary stats, a flat `Active Batches` list, and `Quick Log`.
4. The current home page does not call `getBatchStageTiming` or `getNextAction`; it relies on a broad flat list and reminder urgency.
5. `src/components/batches/BatchCard.tsx` already shows batch name, current stage, caution badge, brew day number, and one next action via `getNextAction`, and navigates to `/batch/:id`.
6. `src/lib/batches.ts` defines the current stage model and central next-action fallback text:
   `f1_active`, `f1_check_window`, `f1_extended`, `f2_setup`, `f2_active`, `refrigerate_now`, `chilled_ready`, `completed`, `archived`, `discarded`.
7. `src/lib/batch-timing.ts` derives F1/F2 timing status for active fermentation stages and returns `status`, `statusLabel`, `guidance`, `nextActionLabel`, and `nextCheckText`.
8. `src/pages/BatchDetail.tsx` is the current richest action-oriented batch screen. It already combines `getBatchStageTiming`, reminder data from `batch_reminders`, and stage/timeline context from `batch_stage_events` and `batch_logs`.
9. `src/components/common/StageIndicator.tsx` and `src/components/common/StageIndicator.tsx` `CautionBadge` already provide reusable stage and risk display.
10. `src/lib/f2-active-actions.ts` and `src/lib/f2-persistence.ts` show that stage and next-action changes are persisted on `kombucha_batches` and usually accompanied by `batch_logs` and sometimes `batch_stage_events`.

Current query/data details that matter:
1. `src/pages/Index.tsx` currently selects `kombucha_batches` rows without `f2_started_at` or `next_action`, which means it cannot fully reuse `getBatchStageTiming` for F2 and cannot respect persisted custom next actions.
2. `src/pages/Index.tsx` already loads `batch_reminders` with joined batch names and computes an `overdue` urgency label client-side.
3. Supabase already exposes `batch_dashboard_view`, but that view does not include `f2_started_at`, `starter_liquid_ml`, `total_volume_ml`, or `target_preference`, so it is not enough by itself for the existing timing helper.
4. Supabase also exposes `batch_timeline_view`, plus `latest_log_at` and `latest_photo_at` via `batch_dashboard_view`, but the current app does not use those in the home dashboard.

## Intended outcome
The home dashboard at `/` should become a Today / Next Actions view that:
1. Keeps the app beginner-friendly by answering “what should I do today?” before “what batches exist?”
2. Groups active batches into action-oriented sections driven by existing lifecycle, timing, and reminder signals.
3. Uses one primary next action per batch from central logic, not component-local copies.
4. Shows enough timing context to explain why a batch appears in a section.
5. Navigates users into the existing batch detail page for deeper context, reminders, timeline, and stage-specific actions.
6. Leaves stage transitions, history writes, and detailed workflow actions in existing detail/F2 flows rather than duplicating them on the dashboard.

Recommended section rules for MVP:
1. `Overdue`: batches with overdue reminders or timing status `overdue`.
2. `Do now`: batches with an active reminder due today or a stage/next action that clearly needs action today, such as `refrigerate_now` or timing status `ready`.
3. `Ready now`: batches in a ready timing window that are not already escalated to `Overdue` or `Do now`.
4. `Check soon`: batches with timing status `approaching` or reminders due soon.
5. `Recently updated`: recently changed active batches not already surfaced above, using `updated_at`.

Section naming is still a small product decision. The feature brief’s labels are good enough for planning, but exact display copy can be refined during implementation.

## Files and systems involved
Route files:
1. `src/App.tsx`
2. `src/pages/Index.tsx`
3. `src/pages/BatchDetail.tsx`
4. `src/pages/MyBatches.tsx`

Shared components:
1. `src/components/layout/AppLayout.tsx`
2. `src/components/batches/BatchCard.tsx`
3. `src/components/common/StageIndicator.tsx`
4. Likely new: `src/components/dashboard/TodayActionCard.tsx`
5. Likely new: `src/components/dashboard/TodayActionSection.tsx`

Domain helpers in `src/lib`:
1. `src/lib/batches.ts`
2. `src/lib/batch-timing.ts`
3. Likely new: `src/lib/today-actions.ts` or similarly named helper for grouping/classification
4. `src/lib/f2-active-actions.ts`
5. `src/lib/f2-persistence.ts`

Context files:
1. `src/contexts/UserContext.tsx`

Supabase tables and views:
1. `kombucha_batches`
2. `batch_reminders`
3. `batch_stage_events`
4. `batch_logs`
5. `batch_dashboard_view`
6. `batch_timeline_view`

Generated types:
1. `src/integrations/supabase/types.ts`
2. `src/integrations/supabase/client.ts`

No migration files are expected for MVP.

## Risks and compatibility checks
1. Duplicated lifecycle logic: if section grouping hardcodes stage meanings in components, it will drift from `getNextAction`, `getBatchStageTiming`, and batch detail behavior.
2. Stale next-action text: `getNextAction` respects persisted `batch.nextAction`, but the current home query does not fetch `next_action`, so MVP must fix that before relying on it.
3. Incomplete F2 timing: `getBatchStageTiming` needs `f2_started_at` for `f2_active`; the current home query omits it.
4. Conflicting urgency sources: reminders and timing can disagree; the grouping helper must define precedence once and reuse it consistently.
5. Beginner confusion: too many sections or repeated cards will make the dashboard feel noisy. MVP should keep clear precedence so each batch appears once.
6. Performance: fetching all active batches plus reminders is acceptable for MVP, but per-batch timeline queries or N+1 detail fetches should be avoided.
7. Recently updated ambiguity: `updated_at` exists and is cheap to use, but it does not distinguish whether the update came from a stage change, note, or reminder. MVP should label this as recent activity, not detailed history.
8. Timeline/history consistency: dashboard cards must summarize action state, but the source of truth for history remains `batch_stage_events` and `batch_logs` in detail pages.
9. Existing saved data: no schema changes are planned, so compatibility risk is low if MVP only reads existing batch and reminder data.

Required compatibility checks for this repo:
1. Batch stage consistency across `src/lib/batches.ts`, `src/lib/batch-timing.ts`, `src/pages/BatchDetail.tsx`, and the new dashboard helper.
2. Next-action consistency with `getNextAction` and any persisted `next_action`.
3. Reminder urgency mapping consistency with current `Index.tsx` and `BatchDetail.tsx`.
4. No dashboard-only stage or timing rules embedded in JSX.
5. No changes to F2 persistence tables or flows in MVP.

## Milestones

### Milestone 1: Confirm dashboard placement and data sources
Goal:
Decide where the Today / Next Actions view should live and what existing queries/helpers can support it.
Acceptance criteria:
1. Route decision is documented.
2. Existing reusable helpers/components are identified.
3. Required batch and reminder fields for MVP are listed.
4. A clear decision is made on client-side computation vs backend shaping.
Files expected:
1. `src/App.tsx`
2. `src/pages/Index.tsx`
3. `src/components/layout/AppLayout.tsx`
4. `src/lib/batches.ts`
5. `src/lib/batch-timing.ts`
6. `src/integrations/supabase/types.ts`
Validation:
1. Inspect route definitions and nav destinations.
2. Inspect current dashboard batch/reminder selects.
3. Confirm helper inputs needed for timing and next-action generation.
Status: completed

### Milestone 2: Design the dashboard domain model and section precedence
Goal:
Define the client-side classification shape so the page can render action sections without duplicating lifecycle rules.
Acceptance criteria:
1. A planned helper shape exists for a dashboard item and section buckets.
2. Precedence rules are documented so each batch appears only once.
3. Reminder, timing, stage, and update-time signals are combined intentionally.
4. MVP and deferred scope are separated clearly.
Files expected:
1. Likely new `src/lib/today-actions.ts`
2. `src/lib/batches.ts`
3. `src/lib/batch-timing.ts`
4. `src/pages/Index.tsx`
Validation:
1. Verify the helper can be driven entirely from loaded batch rows plus reminder rows.
2. Verify no new backend shape is required for MVP.
Status: completed

### Milestone 3: Plan page/component changes and navigation path
Goal:
Define the minimal UI/file changes needed to deliver the dashboard cleanly within the existing app structure.
Acceptance criteria:
1. The page route and file changes are listed concretely.
2. Reuse of `StageIndicator`, `CautionBadge`, and existing navigation to `/batch/:id` is documented.
3. The plan identifies whether `BatchCard` should be reused directly or whether a dashboard-specific card is cleaner.
4. The plan states whether `Quick Log` and other current dashboard sections stay, move, or are deferred.
Files expected:
1. `src/pages/Index.tsx`
2. `src/components/batches/BatchCard.tsx`
3. Likely new `src/components/dashboard/TodayActionCard.tsx`
4. Likely new `src/components/dashboard/TodayActionSection.tsx`
Validation:
1. Check the current home page layout and action density against the new dashboard goal.
2. Confirm route/nav impact stays minimal.
Status: completed

### Milestone 4: Validate implementation constraints and baseline checks
Goal:
Record the validation path and current baseline blockers before implementation work starts.
Acceptance criteria:
1. End-of-work validation commands are documented.
2. Known baseline failures are recorded as pre-existing.
3. Any sandbox-only validation limits are distinguished from actual repo command availability.
Files expected:
1. `package.json`
2. `tsconfig.json`
3. `PLANS.md`
Validation:
1. Confirm repo commands exist.
2. Record baseline failures without attributing them to this feature.
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`.
2. Inspected route structure in `src/App.tsx`.
3. Inspected current home dashboard in `src/pages/Index.tsx`.
4. Inspected batch list and detail flows in `src/pages/MyBatches.tsx` and `src/pages/BatchDetail.tsx`.
5. Confirmed current stage model and fallback next-action logic in `src/lib/batches.ts`.
6. Confirmed timing/status helper inputs and outputs in `src/lib/batch-timing.ts`.
7. Inspected reusable display components in `src/components/batches/BatchCard.tsx` and `src/components/common/StageIndicator.tsx`.
8. Inspected persisted F2 next-action updates in `src/lib/f2-active-actions.ts`.
9. Confirmed `batch_dashboard_view`, `batch_timeline_view`, and reminder-count functions exist in Supabase types and migrations.
10. Confirmed `plans/` exists as a directory and is valid for storing this plan.
11. Added `src/lib/today-actions.ts` to centralize section grouping, timing reuse, and reminder precedence for the dashboard.
12. Validated Milestone 2: baseline `tsc` and `lint` failures are unchanged, and sandbox `test`/`build` `EPERM` failures are unchanged.
13. Added `src/components/dashboard/TodayActionCard.tsx` and `src/components/dashboard/TodayActionSection.tsx` for dashboard-specific presentation while reusing shared stage/risk helpers.
14. Reworked `src/pages/Index.tsx` to render grouped Today / Next Actions sections from the shared helper instead of a flat active-batch list.
15. Extended the home dashboard batch query with `f2_started_at` and `next_action` so timing and persisted next actions can be reused correctly.
16. Validated Milestone 3: `tsc` failures remain the same pre-existing ones, sandbox `test`/`build` failures remain the same `EPERM`s, and lint improved because the previous `src/pages/Index.tsx` `no-explicit-any` errors were removed.

## Decision log
1. Recommended route/page location: keep the Today / Next Actions dashboard on the existing protected `/` route and evolve `src/pages/Index.tsx`. This matches current nav behavior in `AppLayout` and avoids adding another top-level dashboard concept.
2. Recommended computation model for MVP: compute sections client-side from existing batch rows plus reminder rows. Existing helpers already cover timing and next-action logic, and no new schema is required.
3. Recommended query change for MVP: extend the existing `kombucha_batches` select on the home dashboard to include at least `f2_started_at` and `next_action`. Without those fields, `getBatchStageTiming` and `getNextAction` cannot be reused correctly.
4. Recommended reuse path: use `getNextAction`, `getBatchStageTiming`, `StageIndicator`, `CautionBadge`, and existing navigation to `/batch/:id` instead of adding dashboard-only stage labels or action strings.
5. Recommended UI reuse boundary: do not overload `BatchCard` with section-specific timing text and badges. A small dashboard-specific card component will likely be cleaner while still reusing shared stage/risk helpers.
6. Recommended handling of history context for MVP: do not query `batch_timeline_view` yet. Use `updated_at` for `Recently updated` and keep detailed history in `BatchDetail`.
7. Recommended backend decision: do not introduce a new Supabase view or RPC for MVP. `batch_dashboard_view` is useful context, but it is missing fields needed for the current timing helper.
8. Implemented Milestone 2 with a dedicated `src/lib/today-actions.ts` helper rather than embedding section rules in `src/pages/Index.tsx`.
9. For MVP, section precedence is `Overdue` -> `Do now` -> `Ready now` -> `Check soon` -> `Recently updated`, with each batch appearing once.
10. For MVP, `Do now` is driven by `refrigerate_now`, `f2_setup`, or reminders due today; `Ready now` is driven by timing status `ready` or `chilled_ready`.
11. For MVP, `Check soon` includes timing status `approaching` and reminders due within 2 days.
12. For MVP, `Recently updated` uses a 24-hour `updated_at` window.
13. Kept the existing `/` route and existing app navigation unchanged; the feature is implemented by evolving `src/pages/Index.tsx`.
14. Kept `Quick Log` and the beginner guides callout on the home page for the first pass, but moved the main focus above them to Today / Next Actions sections.
15. Replaced the old flat active-batch list on the home page with grouped dashboard sections rather than trying to make `BatchCard` handle dashboard-only timing summaries.

## Open questions
None at the moment.

## Done when
1. The implementation route is decided and documented as the existing `/` dashboard in `src/pages/Index.tsx`.
2. Existing reusable helpers, components, and Supabase reads are identified concretely.
3. The plan names the exact additional fields the current home query must fetch for MVP.
4. The plan clearly states that MVP should be computed client-side from existing batch and reminder data.
5. The plan defines MVP section precedence and the minimum new helper/component surface needed.
6. Deferred enhancements are listed so the first implementation pass stays small.
7. Risks around duplicated logic, stale state, and performance are documented.

## Final validation
Default repo checks for the eventual implementation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build` when routing, build behavior, or production bundle output is affected

Baseline status observed before implementation:
1. `npx tsc -b` currently fails before this feature due to existing TypeScript errors including `replaceAll` usage in `src/components/f2/F2SetupWizard.tsx` and a missing `guides` reference in `src/pages/GuideDetail.tsx`.
2. `npm run lint` currently fails before this feature due to existing lint issues in multiple files, including `src/components/ui/command.tsx`, `src/components/ui/textarea.tsx`, `src/integrations/supabase/types.ts`, `src/pages/BatchDetail.tsx`, `src/pages/Index.tsx`, `src/pages/MyBatches.tsx`, `src/pages/NewBatch.tsx`, and `tailwind.config.ts`.
3. `npm run test` is a valid repo command, but in this sandbox it fails with `spawn EPERM` while loading Vite/esbuild config.
4. `npm run build` is a valid repo command, but in this sandbox it fails with `spawn EPERM` while loading Vite/esbuild config.

Implementation should distinguish these pre-existing failures from any new issues introduced by the Today / Next Actions dashboard work.
