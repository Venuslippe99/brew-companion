import type { F1SugarFamily } from "@/lib/f1-baseline-rules";
import type { F1SugarType } from "@/lib/f1-recipe-types";
import type { F1RecommendationConfidence } from "@/lib/f1-recommendation-types";

export type F1SugarTypeConfig = {
  sugarType: F1SugarType;
  family: F1SugarFamily;
  sugarEquivalentFactor: number | null;
  sugarEquivalentFactorRange: { min: number; max: number } | null;
  confidence: F1RecommendationConfidence;
};

export const F1_SUGAR_TYPE_CONFIGS: Record<F1SugarType, F1SugarTypeConfig> = {
  "White sugar": {
    sugarType: "White sugar",
    family: "refined",
    sugarEquivalentFactor: 1,
    sugarEquivalentFactorRange: null,
    confidence: "high",
  },
  "Cane sugar": {
    sugarType: "Cane sugar",
    family: "refined",
    sugarEquivalentFactor: 1,
    sugarEquivalentFactorRange: null,
    confidence: "high",
  },
  "Organic cane sugar": {
    sugarType: "Organic cane sugar",
    family: "refined",
    sugarEquivalentFactor: 1,
    sugarEquivalentFactorRange: null,
    confidence: "moderate",
  },
  "Raw sugar": {
    sugarType: "Raw sugar",
    family: "whole_cane",
    sugarEquivalentFactor: 1,
    sugarEquivalentFactorRange: null,
    confidence: "moderate",
  },
  "Brown sugar": {
    sugarType: "Brown sugar",
    family: "whole_cane",
    sugarEquivalentFactor: 1,
    sugarEquivalentFactorRange: null,
    confidence: "moderate",
  },
  Honey: {
    sugarType: "Honey",
    family: "honey",
    sugarEquivalentFactor: 1.22,
    sugarEquivalentFactorRange: { min: 1.18, max: 1.25 },
    confidence: "moderate",
  },
  Other: {
    sugarType: "Other",
    family: "other",
    sugarEquivalentFactor: null,
    sugarEquivalentFactorRange: null,
    confidence: "low",
  },
};

export function getF1SugarTypeConfig(sugarType: F1SugarType): F1SugarTypeConfig {
  return F1_SUGAR_TYPE_CONFIGS[sugarType];
}
