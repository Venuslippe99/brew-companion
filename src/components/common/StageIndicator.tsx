import { type BatchStage, getStageLabel } from "@/lib/mock-data";

const stageStyleMap: Record<string, string> = {
  f1_active: "bg-stage-f1 stage-f1",
  f1_check_window: "bg-stage-check stage-check",
  f1_extended: "bg-stage-f1 stage-f1",
  f2_setup: "bg-stage-f2 stage-f2",
  f2_active: "bg-stage-f2 stage-f2",
  refrigerate_now: "bg-stage-danger stage-danger",
  chilled_ready: "bg-stage-ready stage-ready",
  completed: "bg-stage-complete stage-complete",
  archived: "bg-stage-complete stage-complete",
  discarded: "bg-stage-danger stage-danger",
};

export function StageIndicator({ stage, size = "sm" }: { stage: BatchStage; size?: "sm" | "md" }) {
  const styles = stageStyleMap[stage] || "bg-muted text-muted-foreground";
  const sizeClass = size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${styles}`}>
      {getStageLabel(stage)}
    </span>
  );
}

export function CautionBadge({ level }: { level: "none" | "low" | "moderate" | "high" }) {
  if (level === "none") return null;
  const styles = {
    low: "bg-caution-bg text-caution-foreground",
    moderate: "bg-caution-bg text-caution-foreground",
    high: "bg-destructive/10 text-destructive",
  };
  const labels = { low: "Monitor", moderate: "Caution", high: "High Caution" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[level]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-gentle" />
      {labels[level]}
    </span>
  );
}
