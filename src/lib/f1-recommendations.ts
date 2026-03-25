import { getBatchStageTiming } from "@/lib/batch-timing";
import { buildF1BaselineRecommendationCards } from "@/lib/f1-baseline-rules";
import { buildF1LineageSignals } from "@/lib/f1-lineage-signals";
import { buildF1OutcomeSignalCards, attachF1OutcomesToHistory } from "@/lib/f1-outcome-signals";
import {
  F1_RECOMMENDATION_ENGINE_VERSION,
  type F1RecommendationCard,
  type F1RecommendationDraftContext,
  type F1RecommendationHistoryEntry,
  type F1RecommendationSnapshot,
} from "@/lib/f1-recommendation-types";
import { loadF1RecommendationHistory } from "@/lib/f1-setups";
import { findSimilarF1Setups } from "@/lib/f1-similarity";
import { buildF1TransitionCards } from "@/lib/f1-transition-rules";
import { loadF1OutcomesForBatches } from "@/lib/phase-outcomes";

function dedupeCards(cards: F1RecommendationCard[]) {
  const seen = new Set<string>();

  return cards.filter((card) => {
    if (seen.has(card.id)) {
      return false;
    }

    seen.add(card.id);
    return true;
  });
}

function sortCards(cards: F1RecommendationCard[]) {
  return [...cards].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    return left.title.localeCompare(right.title);
  });
}

function buildSimilarSetupCard(matches: ReturnType<typeof findSimilarF1Setups>) {
  if (matches.length === 0) {
    return null;
  }

  const topMatch = matches[0];
  const relatedCount = matches.filter(
    (match) => match.tier === "very_close" || match.tier === "close"
  ).length;
  const balancedTopMatch =
    topMatch.historyEntry.outcome?.tasteState === "balanced" ||
    topMatch.historyEntry.outcome?.selectedTags.includes("nice_balance");

  return {
    id: "similar-setups-top-match",
    category: "similar_setup_note",
    priority: topMatch.tier === "very_close" ? 64 : 52,
    title:
      topMatch.tier === "very_close"
        ? "You have brewed something very close to this before"
        : "You have a similar past setup to compare against",
    summary:
      relatedCount > 1
        ? `${relatedCount} recent saved setups look closely related to this brew.`
        : `${topMatch.batchName} is the closest saved match right now.`,
    explanation:
      `${topMatch.batchName} matches this draft on ${topMatch.reasons.slice(0, 3).join(", ").toLowerCase()}.` +
      (balancedTopMatch
        ? " That batch also finished in a balanced range, so it is an especially useful comparison."
        : ""),
    sourceType: balancedTopMatch ? "mixed" : "similar_setups",
    confidence: topMatch.tier === "very_close" ? "moderate" : "low",
    evidenceCount: relatedCount,
    recommendationType: "note",
    cautionLevel: "none",
  } satisfies F1RecommendationCard;
}

export async function loadF1RecommendationHistoryContext(args: {
  userId: string;
  draft: F1RecommendationDraftContext;
  limit?: number;
}) {
  const history = await loadF1RecommendationHistory({
    userId: args.userId,
    limit: args.limit ?? 40,
    includeBatchIds: [
      args.draft.starterSourceBatchId || "",
      args.draft.brewAgainSourceBatchId || "",
    ],
  });

  const outcomeMap = await loadF1OutcomesForBatches(history.map((entry) => entry.batchId));
  return attachF1OutcomesToHistory({ history, outcomeMap });
}

export function buildF1Recommendations(args: {
  draft: F1RecommendationDraftContext;
  history: F1RecommendationHistoryEntry[];
  appliedAdjustments?: F1RecommendationSnapshot["appliedAdjustments"];
}) {
  const brewStartedAt = args.draft.brewDate
    ? new Date(`${args.draft.brewDate}T12:00:00`)
    : null;
  const timing =
    brewStartedAt && !Number.isNaN(brewStartedAt.getTime())
      ? getBatchStageTiming({
          brew_started_at: brewStartedAt.toISOString(),
          current_stage: "f1_active",
          avg_room_temp_c: args.draft.setup.avgRoomTempC,
          target_preference: args.draft.setup.targetPreference,
          starter_liquid_ml: args.draft.setup.starterLiquidMl,
          total_volume_ml: args.draft.setup.totalVolumeMl,
        })
      : null;

  const baseline = buildF1BaselineRecommendationCards({
    setup: args.draft.setup,
    selectedVessel: args.draft.selectedVessel,
    timing,
  });
  const lineageSignals = buildF1LineageSignals({
    draft: args.draft,
    history: args.history,
  });
  const transition = buildF1TransitionCards({
    setup: args.draft.setup,
    reference: lineageSignals.primaryReference,
  });
  const matches = findSimilarF1Setups({
    draft: args.draft,
    history: args.history,
  });
  const similarSetupCard = buildSimilarSetupCard(matches);
  const outcomeCards = buildF1OutcomeSignalCards({ matches });

  const cards = sortCards(
    dedupeCards([
      ...transition.cards,
      ...outcomeCards,
      ...lineageSignals.cards,
      ...(similarSetupCard ? [similarSetupCard] : []),
      ...baseline.cards,
    ])
  );

  const snapshot: F1RecommendationSnapshot = {
    engineVersion: F1_RECOMMENDATION_ENGINE_VERSION,
    cards,
    appliedAdjustments: args.appliedAdjustments || [],
    inputsSummary: {
      sourceBatchId: args.draft.starterSourceBatchId,
      brewAgainSourceBatchId: args.draft.brewAgainSourceBatchId,
      similarBatchCount: matches.length,
      outcomeCount: args.history.filter((entry) => entry.outcome).length,
    },
  };

  return {
    cards,
    timing,
    matches,
    snapshot,
  };
}
