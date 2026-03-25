# Homepage Overhaul

## Summary
Redesign the Home page from a dense command-center layout into a calmer brewing dashboard built around overview stats, one primary focus, a compact attention list, lighter quick actions, and a minimal recent activity/support layer.

Update: the current calmer version still reads too much like a vertical stack of sections on mobile, so this plan now includes a second mobile-first restructuring pass.

## Why
The current homepage tries to act like a control room and a second batch list at the same time. It repeats too much active-batch detail, lacks satisfying overview metrics, and gives too many sections similar visual weight. The redesign should make Home answer three questions more clearly: what the brewing world looks like right now, what to check next, and what else is worth knowing.

## Scope
In scope:
1. Refactor the home data model in `src/lib/home-command-center.ts`.
2. Update the Home route in `src/pages/Index.tsx` to load the new stats and use the calmer hierarchy.
3. Redesign the major home surfaces in `src/components/home/*`.
4. Update `src/copy/home.ts` for the new homepage structure and dynamic summary labels.
5. Keep quick logging working from Home while making it visually lighter.
6. Move quick-log launch actions directly onto the primary focus card and remove the visible quick-log dock from the homepage layout.

Out of scope:
1. Changes to batch lifecycle rules, stage logic, or timing calculations.
2. Persistence or schema changes.
3. Reworking the Batches page.

## Current state
Home currently loads batches, reminders, and recent timeline rows in `src/pages/Index.tsx`, then shapes them through `buildHomeCommandCenter` in `src/lib/home-command-center.ts`.

The existing model is still centered around:
1. `snapshotStats`
2. `actionLanes`
3. `activeRoster`
4. `recentMovement`

The route currently renders:
1. `HomeHeader`
2. `HomePrimaryFocusCard`
3. `HomeTodayQueue`
4. `HomeRecentMovement`
5. `HomeQuickLogDock`
6. `HomeBatchRoster`
7. `HomeSupportPanel`

This makes Home feel like a workflow-heavy dashboard and repeats operational batch detail that is already better handled by the Batches page.

## Intended outcome
Home should become a calmer brewing overview with:
1. A simple header with greeting, one state sentence, and two clear CTAs.
2. A strong stats area split into current and lifetime stats.
3. One decisive primary focus card.
4. A compact attention list of up to 3 additional items.
5. A lighter quick-action strip that still opens the existing quick-log drawer flow.
6. A much smaller recent activity summary.
7. A demoted support/guides surface that does not compete with core brewing information.
8. A mobile-first structure where the top overview block combines greeting, state sentence, and current stats instead of spreading those across stacked sections.

## Files and systems involved
1. Route:
   - `src/pages/Index.tsx`
2. Domain helpers:
   - `src/lib/home-command-center.ts`
   - `src/lib/today-actions.ts` (read only unless a tiny shared helper extraction is needed)
3. Home components:
   - `src/components/home/HomeHeader.tsx`
   - `src/components/home/HomePrimaryFocusCard.tsx`
   - `src/components/home/HomeQuickLogDock.tsx`
   - `src/components/home/HomeRecentMovement.tsx`
   - `src/components/home/HomeSupportPanel.tsx`
   - `src/components/home/HomeTodayQueue.tsx`
   - `src/components/home/HomeBatchRoster.tsx`
   - likely new stats component(s) under `src/components/home/`
4. Copy:
   - `src/copy/home.ts`
5. Supabase reads:
   - `kombucha_batches`
   - `batch_reminders`
   - `batch_timeline_view`
   - `batch_bottles`

## Risks and compatibility checks
1. Breaking Home quick-log flows while lightening the quick-actions area.
2. Accidentally reintroducing batch-list density in the attention list.
3. Counting lifetime stats incorrectly if discarded batches are not handled explicitly.
4. Using timeline data in a way that makes recent activity too noisy.
5. Regressing mobile layout if the stats grid becomes too dense.

## Copy and content impact
1. `src/copy/home.ts` will be intentionally updated to support the new homepage hierarchy and wording.
2. Dynamic copy helpers will be needed for stat labels, greeting/state lines, and compact activity summaries.
3. This task does intentionally change homepage copy to match the new product structure.

## Milestones

### Milestone 1: Redesign the home data model and route loading
Goal:
Replace the command-center shape with a calmer overview model and load the real current/lifetime stats needed by the new homepage.
Acceptance criteria:
1. `src/lib/home-command-center.ts` returns `currentStats`, `lifetimeStats`, `primaryFocus`, `attentionList`, `recentActivityMini`, `quickActions`, and `supportContext`.
2. `src/pages/Index.tsx` loads real bottle counts and computes lifetime totals explicitly.
3. The full active roster is no longer required by the homepage route.
Files expected:
1. `src/lib/home-command-center.ts`
2. `src/pages/Index.tsx`
3. `src/copy/home.ts`
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 2: Rebuild the home surfaces around the new hierarchy
Goal:
Replace the old stacked command-center layout with the calmer stats-plus-focus experience.
Acceptance criteria:
1. The header is lighter and includes Start batch / View batches CTAs.
2. Stats appear near the top with current and lifetime groups.
3. One primary focus card anchors the page.
4. The attention list is compact and capped.
5. Quick actions are lighter than the old dock.
6. Recent activity and support are both visibly secondary.
7. The page no longer behaves like a second Batches page.
Files expected:
1. `src/components/home/HomeHeader.tsx`
2. `src/components/home/HomePrimaryFocusCard.tsx`
3. `src/components/home/HomeQuickLogDock.tsx`
4. `src/components/home/HomeRecentMovement.tsx`
5. `src/components/home/HomeSupportPanel.tsx`
6. `src/components/home/HomeTodayQueue.tsx`
7. `src/components/home/HomeBatchRoster.tsx`
8. likely new home stats component(s)
9. `src/pages/Index.tsx`
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

### Milestone 3: Mobile-first restructure and embedded quick actions
Goal:
Reduce the homepage section count on mobile, embed quick-log launch actions into the primary focus card, and merge the greeting/state/current-stats area into one strong overview block.
Acceptance criteria:
1. The visible quick-log dock is removed from the homepage layout.
2. Quick-log launch actions live on the main focus card.
3. The top overview block combines greeting, state sentence, and current stats.
4. Lifetime stats become their own compact section.
5. Recent activity and support are lightweight enough not to feel like full competing modules.
6. The page is shorter and calmer on mobile.
Files expected:
1. `src/pages/Index.tsx`
2. `src/components/home/HomeHeader.tsx`
3. `src/components/home/HomePrimaryFocusCard.tsx`
4. `src/components/home/HomeQuickLogDock.tsx`
5. `src/components/home/HomeRecentMovement.tsx`
6. `src/components/home/HomeSupportPanel.tsx`
7. `src/components/home/HomeTodayQueue.tsx`
8. `src/components/home/HomeStatsGrid.tsx`
9. `src/copy/home.ts`
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`.
2. Inspected `src/pages/Index.tsx`, `src/lib/home-command-center.ts`, and the current home components under `src/components/home/`.
3. Confirmed that Home still uses a command-center model with `snapshotStats`, `actionLanes`, and `activeRoster`.
4. Traced available persisted data for the requested stats in `kombucha_batches` and `batch_bottles`.
5. Replaced the old command-center shape in `src/lib/home-command-center.ts` with a calmer overview model built around current stats, lifetime stats, primary focus, compact attention items, recent activity mini, and quick actions.
6. Updated `src/pages/Index.tsx` to load real `batch_bottles` counts and to use the new home model instead of `snapshotStats`, `actionLanes`, and `activeRoster`.
7. Added `src/components/home/HomeStatsGrid.tsx` and rebuilt the main home surfaces to support the new calmer hierarchy.
8. Removed legacy unused home surfaces that depended on the old command-center types: `HomeActionLanes.tsx` and `HomeSnapshotStrip.tsx`.
9. Ran validation:
   - `npx tsc -b` passed
   - `npm run lint` passed with the same 9 pre-existing `react-refresh/only-export-components` warnings
   - `npm run test` passed
   - `npm run build` passed with the existing Browserslist age notice and Vite chunk-size warning
10. Re-opened the current homepage after the first overhaul and confirmed that mobile still reads like too many stacked sections.
11. Identified the next mobile-first changes: merge the overview area, move quick-log triggers onto the focus card, remove the visible quick-log dock, and further reduce the weight of recent activity/support.
12. Merged the greeting, state sentence, and current stats into a single top overview block in `HomeHeader.tsx`.
13. Moved quick-log launch actions directly onto `HomePrimaryFocusCard.tsx` and turned `HomeQuickLogDock.tsx` into a controller-only drawer layer.
14. Reworked the lifetime stats, attention list, recent activity, and support surfaces to be shorter and lighter on mobile.
15. Ran final validation:
   - `npx tsc -b` passed
   - `npm run lint` passed with the same 9 pre-existing `react-refresh/only-export-components` warnings
   - `npm run test` passed
   - `npm run build` passed with the existing Browserslist age notice and Vite chunk-size warning

## Decision log
1. Keep the existing Home quick-log drawer flow so behavior stays familiar, but demote its visual weight in the new layout.
2. Compute lifetime stats from real persisted data already available through `kombucha_batches` and `batch_bottles`, avoiding schema changes.
3. Count `Completed batches` as saved batches with status `completed` or `archived`, while `Total batches brewed` counts all saved batches except `discarded`.
4. Keep the existing quick-log drawer behavior for Home, but demote it to a lighter action strip instead of a dominant dock.
5. For the mobile-first pass, keep the drawer interaction but turn `HomeQuickLogDock` into a controller-only layer so Home no longer spends a full visible section on quick logging.
6. Keep the current and all-time stats split, but move only the current stats into the top overview block so the page reads faster on mobile.

## Open questions
1. None currently blocking.

## Done when
1. Home is calmer and more summary-driven than the current command-center layout.
2. The page shows real current stats: Active, In F1, In F2, and Needs attention today.
3. The page shows real lifetime stats: Total kombucha brewed, Total bottles bottled, Completed batches, and Total batches brewed.
4. One primary focus card remains the homepage anchor.
5. The old heavy active-roster treatment is removed from Home.
6. Quick actions still work but no longer dominate the page.
7. Recent activity and support are both visibly lighter and secondary.
8. The top of the page reads as one overview block on mobile instead of multiple stacked sections.
9. Quick-log launch actions are directly available from the main focus card.

## Final validation
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Pre-existing baseline noted before this task:
1. `npm run lint` shows 9 pre-existing `react-refresh/only-export-components` warnings.
2. `npm run build` shows the existing Browserslist age notice and Vite chunk-size warning.
