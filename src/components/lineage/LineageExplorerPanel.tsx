import { Button } from "@/components/ui/button";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import type { LineageNodeBadge } from "@/lib/lineage-analytics";
import type { VisibleFamilyGraphNode } from "@/lib/lineage-graph";
import { getPhaseOutcomeLabel } from "@/lib/phase-outcome-options";

type RelatedLinks = {
  brewedFromName?: string;
  starterSourceName?: string;
  repeatedCount: number;
  starterChildCount: number;
};

type LineageExplorerPanelProps = {
  node: VisibleFamilyGraphNode | null;
  badges: LineageNodeBadge[];
  relatedLinks: RelatedLinks;
  isRoot: boolean;
  onOpenBatch: (batchId: string) => void;
  onCenter: (batchId: string) => void;
};

function getBadgeClasses(tone: LineageNodeBadge["tone"]) {
  switch (tone) {
    case "positive":
      return "bg-primary/10 text-primary";
    case "caution":
      return "bg-caution-bg text-caution-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatBrewDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function LineageExplorerPanel({
  node,
  badges,
  relatedLinks,
  isRoot,
  onOpenBatch,
  onCenter,
}: LineageExplorerPanelProps) {
  if (!node) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Selected batch
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Choose a node in the explorer to inspect its saved outcomes and direct lineage links.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Selected batch
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{node.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Brewed {formatBrewDate(node.brewStartedAt)}
          </p>
        </div>
        <CautionBadge level={node.cautionLevel} />
      </div>

      <div className="flex flex-wrap gap-2">
        <StageIndicator stage={node.currentStage} size="sm" />
        {isRoot && (
          <span className="inline-flex rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            Focal batch
          </span>
        )}
        {badges.map((badge) => (
          <span
            key={badge.key}
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getBadgeClasses(
              badge.tone
            )}`}
          >
            {badge.label}
          </span>
        ))}
      </div>

      <div className="grid gap-3">
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">F1 outcome</p>
          <p className="mt-1 text-sm text-foreground">
            {node.f1Summary || "No saved F1 outcome"}
          </p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">F2 outcome</p>
          <p className="mt-1 text-sm text-foreground">
            {node.f2Summary || "No saved F2 outcome"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-medium text-foreground">Direct lineage</h3>
        <div className="grid gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Brewed from</p>
            <p className="mt-1 text-foreground">
              {relatedLinks.brewedFromName || "No Brew Again parent saved"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Starter source</p>
            <p className="mt-1 text-foreground">
              {relatedLinks.starterSourceName || "No starter-source parent saved"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Repeated as</p>
              <p className="mt-1 text-foreground">{relatedLinks.repeatedCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Used as starter for</p>
              <p className="mt-1 text-foreground">{relatedLinks.starterChildCount}</p>
            </div>
          </div>
        </div>
      </div>

      {(node.f1Outcome?.selected_tags.length || node.f2Outcome?.selected_tags.length) ? (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Outcome tags</h3>
          <div className="flex flex-wrap gap-2">
            {node.f1Outcome?.selected_tags.map((tag) => (
              <span key={`f1-${tag}`} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {getPhaseOutcomeLabel(tag)}
              </span>
            ))}
            {node.f2Outcome?.selected_tags.map((tag) => (
              <span key={`f2-${tag}`} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {getPhaseOutcomeLabel(tag)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onOpenBatch(node.id)}>Open batch detail</Button>
        {!isRoot && (
          <Button variant="outline" onClick={() => onCenter(node.id)}>
            Center lineage here
          </Button>
        )}
      </div>
    </div>
  );
}
