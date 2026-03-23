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
    <section id={id} className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
            Active roster
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
            Keep every active brew visible, not just the urgent ones
          </h2>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.batch.id}
            type="button"
            onClick={() => navigate(item.linkTo)}
            className={cn(
              "home-utility-surface w-full text-left transition-all duration-200 hover:-translate-y-0.5",
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
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-display text-2xl font-semibold leading-none text-foreground tabular-nums">
                    {item.dayNumber}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Day
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">{item.statusLine}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
