export type BatchStage =
  | "f1_active"
  | "f1_check_window"
  | "f1_extended"
  | "f2_setup"
  | "f2_active"
  | "refrigerate_now"
  | "chilled_ready"
  | "completed"
  | "archived"
  | "discarded";

export type BatchStatus = "active" | "completed" | "archived" | "discarded";

export type BatchCautionLevel = "none" | "low" | "moderate" | "high";

export interface KombuchaBatch {
  id: string;
  name: string;
  status: BatchStatus;
  currentStage: BatchStage;
  brewStartedAt: string;
  f2StartedAt?: string;
  totalVolumeMl: number;
  teaType: string;
  sugarG: number;
  starterLiquidMl: number;
  scobyPresent: boolean;
  avgRoomTempC: number;
  vesselType: string;
  targetPreference: "sweeter" | "balanced" | "tart";
  initialPh?: number;
  initialNotes?: string;
  cautionLevel: BatchCautionLevel;
  readinessWindowStart?: string;
  readinessWindowEnd?: string;
  completedAt?: string;
  updatedAt: string;
}

export function getDayNumber(brewStartedAt: string): number {
  const start = new Date(brewStartedAt);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function getStageLabel(stage: BatchStage): string {
  const labels: Record<BatchStage, string> = {
    f1_active: "F1 Active",
    f1_check_window: "Check Window",
    f1_extended: "Extended F1",
    f2_setup: "F2 Setup",
    f2_active: "F2 Active",
    refrigerate_now: "Refrigerate Now",
    chilled_ready: "Chilled & Ready",
    completed: "Completed",
    archived: "Archived",
    discarded: "Discarded",
  };

  return labels[stage];
}

export function getNextAction(batch: KombuchaBatch): string {
  const actions: Record<BatchStage, string> = {
    f1_active: "Wait & monitor fermentation",
    f1_check_window: "Taste test recommended",
    f1_extended: "Taste test & evaluate",
    f2_setup: "Set up F2 bottles",
    f2_active: "Monitor carbonation",
    refrigerate_now: "Move to refrigerator",
    chilled_ready: "Enjoy your brew!",
    completed: "Batch complete",
    archived: "Archived",
    discarded: "Discarded",
  };

  return actions[batch.currentStage];
}
