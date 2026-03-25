import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { homeCopy } from "@/copy/home";

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
  onOpenSettings,
  onStartBatch,
  onViewBatches,
}: {
  stateSentence: string;
  displayName?: string;
  onOpenSettings: () => void;
  onStartBatch: () => void;
  onViewBatches: () => void;
}) {
  const greeting = `${getGreeting()}${displayName ? `, ${displayName}` : ""}`;

  return (
    <section className="home-header-surface overflow-hidden px-5 py-5 lg:px-6 lg:py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
            {formatDateLine(new Date())}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground lg:text-[2.7rem]">
            {greeting}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground lg:text-base">
            {stateSentence}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onOpenSettings}
          aria-label={homeCopy.page.headerSettingsAria}
        >
          <Settings className="h-4.5 w-4.5" />
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button size="lg" onClick={onStartBatch}>
          {homeCopy.header.primaryAction}
        </Button>
        <Button variant="outline" size="lg" onClick={onViewBatches}>
          {homeCopy.header.secondaryAction}
        </Button>
      </div>
    </section>
  );
}
