import type { BatchJournalRecap as BatchJournalRecapView } from "@/lib/batch-journal";

export function BatchJournalRecap({
  recap,
}: {
  recap: BatchJournalRecapView;
}) {
  return (
    <div className="rounded-3xl border border-primary/15 bg-primary/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {recap.eyebrow}
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold text-foreground">
            {recap.title}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {recap.summary}
          </p>
        </div>

        {recap.timeframe && (
          <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            {recap.timeframe}
          </span>
        )}
      </div>

      {recap.highlights.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {recap.highlights.map((highlight) => (
            <span
              key={highlight}
              className="rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground"
            >
              {highlight}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
