import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { BatchCautionLevel, BatchStage, BatchStatus } from "@/lib/batches";
import { getPhaseOutcomeLabel } from "@/lib/phase-outcome-options";
import type { PhaseOutcomeRow } from "@/lib/phase-outcomes";

type LineageGraphBatchRow = Pick<
  Tables<"kombucha_batches">,
  | "id"
  | "name"
  | "status"
  | "current_stage"
  | "caution_level"
  | "completed_at"
  | "updated_at"
  | "brew_started_at"
  | "brew_again_source_batch_id"
  | "starter_source_batch_id"
>;

type EdgeFilter = {
  showRepeatEdges: boolean;
  showStarterEdges: boolean;
};

export type LineageEdgeType = "brewed_from" | "starter_source";

export type FamilyGraphNode = {
  id: string;
  name: string;
  status: BatchStatus;
  currentStage: BatchStage;
  cautionLevel: BatchCautionLevel;
  completedAt?: string;
  updatedAt: string;
  brewStartedAt: string;
  brewedFromBatchId?: string | null;
  starterSourceBatchId?: string | null;
  f1Outcome?: PhaseOutcomeRow;
  f2Outcome?: PhaseOutcomeRow;
  f1Summary?: string;
  f2Summary?: string;
};

export type FamilyGraphEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  type: LineageEdgeType;
};

export type FamilyGraph = {
  rootId: string;
  maxDepth: number;
  nodes: FamilyGraphNode[];
  edges: FamilyGraphEdge[];
};

export type VisibleFamilyGraphNode = FamilyGraphNode & {
  relationToRoot: "root" | "ancestor" | "descendant" | "both" | "related";
  ancestorDepth?: number;
  descendantDepth?: number;
  visibleDistance: number;
};

export type VisibleFamilyGraph = {
  rootId: string;
  maxDepth: number;
  nodes: VisibleFamilyGraphNode[];
  edges: FamilyGraphEdge[];
};

const BATCH_SELECT =
  "id, name, status, current_stage, caution_level, completed_at, updated_at, brew_started_at, brew_again_source_batch_id, starter_source_batch_id";

function mapGraphNode(
  row: LineageGraphBatchRow,
  outcomesByBatchId: Map<string, PhaseOutcomeRow[]>
): FamilyGraphNode {
  const batchOutcomes = outcomesByBatchId.get(row.id) || [];
  const f1Outcome = batchOutcomes.find((outcome) => outcome.phase === "f1");
  const f2Outcome = batchOutcomes.find((outcome) => outcome.phase === "f2");

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    currentStage: row.current_stage,
    cautionLevel: row.caution_level === "elevated" ? "high" : row.caution_level,
    completedAt: row.completed_at || undefined,
    updatedAt: row.updated_at,
    brewStartedAt: row.brew_started_at,
    brewedFromBatchId: row.brew_again_source_batch_id,
    starterSourceBatchId: row.starter_source_batch_id,
    f1Outcome: f1Outcome || undefined,
    f2Outcome: f2Outcome || undefined,
    f1Summary: f1Outcome
      ? `${getPhaseOutcomeLabel(f1Outcome.f1_taste_state)} · ${getPhaseOutcomeLabel(f1Outcome.f1_readiness)}`
      : undefined,
    f2Summary: f2Outcome
      ? `${getPhaseOutcomeLabel(f2Outcome.f2_overall_result)} · ${getPhaseOutcomeLabel(f2Outcome.f2_brew_again)}`
      : undefined,
  };
}

function buildEdgeSet(rows: LineageGraphBatchRow[]) {
  const includedIds = new Set(rows.map((row) => row.id));
  const edges = new Map<string, FamilyGraphEdge>();

  rows.forEach((row) => {
    if (row.brew_again_source_batch_id && includedIds.has(row.brew_again_source_batch_id)) {
      const edge: FamilyGraphEdge = {
        id: `repeat:${row.brew_again_source_batch_id}:${row.id}`,
        sourceId: row.brew_again_source_batch_id,
        targetId: row.id,
        type: "brewed_from",
      };
      edges.set(edge.id, edge);
    }

    if (row.starter_source_batch_id && includedIds.has(row.starter_source_batch_id)) {
      const edge: FamilyGraphEdge = {
        id: `starter:${row.starter_source_batch_id}:${row.id}`,
        sourceId: row.starter_source_batch_id,
        targetId: row.id,
        type: "starter_source",
      };
      edges.set(edge.id, edge);
    }
  });

  return [...edges.values()];
}

async function loadBatchRowsByIds(userId: string, ids: string[]) {
  if (ids.length === 0) {
    return [] as LineageGraphBatchRow[];
  }

  const { data, error } = await supabase
    .from("kombucha_batches")
    .select(BATCH_SELECT)
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    throw error;
  }

  return (data || []) as LineageGraphBatchRow[];
}

async function loadChildRowsBySourceIds(
  userId: string,
  sourceIds: string[],
  field: "brew_again_source_batch_id" | "starter_source_batch_id"
) {
  if (sourceIds.length === 0) {
    return [] as LineageGraphBatchRow[];
  }

  const { data, error } = await supabase
    .from("kombucha_batches")
    .select(BATCH_SELECT)
    .eq("user_id", userId)
    .in(field, sourceIds);

  if (error) {
    throw error;
  }

  return (data || []) as LineageGraphBatchRow[];
}

function buildOutcomesByBatchId(rows: PhaseOutcomeRow[]) {
  const map = new Map<string, PhaseOutcomeRow[]>();

  rows.forEach((row) => {
    const existing = map.get(row.batch_id);
    if (existing) {
      existing.push(row);
      return;
    }

    map.set(row.batch_id, [row]);
  });

  return map;
}

function bfsDepths(
  startId: string,
  adjacency: Map<string, string[]>
) {
  const depths = new Map<string, number>();
  depths.set(startId, 0);

  const queue: string[] = [startId];

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (!currentId) {
      continue;
    }

    const currentDepth = depths.get(currentId) ?? 0;
    const neighbors = adjacency.get(currentId) || [];

    neighbors.forEach((neighborId) => {
      if (depths.has(neighborId)) {
        return;
      }

      depths.set(neighborId, currentDepth + 1);
      queue.push(neighborId);
    });
  }

  return depths;
}

function getVisibleEdges(edges: FamilyGraphEdge[], filter: EdgeFilter) {
  return edges.filter((edge) => {
    if (edge.type === "brewed_from") {
      return filter.showRepeatEdges;
    }

    return filter.showStarterEdges;
  });
}

export async function loadFamilyGraph(args: {
  userId: string;
  rootBatchId: string;
  maxDepth?: number;
}): Promise<FamilyGraph> {
  const { userId, rootBatchId } = args;
  const maxDepth = args.maxDepth ?? 2;

  const [rootRow] = await loadBatchRowsByIds(userId, [rootBatchId]);

  if (!rootRow) {
    throw new Error("Could not load the root batch for this family.");
  }

  const rowsById = new Map<string, LineageGraphBatchRow>([[rootRow.id, rootRow]]);
  let frontierIds = [rootRow.id];

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    if (frontierIds.length === 0) {
      break;
    }

    const frontierRows = frontierIds
      .map((id) => rowsById.get(id))
      .filter((row): row is LineageGraphBatchRow => !!row);

    const parentIds = Array.from(
      new Set(
        frontierRows.flatMap((row) =>
          [row.brew_again_source_batch_id, row.starter_source_batch_id].filter(Boolean)
        )
      )
    ) as string[];

    const [parentRows, repeatChildren, starterChildren] = await Promise.all([
      loadBatchRowsByIds(userId, parentIds),
      loadChildRowsBySourceIds(userId, frontierIds, "brew_again_source_batch_id"),
      loadChildRowsBySourceIds(userId, frontierIds, "starter_source_batch_id"),
    ]);

    const relatedRows = [...parentRows, ...repeatChildren, ...starterChildren];
    const nextFrontier: string[] = [];

    relatedRows.forEach((row) => {
      if (rowsById.has(row.id)) {
        return;
      }

      rowsById.set(row.id, row);
      nextFrontier.push(row.id);
    });

    frontierIds = nextFrontier;
  }

  const allRows = [...rowsById.values()];
  const nodeIds = allRows.map((row) => row.id);

  const { data: outcomeRows, error: outcomesError } = await supabase
    .from("batch_phase_outcomes")
    .select("*")
    .in("batch_id", nodeIds);

  if (outcomesError) {
    throw new Error(`Could not load family outcomes: ${outcomesError.message}`);
  }

  const outcomesByBatchId = buildOutcomesByBatchId((outcomeRows || []) as PhaseOutcomeRow[]);

  return {
    rootId: rootBatchId,
    maxDepth,
    nodes: allRows.map((row) => mapGraphNode(row, outcomesByBatchId)),
    edges: buildEdgeSet(allRows),
  };
}

export function getVisibleFamilyGraph(
  graph: FamilyGraph,
  filter: EdgeFilter
): VisibleFamilyGraph {
  const visibleEdges = getVisibleEdges(graph.edges, filter);
  const undirected = new Map<string, string[]>();
  const parentsByChild = new Map<string, string[]>();
  const childrenByParent = new Map<string, string[]>();

  visibleEdges.forEach((edge) => {
    const existingSourceNeighbors = undirected.get(edge.sourceId) || [];
    existingSourceNeighbors.push(edge.targetId);
    undirected.set(edge.sourceId, existingSourceNeighbors);

    const existingTargetNeighbors = undirected.get(edge.targetId) || [];
    existingTargetNeighbors.push(edge.sourceId);
    undirected.set(edge.targetId, existingTargetNeighbors);

    const existingParents = parentsByChild.get(edge.targetId) || [];
    existingParents.push(edge.sourceId);
    parentsByChild.set(edge.targetId, existingParents);

    const existingChildren = childrenByParent.get(edge.sourceId) || [];
    existingChildren.push(edge.targetId);
    childrenByParent.set(edge.sourceId, existingChildren);
  });

  const visibleDistances = bfsDepths(graph.rootId, undirected);
  const ancestorDepths = bfsDepths(graph.rootId, parentsByChild);
  const descendantDepths = bfsDepths(graph.rootId, childrenByParent);

  const visibleNodes = graph.nodes
    .filter((node) => node.id === graph.rootId || visibleDistances.has(node.id))
    .map((node) => {
      const ancestorDepth = ancestorDepths.get(node.id);
      const descendantDepth = descendantDepths.get(node.id);

      let relationToRoot: VisibleFamilyGraphNode["relationToRoot"] = "related";

      if (node.id === graph.rootId) {
        relationToRoot = "root";
      } else if (
        ancestorDepth !== undefined &&
        ancestorDepth > 0 &&
        descendantDepth !== undefined &&
        descendantDepth > 0
      ) {
        relationToRoot = "both";
      } else if (ancestorDepth !== undefined && ancestorDepth > 0) {
        relationToRoot = "ancestor";
      } else if (descendantDepth !== undefined && descendantDepth > 0) {
        relationToRoot = "descendant";
      }

      return {
        ...node,
        relationToRoot,
        ancestorDepth: ancestorDepth !== undefined && ancestorDepth > 0 ? ancestorDepth : undefined,
        descendantDepth:
          descendantDepth !== undefined && descendantDepth > 0 ? descendantDepth : undefined,
        visibleDistance: visibleDistances.get(node.id) ?? 0,
      };
    });

  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

  return {
    rootId: graph.rootId,
    maxDepth: graph.maxDepth,
    nodes: visibleNodes.sort((left, right) => left.visibleDistance - right.visibleDistance),
    edges: visibleEdges.filter(
      (edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId)
    ),
  };
}
