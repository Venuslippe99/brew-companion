import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import type { HomeTodayQueueItem } from "@/lib/home-command-center";
import { cn } from "@/lib/utils";

const toneClasses = {
  urgent: "border-destructive/20 bg-destructive/5",
  warm: "border-primary/20 bg-honey-light/45",
  calm: "border-border/80 bg-background/85",
};

export function HomeTodayQueue({
  items,
  id,
}: {
  items: HomeTodayQueueItem[];
  id?: string;
}) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return null;
  }

  return (
    <section id={id} className="home-panel-surface px-5 py-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
          Today
        </p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">
          Keep an eye on these too
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A few more brews to keep in sight after the main focus.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <button
            key={item.batch.id}
            type="button"
            onClick={() => navigate(item.linkTo)}
            className={cn(
              "w-full rounded-[22px] border px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5",
              toneClasses[item.tone]
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{item.batch.name}</h3>
                  <span className="rounded-full bg-background/85 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {item.reasonLabel}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StageIndicator stage={item.batch.currentStage} />
                  <CautionBadge level={item.batch.cautionLevel} />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">{item.statusSummary}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.secondarySummary}</p>
              </div>
              <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
