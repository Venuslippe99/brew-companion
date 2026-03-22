import type { LineageNodeBadge } from "@/lib/lineage-analytics";
import type { VisibleFamilyGraphNode } from "@/lib/lineage-graph";
import { FamilyTreeNodeCard } from "@/components/lineage/FamilyTreeNodeCard";

type LineageGenerationColumnProps = {
  title: string;
  description: string;
  groups: Array<{ depth: number; nodes: VisibleFamilyGraphNode[] }>;
  rootId: string;
  selectedNodeId?: string | null;
  badgesById: Map<string, LineageNodeBadge[]>;
  onSelect: (batchId: string) => void;
};

export function LineageGenerationColumn({
  title,
  description,
  groups,
  rootId,
  selectedNodeId,
  badgesById,
  onSelect,
}: LineageGenerationColumnProps) {
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          No connected batches are shown in this direction yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={`${title}-${group.depth}`} className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.depth === 1 ? "1 step away" : `${group.depth} steps away`}
            </p>
            <div className="space-y-3">
              {group.nodes.map((node) => (
                <FamilyTreeNodeCard
                  key={node.id}
                  node={node}
                  badges={badgesById.get(node.id) || []}
                  isRoot={node.id === rootId}
                  isSelected={node.id === selectedNodeId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
