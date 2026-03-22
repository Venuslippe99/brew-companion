import { Button } from "@/components/ui/button";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import type { LineageNodeBadge } from "@/lib/lineage-analytics";
import type { VisibleFamilyGraphNode } from "@/lib/lineage-graph";

type FamilyTreeNodeCardProps = {
  node: VisibleFamilyGraphNode;
  badges: LineageNodeBadge[];
  isRoot?: boolean;
  onCenter: (batchId: string) => void;
  onOpenBatch: (batchId: string) => void;
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

export function FamilyTreeNodeCard({
  node,
  badges,
  isRoot = false,
  onCenter,
  onOpenBatch,
}: FamilyTreeNodeCardProps) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        isRoot
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{node.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Brewed {formatBrewDate(node.brewStartedAt)}
          </p>
        </div>
        <CautionBadge level={node.cautionLevel} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <StageIndicator stage={node.currentStage} size="sm" />
        {isRoot && (
          <span className="inline-flex rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            Current batch
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

      <div className="mt-3 space-y-2 text-sm">
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">F1</p>
          <p className="mt-1 text-foreground">{node.f1Summary || "No saved F1 outcome"}</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">F2</p>
          <p className="mt-1 text-foreground">{node.f2Summary || "No saved F2 outcome"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onOpenBatch(node.id)}>
          Open batch
        </Button>
        {!isRoot && (
          <Button size="sm" variant="outline" onClick={() => onCenter(node.id)}>
            Center here
          </Button>
        )}
      </div>
    </div>
  );
}
