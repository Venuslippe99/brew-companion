export const F1_TEA_TYPES = [
  "Black tea",
  "Green tea",
  "Oolong tea",
  "White tea",
  "Black & green blend",
  "Green & white blend",
] as const;

export const F1_VESSEL_TYPES = [
  "Glass jar",
  "Ceramic crock",
  "Food-grade plastic",
] as const;

export const F1_TARGET_PREFERENCES = ["sweeter", "balanced", "tart"] as const;

export const F1_TEA_SOURCE_FORMS = ["tea_bags", "loose_leaf", "other"] as const;
export const F1_TEA_AMOUNT_UNITS = ["bags", "g", "tbsp", "tsp"] as const;
export const F1_SUGAR_TYPES = [
  "Cane sugar",
  "Organic cane sugar",
  "White sugar",
  "Raw sugar",
  "Brown sugar",
  "Other",
] as const;
export const F1_SUGAR_AMOUNT_UNITS = ["g"] as const;

export type F1TeaType = (typeof F1_TEA_TYPES)[number];
export type F1VesselType = (typeof F1_VESSEL_TYPES)[number];
export type F1TargetPreference = (typeof F1_TARGET_PREFERENCES)[number];
export type F1TeaSourceForm = (typeof F1_TEA_SOURCE_FORMS)[number];
export type F1TeaAmountUnit = (typeof F1_TEA_AMOUNT_UNITS)[number];
export type F1SugarType = (typeof F1_SUGAR_TYPES)[number];
export type F1SugarAmountUnit = (typeof F1_SUGAR_AMOUNT_UNITS)[number];

export type F1RecipeDraft = {
  name: string;
  description: string;
  targetTotalVolumeMl: number;
  teaType: F1TeaType | string;
  teaSourceForm: F1TeaSourceForm;
  teaAmountValue: number;
  teaAmountUnit: F1TeaAmountUnit;
  sugarType: F1SugarType | string;
  sugarAmountValue: number;
  sugarAmountUnit: F1SugarAmountUnit;
  defaultStarterLiquidMl: number;
  defaultScobyPresent: boolean;
  targetPreference: F1TargetPreference;
  defaultRoomTempC: number | null;
  defaultNotes: string;
  preferredVesselId: string | null;
  isFavorite: boolean;
};

export type F1Recipe = F1RecipeDraft & {
  id: string;
  userId: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type F1RecipeSummary = Pick<
  F1Recipe,
  | "id"
  | "name"
  | "description"
  | "targetTotalVolumeMl"
  | "teaType"
  | "teaSourceForm"
  | "teaAmountValue"
  | "teaAmountUnit"
  | "sugarType"
  | "sugarAmountValue"
  | "sugarAmountUnit"
  | "defaultStarterLiquidMl"
  | "defaultScobyPresent"
  | "targetPreference"
  | "defaultRoomTempC"
  | "defaultNotes"
  | "preferredVesselId"
  | "isFavorite"
  | "archivedAt"
  | "updatedAt"
>;

export type F1BatchSetupFields = {
  totalVolumeMl: number;
  teaType: string;
  teaSourceForm: F1TeaSourceForm;
  teaAmountValue: number;
  teaAmountUnit: F1TeaAmountUnit;
  sugarG: number;
  sugarType: string;
  starterLiquidMl: number;
  scobyPresent: boolean;
  avgRoomTempC: number;
  vesselType: string;
  targetPreference: F1TargetPreference;
  initialNotes: string;
};

export function createEmptyF1RecipeDraft(): F1RecipeDraft {
  return {
    name: "",
    description: "",
    targetTotalVolumeMl: 3800,
    teaType: "Black tea",
    teaSourceForm: "tea_bags",
    teaAmountValue: 8,
    teaAmountUnit: "bags",
    sugarType: "Cane sugar",
    sugarAmountValue: 200,
    sugarAmountUnit: "g",
    defaultStarterLiquidMl: 380,
    defaultScobyPresent: true,
    targetPreference: "balanced",
    defaultRoomTempC: 23,
    defaultNotes: "",
    preferredVesselId: null,
    isFavorite: false,
  };
}

export function buildRecipeDraftFromBatchSetup(
  setup: F1BatchSetupFields,
  overrides?: Partial<F1RecipeDraft>
): F1RecipeDraft {
  return {
    ...createEmptyF1RecipeDraft(),
    targetTotalVolumeMl: setup.totalVolumeMl,
    teaType: setup.teaType,
    teaSourceForm: setup.teaSourceForm,
    teaAmountValue: setup.teaAmountValue,
    teaAmountUnit: setup.teaAmountUnit,
    sugarType: setup.sugarType,
    sugarAmountValue: setup.sugarG,
    sugarAmountUnit: "g",
    defaultStarterLiquidMl: setup.starterLiquidMl,
    defaultScobyPresent: setup.scobyPresent,
    targetPreference: setup.targetPreference,
    defaultRoomTempC: setup.avgRoomTempC,
    defaultNotes: setup.initialNotes,
    ...overrides,
  };
}

export function applyRecipeToBatchSetup(recipe: F1RecipeSummary): Pick<
  F1BatchSetupFields,
  | "totalVolumeMl"
  | "teaType"
  | "teaSourceForm"
  | "teaAmountValue"
  | "teaAmountUnit"
  | "sugarG"
  | "sugarType"
  | "starterLiquidMl"
  | "scobyPresent"
  | "avgRoomTempC"
  | "targetPreference"
  | "initialNotes"
> {
  return {
    totalVolumeMl: recipe.targetTotalVolumeMl,
    teaType: recipe.teaType,
    teaSourceForm: recipe.teaSourceForm,
    teaAmountValue: recipe.teaAmountValue,
    teaAmountUnit: recipe.teaAmountUnit,
    sugarG: recipe.sugarAmountValue,
    sugarType: recipe.sugarType,
    starterLiquidMl: recipe.defaultStarterLiquidMl,
    scobyPresent: recipe.defaultScobyPresent,
    avgRoomTempC: recipe.defaultRoomTempC ?? 23,
    targetPreference: recipe.targetPreference,
    initialNotes: recipe.defaultNotes,
  };
}
