import type { F1RecommendationConfidence, F1RecommendationHistoryEntry } from "@/lib/f1-recommendation-types";
import type { F1SugarType, F1TargetPreference, F1TeaType } from "@/lib/f1-recipe-types";
import type { F1SimilarityMatch } from "@/lib/f1-similarity";

export type F1GeneratorLineageStatus =
  | "known_with_history"
  | "known_no_history"
  | "brew_again_parent"
  | "unknown";

export type F1GeneratorHistoryAdjustment =
  | {
      kind: "tea_adjustment";
      direction: "increase" | "decrease";
      deltaTeaGPL: number;
      evidenceCount: number;
      note: string;
    }
  | {
      kind: "timing_note";
      direction: "later" | "earlier";
      evidenceCount: number;
      note: string;
    };

export type F1GeneratorCautionFlagCode =
  | "unknown_lineage"
  | "honey_conversion"
  | "other_sugar_conversion_unavailable"
  | "mixed_tea_history";

export type F1GeneratorCautionFlag = {
  code: F1GeneratorCautionFlagCode;
  severity: "low" | "moderate";
  message: string;
};

export type F1RecipeGeneratorInput = {
  totalVolumeMl: number;
  teaType: F1TeaType;
  sugarType: F1SugarType;
  targetPreference: F1TargetPreference;
  starterSourceBatchId: string | null;
  brewAgainSourceBatchId: string | null;
  historyEntries?: F1RecommendationHistoryEntry[];
  similarityMatches?: F1SimilarityMatch[];
};

export type F1RecipeGeneratorResult = {
  recommendedTeaGPL: number;
  recommendedTeaG: number;
  recommendedTeaBagsApprox: number;
  effectiveSugarTargetGPL: number;
  effectiveSugarTargetG: number;
  sugarEquivalentFactorUsed: number | null;
  recommendedSugarG: number | null;
  starterRatioUsed: number;
  recommendedStarterMl: number;
  teaConfidence: F1RecommendationConfidence;
  sugarConfidence: F1RecommendationConfidence;
  starterConfidence: F1RecommendationConfidence;
  overallConfidence: F1RecommendationConfidence;
  lineageStatus: F1GeneratorLineageStatus;
  historyAdjustments: F1GeneratorHistoryAdjustment[];
  cautionFlags: F1GeneratorCautionFlag[];
  reasons: string[];
};
