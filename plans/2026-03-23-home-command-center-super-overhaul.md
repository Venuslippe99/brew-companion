# Home Command Center Super Overhaul

## Summary
Plan a full overhaul of the protected Home route at `/` so it becomes Kombloom's daily command center: a visually ambitious, mobile-first, beginner-friendly surface that answers what matters now, what is coming next, how active brews are doing, what can be logged quickly, and what changed recently without duplicating `MyBatches` or `BatchDetail`.

## Why
The current Home page in [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx) is a solid MVP for Today / Next Actions, but it still reads as a sectioned dashboard rather than the primary operational surface for the app. It fetches the right foundational data and already uses shared timing and next-action logic through `buildTodayActionSections(...)`, yet it does not establish a clear page hierarchy, a decisive first focus, a compact full-roster overview, or a real quick-log workflow. The product direction for Kombloom calls for a warm, calm, beginner-first command center that helps non-expert brewers feel oriented and supported every time they open the app. This overhaul is needed to:
1. Make `/` feel like the intentional center of the product rather than a holding page.
2. Turn existing batch, reminder, timing, and history signals into a guided daily workflow.
3. Preserve lifecycle safety and shared brewing logic while improving the visual system and page orchestration.
4. Give Home a meaningful role that is distinct from inventory management in `MyBatches` and deep per-batch work in `BatchDetail`.

## Scope
In scope for the first implementation pass:
1. Keep `/` as the protected Home route and evolve [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx) into the new command center.
2. Introduce a page-level Home orchestration helper, recommended as [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts), to derive a command-center view model from existing batch, reminder, timing, and recent-activity data.
3. Redesign the Home structure around these major surfaces:
   1. Command Header
   2. Primary Focus Card
   3. System Snapshot Strip
   4. Action Lanes
   5. Batch Roster
   6. Quick Log Dock
   7. Recent Movement Feed
   8. Contextual Support Panel
4. Add a Home-specific component namespace, recommended as `src/components/home/`, so the page can adopt a cohesive visual language without overloading batch-list or dashboard MVP components.
5. Reuse shared helpers from [src/lib/batches.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\batches.ts) and [src/lib/batch-timing.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\batch-timing.ts) instead of re-encoding stage meaning or timing guidance in JSX.
6. Replace decorative Quick Log actions with real, bounded entry points that route into safe existing logging flows rather than hidden lifecycle mutations.
7. Add a cross-batch recent-movement strategy that remains lightweight, readable, and compatible with existing `batch_stage_events` and `batch_logs`.
8. Define a Home-specific visual system built on the existing theme tokens in [tailwind.config.ts](C:\Users\Dario\Documents\GitHub\brew-companion\tailwind.config.ts) and [src/index.css](C:\Users\Dario\Documents\GitHub\brew-companion\src\index.css).
9. Define mobile-first behavior section by section, including safe spacing above the existing fixed mobile nav.

Explicitly out of scope for the first implementation pass unless a later milestone re-justifies them:
1. New schema, migrations, RPCs, or backend write paths.
2. Changes to lifecycle rules, fermentation timing formulas, carbonation thresholds, or next-action text just to fit new visuals.
3. Moving complex stage transitions, F2 setup, reminder editing, or other deep per-batch workflow operations out of `BatchDetail`.
4. Turning Home into a second inventory page with the same search, filters, and sorting responsibilities as `MyBatches`.
5. Turning Home into a shallow clone of `BatchDetail` with per-batch hero, segmented navigation, or deep journal controls.
6. Broad redesigns of unrelated routes such as `MyBatches`, `BatchDetail`, `Guides`, or the global app shell beyond lightweight supporting adjustments required by the new Home.
7. Replacing the global app theme system wholesale; this plan should evolve the current honey / amber / sage / tea language rather than discard it.
8. Full cross-batch journal analytics, heavy history reporting, or long-form assistant workflows on Home.
9. Photo upload infrastructure changes if the current quick-log/photo path is not ready; in that case the visual affordance should be deferred or routed into an existing safe entry point.

## Current state
1. Route placement:
   [src/App.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\App.tsx) already makes `/` the protected Home route by rendering `Index` inside `ProtectedRoute`. This is the current destination for users after sign-in.
2. Navigation role:
   [src/components/layout/AppLayout.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\layout\AppLayout.tsx) treats `/` as the primary Home destination in both the mobile bottom nav and desktop sidebar. The mobile nav is fixed at the bottom and already uses the `pb-safe` spacing model, which means Home sections need careful bottom spacing and touch-target placement.
3. Current Home page:
   [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx) already acts as a first-pass dashboard. It loads `kombucha_batches` and `batch_reminders`, maps database rows into `KombuchaBatch[]`, builds grouped sections via `buildTodayActionSections(...)`, shows summary stats, renders Today / Next Actions, shows a visually present Quick Log strip, and conditionally shows a beginner guide callout.
4. Current Home reads:
   `Index.tsx` currently selects `kombucha_batches` fields needed to build `KombuchaBatch` values, including `f2_started_at` and `next_action`, and separately selects incomplete reminders from `batch_reminders`. It does not currently read `batch_stage_events` or `batch_logs`, so the page has no cross-batch narrative layer yet.
5. Current grouped action model:
   [src/lib/today-actions.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\today-actions.ts) currently classifies active batches into five internal groups: `overdue`, `do_now`, `ready_now`, `check_soon`, and `recently_updated`. It already reuses `getNextAction(...)`, `getStageLabel(...)`, and `getBatchStageTiming(...)`, which is good and should be preserved, but its output is shaped around the current dashboard sections rather than the broader needs of a full command center.
6. Current dashboard rendering layer:
   [src/components/dashboard/TodayActionCard.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\dashboard\TodayActionCard.tsx) renders a batch-focused action card using `StageIndicator`, `CautionBadge`, summaries, and a next-action block. [src/components/dashboard/TodayActionSection.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\dashboard\TodayActionSection.tsx) wraps those cards under section titles and descriptions. These components are useful as product proof, but visually and structurally they are tuned to the current dashboard MVP rather than a more coherent Home surface system.
7. Current inventory page:
   [src/pages/MyBatches.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\MyBatches.tsx) already owns the broader inventory workflow: tabs by batch status, search, sorting, larger scrolling lists, and reuse of `BatchCard` for browse-and-open behavior. This page is where users go to find all batches, not where they should decide the day.
8. Current batch card role:
   [src/components/batches/BatchCard.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\batches\BatchCard.tsx) already renders a rich browse card with stage badge, caution badge, brew day number, next-action summary, tea type, room temperature, and volume. It is a good inventory card, but it is too broad and list-oriented to be the default compact roster unit for the new Home.
9. Current per-batch operational surface:
   [src/pages/BatchDetail.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\BatchDetail.tsx) is already the richer operational screen. It loads one batch, reminders, timeline entries from `batch_stage_events` and `batch_logs`, phase outcomes, lineage, and current F2 setup; it also supports quick logs, outcome logging, reminder completion, workflow transitions, and F2 entry points. The new Home must not absorb that responsibility.
10. Shared lifecycle and timing logic:
   [src/lib/batches.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\batches.ts) defines the central stage model, day count helper, stage labels, and next-action fallback text. [src/lib/batch-timing.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\batch-timing.ts) derives F1/F2 timing windows, timing status, guidance, and next-check text. These files are the shared rule sources that Home should continue to consume rather than bypass.
11. Current theme foundation:
   [tailwind.config.ts](C:\Users\Dario\Documents\GitHub\brew-companion\tailwind.config.ts) and [src/index.css](C:\Users\Dario\Documents\GitHub\brew-companion\src\index.css) already provide a warm foundation: honey, amber, sage, tea, copper, warm cream neutrals, Fraunces display, Outfit body, rounded radius tokens, and subtle motion primitives such as `fade-in`, `slide-up`, and `scale-in`. The problem is not missing tokens; it is that Home does not yet apply them with enough hierarchy or discipline.
12. Current Quick Log weakness:
   `Index.tsx` shows a horizontal Quick Log strip with actions such as Taste Test, Temp Check, pH Check, Add Photo, and Add Note, but those actions are decorative right now. They do not yet lead into real logging flows, which weakens the command-center promise.
13. Current visual limitations:
   The existing Home is readable but visually flat. Summary stats, action sections, quick actions, and beginner support all use similar card treatment and similar typographic energy, so the page does not clearly say what the single most important thing is today.
14. Current user-state handling:
   `Index.tsx` handles `loading`, `no active batches`, and `nothing needs attention right now`, but it does not yet fully differentiate urgent, normal, and quiet active days with page-level tone, dominant focus, or contextual support.

## Intended outcome
The new Home should remain the protected route at `/`, but it should feel like Kombloom's command center rather than a basic dashboard. The page should answer these questions in order:
1. What matters most right now.
2. What else is approaching.
3. Which brews are moving well, stalled, or risky.
4. What can I log quickly.
5. What changed recently.

The target behavior by section:
1. Command Header:
   Show a greeting, date context, active brew count, settings shortcut, and one concise state sentence driven by current Home data. Examples: `1 brew needs attention today`, `Your brews look calm today`, `2 batches are in tasting range`.
2. Primary Focus Card:
   Show exactly one surfaced batch or one intentional empty-state focus. Include batch name, stage badge, day count, surfaced reason, short explanation, one primary CTA, and one secondary CTA. This surface is the top-priority object for the day, derived from shared timing, reminder, and next-action logic rather than editorial guesswork.
3. System Snapshot Strip:
   Show compact, high-signal tiles for `Active brews`, `Needs attention today`, `In tasting or carbonation window`, and `Recent activity`. These should act as tap targets and section shortcuts on Home rather than generic counts.
4. Action Lanes:
   Present grouped work in three clearer user-facing lanes: `Now`, `Next up`, and `Recently moved`. Internally, the data model may still use more granular precedence; the display language should stay simpler.
5. Batch Roster:
   Show all active brews in a concise situational roster so calm batches remain visible even when not urgent. Each item should show batch name, stage, day count, and one short status line. This should be materially lighter than `BatchCard`.
6. Quick Log Dock:
   Replace decorative logging actions with real contextual logging entry points such as `Taste test`, `Temperature check`, `Carbonation check`, `Add note`, and `Add photo`, while keeping lifecycle mutations out of Home.
7. Recent Movement Feed:
   Show a concise cross-batch narrative feed derived from existing stage events and logs, written as human activity updates rather than raw telemetry.
8. Contextual Support Panel:
   Connect guides and assistant entry points to the surfaced work. Home should offer support that matches the current focus rather than showing only a generic beginner callout.

The target behavior by user state:
1. Urgent day:
   The page should feel decisive, not chaotic. The Primary Focus Card should elevate the highest-priority batch immediately, the state sentence should be explicit about attention needed, the `Now` lane should appear above all supporting sections, and visual urgency should use restrained red only where true safety or overdue pressure exists.
2. Normal active day:
   The page should feel organized and reassuring. One batch still gets focus, but the rest of the page should communicate that multiple brews are progressing, that upcoming windows are visible, and that the user is not behind.
3. Quiet day:
   The page should feel calm and still worth opening. The Primary Focus Card should shift to a reassuring quiet-state message or the most relevant upcoming batch, the support panel should become more prominent, and the roster plus recent movement should make the app feel alive rather than empty.
4. No active batches:
   The page should stop pretending to be a dashboard. It should become a launch surface with a welcoming Home composition, clear CTA to start a batch, optional guide support, and no misleading empty command-center chrome.

The target visual direction:
1. Mood:
   Modern apothecary journal. Warm, calm, tactile, refined, quietly premium, and beginner-friendly.
2. Typography:
   Fraunces should be used for the page title and a few high-value moments only. Outfit should carry the operational UI, summaries, lane labels, controls, and dense data.
3. Color:
   Honey should anchor emphasis and active CTA states. Sage should signal steady healthy progress. Amber and copper should support warmth and editorial accenting. Mineral and warm neutral surfaces should carry dense information. Red should stay rare and only mark real urgency.
4. Surface hierarchy:
   The page should clearly distinguish canvas background, hero surfaces, utility cards, support surfaces, and dense operational rows. The Home may need a small surface utility layer or Home-only card classes to achieve this consistently.
5. Motion:
   Use the existing subtle motion primitives in a calm way. No flashy analytics-dashboard behavior, no jitter, no excessive hover theatrics.

The target mobile-first behavior:
1. Narrow portrait layout should be the primary design context.
2. Sections should stack in a deliberate order with generous vertical rhythm.
3. Touch targets must remain comfortable, especially near the fixed bottom nav.
4. The page must respect `pb-safe` and add enough bottom breathing room so critical controls never sit flush against the nav.
5. Horizontal scroll should be minimized for core workflows; it is acceptable only for secondary utilities if it materially improves clarity.
6. Density should be reduced by content strategy, not just by changing columns.
7. Major sections may render differently by breakpoint:
   1. Primary Focus Card should remain single-column across sizes.
   2. Snapshot Strip should be a 2x2 grid on mobile and a single-row strip or four-column grid on larger screens.
   3. Action Lanes should stay stacked and readable on mobile, with no side-by-side lane compression.
   4. Batch Roster should use compact stacked cards or a concise grid, not a wide horizontal shelf by default.
   5. Quick Log Dock should prefer a two-row utility grid on mobile over a chip carousel unless the final implementation proves a scroll strip is clearer.
   6. Recent Movement should remain concise and readable, with timestamps and metadata visually subordinate.

## Files and systems involved
Route files:
1. [src/App.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\App.tsx)
2. [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx)
3. [src/pages/MyBatches.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\MyBatches.tsx)
4. [src/pages/BatchDetail.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\BatchDetail.tsx)

Layout files:
1. [src/components/layout/AppLayout.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\layout\AppLayout.tsx)

Current Home files:
1. [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx)

Current dashboard-specific files:
1. [src/components/dashboard/TodayActionCard.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\dashboard\TodayActionCard.tsx)
2. [src/components/dashboard/TodayActionSection.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\dashboard\TodayActionSection.tsx)
3. [src/lib/today-actions.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\today-actions.ts)

Shared batch and timing helpers:
1. [src/lib/batches.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\batches.ts)
2. [src/lib/batch-timing.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\batch-timing.ts)
3. Existing timeline/journal shaping references in `src/lib/batch-journal.ts`, `src/lib/batch-detail-view.ts`, and related detail helpers should be inspected during implementation even though they were not required for this planning task.

Shared components likely reused:
1. `StageIndicator` and `CautionBadge` from `src/components/common/StageIndicator.tsx`
2. Shared buttons, cards, and utility primitives in `src/components/ui/`
3. `ScrollReveal` only if its use still fits the calmer command-center motion tone

Proposed new Home components:
1. [src/components/home/HomeHeader.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeHeader.tsx)
2. [src/components/home/HomePrimaryFocusCard.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomePrimaryFocusCard.tsx)
3. [src/components/home/HomeSnapshotStrip.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeSnapshotStrip.tsx)
4. [src/components/home/HomeActionLanes.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeActionLanes.tsx)
5. [src/components/home/HomeBatchRoster.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeBatchRoster.tsx)
6. [src/components/home/HomeQuickLogDock.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeQuickLogDock.tsx)
7. [src/components/home/HomeRecentMovement.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeRecentMovement.tsx)
8. [src/components/home/HomeSupportPanel.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeSupportPanel.tsx)
9. Optional small helpers such as `HomeSectionShell`, `HomeRosterItem`, or `HomeEmptyState` if the page benefits from consistent framing

Proposed new Home orchestration helpers:
1. [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts)
2. Optional supporting types in [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts) or a nearby file if type volume grows

Context files:
1. [src/contexts/UserContext.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\contexts\UserContext.tsx) for greeting/support personalization and beginner-state behavior
2. [src/contexts/AuthContext.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\contexts\AuthContext.tsx) only if needed for logging or support shortcuts

Styling and theme files:
1. [tailwind.config.ts](C:\Users\Dario\Documents\GitHub\brew-companion\tailwind.config.ts)
2. [src/index.css](C:\Users\Dario\Documents\GitHub\brew-companion\src\index.css)

Supabase tables and reads to preserve or extend:
1. `kombucha_batches`
2. `batch_reminders`
3. `batch_stage_events`
4. `batch_logs`
5. Existing reads in `Index.tsx`
6. Existing detail-page timeline merge logic in `BatchDetail.tsx`

Generated types:
1. [src/integrations/supabase/types.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\integrations\supabase\types.ts)
2. [src/integrations/supabase/client.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\integrations\supabase\client.ts)

Schema and migrations:
1. No migration is recommended for the first pass.
2. Relevant `supabase/migrations` files should still be inspected during implementation if any planned recent-movement read appears to depend on columns or views that were added incrementally.

## Risks and compatibility checks
1. Lifecycle rule drift:
   Home must not redefine stage meaning or urgency in JSX. The implementation must continue to derive user guidance from `getNextAction(...)`, `getBatchStageTiming(...)`, and shared stage labels wherever practical.
2. Stale or duplicated next-action logic:
   If Home introduces its own CTA copy separate from `getNextAction(...)`, it risks diverging from persisted `next_action` values or fallback behavior in [src/lib/batches.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\batches.ts).
3. Incomplete F2 timing context:
   The command center must preserve F2 timing nuance from [src/lib/batch-timing.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\batch-timing.ts), especially `f2_active`, `refrigerate_now`, and `chilled_ready` behavior. Home summaries must not imply certainty beyond the helper's estimated wording.
4. Timeline and history consistency:
   If Home adds recent movement, it must remain consistent with `batch_stage_events` and `batch_logs`. It should not imply a complete activity record if it only reads a subset.
5. Distinction from `MyBatches`:
   The roster must stay concise and situational. If it grows search, filters, sorting, or dense metadata, Home will become a duplicate inventory page.
6. Distinction from `BatchDetail`:
   Home should guide users toward the right batch and provide bounded logging shortcuts, but deep workflows such as F2 setup, timeline exploration, reminder management, and stage transitions should remain in `BatchDetail`.
7. Beginner confusion:
   Too many sections or too much density could make Home intimidating. The final page needs strong section hierarchy, restrained copy, and clear reasons for why a batch is surfaced.
8. Visual over-design:
   A premium warm aesthetic is useful only if it remains readable and trustworthy. Texture, color, or editorial styling must not obscure guidance or make urgent states ambiguous.
9. Mobile usability:
   A visually rich desktop composition could easily become cramped on mobile. Each section needs a mobile-first layout, safe bottom spacing, and thumb-friendly controls.
10. Quick Log safety:
   Quick-log flows on Home must remain operationally bounded. Logging should be allowed; hidden lifecycle mutation should not. A quick action should never quietly move a batch into F2, refrigeration, completion, or archive.
11. Recent movement query cost:
   A naive implementation could introduce N+1 queries by loading per-batch history. The recent feed must be shaped with batched reads or a single cross-batch query strategy.
12. Data-source necessity:
   The first pass should confirm whether recent movement can be built from existing table reads without new backend views. If not, defer richer narrative shaping instead of forcing schema work.
13. Backwards compatibility:
   Existing saved batches and F2 setups must remain compatible. The Home overhaul should not depend on newly required fields or assumptions that older rows may lack.
14. Component boundary churn:
   New `src/components/home/` boundaries should materially improve maintainability. Creating many thin wrappers with no data-shaping value would add churn without clarity.
15. Batch stage consistency across UI, derived logic, and persistence:
   The eventual implementation must explicitly check stage consistency in Home surfaces, `BatchDetail`, and the persistence paths that write `kombucha_batches`, `batch_stage_events`, and `batch_logs`.
16. Next-action consistency with stage and timing helpers:
   Primary focus selection, lane placement, and snapshot counts must all agree on shared priority inputs.
17. Timeline/history impact including `batch_stage_events` and `batch_logs`:
   If the recent feed summarizes those tables, the wording should accurately reflect the source and not collapse distinct events into misleading prose.
18. Safety and clarity of user-facing fermentation or carbonation guidance:
   Home copy must continue to speak in estimates, windows, and recommendations, not certainty.

## Milestones

### Milestone 1: Confirm Home architecture and command-center view-model strategy
Goal:
Define the page-level orchestration shape and decide how Home data should be computed without overloading `Index.tsx`.
Acceptance criteria:
1. A concrete decision is documented on whether to introduce `src/lib/home-command-center.ts`.
2. The Home view model shape is defined, including `primaryFocus`, `snapshotStats`, `actionLanes`, `activeRoster`, `quickLogContext`, `recentMovement`, and `supportContext`.
3. The relationship between `home-command-center.ts` and `today-actions.ts` is decided.
4. The route remains `/` and the command-center role is clearly separated from `MyBatches` and `BatchDetail`.
Files expected:
1. [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx)
2. [src/lib/today-actions.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\today-actions.ts)
3. Recommended new [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts)
Validation:
1. Confirm the proposed view model can be derived from existing batch and reminder data plus any approved recent-movement read.
2. Confirm no stage meaning or next-action logic is forked into page components.
Status: completed

### Milestone 2: Define top-priority selection and quiet-day fallback behavior
Goal:
Specify how the Primary Focus Card chooses one surfaced object and how the page behaves when no urgent focus exists.
Acceptance criteria:
1. A deterministic priority algorithm is documented.
2. Tie-breaking is documented and stable.
3. Quiet-day fallback behavior is defined for active but calm days.
4. No-active-batches behavior is defined as a launch surface rather than an empty dashboard.
Files expected:
1. Recommended new [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts)
2. [src/lib/today-actions.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\today-actions.ts)
3. [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx)
Validation:
1. Test the documented rules mentally against overdue reminders, ready F1 windows, F2 carbonation checks, `refrigerate_now`, and quiet active days.
2. Confirm the surfaced explanation language stays estimate-based and beginner-friendly.
Status: completed

### Milestone 3: Redesign lane logic from five internal groupings to three user-facing lanes
Goal:
Preserve the strongest part of the current Today / Next Actions dashboard while simplifying what the user sees.
Acceptance criteria:
1. The final user-facing lane structure is `Now`, `Next up`, and `Recently moved`.
2. Internal precedence and mapping from current `overdue`, `do_now`, `ready_now`, `check_soon`, and `recently_updated` states are documented.
3. Each batch appears in at most one lane.
4. The plan explicitly decides whether `today-actions.ts` is evolved, wrapped, partially retained, or replaced.
Files expected:
1. [src/lib/today-actions.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\today-actions.ts)
2. Recommended new [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts)
3. Recommended new [src/components/home/HomeActionLanes.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeActionLanes.tsx)
Validation:
1. Confirm mapping preserves current urgency semantics.
2. Confirm lane labels are clearer for beginners than the current five-section dashboard wording.
Status: completed

### Milestone 4: Define snapshot stats and section-jump behavior
Goal:
Turn summary counts into a compact system snapshot that supports orientation and navigation.
Acceptance criteria:
1. Snapshot tiles and their underlying count rules are documented.
2. The page behavior for tapping a tile is defined.
3. Count definitions match the same precedence model used by lanes and primary focus.
4. Mobile layout for the strip is defined as a 2x2 grid unless a later implementation proves a different pattern is superior.
Files expected:
1. Recommended new [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts)
2. Recommended new [src/components/home/HomeSnapshotStrip.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeSnapshotStrip.tsx)
3. [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx)
Validation:
1. Confirm each count is cheap to derive from existing Home data.
2. Confirm tap targets work on mobile and stay visually secondary to the Primary Focus Card.
Status: completed

### Milestone 5: Define batch roster behavior and component strategy
Goal:
Introduce a compact all-active-brews overview that stays distinct from `MyBatches`.
Acceptance criteria:
1. The roster item fields are defined: batch name, stage, day count, short status line, and navigation target.
2. A concrete decision is made not to reuse `BatchCard` as-is.
3. The roster's relationship to `MyBatches` is documented, including why Home does not adopt search/sort/filter responsibilities.
4. Empty and low-count states are defined.
Files expected:
1. [src/components/batches/BatchCard.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\batches\BatchCard.tsx)
2. [src/pages/MyBatches.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\MyBatches.tsx)
3. Recommended new [src/components/home/HomeBatchRoster.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeBatchRoster.tsx)
4. Recommended new [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts)
Validation:
1. Confirm the roster remains compact enough that `MyBatches` is still the place for inventory browsing.
2. Confirm stage labels and short status lines still come from shared helpers or derived shared data.
Status: completed

### Milestone 6: Define quick-log operational flow and safe boundaries
Goal:
Replace decorative quick actions with real logging flows that are contextual, useful, and safe.
Acceptance criteria:
1. The available quick actions are documented and justified.
2. The selection strategy is defined: prefilling the surfaced batch, using a batch picker, or adapting by stage.
3. Unsafe actions are explicitly excluded from Home.
4. The plan states whether Home routes into existing `BatchDetail` logging UI, reuses shared logging helpers directly, or adds a small Home-specific launcher.
Files expected:
1. [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx)
2. [src/pages/BatchDetail.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\BatchDetail.tsx)
3. `src/lib/batch-quick-logs.ts`
4. Recommended new [src/components/home/HomeQuickLogDock.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeQuickLogDock.tsx)
Validation:
1. Confirm Home quick logs can write safely without changing stage or skipping timeline/history expectations.
2. Confirm the UX is workable on mobile and does not hide critical choices behind tiny controls.
Status: completed

### Milestone 7: Define recent-movement data source and narrative shaping
Goal:
Add a concise cross-batch movement feed without introducing misleading history or N+1 reads.
Acceptance criteria:
1. The chosen data source is documented: direct table reads, a shared helper, reuse of existing timeline assembly patterns, or intentional MVP deferral.
2. The feed item shape is defined.
3. Query strategy avoids N+1 reads.
4. The wording style is defined as short human activity updates, not raw event labels.
Files expected:
1. [src/pages/BatchDetail.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\BatchDetail.tsx)
2. Recommended new [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts)
3. Recommended new [src/components/home/HomeRecentMovement.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeRecentMovement.tsx)
4. [src/integrations/supabase/types.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\integrations\supabase\types.ts) if any extra read shape is needed
Validation:
1. Confirm the data source can be queried efficiently.
2. Confirm the feed reflects existing `batch_stage_events` and `batch_logs` semantics accurately enough for beginners.
Status: completed

### Milestone 8: Define contextual support logic
Goal:
Make guide and assistant entry points responsive to the current surfaced work rather than generic.
Acceptance criteria:
1. Support contexts are documented for common situations such as F1 tasting, F2 pressure risk, quiet day, and no active batches.
2. The plan defines whether support links go to existing guides, assistant, or both.
3. The logic stays contextual and lightweight rather than becoming a new recommendation engine.
4. The existing beginner guide callout is either subsumed into this panel or explicitly retained for quiet/no-batch states only.
Files expected:
1. [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx)
2. Recommended new [src/components/home/HomeSupportPanel.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\home\HomeSupportPanel.tsx)
3. Recommended new [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts)
Validation:
1. Confirm support content never contradicts lifecycle guidance.
2. Confirm quiet-day and no-batch states still feel purposeful.
Status: completed

### Milestone 9: Define Home visual system and surface language
Goal:
Translate the existing warm token foundation into a disciplined, premium-feeling Home-specific visual system.
Acceptance criteria:
1. A page canvas, hero surface, utility-card, and support-surface hierarchy is documented.
2. Color usage rules are documented, including reserved urgency red.
3. Typography roles for Fraunces and Outfit are documented.
4. Shadow, radius, and motion guidance are documented and consistent with current tokens.
Files expected:
1. [tailwind.config.ts](C:\Users\Dario\Documents\GitHub\brew-companion\tailwind.config.ts)
2. [src/index.css](C:\Users\Dario\Documents\GitHub\brew-companion\src\index.css)
3. Recommended new Home components under `src/components/home/`
Validation:
1. Confirm the visual system can be implemented by evolving current tokens rather than replacing them.
2. Confirm visual emphasis supports readability and trust.
Status: completed

### Milestone 10: Define mobile-first responsive behavior section by section
Goal:
Specify how each major Home section should adapt across breakpoints with mobile as the primary context.
Acceptance criteria:
1. Mobile-first layout behavior is documented for every major Home section.
2. Fixed bottom nav awareness and `pb-safe` spacing requirements are documented.
3. The plan explicitly avoids critical horizontal scroll dependencies for core tasks.
4. Quiet, loading, and no-active-batches states are covered on mobile.
Files expected:
1. [src/components/layout/AppLayout.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\layout\AppLayout.tsx)
2. [src/index.css](C:\Users\Dario\Documents\GitHub\brew-companion\src\index.css)
3. Recommended new Home components under `src/components/home/`
4. [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx)
Validation:
1. Confirm major controls remain comfortably tappable.
2. Confirm the final section order still answers the page's five core questions on a narrow screen.
Status: completed

### Milestone 11: Define `Index.tsx` refactor and component extraction path
Goal:
Plan the implementation structure so the overhaul can be delivered incrementally without destabilizing shared logic.
Acceptance criteria:
1. `Index.tsx` is positioned as orchestration-only as much as practical.
2. A concrete extraction plan exists for Home components and shared helpers.
3. The role of current dashboard components is explicitly decided.
4. The read path for batches, reminders, and recent movement is documented.
Files expected:
1. [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx)
2. [src/components/dashboard/TodayActionCard.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\dashboard\TodayActionCard.tsx)
3. [src/components/dashboard/TodayActionSection.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\dashboard\TodayActionSection.tsx)
4. Recommended new `src/components/home/` files
5. Recommended new [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts)
Validation:
1. Confirm file boundaries keep business logic in `src/lib` and presentation in components.
2. Confirm the plan does not require unrelated route rewrites.
Status: completed

### Milestone 12: Record baseline validation constraints and implementation blockers
Goal:
Establish the validation path and any pre-existing command failures before the overhaul begins.
Acceptance criteria:
1. Final validation commands are listed.
2. Any pre-existing baseline failures are recorded separately from Home-overhaul work.
3. Validation is expected after each milestone during implementation.
4. Build validation is included because this overhaul affects a production route and likely styling composition.
Files expected:
1. [PLANS.md](C:\Users\Dario\Documents\GitHub\brew-companion\PLANS.md)
2. [package.json](C:\Users\Dario\Documents\GitHub\brew-companion\package.json)
3. [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx)
Validation:
1. Run the repo-standard commands at the end of implementation and after milestones where practical.
2. Record baseline issues explicitly if they exist before implementation.
Status: completed

## Progress log
1. Read [AGENTS.md](C:\Users\Dario\Documents\GitHub\brew-companion\AGENTS.md) to capture repo rules around lifecycle consistency, shared helpers, beginner-first guidance, and planning requirements.
2. Read [PLANS.md](C:\Users\Dario\Documents\GitHub\brew-companion\PLANS.md) to confirm the exact repository execution-plan schema.
3. Inspected [src/App.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\App.tsx) to confirm `/` is already the protected Home route.
4. Inspected [src/components/layout/AppLayout.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\layout\AppLayout.tsx) to confirm Home's current nav role and fixed mobile bottom-nav constraints.
5. Inspected [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx) to capture the current Home structure, data reads, loading/empty states, summary stats, and incomplete Quick Log strip.
6. Inspected [src/pages/MyBatches.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\MyBatches.tsx) to document inventory responsibilities Home should not absorb.
7. Inspected [src/pages/BatchDetail.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\BatchDetail.tsx) to document the deeper per-batch workflow responsibilities Home should not duplicate.
8. Inspected [src/components/batches/BatchCard.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\batches\BatchCard.tsx) to assess whether it should be reused for the new Home roster.
9. Inspected [src/components/dashboard/TodayActionCard.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\dashboard\TodayActionCard.tsx) and [src/components/dashboard/TodayActionSection.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\components\dashboard\TodayActionSection.tsx) to capture the current dashboard-specific rendering layer.
10. Inspected [src/lib/today-actions.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\today-actions.ts), [src/lib/batches.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\batches.ts), and [src/lib/batch-timing.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\batch-timing.ts) to document existing shared logic and reuse boundaries.
11. Inspected [tailwind.config.ts](C:\Users\Dario\Documents\GitHub\brew-companion\tailwind.config.ts) and [src/index.css](C:\Users\Dario\Documents\GitHub\brew-companion\src\index.css) to capture the existing warm token, typography, radius, and motion foundation.
12. Created this dedicated plan file for the Home command center super overhaul without changing application code.
13. Re-read [AGENTS.md](C:\Users\Dario\Documents\GitHub\brew-companion\AGENTS.md), [PLANS.md](C:\Users\Dario\Documents\GitHub\brew-companion\PLANS.md), and this plan before implementation, then inspected additional Home-adjacent files including `src/contexts/UserContext.tsx`, `src/components/common/StageIndicator.tsx`, `src/lib/batch-quick-logs.ts`, `src/components/batch-detail/BatchQuickLogDrawer.tsx`, `src/pages/Guides.tsx`, `src/pages/Assistant.tsx`, `src/components/batch-detail/BatchDetailHero.tsx`, `src/components/batch-detail/BatchOverviewSurface.tsx`, and `src/lib/batch-detail-view.ts`.
14. Captured baseline validation before editing: `npx tsc -b`, `npm run test`, and `npm run build` passed; `npm run lint` passed with the existing nine fast-refresh warnings in shared UI/context files.
15. Implemented a page-level command-center helper in [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts) and evolved [src/lib/today-actions.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\today-actions.ts) to expose item-level Home data without forking lifecycle logic.
16. Added a dedicated `src/components/home/` surface layer for the new Home header, primary focus card, snapshot strip, action lanes, batch roster, quick-log dock, recent movement feed, and contextual support panel.
17. Reworked [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx) into the command-center page, keeping `/` as Home while preserving `MyBatches` as inventory and `BatchDetail` as the deeper per-batch surface.
18. Added Home reads from `batch_timeline_view` for recent movement and reused `kombucha_batches` plus `batch_reminders` for the command-center view model.
19. Expanded [src/lib/batch-quick-logs.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\batch-quick-logs.ts) so Home can safely save `taste_test`, `temp_check`, `carbonation_check`, and `note_only` logs through the existing `batch_logs` write path without changing stage or persistence rules.
20. Added Home-specific surface utility classes in [src/index.css](C:\Users\Dario\Documents\GitHub\brew-companion\src\index.css) to implement the warmer, more editorial Home hierarchy on top of the current token system instead of replacing it.
21. Validated after implementation: `npx tsc -b`, `npm run test`, and `npm run build` all passed; `npm run lint` still reports the same pre-existing nine warnings and no new lint errors.

## Decision log
1. Keep `/` as the Home route and evolve [src/pages/Index.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\Index.tsx) rather than adding a second dashboard route. This matches current navigation and avoids splitting the concept of Home.
2. Introduce a page-level orchestration helper, recommended as [src/lib/home-command-center.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\home-command-center.ts), instead of overloading [src/lib/today-actions.ts](C:\Users\Dario\Documents\GitHub\brew-companion\src\lib\today-actions.ts) with every new concern. `today-actions.ts` should remain a focused action-grouping helper or become an internal dependency of the broader Home helper.
3. Create a `src/components/home/` namespace for the new Home surfaces. This keeps the new command-center visual language cohesive and prevents `dashboard/` MVP components from accumulating unrelated responsibilities.
4. Reduce the role of current dashboard components rather than stretching them into the entire new Home. `TodayActionCard` and `TodayActionSection` may be wrapped or partially reused during migration, but the long-term direction should be replacement by Home-specific components with a more coherent surface system.
5. Keep `MyBatches` as the full inventory page. The Home roster should be deliberately lighter than `BatchCard` and should not gain search, sort, or tab responsibilities.
6. Keep `BatchDetail` as the richer operational surface. Home may surface a batch, launch bounded quick logs, and link into the detail page, but it should not become the place for multi-step lifecycle operations.
7. Use a deterministic Primary Focus selection algorithm. Recommended precedence:
   1. Batch with overdue reminder or timing status `overdue`
   2. Batch in `refrigerate_now`
   3. Batch in `f2_setup`
   4. Batch with reminder due today
   5. Batch in timing status `ready`
   6. Batch in timing status `approaching`
   7. Most recently updated active batch
   Tie-breakers should prefer higher caution level, sooner reminder due date, more urgent timing state, then most recently updated.
8. Keep the current five-group internal action classification semantics available, but collapse display language into three user-facing lanes: `Now`, `Next up`, and `Recently moved`.
9. Make the Quick Log Dock contextual and stage-aware. Recommended default behavior:
   1. Prefill the current primary-focus batch when that is unambiguous.
   2. Fall back to a batch picker when multiple active candidates fit the action.
   3. Show only safe logging actions on Home.
10. Treat recent movement as MVP-in-scope if it can be done with batched cross-batch reads from existing tables without N+1 queries or schema changes. If that efficiency cannot be achieved cleanly, richer narrative shaping should be deferred rather than forced.
11. Use a two-row utility grid on mobile for Quick Log Dock rather than a horizontal chip strip by default. This is more consistent with command-center usability and better respects fixed bottom-nav ergonomics.
12. Build the visual direction as a "modern apothecary journal" on top of existing honey, amber, sage, tea, Fraunces, Outfit, radius, and motion tokens rather than replacing the design system.
13. Introduce a Home-specific surface hierarchy through either Home-only utility classes or small reusable section shells. This is preferable to scattering one-off Tailwind compositions across `Index.tsx`.
14. Keep backend changes out of the first pass unless implementation proves an existing read cannot support the intended outcome. The default recommendation is no migration and no new schema.
15. Use `batch_timeline_view` for Home recent movement instead of issuing per-batch `batch_stage_events` or `batch_logs` reads. This keeps the first pass batched and avoids N+1 query behavior while still staying anchored to existing history data.
16. Defer `Add photo` from the Home quick-log dock because the current upload flow is not ready as a safe reusable Home action. The dock now focuses on the safe, working logging actions that already map cleanly to `batch_logs`.
17. Reuse the existing `saveBatchQuickLog` write path by extending it to cover `temp_check` and `carbonation_check`, rather than creating a Home-only insert helper.
18. Keep the current dashboard MVP components out of the main new Home composition. They remain in the repo, but the command center uses the new `src/components/home/` surface language.

## Open questions
None at the moment.

## Done when
1. Home at `/` has been redesigned into a command center with a clear Command Header, Primary Focus Card, Snapshot Strip, Action Lanes, Batch Roster, Quick Log Dock, Recent Movement Feed, and Contextual Support Panel.
2. The page answers the five intended questions in order on both mobile and desktop.
3. The Home remains clearly distinct from [src/pages/MyBatches.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\MyBatches.tsx) and [src/pages/BatchDetail.tsx](C:\Users\Dario\Documents\GitHub\brew-companion\src\pages\BatchDetail.tsx).
4. Primary focus selection, lane grouping, snapshot counts, roster status lines, and contextual support all derive from shared helpers or a page-level orchestration helper that reuses shared lifecycle logic.
5. No Home JSX contains forked stage meaning, duplicated next-action rules, or falsely certain fermentation/carbonation guidance.
6. Quick-log actions on Home are real, bounded, and safe, with no hidden lifecycle mutation.
7. If recent movement is included, it is driven by existing history tables without misleading wording or N+1 query behavior.
8. The visual result feels materially more refined, warm, calm, and premium while preserving beginner readability and trust.
9. Mobile behavior is first-class, including safe spacing above the fixed bottom nav and section layouts designed for narrow portrait screens.
10. Existing batches, reminders, timeline history, and saved F2 setups remain compatible.

## Final validation
Run these commands during implementation and after each milestone where practical:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Validation notes for the eventual implementation:
1. Because this overhaul affects a protected production route, routing/layout composition, and likely bundle-visible styling, `npm run build` is required at the end.
2. Baseline validation before implementation:
   1. `npx tsc -b` passed.
   2. `npm run test` passed.
   3. `npm run build` passed, with the existing large-chunk warning from Vite.
   4. `npm run lint` reported nine existing `react-refresh/only-export-components` warnings in shared UI/context files and no errors.
3. Validation after each milestone should explicitly check:
   1. Batch stage consistency across UI, derived logic, and persistence
   2. Next-action consistency with shared timing and stage helpers
   3. Timeline/history impact involving `batch_stage_events` and `batch_logs`
   4. Backwards compatibility for saved batches and saved F2 setups
   5. Safety and clarity of user-facing fermentation and carbonation guidance
4. End-of-implementation validation status for this Home overhaul:
   1. `npx tsc -b` passed.
   2. `npm run test` passed.
   3. `npm run build` passed, with the same non-blocking large-chunk warning.
   4. `npm run lint` still reports the same nine pre-existing warnings and no new errors.
