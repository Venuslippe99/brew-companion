# F1 Recipe and Setup Studio Phase 3: Explainable Recommendation Engine

## Summary
Phase 3 adds an explainable F1 recommendation engine to `src/pages/NewBatch.tsx`. It combines:

1. baseline kombucha brewing rules
2. live draft interpretation
3. tea-base and sweetener transition analysis
4. starter-lineage context
5. comparison against similar prior F1 setup snapshots
6. prior F1 outcome interpretation
7. beginner-safe conservative guidance

The engine must not be a black box. It must produce clear recommendation cards that explain:

1. what Kombloom is recommending
2. why it is recommending it
3. where the recommendation comes from
4. how confident the app is
5. whether the user can safely apply the recommendation with one tap

This phase must explicitly encode the brewing-rule foundation already gathered for the feature. At minimum, the implementation plan must preserve these rule families:

1. **Starter baseline**
   - acidic starter liquid is essential
   - about 10% v/v is the clearest standard baseline
   - higher-than-baseline starter can be framed as a conservative recommendation in cool, slow, or transition scenarios
   - starter liquid should matter more than pellicle size for normalized logic

2. **Sugar normalization**
   - standard kombucha sugar guidance centers around **70 to 90 g/L**
   - **70 to 80 g/L** is a reasonable conservative beginner center
   - below about **50 g/L** and above about **100 g/L** should be treated as caution zones rather than hard blocks
   - refined white sugar and refined cane sugar are the lowest-risk standard defaults

3. **Tea normalization**
   - internal logic should normalize tea by **grams per liter** wherever possible
   - broad literature-style range is around **1.5 to 6 g/L**
   - practical app-default band should likely center around **4 to 6 g/L**
   - tea bag counts are only lower-confidence fallback logic because bag weights vary

4. **Tea family and core lineage**
   - standard lineage logic should stay centered on **Camellia sinensis** teas
   - black tea is the most conservative beginner baseline
   - green tea is clearly viable and should not be treated as inherently weak
   - black-plus-green blends are prudent bridge logic when transitioning from black toward greener profiles
   - white and oolong are viable but lower-evidence than black or green
   - herbal-only batches should be treated as outside the core lineage model

5. **Sweetener and transition logic**
   - refined white sugar and refined cane sugar are the lowest-risk standard sweeteners
   - brown, raw, or whole-cane sugars may deserve mild caution but not automatic rejection
   - honey is a meaningful transition sweetener for standard kombucha lineages
   - changing tea base and sweetener together is a stronger transition than changing only one variable
   - black tea plus refined sugar lineage to green tea plus honey should be treated as a high-caution combined transition

6. **Vessel rules**
   - glass and stainless are the safest F1 defaults
   - acid-resistant food-grade plastics may be acceptable
   - reactive materials deserve caution or stronger warning
   - F1 should remain aerobic
   - the app can recommend leaving working space in the vessel, but should not pretend that one exact headspace percentage is scientific fact

7. **Timing rules**
   - practical F1 expectations commonly center around roughly **7 to 10 days**
   - wider windows can extend further depending on conditions
   - temperature is a major timing driver
   - warmer ferments usually sour faster
   - cooler ferments usually retain sweetness longer
   - transition batches should be framed as less predictable than routine continuity batches

8. **Outcome-first correction logic**
   - repeated `too_sweet` or `no` should bias toward **more time first**
   - repeated `too_sour` or `maybe_late` should bias toward **less time first**
   - repeated `weak_tea_base` can justify modestly stronger tea
   - repeated `strong_tea_base` can justify modestly softer tea
   - poor outcomes after major tea or sweetener transitions should elevate bridge-batch or conservative-transition guidance

Phase 3 must remain useful even for users with zero history. History should enrich the advice, not replace the baseline brewing model.

## Why
Phase 1 and Phase 2 already created the structure Phase 3 needs:

1. `NewBatch` now captures the actual F1 draft in a structured way.
2. recipes are reusable defaults rather than hidden memory.
3. vessels are reusable first-class objects rather than generic labels.
4. `batch_f1_setups` now stores applied F1 setup snapshots with:
   - composition
   - recipe context
   - vessel context
   - fit context
   - lineage context
5. `batch_phase_outcomes` already stores structured F1 taste/readiness signals.

What is still missing is the actual brewing-intelligence layer.

Right now the user can enter:
- tea type
- tea amount
- sugar amount and type
- starter amount
- vessel
- starter lineage
- recipe
- temperature

but Kombloom still does not help them interpret the setup in an implementation-rich way.

It does not yet answer:
1. Is the starter amount conservative enough?
2. Is the sugar amount standard for this volume?
3. Is the tea strength light, standard, or strong for this tea type?
4. Is this a routine continuity batch or a meaningful culture transition?
5. Does this chosen starter lineage fit the target batch?
6. Do prior similar F1 setups suggest more time, less time, more starter, slightly stronger tea, or a bridge batch?
7. Is the selected vessel only physically adequate, or also a sensible choice in context?
8. Should the user avoid changing tea base and sweetener at the same time?

This phase solves that gap by introducing a **rules-plus-history engine**.

The **rules** matter because some recommendations must stand even with zero personal history:
- standard sugar band
- starter baseline
- tea normalization
- core lineage tea family
- meaningful honey transition
- black tea as conservative baseline
- vessel-material hierarchy
- temperature directionality

The **history** matters because the app should also be able to say:
- your similar batches tended to be too sweet at first check
- your black-tea starter lineage has not yet adapted to honey
- your recent balanced batches often used slightly more starter
- your similar setups tagged `weak_tea_base` were lighter than this

Phase 3 is the first phase where Kombloom begins to feel like a brewing assistant rather than only a structured tracker.

## Scope
In scope:

1. Add a new recommendation helper layer in `src/lib` for Phase 3.
2. Compute explainable F1 recommendation cards in `NewBatch` from:
   - baseline brewing rules
   - transition logic
   - live draft interpretation
   - vessel fit and suitability context
   - similar prior `batch_f1_setups`
   - lineage relationships
   - prior F1 outcome signals
3. Add explicit tea-base transition logic.
4. Add explicit sweetener-transition logic.
5. Add explicit combined-transition logic for tea-plus-sweetener changes.
6. Add a recommendation card model with:
   - category
   - priority
   - title
   - summary
   - explanation
   - source type
   - confidence
   - evidence count
   - optional apply action
   - caution level
7. Add a recommendation section in `NewBatch`.
8. Evaluate and likely add recommendation persistence fields to `batch_f1_setups`.
9. Add a lightweight recommendation readback surface in `BatchDetail`.
10. Keep all recommendation wording conservative, explainable, and beginner-safe.
11. Explicitly encode the brewing-rule families listed in this plan.

Out of scope:

1. black-box scoring or opaque “AI says so” guidance
2. automatic mutation of recipes, vessels, or batches without explicit user action
3. major lifecycle, stage, or timing rule changes in `src/lib/batches.ts` or `src/lib/batch-timing.ts`
4. deeper adaptive recipe optimization loops reserved for Phase 4
5. broad redesign of unrelated pages
6. new F1 outcome taxonomy beyond the current structured Phase 2 vocabulary
7. recipe evolution, performance memory dashboards, or full personalization systems beyond recommendation snapshots and accepted adjustments
8. introducing a totally new “Jun mode” product surface in this phase; Jun-relevant logic should appear only as transition-aware recommendation guidance

## Current state
1. **Route placement**
   - `src/App.tsx` already exposes `/new-batch`, `/f1-recipes`, `/f1-vessels`, and `/batch/:id` inside the protected app shell.
   - There is no dedicated recommendation route yet.

2. **Current `NewBatch` orchestration**
   `src/pages/NewBatch.tsx` already supports:
   - start from scratch
   - start from saved recipe
   - save current setup as recipe
   - starter source selection through `StarterSourceSelector`
   - saved or manual vessel selection
   - batch creation to `kombucha_batches`
   - immediate `batch_f1_setups` snapshot persistence through `saveBatchF1Setup(...)`

   It already captures the draft inputs that Phase 3 needs:
   - volume
   - tea type
   - tea source form
   - tea amount and unit
   - sugar amount and type
   - starter amount
   - room temperature
   - target preference
   - selected vessel
   - starter source
   - brew-again source

3. **Current recipe model**
   `src/lib/f1-recipe-types.ts` defines:
   - `F1RecipeDraft`
   - `F1RecipeSummary`
   - `F1BatchSetupFields`

   Recipes store reusable defaults, including `preferredVesselId`, but do not yet store recommendation logic or recommendation history.

4. **Current recipe persistence**
   `src/lib/f1-recipes.ts` loads and saves `f1_recipes`. It is CRUD-oriented and does not yet compute brewing guidance.

5. **Current vessel model**
   `src/lib/f1-vessel-types.ts` defines:
   - vessel materials
   - vessel suitability states
   - fit states
   - selected vessel shapes
   - legacy compatibility presets

   `src/lib/f1-vessels.ts` handles CRUD for `fermentation_vessels`.

6. **Current vessel-fit helper**
   `src/lib/f1-vessel-fit.ts` already computes:
   - fill ratio
   - fill ratio percent
   - recommended max fill
   - fit state
   - suitability state
   - plain-language fit summary
   - caution notes

   This is useful as one Phase 3 input, but it is still generic and not yet combined with transition, lineage, or prior outcomes.

7. **Current applied F1 setup snapshot**
   `src/lib/f1-setups.ts` writes `batch_f1_setups` with:
   - `selected_recipe_id`
   - `selected_vessel_id`
   - `fit_state`
   - `fit_notes_json`
   - `setup_snapshot_json`
   - `created_by_user_id`

   `setup_snapshot_json` already captures:
   - actual composition
   - recipe context
   - vessel context
   - fit context
   - lineage context

   There is no recommendation snapshot yet.

8. **Current setup summary**
   `src/lib/f1-setup-summary.ts` produces a live composition plus vessel-fit summary for `NewBatch`. It is descriptive, not prescriptive.

9. **Current lineage infrastructure**
   `src/lib/lineage.ts` already supports:
   - starter source candidates
   - brewed-from parent
   - starter source parent
   - repeated-as descendants
   - used-as-starter-for descendants

   This gives Phase 3 enough batch-family context for continuity and transition analysis.

10. **Current outcome infrastructure**
    `src/lib/phase-outcomes.ts` loads and saves structured F1/F2 outcomes in `batch_phase_outcomes`.

    `src/lib/phase-outcome-options.ts` already provides F1 outcome vocabulary:
    - taste states: `too_sweet`, `slightly_sweet`, `balanced`, `tart`, `too_sour`
    - readiness: `yes`, `maybe_early`, `maybe_late`, `no`
    - tags: `ready_for_f2`, `still_too_sweet`, `nice_balance`, `too_acidic`, `strong_tea_base`, `weak_tea_base`, `good_starter_for_next_batch`, `not_sure`

    That is enough to derive interpretable “more time first”, “less time first”, “slightly stronger tea base”, “bridge the transition”, and “this lineage may be a good starter base” signals.

11. **Current lifecycle and timing helpers**
    `src/lib/batches.ts` still owns batch stage and next-action semantics.
    `src/lib/batch-timing.ts` still derives timing estimates from brew date, temperature, target preference, and starter ratio.

    Phase 3 should reuse current timing outputs for recommendation framing rather than forking timing rules into recommendation JSX.

12. **Current Batch Detail state**
    `src/pages/BatchDetail.tsx` already reads `batch_f1_setups` and shows a compact F1 setup snapshot summary in overview surfaces, but it does not yet show what Kombloom suggested at setup time.

13. **Current gaps Phase 3 must close**
    - no baseline starter/sugar/tea interpretation
    - no tea-base transition analysis
    - no sweetener transition analysis
    - no combined-transition logic
    - no similarity comparison against prior F1 setups
    - no outcome-aware recommendation logic
    - no recommendation card model
    - no recommendation persistence
    - no recommendation readback in Batch Detail

## Intended outcome
1. **Beginner with no history**
   A first-time brewer entering a setup in `NewBatch` still gets useful recommendation cards from baseline rules alone. The app should be able to say things like:
   - “About 10% starter liquid is the clearest standard baseline for an F1 setup like this.”
   - “70 to 90 g/L is the usual kombucha sugar band; your current sugar sits inside that range.”
   - “Tea is best interpreted by grams per liter. Tea bag counts are being treated as a lower-confidence approximation.”
   - “Black tea is the most conservative baseline for culture continuity.”

2. **Returning brewer with history**
   A user with prior `batch_f1_setups` and F1 outcomes gets richer, source-labeled recommendations:
   - baseline rule card
   - similar setup card
   - lineage card
   - outcome-aware “next time” lesson
   - mixed-evidence card where baseline and history reinforce each other

3. **Transition-aware guidance**
   If the draft asks the culture to adapt, the app says so clearly.

   Example:
   - starter lineage from black tea + refined sugar
   - new target batch using green tea + honey

   The engine should surface:
   - tea-base transition warning
   - sweetener transition warning
   - combined high-caution transition card
   - bridge logic such as using a black-plus-green blend first or avoiding simultaneous tea and sweetener change

4. **Live interpretation of starter, sugar, tea, vessel, and timing**
   The recommendation section updates from current draft values and explains:
   - starter ratio interpretation
   - sugar g/L interpretation
   - tea-strength interpretation
   - vessel fit and material cautions
   - timing expectation and confidence

5. **Explainable instead of black-box**
   Every recommendation card should show what it came from:
   - baseline
   - transition
   - similar setups
   - lineage
   - outcomes
   - mixed

   Cards should also show confidence and explanation text.

6. **Optional apply actions**
   Safe recommendation categories such as starter amount, sugar amount, or tea amount may expose one-tap apply actions when the engine has a clear conservative numeric adjustment to offer.
   Transition warnings and timing cards should remain primarily explanatory.

7. **Recommendation snapshots**
   When the user creates a batch, the final recommendation set should be saved alongside `batch_f1_setups` so Batch Detail can later show what Kombloom suggested at setup time.

8. **Lighter Batch Detail readback**
   `BatchDetail` should show the recommendation snapshot as a secondary memory surface, not as a second live editor. The main setup decision moment remains `NewBatch`.

## Files and systems involved
1. **Route files**
   - `src/App.tsx`

2. **Existing pages**
   - `src/pages/NewBatch.tsx`
   - `src/pages/BatchDetail.tsx`
   - `src/pages/F1Recipes.tsx`
   - `src/pages/F1Vessels.tsx`

3. **Existing F1 domain and persistence helpers**
   - `src/lib/f1-recipe-types.ts`
   - `src/lib/f1-recipes.ts`
   - `src/lib/f1-vessel-types.ts`
   - `src/lib/f1-vessels.ts`
   - `src/lib/f1-vessel-fit.ts`
   - `src/lib/f1-setups.ts`
   - `src/lib/f1-setup-summary.ts`

4. **Existing lineage, outcome, lifecycle, and timing helpers**
   - `src/lib/lineage.ts`
   - `src/lib/phase-outcomes.ts`
   - `src/lib/phase-outcome-options.ts`
   - `src/lib/batches.ts`
   - `src/lib/batch-timing.ts`
   - `src/lib/f2-types.ts`
   - `src/lib/f2-persistence.ts`

5. **Recommended new recommendation helpers**
   - `src/lib/f1-baseline-rules.ts`
   - `src/lib/f1-transition-rules.ts`
   - `src/lib/f1-similarity.ts`
   - `src/lib/f1-lineage-signals.ts`
   - `src/lib/f1-outcome-signals.ts`
   - `src/lib/f1-recommendation-types.ts`
   - `src/lib/f1-recommendations.ts`

   If implementation finds that some can be merged cleanly, keep the same responsibility split even if file names differ.

6. **Recommended UI components**
   - `src/components/f1/F1RecommendationSection.tsx`
   - `src/components/f1/F1RecommendationCard.tsx`
   - optionally `src/components/f1/F1RecommendationApplyBar.tsx` if apply actions need a dedicated surface

7. **Batch detail readback surfaces**
   - `src/components/batch-detail/BatchOverviewSurface.tsx`
   - optionally `src/components/batch-detail/BatchCurrentPhaseCard.tsx` if needed for a compact recommendation memory surface

8. **Supabase tables**
   - `public.batch_f1_setups`
   - `public.batch_phase_outcomes`
   - `public.kombucha_batches`
   - `public.f1_recipes`
   - `public.fermentation_vessels`

9. **Supabase migrations**
   - existing Phase 1 and Phase 2 migrations in `supabase/migrations/`
   - likely new additive Phase 3 migration for recommendation snapshot columns on `batch_f1_setups`

10. **Generated types**
   - `src/integrations/supabase/types.ts`

## Risks and compatibility checks
1. **Over-claiming certainty**
   Recommendations must not present weak kombucha evidence as settled fact. Standard bands and conservative defaults should be labeled as guidance.

2. **Baseline vs personal history confusion**
   The UI must distinguish “baseline rule” from “your similar past batches suggest...” so users do not mistake one for the other.

3. **Weak similarity overconfidence**
   Thin matches, bag-count approximations, or major lineage transitions must not produce high-confidence numeric advice.

4. **Opaque lineage logic**
   If lineage recommendations are not explained clearly, the system will feel arbitrary. Transition cards need explicit “why this matters” language.

5. **Recommendation overload**
   `NewBatch` already has recipe, vessel, lineage, summary, and form surfaces. Recommendation cards must be prioritized and grouped.

6. **`batch_f1_setups` schema creep**
   Recommendation persistence should stay additive and compact. Phase 3 should avoid turning `batch_f1_setups` into an unbounded analytics store.

7. **Query and performance risk**
   Similarity, lineage, and outcome reads can become expensive if the page fetches too much history. The plan should bound the read set and keep ranking logic scoped.

8. **Conflicting signals**
   Baseline rules, transitions, and prior outcomes may disagree. The engine needs a priority model.

9. **Transition severity calibration**
   Transition warnings can become too aggressive and discourage normal experimentation, or too weak and miss meaningful culture shifts.

10. **Tea bag precision risk**
    Tea bags are lower-confidence proxies and must never be represented as precise gram-equivalent truth.

11. **Beginner clarity**
    Safe, simple first adjustments should be preferred over overfit historical suggestions.

12. **Existing data compatibility**
    Phase 3 must work for older batches and older `batch_f1_setups` rows that do not yet have recommendation fields.

13. **Future Phase 4 extensibility**
    Recommendation snapshots, engine versioning, and accepted adjustment capture should preserve space for deeper adaptive systems later without forcing redesign now.

14. **Stage consistency**
    Recommendation persistence must not change stage, next-action, or timing semantics.

15. **Timeline/history expectations**
    The plan must explicitly decide whether recommendation snapshot persistence should remain silent in `batch_logs` and `batch_stage_events`.
    Default recommendation: no new timeline writes for Phase 3 recommendation snapshots.

Because this phase touches brewing guidance and recommendation logic, implementation must explicitly check:
1. stage consistency across UI, derived logic, and persistence
2. next-action consistency with `src/lib/batches.ts`
3. whether recommendation persistence affects timeline/history expectations
4. backward compatibility with saved batches, saved F2 setups, saved recipes, saved vessels, and saved `batch_f1_setups`
5. clarity and safety of user-facing fermentation guidance

## Milestones

### Milestone 1: Define Phase 3 recommendation architecture and helper split
Goal:
Lock the helper responsibilities, page orchestration boundaries, and recommendation pipeline before implementation begins.

Acceptance criteria:
1. The plan recommends a concrete helper split between:
   - baseline rules
   - transitions
   - similarity
   - lineage signals
   - outcome signals
   - final recommendation assembly
2. The plan keeps pages focused on orchestration and rendering.
3. The plan states where live recommendation computation happens and where persistence hooks live.

Files expected:
1. `plans/2026-03-23-f1-recommendation-engine-phase-3.md`
2. future `src/lib/f1-recommendations.ts`
3. future `src/lib/f1-recommendation-types.ts`

Validation:
1. Confirm the architecture reuses existing setup, lineage, timing, and outcome helpers instead of forking logic into `NewBatch`.

Status: completed

### Milestone 2: Define baseline brewing rule engine inputs and output model
Goal:
Translate baseline kombucha setup knowledge into implementation-ready rule categories and outputs.

Acceptance criteria:
1. The plan defines starter, sugar, tea amount, tea type, sweetener, vessel, and timing baseline interpretation categories.
2. The plan defines normalization metrics:
   - starter ratio
   - sugar g/L
   - tea g/L when possible
   - lower-confidence tea-bag fallback
3. The plan explicitly preserves:
   - starter baseline around 10% v/v
   - sugar band around 70 to 90 g/L
   - practical tea band around 4 to 6 g/L
   - black tea as conservative baseline
   - green tea as viable full base
   - glass/stainless as safest vessel defaults
   - temperature as major timing driver
4. The plan specifies how baseline rules become recommendation cards.

Files expected:
1. `plans/2026-03-23-f1-recommendation-engine-phase-3.md`
2. future `src/lib/f1-baseline-rules.ts`

Validation:
1. Check that baseline rules remain useful with zero user history and stay conservative in wording.

Status: completed

### Milestone 3: Define transition engine and transition-severity logic
Goal:
Make tea-base and sweetener transitions a first-class subsystem with explicit severity classes and bridge logic.

Acceptance criteria:
1. The plan defines tea-base change detection, sweetener change detection, and combined transition detection.
2. The plan defines continuity vs bridge vs high-caution transition classes.
3. The plan explicitly treats these scenarios as core examples:
   - black tea lineage -> green tea
   - black tea lineage -> black-plus-green blend
   - refined sugar lineage -> honey
   - black tea + refined sugar lineage -> green tea + honey
4. The plan preserves conservative bridge logic such as:
   - black-plus-green bridge recommendation
   - avoid changing tea and sweetener together when possible
   - more conservative monitoring language for transition batches

Files expected:
1. `plans/2026-03-23-f1-recommendation-engine-phase-3.md`
2. future `src/lib/f1-transition-rules.ts`

Validation:
1. Confirm transition logic is explainable and does not overblock experimentation.

Status: completed

### Milestone 4: Define similarity model using `batch_f1_setups`
Goal:
Specify how prior F1 setups are compared to the current draft with clear similarity tiers and bounded reads.

Acceptance criteria:
1. The plan defines the comparison dimensions:
   - recipe id
   - tea type and source form
   - normalized tea strength
   - sugar type and normalized sugar
   - starter ratio
   - target preference
   - vessel material and fit state
   - room-temperature band
   - lineage proximity
2. The plan defines similarity tiers such as:
   - `very_close`
   - `close`
   - `related_transition`
   - `weak_match`
3. The plan states how many prior setups should be loaded for the first pass.

Files expected:
1. `plans/2026-03-23-f1-recommendation-engine-phase-3.md`
2. future `src/lib/f1-similarity.ts`
3. future `src/lib/f1-setups.ts`

Validation:
1. Confirm the similarity model does not require a new analytics table in the first pass.

Status: completed

### Milestone 5: Define lineage-aware analysis model
Goal:
Turn starter-source, brew-again, and batch-family data into interpretable continuity and transition signals.

Acceptance criteria:
1. The plan states how to use lineage outputs plus lineage fields already stored in `setup_snapshot_json`.
2. The plan defines continuity, bridge, mismatch, and transition interpretations.
3. The plan defines how related batches that repeated or reused a starter influence evidence strength.
4. The plan explicitly distinguishes:
   - normal continuity
   - tea-only transition
   - sweetener-only transition
   - combined transition

Files expected:
1. `plans/2026-03-23-f1-recommendation-engine-phase-3.md`
2. future `src/lib/f1-lineage-signals.ts`
3. future `src/lib/lineage.ts` only if compatibility extension is needed

Validation:
1. Confirm lineage remains an enrichment layer and does not replace baseline safety logic.

Status: completed

### Milestone 6: Define F1 outcome interpretation model
Goal:
Translate prior F1 outcomes and tags into safe recommendation signals with clear prioritization.

Acceptance criteria:
1. The plan defines how taste state, readiness, tags, and `next_time_change` influence current recommendations.
2. The plan encodes “time first” logic:
   - repeated `too_sweet` or `no` biases toward more time before stronger recipe changes
   - repeated `too_sour` or `maybe_late` biases toward less time first
3. The plan defines how `weak_tea_base`, `strong_tea_base`, and lineage-transition failures affect recommendation severity.
4. The plan preserves conservative interpretation rather than pretending each outcome maps to one precise numeric correction.

Files expected:
1. `plans/2026-03-23-f1-recommendation-engine-phase-3.md`
2. future `src/lib/f1-outcome-signals.ts`
3. future `src/lib/phase-outcomes.ts` only if additional loading helpers are justified

Validation:
1. Confirm outcome interpretation remains explainable and does not overfit to one prior batch.

Status: completed

### Milestone 7: Define recommendation card model and priority/confidence system
Goal:
Lock the card schema, category list, sorting model, source types, and confidence model.

Acceptance criteria:
1. The plan defines categories at least as detailed as:
   - `starter_recommendation`
   - `sugar_recommendation`
   - `tea_amount_recommendation`
   - `tea_base_recommendation`
   - `culture_transition_warning`
   - `sweetener_transition_warning`
   - `combined_transition_warning`
   - `vessel_recommendation`
   - `timing_expectation`
   - `next_time_lesson`
   - `lineage_note`
   - `fit_note`
2. The plan defines card fields such as:
   - `id`
   - `category`
   - `priority`
   - `title`
   - `summary`
   - `explanation`
   - `source_type`
   - `confidence`
   - `evidence_count`
   - `recommendation_type`
   - `caution_level`
   - `apply_action`
   - `applied_value_snapshot`
3. The plan defines source types and confidence levels with concrete rules.
4. The plan distinguishes:
   - high confidence for strong baseline bands
   - moderate confidence for bridge guidance and transition recommendations
   - lower confidence for bag-count equivalence or weak-history claims

Files expected:
1. `plans/2026-03-23-f1-recommendation-engine-phase-3.md`
2. future `src/lib/f1-recommendation-types.ts`
3. future `src/lib/f1-recommendations.ts`

Validation:
1. Confirm the model is expressive enough for both baseline-only and mixed-evidence cards.

Status: completed

### Milestone 8: Define `NewBatch` recommendation UX
Goal:
Specify the recommendation section ordering, presentation, and safe apply actions in `NewBatch`.

Acceptance criteria:
1. The plan recommends a dedicated recommendation section below the setup summary and above the lower form actions.
2. The plan defines top-card prominence for the highest-priority items and calmer rendering for lower-priority notes.
3. The plan states how one-tap apply actions work and which recommendation categories should never auto-apply.
4. The plan distinguishes baseline-only cards from history-backed cards visually or textually.
5. The plan defines how to present combined-transition warnings without overwhelming beginners.

Files expected:
1. `plans/2026-03-23-f1-recommendation-engine-phase-3.md`
2. future `src/pages/NewBatch.tsx`
3. future `src/components/f1/F1RecommendationSection.tsx`
4. future `src/components/f1/F1RecommendationCard.tsx`

Validation:
1. Check that the UX remains beginner-safe and does not overload the page.

Status: completed

### Milestone 9: Define persistence strategy for recommendation snapshots
Goal:
Make a concrete recommendation on whether and how Phase 3 recommendation results are persisted with `batch_f1_setups`.

Acceptance criteria:
1. The plan explicitly decides between live-only vs live-plus-snapshot persistence.
2. The plan evaluates and recommends concrete columns such as:
   - `recommendation_snapshot_json`
   - `recommendation_engine_version`
   - `accepted_recommendation_ids_json`
3. The plan states exact write-path changes in `src/lib/f1-setups.ts` and exact generated-type impact.
4. The plan states how older rows without recommendation fields remain readable.

Files expected:
1. `plans/2026-03-23-f1-recommendation-engine-phase-3.md`
2. future `supabase/migrations/<phase-3-migration>.sql`
3. future `src/lib/f1-setups.ts`
4. future `src/integrations/supabase/types.ts`

Validation:
1. Confirm the schema addition is additive and backward-compatible with existing Phase 2 rows.

Status: completed

### Milestone 10: Define `BatchDetail` recommendation readback scope
Goal:
Specify whether Batch Detail should show saved recommendation snapshots later and how prominent that surface should be.

Acceptance criteria:
1. The plan makes a concrete recommendation for a compact readback surface.
2. The plan states where the readback should render and how it differs from the live `NewBatch` section.
3. The plan keeps Batch Detail focused on historical context rather than live recommendation recalculation.

Files expected:
1. `plans/2026-03-23-f1-recommendation-engine-phase-3.md`
2. future `src/pages/BatchDetail.tsx`
3. future `src/components/batch-detail/BatchOverviewSurface.tsx`

Validation:
1. Confirm readback remains a secondary memory surface, not a second recommendation editor.

Status: completed

### Milestone 11: Define validation approach and baseline blockers
Goal:
Record the repo-standard validation path and any pre-existing blockers before implementation starts.

Acceptance criteria:
1. The plan lists `npx tsc -b`, `npm run lint`, `npm run test`, and `npm run build`.
2. The plan states that baseline warnings or failures must be recorded as pre-existing.
3. The plan keeps milestone-by-milestone validation mandatory.

Files expected:
1. `plans/2026-03-23-f1-recommendation-engine-phase-3.md`

Validation:
1. None beyond keeping the final validation section accurate.

Status: completed

## Progress log
1. Read `AGENTS.md` and `PLANS.md` to confirm repo planning, lifecycle, schema, and validation rules.
2. Inspected `src/App.tsx` to confirm the current protected route shape and that Phase 3 work remains centered in `NewBatch` and `BatchDetail`.
3. Inspected `src/pages/NewBatch.tsx` to confirm current recipe-aware, vessel-aware batch creation already captures the live inputs Phase 3 needs and already persists `batch_f1_setups`.
4. Inspected `src/pages/F1Recipes.tsx` and `src/pages/F1Vessels.tsx` to confirm recipes and vessels remain reusable defaults and management surfaces.
5. Inspected `src/pages/BatchDetail.tsx` to confirm it already reads saved F1 setup snapshots and is a viable home for lightweight recommendation readback later.
6. Inspected `src/lib/f1-recipe-types.ts`, `src/lib/f1-recipes.ts`, `src/lib/f1-vessel-types.ts`, and `src/lib/f1-vessels.ts` to confirm the current recipe and vessel domain shapes.
7. Inspected `src/lib/f1-vessel-fit.ts` and `src/lib/f1-setup-summary.ts` to confirm fit logic and summary logic already exist as reusable inputs rather than recommendation outputs.
8. Inspected `src/lib/f1-setups.ts` to confirm `batch_f1_setups` already stores actual composition, recipe context, vessel context, fit context, and lineage context, making it the correct Phase 3 snapshot authority.
9. Inspected `src/lib/lineage.ts` to confirm starter lineage and batch-family relationships are already structured enough for continuity and transition analysis.
10. Inspected `src/lib/phase-outcomes.ts` and `src/lib/phase-outcome-options.ts` to confirm current structured F1 outcomes and tags are sufficient for explainable outcome-aware signals.
11. Inspected `src/lib/batches.ts` and `src/lib/batch-timing.ts` to confirm Phase 3 should reuse current stage and timing helpers instead of forking those rules.
12. Inspected `src/lib/f2-types.ts` and `src/lib/f2-persistence.ts` to confirm the repo already uses setup snapshot persistence patterns that Phase 3 should mirror rather than replace.
13. Reviewed the supplied kombucha-domain research brief and extracted the rule families that Phase 3 must preserve:
   - starter baseline
   - sugar normalization
   - tea normalization
   - tea-family continuity
   - sweetener transition caution
   - combined tea-plus-sweetener transition severity
   - vessel-material hierarchy
   - temperature and timing directionality
   - time-first outcome correction logic
14. Milestone 1 completed: added additive recommendation snapshot support to `batch_f1_setups`, extended `src/lib/f1-setups.ts` to carry the new fields, and created the shared recommendation contract in `src/lib/f1-recommendation-types.ts`.
15. Milestone 1 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice and chunk-size warning
16. Milestone 2 completed: added `src/lib/f1-baseline-rules.ts` with explicit starter, sugar, tea, vessel, and timing baseline interpretation plus normalized metrics for recommendation generation.
17. Milestone 2 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice and chunk-size warning
18. Milestone 3 completed: added `src/lib/f1-transition-rules.ts` with explicit tea-base, sweetener, and combined-transition analysis, and expanded `F1_SUGAR_TYPES` to include `Honey` so the key transition cases are actually representable in `NewBatch`.
19. Milestone 3 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice and chunk-size warning
20. Milestone 4 completed: added bounded recommendation-history loading in `src/lib/f1-setups.ts`, introduced shared history/draft recommendation types, and created `src/lib/f1-similarity.ts` with explicit `very_close` / `close` / `related_transition` / `weak_match` tiers.
21. Milestone 4 validation:
   - `npx tsc -b`: passed after fixing new typecheck issues in legacy-history fallback coercion for tea source form, tea amount unit, and target preference
   - `npm run lint`: passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice and chunk-size warning
22. Milestone 5 completed: added `src/lib/f1-lineage-signals.ts` so selected starter-source and brew-again provenance produce explicit continuity notes and a primary transition reference instead of hiding lineage inside similarity scoring.
23. Milestone 5 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice and chunk-size warning
24. Milestone 6 completed: added `loadF1OutcomesForBatches(...)` in `src/lib/phase-outcomes.ts` and created `src/lib/f1-outcome-signals.ts` so similar F1 outcomes can bias toward more-time-first, less-time-first, and modest tea-base lessons.
25. Milestone 6 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice and chunk-size warning
26. Milestone 7 completed: added `src/lib/f1-recommendations.ts` to assemble baseline, transition, similarity, lineage, and outcome signals into one sorted recommendation-card set and recommendation snapshot payload.
27. Milestone 7 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice and chunk-size warning
28. Milestone 8 and 9 completed: `src/pages/NewBatch.tsx` now loads bounded recommendation history, builds the live recommendation view model, renders `src/components/f1/F1RecommendationSection.tsx`, supports safe one-tap apply actions, and persists recommendation snapshots plus accepted recommendation ids through `saveBatchF1Setup(...)`.
29. Milestone 8 and 9 validation:
   - `npx tsc -b`: passed after tightening the applied-adjustment state to the shared recommendation snapshot type
   - `npm run lint`: passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice and chunk-size warning
30. Milestone 10 completed: `src/components/batch-detail/BatchOverviewSurface.tsx` now reads saved recommendation snapshot data from `LoadedF1Setup` and shows it as a compact setup-time guidance memory surface inside the saved F1 setup area.
31. Milestone 10 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice and chunk-size warning
32. Milestone 11 completed: the implementation followed the repo-standard validation path after every milestone, and all new failures encountered during the work were fixed before moving on.
33. Milestone 11 validation:
   - `npx tsc -b`: passed
   - `npm run lint`: passed with the existing 9 `react-refresh/only-export-components` warnings in shared UI/context files
   - `npm run test`: passed
   - `npm run build`: passed with the existing Browserslist age notice and chunk-size warning

## Decision log
1. Phase 3 should be a rules-plus-history engine, not a history-only engine.
2. Transition logic should be a first-class subsystem, not a minor flag inside one generic rules helper.
3. Black tea lineage to green tea plus honey should be treated as a high-caution combined transition, not just two mild notes.
4. Baseline brewing rules must stay useful even with zero history, and historical signals should enrich rather than replace them.
5. Outcome-aware corrections should prefer simpler and safer timing adjustments first before stronger recipe changes when the evidence supports that order.
6. Recommendation cards must expose source type and confidence explicitly.
7. Phase 3 should compute recommendations live in `NewBatch` and also snapshot the final recommendation set into `batch_f1_setups` at batch creation time.
8. Batch Detail should read back the saved recommendation snapshot later, but only as a lighter secondary memory surface.
9. Phase 3 should likely extend `batch_f1_setups` with:
   - `recommendation_snapshot_json`
   - `recommendation_engine_version`
   - `accepted_recommendation_ids_json`
10. Tea amount logic should normalize by grams per liter where possible and treat tea bag counts as lower-confidence approximation logic.
11. Recipe, vessel, lineage, and outcomes must remain separable inputs in helper design even though the final recommendation engine combines them.
12. Phase 3 should reuse `getBatchStageTiming(...)` for timing expectation framing and should not introduce a second timing estimation engine in JSX.
13. No dedicated recommendation analytics view is recommended for the first pass. Phase 3 should prefer bounded reads from `batch_f1_setups`, `kombucha_batches`, and `batch_phase_outcomes`, then rank and interpret results in `src/lib`.
14. Recommendation persistence should remain silent in `batch_logs` and `batch_stage_events` for Phase 3 unless implementation finds a compelling product need.
15. The plan must preserve the following brewing-rule interpretations explicitly:
   - starter baseline around 10% v/v
   - sugar band around 70 to 90 g/L
   - practical tea band around 4 to 6 g/L
   - black tea as conservative baseline
   - green tea as viable full base
   - black-plus-green as prudent bridge logic
   - honey as a meaningful sweetener transition
   - combined tea plus sweetener changes as higher caution than one-variable changes
   - time-first corrections for repeated “too sweet” or “not ready” outcomes
16. Recommendation persistence should extend `batch_f1_setups` instead of introducing a parallel recommendation table, because setup-time guidance belongs to the applied setup snapshot and additive columns keep existing rows compatible.
17. `Honey` should be added to the selectable F1 sugar types in Phase 3 because transition guidance is only credible if the key honey-transition scenario can be represented in the live draft rather than hidden behind `Other`.
18. Recommendation history loading in `NewBatch` should stay bounded and page-local: load recent setup history plus any explicitly selected lineage source batches, then assemble recommendations in `src/lib` rather than issuing multiple component-local queries.
19. Batch Detail should read recommendation snapshots back only as historical memory, not by recalculating the engine live, so the saved setup context remains stable even if the engine evolves later.

## Open questions
1. Whether the first implementation should persist full card payloads in `recommendation_snapshot_json` or a slightly more compact normalized shape that separates:
   - `cards`
   - `engineInputsSummary`
   - `appliedAdjustments`
2. Whether `NewBatch` should fetch prior F1 setup history and outcome history in parallel directly on page load or lazily only after the user has entered enough setup fields for meaningful recommendation calculation.

## Done when
1. `NewBatch` can compute explainable F1 recommendation cards from baseline rules, transitions, lineage, similarity, and prior F1 outcomes.
2. The recommendation engine remains useful with zero history and richer with strong history.
3. Transition scenarios such as tea-base changes, sweetener changes, and combined transitions are surfaced explicitly with conservative guidance and bridge suggestions where appropriate.
4. Recommendation cards expose category, source type, confidence, explanation, and optional safe apply actions where relevant.
5. The engine reuses existing setup, vessel-fit, lineage, timing, and outcome infrastructure instead of forking core rules into pages.
6. `batch_f1_setups` is extended as needed to snapshot recommendation results and engine versioning in an additive, backward-compatible way.
7. `BatchDetail` can later show what Kombloom suggested at setup time without recalculating the recommendation engine live.
8. No stage progression, next-action semantics, or timing-helper contracts are broken by the work.
9. The implementation encodes the brewing-rule and transition-rule families listed in this plan instead of flattening them into vague generic recommendation logic.

## Final validation
Run after each implementation milestone and again at the end:

1. `npx tsc -b`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

If any of these already fail before Phase 3 implementation starts, record them in the plan as pre-existing and distinguish them from new failures introduced by the recommendation engine work.
