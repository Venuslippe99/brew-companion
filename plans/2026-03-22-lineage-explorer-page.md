# Lineage Explorer Page

## Summary
Design the next iteration of Kombloom's dedicated Lineage Explorer page for one focal batch, building on the already-shipped lineage route, lineage helpers, Brew Again provenance, starter-source links, and F1/F2 phase outcomes.

This plan assumes the current dedicated page already exists at `/batch/:id/lineage` and focuses on evolving it into a clearer left-to-right explorer experience with:
1. stronger focal-batch layout
2. more explicit node selection and detail inspection
3. clearer visual distinction between Brew Again and starter-source relationships
4. compact but meaningful lineage insights

## Why
The repo now has a dedicated lineage route and a working family screen, but it is still a structured family view rather than a fully intentional explorer page. The current implementation is useful, but it does not yet fully lean into the product intent of:
1. past on the left
2. current batch in the center
3. future on the right
4. one selected node driving a detail panel

This work is needed so the lineage page feels like a first-class exploration surface rather than a good first-pass family summary.

## Scope
In scope:
1. Refine the existing `/batch/:id/lineage` page into a clearer dedicated Lineage Explorer page
2. Keep the page batch-scoped and focal-batch-centered
3. Strengthen node selection, node detail inspection, and recentering behavior
4. Make Brew Again and starter-source edges more visually distinct
5. Keep the family insight layer small, explainable, and grounded in saved outcomes
6. Improve mobile behavior without turning the screen into a modal/drawer-first experience

Out of scope for this pass:
1. Global all-batches lineage maps
2. Free-panning infinite canvas behavior
3. Graph editing
4. Branch diff tools
5. Persisted scoring or analytics fields in Supabase
6. Very deep recursive lineage expansion beyond the bounded family view

## Current state
Current route structure:
1. `src/App.tsx` already includes the dedicated route `/batch/:id/lineage`.
2. `src/pages/BatchDetail.tsx` already links into the dedicated lineage route through `src/components/lineage/BatchLineageSection.tsx`.

Current dedicated lineage page:
1. `src/pages/BatchLineage.tsx` already exists.
2. It currently loads a bounded family graph with `maxDepth: 2`.
3. It supports edge toggles for repeat vs starter lineage.
4. It highlights the current batch and groups nodes into:
   - ancestors
   - current batch
   - descendants
   - related branches
5. It uses compact cards and runtime analytics instead of a canvas or graph library.

Current lineage helper/data shape:
1. `src/lib/lineage.ts` still handles direct lineage reads and starter-source candidate loading for `NewBatch`.
2. `src/lib/lineage-graph.ts` now expands a bounded connected family graph, attaches phase outcomes to nodes, and re-filters visible nodes and edges.
3. `src/lib/lineage-analytics.ts` computes runtime insights and node badges such as repeat candidate and strong starter source.

Current node and insight surfaces:
1. `src/components/lineage/FamilyTreeNodeCard.tsx` shows:
   - batch name
   - brew date
   - stage
   - compact F1 summary
   - compact F2 summary
   - 1-2 badges
   - actions for `Open batch` and `Center here`
2. `src/components/lineage/LineageAnalyticsCards.tsx` already renders a small runtime insight rail.
3. There is no true selected-node detail panel yet; node actions currently live on every card.

Current product and data foundation:
1. `kombucha_batches` already stores:
   - `brew_again_source_batch_id`
   - `starter_source_batch_id`
2. `batch_phase_outcomes` already stores the per-phase summaries needed for node and insight display.
3. `src/lib/brew-again.ts` already contains repeat-candidate language that should stay aligned with lineage badges.

Current UI/dependency reality:
1. The repo still has no graph/canvas/zoom library.
2. The current implementation uses card-based, dependency-light layout with existing UI primitives and `framer-motion`.
3. Mobile patterns in the repo generally prefer stacked sections and drawers/sheets only when needed, not canvas-heavy interaction.

## Intended outcome
After implementation:
1. `/batch/:id/lineage` remains the dedicated Lineage Explorer page for one focal batch
2. The visual layout makes lineage feel directional:
   - past on the left
   - current batch in the center
   - future on the right
3. Clicking or tapping a node updates a dedicated detail panel or stacked detail section for that selected node
4. Brew Again and starter-source relationships remain visually distinct and easy to read
5. Node cards stay compact enough for the graph area, while richer context moves into the selected-node detail surface
6. The page keeps a small set of explainable family insights without cluttering the lineage graph

## Files and systems involved
Likely route and page files:
1. `src/App.tsx`
2. `src/pages/BatchLineage.tsx`
3. `src/pages/BatchDetail.tsx`

Likely shared components:
1. `src/components/lineage/BatchLineageSection.tsx`
2. `src/components/lineage/FamilyTreeNodeCard.tsx`
3. `src/components/lineage/LineageAnalyticsCards.tsx`
4. Likely new `src/components/lineage/LineageExplorerPanel.tsx`
5. Likely new `src/components/lineage/LineageExplorerLegend.tsx`
6. Likely new `src/components/lineage/LineageGenerationColumn.tsx`

Likely domain helpers:
1. `src/lib/lineage.ts`
2. `src/lib/lineage-graph.ts`
3. `src/lib/lineage-analytics.ts`
4. `src/lib/phase-outcomes.ts`
5. `src/lib/brew-again.ts`

Supabase and persistence:
1. `kombucha_batches`
2. `batch_phase_outcomes`
3. No migration is expected for this page refinement pass
4. No generated type update is expected unless implementation proves a missing field or query need

## Risks and compatibility checks
1. The current screen already exists, so the main risk is overcomplicating it rather than failing to create it.
2. A strict left-to-right layout can become unreadable on mobile if node cards carry too much information.
3. The data remains a graph, not a pure tree, so the layout cannot assume one parent and one child lane only.
4. If too much detail stays on nodes, the page will become visually noisy.
5. If too much detail moves into the panel, node cards may stop feeling informative.
6. The explorer page should not drift from existing runtime labels in `src/lib/brew-again.ts` and `src/lib/lineage-analytics.ts`.
7. The selected-node panel must degrade gracefully when a node has no saved F1 or F2 outcomes.
8. Any new rendering polish must stay dependency-light unless the repo clearly justifies a graph library.

## Milestones

### Milestone 1: Lock The Explorer Route And Rendering Approach
Goal:
Confirm the dedicated explorer route, the left-to-right rendering direction, and whether the page should remain dependency-light.

Acceptance criteria:
1. The route stays `/batch/:id/lineage`
2. The plan defines a left-to-right explorer layout anchored on one focal batch
3. The plan decides whether a graph/layout library is justified
4. The plan confirms BatchDetail remains the main entry point

Files expected:
1. `src/App.tsx`
2. `src/pages/BatchLineage.tsx`
3. `src/pages/BatchDetail.tsx`
4. `package.json`

Validation:
1. Confirm the route already exists
2. Confirm BatchDetail already links into it
3. Confirm the repo still has no graph library and whether that remains acceptable

Status: completed

### Milestone 2: Define The Explorer Data-Shaping Layer
Goal:
Refine the current graph helper model so it supports node selection, node detail inspection, and a more directional layout.

Acceptance criteria:
1. The plan defines the exact node model for the explorer page
2. The plan defines the exact edge model and visible filter behavior
3. The plan defines how compact node summaries reuse saved F1/F2 outcomes
4. The plan defines where selected-node detail data should come from

Files expected:
1. `src/lib/lineage-graph.ts`
2. `src/lib/lineage-analytics.ts`
3. `src/lib/phase-outcomes.ts`
4. `src/lib/brew-again.ts`

Validation:
1. Confirm the current helper already exposes enough graph data for page-level shaping
2. Confirm no recursive Supabase query is required for the bounded explorer MVP

Status: completed

### Milestone 3: Design The Dedicated Explorer Page Layout
Goal:
Plan the actual page structure, including left-to-right family flow, node selection, detail panel behavior, and mobile adaptation.

Acceptance criteria:
1. The plan defines the page header, graph area, and detail surface
2. The focal batch is visually centered or clearly emphasized
3. The page updates a selected-node panel instead of relying only on inline buttons
4. Mobile behavior is concrete and repo-appropriate
5. The plan decides whether recentering and filter toggles stay in MVP

Files expected:
1. `src/pages/BatchLineage.tsx`
2. `src/components/lineage/FamilyTreeNodeCard.tsx`
3. Likely new `src/components/lineage/LineageExplorerPanel.tsx`
4. Likely new `src/components/lineage/LineageGenerationColumn.tsx`

Validation:
1. Manual layout review for both desktop and mobile in the plan
2. Confirm the current page can evolve into this structure without a route redesign

Status: completed

### Milestone 4: Design The Family Insight And Badge Layer
Goal:
Decide which family insights and node badges belong in MVP, where they appear, and what thresholds keep them trustworthy.

Acceptance criteria:
1. The plan defines which insights stay in MVP
2. Each insight has a minimum data threshold
3. The plan decides which labels appear on nodes vs in the selected-node detail panel
4. The plan avoids clutter by limiting visible node badges

Files expected:
1. `src/lib/lineage-analytics.ts`
2. `src/components/lineage/LineageAnalyticsCards.tsx`
3. `src/components/lineage/FamilyTreeNodeCard.tsx`
4. Likely new `src/components/lineage/LineageExplorerPanel.tsx`

Validation:
1. Confirm the insight rules remain runtime-derived and require no schema change
2. Confirm sparse families degrade to “not enough data yet” rather than weak claims

Status: completed

### Milestone 5: Record Deferred Explorer And Graph Follow-Ups
Goal:
Finish with a scoped MVP explorer page and a clear list of later graph/lineage enhancements.

Acceptance criteria:
1. The plan clearly separates MVP from later graph sophistication
2. Deferred items are recorded concretely
3. The plan remains compatible with the current lineage foundation

Files expected:
1. Planning notes in this plan file

Validation:
1. Final repo validation commands
2. Scope check to avoid turning this into a generic graph-platform plan

Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md` before planning.
2. Confirmed `src/App.tsx` already includes `/batch/:id/lineage`.
3. Confirmed `src/pages/BatchDetail.tsx` and `src/components/lineage/BatchLineageSection.tsx` already link into the dedicated lineage route.
4. Inspected `src/pages/BatchLineage.tsx` and confirmed the current page already supports:
   - a focal batch
   - edge toggles
   - ancestor/current/descendant grouping
   - related branches
   - runtime analytics cards
5. Inspected `src/lib/lineage-graph.ts` and confirmed bounded client-side family graph shaping already exists with `maxDepth: 2`.
6. Inspected `src/lib/lineage-analytics.ts` and confirmed node badges plus family insights already exist as runtime logic.
7. Confirmed the repo still has no graph/canvas/zoom library in `package.json`.
8. Added `src/components/lineage/LineageExplorerLegend.tsx`, `src/components/lineage/LineageGenerationColumn.tsx`, and `src/components/lineage/LineageExplorerPanel.tsx` so the page can behave like an explorer instead of a flat grouped card list.
9. Refined `src/components/lineage/FamilyTreeNodeCard.tsx` into a compact selectable node card with selection state instead of inline per-node action buttons.
10. Reworked `src/pages/BatchLineage.tsx` into a stronger explorer layout with:
   - dedicated header and legend
   - left-to-right `Past / Current / Future` structure on larger screens
   - stacked mobile behavior
   - selected-node detail panel
   - preserved `Related branches` section for graph-shaped families
11. Validation after implementation:
   - `npx tsc -b` passed
   - `npm run lint` passed with the same pre-existing fast-refresh warnings only
   - `npm run test` passed
   - `npm run build` passed

## Decision log
1. Treat this work as an evolution of the existing dedicated lineage page, not a brand-new route or persistence redesign.
2. Keep the dedicated route at `/batch/:id/lineage`.
3. Keep the implementation dependency-light for now; a graph library is not yet justified by the current repo.
4. Shift the explorer page toward a stronger left-to-right reading model without forcing a full freeform canvas.
5. Keep BatchDetail as the main entry point in MVP; list/archive entry points can stay deferred.
6. Move richer node context into a selected-node detail panel/section so graph nodes can stay compact.
7. Keep Brew Again and starter-source relationships visually distinct through styling and legend, not through separate screens.
8. Keep insights runtime-derived, threshold-based, and aligned with current lineage analytics terminology.
9. Keep the route and existing bounded graph helper, but evolve the page into a clearer explorer with one selected-node detail surface driving the richer context.
10. Keep the left-to-right reading model strongest on desktop while allowing the same explorer content to stack on mobile.
11. Keep the legend always visible and rely on that plus wording for edge interpretation instead of adding inline edge labels in MVP.
12. Preserve `Related branches` as an explicit section because the lineage data remains a graph and cannot always be flattened into a single clean past/current/future chain.

## Open questions
1. Should the MVP detail surface be a true side panel on desktop with a stacked section on mobile, or a consistent stacked detail section on all breakpoints for implementation simplicity?
2. Is the existing bounded depth of `2` enough once the layout becomes more directional, or will users expect one extra generation before “load more” becomes necessary?
3. Does the current explorer need a lightweight edge label treatment in addition to line style, or is the always-visible legend enough for MVP?

## Done when
1. The plan defines the dedicated Lineage Explorer page as the current `/batch/:id/lineage` route.
2. The plan describes the dedicated page layout concretely, including focal batch, graph area, and selected-node detail surface.
3. The plan defines the node model, edge model, and insight model for the explorer page.
4. The plan decides which interactions belong in MVP, including selection, recentering, and edge toggles.
5. The plan states clearly that no Supabase migration or generated type update is expected for this page refinement pass.
6. The plan separates MVP from deferred graph complexity and future lineage intelligence.

## Final validation
Run after each milestone and again at the end:
1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Current baseline expectation from the current repo state:
1. `npx tsc -b` should pass
2. `npm run lint` should pass with only the existing fast-refresh warnings, if those warnings remain unchanged
3. `npm run test` should pass
4. `npm run build` should pass

Current schema expectation:
1. No migration is planned for this Lineage Explorer page pass
2. No generated Supabase types update is planned for this pass
3. If implementation later proves a schema change is necessary, update this plan first with:
   - the exact migration file needed
   - the generated types update in `src/integrations/supabase/types.ts`
   - the frontend read paths to change
   - the frontend write paths to change
   - which steps can be completed in-repo and which must be run manually against Supabase
