import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import {
  buildAcceptedRecommendationIdsJson,
  buildRecommendationSnapshotJson,
  F1_RECOMMENDATION_ENGINE_VERSION,
  type F1RecommendationHistoryEntry,
  type F1RecommendationSnapshot,
} from "@/lib/f1-recommendation-types";
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
  recommendationSnapshotJson: Json;
  recommendationEngineVersion: string | null;
  acceptedRecommendationIdsJson: Json;
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
  recommendationSnapshot?: F1RecommendationSnapshot | null;
  acceptedRecommendationIds?: string[];
};

type RecommendationHistoryBatchRow = Pick<
  Tables<"kombucha_batches">,
  | "id"
  | "name"
  | "brew_started_at"
  | "updated_at"
  | "f1_recipe_id"
  | "total_volume_ml"
  | "tea_type"
  | "tea_source_form"
  | "tea_amount_value"
  | "tea_amount_unit"
  | "sugar_g"
  | "sugar_type"
  | "starter_liquid_ml"
  | "scoby_present"
  | "avg_room_temp_c"
  | "vessel_type"
  | "target_preference"
  | "initial_notes"
  | "starter_source_batch_id"
  | "starter_source_type"
  | "brew_again_source_batch_id"
>;

type RecommendationHistorySetupRow = Pick<
  Tables<"batch_f1_setups">,
  | "batch_id"
  | "selected_recipe_id"
  | "selected_vessel_id"
  | "setup_snapshot_json"
  | "fit_state"
  | "created_at"
  | "updated_at"
>;

function getJsonRecord(value: Json): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getJsonString(record: Record<string, unknown> | null, key: string) {
  return record && typeof record[key] === "string" ? (record[key] as string) : null;
}

function getJsonNumber(record: Record<string, unknown> | null, key: string) {
  return record && typeof record[key] === "number" ? (record[key] as number) : null;
}

function getJsonBoolean(record: Record<string, unknown> | null, key: string) {
  return record && typeof record[key] === "boolean" ? (record[key] as boolean) : null;
}

function toTeaSourceForm(value: string | null | undefined): F1BatchSetupFields["teaSourceForm"] {
  if (value === "loose_leaf" || value === "other") {
    return value;
  }

  return "tea_bags";
}

function toTeaAmountUnit(value: string | null | undefined): F1BatchSetupFields["teaAmountUnit"] {
  if (value === "g" || value === "tbsp" || value === "tsp") {
    return value;
  }

  return "bags";
}

function toTargetPreference(
  value: string | null | undefined
): F1BatchSetupFields["targetPreference"] {
  if (value === "sweeter" || value === "tart") {
    return value;
  }

  return "balanced";
}

function buildHistorySetupFromSnapshot(
  snapshot: Json,
  fallbackBatch: RecommendationHistoryBatchRow
): F1BatchSetupFields {
  const snapshotRecord = getJsonRecord(snapshot);
  const actualComposition = getJsonRecord(snapshotRecord?.actualComposition as Json);

  return {
    totalVolumeMl:
      getJsonNumber(actualComposition, "totalVolumeMl") ?? fallbackBatch.total_volume_ml,
    teaType: getJsonString(actualComposition, "teaType") ?? fallbackBatch.tea_type,
    teaSourceForm: toTeaSourceForm(
      getJsonString(actualComposition, "teaSourceForm") ?? fallbackBatch.tea_source_form
    ),
    teaAmountValue:
      getJsonNumber(actualComposition, "teaAmountValue") ??
      Number(fallbackBatch.tea_amount_value ?? 0),
    teaAmountUnit: toTeaAmountUnit(
      getJsonString(actualComposition, "teaAmountUnit") ?? fallbackBatch.tea_amount_unit
    ),
    sugarG: getJsonNumber(actualComposition, "sugarG") ?? Number(fallbackBatch.sugar_g),
    sugarType: getJsonString(actualComposition, "sugarType") ?? fallbackBatch.sugar_type ?? "Other",
    starterLiquidMl:
      getJsonNumber(actualComposition, "starterLiquidMl") ??
      Number(fallbackBatch.starter_liquid_ml),
    scobyPresent:
      getJsonBoolean(actualComposition, "scobyPresent") ?? fallbackBatch.scoby_present,
    avgRoomTempC:
      getJsonNumber(actualComposition, "avgRoomTempC") ??
      Number(fallbackBatch.avg_room_temp_c),
    vesselType:
      getJsonString(actualComposition, "vesselType") ?? fallbackBatch.vessel_type ?? "Manual vessel",
    targetPreference: toTargetPreference(
      getJsonString(actualComposition, "targetPreference") ?? fallbackBatch.target_preference
    ),
    initialNotes:
      getJsonString(actualComposition, "initialNotes") ?? fallbackBatch.initial_notes ?? "",
  };
}

function buildHistorySelectedVessel(snapshot: Json): SelectedF1Vessel | null {
  const snapshotRecord = getJsonRecord(snapshot);
  const vesselContext = getJsonRecord(snapshotRecord?.vesselContext as Json);

  const materialType = getJsonString(vesselContext, "materialTypeSnapshot");
  const suitability = getJsonString(vesselContext, "suitabilitySnapshot");

  if (!materialType || !suitability) {
    return null;
  }

  return {
    source:
      getJsonString(vesselContext, "source") === "saved" ? "saved" : "manual",
    vesselId: getJsonString(vesselContext, "selectedVesselId"),
    name: getJsonString(vesselContext, "vesselNameSnapshot") || "Manual vessel",
    materialType: materialType as SelectedF1Vessel["materialType"],
    capacityMl: getJsonNumber(vesselContext, "capacityMlSnapshot"),
    recommendedMaxFillMl: getJsonNumber(vesselContext, "recommendedMaxFillMlSnapshot"),
    f1Suitability: suitability as SelectedF1Vessel["f1Suitability"],
    notes: getJsonString(vesselContext, "notesSnapshot") || "",
    isSaved: getJsonString(vesselContext, "source") === "saved",
  };
}

function getLineageIdsFromSnapshot(snapshot: Json) {
  const snapshotRecord = getJsonRecord(snapshot);
  const lineageContext = getJsonRecord(snapshotRecord?.lineageContext as Json);

  return {
    starterSourceBatchId: getJsonString(lineageContext, "starterSourceBatchId"),
    brewAgainSourceBatchId: getJsonString(lineageContext, "brewAgainSourceBatchId"),
  };
}

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
    recommendation_snapshot_json: buildRecommendationSnapshotJson(args.recommendationSnapshot),
    recommendation_engine_version: args.recommendationSnapshot
      ? F1_RECOMMENDATION_ENGINE_VERSION
      : null,
    accepted_recommendation_ids_json: buildAcceptedRecommendationIdsJson(
      args.acceptedRecommendationIds || []
    ),
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
      recommendation_snapshot_json,
      recommendation_engine_version,
      accepted_recommendation_ids_json,
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
    recommendationSnapshotJson: data.recommendation_snapshot_json,
    recommendationEngineVersion: data.recommendation_engine_version,
    acceptedRecommendationIdsJson: data.accepted_recommendation_ids_json,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function loadF1RecommendationHistory(args: {
  userId: string;
  limit?: number;
  includeBatchIds?: string[];
}): Promise<F1RecommendationHistoryEntry[]> {
  const limit = args.limit ?? 40;
  const includeBatchIds = Array.from(new Set((args.includeBatchIds || []).filter(Boolean)));

  const { data: setupRows, error: setupError } = await supabase
    .from("batch_f1_setups")
    .select(
      "batch_id, selected_recipe_id, selected_vessel_id, setup_snapshot_json, fit_state, created_at, updated_at"
    )
    .eq("created_by_user_id", args.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (setupError) {
    throw new Error(`Could not load F1 recommendation history: ${setupError.message}`);
  }

  const uniqueBatchIds = Array.from(
    new Set([...(setupRows || []).map((row) => row.batch_id), ...includeBatchIds])
  );

  if (uniqueBatchIds.length === 0) {
    return [];
  }

  const { data: batchRows, error: batchError } = await supabase
    .from("kombucha_batches")
    .select(
      "id, name, brew_started_at, updated_at, f1_recipe_id, total_volume_ml, tea_type, tea_source_form, tea_amount_value, tea_amount_unit, sugar_g, sugar_type, starter_liquid_ml, scoby_present, avg_room_temp_c, vessel_type, target_preference, initial_notes, starter_source_batch_id, starter_source_type, brew_again_source_batch_id"
    )
    .eq("user_id", args.userId)
    .in("id", uniqueBatchIds);

  if (batchError) {
    throw new Error(`Could not load batches for F1 recommendation history: ${batchError.message}`);
  }

  const batchMap = new Map(
    ((batchRows || []) as RecommendationHistoryBatchRow[]).map((row) => [row.id, row] as const)
  );
  const setupMap = new Map(
    ((setupRows || []) as RecommendationHistorySetupRow[]).map((row) => [row.batch_id, row] as const)
  );

  return uniqueBatchIds
    .map((batchId) => {
      const batch = batchMap.get(batchId);

      if (!batch) {
        return null;
      }

      const setupRow = setupMap.get(batchId);
      const lineageIds = setupRow
        ? getLineageIdsFromSnapshot(setupRow.setup_snapshot_json)
        : {
            starterSourceBatchId:
              batch.starter_source_type === "previous_batch"
                ? batch.starter_source_batch_id
                : null,
            brewAgainSourceBatchId: batch.brew_again_source_batch_id,
          };

      return {
        batchId: batch.id,
        batchName: batch.name,
        brewStartedAt: batch.brew_started_at,
        updatedAt: setupRow?.updated_at || batch.updated_at,
        selectedRecipeId: setupRow?.selected_recipe_id ?? batch.f1_recipe_id,
        setup: setupRow
          ? buildHistorySetupFromSnapshot(setupRow.setup_snapshot_json, batch)
          : {
              totalVolumeMl: batch.total_volume_ml,
              teaType: batch.tea_type,
              teaSourceForm: toTeaSourceForm(batch.tea_source_form),
              teaAmountValue: Number(batch.tea_amount_value ?? 0),
              teaAmountUnit: toTeaAmountUnit(batch.tea_amount_unit),
              sugarG: Number(batch.sugar_g),
              sugarType: batch.sugar_type ?? "Other",
              starterLiquidMl: Number(batch.starter_liquid_ml),
              scobyPresent: batch.scoby_present,
              avgRoomTempC: Number(batch.avg_room_temp_c),
              vesselType: batch.vessel_type ?? "Manual vessel",
              targetPreference: toTargetPreference(batch.target_preference),
              initialNotes: batch.initial_notes ?? "",
            },
        selectedVessel: setupRow ? buildHistorySelectedVessel(setupRow.setup_snapshot_json) : null,
        fitState: setupRow?.fit_state ?? null,
        starterSourceBatchId: lineageIds.starterSourceBatchId,
        brewAgainSourceBatchId: lineageIds.brewAgainSourceBatchId,
        hasSnapshot: !!setupRow,
        outcome: null,
      } satisfies F1RecommendationHistoryEntry;
    })
    .filter((entry): entry is NonNullable<typeof entry> => !!entry)
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
}
