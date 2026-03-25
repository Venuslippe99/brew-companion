import type { F1TargetPreference } from "@/lib/f1-recipe-types";

export type F1SweetnessTargetConfig = {
  targetPreference: F1TargetPreference;
  sugarEquivalentGramsPerLiter: number;
};

export const F1_SWEETNESS_TARGET_CONFIGS: Record<
  F1TargetPreference,
  F1SweetnessTargetConfig
> = {
  tart: {
    targetPreference: "tart",
    sugarEquivalentGramsPerLiter: 50,
  },
  balanced: {
    targetPreference: "balanced",
    sugarEquivalentGramsPerLiter: 75,
  },
  sweeter: {
    targetPreference: "sweeter",
    sugarEquivalentGramsPerLiter: 100,
  },
};

export function getF1SweetnessTargetConfig(
  targetPreference: F1TargetPreference
): F1SweetnessTargetConfig {
  return F1_SWEETNESS_TARGET_CONFIGS[targetPreference];
}
