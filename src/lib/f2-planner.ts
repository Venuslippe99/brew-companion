import type {
  F2BottleGroupDraft,
  F2RecipeItemDraft,
  F2ScaledRecipeItem,
  F2BottlePlan,
  F2BottleGroupPlan,
  F2IngredientTotal,
  F2SetupSummary,
  F2RiskLevel,
} from "@/lib/f2-types";

export function calculateTargetFillMl(bottleSizeMl: number, headspaceMl: number) {
  return Math.max(0, bottleSizeMl - headspaceMl);
}

export function scaleAmountPer500(amountPer500: number, targetFillMl: number) {
  return (amountPer500 * targetFillMl) / 500;
}

function isLiquidUnit(unit: string) {
  const normalized = unit.trim().toLowerCase();
  return normalized === "ml" || normalized === "millilitre" || normalized === "milliliter";
}

function getIngredientDisplayName(item: F2RecipeItemDraft) {
  return item.customIngredientName?.trim() || "Ingredient";
}

export function calculateBottlePlan(
  bottleSizeMl: number,
  headspaceMl: number,
  recipeItems: F2RecipeItemDraft[]
): F2BottlePlan {
  const targetFillMl = calculateTargetFillMl(bottleSizeMl, headspaceMl);

  const scaledItems: F2ScaledRecipeItem[] = recipeItems.map((item) => ({
    ...item,
    scaledAmount: scaleAmountPer500(item.amountPer500, targetFillMl),
  }));

  const totalLiquidAdditionsMl = scaledItems
    .filter((item) => isLiquidUnit(item.unit))
    .reduce((sum, item) => sum + item.scaledAmount, 0);

  const kombuchaMl = Math.max(0, targetFillMl - totalLiquidAdditionsMl);

  return {
    targetFillMl,
    totalLiquidAdditionsMl,
    kombuchaMl,
    scaledItems,
  };
}

function mergeIngredientTotals(
  totals: Map<string, F2IngredientTotal>,
  item: F2ScaledRecipeItem
) {
  const name = getIngredientDisplayName(item);
  const key = `${name}__${item.unit}`;

  const existing = totals.get(key);

  if (existing) {
    existing.totalAmount += item.scaledAmount;
    return;
  }

  totals.set(key, {
    name,
    unit: item.unit,
    totalAmount: item.scaledAmount,
  });
}

function getRiskLevel(
  ambientTempC: number,
  bottleGroups: F2BottleGroupDraft[],
  recipeItems: F2RecipeItemDraft[]
): { riskLevel: F2RiskLevel; riskNotes: string[] } {
  const notes: string[] = [];
  let score = 0;

  const hasPlasticTestBottle = bottleGroups.some(
    (group) => group.bottleType === "plastic_test_bottle"
  );

  const liquidSugarLoad = recipeItems
    .filter((item) => isLiquidUnit(item.unit))
    .reduce((sum, item) => sum + item.amountPer500, 0);

  if (ambientTempC >= 26) {
    score += 2;
    notes.push("Warm room temperature can speed up carbonation.");
  } else if (ambientTempC >= 23) {
    score += 1;
    notes.push("Moderately warm room temperature can increase carbonation speed.");
  }

  if (liquidSugarLoad >= 80) {
    score += 2;
    notes.push("High liquid additions may increase carbonation pressure.");
  } else if (liquidSugarLoad >= 40) {
    score += 1;
    notes.push("Moderate liquid additions may increase carbonation pressure.");
  }

  const hasMostlyGlassBottles = bottleGroups.some(
    (group) => group.bottleType === "swing_top" || group.bottleType === "crown_cap"
  );

  if (hasMostlyGlassBottles && !hasPlasticTestBottle) {
    score += 1;
    notes.push("Consider using one plastic test bottle to judge carbonation safely.");
  }

  if (score >= 4) {
    return {
      riskLevel: "high",
      riskNotes: notes.length > 0 ? notes : ["High carbonation risk."],
    };
  }

  if (score >= 2) {
    return {
      riskLevel: "moderate",
      riskNotes: notes.length > 0 ? notes : ["Moderate carbonation risk."],
    };
  }

  return {
    riskLevel: "low",
    riskNotes: notes.length > 0 ? notes : ["Low carbonation risk."],
  };
}

export function calculateF2SetupSummary(args: {
  totalBatchVolumeMl: number;
  reserveForSedimentMl: number;
  ambientTempC: number;
  bottleGroups: F2BottleGroupDraft[];
  recipeItems: F2RecipeItemDraft[];
}): F2SetupSummary {
  const {
    totalBatchVolumeMl,
    reserveForSedimentMl,
    ambientTempC,
    bottleGroups,
    recipeItems,
  } = args;

  const availableF1VolumeMl = Math.max(0, totalBatchVolumeMl - reserveForSedimentMl);

  const validationErrors: string[] = [];
  const ingredientTotalsMap = new Map<string, F2IngredientTotal>();
  const bottleGroupPlans: F2BottleGroupPlan[] = [];

  let totalBottleCount = 0;
  let totalPlannedBottleVolumeMl = 0;
  let totalTargetFillMl = 0;
  let totalKombuchaNeededMl = 0;

  for (const group of bottleGroups) {
    if (group.bottleCount <= 0) {
      validationErrors.push("Each bottle group must have at least 1 bottle.");
      continue;
    }

    if (group.bottleSizeMl <= 0) {
      validationErrors.push("Bottle size must be greater than 0.");
      continue;
    }

    if (group.headspaceMl < 0) {
      validationErrors.push("Headspace cannot be negative.");
      continue;
    }

    const bottlePlan = calculateBottlePlan(
      group.bottleSizeMl,
      group.headspaceMl,
      recipeItems
    );

    if (bottlePlan.targetFillMl <= 0) {
      validationErrors.push(
        `Bottle size ${group.bottleSizeMl}ml is too small for headspace ${group.headspaceMl}ml.`
      );
    }

    for (const item of bottlePlan.scaledItems) {
      mergeIngredientTotals(ingredientTotalsMap, item);
    }

    const groupTotalKombuchaMl = bottlePlan.kombuchaMl * group.bottleCount;

    bottleGroupPlans.push({
      groupId: group.id,
      bottleCount: group.bottleCount,
      bottleSizeMl: group.bottleSizeMl,
      bottleType: group.bottleType,
      headspaceMl: group.headspaceMl,
      targetFillMlPerBottle: bottlePlan.targetFillMl,
      kombuchaMlPerBottle: bottlePlan.kombuchaMl,
      scaledItemsPerBottle: bottlePlan.scaledItems,
      totalKombuchaMl: groupTotalKombuchaMl,
    });

    totalBottleCount += group.bottleCount;
    totalPlannedBottleVolumeMl += group.bottleSizeMl * group.bottleCount;
    totalTargetFillMl += bottlePlan.targetFillMl * group.bottleCount;
    totalKombuchaNeededMl += groupTotalKombuchaMl;
  }

  const remainingVolumeMl = availableF1VolumeMl - totalKombuchaNeededMl;

  if (bottleGroups.length === 0) {
    validationErrors.push("Add at least one bottle group.");
  }

  if (recipeItems.length === 0) {
    validationErrors.push("Add at least one recipe ingredient.");
  }

  if (remainingVolumeMl < 0) {
    validationErrors.push("Your bottle plan uses more kombucha than your F1 batch can provide.");
  }

  const { riskLevel, riskNotes } = getRiskLevel(ambientTempC, bottleGroups, recipeItems);

  return {
    availableF1VolumeMl,
    totalBottleCount,
    totalPlannedBottleVolumeMl,
    totalTargetFillMl,
    totalKombuchaNeededMl,
    remainingVolumeMl,
    ingredientTotals: Array.from(ingredientTotalsMap.values()).map((item) => ({
      ...item,
      totalAmount: Number(item.totalAmount.toFixed(2)),
    })),
    bottleGroupPlans,
    validationErrors,
    riskLevel,
    riskNotes,
  };
}
