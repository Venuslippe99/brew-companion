import type { F1BatchSetupFields } from "@/lib/f1-recipe-types";
import type { F1RecommendationCard } from "@/lib/f1-recommendation-types";
import {
  buildF1BaselineMetrics,
  getSugarFamily,
  getTeaFamily,
  type F1SugarFamily,
  type F1TeaFamily,
} from "@/lib/f1-baseline-rules";

export type F1TransitionSeverity =
  | "continuity"
  | "bridge"
  | "caution"
  | "high_caution";

export type F1TransitionReference = {
  batchId?: string | null;
  label: string;
  teaType: string | null;
  sugarType: string | null;
};

export type F1TransitionAnalysis = {
  severity: F1TransitionSeverity;
  teaTransition: {
    changed: boolean;
    severity: F1TransitionSeverity;
    summary: string;
  };
  sweetenerTransition: {
    changed: boolean;
    severity: F1TransitionSeverity;
    summary: string;
  };
  combinedTransition: {
    changed: boolean;
    severity: F1TransitionSeverity;
    summary: string | null;
  };
  suggestedBridgeTeaType?: string;
};

function teaTransitionSeverity(referenceTea: F1TeaFamily, targetTea: F1TeaFamily) {
  if (referenceTea === targetTea) {
    return {
      severity: "continuity" as const,
      summary: "Tea base stays in the same family.",
      suggestedBridgeTeaType: undefined,
    };
  }

  if (
    referenceTea === "black" &&
    targetTea === "black_green_blend"
  ) {
    return {
      severity: "bridge" as const,
      summary: "This is a gentler step away from all-black tea rather than a full jump.",
      suggestedBridgeTeaType: undefined,
    };
  }

  if (
    referenceTea === "black" &&
    targetTea === "green"
  ) {
    return {
      severity: "caution" as const,
      summary: "This moves the culture from a black-tea batch to a full green-tea target.",
      suggestedBridgeTeaType: "Black & green blend",
    };
  }

  if (
    targetTea === "herbal_or_outside_core" ||
    referenceTea === "herbal_or_outside_core"
  ) {
    return {
      severity: "high_caution" as const,
      summary:
        "This shift moves outside the usual kombucha tea range, so the result becomes less predictable.",
      suggestedBridgeTeaType: undefined,
    };
  }

  return {
    severity: "caution" as const,
    summary: "This meaningfully changes the tea base the culture is adapting to.",
    suggestedBridgeTeaType:
      referenceTea === "black" ? "Black & green blend" : undefined,
  };
}

function sugarTransitionSeverity(referenceSugar: F1SugarFamily, targetSugar: F1SugarFamily) {
  if (referenceSugar === targetSugar) {
    return {
      severity: "continuity" as const,
      summary: "Sweetener family stays the same.",
    };
  }

  if (targetSugar === "honey" || referenceSugar === "honey") {
    return {
      severity: "caution" as const,
      summary: "Honey is a meaningful change from the sugar this culture is used to.",
    };
  }

  if (targetSugar === "whole_cane" || referenceSugar === "whole_cane") {
    return {
      severity: "bridge" as const,
      summary:
        "This changes sweetener family, but it is a smaller step than switching all the way to honey.",
    };
  }

  return {
    severity: "caution" as const,
    summary: "This changes the sweetener family the culture is used to.",
  };
}

function combinedTransitionSeverity(args: {
  teaChanged: boolean;
  sugarChanged: boolean;
  teaSeverity: F1TransitionSeverity;
  sugarSeverity: F1TransitionSeverity;
  targetSugarFamily: F1SugarFamily;
  targetTeaFamily: F1TeaFamily;
}) {
  if (!args.teaChanged || !args.sugarChanged) {
    return {
      changed: false,
      severity: "continuity" as const,
      summary: null,
    };
  }

  if (
    args.targetTeaFamily === "green" &&
    args.targetSugarFamily === "honey"
  ) {
    return {
      changed: true,
      severity: "high_caution" as const,
      summary:
        "Changing tea base and sweetener together makes this much harder to predict. Black tea to green tea plus honey is the strongest example.",
    };
  }

  if (
    args.teaSeverity === "high_caution" ||
    args.sugarSeverity === "high_caution" ||
    args.targetSugarFamily === "honey"
  ) {
    return {
      changed: true,
      severity: "high_caution" as const,
      summary:
        "Changing both tea base and sweetener together is harder to read than changing one variable at a time.",
    };
  }

  return {
    changed: true,
    severity: "caution" as const,
    summary:
      "This batch changes both tea base and sweetener together, which makes the result less predictable than a one-variable change.",
  };
}

export function analyzeF1Transition(args: {
  setup: F1BatchSetupFields;
  reference: F1TransitionReference | null;
}): F1TransitionAnalysis | null {
  if (!args.reference?.teaType && !args.reference?.sugarType) {
    return null;
  }

  const targetMetrics = buildF1BaselineMetrics(args.setup);
  const referenceTea = getTeaFamily(args.reference.teaType || "");
  const referenceSugar = getSugarFamily(args.reference.sugarType || "");

  const teaTransition = teaTransitionSeverity(referenceTea, targetMetrics.teaFamily);
  const sweetenerTransition = sugarTransitionSeverity(
    referenceSugar,
    targetMetrics.sugarFamily
  );

  const teaChanged = referenceTea !== targetMetrics.teaFamily;
  const sugarChanged = referenceSugar !== targetMetrics.sugarFamily;
  const combinedTransition = combinedTransitionSeverity({
    teaChanged,
    sugarChanged,
    teaSeverity: teaTransition.severity,
    sugarSeverity: sweetenerTransition.severity,
    targetSugarFamily: targetMetrics.sugarFamily,
    targetTeaFamily: targetMetrics.teaFamily,
  });

  const severityOrder: Record<F1TransitionSeverity, number> = {
    continuity: 0,
    bridge: 1,
    caution: 2,
    high_caution: 3,
  };

  const overallSeverity = [teaTransition.severity, sweetenerTransition.severity, combinedTransition.severity]
    .sort((left, right) => severityOrder[right] - severityOrder[left])[0];

  return {
    severity: overallSeverity,
    teaTransition: {
      changed: teaChanged,
      severity: teaTransition.severity,
      summary: teaTransition.summary,
    },
    sweetenerTransition: {
      changed: sugarChanged,
      severity: sweetenerTransition.severity,
      summary: sweetenerTransition.summary,
    },
    combinedTransition,
    suggestedBridgeTeaType: teaTransition.suggestedBridgeTeaType,
  };
}

function cautionLevelFromSeverity(
  severity: F1TransitionSeverity
): F1RecommendationCard["cautionLevel"] {
  if (severity === "high_caution") {
    return "high";
  }

  if (severity === "caution") {
    return "moderate";
  }

  if (severity === "bridge") {
    return "low";
  }

  return "none";
}

export function buildF1TransitionCards(args: {
  setup: F1BatchSetupFields;
  reference: F1TransitionReference | null;
}) {
  const analysis = analyzeF1Transition(args);

  if (!analysis || !args.reference) {
    return { analysis, cards: [] as F1RecommendationCard[] };
  }

  const cards: F1RecommendationCard[] = [];

  if (analysis.teaTransition.changed) {
    cards.push({
      id: `transition-tea-${args.reference.batchId || "reference"}`,
      category: "culture_transition_warning",
      priority: analysis.teaTransition.severity === "high_caution" ? 97 : 80,
      title:
        analysis.teaTransition.severity === "bridge"
          ? "Tea choice works as a bridge"
          : "Tea choice asks the culture to adapt",
      summary: analysis.teaTransition.summary,
      explanation:
        analysis.teaTransition.severity === "bridge"
          ? `${args.reference.label} was brewed with ${args.reference.teaType}. The current tea choice is a gentler bridge rather than a full switch.`
          : `${args.reference.label} was brewed with ${args.reference.teaType}. This batch uses ${args.setup.teaType}, so the culture is being asked to adapt.`,
      sourceType: "transition",
      confidence: analysis.teaTransition.severity === "bridge" ? "moderate" : "high",
      evidenceCount: args.reference.batchId ? 1 : 0,
      recommendationType:
        analysis.teaTransition.severity === "bridge" ? "note" : "caution",
      cautionLevel: cautionLevelFromSeverity(analysis.teaTransition.severity),
      applyAction:
        analysis.suggestedBridgeTeaType &&
        analysis.teaTransition.severity !== "bridge"
          ? {
              field: "teaType",
              value: analysis.suggestedBridgeTeaType,
              label: `Use ${analysis.suggestedBridgeTeaType} as a bridge`,
            }
          : undefined,
      appliedValueSnapshot: args.setup.teaType,
    });
  }

  if (analysis.sweetenerTransition.changed) {
    cards.push({
      id: `transition-sugar-${args.reference.batchId || "reference"}`,
      category: "sweetener_transition_warning",
      priority: analysis.sweetenerTransition.severity === "caution" ? 79 : 56,
      title:
        analysis.sweetenerTransition.severity === "bridge"
          ? "Sweetener change is modest but worth noting"
          : "Sweetener change is worth double-checking",
      summary: analysis.sweetenerTransition.summary,
      explanation: `${args.reference.label} used ${args.reference.sugarType}. This batch uses ${args.setup.sugarType}, so the culture is not seeing the same sweetener family this time.`,
      sourceType: "transition",
      confidence: "moderate",
      evidenceCount: args.reference.batchId ? 1 : 0,
      recommendationType:
        analysis.sweetenerTransition.severity === "bridge" ? "note" : "caution",
      cautionLevel: cautionLevelFromSeverity(analysis.sweetenerTransition.severity),
      appliedValueSnapshot: args.setup.sugarType,
    });
  }

  if (analysis.combinedTransition.changed && analysis.combinedTransition.summary) {
    cards.push({
      id: `transition-combined-${args.reference.batchId || "reference"}`,
      category: "combined_transition_warning",
      priority:
        analysis.combinedTransition.severity === "high_caution" ? 99 : 84,
      title:
        analysis.combinedTransition.severity === "high_caution"
          ? "Tea and sugar are both changing in a big way"
          : "Tea and sugar are both changing",
      summary: analysis.combinedTransition.summary,
      explanation:
        "If you want a calmer beginner-friendly path, it is usually easier to change one variable at a time instead of changing both tea and sugar together.",
      sourceType: "transition",
      confidence: "moderate",
      evidenceCount: args.reference.batchId ? 1 : 0,
      recommendationType: "caution",
      cautionLevel: cautionLevelFromSeverity(analysis.combinedTransition.severity),
      appliedValueSnapshot: `${args.setup.teaType} + ${args.setup.sugarType}`,
    });
  }

  return { analysis, cards };
}
