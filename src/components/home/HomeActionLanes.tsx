import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import type { HomeActionLane } from "@/lib/home-command-center";
import { cn } from "@/lib/utils";

const laneToneClasses = {
  now: "border-primary/15 bg-honey-light/30",
  next_up: "border-sage/15 bg-sage-light/30",
  recently_moved: "border-border bg-card",
};

export function HomeActionLanes({
  lanes,
  id,
}: {
  lanes: HomeActionLane[];
  id?: string;
}) {
  const navigate = useNavigate();

  return (
    <section id={id} className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
          Action lanes
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
          What needs your attention, what is coming up, and what just moved
        </h2>
      </div>

      <div className="space-y-4">
        {lanes.map((lane) => (
          <section key={lane.key} className={cn("home-panel-surface px-4 py-4 lg:px-5", laneToneClasses[lane.key])}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">{lane.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{lane.description}</p>
              </div>
              <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
                {lane.items.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {lane.items.map((item) => (
                <button
                  key={`${lane.key}-${item.batch.id}`}
                  type="button"
                  onClick={() => navigate(item.linkTo)}
                  className="w-full rounded-[22px] border border-border/70 bg-background/90 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground">{item.batch.name}</h4>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StageIndicator stage={item.batch.currentStage} />
                        <CautionBadge level={item.cautionLevel} />
                        {item.attentionLabel ? (
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                            {item.attentionLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.statusSummary}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.secondarySummary}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/55 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Next action
                      </p>
                      <p className="mt-1 text-sm text-foreground">{item.nextAction}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
