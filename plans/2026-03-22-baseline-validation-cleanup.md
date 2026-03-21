# Baseline Validation Cleanup

## Summary
Stabilize the repo baseline by fixing the current pre-existing TypeScript and lint failures with the smallest high-confidence code changes, and document the current sandbox-only `spawn EPERM` limitation for `npm run test` and `npm run build`.

## Why
The repo currently has a known validation baseline that does not pass even before new feature work:
1. `npx tsc -b` fails on two real code issues.
2. `npm run lint` fails on a mix of small app-code cleanup issues and one generated Supabase types file encoding problem.
3. `npm run test` and `npm run build` are valid commands but fail in this environment with `spawn EPERM` before app code is evaluated.

Cleaning this baseline up makes future feature validation clearer, keeps unrelated failures from obscuring real regressions, and avoids normalizing broken local checks.

## Scope
In scope:
1. Reproduce the current baseline failures with the actual repo commands.
2. Fix the pre-existing TypeScript failures in:
   - `src/components/f2/F2SetupWizard.tsx`
   - `src/pages/GuideDetail.tsx`
3. Fix the pre-existing lint failures in app-owned files where the safest correction is small and direct:
   - `src/components/ui/command.tsx`
   - `src/components/ui/textarea.tsx`
   - `src/pages/BatchDetail.tsx`
   - `src/pages/MyBatches.tsx`
   - `src/pages/NewBatch.tsx`
   - `tailwind.config.ts`
4. Make an explicit repo-specific decision on `src/integrations/supabase/types.ts`, based on its actual current state.
5. Re-run `npx tsc -b`, `npm run lint`, `npm run test`, and `npm run build`, and document the final status clearly.
6. Keep all changes tightly scoped to validation cleanup.

Explicitly out of scope:
1. Feature work unrelated to the current baseline failures.
2. Refactors for style or architecture beyond what is needed to clear the errors.
3. Weakening TypeScript settings or lint rules globally.
4. Raising the app TypeScript/runtime target just to make `replaceAll` compile.
5. Workarounds for the sandbox `spawn EPERM` issue that are not needed for repo-code correctness.
6. Regenerating Supabase schema/types from the network.

## Current state
Current validation results reproduced on March 22, 2026:
1. `npx tsc -b` fails in:
   - `src/components/f2/F2SetupWizard.tsx` because `replaceAll` is used while `tsconfig.app.json` targets `ES2020`.
   - `src/pages/GuideDetail.tsx` because the file imports `getGuideBySlug` but actually references an undefined `guides` identifier.
2. `npm run lint` fails in:
   - `src/components/ui/command.tsx`
     Rule: `@typescript-eslint/no-empty-object-type`
     Root cause: `interface CommandDialogProps extends DialogProps {}` is an empty interface alias.
   - `src/components/ui/textarea.tsx`
     Rule: `@typescript-eslint/no-empty-object-type`
     Root cause: `interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}` is an empty interface alias.
   - `src/integrations/supabase/types.ts`
     Reported as: `Parsing error: File appears to be binary`
     Root cause observed locally: the file is UTF-16 LE with a BOM and about 51k null bytes, so ESLint treats it as binary even though the content is readable text.
   - `src/pages/BatchDetail.tsx`
     Rule: `@typescript-eslint/no-explicit-any`
     Root cause: reminder row mapping uses `(row: any)`.
   - `src/pages/MyBatches.tsx`
     Rule: `@typescript-eslint/no-explicit-any`
     Root cause: batch row mapping uses `(row: any)`.
   - `src/pages/NewBatch.tsx`
     Rule: `@typescript-eslint/no-explicit-any`
     Root cause: form update helper uses `value: any`.
   - `tailwind.config.ts`
     Rule: `@typescript-eslint/no-require-imports`
     Root cause: plugin is loaded with `require("tailwindcss-animate")` in an ESM TypeScript config file.
3. `npm run test` fails before tests execute:
   - `vitest` cannot load `vitest.config.ts`
   - startup error is `spawn EPERM` from esbuild/Vite config loading
4. `npm run build` fails before app build executes:
   - `vite` cannot load `vite.config.ts`
   - startup error is `spawn EPERM` from esbuild/Vite config loading

Relevant repo/config context:
1. `tsconfig.app.json` targets `ES2020`, so `replaceAll` is not a compatibility-safe API here without changing targets.
2. `src/content/guides.ts` exports both `guides` and `Guide`, and `src/pages/GuideDetail.tsx` already imports `getGuideBySlug`, which strongly suggests the current undefined `guides` reference is an accidental regression rather than intended design.
3. `eslint.config.js` currently ignores only `dist`; it does not exempt generated files such as `src/integrations/supabase/types.ts`.
4. `tailwind.config.ts` is authored as ESM TypeScript, so replacing `require(...)` with an `import` is the likely root-cause fix.

## Intended outcome
After this cleanup:
1. `npx tsc -b` should pass without changing the app target or weakening type checks.
2. `npm run lint` should pass for the repo baseline, either by fixing the generated Supabase types file cleanly or by making a narrow, explicit repo-specific lint exclusion decision if direct editing is not the safest baseline cleanup.
3. `npm run test` and `npm run build` should still be treated as valid repo commands, but if they continue to fail only with sandbox `spawn EPERM`, that should be documented as an environment limitation rather than a repo bug.
4. Runtime behavior should remain unchanged except for the intended correctness fixes:
   - compatibility-safe string formatting in F2 setup display
   - correct guide lookup in guide detail
   - type/lint cleanup that does not alter feature behavior

## Files and systems involved
Route files:
1. `src/pages/GuideDetail.tsx`
2. `src/pages/BatchDetail.tsx`
3. `src/pages/MyBatches.tsx`
4. `src/pages/NewBatch.tsx`

Shared/UI components:
1. `src/components/f2/F2SetupWizard.tsx`
2. `src/components/ui/command.tsx`
3. `src/components/ui/textarea.tsx`

Config and tooling:
1. `tsconfig.app.json`
2. `eslint.config.js`
3. `tailwind.config.ts`
4. `package.json`
5. `vite.config.ts`
6. `vitest.config.ts`

Generated types:
1. `src/integrations/supabase/types.ts`

Content/helpers:
1. `src/content/guides.ts`

No Supabase tables, migrations, or lifecycle write paths are expected to change in this cleanup.

## Risks and compatibility checks
1. Compatibility regression: changing the TS target to support `replaceAll` would be broader than needed. The safer fix is to replace `replaceAll` usage with `replace(/_/g, " ")`.
2. Guide routing regression: `GuideDetail.tsx` must be fixed by using the intended guide source, not by adding a local workaround that could drift from `src/content/guides.ts`.
3. False-positive lint cleanup: the generated Supabase types file should not be hand-edited casually if it is treated as generated source of truth. The plan must choose carefully between re-encoding and explicit lint exclusion.
4. Baseline drift: the repo already has unrelated working-tree changes. Cleanup must not touch files outside the known validation scope.
5. Runtime behavior: `no-explicit-any` fixes in page files must preserve the current data mapping logic and not alter query shape or UI behavior.
6. Tailwind config loading: changing `require(...)` to `import` must remain compatible with the current ESM config style.
7. Environment misclassification: `spawn EPERM` must be recorded as a sandbox limitation only if it remains the same startup failure after code cleanup.

Compatibility checks for this repo:
1. F2 display text changes in `src/components/f2/F2SetupWizard.tsx` must not change F2 stage logic, next actions, or persistence.
2. Guide detail lookup must still resolve the same guide data exported from `src/content/guides.ts`.
3. Page mapping type fixes in batch-related routes must not change field names, Supabase selects, or rendered values.
4. Any handling of `src/integrations/supabase/types.ts` must preserve its role as generated schema typing.

## Milestones

### Milestone 1: Fix the two TypeScript root causes
Goal:
Make `npx tsc -b` pass by fixing the two known real code issues directly.
Acceptance criteria:
1. `replaceAll` usage in `src/components/f2/F2SetupWizard.tsx` is replaced with an `ES2020`-safe equivalent.
2. `src/pages/GuideDetail.tsx` uses the intended guide source correctly.
3. No TypeScript target changes are made just to satisfy `replaceAll`.
Files expected:
1. `src/components/f2/F2SetupWizard.tsx`
2. `src/pages/GuideDetail.tsx`
3. `src/content/guides.ts` only if needed for import/type alignment
Validation:
1. `npx tsc -b`
Status: completed

### Milestone 2: Fix small app-owned lint violations
Goal:
Clear the straightforward lint failures in app-owned source files without disabling rules.
Acceptance criteria:
1. Empty-interface violations are replaced with type aliases or direct prop typing.
2. `no-explicit-any` violations are replaced with local typed row shapes or existing generated types.
3. `tailwind.config.ts` no longer uses `require(...)`.
4. Runtime behavior is unchanged.
Files expected:
1. `src/components/ui/command.tsx`
2. `src/components/ui/textarea.tsx`
3. `src/pages/BatchDetail.tsx`
4. `src/pages/MyBatches.tsx`
5. `src/pages/NewBatch.tsx`
6. `tailwind.config.ts`
Validation:
1. `npm run lint`
2. `npx tsc -b`
Status: completed

### Milestone 3: Resolve the generated Supabase types lint problem deliberately
Goal:
Decide and apply the safest repo-specific fix for `src/integrations/supabase/types.ts`.
Acceptance criteria:
1. The plan explicitly answers whether the file is fixed directly or excluded from lint in this pass.
2. The chosen approach is narrow and justified by the file’s generated/encoding state.
3. `npm run lint` passes without hiding unrelated app-code issues.
Files expected:
1. `src/integrations/supabase/types.ts` if re-encoded directly
2. `eslint.config.js` if a narrow exclusion is chosen instead
Validation:
1. `npm run lint`
2. `npx tsc -b`
Status: completed

### Milestone 4: Re-verify baseline and document environment-only limits
Goal:
Run the full repo validation set and record final status, clearly separating repo-code success from sandbox-only startup failures.
Acceptance criteria:
1. `npx tsc -b` status is recorded accurately after cleanup.
2. `npm run lint` status is recorded accurately after cleanup.
3. `npm run test` and `npm run build` are rerun.
4. If `spawn EPERM` remains the same startup failure, it is documented as an environment limitation rather than a repo bug.
5. The cleanup notes explain how runtime behavior was protected.
Files expected:
1. This plan file
Validation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md`.
2. Reproduced the current baseline failures with `npx tsc -b` and `npm run lint`.
3. Reproduced `npm run test` and `npm run build` startup failures and confirmed both fail with `spawn EPERM` before normal app/test execution.
4. Inspected `src/components/f2/F2SetupWizard.tsx` and confirmed the TypeScript failure is caused by `replaceAll(...)` in an `ES2020` app target.
5. Inspected `tsconfig.app.json` and confirmed the app target is `ES2020`, so replacing `replaceAll` is safer than raising targets for this cleanup.
6. Inspected `src/pages/GuideDetail.tsx` and `src/content/guides.ts` and confirmed the missing `guides` reference should be corrected by using the intended exported guide source.
7. Inspected `src/components/ui/command.tsx` and `src/components/ui/textarea.tsx` and confirmed both lint failures are empty-interface declarations.
8. Inspected `src/pages/BatchDetail.tsx`, `src/pages/MyBatches.tsx`, and `src/pages/NewBatch.tsx` and confirmed the lint failures are narrow `any` usages in local row/update helpers.
9. Inspected `tailwind.config.ts` and confirmed the lint failure is the ESM-incompatible `require("tailwindcss-animate")` usage.
10. Inspected `src/integrations/supabase/types.ts` and confirmed the file is readable text but encoded as UTF-16 LE with a BOM and about 51k null bytes, which explains ESLint’s “file appears to be binary” parse failure.
11. Inspected `eslint.config.js` and confirmed generated files are not currently excluded from lint.
12. Replaced `replaceAll` in `src/components/f2/F2SetupWizard.tsx` with `replace(/_/g, " ")`, which is compatible with the repo’s `ES2020` app target.
13. Fixed `src/pages/GuideDetail.tsx` to use `getGuideBySlug(slug)` instead of the undefined `guides` identifier.
14. Validated Milestone 1:
   - `npx tsc -b` passed.
   - `npm run lint` still failed only on the pre-existing lint files.
   - `npm run test` and `npm run build` still failed with the same sandbox `spawn EPERM` startup error.
15. Replaced empty interfaces in `src/components/ui/command.tsx` and `src/components/ui/textarea.tsx` with type aliases.
16. Replaced local `any` usage in `src/pages/BatchDetail.tsx` and `src/pages/MyBatches.tsx` with narrow row types based on `Tables<...>`.
17. Replaced the generic `any` update helper in `src/pages/NewBatch.tsx` with a typed `NewBatchForm` plus keyed update helper.
18. Replaced `require("tailwindcss-animate")` in `tailwind.config.ts` with an ESM import.
19. Validated Milestone 2:
   - `npx tsc -b` still passed.
   - `npm run lint` was reduced to one remaining error in `src/integrations/supabase/types.ts`.
   - `npm run test` and `npm run build` still failed only with the same sandbox `spawn EPERM` startup error.
20. Re-encoded `src/integrations/supabase/types.ts` from UTF-16 LE to UTF-8 without changing its content, which removed the ESLint “file appears to be binary” failure while preserving the generated types.
21. Validated Milestone 3:
   - `npx tsc -b` passed.
   - `npm run lint` passed with warnings only and no errors.
   - `npm run test` and `npm run build` still failed only with the same sandbox `spawn EPERM` startup error.
22. Re-ran the full validation set for final verification and confirmed the final status remained unchanged from Milestone 3.

## Decision log
1. Planned fix for `replaceAll`: replace the calls with compatibility-safe global `replace(/_/g, " ")` instead of changing the app target.
2. Planned fix for the guide detail error: use the actual guide source exported from `src/content/guides.ts`, most likely by switching to the already-imported `getGuideBySlug(slug)` or importing `guides` directly if needed. The preferred path is `getGuideBySlug` because the file already imports it.
3. Planned lint fixes for `command.tsx` and `textarea.tsx`: replace empty interfaces with type aliases, since the current interfaces add no repo-specific semantics.
4. Planned lint fixes for page-level `any` usage: add narrow local row/update typing rather than loosening ESLint or suppressing the rule.
5. Planned tailwind fix: switch from `require("tailwindcss-animate")` to a normal ESM import, because the config file is already authored as TypeScript ESM.
6. Planned handling for `src/integrations/supabase/types.ts`: treat it as generated source with an encoding problem, not as normal hand-authored code. The first-choice fix for this cleanup is to re-encode it to UTF-8 without changing its content, because that addresses the actual lint root cause while preserving the generated types. A lint exclusion should be a fallback only if direct re-encoding proves unsafe in the workspace.
7. Planned milestone split: keep TypeScript fixes, app-file lint fixes, generated-file handling, and final environment-limit documentation separate so validation can isolate regressions cleanly.
8. Planned runtime-safety check: rely on targeted non-behavioral fixes, re-run `tsc` and `lint`, and avoid changing query shapes, route structure, stage logic, or persistence behavior.
9. Planned environment documentation: if `test` and `build` still fail only with the same Vite/esbuild `spawn EPERM` startup error after code cleanup, record that as a sandbox limitation and not as a repo-code failure.
10. Resolved `src/integrations/supabase/types.ts` by re-encoding it to UTF-8 instead of excluding it from lint, because the parse error came from file encoding rather than from generated type content.
11. Kept the existing `react-refresh/only-export-components` warnings out of scope because they are warnings, not the baseline blocking lint errors for this cleanup.
12. Runtime behavior was protected by using type-only fixes, compatibility-safe string replacement, the intended guide lookup helper, and an ESM-equivalent Tailwind plugin import.

## Open questions
None at the moment.

## Done when
1. The plan identifies the exact code changes needed for `npx tsc -b` to pass.
2. The plan identifies the exact lint rule and root cause for each currently failing file.
3. The plan explicitly decides which lint failures are safe to fix directly now.
4. The plan explicitly answers how `src/integrations/supabase/types.ts` should be handled in this cleanup pass and why.
5. The plan splits the cleanup into milestones small enough to validate independently.
6. The plan states how runtime behavior will be protected while making the cleanup changes.
7. The plan records the current `spawn EPERM` limitation in a way that separates environment limitations from repo-code failures.

## Final validation
Commands to run during implementation:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Baseline observed before cleanup work:
1. `npx tsc -b` fails only because of the pre-existing `replaceAll` usage in `src/components/f2/F2SetupWizard.tsx` and the missing `guides` reference in `src/pages/GuideDetail.tsx`.
2. `npm run lint` fails because of the pre-existing issues in:
   - `src/components/ui/command.tsx`
   - `src/components/ui/textarea.tsx`
   - `src/integrations/supabase/types.ts`
   - `src/pages/BatchDetail.tsx`
   - `src/pages/MyBatches.tsx`
   - `src/pages/NewBatch.tsx`
   - `tailwind.config.ts`
3. `npm run test` fails in this sandbox with `spawn EPERM` while loading `vitest.config.ts` through Vite/esbuild.
4. `npm run build` fails in this sandbox with `spawn EPERM` while loading `vite.config.ts` through Vite/esbuild.

Implementation must distinguish any new failures from these pre-existing ones.
