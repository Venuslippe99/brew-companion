import type { F1TeaFamily } from "@/lib/f1-baseline-rules";
import type { F1TeaType } from "@/lib/f1-recipe-types";
import type { F1RecommendationConfidence } from "@/lib/f1-recommendation-types";

export type F1TeaTypeConfig = {
  teaType: F1TeaType;
  family: Extract<
    F1TeaFamily,
    "black" | "black_green_blend" | "oolong" | "green" | "green_white_blend" | "white"
  >;
  defaultGramsPerLiter: number;
  minGramsPerLiter: number;
  maxGramsPerLiter: number;
  confidence: F1RecommendationConfidence;
  uiStrengthRank: number;
};

export const F1_TEA_TYPE_CONFIGS: Record<F1TeaType, F1TeaTypeConfig> = {
  "Black tea": {
    teaType: "Black tea",
    family: "black",
    defaultGramsPerLiter: 8,
    minGramsPerLiter: 5,
    maxGramsPerLiter: 12,
    confidence: "high",
    uiStrengthRank: 6,
  },
  "Black & green blend": {
    teaType: "Black & green blend",
    family: "black_green_blend",
    defaultGramsPerLiter: 8,
    minGramsPerLiter: 5,
    maxGramsPerLiter: 12,
    confidence: "high",
    uiStrengthRank: 5,
  },
  "Oolong tea": {
    teaType: "Oolong tea",
    family: "oolong",
    defaultGramsPerLiter: 8,
    minGramsPerLiter: 5,
    maxGramsPerLiter: 12,
    confidence: "moderate",
    uiStrengthRank: 4,
  },
  "Green tea": {
    teaType: "Green tea",
    family: "green",
    defaultGramsPerLiter: 8,
    minGramsPerLiter: 5,
    maxGramsPerLiter: 12,
    confidence: "high",
    uiStrengthRank: 3,
  },
  "Green & white blend": {
    teaType: "Green & white blend",
    family: "green_white_blend",
    defaultGramsPerLiter: 8,
    minGramsPerLiter: 5,
    maxGramsPerLiter: 12,
    confidence: "moderate",
    uiStrengthRank: 2,
  },
  "White tea": {
    teaType: "White tea",
    family: "white",
    defaultGramsPerLiter: 8,
    minGramsPerLiter: 5,
    maxGramsPerLiter: 12,
    confidence: "high",
    uiStrengthRank: 1,
  },
};

export function getF1TeaTypeConfig(teaType: F1TeaType): F1TeaTypeConfig {
  return F1_TEA_TYPE_CONFIGS[teaType];
}
