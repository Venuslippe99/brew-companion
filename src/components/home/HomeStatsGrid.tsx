import { homeCopy } from "@/copy/home";
import type { HomeCurrentStat, HomeLifetimeStat } from "@/lib/home-command-center";

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-background/90 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-display font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

function StatGroup({
  title,
  description,
  stats,
}: {
  title: string;
  description: string;
  stats: Array<HomeCurrentStat | HomeLifetimeStat>;
}) {
  return (
    <section className="home-panel-surface px-5 py-5 lg:px-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
          {title}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {stats.map((stat) => (
          <StatCard key={stat.key} label={stat.label} value={stat.value} helper={stat.helper} />
        ))}
      </div>
    </section>
  );
}

export function HomeStatsGrid({
  currentStats,
  lifetimeStats,
}: {
  currentStats: HomeCurrentStat[];
  lifetimeStats: HomeLifetimeStat[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <StatGroup
        title={homeCopy.stats.currentTitle}
        description={homeCopy.stats.currentDescription}
        stats={currentStats}
      />
      <StatGroup
        title={homeCopy.stats.lifetimeTitle}
        description={homeCopy.stats.lifetimeDescription}
        stats={lifetimeStats}
      />
    </div>
  );
}
