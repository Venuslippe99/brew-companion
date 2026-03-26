# Design System Adoption Pass

## Summary
Refactor the targeted core screens and components so they consistently consume the existing shared shell, surface, status, and typography classes from `src/index.css` without doing a visual redesign.

## Why
The repo already has an app shell, route-level shell configuration, and a shared design-system foundation, but several core screens still rely on repeated component-local Tailwind combinations for borders, radii, backgrounds, and shadows. This creates styling entropy and makes later design work harder because the same visual roles are expressed many different ways.

This pass is needed so:
1. shared surface roles are used consistently in core flows
2. route-level pages align with the app shell and page chrome already in place
3. later visual redesign work can build on stable primitives instead of cleaning up one-off styling first

## Scope
In scope:
1. Adopt existing shared classes from `src/index.css` in the requested files:
   - `src/pages/MyBatches.tsx`
   - `src/components/batches/BatchCard.tsx`
   - `src/pages/BatchDetail.tsx`
   - `src/components/f1/new-batch-wizard/NewBatchWizard.tsx`
   - `src/components/f1/new-batch-wizard/NewBatchWizardHeader.tsx`
   - `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx`
   - `src/components/home/HomeHeader.tsx`
   - `src/components/home/HomePrimaryFocusCard.tsx`
2. Normalize repeated wrappers onto shared surface roles where a direct match exists.
3. Keep current layouts, flows, routing, and copy intact.
4. Add a small reusable class in `src/index.css` only if a repeated pattern is clearly needed in at least two touched places.

Out of scope:
1. Visual redesign of the app or these screens.
2. Changes to batch lifecycle, stage rules, timing logic, or persistence.
3. Copy rewrite beyond tiny consistency adjustments if absolutely necessary.
4. Schema, migration, Supabase type, or route behavior changes.

## Current state
1. `src/components/layout/AppLayout.tsx` and `src/components/layout/route-shell-config.ts` already provide the shell and route chrome system.
2. `src/index.css` already provides semantic classes for:
   - shell chrome such as `app-shell`, `page-header-surface`
   - surface hierarchy such as `surface-section`, `surface-section-quiet`, `surface-section-elevated`, `surface-hero`, `surface-utility`, `surface-toolbar`, `surface-list-compact`, `surface-interactive`
   - typography roles such as `type-page-title`, `type-page-subtitle`, `type-section-kicker`, `type-section-title`, `type-stat-value`, `type-stat-label`, `type-helper`, `type-status`
   - status treatment such as `status-surface` variants and shared badges
3. The target files still use multiple local combinations of:
   - rounded radius values
   - border and background values
   - ad hoc shadow strings
   - component-specific panel wrappers that overlap with shared surface roles
4. `src/pages/MyBatches.tsx` owns the route-level browse surfaces and state-specific loading, empty, and error wrappers.
5. `src/components/batches/BatchCard.tsx` already preserves product behavior but still encodes status styling as inline background strings.
6. `src/pages/BatchDetail.tsx` already uses shared subfeature components, but its page-level state wrappers are still plain one-off panels.
7. The new batch wizard files already preserve the guided flow, but the outer shells and step panels still use local border/background/shadow combinations.
8. The home header and primary focus card already follow the current structure, but some inner stat/info panels are still expressed with one-off wrappers instead of the shared surface system.

## Intended outcome
1. The touched files use existing shared design classes consistently for the same visual roles.
2. Page-level shells, intro surfaces, toolbars, status blocks, and utility panels read as part of the same system.
3. Repeated rounded border background shadow combinations are reduced.
4. Behavior, routing, data flow, and user copy remain effectively unchanged.
5. Any new reusable class added to `src/index.css` is semantic, minimal, and used in at least two touched places.

## Files and systems involved
1. Route files:
   - `src/pages/MyBatches.tsx`
   - `src/pages/BatchDetail.tsx`
2. Shared components:
   - `src/components/batches/BatchCard.tsx`
   - `src/components/f1/new-batch-wizard/NewBatchWizard.tsx`
   - `src/components/f1/new-batch-wizard/NewBatchWizardHeader.tsx`
   - `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx`
   - `src/components/home/HomeHeader.tsx`
   - `src/components/home/HomePrimaryFocusCard.tsx`
3. Shared design system:
   - `src/index.css`
4. Shell system referenced and preserved:
   - `src/components/layout/AppLayout.tsx`
   - `src/components/layout/route-shell-config.ts`

## Risks and compatibility checks
1. Accidentally drifting into redesign instead of design-system adoption.
2. Replacing local wrappers with the wrong shared surface role and changing emphasis too much.
3. Breaking responsive layout or spacing rhythm while normalizing wrappers.
4. Introducing route-level layout regressions in `MyBatches` or `BatchDetail`.
5. Changing copy, behavior, or navigation while trying to simplify styling.
6. Adding too many new classes instead of reusing the system already present.

## Copy and content impact
1. Feature copy modules checked:
   - `src/copy/batch-library.ts`
   - `src/copy/f1-new-batch.ts`
   - `src/copy/home.ts`
2. Expected copy handling:
   - preserve existing wording
   - no copy extraction work planned
3. Dynamic copy helpers:
   - no helper changes expected unless a tiny label adjustment becomes necessary for consistency

## Milestones

### Milestone 1: Audit shared roles and define the adoption map
Goal:
Inspect the target files against `src/index.css`, the app shell, and route shell config, then create a repo-specific execution plan that maps repeated local wrappers to shared design roles.
Acceptance criteria:
1. The plan file exists and is scoped to design-system adoption only.
2. The relevant shared classes and target files are documented.
3. No behavior, lifecycle, or persistence changes are planned.
Files expected:
1. `plans/2026-03-26-design-system-adoption-pass.md`
Validation:
1. none before implementation
Status: completed

### Milestone 2: Refactor route-level and card-level shared surface usage
Goal:
Refactor `MyBatches.tsx`, `BatchCard.tsx`, and `BatchDetail.tsx` so top-level surfaces, state wrappers, and batch cards consistently use shared shell and surface classes.
Acceptance criteria:
1. `MyBatches.tsx` intro, filters, summary, and state panels use shared surface roles.
2. `BatchCard.tsx` uses reusable surface/status mappings instead of large inline background strings.
3. `BatchDetail.tsx` loading, not-found, and journal-loading states use shared surfaces and page spacing aligns with the shell system.
Files expected:
1. `src/pages/MyBatches.tsx`
2. `src/components/batches/BatchCard.tsx`
3. `src/pages/BatchDetail.tsx`
4. `src/index.css` only if a clearly repeated new class is required
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 3: Refactor wizard and home shared surface usage
Goal:
Refactor the new-batch wizard shell/header/volume step and the home header/focus card so their containers and repeated inner panels use shared design primitives consistently.
Acceptance criteria:
1. Wizard containers and step shells use shared surfaces without changing the guided flow.
2. Home stat/info panels adopt shared surface roles where they fit.
3. Any new class added is semantic and reused in at least two touched places.
Files expected:
1. `src/components/f1/new-batch-wizard/NewBatchWizard.tsx`
2. `src/components/f1/new-batch-wizard/NewBatchWizardHeader.tsx`
3. `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx`
4. `src/components/home/HomeHeader.tsx`
5. `src/components/home/HomePrimaryFocusCard.tsx`
6. `src/index.css` only if clearly justified
Validation:
1. `npx tsc -b`
2. `npm run lint`
Status: completed

### Milestone 4: Final validation and plan closeout
Goal:
Run repo validation, record results, and summarize any follow-up areas that still need a second pass.
Acceptance criteria:
1. Final validation results are recorded.
2. The plan reflects the actual implementation and any new reusable classes.
3. Remaining second-pass areas are identified briefly.
Files expected:
1. touched implementation files
2. `plans/2026-03-26-design-system-adoption-pass.md`
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md` to confirm the repo-specific planning and validation rules.
2. Inspected `src/index.css`, `src/components/layout/AppLayout.tsx`, and `src/components/layout/route-shell-config.ts` to confirm the shared shell and surface system already exists.
3. Inspected the eight target files and confirmed that the work is primarily a styling-entropy reduction pass rather than a product-flow rewrite.
4. Confirmed the touched work does not require schema, persistence, or lifecycle changes.
5. Refactored `src/pages/MyBatches.tsx` to move the intro block onto `surface-hero`, the filter area onto `surface-toolbar`, the results summary onto `surface-section-quiet`, and the loading, empty, and error states onto shared surface and status roles.
6. Refactored `src/components/batches/BatchCard.tsx` to use shared outer surface roles, shared inner summary surfaces, and a cleaner status-to-tone mapping instead of inline background strings.
7. Refactored `src/pages/BatchDetail.tsx` state wrappers so loading, not-found, and journal-loading panels all use shared surface classes and shell-aligned spacing.
8. Refactored `src/components/f1/new-batch-wizard/NewBatchWizard.tsx`, `src/components/f1/new-batch-wizard/NewBatchWizardHeader.tsx`, and `src/components/f1/new-batch-wizard/steps/VolumeStep.tsx` so the wizard canvas, header block, and targeted step shell use shared shell and surface primitives.
9. Refactored `src/components/home/HomeHeader.tsx` and `src/components/home/HomePrimaryFocusCard.tsx` so the outer wrappers, stat tiles, info panel, day pill, and quick-action pills use shared surface and type roles.
10. Added `surface-tone-warm`, `surface-tone-calm`, and `surface-tone-danger` to `src/index.css` as a small reusable tone layer shared by batch cards and the home focus hero.
11. Milestone 2 and 3 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed
12. Final validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice

## Decision log
1. Keep this pass strictly focused on design-system adoption, not redesign.
2. Prefer the existing semantic classes in `src/index.css` even when local Tailwind combinations are visually close.
3. Only add a new reusable class if the same structural pattern is clearly needed in at least two touched places.
4. Add a small shared tone layer in `src/index.css` for warm, calm, and danger surfaces because both `BatchCard` and `HomePrimaryFocusCard` needed the same kind of semantic surface tinting.

## Open questions
1. None currently blocking implementation.

## Done when
1. The eight requested target files consume shared design classes more consistently.
2. Repeated local border/background/shadow/radius wrappers are reduced materially.
3. Behavior, routing, copy, and data flow remain intact.
4. Any newly added reusable class is minimal, semantic, and justified by repeated use.
5. Repo validation has been run and recorded.

## Final validation
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
