# Feature-Based Copy Extraction

## Summary
Extract meaningful user-facing copy from the current inline React components and pages into feature-specific copy modules under `src/copy/`, while preserving the exact rendered wording and keeping product behavior unchanged.

## Why
The repo currently spreads large amounts of user-facing copy across components, hooks, and pages. That makes major flows like the F1 wizard, the F2 setup flow, home surfaces, and batch detail harder to scan and maintain. This task creates a feature-based copy layer so the UI can keep rendering the same strings while moving labels, helper text, warnings, dynamic summaries, and CTA text into organized modules.

## Scope
In scope:
1. Create `src/copy/` and add feature-specific copy modules.
2. Extract and wire copy for the F1 new-batch wizard.
3. Extract and wire copy for the F2 setup flow.
4. Extract and wire copy for the home/dashboard.
5. Extract and wire copy for other major pages and feature surfaces with meaningful inline copy, including batch detail, settings, guides, onboarding, login, batch library, and F1 library pages where practical.
6. Move dynamic user-facing strings into typed helper functions where they are currently assembled inline.

Out of scope:
1. Any wording changes, copy cleanup, or localization.
2. Any workflow redesign or business-logic changes.
3. Any persistence, lifecycle, or schema changes unless strictly required by a typing-only import path change.

## Current state
The app currently renders a large amount of meaningful copy inline in:
1. `src/components/f1/new-batch-wizard/*`
2. `src/components/f2/F2SetupWizard.tsx`
3. `src/pages/Index.tsx` and home feature components in `src/components/home/*`
4. `src/components/batch-detail/*`
5. Major page files including `src/pages/Settings.tsx`, `src/pages/MyBatches.tsx`, `src/pages/F1Recipes.tsx`, `src/pages/F1Vessels.tsx`, `src/pages/Guides.tsx`, `src/pages/Onboarding.tsx`, and `src/pages/Login.tsx`

Dynamic copy is also built inline in hooks such as `src/components/f1/new-batch-wizard/useNewBatchWizard.ts` and page logic such as `src/pages/Index.tsx` and `src/pages/MyBatches.tsx`.

No dedicated copy layer exists yet under `src/copy/`.

## Intended outcome
The app should render the exact same wording as before, but components and pages should read from feature copy modules and typed copy helpers instead of embedding long literals inline. The main flows should be easier to scan because presentation logic no longer includes large blocks of prose, button labels, or dynamic user-facing string assembly.

## Files and systems involved
1. New copy modules in `src/copy/`
2. F1 new-batch wizard files in `src/components/f1/new-batch-wizard/`
3. F2 setup flow in `src/components/f2/F2SetupWizard.tsx`
4. Home/dashboard route and surfaces in `src/pages/Index.tsx` and `src/components/home/*`
5. Batch detail surfaces in `src/components/batch-detail/*`
6. Additional major page files:
   - `src/pages/Settings.tsx`
   - `src/pages/MyBatches.tsx`
   - `src/pages/F1Recipes.tsx`
   - `src/pages/F1Vessels.tsx`
   - `src/pages/Guides.tsx`
   - `src/pages/Onboarding.tsx`
   - `src/pages/Login.tsx`

## Risks and compatibility checks
1. Accidentally changing wording while extracting strings.
2. Missing dynamic cases when moving inline string assembly into helper functions.
3. Leaving duplicate copy in both modules and components.
4. Making copy modules too global instead of feature-specific.
5. Adding type churn or import clutter that makes components harder to follow.
6. Missing copy embedded in toasts, dialogs, empty states, or helper text.

## Copy and content impact
1. New feature copy modules will be added under `src/copy/`.
2. This task is extraction only; wording must remain unchanged.
3. Dynamic copy helpers will be added for step progress, mode badges, summaries, empty states, and toast/status messages where those are currently assembled inline.

## Milestones

### Milestone 1: Plan and feature map
Goal:
Confirm the copy-heavy feature boundaries and record the extraction approach before edits.
Acceptance criteria:
1. A dedicated plan file exists and reflects the actual repo structure.
2. The main feature modules to create are identified.
Files expected:
1. `plans/2026-03-25-feature-copy-extraction.md`
Validation:
1. No code validation yet; planning only.
Status: completed

### Milestone 2: Extract setup-flow copy
Goal:
Create and wire copy modules for the F1 new-batch wizard and the F2 setup flow.
Acceptance criteria:
1. F1 wizard shell, steps, hook labels/messages, and dialog copy read from `src/copy/f1-new-batch.ts`.
2. F2 setup wizard step metadata, saved-state copy, section copy, review copy, CTA text, warnings, and toasts read from `src/copy/f2-setup.ts`.
3. Dynamic setup-flow user-facing strings are moved into typed helpers where needed.
Files expected:
1. `src/copy/f1-new-batch.ts`
2. `src/copy/f2-setup.ts`
3. `src/components/f1/new-batch-wizard/*`
4. `src/components/f2/F2SetupWizard.tsx`
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 3: Extract home and batch-detail copy
Goal:
Create and wire copy modules for the home/dashboard and batch-detail surfaces.
Acceptance criteria:
1. Home route and major home surfaces read from `src/copy/home.ts`.
2. Batch detail surfaces read from `src/copy/batch-detail.ts`.
3. Dynamic state/loading/toast messages use copy helpers where needed.
Files expected:
1. `src/copy/home.ts`
2. `src/copy/batch-detail.ts`
3. `src/pages/Index.tsx`
4. `src/components/home/*`
5. `src/components/batch-detail/*`
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: in_progress

### Milestone 4: Extract other major page copy and finish validation
Goal:
Apply the same feature-based extraction pattern to other major pages and run the full repo validation suite.
Acceptance criteria:
1. Major page-level copy in settings, guides, onboarding, login, batch library, and F1 library pages is extracted into feature-specific modules.
2. The UI still renders the same wording.
3. No new behavior changes are introduced.
Files expected:
1. `src/copy/settings.ts`
2. `src/copy/guides.ts`
3. `src/copy/auth.ts`
4. `src/copy/batch-library.ts`
5. `src/copy/f1-library.ts`
6. Related page files listed above
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`.
2. Inspected copy-heavy setup flow files in `src/components/f1/new-batch-wizard/*` and `src/components/f2/F2SetupWizard.tsx`.
3. Inspected home/dashboard surfaces in `src/pages/Index.tsx` and `src/components/home/*`.
4. Inspected batch-detail surfaces in `src/components/batch-detail/*`.
5. Inspected other major page files including settings, guides, onboarding, login, batch library, and F1 library pages.
6. Added `src/copy/f1-new-batch.ts` and wired the F1 new-batch wizard shell, steps, footer/header, popup, lineage starter selector, and hook-driven labels/messages to it.
7. Added `src/copy/f2-setup.ts` and wired the F2 setup wizard step metadata, saved-state surfaces, major setup/review labels, CTA copy, and toasts to it.
8. Ran milestone validation:
   - `npx tsc -b` passed
   - `npm run lint` passed with the same 9 pre-existing `react-refresh/only-export-components` warnings
9. Added `src/copy/home.ts` and wired home/dashboard copy in `src/pages/Index.tsx` and `src/components/home/*`.
10. Added `src/copy/batch-detail.ts` and wired batch-detail overview, reminder, current-phase, hero, and completed-summary surfaces to it.
11. Ran milestone validation:
   - `npx tsc -b` passed
   - `npm run lint` passed with the same 9 pre-existing `react-refresh/only-export-components` warnings
12. Added page-level feature copy modules for settings, F1 libraries, batch library, guides, onboarding, and auth.
13. Wired `src/pages/Settings.tsx`, `src/pages/F1Recipes.tsx`, `src/pages/F1Vessels.tsx`, `src/pages/MyBatches.tsx`, `src/pages/Guides.tsx`, `src/pages/Onboarding.tsx`, and `src/pages/Login.tsx` to those modules.
14. Ran final validation:
   - `npx tsc -b` passed
   - `npm run lint` passed with the same 9 pre-existing `react-refresh/only-export-components` warnings
   - `npm run test` passed
   - `npm run build` passed, with the existing Browserslist age notice and Vite chunk-size warning

## Decision log
1. Use multiple feature modules under `src/copy/` instead of one global copy file, to match the user request and feature ownership.
2. Extract dynamic copy into helper functions only when the output is user-facing text, while leaving tiny formatting fragments inline where extraction would add noise.
3. Keep the first milestone focused on the two setup flows first, then broaden the same pattern to the rest of the app once the copy-module shape is proven in the largest workflows.

## Open questions
1. None currently blocking. Scope will stay focused on copy extraction only.

## Done when
1. Meaningful user-facing copy across the targeted features has been moved into feature-specific copy modules.
2. Components and pages are wired to those modules instead of inline literals.
3. Dynamic user-facing strings are generated through copy helpers where practical.
4. Rendered wording remains unchanged.
5. Validation passes, with any pre-existing failures clearly separated from new ones.

## Final validation
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Pre-existing baseline noted before this task:
1. `npm run lint` has 9 pre-existing `react-refresh/only-export-components` warnings in shared UI/context files.
2. `npm run build` shows the existing Browserslist age notice and Vite chunk-size warning.
