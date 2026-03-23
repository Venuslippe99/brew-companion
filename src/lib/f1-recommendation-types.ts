import type { F1BatchSetupFields } from "@/lib/f1-recipe-types";
import type { SelectedF1Vessel } from "@/lib/f1-vessel-types";
import type { Json } from "@/integrations/supabase/types";

export const F1_RECOMMENDATION_ENGINE_VERSION = "phase3-v1";

export const F1_RECOMMENDATION_CATEGORIES = [
  "starter_recommendation",
  "sugar_recommendation",
  "tea_amount_recommendation",
  "tea_base_recommendation",
  "culture_transition_warning",
  "sweetener_transition_warning",
  "combined_transition_warning",
  "vessel_recommendation",
  "timing_expectation",
  "next_time_lesson",
  "lineage_note",
  "fit_note",
  "similar_setup_note",
] as const;

export const F1_RECOMMENDATION_SOURCE_TYPES = [
  "baseline",
  "transition",
  "similar_setups",
  "lineage",
  "outcomes",
  "mixed",
] as const;

export const F1_RECOMMENDATION_CONFIDENCE_LEVELS = [
  "high",
  "moderate",
  "low",
] as const;

export const F1_RECOMMENDATION_TYPES = [
  "affirm",
  "adjust",
  "caution",
  "timing",
  "note",
] as const;

export const F1_RECOMMENDATION_CAUTION_LEVELS = [
  "none",
  "low",
  "moderate",
  "high",
] as const;

export type F1RecommendationCategory =
  (typeof F1_RECOMMENDATION_CATEGORIES)[number];

export type F1RecommendationSourceType =
  (typeof F1_RECOMMENDATION_SOURCE_TYPES)[number];

export type F1RecommendationConfidence =
  (typeof F1_RECOMMENDATION_CONFIDENCE_LEVELS)[number];

export type F1RecommendationType =
  (typeof F1_RECOMMENDATION_TYPES)[number];

export type F1RecommendationCautionLevel =
  (typeof F1_RECOMMENDATION_CAUTION_LEVELS)[number];

export type F1RecommendationApplyAction = {
  field:
    | "starterLiquidMl"
    | "sugarG"
    | "teaAmountValue"
    | "teaType"
    | "sugarType";
  value: string | number;
  label: string;
};

export type F1RecommendationEvidence = {
  count: number;
  relatedBatchIds?: string[];
};

export type F1RecommendationCard = {
  id: string;
  category: F1RecommendationCategory;
  priority: number;
  title: string;
  summary: string;
  explanation: string;
  sourceType: F1RecommendationSourceType;
  confidence: F1RecommendationConfidence;
  evidenceCount: number;
  recommendationType: F1RecommendationType;
  cautionLevel: F1RecommendationCautionLevel;
  applyAction?: F1RecommendationApplyAction;
  appliedValueSnapshot?: string | number | null;
};

export type F1RecommendationSnapshot = {
  engineVersion: string;
  cards: F1RecommendationCard[];
  appliedAdjustments: Array<{
    recommendationId: string;
    field: F1RecommendationApplyAction["field"];
    value: string | number;
  }>;
  inputsSummary: {
    sourceBatchId?: string | null;
    brewAgainSourceBatchId?: string | null;
    similarBatchCount: number;
    outcomeCount: number;
  };
};

export type F1RecommendationHistoryOutcome = {
  tasteState: string | null;
  readiness: string | null;
  selectedTags: string[];
  nextTimeChange: string | null;
};

export type F1RecommendationHistoryEntry = {
  batchId: string;
  batchName: string;
  brewStartedAt: string | null;
  updatedAt: string;
  selectedRecipeId: string | null;
  setup: F1BatchSetupFields;
  selectedVessel: SelectedF1Vessel | null;
  fitState: string | null;
  starterSourceBatchId: string | null;
  brewAgainSourceBatchId: string | null;
  hasSnapshot: boolean;
  outcome: F1RecommendationHistoryOutcome | null;
};

export type F1RecommendationDraftContext = {
  brewDate: string;
  setup: F1BatchSetupFields;
  selectedRecipeId: string | null;
  selectedVessel: SelectedF1Vessel | null;
  starterSourceBatchId: string | null;
  brewAgainSourceBatchId: string | null;
};

export function buildRecommendationSnapshotJson(
  snapshot: F1RecommendationSnapshot | null | undefined
): Json {
  if (!snapshot) {
    return {} satisfies Json;
  }

  return snapshot as unknown as Json;
}

export function buildAcceptedRecommendationIdsJson(ids: string[]): Json {
  return ids as unknown as Json;
}
