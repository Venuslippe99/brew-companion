# Family Tree And Lineage Analytics

## Summary
Design and implement Kombloom's dedicated Batch Lineage / Family Tree screen and the first lineage-aware analytics layer on top of the existing lineage foundation:
1. `brew_again_source_batch_id`
2. `starter_source_batch_id`
3. `batch_phase_outcomes`
4. Brew Again provenance and outcome-aware repeat flows

The first pass should add a dedicated batch-scoped lineage screen, a graph-shaped but mobile-safe family view, and a small set of explainable runtime insights derived from connected lineage plus saved F1/F2 outcomes.

## Why
The repo now stores meaningful brewing relationships, but users can still only see them in compact `BatchDetail` cards. That makes lineage visible, but not navigable or analytically useful at the family level.

This work is needed so Kombloom can help users answer:
1. what this batch came from
2. what later batches came from it
3. which related batches turned out best
4. which problems keep repeating in a family
5. which batches are strong references for repeating or starter reuse

The feature should turn lineage from saved metadata into an actual product surface that supports learning and decision-making.

## Scope
In scope:
1. Add a dedicated lineage route for one current batch context
2. Build a family data-shaping helper that expands connected lineage beyond direct parents/children
3. Represent repeat lineage and starter lineage as separate edge types
4. Attach compact F1/F2 outcome summaries and runtime-derived lineage labels to nodes
5. Add a first set of conservative, explainable lineage analytics
6. Keep the screen useful on mobile and desktop

Out of scope for this pass:
1. Drag-and-drop graph editing
2. Global all-batches lineage dashboards
3. Persisted scoring or opaque ranking fields in Supabase
4. Compare-any-two-branches tooling
5. Deep recursive analytics over arbitrarily large graphs
6. Cross-user or cross-account analytics

## Current state
Current routes and navigation:
1. `src/App.tsx` exposes `/batch/:id` but no `/batch/:id/lineage` route yet.
2. The current lineage MVP lives inside the `Overview` tab of `src/pages/BatchDetail.tsx`.
3. `src/pages/MyBatches.tsx` remains a compact list view and does not currently expose lineage actions.

Current lineage implementation:
1. `src/lib/lineage.ts` is the lineage source helper today.
2. It loads direct parent links from `brew_again_source_batch_id` and `starter_source_batch_id`.
3. It also loads direct reverse children for:
   - `brew_again_source_batch_id = current batch id`
   - `starter_source_batch_id = current batch id`
4. It does not yet build a connected multi-generation family graph.
5. It also contains the current client-side starter-source eligibility rule for `NewBatch`.

Current lineage surfaces:
1. `src/components/lineage/BatchLineageSection.tsx` renders direct parent and child groups as linked cards.
2. `src/components/lineage/StarterSourceSelector.tsx` handles starter-source selection in `NewBatch`.
3. `src/components/brew-again/BrewAgainLauncher.tsx` now explicitly distinguishes "brewed from" from the separate starter-source decision during handoff.

Current data and outcome foundation:
1. `src/lib/phase-outcomes.ts` already loads and saves one F1 and one F2 outcome per phase per batch.
2. `batch_phase_outcomes` is already the correct source for lineage-aware success/problem summaries.
3. `src/lib/brew-again.ts` already computes runtime classifications like `repeat_candidate`, `repeat_with_adjustments`, and `not_ideal_reference`.
4. `src/lib/f2-current-setup.ts` and related F2 helpers can add context to node summaries later, but F2 setup is still a secondary source compared with saved F2 outcomes.

Current UI and dependency reality:
1. The repo already uses `framer-motion`, Radix UI primitives, and responsive card layouts.
2. The repo does not currently use a graph, zoom/pan, canvas, or node-edge layout library.
3. `recharts` exists, but it is not a graph library and does not fit lineage edges well.
4. Most data fetching remains page-local with helpers in `src/lib`, not globally normalized through React Query hooks.

Current schema:
1. `kombucha_batches` already contains the two lineage fields required for the current data model:
   - `brew_again_source_batch_id`
   - `starter_source_batch_id`
2. `batch_phase_outcomes` already contains the outcome data needed for the first analytics layer.
3. No lineage analytics or reference-label fields currently exist in schema.

## Intended outcome
After implementation:
1. A user can open a dedicated lineage screen for a batch, likely from `BatchDetail`
2. The current batch is highlighted inside a connected family view
3. The screen shows multi-generation repeat and starter relationships where data exists
4. Repeat lineage and starter lineage remain visually and logically distinct
5. Nodes include practical batch summaries, compact F1/F2 outcome summaries, and a small set of runtime-derived labels
6. The screen surfaces conservative analytics such as:
   - best result in this family so far
   - common issue in this family so far
   - strong repeat candidate
   - strong starter source
7. All lineage insights remain explainable and threshold-based rather than sounding certain from weak data

## Files and systems involved
Likely route and page files:
1. `src/App.tsx`
2. New route page, likely `src/pages/BatchLineage.tsx`
3. `src/pages/BatchDetail.tsx`
4. `src/pages/MyBatches.tsx` only if a minimal follow-up CTA is clearly useful after the batch-scoped route exists

Likely shared components:
1. Existing `src/components/lineage/BatchLineageSection.tsx`
2. New lineage screen components under `src/components/lineage/`, likely split into:
   - graph or tree container
   - node card
   - edge legend
   - analytics summary cards
   - node detail drawer or sheet for mobile
3. Existing UI primitives in `src/components/ui/`, especially `dialog`, `drawer`/`vaul`, badges, cards, tabs, and buttons

Likely domain helpers:
1. `src/lib/lineage.ts`
2. `src/lib/phase-outcomes.ts`
3. `src/lib/brew-again.ts`
4. New helpers in `src/lib/`, likely for:
   - connected family traversal
   - lineage graph shaping
   - node badge derivation
   - analytics thresholds and summaries

Supabase and persistence:
1. `kombucha_batches`
2. `batch_phase_outcomes`
3. `src/integrations/supabase/types.ts` only if schema changes become necessary
4. `supabase/migrations/*` only if implementation proves current schema is insufficient

## Risks and compatibility checks
1. The lineage structure is a graph, not a pure tree, because a batch can have both repeat and starter parents. The UI and analytics must not assume single-parent trees.
2. If the screen tries to show too many generations at once, mobile readability will collapse quickly.
3. Overstating lineage analytics from one or two batches would break trust.
4. Recomputing large connected graphs entirely on the client could become slow if family depth expands unchecked.
5. Adding a graph library too early could bloat the bundle and create maintenance overhead the current repo does not yet justify.
6. Runtime reference labels must stay consistent with the existing Brew Again classification language where possible.
7. The screen must still work when some connected batches have no saved F1 or F2 outcome.
8. Missing or deleted linked batches must degrade gracefully.
9. The family screen must not duplicate batch stage, next-action, or outcome logic inside JSX components.

## Milestones

### Milestone 1: Lock Family Definition, Route, And Rendering Strategy
Goal:
Define what counts as a connected family, where the dedicated screen lives, and how the first rendering layer should work without overcommitting to a heavy graph dependency.

Acceptance criteria:
1. The plan defines family membership as connected lineage traversal over both relationship types
2. The plan decides the dedicated route
3. The plan decides whether MVP uses a graph library or a dependency-light structured graph layout
4. The plan defines safe expansion depth for MVP

Files expected:
1. `src/App.tsx`
2. `src/pages/BatchDetail.tsx`
3. New `src/pages/BatchLineage.tsx`
4. `src/lib/lineage.ts`

Validation:
1. Confirm no lineage route currently exists
2. Confirm no graph library currently exists in `package.json`
3. Confirm current direct-lineage helper shape in `src/lib/lineage.ts`

Status: completed

### Milestone 2: Define Family Graph And Node/Edge Data Shaping
Goal:
Design the helper layer that expands connected lineage and attaches compact phase-outcome context plus runtime labels to nodes.

Acceptance criteria:
1. The plan defines a graph data model with separate node and edge records
2. Edge types remain explicit:
   - brewed_from
   - starter_source
3. The helper layer defines how to attach F1/F2 summaries and lineage labels to nodes
4. The plan defines whether graph fetching stays page-local or moves into a composed helper

Files expected:
1. `src/lib/lineage.ts`
2. New helpers such as `src/lib/lineage-graph.ts` and `src/lib/lineage-analytics.ts`
3. `src/lib/phase-outcomes.ts`
4. `src/lib/brew-again.ts`

Validation:
1. Confirm node summary inputs already exist in current batch rows and phase outcomes
2. Confirm graph shaping can reuse current helper patterns instead of adding backend-only logic

Status: completed

### Milestone 3: Design The Dedicated Lineage Screen
Goal:
Plan the screen structure, mobile behavior, navigation, and first useful interactions for a family view tied to one current batch.

Acceptance criteria:
1. The plan defines the page layout for desktop and mobile
2. The current batch is clearly highlighted
3. Users can navigate to connected batches
4. The plan decides which interactions belong in MVP, such as:
   - tap node to open batch detail
   - recenter on selected node
   - filter repeat vs starter edges
5. The plan keeps node information readable without overloading the graph

Files expected:
1. New `src/pages/BatchLineage.tsx`
2. New lineage screen components under `src/components/lineage/`
3. `src/pages/BatchDetail.tsx`

Validation:
1. Manual mobile-first structure review in the plan
2. Confirm the route can be launched cleanly from `BatchDetail`

Status: completed

### Milestone 4: Design The Lineage Analytics And Reference-Memory Layer
Goal:
Define the first set of explainable runtime analytics, thresholds, and labels derived from connected family data.

Acceptance criteria:
1. The plan defines the MVP analytics set
2. Each analytic has a conservative minimum data threshold
3. The plan defines how labels like `reference batch`, `strong repeat candidate`, and `strong starter source` are computed at runtime
4. The plan defines how to say "so far" and uncertainty clearly in UI copy

Files expected:
1. New `src/lib/lineage-analytics.ts`
2. New lineage analytics UI components under `src/components/lineage/`
3. `src/lib/brew-again.ts`
4. `src/lib/phase-outcomes.ts`

Validation:
1. Confirm the rules do not require new persisted analytics columns
2. Confirm each insight can degrade gracefully when outcome data is sparse

Status: completed

### Milestone 5: Record Deferred Advanced Graph Features And Long-Term Intelligence
Goal:
End with a scoped MVP and a clear list of later enhancements once the dedicated lineage screen is stable.

Acceptance criteria:
1. The plan clearly separates MVP from deferred graph features
2. The plan records future expansions such as branch comparison, global lineage views, and stronger family intelligence
3. The plan stays compatible with the current lineage data model

Files expected:
1. Planning notes in this plan file
2. No schema changes unless later inspection proves they are strictly necessary

Validation:
1. Final repo validation commands
2. Scope check to confirm the plan did not bloat into a generic analytics platform

Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md` before planning.
2. Inspected `src/App.tsx` and confirmed there is still no dedicated lineage route after the foundational pass.
3. Inspected `src/lib/lineage.ts` and confirmed the current helper only supports direct parent links, direct reverse children, and starter-source eligibility.
4. Inspected `src/components/lineage/BatchLineageSection.tsx` and confirmed the current lineage UI is still a compact card-based section inside `BatchDetail`.
5. Inspected `src/pages/BatchDetail.tsx` and confirmed the `Overview` tab hosts lineage alongside timing, reminders, F2 summary, and phase outcomes.
6. Inspected `src/pages/NewBatch.tsx` and `src/components/lineage/StarterSourceSelector.tsx` to confirm starter-source lineage is now part of the batch creation flow.
7. Inspected `src/lib/phase-outcomes.ts` to confirm batch outcome persistence already supports compact node summaries and runtime lineage analytics.
8. Inspected `src/lib/brew-again.ts` and `src/lib/brew-again-types.ts` to confirm current runtime classifications and repeat-candidate language that lineage analytics should align with.
9. Inspected `src/pages/MyBatches.tsx` and confirmed list/archive surfaces remain intentionally compact.
10. Inspected `package.json` and confirmed there is no graph/canvas/zoom library in the current repo.
11. Added `src/lib/lineage-graph.ts` to expand a bounded connected family graph from the current batch, attach phase outcomes to graph nodes, and re-filter visible nodes/edges when repeat or starter edges are toggled.
12. Added `src/lib/lineage-analytics.ts` to compute conservative runtime insights and node badges from family graph data instead of persisting scores.
13. Added a dedicated route in `src/App.tsx` for `/batch/:id/lineage`.
14. Added `src/pages/BatchLineage.tsx` plus new lineage UI components to render:
   - a current-batch-focused lineage screen
   - separate ancestor and descendant generations
   - a related-branch section for connected graph nodes that are not pure ancestors or descendants
   - runtime analytics cards
15. Updated `src/components/lineage/BatchLineageSection.tsx` and `src/pages/BatchDetail.tsx` so BatchDetail can open the dedicated family tree route directly.
16. Validation after Milestones 1-4:
   - `npx tsc -b` failed once due to a new TypeScript typing issue in `src/lib/lineage-analytics.ts`, then passed after a local fix
   - `npm run lint` stayed at the same pre-existing fast-refresh warnings only
   - `npm run test` passed
   - `npm run build` passed
17. Final scope check: the implementation stayed dependency-light, added no schema changes, and deferred branch comparison, persisted scoring, and global lineage dashboards.
18. Final validation:
   - `npx tsc -b` passed
   - `npm run lint` passed with the same pre-existing fast-refresh warnings only
   - `npm run test` passed
   - `npm run build` passed

## Decision log
1. Keep the current lineage data model. The next layer should build on `brew_again_source_batch_id` plus `starter_source_batch_id`, not redesign them.
2. Define a family as the connected component around the current batch when traversing both repeat and starter edges together.
3. Treat repeat lineage and starter lineage as two edge types inside one connected family graph, not as two unrelated screens.
4. Use a dedicated batch-scoped route for MVP, likely `/batch/:id/lineage`, because it stays consistent with the current routing model and keeps the current batch context obvious.
5. Prefer a dependency-light structured graph layout for MVP over introducing a heavy graph library. The current repo has enough UI primitives and `framer-motion`, but no existing graph dependency to build on.
6. Keep graph fetching in a composed helper layer in `src/lib`, then load it page-locally in the new lineage page. That matches the repo’s current data-fetching style better than introducing a new global state model.
7. Compute lineage insights and reference labels at runtime. Do not add persisted analytics fields unless implementation proves a clear need.
8. Align lineage labels with existing Brew Again language where possible, especially around repeat-candidate style classifications.
9. Implement the first family screen as a root-centered, structured graph-like page instead of a freeform canvas. This fits the current repo better, stays mobile-readable, and avoids adding a graph dependency.
10. Treat connected nodes that are neither strict ancestors nor strict descendants as `related branches` rather than forcing the data into a pure tree shape.
11. Keep the family expansion depth bounded to `2` generations for MVP. This is enough to show useful lineage without creating unreadable screens or expensive client traversal.
12. Keep family analytics runtime-only and threshold-based:
   - `best result in this family so far` requires at least 2 batches with saved F2 outcomes
   - `common issue in this family so far` requires the same negative issue to appear in at least 2 related batches
   - `strong repeat candidate` aligns with existing positive F2 + brew-again signals
   - `strong starter source` requires at least 2 positive starter-line descendants

## Open questions
1. The current helper uses bounded client traversal with depth `2`. If real family sizes grow quickly, a later follow-up may still need a more explicit batching or server-shaped graph query.
2. The dedicated lineage page currently relies on compact node cards plus navigation actions rather than a mobile drawer. If node summaries need to grow later, a node-detail drawer may become worthwhile.

## Done when
1. The plan defines the dedicated lineage route and screen placement.
2. The plan defines the family graph/query strategy based on the existing lineage model.
3. The plan defines a concrete node and edge model with separate repeat and starter relationships.
4. The plan defines the MVP lineage analytics set with conservative thresholds and explainable copy.
5. The plan identifies the exact likely files and helper layers to change.
6. The plan clearly separates MVP from deferred advanced graph features.

## Final validation
Run after each milestone and again at the end:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Current baseline expectation from the latest lineage foundation work:
1. `npx tsc -b` should pass
2. `npm run lint` should pass with only the existing fast-refresh warnings, if those warnings remain unchanged
3. `npm run test` should pass
4. `npm run build` should pass

Current schema expectation:
1. No new migration is planned for MVP
2. No generated Supabase types update is planned for MVP
3. If implementation later proves a schema change is necessary, update this plan first with:
   - the exact migration file needed
   - the generated types update in `src/integrations/supabase/types.ts`
   - the frontend read paths to change
   - the frontend write paths to change
   - which steps can be completed in-repo and which must be run manually against Supabase

Recommended MVP boundary for this follow-up:
1. Add a dedicated route at `/batch/:id/lineage`
2. Highlight the current batch and render connected lineage with graph-like styling
3. Show separate repeat and starter edges
4. Attach compact F1/F2 node summaries and a small set of runtime labels
5. Include only a small, explainable analytics set:
   - best result in this family so far
   - common issue in this family so far
   - strong repeat candidate
   - strong starter source
6. Keep interactions to:
   - tap node for batch detail
   - recenter on a selected node
   - toggle repeat vs starter edges
7. Defer:
   - branch comparison tools
   - graph editing
   - global lineage dashboards
   - persisted scoring
   - complex filters beyond the first useful edge toggles
