import { describe, expect, it } from "vitest";
import type {
  F2BottleGroupDraft,
  F2RecipeItemDraft,
  FlavourPresetSummary,
} from "@/lib/f2-types";
import { calculateF2SetupSummary } from "@/lib/f2-planner";

function makeRecipeItem(
  overrides: Partial<F2RecipeItemDraft> = {}
): F2RecipeItemDraft {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    customIngredientName: overrides.customIngredientName ?? "Orange juice",
    ingredientForm: overrides.ingredientForm ?? "juice",
    amountPer500: overrides.amountPer500 ?? 40,
    unit: overrides.unit ?? "ml",
    prepNotes: overrides.prepNotes ?? "",
    displacesVolume: overrides.displacesVolume ?? true,
    flavourPresetId: overrides.flavourPresetId,
  };
}

function makeBottleGroup(
  overrides: Partial<F2BottleGroupDraft> = {}
): F2BottleGroupDraft {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    bottleCount: overrides.bottleCount ?? 2,
    bottleSizeMl: overrides.bottleSizeMl ?? 500,
    bottleType: overrides.bottleType ?? "swing_top",
    headspaceMl: overrides.headspaceMl ?? 20,
    groupLabel: overrides.groupLabel ?? "Citrus group",
    recipe:
      overrides.recipe ?? {
        mode: "custom",
        guidedMode: false,
        recipeName: "Citrus",
        recipeDescription: "",
        saveRecipe: false,
        selectedRecipeId: null,
        recipeItems: [makeRecipeItem()],
      },
  };
}

const FLAVOUR_PRESET_MAP: Record<string, FlavourPresetSummary> = {};

describe("calculateF2SetupSummary", () => {
  it("multiplies ingredient totals by bottle count", () => {
    const summary = calculateF2SetupSummary({
      totalF1AvailableMl: 4000,
      reserveForStarterMl: 500,
      ambientTempC: 24,
      desiredCarbonationLevel: "balanced",
      flavourPresetMap: FLAVOUR_PRESET_MAP,
      bottleGroups: [
        makeBottleGroup({
          bottleCount: 3,
          recipe: {
            mode: "custom",
            guidedMode: false,
            recipeName: "Orange",
            recipeDescription: "",
            saveRecipe: false,
            selectedRecipeId: null,
            recipeItems: [makeRecipeItem({ amountPer500: 40, unit: "ml" })],
          },
        }),
      ],
    });

    expect(summary.ingredientTotals).toEqual([
      { name: "Orange juice", unit: "ml", totalAmount: 115.2 },
    ]);
    expect(summary.bottleGroupPlans[0].ingredientTotalsForGroup).toEqual([
      { name: "Orange juice", unit: "ml", totalAmount: 115.2 },
    ]);
  });

  it("supports multiple groups using different recipes in one batch", () => {
    const summary = calculateF2SetupSummary({
      totalF1AvailableMl: 5000,
      reserveForStarterMl: 500,
      ambientTempC: 24,
      desiredCarbonationLevel: "balanced",
      flavourPresetMap: FLAVOUR_PRESET_MAP,
      bottleGroups: [
        makeBottleGroup({
          bottleCount: 3,
          groupLabel: "Orange",
          recipe: {
            mode: "custom",
            guidedMode: false,
            recipeName: "Orange",
            recipeDescription: "",
            saveRecipe: false,
            selectedRecipeId: null,
            recipeItems: [makeRecipeItem({ customIngredientName: "Orange juice", amountPer500: 40 })],
          },
        }),
        makeBottleGroup({
          bottleCount: 2,
          groupLabel: "Ginger",
          recipe: {
            mode: "custom",
            guidedMode: false,
            recipeName: "Ginger",
            recipeDescription: "",
            saveRecipe: false,
            selectedRecipeId: null,
            recipeItems: [makeRecipeItem({ customIngredientName: "Ginger syrup", amountPer500: 20 })],
          },
        }),
      ],
    });

    expect(summary.ingredientTotals).toEqual([
      { name: "Orange juice", unit: "ml", totalAmount: 115.2 },
      { name: "Ginger syrup", unit: "ml", totalAmount: 38.4 },
    ]);
    expect(summary.bottleGroupPlans[0].recipeName).toBe("Orange");
    expect(summary.bottleGroupPlans[1].recipeName).toBe("Ginger");
  });

  it("handles one unflavoured group and one flavoured group", () => {
    const summary = calculateF2SetupSummary({
      totalF1AvailableMl: 3500,
      reserveForStarterMl: 300,
      ambientTempC: 23,
      desiredCarbonationLevel: "balanced",
      flavourPresetMap: FLAVOUR_PRESET_MAP,
      bottleGroups: [
        makeBottleGroup({
          bottleCount: 1,
          groupLabel: "Tester",
          recipe: {
            mode: "none",
            guidedMode: true,
            selectedRecipeId: null,
            recipeName: "",
            recipeDescription: "",
            saveRecipe: false,
            recipeItems: [],
          },
        }),
        makeBottleGroup({
          bottleCount: 2,
          groupLabel: "Berry",
          recipe: {
            mode: "custom",
            guidedMode: false,
            recipeName: "Berry",
            recipeDescription: "",
            saveRecipe: false,
            selectedRecipeId: null,
            recipeItems: [makeRecipeItem({ customIngredientName: "Berry puree", amountPer500: 30 })],
          },
        }),
      ],
    });

    expect(summary.validationErrors).toEqual([]);
    expect(summary.bottleGroupPlans[0].scaledItemsPerBottle).toEqual([]);
    expect(summary.bottleGroupPlans[0].kombuchaMlPerBottle).toBe(480);
    expect(summary.ingredientTotals).toEqual([
      { name: "Berry puree", unit: "ml", totalAmount: 57.6 },
    ]);
  });

  it("tracks total kombucha usage across mixed groups", () => {
    const summary = calculateF2SetupSummary({
      totalF1AvailableMl: 4200,
      reserveForStarterMl: 400,
      ambientTempC: 24,
      desiredCarbonationLevel: "balanced",
      flavourPresetMap: FLAVOUR_PRESET_MAP,
      bottleGroups: [
        makeBottleGroup({
          bottleCount: 4,
          recipe: {
            mode: "custom",
            guidedMode: false,
            recipeName: "Orange",
            recipeDescription: "",
            saveRecipe: false,
            selectedRecipeId: null,
            recipeItems: [makeRecipeItem({ amountPer500: 40 })],
          },
        }),
        makeBottleGroup({
          bottleCount: 2,
          bottleSizeMl: 330,
          headspaceMl: 15,
          recipe: {
            mode: "none",
            guidedMode: true,
            recipeName: "",
            recipeDescription: "",
            saveRecipe: false,
            selectedRecipeId: null,
            recipeItems: [],
          },
        }),
      ],
    });

    expect(summary.totalKombuchaNeededMl).toBeCloseTo(2396.4, 5);
    expect(summary.remainingBottlingVolumeMl).toBeCloseTo(1403.6, 5);
    expect(summary.totalBottleCount).toBe(6);
  });
});
