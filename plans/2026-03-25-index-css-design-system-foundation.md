# Index CSS Design-System Foundation Upgrade

## Summary
Upgrade `src/index.css` from a basic theme/token file into a richer shared design-system foundation with stronger semantic tokens, reusable shell and surface classes, motion helpers, typography roles, and more intentional status styling.

## Why
The app already has solid product flows, but the shared visual foundation is still comparatively thin. A stronger CSS foundation will make the product feel warmer, more layered, and more intentional without requiring page-by-page redesign work or behavior changes.

## Scope
In scope:
1. Expand the semantic token system in `src/index.css`.
2. Add reusable shell/page-chrome classes.
3. Add motion and interaction baseline tokens/helpers.
4. Add a small set of reusable typography roles.
5. Improve status and stage styling foundations.
6. Introduce a richer warm-atmosphere foundation using the existing palette.
7. Make small shared-layout integrations only if they help the new CSS foundation land cleanly.

Out of scope:
1. Redesigning Guides or Assistant.
2. Changing app logic or route behavior.
3. Rewriting copy.
4. Doing a broad page-by-page visual rewrite.

## Current state
1. `src/index.css` already defines:
   - core light/dark theme tokens
   - some brand tokens (`honey`, `amber`, `sage`, `tea`, `copper`)
   - stage color tokens
   - font family tokens
   - a few custom utilities
   - a few Home-specific surface classes
2. `src/components/layout/AppLayout.tsx` and newer shell files still rely heavily on inline Tailwind class combinations for shell chrome.
3. Major pages like Home, My Batches, Batch Detail, New Batch, F1 Recipes, F1 Vessels, and Settings still use repeated border/background/shadow combinations rather than semantic shared classes.

## Intended outcome
1. `src/index.css` becomes a true shared design foundation rather than only a theme file.
2. The app gains a richer semantic token system for surfaces, borders, elevation, radius, motion, and status.
3. Shared shell and page-surface patterns become expressible through reusable semantic classes.
4. The product feels warmer, deeper, and more intentional without changing user flows or rewriting pages.

## Files and systems involved
1. Primary:
   - `src/index.css`
2. Small shared-layout integration if needed:
   - `src/components/layout/AppLayout.tsx`
   - `src/components/layout/PageShellHeader.tsx`

## Risks and compatibility checks
1. Over-styling the app and drifting into redesign rather than foundation work.
2. Making dark mode inconsistent if new tokens are not mirrored properly.
3. Accidentally making shell styling too heavy or decorative.
4. Adding semantic classes but leaving them too disconnected from current shared shell usage.

## Copy and content impact
1. No copy rewrite.
2. No copy extraction work required.
3. Only visual foundation changes.

## Milestones

### Milestone 1: Define the expanded design-system structure
Goal:
Document the intended token and class layers, then implement them cleanly in `index.css`.
Acceptance criteria:
1. The plan is created and scoped.
2. The token/class categories to add are clear before editing.
Files expected:
1. `plans/2026-03-25-index-css-design-system-foundation.md`
Validation:
1. none before implementation
Status: completed

### Milestone 2: Expand index.css into a richer design-system foundation
Goal:
Add semantic tokens, shell/page classes, motion helpers, typography roles, status styling, and a warmer atmospheric layer.
Acceptance criteria:
1. `index.css` contains clear semantic token sections beyond the current theme tokens.
2. Reusable shell and page-surface classes exist.
3. Motion, typography, and status foundations are stronger and reusable.
Files expected:
1. `src/index.css`
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 3: Land minimal shared integrations and validate fully
Goal:
Use the new semantic shell/surface classes where a couple of shared components benefit most, then validate the app.
Acceptance criteria:
1. Any shared-layout integration remains small and foundation-focused.
2. Full repo validation passes.
Files expected:
1. `src/index.css`
2. optional small updates in shared layout components
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

## Progress log
1. Read `AGENTS.md` and inspected `src/index.css`.
2. Inspected `src/components/layout/AppLayout.tsx` and key pages using repeated surface/header patterns.
3. Confirmed the current CSS foundation is still stronger as a theme file than as a reusable design-system layer.
4. Rebuilt `src/index.css` into clearer sections for semantic tokens, utilities, and reusable component/surface classes.
5. Added expanded token categories for surface hierarchy, divider/border strength, elevation, radius scale, spacing, motion, and richer status styling.
6. Added reusable shell/page classes for app shell, page headers, mobile nav, surface hierarchy, typography roles, and warm atmospheric treatments.
7. Applied a small shared-layout integration in `AppLayout.tsx` and `PageShellHeader.tsx` so the new semantic shell classes are used in real app chrome.
8. Ran full validation: `npx tsc -b`, `npm run lint`, `npm run test`, and `npm run build`.
9. Confirmed there were no new failures; the existing Browserslist age notice still appears during build.

## Decision log
1. Keep the work centered on `src/index.css`, with only minimal component integrations if they help prove the new shared classes in real shell usage.

## Open questions
1. None currently blocking implementation.

## Done when
1. `src/index.css` is meaningfully more expressive and organized.
2. The app has richer semantic tokens, shell/page classes, motion helpers, typography roles, and status styling foundations.
3. The visual system feels warmer and deeper in foundation without changing behavior.
4. Guides and Assistant are not specifically redesigned.

## Final validation
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
