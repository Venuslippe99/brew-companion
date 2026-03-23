import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { F1Recipe, F1RecipeDraft, F1RecipeSummary } from "@/lib/f1-recipe-types";

function normalizeTargetPreference(
  value: Tables<"f1_recipes">["target_preference"]
): F1Recipe["targetPreference"] {
  if (value === "sweeter" || value === "balanced" || value === "tart") {
    return value;
  }

  return "balanced";
}

function mapRecipeRow(row: Tables<"f1_recipes">): F1Recipe {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || "",
    targetTotalVolumeMl: row.target_total_volume_ml,
    teaType: row.tea_type,
    teaSourceForm: row.tea_source_form as F1Recipe["teaSourceForm"],
    teaAmountValue: Number(row.tea_amount_value),
    teaAmountUnit: row.tea_amount_unit as F1Recipe["teaAmountUnit"],
    sugarType: row.sugar_type,
    sugarAmountValue: Number(row.sugar_amount_value),
    sugarAmountUnit: row.sugar_amount_unit as F1Recipe["sugarAmountUnit"],
    defaultStarterLiquidMl: Number(row.default_starter_liquid_ml),
    defaultScobyPresent: row.default_scoby_present,
    targetPreference: normalizeTargetPreference(row.target_preference),
    defaultRoomTempC:
      row.default_room_temp_c !== null ? Number(row.default_room_temp_c) : null,
    defaultNotes: row.default_notes || "",
    preferredVesselId: row.preferred_vessel_id,
    isFavorite: row.is_favorite,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRecipeInsert(userId: string, draft: F1RecipeDraft): TablesInsert<"f1_recipes"> {
  return {
    user_id: userId,
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    target_total_volume_ml: draft.targetTotalVolumeMl,
    tea_type: draft.teaType.trim(),
    tea_source_form: draft.teaSourceForm,
    tea_amount_value: draft.teaAmountValue,
    tea_amount_unit: draft.teaAmountUnit,
    sugar_type: draft.sugarType.trim(),
    sugar_amount_value: draft.sugarAmountValue,
    sugar_amount_unit: draft.sugarAmountUnit,
    default_starter_liquid_ml: draft.defaultStarterLiquidMl,
    default_scoby_present: draft.defaultScobyPresent,
    target_preference: draft.targetPreference,
    default_room_temp_c: draft.defaultRoomTempC,
    default_notes: draft.defaultNotes.trim() || null,
    preferred_vessel_id: draft.preferredVesselId,
    is_favorite: draft.isFavorite,
  };
}

function toRecipeUpdate(draft: F1RecipeDraft): TablesUpdate<"f1_recipes"> {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    target_total_volume_ml: draft.targetTotalVolumeMl,
    tea_type: draft.teaType.trim(),
    tea_source_form: draft.teaSourceForm,
    tea_amount_value: draft.teaAmountValue,
    tea_amount_unit: draft.teaAmountUnit,
    sugar_type: draft.sugarType.trim(),
    sugar_amount_value: draft.sugarAmountValue,
    sugar_amount_unit: draft.sugarAmountUnit,
    default_starter_liquid_ml: draft.defaultStarterLiquidMl,
    default_scoby_present: draft.defaultScobyPresent,
    target_preference: draft.targetPreference,
    default_room_temp_c: draft.defaultRoomTempC,
    default_notes: draft.defaultNotes.trim() || null,
    preferred_vessel_id: draft.preferredVesselId,
    is_favorite: draft.isFavorite,
  };
}

export async function loadF1Recipes(args: {
  includeArchived?: boolean;
} = {}): Promise<F1RecipeSummary[]> {
  const query = supabase
    .from("f1_recipes")
    .select("*")
    .order("is_favorite", { ascending: false })
    .order("updated_at", { ascending: false });

  if (!args.includeArchived) {
    query.is("archived_at", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Could not load F1 recipes: ${error.message}`);
  }

  return (data || []).map(mapRecipeRow);
}

export async function saveF1Recipe(args: {
  userId: string;
  draft: F1RecipeDraft;
  recipeId?: string;
}): Promise<F1Recipe> {
  if (!args.draft.name.trim()) {
    throw new Error("Recipe name is required.");
  }

  if (args.recipeId) {
    const { data, error } = await supabase
      .from("f1_recipes")
      .update(toRecipeUpdate(args.draft))
      .eq("id", args.recipeId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Could not update recipe: ${error?.message || "unknown error"}`);
    }

    return mapRecipeRow(data);
  }

  const { data, error } = await supabase
    .from("f1_recipes")
    .insert(toRecipeInsert(args.userId, args.draft))
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Could not save recipe: ${error?.message || "unknown error"}`);
  }

  return mapRecipeRow(data);
}

export async function duplicateF1Recipe(args: {
  userId: string;
  recipe: F1RecipeSummary;
}): Promise<F1Recipe> {
  const duplicatedDraft: F1RecipeDraft = {
    name: `${args.recipe.name} Copy`,
    description: args.recipe.description || "",
    targetTotalVolumeMl: args.recipe.targetTotalVolumeMl,
    teaType: args.recipe.teaType,
    teaSourceForm: args.recipe.teaSourceForm,
    teaAmountValue: args.recipe.teaAmountValue,
    teaAmountUnit: args.recipe.teaAmountUnit,
    sugarType: args.recipe.sugarType,
    sugarAmountValue: args.recipe.sugarAmountValue,
    sugarAmountUnit: args.recipe.sugarAmountUnit,
    defaultStarterLiquidMl: args.recipe.defaultStarterLiquidMl,
    defaultScobyPresent: args.recipe.defaultScobyPresent,
    targetPreference: args.recipe.targetPreference,
    defaultRoomTempC: args.recipe.defaultRoomTempC,
    defaultNotes: "",
    preferredVesselId: args.recipe.preferredVesselId,
    isFavorite: false,
  };

  return saveF1Recipe({
    userId: args.userId,
    draft: duplicatedDraft,
  });
}

export async function setF1RecipeArchived(args: {
  recipeId: string;
  archived: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("f1_recipes")
    .update({
      archived_at: args.archived ? new Date().toISOString() : null,
    })
    .eq("id", args.recipeId);

  if (error) {
    throw new Error(`Could not update recipe archive state: ${error.message}`);
  }
}

export async function setF1RecipeFavorite(args: {
  recipeId: string;
  isFavorite: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("f1_recipes")
    .update({
      is_favorite: args.isFavorite,
    })
    .eq("id", args.recipeId);

  if (error) {
    throw new Error(`Could not update recipe favorite state: ${error.message}`);
  }
}

export async function deleteF1Recipe(recipeId: string): Promise<void> {
  const { error } = await supabase.from("f1_recipes").delete().eq("id", recipeId);

  if (error) {
    throw new Error(`Could not delete recipe: ${error.message}`);
  }
}
