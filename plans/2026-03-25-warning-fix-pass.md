# Warning Fix Pass

## Summary
Fix the current repo warning/notices state without changing homepage product behavior: remove the 9 `react-refresh/only-export-components` warnings, attempt a real Browserslist data refresh, and address the Vite chunk-size warning through bundle-shape improvements.

## Why
The repo currently validates with lint/build noise that should be cleaned up. The task is narrowly scoped to warning/build health, not product redesign.

## Scope
In scope:
1. Fix the 9 `react-refresh/only-export-components` warnings structurally.
2. Attempt a real Browserslist data refresh in the repo/tooling.
3. Improve bundle shape so the Vite chunk-size warning is addressed through real loading changes.
4. Keep homepage behavior functionally unchanged unless a warning fix requires a tiny related change.

Out of scope:
1. Homepage redesign or UX changes.
2. Copy changes unrelated to warnings.
3. Broad refactors beyond what is needed to fix lint/build health.

## Current state
Current warnings/notices:
1. `npm run lint` reports 9 `react-refresh/only-export-components` warnings in:
   - `src/components/ui/badge.tsx`
   - `src/components/ui/button.tsx`
   - `src/components/ui/form.tsx`
   - `src/components/ui/navigation-menu.tsx`
   - `src/components/ui/sidebar.tsx`
   - `src/components/ui/sonner.tsx`
   - `src/components/ui/toggle.tsx`
   - `src/contexts/AuthContext.tsx`
   - `src/contexts/UserContext.tsx`
2. `npm run build` reports a Browserslist age notice.
3. `npm run build` reports a Vite chunk-size warning on the main JS bundle.

Current route loading in `src/App.tsx` is eager for all major pages, which likely contributes to the bundle warning.

## Intended outcome
1. Lint no longer reports the 9 Fast Refresh warnings.
2. Browserslist data is refreshed if the environment allows it; otherwise the exact blocker and follow-up command are documented.
3. The main bundle is materially improved by real route-level lazy loading or similar structural changes, ideally removing the chunk-size warning.

## Files and systems involved
1. Route/build:
   - `src/App.tsx`
   - `vite.config.ts` if needed
   - `package.json`
   - lockfile/package metadata if Browserslist refresh succeeds
2. UI component files producing warnings:
   - `src/components/ui/badge.tsx`
   - `src/components/ui/button.tsx`
   - `src/components/ui/form.tsx`
   - `src/components/ui/navigation-menu.tsx`
   - `src/components/ui/sidebar.tsx`
   - `src/components/ui/sonner.tsx`
   - `src/components/ui/toggle.tsx`
3. Context files producing warnings:
   - `src/contexts/AuthContext.tsx`
   - `src/contexts/UserContext.tsx`
4. Any new companion files created to separate non-component exports from component files.

## Risks and compatibility checks
1. Breaking imports when splitting component helper exports into companion files.
2. Breaking auth or user preference access while splitting context hooks.
3. Breaking route behavior when adding lazy loading.
4. Failing to refresh Browserslist data because of network restrictions.

## Copy and content impact
1. No intentional copy changes.
2. Any tiny loading fallback needed for lazy routes should remain minimal and not change product wording more than necessary.

## Milestones

### Milestone 1: Remove the Fast Refresh lint warnings structurally
Goal:
Split mixed component/non-component exports into companion files and update imports.
Acceptance criteria:
1. The 9 `react-refresh/only-export-components` warnings are removed.
Files expected:
1. The 9 warning-producing files plus any new companion files.
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 2: Address build notices
Goal:
Attempt Browserslist refresh and improve bundle shape with real code splitting.
Acceptance criteria:
1. A real Browserslist refresh attempt is made and the outcome is recorded honestly.
2. Route-level lazy loading or equivalent real bundle improvements are implemented.
3. The chunk-size warning is removed or materially addressed with a clear explanation.
Files expected:
1. `src/App.tsx`
2. possible package/lockfile changes
3. optional small build-config updates only if truly needed
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`.
2. Inspected `src/App.tsx`, `vite.config.ts`, and `package.json`.
3. Inspected all 9 files currently triggering `react-refresh/only-export-components`.
4. Confirmed the current route setup eagerly imports all major pages.
5. Split non-component exports into companion files for shared button/toggle variants and auth/user hooks/types.
6. Removed unnecessary non-component exports from UI/component files where the helpers were only used internally.
7. `npm run lint` no longer reports any `react-refresh/only-export-components` warnings.
8. Attempted `npx update-browserslist-db@latest` locally; first hit a permissions/network-style `EACCES` failure, then reran with escalation.
9. Escalated Browserslist refresh attempt failed because the tool tries to invoke `bun`, which is not installed in this environment.
10. Added route-level lazy loading in `src/App.tsx` so major pages no longer ship in one eager app chunk.
11. `npm run build` no longer reports the Vite chunk-size warning.

## Decision log
1. Prefer companion-file splits for non-component exports over silencing ESLint.
2. Prefer route-level lazy loading over just increasing Vite’s chunk warning threshold.

## Open questions
1. Browserslist data still needs a dependency refresh once `bun` is available or the update command is run in a matching package-manager environment.

## Done when
1. The 9 Fast Refresh warnings are fixed.
2. Browserslist refresh is either completed or honestly documented after a real attempt.
3. The Vite chunk-size warning is addressed through real improvements.
4. Homepage behavior remains functionally unchanged.

## Final validation
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Pre-existing baseline before this task:
1. `npm run lint` had 9 `react-refresh/only-export-components` warnings.
2. `npm run build` had a Browserslist age notice.
3. `npm run build` had a Vite chunk-size warning.
