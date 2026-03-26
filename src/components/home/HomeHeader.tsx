import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { homeCopy } from "@/copy/home";
import type { HomeCurrentStat } from "@/lib/home-command-center";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDateLine(now: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
}

export function HomeHeader({
  stateSentence,
  displayName,
  currentStats,
  onOpenSettings,
  onStartBatch,
  onViewBatches,
}: {
  stateSentence: string;
  displayName?: string;
  currentStats: HomeCurrentStat[];
  onOpenSettings: () => void;
  onStartBatch: () => void;
  onViewBatches: () => void;
}) {
  const greeting = `${getGreeting()}${displayName ? `, ${displayName}` : ""}`;

  return (
    <section className="surface-section overflow-hidden px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="type-section-kicker">{formatDateLine(new Date())}</p>
          <h1 className="mt-2 type-page-title sm:text-[2.2rem] lg:text-[2.7rem]">
            {greeting}
          </h1>
          <p className="mt-2 max-w-2xl type-helper">{stateSentence}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onOpenSettings}
          aria-label={homeCopy.page.headerSettingsAria}
          className="shrink-0"
        >
          <Settings className="h-4.5 w-4.5" />
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onStartBatch}>{homeCopy.header.primaryAction}</Button>
        <Button variant="outline" onClick={onViewBatches}>
          {homeCopy.header.secondaryAction}
        </Button>
      </div>

      <div className="mt-4">
        <p className="type-stat-label">{homeCopy.header.currentStatsLabel}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
          {currentStats.map((stat) => (
            <div
              key={stat.key}
              className="surface-list-compact px-3 py-3"
            >
              <p className="type-stat-label">{stat.label}</p>
              <p className="mt-2 type-stat-value font-display">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
