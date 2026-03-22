import type { PhaseOutcomeRow } from "@/lib/phase-outcomes";
import type { LoadedF2Setup } from "@/lib/f2-current-setup";

export type BrewAgainMode = "repeat_exactly" | "repeat_with_changes" | "edit_manually";

export type BrewAgainClassification =
  | "repeat_candidate"
  | "repeat_with_adjustments"
  | "not_ideal_reference";

export type BrewAgainPrefill = {
  name: string;
  brewDate: string;
  totalVolumeMl: number;
  teaType: string;
  sugarG: number;
  starterLiquidMl: number;
  scobyPresent: boolean;
  avgRoomTempC: number;
  vesselType: string;
  targetPreference: "sweeter" | "balanced" | "tart";
  initialPh: string;
  initialNotes: string;
};

export type BrewAgainSuggestion = {
  id: string;
  phase: "f1" | "f2";
  kind:
    | "target_preference_sweeter"
    | "target_preference_tart"
    | "f1_timing_later"
    | "f1_timing_earlier"
    | "f2_chill_earlier"
    | "f2_wait_longer"
    | "f2_flavor_stronger"
    | "f2_flavor_lighter"
    | "user_note";
  reason: string;
  summary: string;
  effectType: "prefill_patch" | "advisory_only";
  prefillPatch?: Partial<BrewAgainPrefill>;
  defaultEnabled: boolean;
};

export type BrewAgainSourceSummary = {
  sourceBatchId: string;
  sourceBatchName: string;
  f1Outcome?: PhaseOutcomeRow;
  f2Outcome?: PhaseOutcomeRow;
  currentF2Setup?: LoadedF2Setup | null;
};

export type BrewAgainPlan = {
  classification: BrewAgainClassification;
  defaultMode: BrewAgainMode;
  headline: string;
  explanation: string;
  prefill: BrewAgainPrefill;
  suggestions: BrewAgainSuggestion[];
  sourceSummary: BrewAgainSourceSummary;
};

export type BrewAgainNavigationState = {
  kind: "brew-again-prefill";
  mode: BrewAgainMode;
  classification: BrewAgainClassification;
  prefill: BrewAgainPrefill;
  sourceSummary: BrewAgainSourceSummary;
  acceptedSuggestions: BrewAgainSuggestion[];
};
