import {
  type BatchStage,
  type BatchStatus,
  type KombuchaBatch,
  getNextAction,
  getStageLabel,
} from "@/lib/batches";

export type ActiveBatchLibraryFilter =
  | "all"
  | "needs_attention"
  | "f1"
  | "f2"
  | "ready_to_check"
  | "recently_updated";

export type BatchLibrarySort = "updated_desc" | "brew_desc" | "brew_asc" | "name_asc";

function isF1Stage(stage: BatchStage) {
  return ["f1_active", "f1_check_window", "f1_extended"].includes(stage);
}

function isF2Stage(stage: BatchStage) {
  return ["f2_setup", "f2_active", "refrigerate_now", "chilled_ready"].includes(stage);
}

function isReadyToCheckStage(stage: BatchStage) {
  return ["f1_check_window", "f1_extended", "refrigerate_now", "chilled_ready"].includes(stage);
}

function getTargetPreferenceLabel(target: KombuchaBatch["targetPreference"]) {
  const labels: Record<KombuchaBatch["targetPreference"], string> = {
    sweeter: "sweeter",
    balanced: "balanced",
    tart: "tart",
    stronger_carbonation: "stronger carbonation",
    safer_guided: "safer guided",
  };

  return labels[target];
}

export function matchesBatchLibrarySearch(batch: KombuchaBatch, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const searchableText = [
    batch.name,
    batch.teaType,
    batch.vesselType,
    getStageLabel(batch.currentStage),
    getNextAction(batch),
    getTargetPreferenceLabel(batch.targetPreference),
    batch.sugarType || "",
    batch.teaSourceForm || "",
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query);
}

export function matchesActiveBatchLibraryFilter(
  batch: KombuchaBatch,
  filter: ActiveBatchLibraryFilter
) {
  if (batch.status !== "active") {
    return false;
  }

  switch (filter) {
    case "all":
      return true;
    case "needs_attention":
      return (
        batch.cautionLevel === "high" ||
        batch.cautionLevel === "moderate" ||
        ["f1_check_window", "f1_extended", "f2_setup", "refrigerate_now", "chilled_ready"].includes(
          batch.currentStage
        )
      );
    case "f1":
      return isF1Stage(batch.currentStage);
    case "f2":
      return isF2Stage(batch.currentStage);
    case "ready_to_check":
      return isReadyToCheckStage(batch.currentStage);
    case "recently_updated":
      return Date.now() - new Date(batch.updatedAt).getTime() <= 1000 * 60 * 60 * 24 * 3;
  }
}

export function sortBatchLibraryBatches(batches: KombuchaBatch[], sort: BatchLibrarySort) {
  const next = [...batches];

  switch (sort) {
    case "updated_desc":
      next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      break;
    case "brew_desc":
      next.sort((a, b) => new Date(b.brewStartedAt).getTime() - new Date(a.brewStartedAt).getTime());
      break;
    case "brew_asc":
      next.sort((a, b) => new Date(a.brewStartedAt).getTime() - new Date(b.brewStartedAt).getTime());
      break;
    case "name_asc":
      next.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return next;
}

export function getBatchLibraryStatusCount(batches: KombuchaBatch[], status: BatchStatus) {
  return batches.filter((batch) => batch.status === status).length;
}
