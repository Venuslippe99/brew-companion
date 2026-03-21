export type F2BottleType =
  | "swing_top"
  | "crown_cap"
  | "screw_cap"
  | "plastic_test_bottle"
  | "other";

export type F2IngredientForm =
  | "juice"
  | "puree"
  | "whole_fruit"
  | "syrup"
  | "herbs_spices"
  | "other";

export type F2CarbonationLevel = "light" | "balanced" | "strong";
export type F2RiskLevel = "low" | "moderate" | "high";
export type F2RecipeSourceTab = "my" | "presets" | "create";

export type F2BottleGroupDraft = {
  id: string;
  bottleCount: number;
  bottleSizeMl: number;
  bottleType: F2BottleType;
  headspaceMl: number;
  groupLabel?: string;
};

export type F2RecipeItemDraft = {
  id: string;
  flavourPresetId?: string;
  customIngredientName?: string;
  ingredientForm?: F2IngredientForm;
  amountPer500: number;
  unit: string;
  prepNotes?: string;
  displacesVolume?: boolean;
};

export type F2RecipeDraft = {
  id?: string;
  name: string;
  description?: string;
  isPreset?: boolean;
  items: F2RecipeItemDraft[];
};

export type F2SetupDraft = {
  reserveForSedimentMl: number;
  ambientTempC: number;
  desiredCarbonationLevel: F2CarbonationLevel;
  bottleGroups: F2BottleGroupDraft[];
  selectedRecipe?: F2RecipeDraft;
  saveRecipe: boolean;
};

export type F2ScaledRecipeItem = F2RecipeItemDraft & {
  scaledAmount: number;
};

export type F2BottlePlan = {
  targetFillMl: number;
  totalLiquidAdditionsMl: number;
  kombuchaMl: number;
  scaledItems: F2ScaledRecipeItem[];
};

export type F2BottleGroupPlan = {
  groupId: string;
  bottleCount: number;
  bottleSizeMl: number;
  bottleType: F2BottleType;
  headspaceMl: number;
  targetFillMlPerBottle: number;
  kombuchaMlPerBottle: number;
  scaledItemsPerBottle: F2ScaledRecipeItem[];
  totalKombuchaMl: number;
};

export type F2IngredientTotal = {
  name: string;
  unit: string;
  totalAmount: number;
};

export type F2SetupSummary = {
  availableF1VolumeMl: number;
  totalBottleCount: number;
  totalPlannedBottleVolumeMl: number;
  totalTargetFillMl: number;
  totalKombuchaNeededMl: number;
  remainingVolumeMl: number;
  ingredientTotals: F2IngredientTotal[];
  bottleGroupPlans: F2BottleGroupPlan[];
  validationErrors: string[];
  riskLevel: F2RiskLevel;
  riskNotes: string[];
};

export type FlavourPresetSummary = {
  id: string;
  name: string;
  displayName?: string | null;
  defaultUnit: string;
  recommendedDefaultPer500?: number | null;
  recommendedMaxPer500?: number | null;
  carbonationTendency: number;
  isLiquid?: boolean | null;
};

export type F2RecipeSummary = {
  id: string;
  name: string;
  description?: string | null;
  isPreset: boolean;
};
