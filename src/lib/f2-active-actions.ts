import { supabase } from "@/integrations/supabase/client";
import type { BatchStage, BatchStatus, KombuchaBatch } from "@/lib/batches";

export type F2ActiveAction =
  | "checked-one-bottle"
  | "needs-more-carbonation"
  | "refrigerate-now"
  | "moved-to-fridge"
  | "mark-completed";

type ApplyF2ActiveActionArgs = {
  batch: KombuchaBatch;
  userId: string;
  action: F2ActiveAction;
};

type ApplyF2ActiveActionResult = {
  currentStage: BatchStage;
  nextAction: string;
  updatedAt: string;
  status: BatchStatus;
  completedAt?: string;
  successMessage: string;
};

function getActionConfig(action: F2ActiveAction): {
  nextStage: BatchStage;
  nextAction: string;
  reason: string;
  note: string;
  logType: "carbonation_check" | "custom_action" | "refrigerated";
  successMessage: string;
  createStageEvent: boolean;
  nextStatus?: BatchStatus;
  setCompletedAt?: boolean;
} {
  switch (action) {
    case "checked-one-bottle":
      return {
        nextStage: "f2_active",
        nextAction: "Decide whether to keep carbonating or refrigerate",
        reason: "Checked one bottle during F2",
        note: "User checked one bottle to assess carbonation during F2.",
        logType: "carbonation_check",
        successMessage: "Bottle check saved.",
        createStageEvent: false,
      };

    case "needs-more-carbonation":
      return {
        nextStage: "f2_active",
        nextAction: "Check first bottle again tomorrow",
        reason: "Needs more carbonation",
        note: "User checked carbonation and decided the batch needs more time.",
        logType: "carbonation_check",
        successMessage: "Batch kept in F2.",
        createStageEvent: false,
      };

    case "refrigerate-now":
      return {
        nextStage: "refrigerate_now",
        nextAction: "Move bottles to refrigerator now",
        reason: "Carbonation ready, refrigerate now",
        note: "User marked the batch as ready to refrigerate after F2 carbonation check.",
        logType: "custom_action",
        successMessage: "Batch moved to refrigerate now.",
        createStageEvent: true,
      };

    case "moved-to-fridge":
      return {
        nextStage: "chilled_ready",
        nextAction: "Enjoy your brew",
        reason: "Moved bottles to fridge",
        note: "User moved the bottles to the fridge after the refrigerate now step.",
        logType: "refrigerated",
        successMessage: "Batch moved to chilled ready.",
        createStageEvent: true,
      };

    case "mark-completed":
      return {
        nextStage: "completed",
        nextAction: "Batch complete",
        reason: "Marked batch as completed",
        note: "User marked the batch as completed.",
        logType: "custom_action",
        successMessage: "Batch marked as completed.",
        createStageEvent: true,
        nextStatus: "completed",
        setCompletedAt: true,
      };
  }
}

export async function applyF2ActiveAction(
  args: ApplyF2ActiveActionArgs
): Promise<ApplyF2ActiveActionResult> {
  const { batch, userId, action } = args;

  const config = getActionConfig(action);
  const nowIso = new Date().toISOString();

  const updatePayload: {
    current_stage: BatchStage;
    next_action: string;
    updated_at: string;
    status?: BatchStatus;
    completed_at?: string;
  } = {
    current_stage: config.nextStage,
    next_action: config.nextAction,
    updated_at: nowIso,
  };

  if (config.nextStatus) {
    updatePayload.status = config.nextStatus;
  }

  if (config.setCompletedAt) {
    updatePayload.completed_at = nowIso;
  }

  const { error: batchUpdateError } = await supabase
    .from("kombucha_batches")
    .update(updatePayload)
    .eq("id", batch.id);

  if (batchUpdateError) {
    throw new Error(`Could not update batch: ${batchUpdateError.message}`);
  }

  const writes: PromiseLike<{ error: unknown }>[] = [
    supabase.from("batch_logs").insert({
      batch_id: batch.id,
      created_by_user_id: userId,
      log_type: config.logType,
      logged_at: nowIso,
      note: config.note,
      structured_payload: {
        source: "saved_f2_view",
        action,
        from_stage: batch.currentStage,
        to_stage: config.nextStage,
      },
    }),
  ];

  if (config.createStageEvent) {
    writes.push(
      supabase.from("batch_stage_events").insert({
        batch_id: batch.id,
        from_stage: batch.currentStage,
        to_stage: config.nextStage,
        reason: config.reason,
        triggered_by: userId,
      })
    );
  }

  const results = await Promise.allSettled(writes);

  const failed = results.some((result) => {
    if (result.status === "rejected") return true;
    return !!result.value.error;
  });

  if (failed) {
    console.error("F2 active action partial write failure:", results);
  }

  return {
    currentStage: config.nextStage,
    nextAction: config.nextAction,
    updatedAt: nowIso,
    status: config.nextStatus ?? batch.status,
    completedAt: config.setCompletedAt ? nowIso : batch.completedAt,
    successMessage: config.successMessage,
  };
}
