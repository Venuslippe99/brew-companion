import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import { buildF1VesselFitResult, type F1VesselFitResult } from "@/lib/f1-vessel-fit";
import type { F1BatchSetupFields, F1RecipeSummary } from "@/lib/f1-recipe-types";
import type { SelectedF1Vessel } from "@/lib/f1-vessel-types";

export type F1SetupOrigin = "scratch" | "recipe";

export type LoadedF1Setup = {
  id: string;
  batchId: string;
  selectedRecipeId: string | null;
  selectedVesselId: string | null;
  fitState: F1VesselFitResult["fitState"];
  fitNotesJson: Json;
  setupSnapshotJson: Json;
  createdAt: string;
  updatedAt: string;
};

type SaveBatchF1SetupArgs = {
  batchId: string;
  userId: string;
  origin: F1SetupOrigin;
  setup: F1BatchSetupFields;
  selectedRecipe: F1RecipeSummary | null;
  selectedVessel: SelectedF1Vessel;
  starterSourceType: "manual" | "previous_batch";
  starterSourceBatchId: string | null;
  brewAgainSourceBatchId: string | null;
};

function buildFitNotesJson(fit: F1VesselFitResult): Json {
  return {
    summary: fit.plainLanguageSummary,
    notes: fit.cautionNotes,
    fillRatioPercent: fit.fillRatioPercent,
  } satisfies Json;
}

function buildSetupSnapshotJson(args: SaveBatchF1SetupArgs, fit: F1VesselFitResult): Json {
  const { origin, setup, selectedRecipe, selectedVessel } = args;

  return {
    actualComposition: {
      totalVolumeMl: setup.totalVolumeMl,
      teaType: setup.teaType,
      teaSourceForm: setup.teaSourceForm,
      teaAmountValue: setup.teaAmountValue,
      teaAmountUnit: setup.teaAmountUnit,
      sugarG: setup.sugarG,
      sugarType: setup.sugarType,
      starterLiquidMl: setup.starterLiquidMl,
      scobyPresent: setup.scobyPresent,
      avgRoomTempC: setup.avgRoomTempC,
      vesselType: setup.vesselType,
      targetPreference: setup.targetPreference,
      initialNotes: setup.initialNotes,
    },
    recipeContext: {
      selectedRecipeId: selectedRecipe?.id || null,
      recipeNameSnapshot: selectedRecipe?.name || null,
      origin,
    },
    vesselContext: {
      selectedVesselId: selectedVessel.vesselId,
      source: selectedVessel.source,
      vesselNameSnapshot: selectedVessel.name,
      materialTypeSnapshot: selectedVessel.materialType,
      capacityMlSnapshot: selectedVessel.capacityMl,
      recommendedMaxFillMlSnapshot: selectedVessel.recommendedMaxFillMl,
      suitabilitySnapshot: selectedVessel.f1Suitability,
      notesSnapshot: selectedVessel.notes,
    },
    fitContext: {
      fillRatio: fit.fillRatio,
      fillRatioPercent: fit.fillRatioPercent,
      fitState: fit.fitState,
      suitabilityState: fit.suitabilityState,
      recommendedMaxFillMl: fit.recommendedMaxFillMl,
      summary: fit.plainLanguageSummary,
      cautionNotes: fit.cautionNotes,
    },
    lineageContext: {
      starterSourceType: args.starterSourceType,
      starterSourceBatchId: args.starterSourceBatchId,
      brewAgainSourceBatchId: args.brewAgainSourceBatchId,
    },
  } satisfies Json;
}

export async function saveBatchF1Setup(args: SaveBatchF1SetupArgs): Promise<F1VesselFitResult> {
  const fit = buildF1VesselFitResult({
    totalVolumeMl: args.setup.totalVolumeMl,
    vessel: args.selectedVessel,
  });

  const insert: TablesInsert<"batch_f1_setups"> = {
    batch_id: args.batchId,
    selected_recipe_id: args.selectedRecipe?.id || null,
    selected_vessel_id: args.selectedVessel.vesselId,
    setup_snapshot_json: buildSetupSnapshotJson(args, fit),
    fit_state: fit.fitState,
    fit_notes_json: buildFitNotesJson(fit),
    created_by_user_id: args.userId,
  };

  const { error } = await supabase
    .from("batch_f1_setups")
    .upsert(insert, { onConflict: "batch_id" });

  if (error) {
    throw new Error(`Could not save F1 setup snapshot: ${error.message}`);
  }

  return fit;
}

export async function loadBatchF1Setup(batchId: string): Promise<LoadedF1Setup | null> {
  const { data, error } = await supabase
    .from("batch_f1_setups")
    .select(`
      id,
      batch_id,
      selected_recipe_id,
      selected_vessel_id,
      fit_state,
      fit_notes_json,
      setup_snapshot_json,
      created_at,
      updated_at
    `)
    .eq("batch_id", batchId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load batch F1 setup: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    batchId: data.batch_id,
    selectedRecipeId: data.selected_recipe_id,
    selectedVesselId: data.selected_vessel_id,
    fitState: data.fit_state,
    fitNotesJson: data.fit_notes_json,
    setupSnapshotJson: data.setup_snapshot_json,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
