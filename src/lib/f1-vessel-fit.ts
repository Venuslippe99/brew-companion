import type { SelectedF1Vessel } from "@/lib/f1-vessel-types";

export type F1VesselFitResult = {
  fillRatio: number | null;
  fillRatioPercent: number | null;
  recommendedMaxFillMl: number | null;
  fitState: "roomy" | "good_fit" | "tight_fit" | "overfilled" | null;
  suitabilityState: SelectedF1Vessel["f1Suitability"];
  plainLanguageSummary: string;
  cautionNotes: string[];
};

export function buildF1VesselFitResult(args: {
  totalVolumeMl: number;
  vessel: SelectedF1Vessel;
}): F1VesselFitResult {
  const { totalVolumeMl, vessel } = args;
  const cautionNotes: string[] = [];
  const recommendedMaxFillMl =
    vessel.recommendedMaxFillMl ||
    (vessel.capacityMl ? Math.round(vessel.capacityMl * 0.85) : null);

  let fitState: F1VesselFitResult["fitState"] = null;
  let fillRatio: number | null = null;
  let fillRatioPercent: number | null = null;

  if (recommendedMaxFillMl && totalVolumeMl > 0) {
    fillRatio = totalVolumeMl / recommendedMaxFillMl;
    fillRatioPercent = Math.round(fillRatio * 100);

    if (fillRatio <= 0.7) {
      fitState = "roomy";
    } else if (fillRatio <= 0.92) {
      fitState = "good_fit";
    } else if (fillRatio <= 1) {
      fitState = "tight_fit";
    } else {
      fitState = "overfilled";
    }
  }

  if (vessel.capacityMl && totalVolumeMl > vessel.capacityMl) {
    cautionNotes.push("Planned volume is above the vessel's full capacity.");
  } else if (fitState === "overfilled") {
    cautionNotes.push("Planned volume is above the vessel's recommended max fill.");
  } else if (fitState === "tight_fit") {
    cautionNotes.push("This setup is close to the vessel's recommended fill limit.");
  }

  if (vessel.f1Suitability === "caution") {
    cautionNotes.push(
      "This vessel material can work, but it is worth double-checking that it is food-safe and easy to clean."
    );
  }

  if (vessel.f1Suitability === "not_recommended") {
    cautionNotes.push(
      "This vessel material is not a good default for F1 and may react poorly with acidic kombucha."
    );
  }

  let plainLanguageSummary = `${vessel.name || "Selected vessel"} is being used for this batch.`;

  if (recommendedMaxFillMl && fillRatioPercent !== null) {
    plainLanguageSummary = `${vessel.name || "Selected vessel"} is at about ${fillRatioPercent}% of its recommended fill, which looks ${
      fitState === "roomy"
        ? "roomy"
        : fitState === "good_fit"
          ? "like a good fit"
          : fitState === "tight_fit"
            ? "tight but workable"
            : "too full"
    }.`;
  } else if (!vessel.capacityMl) {
    plainLanguageSummary = `${vessel.name || "Selected vessel"} is selected, but add a capacity to check fit guidance.`;
  }

  return {
    fillRatio,
    fillRatioPercent,
    recommendedMaxFillMl,
    fitState,
    suitabilityState: vessel.f1Suitability,
    plainLanguageSummary,
    cautionNotes,
  };
}
