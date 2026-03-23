import type { BatchTimingResult } from "@/lib/batch-timing";
import type { F1BatchSetupFields } from "@/lib/f1-recipe-types";
import {
  type F1RecommendationCard,
  type F1RecommendationConfidence,
} from "@/lib/f1-recommendation-types";
import { buildF1VesselFitResult } from "@/lib/f1-vessel-fit";
import type { SelectedF1Vessel } from "@/lib/f1-vessel-types";

export type F1TeaFamily =
  | "black"
  | "green"
  | "black_green_blend"
  | "green_white_blend"
  | "oolong"
  | "white"
  | "herbal_or_outside_core"
  | "unknown";

export type F1SugarFamily =
  | "refined"
  | "whole_cane"
  | "honey"
  | "other";

export type F1TeaStrengthBand = "light" | "standard" | "strong" | null;
export type F1StarterBand = "low" | "baseline" | "conservative" | "high";

export type F1BaselineMetrics = {
  starterRatio: number | null;
  starterRatioPercent: number | null;
  starterBand: F1StarterBand;
  recommendedStarterMl: number | null;
  sugarPerLiter: number | null;
  teaGramsPerLiter: number | null;
  teaGramEstimateSource: "direct" | "approximate" | "none";
  teaStrengthBand: F1TeaStrengthBand;
  teaFamily: F1TeaFamily;
  sugarFamily: F1SugarFamily;
};

function roundToNearestTen(value: number) {
  return Math.round(value / 10) * 10;
}

export function getTeaFamily(teaType: string): F1TeaFamily {
  const normalized = teaType.trim().toLowerCase();

  if (normalized.includes("black") && normalized.includes("green")) {
    return "black_green_blend";
  }

  if (normalized.includes("green") && normalized.includes("white")) {
    return "green_white_blend";
  }

  if (normalized.includes("black")) {
    return "black";
  }

  if (normalized.includes("green")) {
    return "green";
  }

  if (normalized.includes("oolong")) {
    return "oolong";
  }

  if (normalized.includes("white")) {
    return "white";
  }

  if (
    normalized.includes("herbal") ||
    normalized.includes("rooibos") ||
    normalized.includes("mint") ||
    normalized.includes("chamomile")
  ) {
    return "herbal_or_outside_core";
  }

  return "unknown";
}

export function getSugarFamily(sugarType: string): F1SugarFamily {
  const normalized = sugarType.trim().toLowerCase();

  if (normalized.includes("honey")) {
    return "honey";
  }

  if (
    normalized.includes("brown") ||
    normalized.includes("raw") ||
    normalized.includes("whole") ||
    normalized.includes("turbinado") ||
    normalized.includes("muscovado")
  ) {
    return "whole_cane";
  }

  if (
    normalized.includes("cane") ||
    normalized.includes("white") ||
    normalized.includes("refined")
  ) {
    return "refined";
  }

  return "other";
}

function estimateTeaGrams(args: {
  value: number;
  unit: F1BatchSetupFields["teaAmountUnit"];
}) {
  if (args.unit === "g") {
    return { grams: args.value, source: "direct" as const };
  }

  if (args.unit === "bags") {
    return { grams: args.value * 2, source: "approximate" as const };
  }

  if (args.unit === "tbsp") {
    return { grams: args.value * 2.5, source: "approximate" as const };
  }

  if (args.unit === "tsp") {
    return { grams: args.value * 0.8, source: "approximate" as const };
  }

  return { grams: null, source: "none" as const };
}

function getTeaStrengthBand(teaGramsPerLiter: number | null): F1TeaStrengthBand {
  if (teaGramsPerLiter === null) {
    return null;
  }

  if (teaGramsPerLiter < 4) {
    return "light";
  }

  if (teaGramsPerLiter <= 6) {
    return "standard";
  }

  return "strong";
}

function getConfidenceFromTeaEstimate(
  source: F1BaselineMetrics["teaGramEstimateSource"]
): F1RecommendationConfidence {
  if (source === "direct") {
    return "high";
  }

  if (source === "approximate") {
    return "low";
  }

  return "low";
}

export function buildF1BaselineMetrics(setup: F1BatchSetupFields): F1BaselineMetrics {
  const volumeLiters = setup.totalVolumeMl > 0 ? setup.totalVolumeMl / 1000 : null;
  const starterRatio =
    volumeLiters && setup.totalVolumeMl > 0
      ? setup.starterLiquidMl / setup.totalVolumeMl
      : null;
  const starterRatioPercent =
    starterRatio !== null ? Math.round(starterRatio * 100) : null;
  const sugarPerLiter =
    volumeLiters && volumeLiters > 0 ? Number((setup.sugarG / volumeLiters).toFixed(1)) : null;
  const teaEstimate = estimateTeaGrams({
    value: setup.teaAmountValue,
    unit: setup.teaAmountUnit,
  });
  const teaGramsPerLiter =
    volumeLiters && volumeLiters > 0 && teaEstimate.grams !== null
      ? Number((teaEstimate.grams / volumeLiters).toFixed(2))
      : null;

  let starterBand: F1StarterBand = "baseline";
  if (starterRatio !== null) {
    if (starterRatio < 0.08) {
      starterBand = "low";
    } else if (starterRatio <= 0.12) {
      starterBand = "baseline";
    } else if (starterRatio <= 0.16) {
      starterBand = "conservative";
    } else {
      starterBand = "high";
    }
  }

  return {
    starterRatio,
    starterRatioPercent,
    starterBand,
    recommendedStarterMl:
      setup.totalVolumeMl > 0 ? roundToNearestTen(setup.totalVolumeMl * 0.1) : null,
    sugarPerLiter,
    teaGramsPerLiter,
    teaGramEstimateSource: teaEstimate.source,
    teaStrengthBand: getTeaStrengthBand(teaGramsPerLiter),
    teaFamily: getTeaFamily(setup.teaType),
    sugarFamily: getSugarFamily(setup.sugarType),
  };
}

function buildStarterCard(
  setup: F1BatchSetupFields,
  metrics: F1BaselineMetrics
): F1RecommendationCard {
  if (metrics.starterBand === "low") {
    return {
      id: "baseline-starter-low",
      category: "starter_recommendation",
      priority: 95,
      title: "Starter looks lighter than the usual baseline",
      summary:
        "About 10% starter liquid is the clearest standard baseline for a batch like this.",
      explanation:
        "Your starter ratio is below the usual 10% v/v baseline. Acidic starter liquid matters more than pellicle size for conservative setup guidance, so a little more starter is the safest first adjustment.",
      sourceType: "baseline",
      confidence: "high",
      evidenceCount: 0,
      recommendationType: "adjust",
      cautionLevel: "moderate",
      applyAction: metrics.recommendedStarterMl
        ? {
            field: "starterLiquidMl",
            value: metrics.recommendedStarterMl,
            label: `Use about ${metrics.recommendedStarterMl}ml starter`,
          }
        : undefined,
      appliedValueSnapshot: setup.starterLiquidMl,
    };
  }

  if (metrics.starterBand === "conservative" || metrics.starterBand === "high") {
    return {
      id: "baseline-starter-conservative",
      category: "starter_recommendation",
      priority: 52,
      title:
        metrics.starterBand === "high"
          ? "Starter is on the high side"
          : "Starter amount is on the conservative side",
      summary:
        "This is more starter than the clearest standard baseline, which can be a cautious setup choice.",
      explanation:
        "Higher starter can be a conservative choice, especially when you want a lower-risk setup. It is helpful to frame this as safer rather than universally better.",
      sourceType: "baseline",
      confidence: "moderate",
      evidenceCount: 0,
      recommendationType: "affirm",
      cautionLevel: metrics.starterBand === "high" ? "low" : "none",
      appliedValueSnapshot: setup.starterLiquidMl,
    };
  }

  return {
    id: "baseline-starter-standard",
    category: "starter_recommendation",
    priority: 48,
    title: "Starter is in the standard baseline range",
    summary: "About 10% starter liquid is a clear, conservative F1 baseline.",
    explanation:
      "Your starter ratio sits near the usual 10% v/v baseline, which is a straightforward default for beginner-friendly F1 guidance.",
    sourceType: "baseline",
    confidence: "high",
    evidenceCount: 0,
    recommendationType: "affirm",
    cautionLevel: "none",
    appliedValueSnapshot: setup.starterLiquidMl,
  };
}

function buildSugarCard(
  setup: F1BatchSetupFields,
  metrics: F1BaselineMetrics
): F1RecommendationCard {
  const sugarPerLiter = metrics.sugarPerLiter;

  if (sugarPerLiter === null) {
    return {
      id: "baseline-sugar-missing",
      category: "sugar_recommendation",
      priority: 25,
      title: "Sugar guidance needs a batch volume",
      summary: "Kombucha sugar guidance is easiest to compare in grams per liter.",
      explanation:
        "Without a valid total volume, the app cannot compare sugar to the usual 70 to 90 g/L band.",
      sourceType: "baseline",
      confidence: "low",
      evidenceCount: 0,
      recommendationType: "note",
      cautionLevel: "low",
      appliedValueSnapshot: setup.sugarG,
    };
  }

  if (sugarPerLiter < 50) {
    return {
      id: "baseline-sugar-low",
      category: "sugar_recommendation",
      priority: 90,
      title: "Sugar is below the usual kombucha range",
      summary:
        "The clearest standard band is around 70 to 90 g/L, with 70 to 80 g/L as a conservative center.",
      explanation:
        "Your sugar sits below 50 g/L, which is a reasonable caution zone rather than a hard block. A beginner-safe first adjustment is to move closer to the standard range.",
      sourceType: "baseline",
      confidence: "high",
      evidenceCount: 0,
      recommendationType: "adjust",
      cautionLevel: "moderate",
      applyAction: {
        field: "sugarG",
        value: roundToNearestTen((setup.totalVolumeMl / 1000) * 75),
        label: `Use about ${roundToNearestTen((setup.totalVolumeMl / 1000) * 75)}g sugar`,
      },
      appliedValueSnapshot: setup.sugarG,
    };
  }

  if (sugarPerLiter > 100) {
    return {
      id: "baseline-sugar-high",
      category: "sugar_recommendation",
      priority: 82,
      title: "Sugar is above the usual kombucha range",
      summary:
        "Above about 100 g/L is a caution zone, even though it is not an automatic stop.",
      explanation:
        "A lower sugar load is usually easier to interpret for beginner-friendly F1 guidance. Moving back toward the standard band is the clearest conservative choice.",
      sourceType: "baseline",
      confidence: "high",
      evidenceCount: 0,
      recommendationType: "adjust",
      cautionLevel: "moderate",
      applyAction: {
        field: "sugarG",
        value: roundToNearestTen((setup.totalVolumeMl / 1000) * 80),
        label: `Use about ${roundToNearestTen((setup.totalVolumeMl / 1000) * 80)}g sugar`,
      },
      appliedValueSnapshot: setup.sugarG,
    };
  }

  if (sugarPerLiter >= 70 && sugarPerLiter <= 90) {
    return {
      id: "baseline-sugar-standard",
      category: "sugar_recommendation",
      priority: 42,
      title: "Sugar sits inside the usual kombucha band",
      summary: "70 to 90 g/L is a practical standard kombucha range.",
      explanation:
        "Your sugar level sits inside the standard band, which is a calm beginner-friendly default. Refined sugars are the lowest-risk starting point for routine continuity.",
      sourceType: "baseline",
      confidence: "high",
      evidenceCount: 0,
      recommendationType: "affirm",
      cautionLevel: "none",
      appliedValueSnapshot: setup.sugarG,
    };
  }

  return {
    id: "baseline-sugar-edge",
    category: "sugar_recommendation",
    priority: 54,
    title: "Sugar is workable but outside the standard center",
    summary:
      "The setup is still in a workable zone, but it sits outside the usual 70 to 90 g/L center band.",
    explanation:
      "This is a reasonable place for a caution note rather than a hard stop. If you want a simpler beginner baseline, move closer to 70 to 80 g/L.",
    sourceType: "baseline",
    confidence: "high",
    evidenceCount: 0,
    recommendationType: "note",
    cautionLevel: "low",
    appliedValueSnapshot: setup.sugarG,
  };
}

function buildTeaAmountCard(
  setup: F1BatchSetupFields,
  metrics: F1BaselineMetrics
): F1RecommendationCard {
  const confidence = getConfidenceFromTeaEstimate(metrics.teaGramEstimateSource);
  const estimateNote =
    metrics.teaGramEstimateSource === "approximate"
      ? " Tea bag and spoon conversions are being treated as an approximation."
      : "";

  if (metrics.teaGramsPerLiter === null) {
    return {
      id: "baseline-tea-unknown",
      category: "tea_amount_recommendation",
      priority: 30,
      title: "Tea strength is harder to judge from this unit",
      summary: "Tea is easiest to compare in grams per liter.",
      explanation:
        "The app prefers grams per liter for tea-strength logic. Without that, it can only give a softer note instead of a strong recommendation.",
      sourceType: "baseline",
      confidence: "low",
      evidenceCount: 0,
      recommendationType: "note",
      cautionLevel: "low",
      appliedValueSnapshot: setup.teaAmountValue,
    };
  }

  if (metrics.teaGramsPerLiter < 1.5) {
    return {
      id: "baseline-tea-very-light",
      category: "tea_amount_recommendation",
      priority: 88,
      title: "Tea base looks very light",
      summary:
        "Broad tea guidance often starts around 1.5 to 6 g/L, with a practical default center around 4 to 6 g/L.",
      explanation:
        `This setup is well below the practical default range, so a modestly stronger tea base is the clearest conservative suggestion.${estimateNote}`,
      sourceType: "baseline",
      confidence,
      evidenceCount: 0,
      recommendationType: "adjust",
      cautionLevel: "moderate",
      appliedValueSnapshot: setup.teaAmountValue,
    };
  }

  if (metrics.teaStrengthBand === "light") {
    return {
      id: "baseline-tea-light",
      category: "tea_amount_recommendation",
      priority: 58,
      title: "Tea base is on the lighter side",
      summary:
        "The batch still looks workable, but it sits below the practical 4 to 6 g/L default center.",
      explanation:
        `A lighter base is not automatically wrong, but it is worth noting because tea strength contributes to how the finished batch feels. ${estimateNote}`.trim(),
      sourceType: "baseline",
      confidence,
      evidenceCount: 0,
      recommendationType: "note",
      cautionLevel: "low",
      appliedValueSnapshot: setup.teaAmountValue,
    };
  }

  if (metrics.teaStrengthBand === "strong") {
    return {
      id: "baseline-tea-strong",
      category: "tea_amount_recommendation",
      priority: 60,
      title: "Tea base is on the strong side",
      summary:
        "This is above the practical 4 to 6 g/L center, so it may produce a firmer tea presence.",
      explanation:
        `A stronger base can be intentional, but it is worth making that choice explicitly. ${estimateNote}`.trim(),
      sourceType: "baseline",
      confidence,
      evidenceCount: 0,
      recommendationType: "note",
      cautionLevel: "low",
      appliedValueSnapshot: setup.teaAmountValue,
    };
  }

  return {
    id: "baseline-tea-standard",
    category: "tea_amount_recommendation",
    priority: 36,
    title: "Tea amount looks close to a practical default",
    summary:
      "A practical everyday tea band centers around about 4 to 6 g/L when the app can normalize the setup that way.",
    explanation:
      `This tea amount sits in that practical middle range, which is a calm default for many F1 setups.${estimateNote}`,
    sourceType: "baseline",
    confidence,
    evidenceCount: 0,
    recommendationType: "affirm",
    cautionLevel: "none",
    appliedValueSnapshot: setup.teaAmountValue,
  };
}

function buildTeaBaseCard(metrics: F1BaselineMetrics): F1RecommendationCard {
  switch (metrics.teaFamily) {
    case "black":
      return {
        id: "baseline-tea-base-black",
        category: "tea_base_recommendation",
        priority: 35,
        title: "Black tea is a conservative continuity baseline",
        summary: "Black tea is the clearest beginner-friendly baseline for routine culture continuity.",
        explanation:
          "Black tea is the most conservative default inside the core kombucha lineage model, so it works well as a calm reference point.",
        sourceType: "baseline",
        confidence: "high",
        evidenceCount: 0,
        recommendationType: "affirm",
        cautionLevel: "none",
      };
    case "green":
      return {
        id: "baseline-tea-base-green",
        category: "tea_base_recommendation",
        priority: 38,
        title: "Green tea is a viable full kombucha base",
        summary: "Green tea should be treated as a valid full base, not as inherently weak.",
        explanation:
          "Green tea is within the core tea model, but it is slightly less conservative than black tea for continuity guidance.",
        sourceType: "baseline",
        confidence: "moderate",
        evidenceCount: 0,
        recommendationType: "affirm",
        cautionLevel: "low",
      };
    case "black_green_blend":
      return {
        id: "baseline-tea-base-bridge",
        category: "tea_base_recommendation",
        priority: 44,
        title: "Black and green together make a practical bridge",
        summary: "A black-plus-green blend is a prudent bridge when moving toward greener profiles.",
        explanation:
          "This sits inside the core tea model while softening the jump away from all-black tea.",
        sourceType: "baseline",
        confidence: "moderate",
        evidenceCount: 0,
        recommendationType: "affirm",
        cautionLevel: "low",
      };
    case "oolong":
    case "white":
    case "green_white_blend":
      return {
        id: `baseline-tea-base-${metrics.teaFamily}`,
        category: "tea_base_recommendation",
        priority: 50,
        title: "Tea choice is workable but less conservative",
        summary:
          "This tea still sits inside a plausible kombucha range, but it is a little less standard than black or green.",
        explanation:
          "It is reasonable to keep the rest of the setup calm and easy to interpret when using a less standard tea base.",
        sourceType: "baseline",
        confidence: "moderate",
        evidenceCount: 0,
        recommendationType: "note",
        cautionLevel: "low",
      };
    default:
      return {
        id: "baseline-tea-base-outside-core",
        category: "tea_base_recommendation",
        priority: 78,
        title: "Tea choice sits outside the core lineage model",
        summary:
          "The clearest continuity guidance stays inside Camellia sinensis teas such as black, green, white, or oolong.",
        explanation:
          "That does not make this batch invalid, but it does lower confidence because the app can no longer rely on the same continuity assumptions.",
        sourceType: "baseline",
        confidence: "low",
        evidenceCount: 0,
        recommendationType: "caution",
        cautionLevel: "moderate",
      };
  }
}

function buildVesselCard(
  setup: F1BatchSetupFields,
  selectedVessel: SelectedF1Vessel | null | undefined
): F1RecommendationCard | null {
  if (!selectedVessel) {
    return null;
  }

  const fit = buildF1VesselFitResult({
    totalVolumeMl: setup.totalVolumeMl,
    vessel: selectedVessel,
  });

  if (selectedVessel.f1Suitability === "not_recommended") {
    return {
      id: "baseline-vessel-material-warning",
      category: "vessel_recommendation",
      priority: 92,
      title: "Vessel material is not a good F1 default",
      summary: "Reactive or uncertain materials deserve stronger caution with acidic kombucha.",
      explanation:
        "Glass and stainless are the safest defaults. If you keep this vessel, treat it as a caution case rather than a routine recommendation.",
      sourceType: "baseline",
      confidence: "high",
      evidenceCount: 0,
      recommendationType: "caution",
      cautionLevel: "high",
    };
  }

  if (selectedVessel.f1Suitability === "caution") {
    return {
      id: "baseline-vessel-material-caution",
      category: "vessel_recommendation",
      priority: 68,
      title: "Vessel material deserves a quick double-check",
      summary:
        "Food-safe glass and stainless are the simplest defaults. This material can work, but it is less routine.",
      explanation:
        "For F1, the app prefers vessel materials that are clearly food-safe and easy to clean. This is a mild caution, not an automatic rejection.",
      sourceType: "baseline",
      confidence: "moderate",
      evidenceCount: 0,
      recommendationType: "caution",
      cautionLevel: "moderate",
    };
  }

  if (fit.fitState === "overfilled") {
    return {
      id: "baseline-vessel-fit-overfilled",
      category: "fit_note",
      priority: 85,
      title: "The vessel looks overfilled for this plan",
      summary:
        "It is safer to leave working space instead of filling right to the practical limit.",
      explanation:
        "The app can suggest leaving working room in the vessel, even though one exact headspace percentage is not settled science.",
      sourceType: "baseline",
      confidence: "high",
      evidenceCount: 0,
      recommendationType: "caution",
      cautionLevel: "high",
    };
  }

  if (fit.fitState === "tight_fit") {
    return {
      id: "baseline-vessel-fit-tight",
      category: "fit_note",
      priority: 62,
      title: "The vessel fit is tight",
      summary: "This setup is close to the vessel's recommended fill limit.",
      explanation:
        "A little extra working room can make an F1 setup calmer to manage, even though there is not one single scientific headspace number.",
      sourceType: "baseline",
      confidence: "high",
      evidenceCount: 0,
      recommendationType: "note",
      cautionLevel: "moderate",
    };
  }

  return {
    id: "baseline-vessel-standard",
    category: "vessel_recommendation",
    priority: 32,
    title: "Vessel looks like a sensible F1 default",
    summary:
      "Glass and stainless are the safest defaults, and food-safe vessels with working room are calm choices for F1.",
    explanation:
      fit.plainLanguageSummary +
      " F1 should stay aerobic, so the goal here is a sensible open-brew setup rather than a sealed-pressure rule.",
    sourceType: "baseline",
    confidence: "moderate",
    evidenceCount: 0,
    recommendationType: "affirm",
    cautionLevel: "none",
  };
}

function buildTimingCard(timing: BatchTimingResult | null): F1RecommendationCard | null {
  if (!timing || timing.stageKey !== "f1_active") {
    return null;
  }

  return {
    id: "baseline-timing-expectation",
    category: "timing_expectation",
    priority: 40,
    title: "Timing baseline is still an estimate",
    summary: `This setup points to a first tasting window around Day ${timing.windowStartDay}-${timing.windowEndDay}.`,
    explanation:
      `${timing.explanation} Practical F1 expectations often center around roughly 7 to 10 days, but temperature and starter ratio can move that window.`,
    sourceType: "baseline",
    confidence: "moderate",
    evidenceCount: 0,
    recommendationType: "timing",
    cautionLevel: "none",
  };
}

export function buildF1BaselineRecommendationCards(args: {
  setup: F1BatchSetupFields;
  selectedVessel?: SelectedF1Vessel | null;
  timing?: BatchTimingResult | null;
}) {
  const metrics = buildF1BaselineMetrics(args.setup);
  const cards: F1RecommendationCard[] = [
    buildStarterCard(args.setup, metrics),
    buildSugarCard(args.setup, metrics),
    buildTeaAmountCard(args.setup, metrics),
    buildTeaBaseCard(metrics),
  ];

  const vesselCard = buildVesselCard(args.setup, args.selectedVessel);
  if (vesselCard) {
    cards.push(vesselCard);
  }

  const timingCard = buildTimingCard(args.timing || null);
  if (timingCard) {
    cards.push(timingCard);
  }

  return { metrics, cards };
}
