type NewBatchBrewReadMetric = {
  label: string;
  value: string;
  hint?: string;
};

type NewBatchBrewReadProps = {
  metrics: NewBatchBrewReadMetric[];
  summary: string;
  timingLabel: string;
  timingText: string;
};

export function NewBatchBrewRead({
  metrics,
  summary,
  timingLabel,
  timingText,
}: NewBatchBrewReadProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Brew read
        </p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">
          How this setup looks so far
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Kombloom keeps reading the proportions as you change them, so you can judge the brew
          before you reach review.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-primary/10 bg-background p-3">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{metric.value}</p>
            {metric.hint ? (
              <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-primary/10 bg-background p-3">
          <p className="text-xs text-muted-foreground">Quick read</p>
          <p className="mt-1 text-sm text-foreground">{summary}</p>
        </div>

        <div className="rounded-xl border border-primary/10 bg-background p-3">
          <p className="text-xs text-muted-foreground">{timingLabel}</p>
          <p className="mt-1 text-sm text-foreground">{timingText}</p>
        </div>
      </div>
    </section>
  );
}
