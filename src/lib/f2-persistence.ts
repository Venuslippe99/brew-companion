import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import type { KombuchaBatch } from "@/lib/batches";
import type {
  F2BottleGroupDraft,
  F2RecipeItemDraft,
  F2CarbonationLevel,
  F2RecipeSourceTab,
  F2SetupSummary,
} from "@/lib/f2-types";

type StartF2Args = {
  batch: KombuchaBatch;
  userId: string;
  reserveForStarterMl: number;
  ambientTempC: number;
  desiredCarbonationLevel: F2CarbonationLevel;
  bottleGroups: F2BottleGroupDraft[];
  recipeSourceTab: F2RecipeSourceTab;
  guidedMode: boolean;
  selectedRecipeId: string;
  recipeName: string;
  recipeDescription: string;
  saveRecipe: boolean;
  adjustedRecipeItems: F2RecipeItemDraft[];
  summary: F2SetupSummary;
};

type StartF2Result = {
  f2StartedAt: string;
  nextAction: string;
  setupId: string;
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

export async function startF2FromWizard(args: StartF2Args): Promise<StartF2Result> {
  const {
    batch,
    userId,
    reserveForStarterMl,
    ambientTempC,
    desiredCarbonationLevel,
    bottleGroups,
    recipeSourceTab,
    guidedMode,
    selectedRecipeId,
    recipeName,
    recipeDescription,
    saveRecipe,
    adjustedRecipeItems,
    summary,
  } = args;

  if (summary.validationErrors.length > 0) {
    throw new Error("Fix the review errors before starting F2.");
  }

  const nowIso = new Date().toISOString();
  const nextAction = "Check first bottle for carbonation";

  let persistedRecipeId: string | null =
    recipeSourceTab !== "create" && selectedRecipeId ? selectedRecipeId : null;

  let persistedRecipeItemIdsByDraftId: Record<string, string> = {};

  if (recipeSourceTab === "create" && saveRecipe) {
    const recipeInsert: TablesInsert<"f2_recipes"> = {
      name: recipeName.trim() || "Untitled recipe",
      description: recipeDescription.trim() || null,
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
        `Could not save recipe: ${recipeError?.message || "unknown error"}`
      );
    }

    persistedRecipeId = savedRecipe.id;

    const recipeItemRows: TablesInsert<"f2_recipe_items">[] = adjustedRecipeItems.map(
      (item, index) => ({
        recipe_id: persistedRecipeId!,
        flavour_preset_id: item.flavourPresetId || null,
        custom_ingredient_name: item.customIngredientName?.trim() || null,
        ingredient_form: isIngredientForm(item.ingredientForm),
        amount_per_500: item.amountPer500,
        unit: item.unit,
        prep_notes: item.prepNotes?.trim() || null,
        displaces_volume: !!item.displacesVolume,
        sort_order: index,
      })
    );

    const { data: savedRecipeItems, error: recipeItemsError } = await supabase
      .from("f2_recipe_items")
      .insert(recipeItemRows)
      .select("id, sort_order");

    if (recipeItemsError) {
      throw new Error(
        `Could not save recipe items: ${recipeItemsError.message}`
      );
    }

    persistedRecipeItemIdsByDraftId = {};
    adjustedRecipeItems.forEach((item, index) => {
      const saved = savedRecipeItems?.find((row) => row.sort_order === index);
      if (saved) {
        persistedRecipeItemIdsByDraftId[item.id] = saved.id;
      }
    });
  }

  const recipeSnapshot = {
    sourceTab: recipeSourceTab,
    guidedMode,
    desiredCarbonationLevel,
    recipeName: recipeName.trim() || null,
    recipeDescription: recipeDescription.trim() || null,
    selectedRecipeId: persistedRecipeId,
    items: adjustedRecipeItems.map((item, index) => ({
      sortOrder: index,
      recipeItemId:
        persistedRecipeItemIdsByDraftId[item.id] ||
        (recipeSourceTab !== "create" ? item.id : null),
      flavourPresetId: item.flavourPresetId || null,
      customIngredientName: item.customIngredientName?.trim() || null,
      ingredientForm: item.ingredientForm || null,
      amountPer500: item.amountPer500,
      unit: item.unit,
      prepNotes: item.prepNotes?.trim() || null,
      displacesVolume: !!item.displacesVolume,
    })),
  } satisfies Json;

  const avgHeadspaceMl =
    bottleGroups.length > 0
      ? Math.round(
          bottleGroups.reduce((sum, group) => sum + group.headspaceMl, 0) /
            bottleGroups.length
        )
      : null;

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
    flavouring_mode: guidedMode ? "guided" : "advanced",
    selected_recipe_id: persistedRecipeId,
    recipe_name_snapshot: recipeName.trim() || null,
    recipe_snapshot_json: recipeSnapshot,
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

      return {
        f2_setup_id: setupId,
        bottle_count: toInt(groupPlan.bottleCount),
        bottle_size_ml: toInt(groupPlan.bottleSizeMl),
        bottle_type: groupPlan.bottleType,
        headspace_ml: toInt(groupPlan.headspaceMl),
        target_fill_ml: toInt(groupPlan.targetFillMlPerBottle),
        group_label: draftGroup?.groupLabel?.trim() || null,
        sort_order: index,
      };
    });

  const { error: groupsError } = await supabase
    .from("batch_f2_bottle_groups")
    .insert(groupRows);

  if (groupsError) {
    throw new Error(`Could not save bottle groups: ${groupsError.message}`);
  }

  const bottleRows: TablesInsert<"batch_bottles">[] = [];
  const bottleMeta: Array<{
    scaledItems: Array<{
      id: string;
      flavourPresetId?: string;
      customIngredientName?: string;
      ingredientForm?: string;
      scaledAmount: number;
      unit: string;
      prepNotes?: string;
      displacesVolume?: boolean;
    }>;
  }> = [];

  summary.bottleGroupPlans.forEach((groupPlan, groupIndex) => {
    const draftGroup = bottleGroups.find((group) => group.id === groupPlan.groupId);
    const baseLabel = draftGroup?.groupLabel?.trim() || `Group ${groupIndex + 1}`;

    for (let i = 0; i < groupPlan.bottleCount; i += 1) {
      bottleRows.push({
        f2_setup_id: setupId,
        bottle_size_ml: toInt(groupPlan.bottleSizeMl),
        bottle_label: `${baseLabel} ${i + 1}`,
        bottle_notes: null,
        custom_flavour_name: null,
        flavour_preset_id: null,
        extra_sugar_g: 0,
        ingredient_amount_unit: null,
        ingredient_amount_value: null,
        ingredient_form: null,
      });

      bottleMeta.push({
        scaledItems: groupPlan.scaledItemsPerBottle.map((item) => ({
          id: item.id,
          flavourPresetId: item.flavourPresetId,
          customIngredientName: item.customIngredientName,
          ingredientForm: item.ingredientForm,
          scaledAmount: item.scaledAmount,
          unit: item.unit,
          prepNotes: item.prepNotes,
          displacesVolume: item.displacesVolume,
        })),
      });
    }
  });

  const { data: insertedBottles, error: bottlesError } = await supabase
    .from("batch_bottles")
    .insert(bottleRows)
    .select("id");

  if (bottlesError || !insertedBottles) {
    throw new Error(
      `Could not create bottles: ${bottlesError?.message || "unknown error"}`
    );
  }

  const ingredientRows: TablesInsert<"batch_bottle_ingredients">[] =
    insertedBottles.flatMap((bottle, bottleIndex) => {
      const meta = bottleMeta[bottleIndex];

      return meta.scaledItems.map((item) => ({
        bottle_id: bottle.id,
        recipe_item_id:
          persistedRecipeItemIdsByDraftId[item.id] ||
          (recipeSourceTab !== "create" ? item.id : null),
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
    });

  const { error: ingredientsError } = await supabase
    .from("batch_bottle_ingredients")
    .insert(ingredientRows);

  if (ingredientsError) {
    throw new Error(
      `Could not save bottle ingredients: ${ingredientsError.message}`
    );
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
