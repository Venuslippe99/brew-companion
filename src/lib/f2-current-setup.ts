import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type LoadedBottleIngredient = {
  id: string;
  bottleId: string;
  ingredientNameSnapshot: string;
  ingredientForm: string | null;
  amountValue: number;
  amountUnit: string;
  notes: string | null;
};

export type LoadedBottle = {
  id: string;
  bottleLabel: string | null;
  bottleSizeMl: number;
  bottleNotes: string | null;
  ingredients: LoadedBottleIngredient[];
};

export type LoadedBottleGroup = {
  id: string;
  bottleCount: number;
  bottleSizeMl: number;
  bottleType: string;
  headspaceMl: number;
  targetFillMl: number;
  groupLabel: string | null;
  sortOrder: number;
};

export type LoadedF2Setup = {
  id: string;
  ambientTempC: number;
  desiredCarbonationLevel: "light" | "balanced" | "strong";
  estimatedPressureRisk: string | null;
  reserveForStarterMl: number | null;
  totalF1AvailableMl: number | null;
  availableForBottlingMl: number | null;
  bottleCount: number;
  plannedBottleVolumeMl: number | null;
  plannedKombuchaFillMl: number | null;
  recipeNameSnapshot: string | null;
  recipeSnapshotJson: Json | null;
  setupCreatedAt: string;
  groups: LoadedBottleGroup[];
  bottles: LoadedBottle[];
};

export async function loadCurrentF2Setup(batchId: string): Promise<LoadedF2Setup | null> {
  const { data: setupRow, error: setupError } = await supabase
    .from("batch_f2_setups")
    .select(`
      id,
      ambient_temp_c,
      desired_carbonation_level,
      estimated_pressure_risk,
      reserved_for_sediment_ml,
      available_f1_volume_ml,
      bottle_count,
      planned_bottle_volume_ml,
      planned_kombucha_fill_ml,
      recipe_name_snapshot,
      recipe_snapshot_json,
      setup_created_at
    `)
    .eq("batch_id", batchId)
    .eq("is_current", true)
    .order("setup_created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (setupError) {
    throw new Error(`Could not load current F2 setup: ${setupError.message}`);
  }

  if (!setupRow) {
    return null;
  }

  const { data: groupRows, error: groupsError } = await supabase
    .from("batch_f2_bottle_groups")
    .select(`
      id,
      bottle_count,
      bottle_size_ml,
      bottle_type,
      headspace_ml,
      target_fill_ml,
      group_label,
      sort_order
    `)
    .eq("f2_setup_id", setupRow.id)
    .order("sort_order", { ascending: true });

  if (groupsError) {
    throw new Error(`Could not load bottle groups: ${groupsError.message}`);
  }

  const { data: bottleRows, error: bottlesError } = await supabase
    .from("batch_bottles")
    .select(`
      id,
      bottle_label,
      bottle_size_ml,
      bottle_notes
    `)
    .eq("f2_setup_id", setupRow.id)
    .order("created_at", { ascending: true });

  if (bottlesError) {
    throw new Error(`Could not load bottles: ${bottlesError.message}`);
  }

  const bottleIds = (bottleRows || []).map((bottle) => bottle.id);

  let ingredientRows:
    | Array<{
        id: string;
        bottle_id: string;
        ingredient_name_snapshot: string;
        ingredient_form: string | null;
        amount_value: number;
        amount_unit: string;
        notes: string | null;
      }>
    | null = [];

  if (bottleIds.length > 0) {
    const { data, error } = await supabase
      .from("batch_bottle_ingredients")
      .select(`
        id,
        bottle_id,
        ingredient_name_snapshot,
        ingredient_form,
        amount_value,
        amount_unit,
        notes
      `)
      .in("bottle_id", bottleIds)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Could not load bottle ingredients: ${error.message}`);
    }

    ingredientRows = data;
  }

  const ingredientsByBottleId = new Map<string, LoadedBottleIngredient[]>();

  (ingredientRows || []).forEach((row) => {
    const current = ingredientsByBottleId.get(row.bottle_id) || [];

    current.push({
      id: row.id,
      bottleId: row.bottle_id,
      ingredientNameSnapshot: row.ingredient_name_snapshot,
      ingredientForm: row.ingredient_form,
      amountValue: Number(row.amount_value),
      amountUnit: row.amount_unit,
      notes: row.notes,
    });

    ingredientsByBottleId.set(row.bottle_id, current);
  });

  const reserveForStarterMl =
    setupRow.reserved_for_sediment_ml != null
      ? Number(setupRow.reserved_for_sediment_ml)
      : null;
  const availableForBottlingMl =
    setupRow.available_f1_volume_ml != null
      ? Number(setupRow.available_f1_volume_ml)
      : null;
  const totalF1AvailableMl =
    reserveForStarterMl != null || availableForBottlingMl != null
      ? (reserveForStarterMl ?? 0) + (availableForBottlingMl ?? 0)
      : null;

  return {
    id: setupRow.id,
    ambientTempC: Number(setupRow.ambient_temp_c),
    desiredCarbonationLevel: setupRow.desired_carbonation_level,
    estimatedPressureRisk: setupRow.estimated_pressure_risk,
    reserveForStarterMl,
    totalF1AvailableMl,
    availableForBottlingMl,
    bottleCount: Number(setupRow.bottle_count),
    plannedBottleVolumeMl: setupRow.planned_bottle_volume_ml,
    plannedKombuchaFillMl: setupRow.planned_kombucha_fill_ml,
    recipeNameSnapshot: setupRow.recipe_name_snapshot,
    recipeSnapshotJson: setupRow.recipe_snapshot_json,
    setupCreatedAt: setupRow.setup_created_at,
    groups: (groupRows || []).map((row) => ({
      id: row.id,
      bottleCount: Number(row.bottle_count),
      bottleSizeMl: Number(row.bottle_size_ml),
      bottleType: row.bottle_type,
      headspaceMl: Number(row.headspace_ml),
      targetFillMl: Number(row.target_fill_ml),
      groupLabel: row.group_label,
      sortOrder: Number(row.sort_order),
    })),
    bottles: (bottleRows || []).map((row) => ({
      id: row.id,
      bottleLabel: row.bottle_label,
      bottleSizeMl: Number(row.bottle_size_ml),
      bottleNotes: row.bottle_notes,
      ingredients: ingredientsByBottleId.get(row.id) || [],
    })),
  };
}
