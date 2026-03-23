import type {
  F1RecommendationCard,
  F1RecommendationDraftContext,
  F1RecommendationHistoryEntry,
} from "@/lib/f1-recommendation-types";
import { findPrimaryTransitionReference } from "@/lib/f1-similarity";

export type F1LineageSignals = {
  primaryReference: ReturnType<typeof findPrimaryTransitionReference>;
  relatedBatchCount: number;
  cards: F1RecommendationCard[];
};

export function buildF1LineageSignals(args: {
  draft: F1RecommendationDraftContext;
  history: F1RecommendationHistoryEntry[];
}): F1LineageSignals {
  const primaryReference = findPrimaryTransitionReference(args);

  if (!args.draft.starterSourceBatchId && !args.draft.brewAgainSourceBatchId) {
    return {
      primaryReference,
      relatedBatchCount: 0,
      cards: [],
    };
  }

  const relatedBatches = args.history.filter((entry) => {
    if (
      args.draft.starterSourceBatchId &&
      entry.starterSourceBatchId === args.draft.starterSourceBatchId
    ) {
      return true;
    }

    if (
      args.draft.brewAgainSourceBatchId &&
      entry.brewAgainSourceBatchId === args.draft.brewAgainSourceBatchId
    ) {
      return true;
    }

    return false;
  });

  if (!primaryReference) {
    return {
      primaryReference,
      relatedBatchCount: relatedBatches.length,
      cards: [
        {
          id: "lineage-source-unresolved",
          category: "lineage_note",
          priority: 41,
          title: "Lineage was selected, but the older setup is only partly readable",
          summary:
            "The recommendation engine can still use baseline rules, but it has weaker continuity context for this source batch.",
          explanation:
            "This usually means the selected source batch predates the richer setup snapshot system or is outside the bounded recent history load.",
          sourceType: "lineage",
          confidence: "low",
          evidenceCount: relatedBatches.length,
          recommendationType: "note",
          cautionLevel: "low",
        },
      ],
    };
  }

  const cards: F1RecommendationCard[] = [];

  if (args.draft.starterSourceBatchId) {
    cards.push({
      id: `lineage-starter-${args.draft.starterSourceBatchId}`,
      category: "lineage_note",
      priority: 46,
      title: "Starter source gives this batch a clear lineage anchor",
      summary:
        relatedBatches.length > 0
          ? `${relatedBatches.length} saved batch${relatedBatches.length === 1 ? "" : "es"} in recent history connect back to this lineage source.`
          : "Using a previous batch as starter keeps the culture tied to a known lineage source.",
      explanation: `The selected starter source is ${primaryReference.label}. That makes continuity easier to explain than a fully manual starter path, even when the current batch still introduces other changes.`,
      sourceType: "lineage",
      confidence: relatedBatches.length > 0 ? "moderate" : "low",
      evidenceCount: relatedBatches.length,
      recommendationType: "note",
      cautionLevel: "none",
    });
  } else if (args.draft.brewAgainSourceBatchId) {
    cards.push({
      id: `lineage-brew-again-${args.draft.brewAgainSourceBatchId}`,
      category: "lineage_note",
      priority: 43,
      title: "Brew Again keeps this batch tied to a previous result",
      summary:
        relatedBatches.length > 0
          ? `${relatedBatches.length} recent batch${relatedBatches.length === 1 ? "" : "es"} share this repeat-batch parent.`
          : "This draft starts from a known previous batch rather than from scratch.",
      explanation: `The selected brew-again source is ${primaryReference.label}. That does not lock the recipe, but it does give the app a more concrete continuity reference when it interprets transitions.`,
      sourceType: "lineage",
      confidence: relatedBatches.length > 0 ? "moderate" : "low",
      evidenceCount: relatedBatches.length,
      recommendationType: "note",
      cautionLevel: "none",
    });
  }

  return {
    primaryReference,
    relatedBatchCount: relatedBatches.length,
    cards,
  };
}
