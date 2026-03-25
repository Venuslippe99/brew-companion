import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { FamilyTreeNodeCard } from "@/components/lineage/FamilyTreeNodeCard";
import { LineageAnalyticsCards } from "@/components/lineage/LineageAnalyticsCards";
import { LineageExplorerLegend } from "@/components/lineage/LineageExplorerLegend";
import { LineageExplorerPanel } from "@/components/lineage/LineageExplorerPanel";
import { LineageGenerationColumn } from "@/components/lineage/LineageGenerationColumn";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/use-auth";
import { buildLineageAnalytics } from "@/lib/lineage-analytics";
import {
  getVisibleFamilyGraph,
  loadFamilyGraph,
  type VisibleFamilyGraphNode,
} from "@/lib/lineage-graph";
import { ArrowLeft, Sparkles } from "lucide-react";

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

function buildDirectLinks(
  node: VisibleFamilyGraphNode | null,
  graphNodes: VisibleFamilyGraphNode[],
  visibleEdges: Array<{ sourceId: string; targetId: string; type: "brewed_from" | "starter_source" }>
) {
  if (!node) {
    return {
      brewedFromName: undefined,
      starterSourceName: undefined,
      repeatedCount: 0,
      starterChildCount: 0,
    };
  }

  const nodesById = new Map(graphNodes.map((graphNode) => [graphNode.id, graphNode]));
  const brewedFromEdge = visibleEdges.find(
    (edge) => edge.targetId === node.id && edge.type === "brewed_from"
  );
  const starterEdge = visibleEdges.find(
    (edge) => edge.targetId === node.id && edge.type === "starter_source"
  );

  return {
    brewedFromName: brewedFromEdge
      ? nodesById.get(brewedFromEdge.sourceId)?.name
      : undefined,
    starterSourceName: starterEdge
      ? nodesById.get(starterEdge.sourceId)?.name
      : undefined,
    repeatedCount: visibleEdges.filter(
      (edge) => edge.sourceId === node.id && edge.type === "brewed_from"
    ).length,
    starterChildCount: visibleEdges.filter(
      (edge) => edge.sourceId === node.id && edge.type === "starter_source"
    ).length,
  };
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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
        setSelectedNodeId(id);
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

  useEffect(() => {
    if (!visibleGraph) {
      return;
    }

    const stillVisible = visibleGraph.nodes.some((node) => node.id === selectedNodeId);

    if (!stillVisible) {
      setSelectedNodeId(visibleGraph.rootId);
    }
  }, [selectedNodeId, visibleGraph]);

  const analytics = useMemo(() => {
    if (!visibleGraph) {
      return null;
    }

    return buildLineageAnalytics(visibleGraph);
  }, [visibleGraph]);

  const rootNode =
    visibleGraph?.nodes.find((node) => node.id === visibleGraph.rootId) || null;
  const selectedNode =
    visibleGraph?.nodes.find((node) => node.id === selectedNodeId) || rootNode || null;

  const ancestorGroups = visibleGraph
    ? groupNodesByDepth(
        visibleGraph.nodes.filter(
          (node) =>
            node.relationToRoot === "ancestor" || node.relationToRoot === "both"
        ),
        "ancestorDepth"
      )
    : [];
  const descendantGroups = visibleGraph
    ? groupNodesByDepth(
        visibleGraph.nodes.filter(
          (node) =>
            node.relationToRoot === "descendant" || node.relationToRoot === "both"
        ),
        "descendantDepth"
      )
    : [];
  const relatedNodes = visibleGraph
    ? visibleGraph.nodes
        .filter((node) => node.relationToRoot === "related")
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        )
    : [];

  const relatedLinks = buildDirectLinks(
    selectedNode,
    visibleGraph?.nodes || [],
    visibleGraph?.edges || []
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 pt-6 lg:pt-10 lg:px-8 space-y-6 pb-8">
        <button
          type="button"
          onClick={() => navigate(id ? `/batch/${id}` : "/batches")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to batch
        </button>

        <ScrollReveal>
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Lineage Explorer
                </p>
                <h1 className="mt-2 font-display text-2xl lg:text-3xl font-semibold text-foreground">
                  {rootNode ? `${rootNode.name} lineage` : "Batch lineage"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Past batches appear on the left, this focal batch stays in the center, and later batches appear on the right.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate(`/batch/${id}`)}>
                  Open batch detail
                </Button>
                {selectedNode && selectedNode.id !== id && (
                  <Button variant="outline" onClick={() => navigate(`/batch/${selectedNode.id}/lineage`)}>
                    Center on selected
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <EdgeToggle
                active={showRepeatEdges}
                label="Brew Again lineage"
                onClick={() => setShowRepeatEdges((current) => !current)}
              />
              <EdgeToggle
                active={showStarterEdges}
                label="Starter-source lineage"
                onClick={() => setShowStarterEdges((current) => !current)}
              />
            </div>

            <LineageExplorerLegend />
          </div>
        </ScrollReveal>

        {loading ? (
          <ScrollReveal delay={0.05}>
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Loading lineage explorer...</p>
            </div>
          </ScrollReveal>
        ) : !visibleGraph || !rootNode ? (
          <ScrollReveal delay={0.05}>
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Could not load this batch lineage.
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
              <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
                    <LineageGenerationColumn
                      title="Past"
                      description="Earlier batches that feed into the focal batch."
                      groups={ancestorGroups}
                      rootId={visibleGraph.rootId}
                      selectedNodeId={selectedNode?.id}
                      badgesById={analytics?.nodeBadgesById || new Map()}
                      onSelect={setSelectedNodeId}
                    />

                    <div className="space-y-3">
                      <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                          Current
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          This is the focal batch for the explorer right now.
                        </p>
                      </div>

                      <FamilyTreeNodeCard
                        node={rootNode}
                        badges={analytics?.nodeBadgesById.get(rootNode.id) || []}
                        isRoot
                        isSelected={selectedNode?.id === rootNode.id}
                        onSelect={setSelectedNodeId}
                      />
                    </div>

                    <LineageGenerationColumn
                      title="Future"
                      description="Later batches that branch out from the focal batch."
                      groups={descendantGroups}
                      rootId={visibleGraph.rootId}
                      selectedNodeId={selectedNode?.id}
                      badgesById={analytics?.nodeBadgesById || new Map()}
                      onSelect={setSelectedNodeId}
                    />
                  </div>

                  {relatedNodes.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                          Related branches
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          These connected batches sit on a side branch rather than the main left-to-right focal path.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {relatedNodes.map((node) => (
                          <FamilyTreeNodeCard
                            key={node.id}
                            node={node}
                            badges={analytics?.nodeBadgesById.get(node.id) || []}
                            isSelected={selectedNode?.id === node.id}
                            onSelect={setSelectedNodeId}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {visibleGraph.edges.length === 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex items-center gap-2 text-foreground">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">
                          No visible connections with the current filters
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Turn one or both lineage types back on to rebuild the explorer around this batch.
                      </p>
                    </div>
                  )}
                </div>

                <div className="xl:sticky xl:top-6 xl:self-start">
                  <LineageExplorerPanel
                    node={selectedNode}
                    badges={
                      selectedNode ? analytics?.nodeBadgesById.get(selectedNode.id) || [] : []
                    }
                    relatedLinks={relatedLinks}
                    isRoot={selectedNode?.id === visibleGraph.rootId}
                    onOpenBatch={(batchId) => navigate(`/batch/${batchId}`)}
                    onCenter={(batchId) => navigate(`/batch/${batchId}/lineage`)}
                  />
                </div>
              </div>
            </ScrollReveal>
          </>
        )}
      </div>
    </AppLayout>
  );
}
