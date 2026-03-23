# Home UX Overhaul

## Summary
Overhaul the Home route in `src/pages/Index.tsx` so it becomes a calmer, clearer daily landing page with stronger hierarchy, fewer equally dominant sections, and intentionally rewritten user-facing copy.

## Why
The current Home page already has useful prioritization logic, but it renders too many major surfaces at once:
1. header
2. primary focus hero
3. snapshot strip
4. action lanes
5. quick log dock
6. recent movement
7. active roster
8. support panel
9. extra My Batches utility panel

That creates several product problems:
1. too many large card sections compete for attention
2. the page feels more like a dashboard made of modules than a calm app home
3. urgency, browsing, utilities, recent context, and support all carry similar visual weight
4. several headings and helper lines still sound like internal product naming instead of user-facing copy
5. mobile especially becomes a long stack of strong surfaces with weak hierarchy

This overhaul is needed so Home feels like:
1. what matters today
2. the fastest useful next action
3. a simple place to keep active brews visible
4. a quieter recent context feed
5. one clear support/help area

## Scope
In scope:
1. Recompose `src/pages/Index.tsx` into a simpler Home information architecture.
2. Reduce the number of full-weight top-level sections on Home.
3. Keep the current Home data-loading path from `kombucha_batches`, `batch_reminders`, and `batch_timeline_view`.
4. Keep the current `buildHomeCommandCenter(...)` logic where practical, while changing which outputs are rendered and how they are grouped.
5. Replace the current action-lanes-style Home presentation with a calmer Today queue.
6. Reduce the top-level footprint of Home quick-log utilities while preserving the drawer and save flow.
7. Turn the current active roster into a clearer “Your brews” browse section.
8. Make recent activity quieter and more compact.
9. Merge support/guides/assistant/My Batches utility behavior into one quieter bottom section.
10. Rewrite visible Home copy across touched sections and components.
11. Adjust shared Home utility/surface styling in `src/index.css` if needed to improve hierarchy.

Out of scope:
1. Schema or migration changes by default.
2. Changes to brewing timing, stage progression, next-action rules, or caution semantics.
3. Changes to quick-log persistence behavior in `saveBatchQuickLog(...)`.
4. Changes to the Supabase tables or generated types unless implementation proves a real blocker.
5. Reworking unrelated routes such as `MyBatches`, `BatchDetail`, `Guides`, `Assistant`, or global navigation.
6. Replacing the underlying Home command-center derivation with an entirely different data model.

## Current state
1. **Route composition in `src/pages/Index.tsx`**
   - Home currently loads:
     - `kombucha_batches`
     - `batch_reminders`
     - `batch_timeline_view`
   - It maps batches with `mapBatchRow(...)`, builds reminders, then passes those into `buildHomeCommandCenter(...)`.
   - It preserves a Home quick-log save path via `saveBatchQuickLog(...)`.
   - It then renders nearly every major concept returned by `buildHomeCommandCenter(...)` as a separate visible section.

2. **Current rendered order**
   - `HomeHeader`
   - `HomePrimaryFocusCard`
   - `HomeSnapshotStrip`
   - `HomeActionLanes`
   - `HomeQuickLogDock`
   - `HomeRecentMovement`
   - `HomeBatchRoster`
   - `HomeSupportPanel`
   - standalone “Need a broader view?” / My Batches utility section
   - The resulting page is rich, but the visual hierarchy is too flat because many sections are large and card-heavy.

3. **Current Home data model in `src/lib/home-command-center.ts`**
   - `buildHomeCommandCenter(...)` currently derives:
     - `primaryFocus`
     - `snapshotStats`
     - `actionLanes`
     - `activeRoster`
     - `quickLogActions`
     - `recentMovement`
     - `supportContext`
   - This logic is useful and already centralizes Home prioritization.
   - The problem is not that the derivations exist; the problem is that too many are rendered as equally strong chapters.

4. **Current `HomeHeader`**
   - Uses a large `home-hero-surface`.
   - Shows greeting, date, state sentence, active brew count, and a “Daily command center” pill.
   - The copy still includes internal phrasing like “Daily command center.”

5. **Current `HomePrimaryFocusCard`**
   - Uses another large `home-hero-surface`.
   - Contains headline, badges, stage/caution/day, summary, primary CTA, secondary CTA, a “Why this is surfaced” inset box, and a “Ready from here” utility inset.
   - The concept is strong, but the card feels layered and overbuilt, especially when paired directly under the large header.

6. **Current `HomeActionLanes`**
   - Renders three large lane groups from `actionLanes`: `now`, `next_up`, and `recently_moved`.
   - The surface is explicitly labeled “Action lanes.”
   - Each lane is a large panel with nested cards and “Next action” boxes, which makes Home feel dashboard-heavy.

7. **Current `HomeQuickLogDock`**
   - The underlying utility is valuable:
     - quick action buttons
     - drawer-based input flow
     - safe observation-only logging
     - existing `saveBatchQuickLog(...)` compatibility
   - The current top-level section is still visually large and titled “Quick log dock,” which reads like an internal feature surface rather than a light utility.

8. **Current `HomeBatchRoster`**
   - Shows the active brew roster as a grid of utility cards.
   - The supporting copy “Keep every active brew visible, not just the urgent ones” is useful, but the section still reads like another major chapter.

9. **Current `HomeRecentMovement`**
   - Uses the derived recent timeline items from `batch_timeline_view`.
   - It is useful, but the title “Recent movement” and its current visual treatment give it more prominence than a quiet context feed needs.

10. **Current `HomeSnapshotStrip`**
    - Shows:
      - active brews
      - needs attention today
      - in tasting or carbonation window
      - recent activity
    - It is helpful data, but it duplicates context already visible elsewhere and adds another strong band near the top of the page.

11. **Current `HomeSupportPanel` plus extra My Batches block**
    - `HomeSupportPanel` already handles support context, assistant, and guides.
    - `Index.tsx` also renders a separate My Batches utility panel afterward.
    - This creates two bottom-of-page support/navigation areas that should be merged.

12. **Current shared visual surface system**
    - `src/index.css` defines:
      - `home-canvas`
      - `home-hero-surface`
      - `home-panel-surface`
      - `home-utility-surface`
    - The current system gives many sections similarly premium treatments, which contributes to the “too many equal panels” feeling.

13. **Current compatibility constraints**
    - Home must keep:
      - current batch/reminder/timeline read paths
      - quick-log drawer and save behavior
      - navigation to batch detail, settings, guides, assistant, and My Batches
    - No schema change is expected for this overhaul.

## Intended outcome
1. **Today becomes the dominant top area**
   - Above the fold should primarily be:
     - `HomeHeader`
     - `HomePrimaryFocusCard`
     - a compact “also worth checking today” queue
   - This should feel like one primary story, not several peer sections.

2. **Quick actions become a compact utility surface**
   - The current quick-log behavior stays.
   - The visible top-level footprint becomes smaller and more utility-like.
   - The drawer remains the detailed interaction layer.

3. **Your brews becomes the main browse section**
   - Active brews remain visible.
   - This section becomes the place for general active-batch browsing.
   - It should absorb the useful role of the roster and remove the need for a separate My Batches promo block.

4. **Recent changes becomes a quieter feed**
   - Recent activity remains on Home.
   - It becomes compact and context-providing, not a visually loud chapter.

5. **Help becomes a single quiet bottom section**
   - Assistant, guides, and My Batches navigation should live together in one calmer support/navigation area.

6. **Copy becomes intentionally human**
   - Headings should sound like shipped product copy.
   - Supporting text should explain what the user should notice or do next.
   - Dashboard-like or component-like naming should be removed from visible UI.

7. **Mobile outcome**
   - The page should read in this order:
     - header
     - primary focus
     - also worth checking today
     - quick actions
     - your brews
     - recent changes
     - help
   - Only the Today area should feel dominant.

8. **Desktop outcome**
   - Desktop can use a two-column balance, but the hierarchy must remain clear.
   - A likely direction is:
     - left: header, primary focus, today queue, recent changes
     - right: quick actions, your brews, help
   - This should avoid a grid of equally loud panels.

## Files and systems involved
1. **Primary route file**
   - `src/pages/Index.tsx`

2. **Current Home components likely to change**
   - `src/components/home/HomeHeader.tsx`
   - `src/components/home/HomePrimaryFocusCard.tsx`
   - `src/components/home/HomeActionLanes.tsx`
   - `src/components/home/HomeQuickLogDock.tsx`
   - `src/components/home/HomeBatchRoster.tsx`
   - `src/components/home/HomeRecentMovement.tsx`
   - `src/components/home/HomeSnapshotStrip.tsx`
   - `src/components/home/HomeSupportPanel.tsx`

3. **Likely new or replacement Home surfaces**
   - likely `src/components/home/HomeTodayQueue.tsx`
   - likely `src/components/home/HomeQuickActionsRail.tsx`
   - likely `src/components/home/HomeBrewsPanel.tsx`
   - likely `src/components/home/HomeRecentActivityFeed.tsx`
   - likely `src/components/home/HomeHelpPanel.tsx`
   - exact names may vary, but the plan should move away from rendering current internal concept names directly.

4. **Shared Home/domain helpers**
   - `src/lib/home-command-center.ts`
   - likely only light shaping or field regrouping should happen here
   - preserve:
     - primary focus selection
     - quick log action eligibility
     - recent movement derivation
     - support context derivation
     - roster derivation where still useful

5. **Shared style surface**
   - `src/index.css`
   - likely needs lighter hierarchy adjustments so not every Home section uses nearly equal visual weight

6. **Persistence and reads that must remain compatible**
   - `public.kombucha_batches`
   - `public.batch_reminders`
   - `public.batch_timeline_view`
   - quick-log writes through current Home save path

7. **Routing targets that must remain compatible**
   - `/batch/:id`
   - `/settings`
   - `/guides`
   - `/assistant`
   - `/batches`

8. **Generated types / schema**
   - `src/integrations/supabase/types.ts`
   - default expectation: no generated type changes and no migration changes

## Risks and compatibility checks
1. **Home data-loading regression**
   - Do not break current reads from `kombucha_batches`, `batch_reminders`, or `batch_timeline_view`.

2. **Quick-log regression**
   - The top-level utility can be redesigned, but the existing drawer, submission flow, and `saveBatchQuickLog(...)` behavior must remain compatible.

3. **Priority drift**
   - Reducing sections must not accidentally weaken the useful prioritization already coming from `buildHomeCommandCenter(...)`.

4. **Urgency vs browsing blur**
   - The redesign must keep Today distinct from general browsing so Home does not become another inventory page.

5. **Copy drift**
   - A layout-only refactor would fail the user request.
   - Copy rewrite is part of done and must explicitly remove dashboard-like/internal naming from touched surfaces.

6. **Over-preserving current modules**
   - If the implementation keeps all current large sections and only reorders them, clutter will remain.

7. **Over-cutting useful context**
   - Simplification must not remove genuinely helpful cues like primary focus, recent activity, quick actions, or a clear path to My Batches/help.

8. **Surface-hierarchy inconsistency**
   - `home-hero-surface`, `home-panel-surface`, and `home-utility-surface` may currently give too much weight to too many sections.
   - Styling changes should support hierarchy rather than just content reshuffling.

9. **Mobile regressions**
   - Home must feel calmer on small screens, not like a long stack of similarly loud blocks.

10. **Desktop regressions**
    - A two-column layout must not recreate the same “equal panels everywhere” problem.

11. **Lifecycle and shared-helper consistency**
    - Even though this is a UX overhaul, the plan must explicitly keep:
      - stage semantics unchanged
      - next-action logic unchanged
      - no timeline/history writes changed
      - no batch history compatibility issues introduced

12. **Validation gaps**
    - Because this is primarily UI and copy work, it would be easy to skip checking navigation or quick-log interactions.
    - The implementation must still validate route/build compatibility and quick-log path compatibility.

13. **Schema scope creep**
    - No schema change is expected.
    - If implementation discovers a true blocker, the plan must be updated before schema work begins.

## Milestones

### Milestone 1: Inspect current Home flow and finalize execution plan
Goal:
Document the current Home route, component structure, command-center helper usage, visual surface system, and redesign direction in a repo-specific plan.

Acceptance criteria:
1. The plan exists at `plans/2026-03-23-home-ux-overhaul.md`.
2. The current Home composition and hierarchy problems are described repo-specifically.
3. The target information architecture is documented clearly.
4. The plan explicitly states that no schema change is expected.
5. The plan explicitly calls out copy rewrite as required work.

Files expected:
1. `plans/2026-03-23-home-ux-overhaul.md`

Validation:
1. No code validation required for this planning milestone.
2. Record known baseline issues if discovered during implementation.

Status: completed

### Milestone 2: Rebuild Home page composition
Goal:
Simplify `src/pages/Index.tsx` and establish a clearer top-level hierarchy centered on Today.

Acceptance criteria:
1. Home renders fewer major sections than today.
2. Today is clearly the dominant top area.
3. Quick actions, browsing, recent context, and help are visually secondary.
4. Mobile order and desktop balance align with the intended outcome.
5. Home loading remains compatible.

Files expected:
1. `src/pages/Index.tsx`
2. likely touched Home components that support the new composition
3. possibly `src/index.css`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. Confirm Home still reads from `kombucha_batches`, `batch_reminders`, and `batch_timeline_view`

Status: pending

### Milestone 3: Replace bulky Home surfaces with calmer variants
Goal:
Replace or redesign the current large dashboard-like sections with smaller, clearer Home surfaces.

Acceptance criteria:
1. The current action-lanes style clutter is removed from the main page.
2. Quick actions feel like utilities instead of a large chapter.
3. Active-brew browsing is clearer and less duplicative.
4. Recent changes are quieter and more compact.
5. Support and My Batches navigation are merged cleanly.
6. Snapshot-strip behavior is either removed or significantly demoted with clear justification.

Files expected:
1. `src/components/home/HomePrimaryFocusCard.tsx`
2. `src/components/home/HomeActionLanes.tsx` or replacement components
3. `src/components/home/HomeQuickLogDock.tsx`
4. `src/components/home/HomeBatchRoster.tsx`
5. `src/components/home/HomeRecentMovement.tsx`
6. `src/components/home/HomeSnapshotStrip.tsx`
7. `src/components/home/HomeSupportPanel.tsx`
8. likely new Home replacement components
9. possibly `src/index.css`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. Confirm quick-log drawer behavior and navigation targets still work

Status: pending

### Milestone 4: Rewrite user-facing homepage copy
Goal:
Audit and rewrite visible Home copy so the page sounds like a calm brewing companion rather than a dashboard made of internal modules.

Acceptance criteria:
1. Section headings are rewritten into real user-facing product copy.
2. Header and primary-focus copy are calmer and more human.
3. Quick action wording is practical and concise.
4. Recent activity and support copy are rewritten.
5. My Batches navigation copy is merged and rewritten where touched.
6. No obviously robotic, dashboard-like, or component-style headings remain in touched Home surfaces.

Files expected:
1. `src/pages/Index.tsx`
2. touched `src/components/home/*`
3. possibly `src/lib/home-command-center.ts` if derived display strings need rewriting at the helper level

Validation:
1. Inspect changed strings directly in touched files.
2. Confirm no obviously internal/dashboard terms remain on the visible Home path.
3. `npx tsc -b`
4. `npm run lint`
5. `npm run test`
6. `npm run build`

Status: pending

### Milestone 5: Final polish and validation
Goal:
Tighten visual hierarchy, mobile/desktop balance, and compatibility details, then finish the plan update and final validation.

Acceptance criteria:
1. Home feels materially calmer on mobile and desktop.
2. The hierarchy clearly separates Today, utilities, browsing, recent context, and help.
3. No Home data-loading regressions are introduced.
4. Quick-log interactions remain compatible.
5. Navigation to batch detail, guides, assistant, settings, and My Batches remains compatible.
6. The plan is updated to final state with progress, decisions, and validation notes.

Files expected:
1. `src/pages/Index.tsx`
2. touched supporting Home components
3. `src/index.css` if hierarchy polish requires it
4. `plans/2026-03-23-home-ux-overhaul.md`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. Distinguish pre-existing failures from any new ones

Status: pending

## Progress log
1. Read `AGENTS.md` and `PLANS.md` to confirm repo guidance, validation expectations, and plan structure.
2. Inspected `src/pages/Index.tsx` and confirmed Home currently renders nearly every major command-center derivation as a separate visible section.
3. Inspected `src/lib/home-command-center.ts` and confirmed the underlying prioritization logic is useful and should mostly be preserved while rendered surface architecture changes.
4. Inspected `src/components/home/HomeHeader.tsx` and confirmed it currently uses internal copy such as “Daily command center.”
5. Inspected `src/components/home/HomePrimaryFocusCard.tsx` and confirmed the current hero includes multiple layered inset support areas that likely make it feel too busy.
6. Inspected `src/components/home/HomeActionLanes.tsx` and confirmed it is a major source of dashboard-style clutter on Home.
7. Inspected `src/components/home/HomeQuickLogDock.tsx` and confirmed the drawer/save utility is useful, but the top-level section is visually too large and too feature-labeled.
8. Inspected `src/components/home/HomeBatchRoster.tsx`, `src/components/home/HomeRecentMovement.tsx`, `src/components/home/HomeSnapshotStrip.tsx`, and `src/components/home/HomeSupportPanel.tsx` and confirmed Home currently has too many top-level card-heavy chapters.
9. Inspected `src/index.css` and confirmed the current shared Home surface classes contribute to too many similarly weighted panels.
10. Confirmed that no schema change is expected and that Home data loading plus quick-log persistence must remain compatible.

## Decision log
1. The existing `buildHomeCommandCenter(...)` helper should remain the main Home logic source instead of moving prioritization into `Index.tsx`.
2. The current `HomeActionLanes` surface should not remain as a full multi-lane homepage chapter; its underlying item logic should be reused in a smaller Today queue.
3. The current `HomeSnapshotStrip` should not be preserved automatically; removing it as a standalone section is acceptable if the page becomes clearer without it.
4. Quick log behavior should remain intact, but the top-level `HomeQuickLogDock` surface should become a smaller quick-actions utility area.
5. The active roster should evolve into a clearer “Your brews” browse panel rather than another workflow-heavy section.
6. Support and the standalone My Batches utility prompt should be merged into one quieter bottom section.
7. `HomeHeader` plus `HomePrimaryFocusCard` should form one dominant Today area instead of feeling like two unrelated hero-weight surfaces.
8. Copy rewrite is a required part of implementation, not optional polish.
9. No schema change is expected for this overhaul.
10. Home data-loading, quick-log submission, and route/navigation compatibility must remain unchanged at the persistence contract level.

## Open questions
1. Whether the final implementation should fully remove `HomeSnapshotStrip` from Home or retain a much smaller embedded stats cue inside another section if hierarchy still needs a compact overview.

## Done when
1. `src/pages/Index.tsx` renders a materially simpler Home composition with fewer major sections.
2. Today is clearly the dominant top area.
3. Quick actions feel like utilities, not a major chapter.
4. Your brews becomes the main browse section for active batches.
5. Recent changes becomes quieter and more compact.
6. Help/support/My Batches navigation is merged into one calmer bottom section.
7. Home data loading from `kombucha_batches`, `batch_reminders`, and `batch_timeline_view` remains compatible.
8. Quick-log drawer behavior and save behavior remain compatible.
9. No schema change is introduced unless a true blocker is found and the plan is updated first.
10. Visible copy across touched Home surfaces is rewritten into calm, practical, user-facing language.
11. The page feels less cluttered and has materially stronger hierarchy on both mobile and desktop.

## Final validation
Run after each implementation milestone and again at the end:

1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

If any baseline warning or failure already exists before implementation, record it in this plan and distinguish it from new issues introduced by the Home UX overhaul.
