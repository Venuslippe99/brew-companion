import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import type { HomeRosterItem } from "@/lib/home-command-center";
import { cn } from "@/lib/utils";

const toneClasses = {
  urgent: "border-destructive/15",
  warm: "border-primary/15",
  calm: "border-border/70",
};

export function HomeBatchRoster({
  items,
  id,
}: {
  items: HomeRosterItem[];
  id?: string;
}) {
  const navigate = useNavigate();

  return (
    <section id={id} className="home-panel-surface px-5 py-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
            Your brews
          </p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            Keep your active batches close
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse your active brews here, then open the full list when you want deeper detail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/batches")}
          className="text-sm font-medium text-copper transition-colors hover:text-foreground"
        >
          Open My Batches
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <button
            key={item.batch.id}
            type="button"
            onClick={() => navigate(item.linkTo)}
            className={cn(
              "w-full rounded-[20px] border bg-background/85 px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5",
              toneClasses[item.tone]
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">{item.batch.name}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StageIndicator stage={item.batch.currentStage} />
                  <CautionBadge level={item.batch.cautionLevel} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  Day {item.dayNumber}
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{item.statusLine}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
