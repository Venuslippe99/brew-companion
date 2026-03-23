import {
  Camera,
  FlaskConical,
  GlassWater,
  NotebookPen,
  Sparkles,
  Thermometer,
} from "lucide-react";
import type { BatchJournalEntryView } from "@/lib/batch-journal";

function getEntryStyle(entry: BatchJournalEntryView) {
  switch (entry.kind) {
    case "reflection":
      return {
        icon: Sparkles,
        cardClass: "border-primary/20 bg-primary/5",
        iconClass: "bg-primary text-primary-foreground",
      };
    case "stage_transition":
      return {
        icon: FlaskConical,
        cardClass: "border-primary/15 bg-card",
        iconClass: "bg-primary/10 text-primary",
      };
    case "taste_test":
      return {
        icon: GlassWater,
        cardClass: "border-primary/15 bg-card",
        iconClass: "bg-primary/10 text-primary",
      };
    case "note":
      return {
        icon: NotebookPen,
        cardClass: "border-border bg-card",
        iconClass: "bg-muted text-foreground",
      };
    case "photo":
      return {
        icon: Camera,
        cardClass: "border-border bg-card",
        iconClass: "bg-muted text-foreground",
      };
    case "completion":
      return {
        icon: Sparkles,
        cardClass: "border-primary/20 bg-primary/5",
        iconClass: "bg-primary text-primary-foreground",
      };
    case "f2_action":
      return {
        icon: FlaskConical,
        cardClass: "border-border bg-card",
        iconClass: "bg-muted text-foreground",
      };
    case "system_event":
    default:
      return {
        icon: Thermometer,
        cardClass: "border-border bg-card",
        iconClass: "bg-muted text-foreground",
      };
  }
}

export function BatchJournalEntry({
  entry,
}: {
  entry: BatchJournalEntryView;
}) {
  const style = getEntryStyle(entry);
  const Icon = style.icon;

  return (
    <div className={`rounded-3xl border p-4 sm:p-5 ${style.cardClass}`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${style.iconClass}`}
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {entry.beatLabel}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-foreground sm:text-base">
                {entry.title}
              </h3>
            </div>

            <span className="text-xs font-medium text-muted-foreground">
              {entry.occurredAtLabel}
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {entry.body && (
              <p className="text-sm leading-6 text-muted-foreground">{entry.body}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {entry.sourceLabel}
              </span>

              {entry.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
