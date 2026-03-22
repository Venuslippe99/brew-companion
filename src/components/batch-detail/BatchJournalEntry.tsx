import type { BatchJournalEntryView } from "@/lib/batch-journal";

export function BatchJournalEntry({
  entry,
}: {
  entry: BatchJournalEntryView;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        entry.emphasis === "reflection"
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{entry.title}</p>
          {entry.body && (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.body}</p>
          )}
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {entry.sourceLabel}
        </span>
      </div>

      {entry.tags && entry.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
