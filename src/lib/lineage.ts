import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";
import type { BatchCautionLevel, BatchStage, BatchStatus } from "@/lib/batches";

type LineageBatchRow = Pick<
  Tables<"kombucha_batches">,
  "id" | "name" | "status" | "current_stage" | "caution_level" | "completed_at" | "updated_at"
>;

export type StarterSourceType = Database["public"]["Enums"]["starter_source_type_enum"];

export type LineageBatchSummary = {
  id: string;
  name: string;
  status: BatchStatus;
  currentStage: BatchStage;
  cautionLevel: BatchCautionLevel;
  completedAt?: string;
  updatedAt: string;
};

export type BatchLineage = {
  brewedFrom: LineageBatchSummary | null;
  starterSource: LineageBatchSummary | null;
  repeatedAs: LineageBatchSummary[];
  usedAsStarterFor: LineageBatchSummary[];
};

const starterEligibleStages: BatchStage[] = [
  "f2_setup",
  "f2_active",
  "refrigerate_now",
  "chilled_ready",
  "completed",
  "archived",
];

function mapLineageBatch(row: LineageBatchRow): LineageBatchSummary {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    currentStage: row.current_stage,
    cautionLevel: row.caution_level === "elevated" ? "high" : row.caution_level,
    completedAt: row.completed_at || undefined,
    updatedAt: row.updated_at,
  };
}

function sortByUpdatedDesc(items: LineageBatchSummary[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

export function canUseBatchAsStarterSource(
  batch: Pick<LineageBatchSummary, "status" | "currentStage">
) {
  return batch.status !== "discarded" && starterEligibleStages.includes(batch.currentStage);
}

export async function loadStarterSourceCandidates(userId: string) {
  const { data, error } = await supabase
    .from("kombucha_batches")
    .select("id, name, status, current_stage, caution_level, completed_at, updated_at")
    .eq("user_id", userId)
    .neq("status", "discarded")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || [])
    .map(mapLineageBatch)
    .filter(canUseBatchAsStarterSource);
}

export async function loadBatchLineage(args: {
  userId: string;
  batchId: string;
  brewedFromBatchId?: string | null;
  starterSourceBatchId?: string | null;
}): Promise<BatchLineage> {
  const { userId, batchId, brewedFromBatchId, starterSourceBatchId } = args;
  const parentIds = Array.from(
    new Set([brewedFromBatchId, starterSourceBatchId].filter(Boolean))
  ) as string[];

  const parentQuery = parentIds.length
    ? supabase
        .from("kombucha_batches")
        .select("id, name, status, current_stage, caution_level, completed_at, updated_at")
        .eq("user_id", userId)
        .in("id", parentIds)
    : Promise.resolve({ data: [], error: null });

  const [parentResult, repeatedAsResult, starterChildrenResult] = await Promise.all([
    parentQuery,
    supabase
      .from("kombucha_batches")
      .select("id, name, status, current_stage, caution_level, completed_at, updated_at")
      .eq("user_id", userId)
      .eq("brew_again_source_batch_id", batchId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("kombucha_batches")
      .select("id, name, status, current_stage, caution_level, completed_at, updated_at")
      .eq("user_id", userId)
      .eq("starter_source_batch_id", batchId)
      .order("updated_at", { ascending: false }),
  ]);

  if (parentResult.error) {
    throw parentResult.error;
  }

  if (repeatedAsResult.error) {
    throw repeatedAsResult.error;
  }

  if (starterChildrenResult.error) {
    throw starterChildrenResult.error;
  }

  const parentMap = new Map(
    (parentResult.data || []).map((row) => {
      const mapped = mapLineageBatch(row);
      return [mapped.id, mapped] as const;
    })
  );

  return {
    brewedFrom: brewedFromBatchId ? parentMap.get(brewedFromBatchId) || null : null,
    starterSource:
      starterSourceBatchId ? parentMap.get(starterSourceBatchId) || null : null,
    repeatedAs: sortByUpdatedDesc((repeatedAsResult.data || []).map(mapLineageBatch)),
    usedAsStarterFor: sortByUpdatedDesc(
      (starterChildrenResult.data || []).map(mapLineageBatch)
    ),
  };
}
