import { Link } from "react-router-dom";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import { getStageLabel } from "@/lib/batches";
import type { BatchLineage, LineageBatchSummary } from "@/lib/lineage";

type BatchLineageSectionProps = {
  lineage: BatchLineage | null;
  loading: boolean;
};

function formatUpdatedLabel(updatedAt: string) {
  return new Date(updatedAt).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function LineageBatchCard({
  batch,
  title,
}: {
  batch: LineageBatchSummary;
  title: string;
}) {
  return (
    <Link
      to={`/batch/${batch.id}`}
      className="block rounded-xl border border-border bg-background p-4 transition-colors hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{batch.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {getStageLabel(batch.currentStage)} on {formatUpdatedLabel(batch.updatedAt)}
          </p>
        </div>
        <CautionBadge level={batch.cautionLevel} />
      </div>
      <div className="mt-3">
        <StageIndicator stage={batch.currentStage} size="sm" />
      </div>
    </Link>
  );
}

function LineageGroup({
  title,
  description,
  items,
  emptyText,
}: {
  title: string;
  description: string;
  items: Array<{ key: string; label: string; batch: LineageBatchSummary }>;
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <LineageBatchCard key={item.key} batch={item.batch} title={item.label} />
          ))}
        </div>
      )}
    </div>
  );
}

export function BatchLineageSection({
  lineage,
  loading,
}: BatchLineageSectionProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Lineage
        </h3>
        <p className="mt-3 text-sm text-muted-foreground">Loading lineage...</p>
      </div>
    );
  }

  const parentItems = [
    ...(lineage?.brewedFrom
      ? [{ key: `brewed-from-${lineage.brewedFrom.id}`, label: "Brewed from", batch: lineage.brewedFrom }]
      : []),
    ...(lineage?.starterSource
      ? [{ key: `starter-from-${lineage.starterSource.id}`, label: "Starter came from", batch: lineage.starterSource }]
      : []),
  ];

  const childItems = [
    ...(lineage?.repeatedAs || []).map((batch) => ({
      key: `repeated-as-${batch.id}`,
      label: "Repeated as",
      batch,
    })),
    ...(lineage?.usedAsStarterFor || []).map((batch) => ({
      key: `starter-for-${batch.id}`,
      label: "Used as starter for",
      batch,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Lineage
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Track where this batch came from and what later batches came from it.
        </p>
      </div>

      <LineageGroup
        title="What this batch came from"
        description="These are the direct parent links saved on this batch."
        items={parentItems}
        emptyText="No brewed-from or starter-source links have been saved for this batch."
      />

      <LineageGroup
        title="What came from this batch"
        description="These are later batches that point back to this batch."
        items={childItems}
        emptyText="No later repeat or starter-source links point back to this batch yet."
      />
    </div>
  );
}
