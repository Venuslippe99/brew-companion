import type { KombuchaBatch } from "@/lib/batches";
import type { LoadedF2Setup } from "@/lib/f2-current-setup";
import type { PhaseOutcomeRow } from "@/lib/phase-outcomes";
import type {
  BrewAgainClassification,
  BrewAgainMode,
  BrewAgainNavigationState,
  BrewAgainPlan,
  BrewAgainPrefill,
  BrewAgainSuggestion,
} from "@/lib/brew-again-types";

function normalizeBatchName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "New Batch";
  }

  if (/ again$/i.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed} Again`;
}

function todayDateValue() {
  return new Date().toISOString().split("T")[0];
}

function buildBasePrefill(batch: KombuchaBatch): BrewAgainPrefill {
  return {
    name: normalizeBatchName(batch.name),
    brewDate: todayDateValue(),
    totalVolumeMl: batch.totalVolumeMl,
    teaType: batch.teaType,
    teaSourceForm:
      batch.teaSourceForm === "tea_bags" ||
      batch.teaSourceForm === "loose_leaf" ||
      batch.teaSourceForm === "other"
        ? batch.teaSourceForm
        : "tea_bags",
    teaAmountValue: batch.teaAmountValue || 8,
    teaAmountUnit:
      batch.teaAmountUnit === "bags" ||
      batch.teaAmountUnit === "g" ||
      batch.teaAmountUnit === "tbsp" ||
      batch.teaAmountUnit === "tsp"
        ? batch.teaAmountUnit
        : "bags",
    sugarG: batch.sugarG,
    sugarType: batch.sugarType || "Cane sugar",
    starterLiquidMl: batch.starterLiquidMl,
    scobyPresent: batch.scobyPresent,
    avgRoomTempC: batch.avgRoomTempC,
    vesselType: batch.vesselType,
    targetPreference:
      batch.targetPreference === "sweeter" ||
      batch.targetPreference === "balanced" ||
      batch.targetPreference === "tart"
        ? batch.targetPreference
        : "balanced",
    initialPh: "",
    initialNotes: "",
  };
}

export function isBrewAgainNavigationState(
  value: unknown
): value is BrewAgainNavigationState {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (value as { kind?: string }).kind === "brew-again-prefill";
}

function hasTag(outcome: PhaseOutcomeRow | undefined, tag: string) {
  return !!outcome?.selected_tags.includes(tag);
}

function buildSuggestions(args: {
  batch: KombuchaBatch;
  f1Outcome?: PhaseOutcomeRow;
  f2Outcome?: PhaseOutcomeRow;
}): BrewAgainSuggestion[] {
  const { batch, f1Outcome, f2Outcome } = args;
  const suggestions: BrewAgainSuggestion[] = [];

  const sweetSignals =
    f1Outcome?.f1_taste_state === "too_sweet" ||
    f1Outcome?.f1_readiness === "maybe_early" ||
    hasTag(f1Outcome, "still_too_sweet") ||
    hasTag(f2Outcome, "too_sweet");

  const sourSignals =
    f1Outcome?.f1_taste_state === "tart" ||
    f1Outcome?.f1_taste_state === "too_sour" ||
    f1Outcome?.f1_readiness === "maybe_late" ||
    hasTag(f1Outcome, "too_acidic") ||
    hasTag(f2Outcome, "too_sour");

  if (sweetSignals && !sourSignals && batch.targetPreference !== "tart") {
    suggestions.push({
      id: "target-pref-tart",
      phase: "f1",
      kind: "target_preference_tart",
      reason: "The last batch still read as sweet or a bit early.",
      summary: "Set the new batch target to tart so the app nudges tasting later.",
      effectType: "prefill_patch",
      prefillPatch: { targetPreference: "tart" },
      defaultEnabled: true,
    });
  }

  if (sourSignals && !sweetSignals && batch.targetPreference !== "sweeter") {
    suggestions.push({
      id: "target-pref-sweeter",
      phase: "f1",
      kind: "target_preference_sweeter",
      reason: "The last batch leaned tart or a little late.",
      summary: "Set the new batch target to sweeter so the app nudges tasting earlier.",
      effectType: "prefill_patch",
      prefillPatch: { targetPreference: "sweeter" },
      defaultEnabled: true,
    });
  }

  if (
    f1Outcome?.f1_taste_state === "too_sweet" ||
    f1Outcome?.f1_readiness === "maybe_early" ||
    hasTag(f1Outcome, "still_too_sweet")
  ) {
    suggestions.push({
      id: "f1-later-check",
      phase: "f1",
      kind: "f1_timing_later",
      reason: "F1 was still sweet or felt a little early.",
      summary: "Plan to give F1 a little more time before deciding it is ready for the next step.",
      effectType: "advisory_only",
      defaultEnabled: true,
    });
  }

  if (
    f1Outcome?.f1_taste_state === "tart" ||
    f1Outcome?.f1_taste_state === "too_sour" ||
    f1Outcome?.f1_readiness === "maybe_late" ||
    hasTag(f1Outcome, "too_acidic")
  ) {
    suggestions.push({
      id: "f1-earlier-check",
      phase: "f1",
      kind: "f1_timing_earlier",
      reason: "F1 ran tart or felt a little late.",
      summary: "Start tasting a little earlier so you can catch the balance sooner.",
      effectType: "advisory_only",
      defaultEnabled: true,
    });
  }

  if (hasTag(f2Outcome, "too_flat")) {
    suggestions.push({
      id: "f2-wait-longer",
      phase: "f2",
      kind: "f2_wait_longer",
      reason: "The finished batch felt flatter than you wanted.",
      summary: "When you reach F2 again, plan to give the bottles a bit more time before chilling.",
      effectType: "advisory_only",
      defaultEnabled: true,
    });
  }

  if (hasTag(f2Outcome, "too_fizzy")) {
    suggestions.push({
      id: "f2-chill-earlier",
      phase: "f2",
      kind: "f2_chill_earlier",
      reason: "The last bottles ran too fizzy.",
      summary: "When you reach F2 again, plan to check earlier and chill sooner.",
      effectType: "advisory_only",
      defaultEnabled: true,
    });
  }

  if (hasTag(f2Outcome, "flavor_too_weak")) {
    suggestions.push({
      id: "f2-flavor-stronger",
      phase: "f2",
      kind: "f2_flavor_stronger",
      reason: "Flavor came through weaker than expected.",
      summary: "When you set up F2 again, consider a slightly stronger flavour addition.",
      effectType: "advisory_only",
      defaultEnabled: true,
    });
  }

  if (hasTag(f2Outcome, "flavor_too_strong")) {
    suggestions.push({
      id: "f2-flavor-lighter",
      phase: "f2",
      kind: "f2_flavor_lighter",
      reason: "Flavor came through stronger than expected.",
      summary: "When you set up F2 again, consider dialing the flavouring back a bit.",
      effectType: "advisory_only",
      defaultEnabled: true,
    });
  }

  if (f1Outcome?.next_time_change?.trim()) {
    suggestions.push({
      id: "f1-user-note",
      phase: "f1",
      kind: "user_note",
      reason: "You saved a change for next time in the F1 outcome.",
      summary: f1Outcome.next_time_change.trim(),
      effectType: "advisory_only",
      defaultEnabled: true,
    });
  }

  if (f2Outcome?.next_time_change?.trim()) {
    suggestions.push({
      id: "f2-user-note",
      phase: "f2",
      kind: "user_note",
      reason: "You saved a change for next time in the F2 outcome.",
      summary: f2Outcome.next_time_change.trim(),
      effectType: "advisory_only",
      defaultEnabled: true,
    });
  }

  return suggestions;
}

function classifySource(args: {
  f1Outcome?: PhaseOutcomeRow;
  f2Outcome?: PhaseOutcomeRow;
  suggestions: BrewAgainSuggestion[];
}): BrewAgainClassification {
  const { f1Outcome, f2Outcome, suggestions } = args;

  if (
    f2Outcome?.f2_brew_again === "yes" &&
    (f2Outcome.f2_overall_result === "excellent" ||
      f2Outcome.f2_overall_result === "good") &&
    !hasTag(f2Outcome, "too_fizzy") &&
    !hasTag(f2Outcome, "too_flat") &&
    !hasTag(f2Outcome, "flavor_too_strong") &&
    !hasTag(f2Outcome, "flavor_too_weak")
  ) {
    return "repeat_candidate";
  }

  if (
    f2Outcome?.f2_brew_again === "no" ||
    f2Outcome?.f2_overall_result === "bad" ||
    f2Outcome?.f2_overall_result === "disappointing"
  ) {
    return "not_ideal_reference";
  }

  if (
    suggestions.length > 0 ||
    f2Outcome?.f2_brew_again === "maybe_with_changes" ||
    f1Outcome?.f1_readiness === "maybe_early" ||
    f1Outcome?.f1_readiness === "maybe_late"
  ) {
    return "repeat_with_adjustments";
  }

  return "repeat_candidate";
}

function getClassificationCopy(classification: BrewAgainClassification): {
  headline: string;
  explanation: string;
  defaultMode: BrewAgainMode;
} {
  switch (classification) {
    case "repeat_candidate":
      return {
        headline: "This looks like a solid batch to repeat.",
        explanation:
          "The saved outcomes look mostly positive, so repeating the setup exactly is a reasonable default.",
        defaultMode: "repeat_exactly",
      };
    case "not_ideal_reference":
      return {
        headline: "Use this batch as a reference, not a blind repeat.",
        explanation:
          "The saved outcomes point to problems or changes you likely do not want to repeat unchanged.",
        defaultMode: "edit_manually",
      };
    default:
      return {
        headline: "This batch is useful, but a few changes are worth reviewing.",
        explanation:
          "The saved outcomes suggest a similar batch could work well with a small number of visible adjustments.",
        defaultMode: "repeat_with_changes",
      };
  }
}

export function buildBrewAgainPlan(args: {
  batch: KombuchaBatch;
  f1Outcome?: PhaseOutcomeRow;
  f2Outcome?: PhaseOutcomeRow;
  currentF2Setup?: LoadedF2Setup | null;
}): BrewAgainPlan {
  const { batch, f1Outcome, f2Outcome, currentF2Setup } = args;
  const suggestions = buildSuggestions({ batch, f1Outcome, f2Outcome });
  const classification = classifySource({ f1Outcome, f2Outcome, suggestions });
  const copy = getClassificationCopy(classification);

  return {
    classification,
    defaultMode: copy.defaultMode,
    headline: copy.headline,
    explanation: copy.explanation,
    prefill: buildBasePrefill(batch),
    suggestions,
    sourceSummary: {
      sourceBatchId: batch.id,
      sourceBatchName: batch.name,
      f1Outcome,
      f2Outcome,
      currentF2Setup,
    },
  };
}

export function applyBrewAgainSelection(args: {
  plan: BrewAgainPlan;
  mode: BrewAgainMode;
  enabledSuggestionIds: string[];
}): BrewAgainNavigationState {
  const { plan, mode, enabledSuggestionIds } = args;

  const acceptedSuggestions = plan.suggestions.filter((suggestion) =>
    enabledSuggestionIds.includes(suggestion.id)
  );

  const prefill = acceptedSuggestions.reduce<BrewAgainPrefill>(
    (current, suggestion) =>
      suggestion.effectType === "prefill_patch" && suggestion.prefillPatch
        ? { ...current, ...suggestion.prefillPatch }
        : current,
    { ...plan.prefill }
  );

  return {
    kind: "brew-again-prefill",
    mode,
    classification: plan.classification,
    prefill,
    sourceSummary: plan.sourceSummary,
    acceptedSuggestions,
  };
}
