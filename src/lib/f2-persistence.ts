import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import type { KombuchaBatch } from "@/lib/batches";
import type {
  F2BottleGroupDraft,
  F2CarbonationLevel,
  F2GroupRecipeMode,
  F2RecipeItemDraft,
  F2ScaledRecipeItem,
  F2SetupSummary,
} from "@/lib/f2-types";

type StartF2Args = {
  batch: KombuchaBatch;
  userId: string;
  reserveForStarterMl: number;
  ambientTempC: number;
  desiredCarbonationLevel: F2CarbonationLevel;
  bottleGroups: F2BottleGroupDraft[];
  summary: F2SetupSummary;
};

type StartF2Result = {
  f2StartedAt: string;
  nextAction: string;
  setupId: string;
};

type PersistedGroupRecipe = {
  groupId: string;
  recipeMode: F2GroupRecipeMode;
  selectedRecipeId: string | null;
  guidedMode: boolean;
  recipeName: string | null;
  recipeDescription: string | null;
  recipeSnapshot: Json;
  recipeItemIdsByDraftId: Record<string, string>;
};

export type PersistedGroupRecipeInput = {
  groupId: string;
  groupLabel?: string;
  recipeMode: F2GroupRecipeMode;
  selectedRecipeId?: string | null;
  guidedMode: boolean;
  desiredCarbonationLevel: F2CarbonationLevel;
  recipeName?: string | null;
  recipeDescription?: string | null;
  effectiveRecipeItems: F2RecipeItemDraft[];
  recipeItemIdsByDraftId?: Record<string, string>;
};

export type SetupRecipeSnapshotInput = {
  desiredCarbonationLevel: F2CarbonationLevel;
  groups: PersistedGroupRecipeInput[];
};

export type BottleIngredientInsertArgs = {
  bottleId: string;
  recipeMode: F2GroupRecipeMode;
  scaledItems: F2ScaledRecipeItem[];
  recipeItemIdsByDraftId?: Record<string, string>;
};

function round2(value: number) {
  return Number(value.toFixed(2));
}

function toInt(value: number) {
  return Math.round(value);
}

function isIngredientForm(
  value?: string
): "juice" | "puree" | "whole_fruit" | "syrup" | "herbs_spices" | "other" | null {
  if (
    value === "juice" ||
    value === "puree" ||
    value === "whole_fruit" ||
    value === "syrup" ||
    value === "herbs_spices" ||
    value === "other"
  ) {
    return value;
  }

  return null;
}

function getGroupRecipeDisplayName(args: {
  recipeMode: F2GroupRecipeMode;
  recipeName?: string | null;
  groupLabel?: string;
  groupIndex?: number;
}) {
  const { recipeMode, recipeName, groupLabel, groupIndex } = args;
  const normalizedRecipeName = recipeName?.trim();
  const normalizedGroupLabel = groupLabel?.trim();

  if (normalizedRecipeName) {
    return normalizedRecipeName;
  }

  if (recipeMode === "none") {
    return normalizedGroupLabel || `Group ${groupIndex ?? 0}`;
  }

  return normalizedGroupLabel || `Group ${groupIndex ?? 0} flavour plan`;
}

export function buildGroupRecipeSnapshot(
  args: PersistedGroupRecipeInput
): Json {
  const {
    groupId,
    groupLabel,
    recipeMode,
    selectedRecipeId,
    guidedMode,
    desiredCarbonationLevel,
    recipeName,
    recipeDescription,
    effectiveRecipeItems,
    recipeItemIdsByDraftId = {},
  } = args;

  return {
    groupId,
    groupLabel: groupLabel?.trim() || null,
    recipeMode,
    guidedMode,
    desiredCarbonationLevel,
    recipeName: recipeName?.trim() || null,
    recipeDescription: recipeDescription?.trim() || null,
    selectedRecipeId: selectedRecipeId || null,
    items: effectiveRecipeItems.map((item, index) => ({
      sortOrder: index,
      recipeItemId:
        recipeItemIdsByDraftId[item.id] ||
        ((recipeMode === "saved" || recipeMode === "preset") ? item.id : null),
      flavourPresetId: item.flavourPresetId || null,
      customIngredientName: item.customIngredientName?.trim() || null,
      ingredientForm: item.ingredientForm || null,
      amountPer500: item.amountPer500,
      unit: item.unit,
      prepNotes: item.prepNotes?.trim() || null,
      displacesVolume: !!item.displacesVolume,
    })),
  } satisfies Json;
}

export function buildSetupRecipeSnapshot(args: SetupRecipeSnapshotInput): Json {
  const { desiredCarbonationLevel, groups } = args;

  return {
    desiredCarbonationLevel,
    groups: groups.map((group, index) => ({
      groupId: group.groupId,
      groupLabel: group.groupLabel?.trim() || null,
      recipeMode: group.recipeMode,
      selectedRecipeId: group.selectedRecipeId || null,
      guidedMode: group.guidedMode,
      recipeName:
        getGroupRecipeDisplayName({
          recipeMode: group.recipeMode,
          recipeName: group.recipeName,
          groupLabel: group.groupLabel,
          groupIndex: index + 1,
        }) || null,
      recipeDescription: group.recipeDescription?.trim() || null,
      recipeSnapshot: buildGroupRecipeSnapshot(group),
    })),
  } satisfies Json;
}

export function buildBottleIngredientInsertRows(
  args: BottleIngredientInsertArgs
): TablesInsert<"batch_bottle_ingredients">[] {
  const {
    bottleId,
    recipeMode,
    scaledItems,
    recipeItemIdsByDraftId = {},
  } = args;

  return scaledItems.map((item) => ({
    bottle_id: bottleId,
    recipe_item_id:
      recipeItemIdsByDraftId[item.id] ||
      ((recipeMode === "saved" || recipeMode === "preset") ? item.id : null),
    ingredient_name_snapshot: item.customIngredientName?.trim() || "Ingredient",
    ingredient_form: isIngredientForm(item.ingredientForm),
    amount_value: round2(item.scaledAmount),
    amount_unit: item.unit,
    notes: item.prepNotes?.trim() || null,
    estimated_displacement_ml:
      item.displacesVolume && item.unit.trim().toLowerCase() === "ml"
        ? round2(item.scaledAmount)
        : null,
    estimated_sugar_g: null,
  }));
}

async function persistRecipeForGroup(args: {
  group: F2BottleGroupDraft;
  groupPlan: F2SetupSummary["bottleGroupPlans"][number];
  userId: string;
  desiredCarbonationLevel: F2CarbonationLevel;
}): Promise<PersistedGroupRecipe> {
  const { group, groupPlan, userId, desiredCarbonationLevel } = args;

  let selectedRecipeId =
    groupPlan.recipeMode !== "custom" ? groupPlan.selectedRecipeId || null : null;
  const recipeItemIdsByDraftId: Record<string, string> = {};

  if (groupPlan.recipeMode === "custom" && group.recipe.saveRecipe) {
    const recipeInsert: TablesInsert<"f2_recipes"> = {
      name:
        groupPlan.recipeName ||
        group.groupLabel?.trim() ||
        "Untitled bottle group recipe",
      description: groupPlan.recipeDescription || null,
      is_preset: false,
      is_active: true,
      user_id: userId,
    };

    const { data: savedRecipe, error: recipeError } = await supabase
      .from("f2_recipes")
      .insert(recipeInsert)
      .select("id")
      .single();

    if (recipeError || !savedRecipe) {
      throw new Error(
        `Could not save recipe for ${group.groupLabel?.trim() || "this group"}: ${
          recipeError?.message || "unknown error"
        }`
      );
    }

    selectedRecipeId = savedRecipe.id;

    if (groupPlan.effectiveRecipeItems.length > 0) {
      const recipeItemRows: TablesInsert<"f2_recipe_items">[] =
        groupPlan.effectiveRecipeItems.map((item, index) => ({
          recipe_id: selectedRecipeId,
          flavour_preset_id: item.flavourPresetId || null,
          custom_ingredient_name: item.customIngredientName?.trim() || null,
          ingredient_form: isIngredientForm(item.ingredientForm),
          amount_per_500: item.amountPer500,
          unit: item.unit,
          prep_notes: item.prepNotes?.trim() || null,
          displaces_volume: !!item.displacesVolume,
          sort_order: index,
        }));

      const { data: savedRecipeItems, error: recipeItemsError } = await supabase
        .from("f2_recipe_items")
        .insert(recipeItemRows)
        .select("id, sort_order");

      if (recipeItemsError) {
        throw new Error(
          `Could not save recipe items for ${group.groupLabel?.trim() || "this group"}: ${
            recipeItemsError.message
          }`
        );
      }

      groupPlan.effectiveRecipeItems.forEach((item, index) => {
        const saved = savedRecipeItems?.find((row) => row.sort_order === index);
        if (saved) {
          recipeItemIdsByDraftId[item.id] = saved.id;
        }
      });
    }
  }

  const recipeSnapshot = buildGroupRecipeSnapshot({
    groupId: group.id,
    groupLabel: group.groupLabel,
    recipeMode: groupPlan.recipeMode,
    selectedRecipeId,
    guidedMode: groupPlan.guidedMode,
    desiredCarbonationLevel,
    recipeName: groupPlan.recipeName,
    recipeDescription: groupPlan.recipeDescription,
    effectiveRecipeItems: groupPlan.effectiveRecipeItems,
    recipeItemIdsByDraftId,
  });

  return {
    groupId: group.id,
    recipeMode: groupPlan.recipeMode,
    selectedRecipeId,
    guidedMode: groupPlan.guidedMode,
    recipeName: groupPlan.recipeName,
    recipeDescription: groupPlan.recipeDescription,
    recipeSnapshot,
    recipeItemIdsByDraftId,
  };
}

function getSetupRecipeNameSnapshot(
  groups: Array<
    PersistedGroupRecipe & {
      groupLabel?: string;
    }
  >
) {
  const flavouredGroups = groups.filter((group) => group.recipeMode !== "none");

  if (flavouredGroups.length === 0) {
    return "No added flavourings";
  }

  const distinctNames = Array.from(
    new Set(
      flavouredGroups
        .map((group, index) =>
          getGroupRecipeDisplayName({
            recipeMode: group.recipeMode,
            recipeName: group.recipeName,
            groupLabel: group.groupLabel,
            groupIndex: index + 1,
          })
        )
        .filter(Boolean)
    )
  );

  if (distinctNames.length === 1) {
    return distinctNames[0];
  }

  return `${flavouredGroups.length} group flavour plans`;
}

export async function startF2FromWizard(args: StartF2Args): Promise<StartF2Result> {
  const {
    batch,
    userId,
    reserveForStarterMl,
    ambientTempC,
    desiredCarbonationLevel,
    bottleGroups,
    summary,
  } = args;

  if (summary.validationErrors.length > 0) {
    throw new Error("Fix the review errors before starting F2.");
  }

  const nowIso = new Date().toISOString();
  const nextAction = "Check first bottle for carbonation";

  const groupPlansById = new Map(
    summary.bottleGroupPlans.map((groupPlan) => [groupPlan.groupId, groupPlan])
  );

  const persistedGroupRecipes: Array<
    PersistedGroupRecipe & { groupLabel?: string }
  > = [];

  for (const group of bottleGroups) {
    const groupPlan = groupPlansById.get(group.id);

    if (!groupPlan) {
      throw new Error("A bottle group is missing from the bottling summary.");
    }

    const persistedRecipe = await persistRecipeForGroup({
      group,
      groupPlan,
      userId,
      desiredCarbonationLevel,
    });

    persistedGroupRecipes.push({
      ...persistedRecipe,
      groupLabel: group.groupLabel,
    });
  }

  const setupRecipeSnapshot = buildSetupRecipeSnapshot({
    desiredCarbonationLevel,
    groups: bottleGroups.map((group) => {
      const groupPlan = groupPlansById.get(group.id);
      const persistedRecipe = persistedGroupRecipes.find(
        (item) => item.groupId === group.id
      );

      if (!groupPlan || !persistedRecipe) {
        throw new Error("Could not build the setup recipe snapshot.");
      }

      return {
        groupId: group.id,
        groupLabel: group.groupLabel,
        recipeMode: persistedRecipe.recipeMode,
        selectedRecipeId: persistedRecipe.selectedRecipeId,
        guidedMode: persistedRecipe.guidedMode,
        desiredCarbonationLevel,
        recipeName: persistedRecipe.recipeName,
        recipeDescription: persistedRecipe.recipeDescription,
        effectiveRecipeItems: groupPlan.effectiveRecipeItems,
        recipeItemIdsByDraftId: persistedRecipe.recipeItemIdsByDraftId,
      };
    }),
  });

  const avgHeadspaceMl =
    bottleGroups.length > 0
      ? Math.round(
          bottleGroups.reduce((sum, group) => sum + group.headspaceMl, 0) /
            bottleGroups.length
        )
      : null;

  const topLevelRecipeIdCandidates = Array.from(
    new Set(
      persistedGroupRecipes
        .map((group) => group.selectedRecipeId)
        .filter((value): value is string => !!value)
    )
  );

  await supabase
    .from("batch_f2_setups")
    .update({ is_current: false })
    .eq("batch_id", batch.id)
    .eq("is_current", true);

  const setupInsert: TablesInsert<"batch_f2_setups"> = {
    batch_id: batch.id,
    ambient_temp_c: ambientTempC,
    desired_carbonation_level: desiredCarbonationLevel,
    estimated_pressure_risk: summary.riskLevel,
    reserved_for_sediment_ml: toInt(reserveForStarterMl),
    available_f1_volume_ml: toInt(summary.availableForBottlingMl),
    bottle_count: toInt(summary.totalBottleCount),
    bottle_size_ml: toInt(bottleGroups[0]?.bottleSizeMl ?? 500),
    bottle_type: bottleGroups[0]?.bottleType ?? "swing_top",
    default_headspace_ml: avgHeadspaceMl,
    avg_headspace_description:
      bottleGroups.length <= 1
        ? `${bottleGroups[0]?.headspaceMl ?? 0} ml`
        : `Mixed headspace across ${bottleGroups.length} groups`,
    planned_bottle_volume_ml: toInt(summary.totalPlannedBottleVolumeMl),
    planned_kombucha_fill_ml: toInt(summary.totalKombuchaNeededMl),
    additional_sugar_total_g: 0,
    flavouring_mode: persistedGroupRecipes.every((group) => group.guidedMode)
      ? "guided"
      : "advanced",
    selected_recipe_id:
      topLevelRecipeIdCandidates.length === 1 ? topLevelRecipeIdCandidates[0] : null,
    recipe_name_snapshot: getSetupRecipeNameSnapshot(persistedGroupRecipes),
    recipe_snapshot_json: setupRecipeSnapshot,
    burp_reminders_enabled: false,
    is_current: true,
    setup_status: "active",
  };

  const { data: setupRow, error: setupError } = await supabase
    .from("batch_f2_setups")
    .insert(setupInsert)
    .select("id")
    .single();

  if (setupError || !setupRow) {
    throw new Error(
      `Could not create F2 setup: ${setupError?.message || "unknown error"}`
    );
  }

  const setupId = setupRow.id;

  const groupRows: TablesInsert<"batch_f2_bottle_groups">[] =
    summary.bottleGroupPlans.map((groupPlan, index) => {
      const draftGroup = bottleGroups.find((group) => group.id === groupPlan.groupId);
      const persistedRecipe = persistedGroupRecipes.find(
        (group) => group.groupId === groupPlan.groupId
      );

      if (!draftGroup || !persistedRecipe) {
        throw new Error("Could not build bottle group rows for F2 persistence.");
      }

      return {
        f2_setup_id: setupId,
        bottle_count: toInt(groupPlan.bottleCount),
        bottle_size_ml: toInt(groupPlan.bottleSizeMl),
        bottle_type: groupPlan.bottleType,
        headspace_ml: toInt(groupPlan.headspaceMl),
        target_fill_ml: toInt(groupPlan.targetFillMlPerBottle),
        group_label: draftGroup.groupLabel?.trim() || null,
        sort_order: index,
        recipe_mode: persistedRecipe.recipeMode,
        selected_recipe_id: persistedRecipe.selectedRecipeId,
        guided_mode: persistedRecipe.guidedMode,
        recipe_name_snapshot: persistedRecipe.recipeName,
        recipe_description_snapshot: persistedRecipe.recipeDescription,
        recipe_snapshot_json: persistedRecipe.recipeSnapshot,
      };
    });

  const { data: insertedGroupRows, error: groupsError } = await supabase
    .from("batch_f2_bottle_groups")
    .insert(groupRows)
    .select("id, sort_order");

  if (groupsError || !insertedGroupRows) {
    throw new Error(
      `Could not save bottle groups: ${groupsError?.message || "unknown error"}`
    );
  }

  const groupIdByDraftId = new Map<string, string>();

  summary.bottleGroupPlans.forEach((groupPlan, index) => {
    const insertedGroup = insertedGroupRows.find((row) => row.sort_order === index);
    if (insertedGroup) {
      groupIdByDraftId.set(groupPlan.groupId, insertedGroup.id);
    }
  });

  for (const groupPlan of summary.bottleGroupPlans) {
    const groupDbId = groupIdByDraftId.get(groupPlan.groupId);
    const persistedRecipe = persistedGroupRecipes.find(
      (group) => group.groupId === groupPlan.groupId
    );
    const draftGroup = bottleGroups.find((group) => group.id === groupPlan.groupId);

    if (!groupDbId || !persistedRecipe || !draftGroup) {
      throw new Error("Could not match a saved bottle group to its bottle plan.");
    }

    const baseLabel = draftGroup.groupLabel?.trim() || "Bottle group";
    const customFlavourName =
      groupPlan.recipeMode === "none"
        ? null
        : groupPlan.recipeName || `${baseLabel} flavour plan`;

    const bottleRows: TablesInsert<"batch_bottles">[] = Array.from(
      { length: groupPlan.bottleCount },
      (_, bottleIndex) => ({
        f2_setup_id: setupId,
        f2_bottle_group_id: groupDbId,
        bottle_size_ml: toInt(groupPlan.bottleSizeMl),
        bottle_label: `${baseLabel} ${bottleIndex + 1}`,
        bottle_notes: null,
        custom_flavour_name: customFlavourName,
        flavour_preset_id: null,
        extra_sugar_g: 0,
        ingredient_amount_unit: null,
        ingredient_amount_value: null,
        ingredient_form: null,
      })
    );

    const { data: insertedBottles, error: bottlesError } = await supabase
      .from("batch_bottles")
      .insert(bottleRows)
      .select("id");

    if (bottlesError || !insertedBottles) {
      throw new Error(
        `Could not create bottles: ${bottlesError?.message || "unknown error"}`
      );
    }

    const ingredientRows = insertedBottles.flatMap((bottle) =>
      buildBottleIngredientInsertRows({
        bottleId: bottle.id,
        recipeMode: groupPlan.recipeMode,
        scaledItems: groupPlan.scaledItemsPerBottle,
        recipeItemIdsByDraftId: persistedRecipe.recipeItemIdsByDraftId,
      })
    );

    if (ingredientRows.length > 0) {
      const { error: ingredientsError } = await supabase
        .from("batch_bottle_ingredients")
        .insert(ingredientRows);

      if (ingredientsError) {
        throw new Error(
          `Could not save bottle ingredients: ${ingredientsError.message}`
        );
      }
    }
  }

  const { error: batchUpdateError } = await supabase
    .from("kombucha_batches")
    .update({
      current_stage: "f2_active",
      f2_started_at: nowIso,
      next_action: nextAction,
      updated_at: nowIso,
    })
    .eq("id", batch.id);

  if (batchUpdateError) {
    throw new Error(
      `Could not update batch to F2 active: ${batchUpdateError.message}`
    );
  }

  await Promise.allSettled([
    supabase.from("batch_stage_events").insert({
      batch_id: batch.id,
      from_stage: batch.currentStage,
      to_stage: "f2_active",
      reason: "Started F2 from setup wizard",
      triggered_by: userId,
    }),
    supabase.from("batch_logs").insert({
      batch_id: batch.id,
      created_by_user_id: userId,
      log_type: "moved_to_f2",
      logged_at: nowIso,
      note: "User confirmed bottling and started F2 from the wizard.",
      structured_payload: {
        source: "f2_setup_wizard",
        setup_id: setupId,
        bottle_count: summary.totalBottleCount,
        carbonation_target: desiredCarbonationLevel,
      },
    }),
  ]);

  return {
    f2StartedAt: nowIso,
    nextAction,
    setupId,
  };
}
