import { Button } from "@/components/ui/button";
import type { LineageInsight } from "@/lib/lineage-analytics";

type LineageAnalyticsCardsProps = {
  insights: LineageInsight[];
  familyOutcomeCount: number;
  onOpenBatch: (batchId: string) => void;
};

export function LineageAnalyticsCards({
  insights,
  familyOutcomeCount,
  onOpenBatch,
}: LineageAnalyticsCardsProps) {
  if (familyOutcomeCount < 2) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Family insights
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Save a few more F2 outcomes in this family before Kombloom starts comparing patterns here.
        </p>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Family insights
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This family has some saved outcomes, but there is not a strong enough repeat pattern to summarize yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Family insights
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These are runtime summaries based on saved lineage and phase outcomes so far.
        </p>
      </div>

      <div className="grid gap-3">
        {insights.map((insight) => (
          <div key={insight.key} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{insight.summary}</p>
              </div>
              {insight.batchId && (
                <Button size="sm" variant="outline" onClick={() => onOpenBatch(insight.batchId!)}>
                  Open
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
