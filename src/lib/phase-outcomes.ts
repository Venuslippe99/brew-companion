import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { KombuchaBatch } from "@/lib/batches";
import type {
  F1OutcomeTag,
  F1Readiness,
  F1TasteState,
  F2BrewAgain,
  F2OutcomeTag,
  F2OverallResult,
  PhaseOutcomePhase,
} from "@/lib/phase-outcome-options";

export type PhaseOutcomeRow = Tables<"batch_phase_outcomes">;

export type F1PhaseOutcomeInput = {
  phase: "f1";
  tasteState: F1TasteState;
  readiness: F1Readiness;
  selectedTags: F1OutcomeTag[];
  note?: string;
  nextTimeChange?: string;
};

export type F2PhaseOutcomeInput = {
  phase: "f2";
  overallResult: F2OverallResult;
  brewAgain: F2BrewAgain;
  selectedTags: F2OutcomeTag[];
  note?: string;
  nextTimeChange?: string;
};

export type SavePhaseOutcomeInput = F1PhaseOutcomeInput | F2PhaseOutcomeInput;

export async function loadPhaseOutcomes(batchId: string) {
  const { data, error } = await supabase
    .from("batch_phase_outcomes")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Could not load phase outcomes: ${error.message}`);
  }

  return (data || []) as PhaseOutcomeRow[];
}

export async function loadF1OutcomesForBatches(batchIds: string[]) {
  const uniqueBatchIds = Array.from(new Set(batchIds.filter(Boolean)));

  if (uniqueBatchIds.length === 0) {
    return new Map<string, PhaseOutcomeRow>();
  }

  const { data, error } = await supabase
    .from("batch_phase_outcomes")
    .select("*")
    .eq("phase", "f1")
    .in("batch_id", uniqueBatchIds);

  if (error) {
    throw new Error(`Could not load F1 outcomes for recommendation history: ${error.message}`);
  }

  return new Map(
    ((data || []) as PhaseOutcomeRow[]).map((row) => [row.batch_id, row] as const)
  );
}

export function getOutcomeForPhase(
  outcomes: PhaseOutcomeRow[],
  phase: PhaseOutcomePhase
) {
  return outcomes.find((outcome) => outcome.phase === phase);
}

export function canLogF1Outcome(batch: KombuchaBatch) {
  if (batch.status === "discarded" || batch.currentStage === "discarded") {
    return false;
  }

  return [
    "f1_check_window",
    "f1_extended",
    "f2_setup",
    "f2_active",
    "refrigerate_now",
    "chilled_ready",
    "completed",
    "archived",
  ].includes(batch.currentStage);
}

export function canLogF2Outcome(batch: KombuchaBatch) {
  if (batch.status === "discarded" || batch.currentStage === "discarded") {
    return false;
  }

  return ["chilled_ready", "completed", "archived"].includes(batch.currentStage);
}

function toInsertPayload(
  batchId: string,
  userId: string,
  input: SavePhaseOutcomeInput
): TablesInsert<"batch_phase_outcomes"> {
  const shared = {
    batch_id: batchId,
    phase: input.phase,
    selected_tags: input.selectedTags,
    note: input.note?.trim() || null,
    next_time_change: input.nextTimeChange?.trim() || null,
    created_by_user_id: userId,
  } as const;

  if (input.phase === "f1") {
    return {
      ...shared,
      f1_taste_state: input.tasteState,
      f1_readiness: input.readiness,
      f2_overall_result: null,
      f2_brew_again: null,
    };
  }

  return {
    ...shared,
    f1_taste_state: null,
    f1_readiness: null,
    f2_overall_result: input.overallResult,
    f2_brew_again: input.brewAgain,
  };
}

function buildOutcomeLogNote(input: SavePhaseOutcomeInput) {
  if (input.phase === "f1") {
    return "Recorded an F1 outcome for this batch.";
  }

  return "Recorded an F2 outcome for this batch.";
}

export async function savePhaseOutcome(args: {
  batchId: string;
  userId: string;
  input: SavePhaseOutcomeInput;
}) {
  const { batchId, userId, input } = args;

  const { data: existing, error: existingError } = await supabase
    .from("batch_phase_outcomes")
    .select("id")
    .eq("batch_id", batchId)
    .eq("phase", input.phase)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Could not check existing ${input.phase.toUpperCase()} outcome: ${existingError.message}`);
  }

  const payload = toInsertPayload(batchId, userId, input);

  const query = existing
    ? supabase
        .from("batch_phase_outcomes")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single()
    : supabase
        .from("batch_phase_outcomes")
        .insert(payload)
        .select("*")
        .single();

  const { data, error } = await query;

  if (error) {
    throw new Error(`Could not save ${input.phase.toUpperCase()} outcome: ${error.message}`);
  }

  if (!existing) {
    const { error: logError } = await supabase.from("batch_logs").insert({
      batch_id: batchId,
      created_by_user_id: userId,
      log_type: "phase_outcome",
      note: buildOutcomeLogNote(input),
      structured_payload: {
        phase: input.phase,
        selected_tags: input.selectedTags,
      },
    });

    if (logError) {
      console.error("Phase outcome timeline write failed:", logError);
    }
  }

  return {
    outcome: data as PhaseOutcomeRow,
    created: !existing,
  };
}
