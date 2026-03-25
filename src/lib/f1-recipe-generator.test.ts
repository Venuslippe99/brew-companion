import { generateF1RecipeRecommendation } from "@/lib/f1-recipe-generator";
import type {
  F1RecommendationHistoryEntry,
  F1RecommendationHistoryOutcome,
} from "@/lib/f1-recommendation-types";
import type { F1BatchSetupFields } from "@/lib/f1-recipe-types";
import type { F1SimilarityMatch, F1SimilarityTier } from "@/lib/f1-similarity";

const BASE_SETUP: F1BatchSetupFields = {
  totalVolumeMl: 3800,
  teaType: "Black tea",
  teaSourceForm: "loose_leaf",
  teaAmountValue: 30,
  teaAmountUnit: "g",
  sugarG: 285,
  sugarType: "White sugar",
  starterLiquidMl: 380,
  scobyPresent: true,
  avgRoomTempC: 23,
  vesselType: "Glass jar",
  targetPreference: "balanced",
  initialNotes: "",
};

function buildOutcome(
  overrides?: Partial<F1RecommendationHistoryOutcome>
): F1RecommendationHistoryOutcome {
  return {
    tasteState: "balanced",
    readiness: "yes",
    selectedTags: [],
    nextTimeChange: null,
    ...overrides,
  };
}

function buildHistoryEntry(
  overrides?: Partial<F1RecommendationHistoryEntry>
): F1RecommendationHistoryEntry {
  return {
    batchId: "batch-1",
    batchName: "Batch 1",
    brewStartedAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-01T12:00:00.000Z",
    selectedRecipeId: null,
    setup: BASE_SETUP,
    selectedVessel: null,
    fitState: null,
    starterSourceBatchId: null,
    brewAgainSourceBatchId: null,
    hasSnapshot: true,
    outcome: buildOutcome(),
    ...overrides,
  };
}

function buildMatch(args: {
  batchId: string;
  tier: F1SimilarityTier;
  outcome?: Partial<F1RecommendationHistoryOutcome>;
}): F1SimilarityMatch {
  const historyEntry = buildHistoryEntry({
    batchId: args.batchId,
    batchName: `Batch ${args.batchId}`,
    outcome: buildOutcome(args.outcome),
  });

  return {
    batchId: historyEntry.batchId,
    batchName: historyEntry.batchName,
    tier: args.tier,
    score: args.tier === "very_close" ? 8 : 6,
    reasons: ["Test match"],
    historyEntry,
  };
}

describe("generateF1RecipeRecommendation", () => {
  it("builds a deterministic 3.8 L balanced white sugar recommendation", () => {
    const input = {
      totalVolumeMl: 3800,
      teaType: "Black tea" as const,
      sugarType: "White sugar" as const,
      targetPreference: "balanced" as const,
      starterSourceBatchId: null,
      brewAgainSourceBatchId: null,
    };

    const first = generateF1RecipeRecommendation(input);
    const second = generateF1RecipeRecommendation(input);

    expect(first).toEqual(second);
    expect(first.finalBatchVolumeMl).toBe(3800);
    expect(first.starterIncludedInTotal).toBe(true);
    expect(first.freshTeaVolumeMl).toBe(3340);
    expect(first.recommendedTeaGPL).toBe(6);
    expect(first.recommendedTeaG).toBe(23);
    expect(first.recommendedTeaBagsApprox).toBe(12);
    expect(first.effectiveSugarTargetGPL).toBe(75);
    expect(first.effectiveSugarTargetG).toBe(285);
    expect(first.sugarEquivalentFactorUsed).toBe(1);
    expect(first.recommendedSugarG).toBe(285);
    expect(first.reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Tea is being calculated from a 6 g/L true-tea baseline"),
        expect.stringContaining(
          "Balanced starts from 75 g/L sucrose-equivalent before sugar-type conversion."
        ),
        expect.stringContaining("this recipe brews about 3340 ml fresh sweet tea"),
      ])
    );
  });

  it("uses a lighter default for white tea than black tea", () => {
    const result = generateF1RecipeRecommendation({
      totalVolumeMl: 3800,
      teaType: "White tea",
      sugarType: "White sugar",
      targetPreference: "balanced",
      starterSourceBatchId: null,
      brewAgainSourceBatchId: null,
    });

    expect(result.recommendedTeaGPL).toBe(4);
    expect(result.recommendedTeaG).toBe(15);
    expect(result.recommendedTeaBagsApprox).toBe(8);
  });

  it("uses honey conversion for a 3.8 L balanced honey batch", () => {
    const result = generateF1RecipeRecommendation({
      totalVolumeMl: 3800,
      teaType: "Black tea",
      sugarType: "Honey",
      targetPreference: "balanced",
      starterSourceBatchId: null,
      brewAgainSourceBatchId: null,
    });

    expect(result.effectiveSugarTargetG).toBe(285);
    expect(result.sugarEquivalentFactorUsed).toBe(1.22);
    expect(result.recommendedSugarG).toBe(348);
    expect(result.sugarConfidence).toBe("moderate");
    expect(result.starterRatioUsed).toBe(0.12);
    expect(result.recommendedStarterMl).toBe(460);
    expect(result.freshTeaVolumeMl).toBe(3340);
    expect(result.cautionFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "honey_conversion" }),
      ])
    );
  });

  it("uses 12 percent starter when lineage is unknown", () => {
    const result = generateF1RecipeRecommendation({
      totalVolumeMl: 3800,
      teaType: "Black tea",
      sugarType: "White sugar",
      targetPreference: "balanced",
      starterSourceBatchId: null,
      brewAgainSourceBatchId: null,
    });

    expect(result.lineageStatus).toBe("unknown");
    expect(result.starterRatioUsed).toBe(0.12);
    expect(result.recommendedStarterMl).toBe(460);
    expect(result.starterConfidence).toBe("moderate");
    expect(result.cautionFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unknown_lineage" }),
      ])
    );
  });

  it("keeps a known starter line with history at 10 percent starter", () => {
    const result = generateF1RecipeRecommendation({
      totalVolumeMl: 3800,
      teaType: "Black tea",
      sugarType: "White sugar",
      targetPreference: "balanced",
      starterSourceBatchId: "starter-1",
      brewAgainSourceBatchId: null,
      historyEntries: [
        buildHistoryEntry({
          batchId: "starter-1",
          batchName: "Starter Batch",
        }),
      ],
    });

    expect(result.lineageStatus).toBe("known_with_history");
    expect(result.starterRatioUsed).toBe(0.1);
    expect(result.recommendedStarterMl).toBe(380);
    expect(result.starterConfidence).toBe("high");
    expect(result.freshTeaVolumeMl).toBe(3420);
  });

  it("increases tea by 1 g/L when weak tea base repeats in close history", () => {
    const result = generateF1RecipeRecommendation({
      totalVolumeMl: 3800,
      teaType: "Black tea",
      sugarType: "White sugar",
      targetPreference: "balanced",
      starterSourceBatchId: "starter-1",
      brewAgainSourceBatchId: null,
      historyEntries: [buildHistoryEntry({ batchId: "starter-1" })],
      similarityMatches: [
        buildMatch({
          batchId: "weak-1",
          tier: "close",
          outcome: { selectedTags: ["weak_tea_base"] },
        }),
        buildMatch({
          batchId: "weak-2",
          tier: "very_close",
          outcome: { selectedTags: ["weak_tea_base"] },
        }),
      ],
    });

    expect(result.recommendedTeaGPL).toBe(7);
    expect(result.recommendedTeaG).toBe(27);
    expect(result.historyAdjustments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "tea_adjustment",
          direction: "increase",
          deltaTeaGPL: 1,
          evidenceCount: 2,
        }),
      ])
    );
  });

  it("decreases tea by 1 g/L when strong tea base repeats in close history", () => {
    const result = generateF1RecipeRecommendation({
      totalVolumeMl: 3800,
      teaType: "Black tea",
      sugarType: "White sugar",
      targetPreference: "balanced",
      starterSourceBatchId: "starter-1",
      brewAgainSourceBatchId: null,
      historyEntries: [buildHistoryEntry({ batchId: "starter-1" })],
      similarityMatches: [
        buildMatch({
          batchId: "strong-1",
          tier: "close",
          outcome: { selectedTags: ["strong_tea_base"] },
        }),
        buildMatch({
          batchId: "strong-2",
          tier: "very_close",
          outcome: { selectedTags: ["strong_tea_base"] },
        }),
      ],
    });

    expect(result.recommendedTeaGPL).toBe(5);
    expect(result.recommendedTeaG).toBe(19);
    expect(result.historyAdjustments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "tea_adjustment",
          direction: "decrease",
          deltaTeaGPL: 1,
          evidenceCount: 2,
        }),
      ])
    );
  });

  it("returns null sugar grams and low confidence for Other sugar", () => {
    const result = generateF1RecipeRecommendation({
      totalVolumeMl: 3800,
      teaType: "Black tea",
      sugarType: "Other",
      targetPreference: "balanced",
      starterSourceBatchId: null,
      brewAgainSourceBatchId: null,
    });

    expect(result.effectiveSugarTargetG).toBe(285);
    expect(result.sugarEquivalentFactorUsed).toBeNull();
    expect(result.recommendedSugarG).toBeNull();
    expect(result.sugarConfidence).toBe("low");
    expect(result.overallConfidence).toBe("low");
    expect(result.cautionFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "other_sugar_conversion_unavailable" }),
      ])
    );
  });

  it("adds timing notes for repeated sweet outcomes without changing sugar grams", () => {
    const result = generateF1RecipeRecommendation({
      totalVolumeMl: 3800,
      teaType: "Black tea",
      sugarType: "White sugar",
      targetPreference: "balanced",
      starterSourceBatchId: "starter-1",
      brewAgainSourceBatchId: null,
      historyEntries: [buildHistoryEntry({ batchId: "starter-1" })],
      similarityMatches: [
        buildMatch({
          batchId: "sweet-1",
          tier: "close",
          outcome: { tasteState: "too_sweet" },
        }),
        buildMatch({
          batchId: "sweet-2",
          tier: "very_close",
          outcome: { readiness: "no" },
        }),
      ],
    });

    expect(result.recommendedSugarG).toBe(285);
    expect(result.historyAdjustments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "timing_note",
          direction: "later",
          evidenceCount: 2,
        }),
      ])
    );
  });
});
