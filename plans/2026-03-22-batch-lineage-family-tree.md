# Batch Lineage And Family Tree

## Summary
Design and implement Kombloom batch lineage so batches are no longer isolated records. The first implementation pass should support two distinct parent links on `kombucha_batches`:
1. `brew_again_source_batch_id` for "brewed from batch"
2. `starter_source_batch_id` for "starter source batch"

MVP should make that lineage useful in `BatchDetail` and `NewBatch` first, while keeping a future family tree view possible without redesigning the data model later.

## Why
Users already repeat batches and carry starter forward, but the app only partially remembers those relationships today. Brew Again now stores repeat provenance, while starter-source lineage exists in schema but is not exposed in the product flow.

This work is needed so Kombloom can:
1. show where a batch came from
2. show what later batches came from it
3. connect phase outcomes to lineage over time
4. support future "reference batch", "best in family", and family tree views on top of real brewing relationships instead of isolated batch records

## Scope
In scope:
1. Confirm and use the existing separate lineage fields for repeat provenance and starter-source provenance
2. Add starter-source selection to the new-batch flow
3. Show distinct lineage sections in batch detail for both parent and child relationships
4. Reuse existing Brew Again provenance without collapsing it into starter-source logic
5. Define the query and helper shape needed for future lineage summaries and a later family tree screen
6. Keep the first version useful even without a dedicated graph page

Out of scope for this pass:
1. A full graph or canvas-based family tree screen
2. Aggregate lineage analytics such as "best branch" or "common issue in family" beyond simple explainable summaries
3. Automatic reference scoring persisted to the database
4. Multi-generation comparison tools
5. Editing lineage from archive/list screens unless the implementation turns out to be trivially additive

## Current state
Current routes and surfaces:
1. `src/App.tsx` exposes `/new-batch`, `/batch/:id`, `/my-batches`, `/guides`, and `/assistant`. There is no dedicated lineage route today.
2. `src/pages/BatchDetail.tsx` is the main deep-detail surface. It already hosts overview cards, reminders, stage/timing context, F2 setup, timeline, logs, notes, guide, assistant, phase outcomes, and the Brew Again launcher for completed or archived batches.
3. `src/pages/MyBatches.tsx` shows compact list cards and is not currently the best place for a dense lineage workflow.

Current batch creation and provenance flow:
1. `src/pages/NewBatch.tsx` creates rows in `kombucha_batches` using F1-start fields such as `name`, `brew_date`, `tea_type`, `sugar_g`, `starter_liquid_ml`, `avg_room_temp_c`, `target_preference`, and notes.
2. `NewBatch` already accepts Brew Again navigation state and can prefill the creation flow from an earlier batch.
3. Brew Again already stores repeat provenance through `brew_again_source_batch_id`.
4. `starter_source_batch_id` and `starter_source_type` already exist on `kombucha_batches` in generated Supabase types, but the current frontend does not expose starter-source selection.

Current lineage-adjacent data and helpers:
1. `src/lib/phase-outcomes.ts` persists separate F1 and F2 outcomes in `batch_phase_outcomes`, which can later support lineage summaries and reference memory.
2. `src/lib/brew-again.ts` and `src/lib/brew-again-types.ts` already classify previous batches and generate outcome-aware Brew Again suggestions.
3. `src/lib/f2-current-setup.ts` and `src/lib/f2-persistence.ts` handle later-phase F2 setup separately from `NewBatch`, so lineage planning must not assume F2 setup is copied during initial batch creation.
4. `BatchDetail` already loads `batch_logs`, `batch_stage_events`, reminders, phase outcomes, and F2 setup, so it is the natural place to compose lineage display with existing history context.

Current persistence and schema:
1. `kombucha_batches` already has `brew_again_source_batch_id`
2. `kombucha_batches` already has `starter_source_batch_id`
3. `kombucha_batches` already has `starter_source_type`
4. There is no separate lineage edge table today
5. There is no frontend helper yet for reverse lineage queries such as "batches brewed again from this batch" or "batches using this batch as starter"

## Intended outcome
After implementation:
1. Users can create a batch with no lineage, repeat provenance only, starter-source provenance only, or both
2. `NewBatch` includes an explicit starter-source choice that is separate from Brew Again provenance
3. `BatchDetail` shows a clear `Lineage` section with:
   - brewed from
   - starter came from
   - repeated as
   - used as starter for
4. Brew Again remains a repeat/duplication flow, but the user can review or change starter-source lineage before creating the new batch
5. The data shape supports a later family tree screen without another schema redesign
6. Any later lineage insight uses explainable runtime summaries built on saved lineage and phase outcomes, not hidden heuristics

## Files and systems involved
Likely route and page files:
1. `src/App.tsx`
2. `src/pages/NewBatch.tsx`
3. `src/pages/BatchDetail.tsx`
4. `src/pages/MyBatches.tsx` only if a minimal follow-up CTA or badge is clearly justified

Likely shared components:
1. `src/components/brew-again/BrewAgainLauncher.tsx`
2. New lineage UI components, likely under `src/components/lineage/`
3. Existing UI primitives in `src/components/ui/`, especially `dialog`, cards, badges, buttons, selects, and drawers if the final interaction needs them

Likely domain helpers:
1. `src/lib/brew-again.ts`
2. `src/lib/brew-again-types.ts`
3. `src/lib/phase-outcomes.ts`
4. New lineage helpers in `src/lib/`, likely for:
   - source batch eligibility
   - reverse lineage queries
   - simple lineage summaries

Supabase and persistence:
1. `src/integrations/supabase/types.ts`
2. `supabase/migrations/*` only if the current lineage fields need adjustment after inspection
3. `kombucha_batches`
4. `batch_phase_outcomes` for later lineage summaries
5. `batch_logs` or `batch_stage_events` only if lineage changes should also create history entries

## Risks and compatibility checks
1. `brew_again_source_batch_id` and `starter_source_batch_id` must remain semantically separate. Reusing one field for both would break the product model.
2. `NewBatch` must not silently assign starter lineage just because a batch is being repeated.
3. Starter-source selection must not expose obviously irrelevant candidates if the repo’s current stage model suggests they are not useful starter sources.
4. Reverse relationship queries in `BatchDetail` must stay performant and avoid duplicating batch summary logic already used elsewhere.
5. Existing batches without lineage data must continue to render cleanly with empty-state cards rather than placeholder records.
6. Lineage display must tolerate linked batches being archived, incomplete, or missing.
7. If `starter_source_type` has current or historical meaning beyond batch links, the implementation must preserve compatibility instead of overwriting it casually.
8. If timeline/history entries are added for lineage actions, they must not conflict with stage event meaning.
9. The family tree view should not be started until direct lineage reads and writes are proven stable.

## Milestones

### Milestone 1: Lock The Lineage Model And Query Strategy
Goal:
Confirm the repo should use `kombucha_batches` as the direct lineage source of truth with separate nullable fields for repeat provenance and starter provenance, then define the helper/query shape for parent and child lineage reads.

Acceptance criteria:
1. The implementation plan clearly decides whether schema changes are required or whether the current fields are sufficient
2. The plan defines how to query:
   - current batch parent links
   - child batches where `brew_again_source_batch_id = current batch id`
   - child batches where `starter_source_batch_id = current batch id`
3. The plan defines how lineage summaries can later incorporate phase outcomes without blocking MVP

Files expected:
1. `src/integrations/supabase/types.ts`
2. `src/pages/BatchDetail.tsx`
3. `src/pages/NewBatch.tsx`
4. `src/lib/brew-again.ts`
5. New lineage helper files in `src/lib/`
6. `supabase/migrations/*` only if required after confirming current schema

Validation:
1. Review current `kombucha_batches` shape in generated types
2. Confirm current Brew Again write path for `brew_again_source_batch_id`
3. Confirm no existing frontend write path for `starter_source_batch_id`

Status: completed

### Milestone 2: Add Starter-Source Selection To New Batch
Goal:
Extend `NewBatch` so the user can explicitly set starter lineage separately from repeat provenance.

Acceptance criteria:
1. `NewBatch` supports:
   - no starter link
   - selected prior batch as starter source
   - Brew Again context plus separate starter-source choice
2. The starter-source UI is clear, beginner-friendly, and does not imply that repeat provenance automatically determines starter source
3. The saved create path writes `starter_source_batch_id` safely
4. Any use of `starter_source_type` is preserved or intentionally clarified based on current schema meaning

Files expected:
1. `src/pages/NewBatch.tsx`
2. New or shared selector component(s), likely in `src/components/lineage/`
3. Supporting lineage helper(s) in `src/lib/`
4. `src/integrations/supabase/types.ts` only if schema or generation changes are required

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. Manual create-flow reasoning check for:
   - plain new batch
   - Brew Again without starter link
   - Brew Again with explicit starter source

Status: completed

### Milestone 3: Add Lineage Section To Batch Detail
Goal:
Expose useful direct lineage in `BatchDetail` before attempting any graph view.

Acceptance criteria:
1. `BatchDetail` shows a dedicated lineage section or card group in the overview area
2. The UI distinguishes:
   - brewed from
   - starter came from
   - repeated as
   - used as starter for
3. Linked batch surfaces are compact and navigable to `/batch/:id`
4. Empty states are clean when no lineage exists
5. Existing phase outcome cards and timing/next-action areas remain understandable and not crowded out

Files expected:
1. `src/pages/BatchDetail.tsx`
2. New lineage display components under `src/components/lineage/`
3. New lineage query/helper functions under `src/lib/`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. Manual UI review for:
   - no lineage
   - only brewed-from
   - only starter-source
   - both parent links
   - reverse child links

Status: completed

### Milestone 4: Align Brew Again With Starter Lineage
Goal:
Make sure Brew Again preserves repeat provenance while giving the user a safe, explicit decision about starter lineage.

Acceptance criteria:
1. Brew Again continues to set `brew_again_source_batch_id`
2. The user can keep, change, or clear starter-source selection during the create handoff
3. The default behavior is explicit and beginner-friendly, not hidden
4. The launcher and `NewBatch` summary make the distinction between "repeating this batch" and "using this batch as starter" understandable

Files expected:
1. `src/components/brew-again/BrewAgainLauncher.tsx`
2. `src/pages/NewBatch.tsx`
3. `src/lib/brew-again.ts`
4. `src/lib/brew-again-types.ts`

Validation:
1. `npx tsc -b`
2. `npm run lint`
3. Manual reasoning check that Brew Again provenance and starter provenance cannot overwrite each other accidentally

Status: completed

### Milestone 5: Record Deferred Family Tree Layer And Lightweight Insight Hooks
Goal:
Finish the foundational lineage pass and capture the smallest sensible next step toward a family tree view.

Acceptance criteria:
1. The MVP stops at stable lineage data and useful `BatchDetail` surfaces unless a dedicated route is unexpectedly low-cost and clearly justified
2. The plan records how a later family tree route could consume:
   - parent links
   - reverse child links
   - phase outcome summaries
3. Any simple lineage insight included in MVP is explainable and derived at runtime rather than persisted as opaque intelligence

Files expected:
1. `src/pages/BatchDetail.tsx`
2. Potential future route file such as `src/pages/BatchLineage.tsx` only if implementation proves it is justified
3. Planning notes in this plan file

Validation:
1. Final repo validation commands
2. Scope check to ensure graph work did not bloat the first pass

Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md` before planning.
2. Inspected `src/App.tsx` to confirm current routes and the lack of a dedicated lineage page.
3. Inspected `src/pages/BatchDetail.tsx` to confirm current tabs, overview density, phase outcome display, F2 setup display, and the current Brew Again launcher placement.
4. Inspected `src/pages/NewBatch.tsx` to confirm the current create shape, existing prefill handoff, and the lack of starter-source selection.
5. Inspected `src/lib/phase-outcomes.ts` to confirm separate F1 and F2 phase outcome storage that can later support lineage summaries.
6. Inspected `src/lib/f2-persistence.ts` to confirm F2 setup is persisted separately from new-batch creation.
7. Inspected `src/pages/MyBatches.tsx` to confirm list/archive surfaces are compact and not the best first home for lineage-heavy UX.
8. Inspected `src/integrations/supabase/types.ts` to confirm `kombucha_batches` already contains `brew_again_source_batch_id`, `starter_source_batch_id`, and `starter_source_type`.
9. Confirmed `starter_source_batch_id` is present in schema/types but currently unused by the frontend, while Brew Again provenance is already wired through `brew_again_source_batch_id`.
10. Confirmed the current schema is already sufficient for lineage MVP, so no migration is needed for this pass.
11. Added `src/lib/lineage.ts` with shared lineage query helpers for parent links, reverse child links, and starter-source eligibility.
12. Validation after Milestone 1:
   - `npx tsc -b` passed
   - `npm run lint` passed with the same pre-existing fast-refresh warnings only
   - `npm run test` hit sandbox `spawn EPERM`, then passed when rerun outside the sandbox
   - `npm run build` hit sandbox `spawn EPERM`, then passed when rerun outside the sandbox
13. Added `src/components/lineage/StarterSourceSelector.tsx` for a focused starter-lineage input that keeps "no linked starter batch" explicit.
14. Updated `src/pages/NewBatch.tsx` to load starter-source candidates, recommend the repeated batch as starter source when arriving from Brew Again, and save `starter_source_type` plus `starter_source_batch_id` on create.
15. Validation after Milestone 2:
   - `npx tsc -b` passed
   - `npm run lint` passed with the same pre-existing fast-refresh warnings only
   - `npm run test` hit sandbox `spawn EPERM`, then passed when rerun outside the sandbox
   - `npm run build` hit sandbox `spawn EPERM`, then passed when rerun outside the sandbox
16. Added `src/components/lineage/BatchLineageSection.tsx` to render separate parent and child lineage groups with linked batch cards.
17. Updated `src/pages/BatchDetail.tsx` to query `brew_again_source_batch_id`, `starter_source_batch_id`, and `starter_source_type`, then load reverse lineage with `src/lib/lineage.ts`.
18. Validation after Milestone 3:
   - `npx tsc -b` passed
   - `npm run lint` returned to the same pre-existing fast-refresh warnings only after fixing a new hook dependency warning in `BatchDetail`
   - `npm run test` hit sandbox `spawn EPERM`, then passed when rerun outside the sandbox
   - `npm run build` hit sandbox `spawn EPERM`, then passed when rerun outside the sandbox
19. Updated `src/components/brew-again/BrewAgainLauncher.tsx` so the launcher explicitly distinguishes "brewed from this batch" from the separate starter-source choice reviewed in `NewBatch`.
20. Kept the family tree view deferred. The first pass stops at direct lineage reads and writes in `NewBatch` and `BatchDetail`.
21. Validation after Milestone 4:
   - `npx tsc -b` passed
   - `npm run lint` stayed at the same pre-existing fast-refresh warnings only
   - `npm run test` hit sandbox `spawn EPERM`, then passed when rerun outside the sandbox
   - `npm run build` hit sandbox `spawn EPERM`, then passed when rerun outside the sandbox
22. Final implementation scope check: no migration was added, no dedicated lineage route was added, and the work stayed inside the lineage helpers plus `NewBatch`, `BatchDetail`, and Brew Again handoff copy.
23. Final validation:
   - `npx tsc -b` passed
   - `npm run lint` passed with the same pre-existing fast-refresh warnings only
   - `npm run test` passed
   - `npm run build` passed

## Decision log
1. Use `kombucha_batches` as the lineage source of truth in MVP, with separate nullable fields for repeat provenance and starter-source provenance. The repo already has both fields, so a separate relationships table would add complexity without current codebase pressure.
2. Treat `brew_again_source_batch_id` as the product’s "brewed from batch" field in lineage UI. Renaming the persistence field now is not justified because the Brew Again flow already uses it and the meaning is correct for duplication lineage.
3. Keep the first visual lineage layer inside `BatchDetail`, not a new route. This matches the repo’s current information architecture and keeps lineage useful even without a graph.
4. Add starter-source selection to `NewBatch` rather than inventing a standalone lineage editor. That is the existing batch creation entry point and the safest place to capture lineage at source.
5. Keep Brew Again and starter-source lineage separate in both logic and UI. Repeating a batch should not silently imply that the same batch supplied starter.
6. Defer a dedicated family tree page unless the implementation work to support it becomes surprisingly small after parent/child lineage helpers are in place.
7. Compute early lineage insights at runtime from saved lineage plus phase outcomes rather than persisting derived labels in MVP.
8. Prefer null/absent lineage fields for existing and unlinked batches over generated placeholder rows. This keeps backwards compatibility simple.
9. Reuse the existing `starter_source_type` consistency rules instead of introducing a new lineage enum or a separate relationships table.
10. For MVP, Brew Again should recommend the repeated batch itself as the starter source when it is a valid candidate, but the user must still be able to clear or change that choice in `NewBatch`.
11. The first lineage read surface should stay inside the `Overview` tab of `BatchDetail` rather than adding another tab or route, because the current detail page already holds the other batch-memory surfaces users rely on.
12. Defer the family tree route entirely for now. The repo now has enough parent/child lineage data to support it later, but the direct `BatchDetail` panel is the right first useful layer.

## Open questions
1. What exact eligibility rule should gate starter-source options in `NewBatch`? The schema supports any linked batch, but the repo does not yet expose a clear starter-source policy in code. The likely MVP choice is to allow prior batches that have reached a later, likely usable state such as `chilled_ready`, `completed`, or `archived`, but this should be confirmed against actual stage semantics before implementation.
2. Does `starter_source_type` currently matter for non-batch starter sources in saved data, or is it effectively unused today? If historical data uses non-batch values, the UI will need to preserve that meaning rather than assume every starter source is another batch.
3. Should lineage writes create `batch_logs` entries in MVP, or is saved provenance plus `created_at` enough for the first pass? The current repo already has strong history surfaces, but adding lineage logs may create noise if not designed carefully.

Post-implementation note:
1. MVP currently treats starter-source candidates as batches in later, likely reusable stages: `f2_setup`, `f2_active`, `refrigerate_now`, `chilled_ready`, `completed`, and `archived`. That rule is implemented client-side and may need refinement once real usage clarifies whether it is too narrow or too broad.

## Done when
1. A new batch can save `starter_source_batch_id` separately from `brew_again_source_batch_id`.
2. Brew Again continues to create repeat provenance safely.
3. `BatchDetail` shows direct parent and reverse child lineage for both relationship types with clear labels.
4. Existing batches without lineage still behave normally.
5. The resulting structure is sufficient for a later family tree view without another data-model rewrite.
6. Validation confirms no new typecheck or lint regressions, and any environment-only command failures are explicitly separated from repo-code issues.

## Final validation
Run after each milestone and again at the end:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Current baseline expectation from the latest repo cleanup work:
1. `npx tsc -b` should pass
2. `npm run lint` should pass with only the existing fast-refresh warnings, if those warnings remain unchanged
3. `npm run test` may fail in this sandbox with `spawn EPERM`; if so, record it as an environment limitation and rerun unrestricted when available
4. `npm run build` may fail in this sandbox with `spawn EPERM`; if so, record it as an environment limitation and rerun unrestricted when available

If implementation shows that current lineage fields are already sufficient, no Supabase migration should be added. If a migration becomes necessary after deeper inspection, update this plan first with:
1. the exact migration file needed
2. the generated types update in `src/integrations/supabase/types.ts`
3. the frontend read paths to change
4. the frontend write paths to change
5. which steps can be completed in-repo and which must be run manually against Supabase

Implementation note after Milestone 1:
1. No migration is planned for MVP because `kombucha_batches` already contains both lineage fields and the required same-user and consistency constraints.
