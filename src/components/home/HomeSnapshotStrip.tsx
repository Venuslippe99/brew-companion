import { Activity, FlaskConical, Sparkles, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeSnapshotStat } from "@/lib/home-command-center";

const iconMap = {
  active: FlaskConical,
  attention: Sparkles,
  window: Waves,
  movement: Activity,
};

export function HomeSnapshotStrip({
  stats,
}: {
  stats: HomeSnapshotStat[];
}) {
  const handleJump = (targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = iconMap[stat.key];

        return (
          <button
            key={stat.key}
            type="button"
            onClick={() => handleJump(stat.targetId)}
            className={cn(
              "home-utility-surface text-left transition-transform hover:-translate-y-0.5",
              stat.key === "attention" && stat.value > 0 ? "border-primary/20 bg-honey-light/60" : ""
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-foreground">
                  {stat.value}
                </p>
              </div>
              <span className="rounded-full bg-background/80 p-2 text-copper">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{stat.description}</p>
          </button>
        );
      })}
    </section>
  );
}
