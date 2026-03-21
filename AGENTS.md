# AGENTS.md

## Purpose

This repository contains a brewing companion app focused on kombucha workflows, batch tracking, fermentation guidance, recipe handling, and clear beginner-friendly UX.

The product priority is clarity, consistency, and safe, understandable guidance for non-expert users.

## Core Product Rules

1. Prefer clarity over cleverness.
2. Keep flows guided and explicit.
3. Avoid hidden logic when visible status or next steps would help the user.
4. Do not present uncertain brewing advice as guaranteed fact.
5. Preserve existing batch data and user history unless a task explicitly requires a migration or cleanup.
6. Do not silently change fermentation logic, timing assumptions, carbonation logic, or stage progression without tracing where those rules are used.
7. When domain logic is ambiguous, inspect the existing codebase before introducing new assumptions.

## Working Style

1. Inspect relevant files before editing.
2. Reuse existing types, utilities, components, and naming conventions where possible.
3. Keep changes tightly scoped to the requested task.
4. Do not refactor unrelated areas unless doing so is necessary to complete the task safely.
5. If a task affects more than 3 files, data flow, storage, or lifecycle logic, write a short implementation plan before making changes.
6. If a task touches persistence, stage transitions, recipe application, or timers, identify all affected code paths first.

## UX Rules

1. The app is for users who may have little or no brewing expertise.
2. Prefer step by step flows over dense forms when possible.
3. Use simple language in UI copy.
4. Surface the current state, next action, and any blocking issue clearly.
5. Preserve a calm, practical tone in user-facing text.
6. Do not overload screens with secondary detail if it interferes with the primary action.

## Batch and Brewing Logic

1. Batch lifecycle state must remain internally consistent across saved records, derived UI, timelines, and suggested next actions.
2. F1 and F2 stages must not conflict with each other in naming, timing, or available actions.
3. Recipe presets, recipe items, and applied batch recipes must remain traceable and backwards compatible unless explicitly instructed otherwise.
4. Timer or stage related changes must consider existing saved batches.
5. When adding a new stage, action, or status, update all dependent displays such as history, timeline, next action, badges, and summary views.

## Data Safety Rules

1. Avoid destructive data changes unless explicitly requested.
2. If a migration or cleanup is needed, explain the impact clearly.
3. Preserve compatibility with existing stored records whenever reasonably possible.
4. Prefer additive schema and transformation approaches over breaking rewrites.

## Code Quality Rules

1. Favor readable code over dense abstractions.
2. Keep business logic out of presentation components when practical.
3. Use small helper functions for repeated domain logic.
4. Avoid duplicate logic for stage calculation, recipe matching, or next action generation.
5. When changing shared logic, check all consumers.

## Validation

After making code changes:

1. Run typecheck.
2. Run relevant tests if they exist.
3. If there is a linter configured, run it for touched files or the project.
4. Summarize:
   1. Which files changed
   2. What was implemented
   3. Any follow up risks or recommended next steps

## Response Expectations

When working on a task:

1. Start by briefly stating what files or areas you will inspect.
2. For non-trivial work, give a short plan before editing.
3. After implementation, report concrete outcomes, not vague summaries.
4. Flag uncertainty explicitly instead of guessing.

## Preferred Priorities for This Repo

Prioritize correctness in this order:

1. Data integrity
2. Batch lifecycle consistency
3. User clarity
4. Maintainability
5. Visual polish

## Things To Avoid

1. Do not introduce broad visual redesigns unless requested.
2. Do not rename core domain concepts casually.
3. Do not invent new brewing rules if the repo already has an established model.
4. Do not change storage or schema behavior without checking existing usage.
5. Do not remove useful timeline, history, or next step context if users rely on it.