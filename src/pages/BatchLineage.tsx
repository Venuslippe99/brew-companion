import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { FamilyTreeNodeCard } from "@/components/lineage/FamilyTreeNodeCard";
import { LineageAnalyticsCards } from "@/components/lineage/LineageAnalyticsCards";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { buildLineageAnalytics } from "@/lib/lineage-analytics";
import { getVisibleFamilyGraph, loadFamilyGraph, type VisibleFamilyGraphNode } from "@/lib/lineage-graph";
import { Network, ArrowLeft, GitBranch, FlaskConical, Sparkles } from "lucide-react";

function groupNodesByDepth(
  nodes: VisibleFamilyGraphNode[],
  key: "ancestorDepth" | "descendantDepth"
) {
  const groups = new Map<number, VisibleFamilyGraphNode[]>();

  nodes.forEach((node) => {
    const depth = node[key];

    if (!depth) {
      return;
    }

    const existing = groups.get(depth) || [];
    existing.push(node);
    groups.set(depth, existing);
  });

  return [...groups.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([depth, groupedNodes]) => ({
      depth,
      nodes: groupedNodes.sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ),
    }));
}

function EdgeToggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function GenerationSection({
  title,
  description,
  groups,
  rootId,
  badgesById,
  onCenter,
  onOpenBatch,
}: {
  title: string;
  description: string;
  groups: Array<{ depth: number; nodes: VisibleFamilyGraphNode[] }>;
  rootId: string;
  badgesById: Map<string, ReturnType<typeof buildLineageAnalytics>["nodeBadgesById"] extends Map<string, infer T> ? T : never>;
  onCenter: (batchId: string) => void;
  onOpenBatch: (batchId: string) => void;
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
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
            <div className="grid gap-3">
              {group.nodes.map((node) => (
                <FamilyTreeNodeCard
                  key={node.id}
                  node={node}
                  badges={badgesById.get(node.id) || []}
                  isRoot={node.id === rootId}
                  onCenter={onCenter}
                  onOpenBatch={onOpenBatch}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BatchLineage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;

  const [graph, setGraph] = useState<Awaited<ReturnType<typeof loadFamilyGraph>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRepeatEdges, setShowRepeatEdges] = useState(true);
  const [showStarterEdges, setShowStarterEdges] = useState(true);

  useEffect(() => {
    const loadGraph = async () => {
      if (!id || !userId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const loadedGraph = await loadFamilyGraph({
          userId,
          rootBatchId: id,
          maxDepth: 2,
        });

        setGraph(loadedGraph);
      } catch (error) {
        console.error("Load family graph error:", error);
        setGraph(null);
      } finally {
        setLoading(false);
      }
    };

    void loadGraph();
  }, [id, userId]);

  const visibleGraph = useMemo(() => {
    if (!graph) {
      return null;
    }

    return getVisibleFamilyGraph(graph, {
      showRepeatEdges,
      showStarterEdges,
    });
  }, [graph, showRepeatEdges, showStarterEdges]);

  const analytics = useMemo(() => {
    if (!visibleGraph) {
      return null;
    }

    return buildLineageAnalytics(visibleGraph);
  }, [visibleGraph]);

  const rootNode = visibleGraph?.nodes.find((node) => node.id === visibleGraph.rootId) || null;
  const ancestorGroups = visibleGraph
    ? groupNodesByDepth(
        visibleGraph.nodes.filter((node) => node.relationToRoot === "ancestor" || node.relationToRoot === "both"),
        "ancestorDepth"
      )
    : [];
  const descendantGroups = visibleGraph
    ? groupNodesByDepth(
        visibleGraph.nodes.filter((node) => node.relationToRoot === "descendant" || node.relationToRoot === "both"),
        "descendantDepth"
      )
    : [];
  const relatedNodes = visibleGraph
    ? visibleGraph.nodes.filter((node) => node.relationToRoot === "related")
    : [];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 pt-6 lg:pt-10 lg:px-8 space-y-6 pb-8">
        <button
          type="button"
          onClick={() => navigate(id ? `/batch/${id}` : "/batches")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to batch
        </button>

        <ScrollReveal>
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <Network className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-wider">
                    Batch lineage
                  </p>
                </div>
                <h1 className="mt-2 font-display text-2xl font-semibold text-foreground">
                  {rootNode ? `${rootNode.name} family tree` : "Batch family tree"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  See what this batch came from, what later branches came from it, and what the saved outcomes suggest so far.
                </p>
              </div>
              {id && (
                <Button variant="outline" onClick={() => navigate(`/batch/${id}`)}>
                  Open batch detail
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <EdgeToggle
                active={showRepeatEdges}
                label="Repeat lineage"
                onClick={() => setShowRepeatEdges((current) => !current)}
              />
              <EdgeToggle
                active={showStarterEdges}
                label="Starter lineage"
                onClick={() => setShowStarterEdges((current) => !current)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Repeat edges
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  These show where a batch was brewed again from a previous batch.
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Starter edges
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  These show where starter liquid or culture came from a previous batch.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {loading ? (
          <ScrollReveal delay={0.05}>
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Loading family tree...</p>
            </div>
          </ScrollReveal>
        ) : !visibleGraph || !rootNode ? (
          <ScrollReveal delay={0.05}>
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Could not load this batch family.
              </p>
            </div>
          </ScrollReveal>
        ) : (
          <>
            <ScrollReveal delay={0.06}>
              <LineageAnalyticsCards
                insights={analytics?.insights || []}
                familyOutcomeCount={analytics?.familyOutcomeCount || 0}
                onOpenBatch={(batchId) => navigate(`/batch/${batchId}`)}
              />
            </ScrollReveal>

            <ScrollReveal delay={0.08}>
              <div className="space-y-6">
                <GenerationSection
                  title="What this batch came from"
                  description="Parents and earlier generations that feed into this batch."
                  groups={ancestorGroups}
                  rootId={visibleGraph.rootId}
                  badgesById={analytics?.nodeBadgesById || new Map()}
                  onCenter={(batchId) => navigate(`/batch/${batchId}/lineage`)}
                  onOpenBatch={(batchId) => navigate(`/batch/${batchId}`)}
                />

                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                      Current batch focus
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This is the batch the family view is centered on right now.
                    </p>
                  </div>

                  <FamilyTreeNodeCard
                    node={rootNode}
                    badges={analytics?.nodeBadgesById.get(rootNode.id) || []}
                    isRoot
                    onCenter={(batchId) => navigate(`/batch/${batchId}/lineage`)}
                    onOpenBatch={(batchId) => navigate(`/batch/${batchId}`)}
                  />
                </div>

                <GenerationSection
                  title="What came from this batch"
                  description="Later generations that branch out from this batch."
                  groups={descendantGroups}
                  rootId={visibleGraph.rootId}
                  badgesById={analytics?.nodeBadgesById || new Map()}
                  onCenter={(batchId) => navigate(`/batch/${batchId}/lineage`)}
                  onOpenBatch={(batchId) => navigate(`/batch/${batchId}`)}
                />

                {relatedNodes.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                        Related branches
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        These batches are still part of the connected family, but they sit on a side branch rather than a straight ancestor or descendant path.
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {relatedNodes.map((node) => (
                        <FamilyTreeNodeCard
                          key={node.id}
                          node={node}
                          badges={analytics?.nodeBadgesById.get(node.id) || []}
                          onCenter={(batchId) => navigate(`/batch/${batchId}/lineage`)}
                          onOpenBatch={(batchId) => navigate(`/batch/${batchId}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {visibleGraph.edges.length === 0 && (
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 text-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">No visible edges with the current filters</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Turn one or both lineage edge types back on to rebuild the family view around this batch.
                    </p>
                  </div>
                )}
              </div>
            </ScrollReveal>
          </>
        )}
      </div>
    </AppLayout>
  );
}
