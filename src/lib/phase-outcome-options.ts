import type { Enums } from "@/integrations/supabase/types";

export type PhaseOutcomePhase = Enums<"phase_outcome_phase_enum">;
export type F1TasteState = Enums<"f1_taste_state_enum">;
export type F1Readiness = Enums<"f1_readiness_enum">;
export type F2OverallResult = Enums<"f2_overall_result_enum">;
export type F2BrewAgain = Enums<"f2_brew_again_enum">;

export const F1_TASTE_STATE_OPTIONS: Array<{ value: F1TasteState; label: string }> = [
  { value: "too_sweet", label: "Too sweet" },
  { value: "slightly_sweet", label: "Slightly sweet" },
  { value: "balanced", label: "Balanced" },
  { value: "tart", label: "Tart" },
  { value: "too_sour", label: "Too sour" },
];

export const F1_READINESS_OPTIONS: Array<{ value: F1Readiness; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "maybe_early", label: "Maybe, a bit early" },
  { value: "maybe_late", label: "Maybe, a bit late" },
  { value: "no", label: "No" },
];

export const F1_TAG_OPTIONS = [
  { value: "ready_for_f2", label: "Ready for F2" },
  { value: "still_too_sweet", label: "Still too sweet" },
  { value: "nice_balance", label: "Nice balance" },
  { value: "too_acidic", label: "Too acidic" },
  { value: "strong_tea_base", label: "Strong tea base" },
  { value: "weak_tea_base", label: "Weak tea base" },
  { value: "good_starter_for_next_batch", label: "Good starter for next batch" },
  { value: "not_sure", label: "Not sure" },
] as const;

export const F2_OVERALL_RESULT_OPTIONS: Array<{ value: F2OverallResult; label: string }> = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "okay", label: "Okay" },
  { value: "disappointing", label: "Disappointing" },
  { value: "bad", label: "Bad" },
];

export const F2_BREW_AGAIN_OPTIONS: Array<{ value: F2BrewAgain; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "maybe_with_changes", label: "Maybe, with changes" },
  { value: "no", label: "No" },
];

export const F2_TAG_OPTIONS = [
  { value: "carbonation_just_right", label: "Carbonation just right" },
  { value: "too_flat", label: "Too flat" },
  { value: "too_fizzy", label: "Too fizzy" },
  { value: "flavor_worked_well", label: "Flavor worked well" },
  { value: "flavor_too_weak", label: "Flavor too weak" },
  { value: "flavor_too_strong", label: "Flavor too strong" },
  { value: "too_sour", label: "Too sour" },
  { value: "too_sweet", label: "Too sweet" },
  { value: "not_sure", label: "Not sure" },
] as const;

export type F1OutcomeTag = (typeof F1_TAG_OPTIONS)[number]["value"];
export type F2OutcomeTag = (typeof F2_TAG_OPTIONS)[number]["value"];
export type PhaseOutcomeTag = F1OutcomeTag | F2OutcomeTag;

const labelMap = new Map<string, string>([
  ...F1_TASTE_STATE_OPTIONS.map((option) => [option.value, option.label] as const),
  ...F1_READINESS_OPTIONS.map((option) => [option.value, option.label] as const),
  ...F1_TAG_OPTIONS.map((option) => [option.value, option.label] as const),
  ...F2_OVERALL_RESULT_OPTIONS.map((option) => [option.value, option.label] as const),
  ...F2_BREW_AGAIN_OPTIONS.map((option) => [option.value, option.label] as const),
  ...F2_TAG_OPTIONS.map((option) => [option.value, option.label] as const),
]);

export function getPhaseOutcomeLabel(value?: string | null) {
  if (!value) return "";
  return labelMap.get(value) || value;
}

export function getPhaseLabel(phase: PhaseOutcomePhase) {
  return phase === "f1" ? "F1" : "F2";
}
