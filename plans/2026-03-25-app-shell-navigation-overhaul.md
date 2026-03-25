# App Shell And Navigation Overhaul

## Summary
Redesign the app shell into a centralized, route-aware system with stronger page identity, mobile top bars, standardized sticky headers, lighter mobile navigation, and clearer overview/detail/flow behavior.

## Why
The current shell mostly provides a desktop sidebar and a mobile bottom nav. That is no longer enough for the app’s route depth and product maturity. On mobile especially, major pages still feel like content dropped onto the screen with little orientation help. The app needs a stronger shell layer so users can understand where they are, what kind of page they are on, and what the main action of the screen is.

## Scope
In scope:
1. Create a centralized route-aware shell metadata layer.
2. Refactor `AppLayout` into a true shell orchestrator for desktop sidebar, mobile top bars, sticky page headers, and bottom-nav behavior.
3. Apply the new shell treatment to:
   - `/`
   - `/batches`
   - `/new-batch`
   - `/batch/:id`
   - `/batch/:id/f2/setup`
   - `/batch/:id/lineage`
   - `/f1-recipes`
   - `/f1-vessels`
   - `/settings`
4. Rework mobile bottom navigation so it feels lighter and the New Batch action is more integrated.
5. Normalize top spacing and redundant page identity blocks where the shell now provides that identity.

Out of scope:
1. Redesigning Guides or Assistant page content.
2. Changing Guides or Assistant route behavior.
3. Rewriting broader product copy unrelated to shell labels.
4. Changing feature logic for F1, F2, lineage, or batch lifecycle behavior.

## Current state
1. `src/App.tsx` defines all route entries and lazy-loaded pages.
2. `src/components/layout/AppLayout.tsx` currently only renders:
   - a desktop sidebar
   - a fixed mobile bottom nav
   - a generic `main` content wrapper
3. Key pages like `Index`, `MyBatches`, `BatchDetail`, `NewBatch`, and `F2Setup` still provide their own top identity in ad hoc ways, including:
   - standalone headings
   - inline back buttons
   - page-level spacing that assumes there is no shared top bar
4. Mobile currently lacks a strong page identity layer for major routes.
5. The bottom nav still uses a more generic raised New tab treatment that feels closer to a floating action button than an intentional product navigation action.

## Intended outcome
1. The app shell becomes route-aware and centrally configured.
2. Key overview, detail, and flow pages gain consistent mobile top bars and sticky page headers.
3. New Batch and F2 Setup feel like workflow modes rather than plain content pages.
4. Batch Detail and Lineage feel like true detail screens with stronger orientation and shared back navigation.
5. The mobile bottom nav becomes visually lighter and more integrated, while keeping New Batch emphasized in a more product-specific way.
6. Guides and Assistant remain on simpler shell treatment and are not redesigned.

## Files and systems involved
1. Route and shell orchestration:
   - `src/App.tsx`
   - `src/components/layout/AppLayout.tsx`
   - new layout/shell helper files under `src/components/layout/`
2. Route metadata and shared shell copy:
   - new route-shell config file
   - new shell copy module under `src/copy/`
3. Overview routes:
   - `src/pages/Index.tsx`
   - `src/pages/MyBatches.tsx`
   - `src/pages/F1Recipes.tsx`
   - `src/pages/F1Vessels.tsx`
4. Detail routes:
   - `src/pages/BatchDetail.tsx`
   - `src/pages/BatchLineage.tsx`
5. Flow routes:
   - `src/pages/NewBatch.tsx`
   - `src/pages/F2Setup.tsx`
6. Settings route:
   - `src/pages/Settings.tsx`

## Risks and compatibility checks
1. Breaking route behavior or navigation if route metadata resolution is wrong.
2. Creating doubled headers or awkward top spacing if existing page intros are not normalized carefully.
3. Interfering with fixed/sticky guided-flow footers in New Batch or F2 Setup.
4. Making Guides or Assistant feel unintentionally redesigned if the default shell behavior is too aggressive.
5. Regressing mobile safe-area spacing with the new top and bottom chrome.

## Copy and content impact
1. Add a feature-level shell copy module for navigation labels and shell titles.
2. Reuse existing feature copy modules for page titles where practical.
3. Keep copy changes tightly scoped to shell labels and route titles/subtitles needed for the new shell.

## Milestones

### Milestone 1: Establish shell infrastructure
Goal:
Create the centralized route-shell config, shell copy, and shared header/nav components, then refactor `AppLayout` to use them.
Acceptance criteria:
1. `AppLayout` becomes route-aware.
2. Mobile top bar and sticky header infrastructure exists.
3. Shell variants are centralized rather than scattered in page code.
Files expected:
1. `src/components/layout/AppLayout.tsx`
2. new shell/layout helper files
3. new shell copy/config files
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 2: Apply the shell to overview routes
Goal:
Use the new shell on Home, My Batches, F1 Recipes, F1 Vessels, and Settings, and trim redundant page-level identity where practical.
Acceptance criteria:
1. These routes have consistent shell headers on mobile.
2. Overview routes no longer feel like raw content drops.
3. Top spacing becomes more consistent.
Files expected:
1. `src/pages/Index.tsx`
2. `src/pages/MyBatches.tsx`
3. `src/pages/F1Recipes.tsx`
4. `src/pages/F1Vessels.tsx`
5. `src/pages/Settings.tsx`
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 3: Apply the shell to detail and flow routes
Goal:
Add detail/flow shell treatment to Batch Detail, Batch Lineage, New Batch, and F2 Setup, then normalize spacing and bottom-nav behavior.
Acceptance criteria:
1. Detail routes have shared back navigation and stronger identity.
2. Flow routes feel more task-oriented and immersive.
3. Mobile bottom nav is lighter and New Batch is more integrated.
4. Key routes no longer fight the shell with redundant top spacing or duplicated back rows.
Files expected:
1. `src/pages/BatchDetail.tsx`
2. `src/pages/BatchLineage.tsx`
3. `src/pages/NewBatch.tsx`
4. `src/pages/F2Setup.tsx`
5. `src/components/layout/AppLayout.tsx`
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`.
2. Inspected `src/App.tsx`, `src/components/layout/AppLayout.tsx`, and the core route pages listed in the request.
3. Confirmed the current shell is still mostly sidebar plus bottom nav, with page identity handled ad hoc inside pages.
4. Confirmed Guides and Assistant currently route through `AppLayout` and should remain on simpler treatment.
5. Added a shared shell copy module plus centralized route-shell metadata for overview, detail, flow, settings, and simple route modes.
6. Added a shared sticky page-header component and refactored `AppLayout` to resolve route shell behavior centrally.
7. Reworked mobile bottom navigation into a lighter floating capsule and integrated New Batch as an emphasized in-nav action rather than a detached floating button.
8. Applied shell overrides to core routes with dynamic titles where needed, including Batch Detail, F2 Setup, and Batch Lineage.
9. Removed redundant inline back rows from detail/flow pages and reduced some duplicate top-level headings where the shell now provides page identity.
10. Validated shell infrastructure with `npx tsc -b` and `npm run lint`.
11. Ran the full validation suite: `npx tsc -b`, `npm run lint`, `npm run test`, and `npm run build`.
12. Confirmed the shell overhaul builds cleanly; the only remaining build notice is the previously known Browserslist age warning.

## Decision log
1. Use centralized route metadata plus optional page-level overrides for dynamic titles, so the shell stays centralized without hard-coding batch names in route config.
2. Keep Guides and Assistant on `simple` shell treatment with no new header bar so this overhaul stays focused on the core brewing routes.

## Open questions
1. None currently blocking implementation.

## Done when
1. The app has a centralized route-aware shell system.
2. Key screens have mobile top bars and standardized sticky page headers.
3. Overview, detail, flow, and settings routes feel distinct through shell behavior.
4. The mobile bottom nav is lighter, and New Batch remains prominent without feeling like a generic floating action button.
5. Guides and Assistant are left on simpler shell treatment.

## Final validation
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
