import { homeCopy } from "@/copy/home";
import type { HomeLifetimeStat } from "@/lib/home-command-center";

export function HomeStatsGrid({
  stats,
}: {
  stats: HomeLifetimeStat[];
}) {
  return (
    <section className="home-panel-surface px-4 py-4 sm:px-5 sm:py-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
          {homeCopy.stats.lifetimeTitle}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{homeCopy.stats.lifetimeDescription}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="rounded-[18px] border border-border/70 bg-background/90 px-3 py-3"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-xl font-display font-semibold tracking-tight text-foreground sm:text-2xl">
              {stat.value}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{stat.helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
