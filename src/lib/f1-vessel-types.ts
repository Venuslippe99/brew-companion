import type { Enums } from "@/integrations/supabase/types";

export const FERMENTATION_VESSEL_MATERIALS = [
  "glass",
  "ceramic_glazed_food_safe",
  "food_grade_plastic",
  "unknown_plastic",
  "stainless_steel",
  "reactive_metal",
  "other",
] as const;

export const F1_VESSEL_SUITABILITY_STATES = [
  "recommended",
  "acceptable",
  "caution",
  "not_recommended",
] as const;

export const F1_VESSEL_FIT_STATES = [
  "roomy",
  "good_fit",
  "tight_fit",
  "overfilled",
] as const;

export type FermentationVesselMaterial = Enums<"fermentation_vessel_material_enum">;
export type F1VesselSuitability = Enums<"f1_vessel_suitability_enum">;
export type F1VesselFitState = Enums<"f1_vessel_fit_state_enum">;

export type FermentationVesselDraft = {
  name: string;
  materialType: FermentationVesselMaterial;
  capacityMl: number | null;
  recommendedMaxFillMl: number | null;
  f1Suitability: F1VesselSuitability;
  notes: string;
  isFavorite: boolean;
};

export type FermentationVessel = FermentationVesselDraft & {
  id: string;
  userId: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FermentationVesselSummary = FermentationVessel;

export type F1VesselSelectionSource = "saved" | "manual";

export type SelectedF1Vessel = {
  source: F1VesselSelectionSource;
  vesselId: string | null;
  name: string;
  materialType: FermentationVesselMaterial;
  capacityMl: number | null;
  recommendedMaxFillMl: number | null;
  f1Suitability: F1VesselSuitability;
  notes: string;
  isSaved: boolean;
};

export const LEGACY_VESSEL_TYPE_PRESETS = {
  "Glass jar": {
    name: "Glass jar",
    materialType: "glass",
    f1Suitability: "recommended",
  },
  "Ceramic crock": {
    name: "Ceramic crock",
    materialType: "ceramic_glazed_food_safe",
    f1Suitability: "acceptable",
  },
  "Food-grade plastic": {
    name: "Food-grade plastic",
    materialType: "food_grade_plastic",
    f1Suitability: "acceptable",
  },
} as const satisfies Record<
  string,
  {
    name: string;
    materialType: FermentationVesselMaterial;
    f1Suitability: F1VesselSuitability;
  }
>;

export function createEmptyFermentationVesselDraft(): FermentationVesselDraft {
  return {
    name: "",
    materialType: "glass",
    capacityMl: 4000,
    recommendedMaxFillMl: 3400,
    f1Suitability: "recommended",
    notes: "",
    isFavorite: false,
  };
}

export function createManualVesselSelection(
  legacyVesselType = "Glass jar"
): SelectedF1Vessel {
  const preset =
    LEGACY_VESSEL_TYPE_PRESETS[legacyVesselType] || LEGACY_VESSEL_TYPE_PRESETS["Glass jar"];

  return {
    source: "manual",
    vesselId: null,
    name: preset.name,
    materialType: preset.materialType,
    capacityMl: null,
    recommendedMaxFillMl: null,
    f1Suitability: preset.f1Suitability,
    notes: "",
    isSaved: false,
  };
}

export function buildSelectedVesselFromSaved(
  vessel: FermentationVesselSummary
): SelectedF1Vessel {
  return {
    source: "saved",
    vesselId: vessel.id,
    name: vessel.name,
    materialType: vessel.materialType,
    capacityMl: vessel.capacityMl,
    recommendedMaxFillMl: vessel.recommendedMaxFillMl,
    f1Suitability: vessel.f1Suitability,
    notes: vessel.notes,
    isSaved: true,
  };
}

export function buildSelectedVesselFromDraft(
  draft: FermentationVesselDraft
): SelectedF1Vessel {
  return {
    source: "manual",
    vesselId: null,
    name: draft.name.trim(),
    materialType: draft.materialType,
    capacityMl: draft.capacityMl,
    recommendedMaxFillMl: draft.recommendedMaxFillMl,
    f1Suitability: draft.f1Suitability,
    notes: draft.notes,
    isSaved: false,
  };
}

export function getVesselMaterialLabel(materialType: FermentationVesselMaterial): string {
  switch (materialType) {
    case "glass":
      return "Glass";
    case "ceramic_glazed_food_safe":
      return "Glazed food-safe ceramic";
    case "food_grade_plastic":
      return "Food-grade plastic";
    case "unknown_plastic":
      return "Unknown plastic";
    case "stainless_steel":
      return "Stainless steel";
    case "reactive_metal":
      return "Reactive metal";
    default:
      return "Other";
  }
}

export function getVesselSuitabilityLabel(suitability: F1VesselSuitability): string {
  switch (suitability) {
    case "recommended":
      return "Recommended";
    case "acceptable":
      return "Acceptable";
    case "caution":
      return "Caution";
    default:
      return "Not recommended";
  }
}

export function getVesselFitLabel(fitState: F1VesselFitState): string {
  switch (fitState) {
    case "roomy":
      return "Roomy";
    case "good_fit":
      return "Good fit";
    case "tight_fit":
      return "Tight fit";
    default:
      return "Overfilled";
  }
}

export function getDefaultSuitabilityForMaterial(
  materialType: FermentationVesselMaterial
): F1VesselSuitability {
  switch (materialType) {
    case "glass":
      return "recommended";
    case "ceramic_glazed_food_safe":
    case "food_grade_plastic":
    case "stainless_steel":
      return "acceptable";
    case "unknown_plastic":
    case "other":
      return "caution";
    case "reactive_metal":
      return "not_recommended";
    default:
      return "acceptable";
  }
}

export function getLegacyVesselTypeLabel(selection: SelectedF1Vessel): string {
  const materialLabel = getVesselMaterialLabel(selection.materialType);
  if (selection.name.trim()) {
    return selection.name.trim();
  }
  return materialLabel;
}
