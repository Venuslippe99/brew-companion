# Execution Plans for brew-companion

This file defines how execution plans must be written and followed in this repository.

An execution plan is a self-contained, living implementation document for a non-trivial task. It must contain enough context that someone with no prior knowledge of this repo could continue the work from the plan alone.

## When to use a plan

Create or update a plan when work includes any of the following:

1. More than 3 files changed
2. Any change to batch lifecycle or stage progression
3. Any change to Supabase persistence or schema
4. Any F2 setup, bottle planning, recipe persistence, or batch history work
5. Any multi-step feature where progress should be tracked milestone by milestone
6. Any task with uncertainty, significant refactoring, or multiple validation steps

A plan is usually not needed for tiny, isolated fixes such as:
1. Small copy changes
2. One-file styling tweaks
3. Very local bug fixes with no persistence or lifecycle impact

## Where plans live

Store each real plan as its own file in:

`plans/<yyyy-mm-dd>-<short-feature-name>.md`

Examples:
1. `plans/2026-03-21-batch-lifecycle-cleanup.md`
2. `plans/2026-03-21-f2-review-flow.md`

`PLANS.md` is the rulebook.
Files inside `plans/` are the actual working plans.
If `plans/` does not exist yet in the workspace, create that directory before creating the first plan file.

## Core rules for every plan

1. The plan must be self-contained.
2. The plan must be a living document and updated as work progresses.
3. The plan must be specific to this repository, not generic.
4. The plan must state exact files, tables, flows, and commands where possible.
5. The plan must break work into milestones small enough to validate.
6. After each milestone, validation must be run before moving forward.
7. If validation fails, fix the issue or record a justified blocker before continuing.
8. If a decision changes during implementation, record it in the plan.
9. Do not expand scope casually. If scope changes, update the plan first.
10. Do not rely on memory outside the plan and current working tree.

## brew-companion specific requirements

Every plan that touches brewing logic must explicitly check:

1. Batch stage consistency across UI, derived logic, and persistence
2. Next-action consistency with stage and timing helpers
3. Timeline and history impact, including `batch_stage_events` and `batch_logs`
4. Backwards compatibility for saved batches and saved F2 setups
5. Safety and clarity of user-facing fermentation or carbonation guidance

Every plan that touches F2 must explicitly check:

1. `batch_f2_setups`
2. `batch_f2_bottle_groups`
3. `batch_bottles`
4. `batch_bottle_ingredients`
5. Any recipe snapshot or preset linkage
6. Any related UI in `src/components/f2/` and `src/pages/BatchDetail.tsx`

Every plan that touches schema must explicitly check:

1. Relevant migration files in `supabase/migrations`
2. Generated Supabase types in `src/integrations/supabase/types.ts`
3. Frontend read paths
4. Frontend write paths
5. Existing stored data compatibility



Every plan that touches major UI or user-facing workflows must explicitly check:

1. Whether meaningful user-facing copy should be added to or updated in a feature copy module under `src/copy/`
2. Whether dynamic copy should be moved into typed copy helpers instead of inline string assembly
3. Whether copy extraction is preserving existing wording versus intentionally changing it

## Required structure for every plan

Use this structure exactly.

# <Plan title>

## Summary
A brief statement of the feature or change.

## Why
Why this work is needed and what user or product problem it solves.

## Scope
What is in scope.
What is explicitly out of scope.

## Current state
How the relevant flow works today.
List the current files, helpers, tables, and derived logic involved.

## Intended outcome
Describe the target behavior in concrete terms.

## Files and systems involved
List the exact files and systems expected to change.

Example categories:
1. Route files
2. Shared components
3. Domain helpers in `src/lib`
4. Context files
5. Supabase tables
6. Migrations
7. Generated types

## Risks and compatibility checks
List risks such as:
1. Breaking saved data
2. Stage inconsistency
3. Recipe traceability issues
4. Missing timeline/history updates
5. Validation gaps
6. UI confusion for beginners

## Copy and content impact
List:
1. Which feature copy module(s) are affected
2. Whether copy is being extracted only or intentionally changed
3. Any dynamic copy helpers that must be updated

## Milestones

### Milestone 1: <name>
Goal:
Acceptance criteria:
Files expected:
Validation:
Status: pending

### Milestone 2: <name>
Goal:
Acceptance criteria:
Files expected:
Validation:
Status: pending

Add as many milestones as needed.

## Progress log
Record progress in chronological order.

Example:
1. Inspected `src/pages/BatchDetail.tsx` and `src/lib/batch-timing.ts`
2. Confirmed current stage transition path for `f2_setup` to `f2_active`
3. Found that timeline writes are split between two helpers

## Decision log
Record decisions and why they were made.

Example:
1. Reused existing next-action helper instead of adding component-local logic to avoid rule drift
2. Deferred schema changes because existing tables already support the feature

## Open questions
Only include true unknowns that block quality. Remove resolved questions as decisions are made.

## Done when
State exactly what must be true for the work to count as complete.

## Final validation
List the commands that must be run at the end.

Default repo checks:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build` when routing, build behavior, or production bundle output is affected

If a baseline command already fails before the feature work starts, record that explicitly in the plan and distinguish pre-existing failures from new failures introduced by the task.
