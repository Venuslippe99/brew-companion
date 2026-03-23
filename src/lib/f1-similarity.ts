import {
  buildF1BaselineMetrics,
  getSugarFamily,
  getTeaFamily,
} from "@/lib/f1-baseline-rules";
import type {
  F1RecommendationDraftContext,
  F1RecommendationHistoryEntry,
} from "@/lib/f1-recommendation-types";

export type F1SimilarityTier =
  | "very_close"
  | "close"
  | "related_transition"
  | "weak_match";

export type F1SimilarityMatch = {
  batchId: string;
  batchName: string;
  tier: F1SimilarityTier;
  score: number;
  reasons: string[];
  historyEntry: F1RecommendationHistoryEntry;
};

function getTemperatureBand(tempC: number) {
  if (tempC < 20) {
    return "cool";
  }

  if (tempC <= 25) {
    return "moderate";
  }

  return "warm";
}

function getTier(score: number): F1SimilarityTier {
  if (score >= 8) {
    return "very_close";
  }

  if (score >= 5.5) {
    return "close";
  }

  if (score >= 3.5) {
    return "related_transition";
  }

  return "weak_match";
}

export function findSimilarF1Setups(args: {
  draft: F1RecommendationDraftContext;
  history: F1RecommendationHistoryEntry[];
  limit?: number;
}) {
  const draftMetrics = buildF1BaselineMetrics(args.draft.setup);
  const limit = args.limit ?? 6;

  return args.history
    .filter((entry) => entry.hasSnapshot)
    .map((entry) => {
      const entryMetrics = buildF1BaselineMetrics(entry.setup);
      const reasons: string[] = [];
      let score = 0;

      if (args.draft.selectedRecipeId && entry.selectedRecipeId === args.draft.selectedRecipeId) {
        score += 3;
        reasons.push("Same saved recipe");
      }

      if (entry.setup.teaType === args.draft.setup.teaType) {
        score += 2;
        reasons.push("Same tea type");
      } else if (entryMetrics.teaFamily === draftMetrics.teaFamily) {
        score += 1;
        reasons.push("Same tea family");
      }

      if (entry.setup.teaSourceForm === args.draft.setup.teaSourceForm) {
        score += 0.5;
        reasons.push("Same tea source form");
      }

      if (
        entryMetrics.teaGramsPerLiter !== null &&
        draftMetrics.teaGramsPerLiter !== null
      ) {
        const delta = Math.abs(entryMetrics.teaGramsPerLiter - draftMetrics.teaGramsPerLiter);

        if (delta <= 0.5) {
          score += 1;
          reasons.push("Very similar tea strength");
        } else if (delta <= 1) {
          score += 0.5;
          reasons.push("Similar tea strength");
        }
      }

      if (entry.setup.sugarType === args.draft.setup.sugarType) {
        score += 1;
        reasons.push("Same sugar type");
      } else if (getSugarFamily(entry.setup.sugarType) === draftMetrics.sugarFamily) {
        score += 0.5;
        reasons.push("Same sugar family");
      }

      if (entryMetrics.sugarPerLiter !== null && draftMetrics.sugarPerLiter !== null) {
        const delta = Math.abs(entryMetrics.sugarPerLiter - draftMetrics.sugarPerLiter);

        if (delta <= 5) {
          score += 1;
          reasons.push("Very similar sugar per liter");
        } else if (delta <= 10) {
          score += 0.5;
          reasons.push("Similar sugar per liter");
        }
      }

      if (entryMetrics.starterRatio !== null && draftMetrics.starterRatio !== null) {
        const delta = Math.abs(entryMetrics.starterRatio - draftMetrics.starterRatio);

        if (delta <= 0.02) {
          score += 1;
          reasons.push("Very similar starter ratio");
        } else if (delta <= 0.04) {
          score += 0.5;
          reasons.push("Similar starter ratio");
        }
      }

      if (entry.setup.targetPreference === args.draft.setup.targetPreference) {
        score += 0.75;
        reasons.push("Same taste target");
      }

      if (
        entry.selectedVessel?.materialType &&
        args.draft.selectedVessel?.materialType &&
        entry.selectedVessel.materialType === args.draft.selectedVessel.materialType
      ) {
        score += 0.5;
        reasons.push("Same vessel material");
      }

      if (
        getTemperatureBand(entry.setup.avgRoomTempC) ===
        getTemperatureBand(args.draft.setup.avgRoomTempC)
      ) {
        score += 0.5;
        reasons.push("Same temperature band");
      }

      if (
        entry.starterSourceBatchId &&
        entry.starterSourceBatchId === args.draft.starterSourceBatchId
      ) {
        score += 1;
        reasons.push("Same starter lineage source");
      }

      if (
        entry.brewAgainSourceBatchId &&
        entry.brewAgainSourceBatchId === args.draft.brewAgainSourceBatchId
      ) {
        score += 1;
        reasons.push("Same brew-again parent");
      }

      const tier = getTier(score);

      return {
        batchId: entry.batchId,
        batchName: entry.batchName,
        tier,
        score,
        reasons,
        historyEntry: entry,
      } satisfies F1SimilarityMatch;
    })
    .filter((match) => match.tier !== "weak_match" || match.score >= 2.5)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function findPrimaryTransitionReference(args: {
  draft: F1RecommendationDraftContext;
  history: F1RecommendationHistoryEntry[];
}) {
  if (args.draft.starterSourceBatchId) {
    const starterSource = args.history.find(
      (entry) => entry.batchId === args.draft.starterSourceBatchId
    );

    if (starterSource) {
      return {
        batchId: starterSource.batchId,
        label: `Your selected starter source (${starterSource.batchName})`,
        teaType: starterSource.setup.teaType,
        sugarType: starterSource.setup.sugarType,
      };
    }
  }

  if (args.draft.brewAgainSourceBatchId) {
    const brewAgainSource = args.history.find(
      (entry) => entry.batchId === args.draft.brewAgainSourceBatchId
    );

    if (brewAgainSource) {
      return {
        batchId: brewAgainSource.batchId,
        label: `Your brew-again source (${brewAgainSource.batchName})`,
        teaType: brewAgainSource.setup.teaType,
        sugarType: brewAgainSource.setup.sugarType,
      };
    }
  }

  return null;
}
