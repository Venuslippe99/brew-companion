import { supabase } from "@/integrations/supabase/client";
import type { BatchStage } from "@/lib/batches";

export type BatchQuickLogType =
  | "note_only"
  | "taste_test"
  | "temp_check"
  | "carbonation_check";

export type TasteTestImpression =
  | "still_sweet"
  | "balanced"
  | "tart"
  | "very_tart"
  | "not_sure";

export const TASTE_TEST_IMPRESSIONS: Array<{
  value: TasteTestImpression;
  label: string;
}> = [
  { value: "still_sweet", label: "Still sweet" },
  { value: "balanced", label: "Nicely balanced" },
  { value: "tart", label: "Tart" },
  { value: "very_tart", label: "Very tart" },
  { value: "not_sure", label: "Not sure yet" },
];

export async function saveBatchQuickLog(args: {
  batchId: string;
  userId: string;
  logType: BatchQuickLogType;
  note?: string;
  stageAtLog: BatchStage;
  structuredPayload?: Record<string, unknown>;
  valueNumber?: number;
  valueText?: string;
  valueUnit?: string;
  source?: string;
}) {
  const nowIso = new Date().toISOString();

  const { error } = await supabase.from("batch_logs").insert({
    batch_id: args.batchId,
    created_by_user_id: args.userId,
    log_type: args.logType,
    logged_at: nowIso,
    note: args.note?.trim() || null,
    value_number: args.valueNumber,
    value_text: args.valueText,
    value_unit: args.valueUnit,
    structured_payload: {
      source: args.source || "batch_detail_quick_log",
      stage_at_log: args.stageAtLog,
      ...args.structuredPayload,
    },
  });

  if (error) {
    throw new Error(`Could not save log entry: ${error.message}`);
  }

  return nowIso;
}
