import { ArrowUpRight, Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { KombuchaBatch, getDayNumber, getNextAction } from "@/lib/batches";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import { cn } from "@/lib/utils";

interface BatchCardProps {
  batch: KombuchaBatch;
  compact?: boolean;
}

function formatShortDate(value?: string) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getCardCopy(batch: KombuchaBatch, nextAction: string) {
  switch (batch.status) {
    case "active":
      return {
        eyebrow: "Brewing now",
        summaryLabel: "What to do next",
        summaryText: nextAction,
        supportingText: "Open the batch to log checks, review timing, or move to the next step.",
      };
    case "completed":
      return {
        eyebrow: "Finished batch",
        summaryLabel: "Worth revisiting",
        summaryText: "Reopen this batch for outcomes, tasting notes, and the path it took to finish.",
        supportingText: "A useful place to look back before you brew something similar again.",
      };
    case "archived":
      return {
        eyebrow: "Reference batch",
        summaryLabel: "Saved for later",
        summaryText: "This batch is archived so you can revisit its setup, notes, and history when you need it.",
        supportingText: "Open it when you want a quieter reference point from a past brew.",
      };
    case "discarded":
      return {
        eyebrow: "Past batch",
        summaryLabel: "Kept in history",
        summaryText: "This batch stays here so you can remember what happened and what you may want to avoid next time.",
        supportingText: "Open it if you want to revisit the notes behind the discard.",
      };
  }
}

function getSurfaceTone(batch: KombuchaBatch) {
  if (batch.status === "active") {
    return batch.cautionLevel === "high" ? "surface-tone-danger" : "surface-tone-warm";
  }

  if (batch.status === "completed") {
    return "surface-tone-calm";
  }

  if (batch.status === "discarded") {
    return "surface-tone-danger";
  }

  return "";
}

export function BatchCard({ batch, compact = false }: BatchCardProps) {
  const navigate = useNavigate();
  const dayNum = getDayNumber(batch.brewStartedAt);
  const nextAction = getNextAction(batch);
  const cardCopy = getCardCopy(batch, nextAction);
  const brewedOnLabel = formatShortDate(batch.brewStartedAt);
  const completedOnLabel = formatShortDate(batch.completedAt);
  const updatedOnLabel = formatShortDate(batch.updatedAt);
  const statusMetaLabel =
    batch.status === "active"
      ? `Day ${dayNum}`
      : batch.status === "completed"
        ? completedOnLabel
          ? `Finished ${completedOnLabel}`
          : "Finished"
        : updatedOnLabel
          ? `Updated ${updatedOnLabel}`
          : "Saved";
  const outerSurfaceClass = batch.status === "active" ? "surface-section" : "surface-section-quiet";
  const statusMetaClass = "status-badge border-border/70 bg-background/85 text-muted-foreground";

  return (
    <button
      type="button"
      onClick={() => navigate(`/batch/${batch.id}`)}
      className={cn(
        "group w-full p-5 text-left motion-press surface-interactive",
        outerSurfaceClass,
        getSurfaceTone(batch),
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="type-section-kicker">{cardCopy.eyebrow}</p>
          <h3 className="mt-2 truncate font-display text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
            {batch.name}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StageIndicator stage={batch.currentStage} />
            <CautionBadge level={batch.cautionLevel} />
          </div>
        </div>
        <div className={cn("shrink-0", statusMetaClass)}>
          {statusMetaLabel}
        </div>
      </div>

      {!compact ? (
        <div className="mt-4">
          <div className="surface-list-compact px-4 py-4">
            <p className="type-stat-label">
              {cardCopy.summaryLabel}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-foreground">
              {cardCopy.summaryText}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <span>{batch.teaType}</span>
            <span className="text-border">/</span>
            <span>{(batch.totalVolumeMl / 1000).toFixed(1)} L</span>
            {batch.status === "active" ? (
              <>
                <span className="text-border">/</span>
                <span>{batch.avgRoomTempC} deg C</span>
              </>
            ) : brewedOnLabel ? (
              <>
                <span className="text-border">/</span>
                <span>Brewed {brewedOnLabel}</span>
              </>
            ) : null}
          </div>

          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4 text-copper" />
            {cardCopy.supportingText}
          </p>

          <div className="mt-4 flex items-center justify-end text-sm font-medium text-copper">
            Open batch
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </div>
        </div>
      ) : null}
    </button>
  );
}
