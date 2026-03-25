import { describe, expect, it } from "vitest";
import type {
  F2CarbonationLevel,
  F2ScaledRecipeItem,
} from "@/lib/f2-types";
import {
  buildBottleIngredientInsertRows,
  buildGroupRecipeSnapshot,
  buildSetupRecipeSnapshot,
} from "@/lib/f2-persistence";

function makeScaledItem(
  overrides: Partial<F2ScaledRecipeItem> = {}
): F2ScaledRecipeItem {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    customIngredientName: overrides.customIngredientName ?? "Orange juice",
    ingredientForm: overrides.ingredientForm ?? "juice",
    amountPer500: overrides.amountPer500 ?? 40,
    unit: overrides.unit ?? "ml",
    prepNotes: overrides.prepNotes ?? "",
    displacesVolume: overrides.displacesVolume ?? true,
    flavourPresetId: overrides.flavourPresetId,
    scaledAmount: overrides.scaledAmount ?? 38.4,
  };
}

function makeGroupSnapshotInput(args?: {
  mode?: "none" | "saved" | "preset" | "custom";
  selectedRecipeId?: string | null;
  guidedMode?: boolean;
  desiredCarbonationLevel?: F2CarbonationLevel;
  recipeName?: string | null;
  groupLabel?: string;
  effectiveRecipeItems?: F2ScaledRecipeItem[];
  recipeItemIdsByDraftId?: Record<string, string>;
}) {
  return {
    groupId: crypto.randomUUID(),
    groupLabel: args?.groupLabel ?? "Orange bottles",
    recipeMode: args?.mode ?? "custom",
    selectedRecipeId: args?.selectedRecipeId ?? null,
    guidedMode: args?.guidedMode ?? false,
    desiredCarbonationLevel: args?.desiredCarbonationLevel ?? "balanced",
    recipeName: args?.recipeName ?? "Orange",
    recipeDescription: "Bright citrus",
    effectiveRecipeItems: args?.effectiveRecipeItems ?? [makeScaledItem()],
    recipeItemIdsByDraftId: args?.recipeItemIdsByDraftId ?? {},
  };
}

describe("f2-persistence helpers", () => {
  it("builds group-level recipe snapshots with group-owned recipe identity", () => {
    const snapshot = buildGroupRecipeSnapshot(
      makeGroupSnapshotInput({
        mode: "saved",
        selectedRecipeId: "recipe-a",
        guidedMode: true,
        recipeItemIdsByDraftId: {},
      })
    ) as {
      recipeMode: string;
      selectedRecipeId: string | null;
      items: Array<{ recipeItemId: string | null }>;
    };

    expect(snapshot.recipeMode).toBe("saved");
    expect(snapshot.selectedRecipeId).toBe("recipe-a");
    expect(snapshot.items[0].recipeItemId).not.toBeNull();
  });

  it("builds setup snapshots that keep separate flavour plans per group", () => {
    const snapshot = buildSetupRecipeSnapshot({
      desiredCarbonationLevel: "balanced",
      groups: [
        makeGroupSnapshotInput({
          groupLabel: "Orange group",
          recipeName: "Orange",
        }),
        makeGroupSnapshotInput({
          groupLabel: "Ginger group",
          recipeName: "Ginger",
          effectiveRecipeItems: [
            makeScaledItem({
              customIngredientName: "Ginger syrup",
              scaledAmount: 19.2,
            }),
          ],
        }),
      ],
    }) as {
      groups: Array<{ groupLabel: string | null; recipeName: string | null }>;
    };

    expect(snapshot.groups).toHaveLength(2);
    expect(snapshot.groups[0].recipeName).toBe("Orange");
    expect(snapshot.groups[1].recipeName).toBe("Ginger");
  });

  it("builds bottle ingredient rows using each group's own recipe item ids", () => {
    const savedRows = buildBottleIngredientInsertRows({
      bottleId: "bottle-a",
      recipeMode: "saved",
      scaledItems: [
        makeScaledItem({
          id: "recipe-item-a",
          customIngredientName: "Orange juice",
          scaledAmount: 38.4,
        }),
      ],
    });

    const customRows = buildBottleIngredientInsertRows({
      bottleId: "bottle-b",
      recipeMode: "custom",
      recipeItemIdsByDraftId: {
        "draft-item-b": "saved-custom-item-b",
      },
      scaledItems: [
        makeScaledItem({
          id: "draft-item-b",
          customIngredientName: "Ginger syrup",
          scaledAmount: 19.2,
        }),
      ],
    });

    expect(savedRows[0].recipe_item_id).toBe("recipe-item-a");
    expect(customRows[0].recipe_item_id).toBe("saved-custom-item-b");
    expect(savedRows[0].amount_value).toBe(38.4);
    expect(customRows[0].amount_value).toBe(19.2);
  });

  it("leaves recipe item ids empty for unflavoured or unsaved custom groups", () => {
    const noneRows = buildBottleIngredientInsertRows({
      bottleId: "bottle-none",
      recipeMode: "none",
      scaledItems: [],
    });

    const customRows = buildBottleIngredientInsertRows({
      bottleId: "bottle-custom",
      recipeMode: "custom",
      scaledItems: [
        makeScaledItem({
          id: "draft-custom",
        }),
      ],
    });

    expect(noneRows).toEqual([]);
    expect(customRows[0].recipe_item_id).toBeNull();
  });
});
