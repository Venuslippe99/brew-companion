# My Batches UX Overhaul

## Summary
Overhaul `src/pages/MyBatches.tsx` and its supporting browse surfaces so My Batches becomes the app's clear batch library: wider, easier to scan, more useful for active and historical browsing, and rewritten with calmer, stronger user-facing copy.

## Why
The current My Batches route works, but it still feels like an early list screen instead of a mature batch library.

Current product problems:
1. the route is artificially narrow at `max-w-2xl`, which makes the page feel cramped for a dedicated browse surface
2. the current browse model is mostly four status tabs plus a name-only search
3. the filter button only reveals sort chips, so "filters" are weaker than the UI implies
4. batch cards are functional but generic, and active, completed, archived, and discarded browsing all feel too similar
5. there is little result orientation beyond the tabs, so the user has to infer what subset they are seeing
6. visible copy is still generic in places, with wording like `New`, `Search batches...`, `No matches`, and `No active batches`

This overhaul is needed so My Batches feels like:
1. the dedicated place to browse the user's brewing world
2. a clear route for finding the right batch quickly
3. a more useful active-batch library without duplicating Home's urgency layer
4. a calmer historical browse experience for completed, archived, and discarded batches

## Scope
In scope:
1. Redesign the route-level composition in `src/pages/MyBatches.tsx`.
2. Widen and rebalance the page layout so it feels like a browse surface instead of a narrow list.
3. Improve the browsing model beyond the current status tabs by adding more useful secondary narrowing for active batches.
4. Improve search behavior using already-loaded batch data where practical.
5. Replace the current "filters means sort" interaction with clearer browse controls.
6. Add stronger results framing so the user understands which subset is visible and how many results are shown.
7. Redesign `src/components/batches/BatchCard.tsx` for clearer hierarchy and better scanability.
8. Rewrite visible copy across the touched route and batch browse surfaces.
9. Preserve existing route/data loading, navigation, stage badge usage, caution usage, and next-action derivation.

Out of scope:
1. Schema or migration changes. No schema change is expected for this overhaul.
2. Changes to `kombucha_batches` persistence behavior.
3. Changes to stage semantics, caution semantics, or next-action rules in `src/lib/batches.ts`.
4. Changes to batch detail, Home, or New Batch behavior beyond navigation targets already used by My Batches.
5. Fetching new tables such as outcomes, reminders, or timeline rows unless implementation discovers a real blocker and the plan is updated first.
6. Building an advanced enterprise-style data grid or dense expert-facing analytics surface.

## Current state
1. **Route behavior in `src/pages/MyBatches.tsx`**
   - The route reads directly from `kombucha_batches` through Supabase.
   - It selects a focused set of batch fields and maps them into `KombuchaBatch[]` locally inside the page.
   - Data is ordered by `updated_at` descending before client-side filtering and sorting.
   - The page currently owns all browse state locally:
     - `activeTab`
     - `search`
     - `sort`
     - `showFilters`
     - `batches`
     - `loading`

2. **Current layout**
   - The route uses `AppLayout` and a centered `max-w-2xl` container.
   - The page is visually compact and single-column.
   - That width works for a simple list, but it undersells the route now that the rest of the app has richer library-like surfaces.

3. **Current top-level browse controls**
   - There is a page title and a very small `New` button.
   - Search is always visible, but the placeholder is generic: `Search batches...`.
   - The search only checks batch name.
   - A filter icon toggles `showFilters`, but what appears are only three sort chips:
     - `Newest`
     - `Oldest`
     - `Recently updated`
   - This makes the page look like it has filters when it mostly has sort options.

4. **Current status browsing**
   - The route uses four tabs based on `BatchStatus`:
     - `active`
     - `completed`
     - `archived`
     - `discarded`
   - Counts are shown per tab.
   - This is useful baseline organization, but it is too shallow for active-batch browsing because active brewers also think in terms of stage, attention, and near-term checks.

5. **Current result rendering**
   - The page goes from controls directly into the result list.
   - There is no dedicated results-summary surface explaining what subset is visible, how many results are shown, whether a search is active, or whether filters are affecting the list.

6. **Current empty states**
   - Loading uses a simple centered card with `Loading batches...`.
   - Empty states use generic wording like:
     - `No matches`
     - `No active batches`
   - The active empty state invites the user to start a new batch, but the copy is still early-stage and generic.

7. **Current batch card in `src/components/batches/BatchCard.tsx`**
   - The card uses:
     - batch name
     - `StageIndicator`
     - `CautionBadge`
     - day count
     - `getNextAction(batch)`
     - tea type
     - room temperature
     - total volume
   - This is already grounded in shared batch helpers, which is good.
   - The hierarchy is still generic:
     - the next action is present, but not strongly framed
     - the supporting line is mechanically informative, but not very browse-oriented
     - every card looks broadly similar regardless of whether the batch is active, completed, archived, or discarded

8. **Current shared batch/status logic in `src/lib/batches.ts`**
   - `KombuchaBatch` is the shared domain shape My Batches relies on.
   - `getDayNumber(...)` derives day count.
   - `getStageLabel(...)` centralizes stage labels.
   - `getNextAction(...)` centralizes next-step text when a batch row does not provide one.
   - These helpers should continue to own shared meaning so the route does not fork lifecycle logic in JSX.

9. **Current shared status UI in `src/components/common/StageIndicator.tsx`**
   - `StageIndicator` renders the central stage label and style.
   - `CautionBadge` renders shared caution tone and labels such as `Monitor`, `Caution`, and `High Caution`.
   - These are already reusable browse signals and should remain part of the card language unless a clearer presentation still preserves their meaning.

10. **Current data compatibility**
    - The route reads only from `kombucha_batches`.
    - It navigates to `/batch/:id` and `/new-batch`.
    - No schema change is expected for this UX overhaul.

## Intended outcome
1. **My Batches becomes a real batch library**
   - The route should feel wider, calmer, and more professional on desktop while remaining readable on mobile.
   - It should feel distinct from Home: less urgency-driven, more browse-oriented.

2. **Browsing becomes more natural**
   - Status remains a top-level organization layer.
   - Active browsing gains a modest secondary filter model that matches how brewers think, such as:
     - all active
     - needs attention
     - F1
     - F2
     - ready to check / ready now
     - recently updated
   - This should help users narrow active work without turning the route into a complex data tool.

3. **Search becomes meaningfully better**
   - Search should stay always visible.
   - Matching should expand beyond batch name where the route already has safe, relevant fields, likely including:
     - name
     - tea type
     - stage label
     - target preference
     - vessel type
   - Search should remain beginner-friendly and not require special syntax.

4. **Browse controls become clearer**
   - Sorting should remain available, but not masquerade as the only filter behavior.
   - The user should be able to understand:
     - which status section they are viewing
     - whether a narrower active subset is selected
     - whether search is active
     - how the current sort affects results

5. **Results orientation becomes explicit**
   - The route should provide a summary line or light summary block that explains:
     - the visible subset
     - the result count
     - whether a search or filter is narrowing the list

6. **Batch cards become easier to scan**
   - A user should be able to scan a card and quickly understand:
     - what batch this is
     - what stage it is in
     - whether it needs caution
     - what the next meaningful step is
     - whether opening the detail page is likely to matter right now
   - The card should be clearer, not heavier.

7. **Different statuses feel more appropriate to their browse job**
   - Active batches should emphasize stage, attention, and next action.
   - Completed batches should feel more like revisitable finished work.
   - Archived and discarded batches should feel more reference-oriented and quieter.
   - This can be achieved with copy, result framing, and modest card treatment differences rather than four fully separate UIs.

8. **Copy feels intentionally written**
   - The page header, browse controls, result summary, empty states, and touched card lines should sound like a calm brewing companion product, not a CRUD list or admin screen.

## Files and systems involved
1. **Primary route file**
   - `src/pages/MyBatches.tsx`

2. **Primary browse card**
   - `src/components/batches/BatchCard.tsx`

3. **Shared domain helpers**
   - `src/lib/batches.ts`
   - reuse `KombuchaBatch`
   - reuse `getDayNumber(...)`
   - reuse `getNextAction(...)`
   - reuse `getStageLabel(...)` where needed

4. **Shared status components**
   - `src/components/common/StageIndicator.tsx`

5. **Supporting route/UI pieces likely involved**
   - `src/components/layout/AppLayout.tsx`
   - `src/components/common/ScrollReveal.tsx`
   - `src/components/ui/button.tsx`
   - possibly new browse-specific components under `src/components/batches/` if extraction improves clarity, such as:
     - `BatchLibraryHeader.tsx`
     - `BatchLibraryControls.tsx`
     - `BatchResultsSummary.tsx`
   - exact filenames can vary, but the page should not become a larger monolith to achieve the redesign

6. **Data read path**
   - `public.kombucha_batches`
   - no additional table reads are expected by default

7. **Generated types / schema**
   - `src/integrations/supabase/types.ts`
   - default expectation: no changes

## Risks and compatibility checks
1. **Route/data regression**
   - Do not break the existing read path from `kombucha_batches`.

2. **Navigation regression**
   - The route must keep navigation to `/batch/:id` and `/new-batch` working cleanly.

3. **Lifecycle-rule drift**
   - The redesign must continue to reuse shared stage labels, caution display, and next-action logic rather than inventing component-local lifecycle meaning.

4. **Overcomplicated filtering**
   - Adding more useful browse controls must not turn the page into a dense expert-only control panel.

5. **Active-vs-history blur**
   - The redesign must improve active browsing without making completed, archived, and discarded sections feel equally urgent.

6. **Search-scope confusion**
   - Search should become broader than name-only, but the matched fields must remain intuitive and explainable to the user.

7. **Card overload**
   - The batch card should become clearer, not busier.
   - More information should not arrive as more equally weighted text.

8. **Copy under-delivery**
   - A layout-only refactor would fail the task.
   - Copy rewrite is part of done and must explicitly remove generic/admin-like wording from touched surfaces.

9. **Responsive layout regression**
   - The route must feel more spacious on desktop without becoming awkward on mobile.

10. **Status-component compatibility**
    - If `StageIndicator` or `CautionBadge` presentation is touched, stage names and caution meanings must remain consistent with the rest of the app.

11. **Schema scope creep**
    - No schema change is expected.
    - If implementation discovers a real blocker, the plan must be updated before any migration or generated-type work begins.

12. **Validation gaps**
    - Because this is primarily UX and copy work, it would be easy to skip build or routing validation.
    - Validation must still confirm route compatibility and basic browse behavior.

## Milestones

### Milestone 1: Inspect current My Batches flow and finalize execution plan
Goal:
Document the current My Batches route, batch card, shared batch helpers, and redesign direction in a repo-specific plan.

Acceptance criteria:
1. The plan exists at `plans/2026-03-23-my-batches-ux-overhaul.md`.
2. The current browse problems are described repo-specifically.
3. The target information architecture is documented clearly.
4. The plan explicitly states that no schema change is expected.
5. The plan explicitly calls out copy rewrite as required work.

Files expected:
1. `plans/2026-03-23-my-batches-ux-overhaul.md`

Validation:
1. No code validation required for this planning milestone.
2. Record baseline issues if discovered during implementation.

Status: completed

### Milestone 2: Rebuild page architecture and browse controls
Goal:
Upgrade `src/pages/MyBatches.tsx` from a narrow filtered list into a clearer batch-library route with stronger layout, search, filtering, sorting, and result orientation.

Acceptance criteria:
1. The page layout is meaningfully improved on desktop and still clear on mobile.
2. Browse controls are more useful than the current status-tabs-plus-sort-toggle model.
3. Active batches can be narrowed in a way that better matches brewer thinking.
4. Search behavior is stronger than name-only where existing batch data supports it.
5. Results are easier to understand through clearer result framing.
6. Route/data loading remains compatible.

Files expected:
1. `src/pages/MyBatches.tsx`
2. likely browse-support components under `src/components/batches/`
3. possibly shared utility styling if needed

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. Confirm the route still loads from `kombucha_batches` and navigation still works

Status: completed

### Milestone 3: Redesign batch card hierarchy
Goal:
Improve the browse usefulness of `BatchCard` so batches are easier to scan and understand at a glance.

Acceptance criteria:
1. Card hierarchy is clearer.
2. Next action is easier to notice.
3. Stage and caution are still prominent but not noisy.
4. Cards feel less generic and more purpose-built for kombucha batch browsing.
5. The card adapts cleanly to active versus historical browsing context where needed.

Files expected:
1. `src/components/batches/BatchCard.tsx`
2. possibly `src/components/common/StageIndicator.tsx` if presentation needs modest adjustment
3. possibly `src/lib/batches.ts` only if a small shared helper is justified and does not change lifecycle rules

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. Confirm stage badge, caution badge, and next-action derivation still behave consistently

Status: completed

### Milestone 4: Rewrite user-facing copy
Goal:
Audit and rewrite visible My Batches copy so the route sounds like a calm brewing companion rather than a generic list or admin screen.

Acceptance criteria:
1. Header and support text are stronger and more human.
2. CTAs are clearer and more intentional.
3. Search, filter, and sort wording feels product-quality.
4. Results-summary language is clear and grounded.
5. Empty states and no-result states are more helpful.
6. Any touched batch-card copy is rewritten to match the new tone.
7. No obviously weak placeholder/admin wording remains in touched surfaces.

Files expected:
1. `src/pages/MyBatches.tsx`
2. touched `src/components/batches/*`
3. possibly touched shared helper output if visible card copy is better derived centrally

Validation:
1. Inspect changed strings directly in touched files.
2. Confirm no obviously weak placeholder/admin wording remains.
3. `npx tsc -b`
4. `npm run lint`
5. `npm run test`
6. `npm run build`

Status: completed

### Milestone 5: Final polish and validation
Goal:
Tighten mobile and desktop behavior, confirm browse/data compatibility, update the plan, and complete final validation.

Acceptance criteria:
1. The page feels cleaner and more professional on mobile and desktop.
2. Browse clarity is materially improved over the current route.
3. No route/data regressions are introduced.
4. Navigation still works.
5. The plan is updated to final state with progress, decisions, and validation notes.

Files expected:
1. `src/pages/MyBatches.tsx`
2. touched supporting browse components
3. `plans/2026-03-23-my-batches-ux-overhaul.md`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. Distinguish pre-existing failures from any new ones

Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md` to confirm repo guidance, plan structure, validation expectations, and the requirement to keep lifecycle and data behavior stable.
2. Inspected `src/pages/MyBatches.tsx` and confirmed the route currently reads only from `kombucha_batches`, maps rows locally into `KombuchaBatch[]`, and applies client-side status, name-only search, and sort.
3. Confirmed `src/pages/MyBatches.tsx` currently uses a narrow `max-w-2xl` layout, a small `New` CTA, a generic `Search batches...` placeholder, a filter icon that only reveals sort chips, and simple empty-state wording.
4. Inspected `src/components/batches/BatchCard.tsx` and confirmed the current card already reuses shared helpers but still feels generic in hierarchy and does not differentiate browse context strongly enough.
5. Inspected `src/lib/batches.ts` and confirmed the route should continue to reuse `KombuchaBatch`, `getDayNumber(...)`, `getStageLabel(...)`, and `getNextAction(...)` instead of introducing component-local lifecycle meaning.
6. Inspected `src/components/common/StageIndicator.tsx` and confirmed shared stage/caution presentation should remain consistent with the rest of the app.
7. Rebuilt `src/pages/MyBatches.tsx` into a wider batch-library route with a stronger header, always-visible search, explicit sort control, active-browse narrowing, results framing, improved loading/error/empty states, and a two-column desktop results grid.
8. Added `src/lib/batch-library.ts` to hold route-specific browse logic for active filters, broader search matching, shared sorting, and status counts without changing lifecycle or persistence rules.
9. Milestone 2 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the same pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the same pre-existing Browserslist age notice and large chunk warning
10. Redesigned `src/components/batches/BatchCard.tsx` so active batches lead with a clearer next-step block while completed, archived, and discarded batches get calmer revisit/reference framing without changing shared stage or next-action logic.
11. Milestone 3 validation:
    - `npx tsc -b`: passed
    - `npm run lint`: passed with the same pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
    - `npm run test`: passed
    - `npm run build`: passed with the same pre-existing Browserslist age notice and large chunk warning
12. Rewrote visible My Batches copy across the route shell, tabs, CTA labels, search placeholder, result summaries, empty states, error state, and batch-card framing so the page reads like a calmer batch library instead of a generic admin list.
13. Added a retry path for the route-level error state in `src/pages/MyBatches.tsx` instead of relying on the earlier alert-based failure behavior.
14. Milestone 4 validation:
    - `npx tsc -b`: passed
    - `npm run lint`: passed with the same pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
    - `npm run test`: passed
    - `npm run build`: passed with the same pre-existing Browserslist age notice and large chunk warning
15. Final polish kept the browse route wider and calmer on desktop, preserved the existing `kombucha_batches` read path and batch-detail navigation, and closed the work without introducing schema or lifecycle changes.
16. Milestone 5 validation:
    - `npx tsc -b`: passed
    - `npm run lint`: passed with the same pre-existing `react-refresh/only-export-components` warnings in shared UI/context files
    - `npm run test`: passed
    - `npm run build`: passed with the same pre-existing Browserslist age notice and large chunk warning

## Decision log
1. No schema change is expected for this overhaul; the work should stay within route composition, browse controls, card hierarchy, and copy.
2. `src/pages/MyBatches.tsx` should remain the owner of the route-level data read and browse-state orchestration instead of moving batch-library data logic into unrelated areas.
3. The redesign should keep status tabs as the top-level browse model, because they align with stored batch status and existing route behavior.
4. Active browsing should gain a secondary narrowing layer instead of replacing the top-level status tabs, because brewers think about active work in more detail than historical batches.
5. Search should expand beyond name-only using existing safe fields already loaded from `kombucha_batches`, rather than introducing new table reads just to support browse UX.
6. Sorting should remain visible and explicit, but it should no longer be the only behavior hidden behind a generic filter affordance.
7. `BatchCard` should continue to rely on shared batch helpers rather than duplicating next-action or stage meaning locally.
8. Copy rewrite is a required part of implementation, not optional polish.
9. Route-specific browse behavior such as active subfilters and broader search matching should live in a dedicated helper instead of becoming component-local ad hoc logic inside `MyBatches.tsx`.
10. `BatchCard` should adapt its summary framing by batch status so active browsing stays action-oriented while historical browsing feels more reflective and reference-oriented.
11. The top-level status organization should remain aligned with stored batch status, but visible tab labels can be softened into more user-facing language such as `Brewing` and `Finished`.

## Open questions
1. None at the moment.

## Done when
1. `src/pages/MyBatches.tsx` feels like a real batch-library route rather than a narrow filtered list.
2. The page layout is materially clearer and more spacious, especially on desktop.
3. Browse controls are more useful than the current status tabs plus sort-toggle model.
4. Active-batch narrowing is more useful without making the page feel complicated.
5. Search is more helpful than name-only using existing compatible batch data.
6. Result orientation is clearer through visible subset and result-summary context.
7. `src/components/batches/BatchCard.tsx` has stronger hierarchy and better scanability.
8. Existing route/data loading, navigation, stage badge usage, caution usage, and next-action derivation remain compatible.
9. No schema change is introduced unless a true blocker is found and the plan is updated first.
10. Visible copy across touched My Batches surfaces is rewritten into calm, practical, user-facing language.
11. Browse clarity is materially improved for active, completed, archived, and discarded batches.

## Final validation
Run after each implementation milestone and again at the end:

1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

If any baseline warning or failure already exists before implementation, record it in this plan and distinguish it from new issues introduced by the My Batches UX overhaul.
