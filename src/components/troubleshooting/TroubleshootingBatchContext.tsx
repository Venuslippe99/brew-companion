import { Clock3, Refrigerator, Thermometer, TestTube2 } from "lucide-react";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import type { BatchTimingResult } from "@/lib/batch-timing";
import type { KombuchaBatch } from "@/lib/batches";
import type { LoadedF2Setup } from "@/lib/f2-current-setup";
import type { TroubleshootingReminderContext } from "@/lib/troubleshooting/types";

type Props = {
  batch?: KombuchaBatch | null;
  timing?: BatchTimingResult | null;
  nearestReminder?: TroubleshootingReminderContext | null;
  f2Setup?: LoadedF2Setup | null;
};

export function TroubleshootingBatchContext({
  batch,
  timing,
  nearestReminder,
  f2Setup,
}: Props) {
  if (!batch) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Batch context
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No batch is attached yet. You can still troubleshoot generally, but the assistant will
          need to ask a few extra context questions.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Batch context
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold text-foreground">{batch.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StageIndicator stage={batch.currentStage} />
            <CautionBadge level={batch.cautionLevel} />
          </div>
        </div>

        <div className="rounded-xl bg-muted/50 px-3 py-2 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Next action
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {batch.nextAction || "Open batch detail"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {timing ? (
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              Timing
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{timing.statusLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">{timing.nextCheckText}</p>
          </div>
        ) : (
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Timing
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              No timing estimate is available for the current stage.
            </p>
          </div>
        )}

        <div className="rounded-xl bg-muted/50 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Thermometer className="h-3.5 w-3.5" />
            Batch details
          </p>
          <p className="mt-1 text-sm text-foreground">
            {batch.avgRoomTempC}°C room temp, {batch.targetPreference.replace(/_/g, " ")} target
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {Math.round((batch.starterLiquidMl / batch.totalVolumeMl) * 100)}% starter ratio
          </p>
        </div>
      </div>

      {(nearestReminder || f2Setup) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {nearestReminder ? (
            <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reminder
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{nearestReminder.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Due {new Date(nearestReminder.dueAt).toLocaleDateString()}
              </p>
            </div>
          ) : null}

          {f2Setup ? (
            <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Refrigerator className="h-3.5 w-3.5" />
                F2 setup
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {f2Setup.desiredCarbonationLevel} carbonation, {f2Setup.bottleCount} bottles
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {f2Setup.ambientTempC}°C, pressure risk {f2Setup.estimatedPressureRisk || "not set"}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {batch.initialPh ? (
        <div className="mt-4 rounded-xl border border-border bg-background p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <TestTube2 className="h-3.5 w-3.5" />
            Saved pH
          </p>
          <p className="mt-1 text-sm text-foreground">{batch.initialPh.toFixed(1)}</p>
        </div>
      ) : null}
    </div>
  );
}
