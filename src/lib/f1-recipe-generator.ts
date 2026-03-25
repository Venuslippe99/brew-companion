import {
  type F1GeneratorCautionFlag,
  type F1GeneratorHistoryAdjustment,
  type F1GeneratorLineageStatus,
  type F1RecipeGeneratorInput,
  type F1RecipeGeneratorResult,
} from "@/lib/f1-generator-types";
import { getF1SugarTypeConfig } from "@/lib/f1-sugar-profiles";
import { getF1SweetnessTargetConfig } from "@/lib/f1-sweetness-targets";
import { getF1TeaTypeConfig } from "@/lib/f1-tea-profiles";
import type { F1RecommendationConfidence, F1RecommendationHistoryEntry } from "@/lib/f1-recommendation-types";
import type { F1SimilarityMatch, F1SimilarityTier } from "@/lib/f1-similarity";

const STANDARD_STARTER_RATIO = 0.1;
const CONSERVATIVE_STARTER_RATIO = 0.12;
const APPROXIMATE_TEA_BAG_GRAMS = 2;
const CLOSE_MATCH_TIERS = new Set<F1SimilarityTier>(["very_close", "close"]);

function roundToNearestTen(value: number) {
  return Math.round(value / 10) * 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatLiters(totalVolumeMl: number) {
  return Number((Math.max(totalVolumeMl, 0) / 1000).toFixed(2)).toString();
}

function getConfidenceRank(confidence: F1RecommendationConfidence) {
  if (confidence === "low") {
    return 0;
  }

  if (confidence === "moderate") {
    return 1;
  }

  return 2;
}

function getLowestConfidence(
  ...levels: F1RecommendationConfidence[]
): F1RecommendationConfidence {
  return [...levels].sort((left, right) => getConfidenceRank(left) - getConfidenceRank(right))[0];
}

function getCloseHistoryEntries(
  matches: F1SimilarityMatch[] | undefined
): F1RecommendationHistoryEntry[] {
  return (matches || [])
    .filter((match) => CLOSE_MATCH_TIERS.has(match.tier))
    .map((match) => match.historyEntry)
    .filter((entry) => !!entry.outcome);
}

function countOutcomes(
  entries: F1RecommendationHistoryEntry[],
  predicate: NonNullable<F1RecommendationHistoryEntry["outcome"]> extends infer T
    ? T extends null
      ? never
      : (outcome: T) => boolean
    : never
) {
  return entries.reduce((count, entry) => {
    if (!entry.outcome) {
      return count;
    }

    return predicate(entry.outcome) ? count + 1 : count;
  }, 0);
}

function hasStarterLineHistory(args: {
  starterSourceBatchId: string;
  historyEntries: F1RecommendationHistoryEntry[];
  similarityMatches: F1SimilarityMatch[];
}) {
  return (
    args.historyEntries.some(
      (entry) =>
        entry.batchId === args.starterSourceBatchId ||
        entry.starterSourceBatchId === args.starterSourceBatchId
    ) ||
    args.similarityMatches.some(
      (match) =>
        match.historyEntry.batchId === args.starterSourceBatchId ||
        match.historyEntry.starterSourceBatchId === args.starterSourceBatchId
    )
  );
}

function getLineageStatus(args: {
  starterSourceBatchId: string | null;
  brewAgainSourceBatchId: string | null;
  historyEntries: F1RecommendationHistoryEntry[];
  similarityMatches: F1SimilarityMatch[];
}): F1GeneratorLineageStatus {
  if (args.starterSourceBatchId) {
    return hasStarterLineHistory({
      starterSourceBatchId: args.starterSourceBatchId,
      historyEntries: args.historyEntries,
      similarityMatches: args.similarityMatches,
    })
      ? "known_with_history"
      : "known_no_history";
  }

  if (args.brewAgainSourceBatchId) {
    return "brew_again_parent";
  }

  return "unknown";
}

function getStarterConfidence(args: {
  lineageStatus: F1GeneratorLineageStatus;
  sugarType: F1RecipeGeneratorInput["sugarType"];
}): F1RecommendationConfidence {
  if (args.lineageStatus === "known_with_history") {
    return "high";
  }

  if (
    args.lineageStatus === "known_no_history" ||
    args.lineageStatus === "brew_again_parent"
  ) {
    return "moderate";
  }

  if (args.sugarType === "Honey" || args.sugarType === "Other") {
    return "low";
  }

  return "moderate";
}

function buildStarterReason(args: {
  lineageStatus: F1GeneratorLineageStatus;
  sugarType: F1RecipeGeneratorInput["sugarType"];
  starterRatioUsed: number;
}) {
  if (args.starterRatioUsed === CONSERVATIVE_STARTER_RATIO) {
    if (args.lineageStatus === "unknown" && (args.sugarType === "Honey" || args.sugarType === "Other")) {
      return "Starter is being kept slightly higher because this culture line is unknown and this sugar choice is less predictable than the standard refined-sugar baseline.";
    }

    if (args.lineageStatus === "unknown") {
      return "Starter is being kept slightly higher because this culture line is unknown.";
    }

    return `Starter is being kept slightly higher because ${args.sugarType} is less predictable than the standard refined-sugar baseline.`;
  }

  if (args.lineageStatus === "known_with_history") {
    return "Starter stays at the standard 10% because this batch comes from a known starter line with saved history.";
  }

  if (args.lineageStatus === "known_no_history") {
    return "Starter stays at the standard 10% because this batch still has a known starter source, even without much saved history yet.";
  }

  if (args.lineageStatus === "brew_again_parent") {
    return "Starter stays at the standard 10% because this batch is being repeated from a known parent batch.";
  }

  return "Starter stays at the standard 10% because this recipe is using the usual refined-sugar baseline.";
}

function buildTimingAdjustment(args: {
  evidenceCount: number;
  direction: "later" | "earlier";
}): F1GeneratorHistoryAdjustment {
  return args.direction === "later"
    ? {
        kind: "timing_note",
        direction: "later",
        evidenceCount: args.evidenceCount,
        note: "Several close past batches finished sweet or not quite ready, so it makes more sense to taste later before raising sugar.",
      }
    : {
        kind: "timing_note",
        direction: "earlier",
        evidenceCount: args.evidenceCount,
        note: "Several close past batches leaned sour or a little late, so it makes more sense to taste earlier before lowering sugar.",
      };
}

export function generateF1RecipeRecommendation(
  input: F1RecipeGeneratorInput
): F1RecipeGeneratorResult {
  const teaConfig = getF1TeaTypeConfig(input.teaType);
  const sugarConfig = getF1SugarTypeConfig(input.sugarType);
  const sweetnessTarget = getF1SweetnessTargetConfig(input.targetPreference);
  const historyEntries = input.historyEntries || [];
  const similarityMatches = input.similarityMatches || [];
  const closeHistoryEntries = getCloseHistoryEntries(similarityMatches);
  const lineageStatus = getLineageStatus({
    starterSourceBatchId: input.starterSourceBatchId,
    brewAgainSourceBatchId: input.brewAgainSourceBatchId,
    historyEntries,
    similarityMatches,
  });

  const weakTeaCount = countOutcomes(
    closeHistoryEntries,
    (outcome) => outcome.selectedTags.includes("weak_tea_base")
  );
  const strongTeaCount = countOutcomes(
    closeHistoryEntries,
    (outcome) => outcome.selectedTags.includes("strong_tea_base")
  );
  const tooSweetCount = countOutcomes(
    closeHistoryEntries,
    (outcome) => outcome.tasteState === "too_sweet" || outcome.readiness === "no"
  );
  const tooSourCount = countOutcomes(
    closeHistoryEntries,
    (outcome) => outcome.tasteState === "too_sour" || outcome.readiness === "maybe_late"
  );

  let recommendedTeaGPL = teaConfig.defaultGramsPerLiter;
  const historyAdjustments: F1GeneratorHistoryAdjustment[] = [];
  const cautionFlags: F1GeneratorCautionFlag[] = [];
  const reasons: string[] = [
    `Tea is being calculated from an ${teaConfig.defaultGramsPerLiter} g/L true-tea baseline.`,
    `${input.targetPreference[0].toUpperCase()}${input.targetPreference.slice(1)} starts from ${sweetnessTarget.sugarEquivalentGramsPerLiter} g/L sucrose-equivalent before sugar-type conversion.`,
  ];

  if (weakTeaCount >= 2 && strongTeaCount < 2) {
    recommendedTeaGPL = clamp(
      recommendedTeaGPL + 1,
      teaConfig.minGramsPerLiter,
      teaConfig.maxGramsPerLiter
    );
    historyAdjustments.push({
      kind: "tea_adjustment",
      direction: "increase",
      deltaTeaGPL: 1,
      evidenceCount: weakTeaCount,
      note: "Close past batches often felt a little light on tea, so tea is nudged up by 1 g/L.",
    });
    reasons.push(
      `Tea is being nudged to ${recommendedTeaGPL} g/L because ${weakTeaCount} close past batches were tagged as having a weak tea base.`
    );
  } else if (strongTeaCount >= 2 && weakTeaCount < 2) {
    recommendedTeaGPL = clamp(
      recommendedTeaGPL - 1,
      teaConfig.minGramsPerLiter,
      teaConfig.maxGramsPerLiter
    );
    historyAdjustments.push({
      kind: "tea_adjustment",
      direction: "decrease",
      deltaTeaGPL: 1,
      evidenceCount: strongTeaCount,
      note: "Close past batches often felt strong on tea, so tea is softened by 1 g/L.",
    });
    reasons.push(
      `Tea is being softened to ${recommendedTeaGPL} g/L because ${strongTeaCount} close past batches were tagged as having a strong tea base.`
    );
  } else if (weakTeaCount >= 2 && strongTeaCount >= 2) {
    cautionFlags.push({
      code: "mixed_tea_history",
      severity: "low",
      message:
        "Past close batches pull tea in both directions, so the tea baseline is being left unchanged for now.",
    });
    reasons.push(
      "Past close batches pull tea in both directions, so the tea baseline is being left unchanged for now."
    );
  }

  if (tooSweetCount >= 2) {
    const adjustment = buildTimingAdjustment({
      evidenceCount: tooSweetCount,
      direction: "later",
    });
    historyAdjustments.push(adjustment);
    reasons.push(adjustment.note);
  }

  if (tooSourCount >= 2) {
    const adjustment = buildTimingAdjustment({
      evidenceCount: tooSourCount,
      direction: "earlier",
    });
    historyAdjustments.push(adjustment);
    reasons.push(adjustment.note);
  }

  const totalVolumeLiters = Math.max(input.totalVolumeMl, 0) / 1000;
  const recommendedTeaG = Math.round(recommendedTeaGPL * totalVolumeLiters);
  const recommendedTeaBagsApprox = Math.round(recommendedTeaG / APPROXIMATE_TEA_BAG_GRAMS);
  const effectiveSugarTargetGPL = sweetnessTarget.sugarEquivalentGramsPerLiter;
  const effectiveSugarTargetG = Math.round(effectiveSugarTargetGPL * totalVolumeLiters);
  const sugarEquivalentFactorUsed = sugarConfig.sugarEquivalentFactor;
  const recommendedSugarG =
    sugarEquivalentFactorUsed === null
      ? null
      : Math.round(effectiveSugarTargetG * sugarEquivalentFactorUsed);
  const starterRatioUsed =
    input.sugarType === "Honey" ||
    input.sugarType === "Other" ||
    lineageStatus === "unknown"
      ? CONSERVATIVE_STARTER_RATIO
      : STANDARD_STARTER_RATIO;
  const recommendedStarterMl = roundToNearestTen(input.totalVolumeMl * starterRatioUsed);
  const starterConfidence = getStarterConfidence({
    lineageStatus,
    sugarType: input.sugarType,
  });

  reasons.push(
    `That works out to ${recommendedTeaG} g of tea for ${formatLiters(input.totalVolumeMl)} L, or about ${recommendedTeaBagsApprox} tea bags at roughly 2 g each.`
  );

  if (sugarEquivalentFactorUsed === null) {
    cautionFlags.push({
      code: "other_sugar_conversion_unavailable",
      severity: "moderate",
      message:
        "This sweetness target can be estimated, but 'Other' does not have a reliable conversion factor yet, so no exact sugar grams are being suggested.",
    });
    reasons.push(
      `The sweetness target still works out to about ${effectiveSugarTargetG} g sucrose-equivalent for ${formatLiters(input.totalVolumeMl)} L, but 'Other' does not have a reliable conversion factor yet, so no exact sugar grams are being suggested.`
    );
  } else if (input.sugarType === "Honey") {
    cautionFlags.push({
      code: "honey_conversion",
      severity: "moderate",
      message:
        "Honey is being converted with an approximate sucrose-equivalent factor, so the sugar grams should be treated as a starting point.",
    });
    reasons.push(
      `Honey is being converted with a ${sugarEquivalentFactorUsed} sucrose-equivalent factor, which gives an approximate starting point of ${recommendedSugarG} g.`
    );
  } else {
    reasons.push(
      `${input.sugarType} uses a ${sugarEquivalentFactorUsed.toFixed(1)} conversion factor, so the sugar recommendation stays aligned with the sucrose-equivalent target at about ${recommendedSugarG} g.`
    );
  }

  if (lineageStatus === "unknown") {
    cautionFlags.push({
      code: "unknown_lineage",
      severity: "moderate",
      message:
        "The culture line is unknown here, so the starter recommendation is being kept a little more conservative.",
    });
  }

  reasons.push(
    `${buildStarterReason({
      lineageStatus,
      sugarType: input.sugarType,
      starterRatioUsed,
    })} That comes to about ${recommendedStarterMl} ml starter.`
  );

  const teaConfidence = teaConfig.confidence;
  const sugarConfidence = sugarConfig.confidence;
  const overallConfidence =
    input.sugarType === "Other"
      ? "low"
      : getLowestConfidence(teaConfidence, sugarConfidence, starterConfidence);

  return {
    recommendedTeaGPL,
    recommendedTeaG,
    recommendedTeaBagsApprox,
    effectiveSugarTargetGPL,
    effectiveSugarTargetG,
    sugarEquivalentFactorUsed,
    recommendedSugarG,
    starterRatioUsed,
    recommendedStarterMl,
    teaConfidence,
    sugarConfidence,
    starterConfidence,
    overallConfidence,
    lineageStatus,
    historyAdjustments,
    cautionFlags,
    reasons,
  };
}
