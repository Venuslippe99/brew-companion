import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock3 } from "lucide-react";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import { type TodayActionItem } from "@/lib/today-actions";

export function TodayActionCard({ item }: { item: TodayActionItem }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(item.linkTo)}
      className="w-full text-left rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">
            {item.batch.name}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StageIndicator stage={item.batch.currentStage} />
            <CautionBadge level={item.cautionLevel} />
            {item.attentionLabel && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {item.attentionLabel}
              </span>
            )}
          </div>
        </div>

        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">{item.statusSummary}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {item.secondarySummary}
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Next action
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{item.nextAction}</p>
        </div>
      </div>
    </button>
  );
}
