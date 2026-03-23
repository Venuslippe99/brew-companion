import type { F1BatchSetupFields, F1TeaSourceForm, F1TeaAmountUnit } from "@/lib/f1-recipe-types";
import { buildF1VesselFitResult } from "@/lib/f1-vessel-fit";
import {
  getVesselFitLabel,
  getVesselMaterialLabel,
  getVesselSuitabilityLabel,
  type SelectedF1Vessel,
} from "@/lib/f1-vessel-types";

export type F1SetupSummary = {
  starterRatioPercent: number;
  teaProfile: string;
  sugarProfile: string;
  targetTaste: string;
  vesselProfile: string;
  fitSummary: string;
  fitStateLabel: string | null;
  suitabilityLabel: string | null;
  cautionNotes: string[];
  plainLanguageSummary: string;
};

function formatTeaSourceForm(value: F1TeaSourceForm) {
  switch (value) {
    case "tea_bags":
      return "tea bags";
    case "loose_leaf":
      return "loose leaf";
    default:
      return "other tea source";
  }
}

function formatTeaAmount(value: number, unit: F1TeaAmountUnit) {
  const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return `${rounded}${unit === "bags" ? " bag" + (Number(rounded) === 1 ? "" : "s") : ` ${unit}`}`;
}

export function buildF1SetupSummary(
  setup: F1BatchSetupFields,
  selectedVessel?: SelectedF1Vessel | null
): F1SetupSummary {
  const starterRatioPercent =
    setup.totalVolumeMl > 0
      ? Math.round((setup.starterLiquidMl / setup.totalVolumeMl) * 100)
      : 0;

  const teaProfile = `${setup.teaType} using ${formatTeaAmount(
    setup.teaAmountValue,
    setup.teaAmountUnit
  )} of ${formatTeaSourceForm(setup.teaSourceForm)}`;
  const sugarProfile = `${setup.sugarG}g ${setup.sugarType}`;
  const targetTaste = setup.targetPreference.replace(/_/g, " ");
  const fit = selectedVessel
    ? buildF1VesselFitResult({
        totalVolumeMl: setup.totalVolumeMl,
        vessel: selectedVessel,
      })
    : null;
  const vesselProfile = selectedVessel
    ? `${selectedVessel.name || "Manual vessel"} (${getVesselMaterialLabel(selectedVessel.materialType)})`
    : setup.vesselType;
  const fitSummary = fit ? fit.plainLanguageSummary : "No vessel fit guidance yet.";
  const fitStateLabel = fit?.fitState ? getVesselFitLabel(fit.fitState) : null;
  const suitabilityLabel = selectedVessel
    ? getVesselSuitabilityLabel(selectedVessel.f1Suitability)
    : null;
  const plainLanguageSummary = `${setup.totalVolumeMl}ml batch, ${starterRatioPercent}% starter, ${teaProfile.toLowerCase()}, ${sugarProfile.toLowerCase()}, aiming for a ${targetTaste} result. ${
    fit ? fit.plainLanguageSummary : `Using ${setup.vesselType.toLowerCase()} as the vessel.`
  }`;

  return {
    starterRatioPercent,
    teaProfile,
    sugarProfile,
    targetTaste,
    vesselProfile,
    fitSummary,
    fitStateLabel,
    suitabilityLabel,
    cautionNotes: fit?.cautionNotes || [],
    plainLanguageSummary,
  };
}
