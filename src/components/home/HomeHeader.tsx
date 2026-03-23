import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

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
  activeBatchCount,
  stateSentence,
  displayName,
  onOpenSettings,
}: {
  activeBatchCount: number;
  stateSentence: string;
  displayName?: string;
  onOpenSettings: () => void;
}) {
  const greeting = `${getGreeting()}${displayName ? `, ${displayName}` : ""}`;

  return (
    <section className="home-hero-surface overflow-hidden px-5 py-6 lg:px-7 lg:py-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
            {formatDateLine(new Date())}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            {greeting}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground lg:text-base">
            {stateSentence}
          </p>
        </div>

        <Button variant="warm" size="icon" onClick={onOpenSettings} aria-label="Open settings">
          <Settings className="h-4.5 w-4.5" />
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
          {activeBatchCount} active {activeBatchCount === 1 ? "brew" : "brews"}
        </span>
        <span className="rounded-full border border-border/60 bg-sage-light/70 px-3 py-1 text-xs font-medium text-secondary-foreground">
          Daily command center
        </span>
      </div>
    </section>
  );
}
