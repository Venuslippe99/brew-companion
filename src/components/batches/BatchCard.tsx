import { KombuchaBatch, getDayNumber, getNextAction } from "@/lib/mock-data";
import { StageIndicator, CautionBadge } from "@/components/common/StageIndicator";
import { useNavigate } from "react-router-dom";

interface BatchCardProps {
  batch: KombuchaBatch;
  compact?: boolean;
}

export function BatchCard({ batch, compact = false }: BatchCardProps) {
  const navigate = useNavigate();
  const dayNum = getDayNumber(batch.brewStartedAt);
  const nextAction = getNextAction(batch);

  return (
    <button
      onClick={() => navigate(`/batch/${batch.id}`)}
      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 active:scale-[0.98] group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {batch.name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <StageIndicator stage={batch.currentStage} />
            <CautionBadge level={batch.cautionLevel} />
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-2xl font-display font-semibold text-foreground tabular-nums">
            {dayNum}
          </span>
          <span className="block text-xs text-muted-foreground">
            {dayNum === 1 ? "day" : "days"}
          </span>
        </div>
      </div>

      {!compact && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-primary/40" />
            {nextAction}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{batch.teaType}</span>
            <span>·</span>
            <span>{batch.avgRoomTempC}°C</span>
            <span>·</span>
            <span>{(batch.totalVolumeMl / 1000).toFixed(1)}L</span>
          </div>
        </div>
      )}
    </button>
  );
}
