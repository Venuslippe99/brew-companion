import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { BatchDetailHero } from "@/components/batch-detail/BatchDetailHero";
import { BatchDetailSegmentedNav } from "@/components/batch-detail/BatchDetailSegmentedNav";
import { BatchOverviewSurface } from "@/components/batch-detail/BatchOverviewSurface";
import { BatchJournal } from "@/components/batch-detail/BatchJournal";
import { BatchAssistantSurface } from "@/components/batch-detail/BatchAssistantSurface";
import { BatchQuickLogDrawer } from "@/components/batch-detail/BatchQuickLogDrawer";
import { PhaseOutcomeDrawer } from "@/components/outcomes/PhaseOutcomeDrawer";
import { useAuth } from "@/contexts/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { applyBrewAgainSelection } from "@/lib/brew-again";
import { getDayNumber, getStageLabel, type BatchStage, type BatchStatus, type KombuchaBatch } from "@/lib/batches";
import { getBatchStageTiming } from "@/lib/batch-timing";
import { buildBatchJournal } from "@/lib/batch-journal";
import type { BatchReminder, BatchSurface, BatchTimelineEntry } from "@/lib/batch-detail-view";
import {
  saveBatchQuickLog,
  type TasteTestImpression,
} from "@/lib/batch-quick-logs";
import { loadCurrentF2Setup, type LoadedF2Setup } from "@/lib/f2-current-setup";
import { loadBatchF1Setup, type LoadedF1Setup } from "@/lib/f1-setups";
import { loadBatchLineage, type BatchLineage } from "@/lib/lineage";
import {
  getOutcomeForPhase,
  loadPhaseOutcomes,
  savePhaseOutcome,
  type F1PhaseOutcomeInput,
  type F2PhaseOutcomeInput,
  type PhaseOutcomeRow,
} from "@/lib/phase-outcomes";

type BatchReminderRow = Pick<
  Tables<"batch_reminders">,
  "id" | "title" | "description" | "due_at" | "is_completed" | "urgency_level"
>;

type WorkflowAction = "start-f2" | "still-fermenting";
type QuickLogMode = "note" | "taste_test" | null;

function getLogTitle(logType: string) {
  switch (logType) {
    case "taste_test":
      return "Added a taste check";
    case "moved_to_f2":
      return "Moved into Second Fermentation";
    case "bottle_burped":
      return "Burped a bottle";
    case "refrigerated":
      return "Moved bottles to the fridge";
    case "temp_check":
      return "Logged a temperature check";
    case "ph_check":
      return "Logged a pH check";
    case "sweetness_check":
      return "Logged a sweetness check";
    case "carbonation_check":
      return "Checked carbonation";
    case "phase_outcome":
      return "Saved a phase reflection";
    case "custom_action":
      return "Recorded a batch action";
    case "note_only":
      return "Added a note";
    case "photo_added":
      return "Added a photo";
    default:
      return "Added a journal entry";
  }
}

function getStructuredPayload(
  value: Tables<"batch_logs">["structured_payload"]
): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;

  const [activeSurface, setActiveSurface] = useState<BatchSurface>("overview");
  const [batch, setBatch] = useState<KombuchaBatch | null>(null);
  const [reminders, setReminders] = useState<BatchReminder[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<BatchTimelineEntry[]>([]);
  const [phaseOutcomes, setPhaseOutcomes] = useState<PhaseOutcomeRow[]>([]);
  const [lineage, setLineage] = useState<BatchLineage | null>(null);
  const [currentF1Setup, setCurrentF1Setup] = useState<LoadedF1Setup | null>(null);
  const [currentF2Setup, setCurrentF2Setup] = useState<LoadedF2Setup | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [outcomesLoading, setOutcomesLoading] = useState(true);
  const [lineageLoading, setLineageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<WorkflowAction | null>(null);
  const [activeOutcomePhase, setActiveOutcomePhase] = useState<"f1" | "f2" | null>(null);
  const [outcomeSaving, setOutcomeSaving] = useState(false);
  const [activeQuickLogMode, setActiveQuickLogMode] = useState<QuickLogMode>(null);
  const [quickLogSaving, setQuickLogSaving] = useState(false);

  const timing = useMemo(() => {
    if (!batch) {
      return null;
    }

    return getBatchStageTiming({
      brew_started_at: batch.brewStartedAt,
      f2_started_at: batch.f2StartedAt,
      current_stage: batch.currentStage,
      avg_room_temp_c: batch.avgRoomTempC,
      target_preference: batch.targetPreference,
      starter_liquid_ml: batch.starterLiquidMl,
      total_volume_ml: batch.totalVolumeMl,
    });
  }, [batch]);

  const journalSections = useMemo(
    () => buildBatchJournal({ timelineEntries, phaseOutcomes }),
    [timelineEntries, phaseOutcomes]
  );

  const f1Outcome = useMemo(
    () => getOutcomeForPhase(phaseOutcomes, "f1"),
    [phaseOutcomes]
  );
  const f2Outcome = useMemo(
    () => getOutcomeForPhase(phaseOutcomes, "f2"),
    [phaseOutcomes]
  );

  const loadPhaseOutcomeRows = async (batchId: string) => {
    setOutcomesLoading(true);

    try {
      const rows = await loadPhaseOutcomes(batchId);
      setPhaseOutcomes(rows);
    } catch (error) {
      console.error("Load phase outcomes error:", error);
      setPhaseOutcomes([]);
    } finally {
      setOutcomesLoading(false);
    }
  };

  const loadF2SetupSummary = async (batchId: string) => {
    try {
      const setup = await loadCurrentF2Setup(batchId);
      setCurrentF2Setup(setup);
    } catch (error) {
      console.error("Load current F2 setup error:", error);
      setCurrentF2Setup(null);
    }
  };

  const loadF1SetupSummary = async (batchId: string) => {
    try {
      const setup = await loadBatchF1Setup(batchId);
      setCurrentF1Setup(setup);
    } catch (error) {
      console.error("Load current F1 setup error:", error);
      setCurrentF1Setup(null);
    }
  };

  const loadTimelineEntries = async (batchId: string) => {
    setTimelineLoading(true);

    const [{ data: stageRows, error: stageError }, { data: logRows, error: logError }] =
      await Promise.all([
        supabase
          .from("batch_stage_events")
          .select("id, created_at, from_stage, to_stage, reason")
          .eq("batch_id", batchId)
          .order("created_at", { ascending: false }),
        supabase
          .from("batch_logs")
          .select("id, logged_at, log_type, note, structured_payload")
          .eq("batch_id", batchId)
          .order("logged_at", { ascending: false }),
      ]);

    if (stageError) {
      console.error("Load stage events error:", stageError);
    }

    if (logError) {
      console.error("Load batch logs error:", logError);
    }

    const stageEntries: BatchTimelineEntry[] = (stageRows || []).map((row) => ({
      id: `stage-${row.id}`,
      eventAt: row.created_at,
      title: `Moved to ${getStageLabel(row.to_stage)}`,
      subtitle: row.reason || (row.from_stage ? `From ${getStageLabel(row.from_stage)}` : null),
      source: "stage_event",
      fromStage: row.from_stage,
      toStage: row.to_stage,
    }));

    const logEntries: BatchTimelineEntry[] = (logRows || []).map((row) => {
      const structuredPayload = getStructuredPayload(row.structured_payload);

      return {
        id: `log-${row.id}`,
        eventAt: row.logged_at,
        title: getLogTitle(row.log_type),
        subtitle: row.note,
        source: "log",
        logType: row.log_type,
        stageAtLog:
          structuredPayload &&
          "stage_at_log" in structuredPayload &&
          typeof structuredPayload.stage_at_log === "string"
            ? (structuredPayload.stage_at_log as BatchStage)
            : undefined,
        sourceHint:
          structuredPayload &&
          "source" in structuredPayload &&
          typeof structuredPayload.source === "string"
            ? structuredPayload.source
            : undefined,
        structuredPayload,
      };
    });

    const merged = [...stageEntries, ...logEntries].sort(
      (left, right) =>
        new Date(right.eventAt).getTime() - new Date(left.eventAt).getTime()
    );

    setTimelineEntries(merged);
    setTimelineLoading(false);
  };

  useEffect(() => {
    const loadBatch = async () => {
      if (!id) {
        return;
      }

      setLoading(true);

      const { data: batchRow, error: batchError } = await supabase
        .from("kombucha_batches")
        .select(`
          id,
          name,
          status,
          current_stage,
          brew_started_at,
          f2_started_at,
          f1_recipe_id,
          total_volume_ml,
          tea_type,
          tea_source_form,
          tea_amount_value,
          tea_amount_unit,
          sugar_g,
          sugar_type,
          starter_liquid_ml,
          scoby_present,
          avg_room_temp_c,
          vessel_type,
          target_preference,
          initial_ph,
          initial_notes,
          caution_level,
          brew_again_source_batch_id,
          readiness_window_start,
          readiness_window_end,
          next_action,
          starter_source_batch_id,
          starter_source_type,
          completed_at,
          updated_at
        `)
        .eq("id", id)
        .single();

      if (batchError) {
        console.error("Load batch error:", batchError);
        setLoading(false);
        return;
      }

      const mappedBatch: KombuchaBatch = {
        id: batchRow.id,
        name: batchRow.name,
        status: batchRow.status,
        currentStage: batchRow.current_stage,
        brewStartedAt: batchRow.brew_started_at,
        f2StartedAt: batchRow.f2_started_at || undefined,
        f1RecipeId: batchRow.f1_recipe_id || undefined,
        totalVolumeMl: batchRow.total_volume_ml,
        teaType: batchRow.tea_type,
        teaSourceForm: batchRow.tea_source_form || undefined,
        teaAmountValue:
          batchRow.tea_amount_value !== null ? Number(batchRow.tea_amount_value) : undefined,
        teaAmountUnit: batchRow.tea_amount_unit || undefined,
        sugarG: Number(batchRow.sugar_g),
        sugarType: batchRow.sugar_type || undefined,
        starterLiquidMl: Number(batchRow.starter_liquid_ml),
        scobyPresent: batchRow.scoby_present,
        avgRoomTempC: Number(batchRow.avg_room_temp_c),
        vesselType: batchRow.vessel_type || "Glass jar",
        targetPreference: batchRow.target_preference || "balanced",
        initialPh: batchRow.initial_ph ? Number(batchRow.initial_ph) : undefined,
        initialNotes: batchRow.initial_notes || undefined,
        cautionLevel:
          batchRow.caution_level === "elevated" ? "high" : batchRow.caution_level,
        readinessWindowStart: batchRow.readiness_window_start || undefined,
        readinessWindowEnd: batchRow.readiness_window_end || undefined,
        nextAction: batchRow.next_action || undefined,
        completedAt: batchRow.completed_at || undefined,
        updatedAt: batchRow.updated_at,
      };

      setBatch(mappedBatch);

      if (!userId) {
        setLineage(null);
        setLineageLoading(false);
      } else {
        setLineageLoading(true);

        try {
          const resolvedStarterSourceBatchId =
            batchRow.starter_source_type === "previous_batch"
              ? batchRow.starter_source_batch_id
              : null;

          const lineageData = await loadBatchLineage({
            userId,
            batchId: batchRow.id,
            brewedFromBatchId: batchRow.brew_again_source_batch_id,
            starterSourceBatchId: resolvedStarterSourceBatchId,
          });

          setLineage(lineageData);
        } catch (error) {
          console.error("Load lineage error:", error);
          setLineage(null);
        } finally {
          setLineageLoading(false);
        }
      }

      const { data: reminderRows, error: reminderError } = await supabase
        .from("batch_reminders")
        .select("id, title, description, due_at, is_completed, urgency_level")
        .eq("batch_id", id)
        .eq("is_completed", false)
        .order("due_at", { ascending: true });

      if (reminderError) {
        console.error("Load reminders error:", reminderError);
      } else {
        const now = new Date();
        const mappedReminders: BatchReminder[] = ((reminderRows || []) as BatchReminderRow[]).map(
          (row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            dueAt: row.due_at,
            isCompleted: row.is_completed,
            urgencyLevel:
              !row.is_completed && new Date(row.due_at) < now
                ? "overdue"
                : row.urgency_level === "critical"
                  ? "high"
                  : row.urgency_level,
          })
        );

        setReminders(mappedReminders);
      }

      setLoading(false);
    };

    void loadBatch();
  }, [id, userId]);

  useEffect(() => {
    if (!id) {
      return;
    }

    void loadTimelineEntries(id);
    void loadPhaseOutcomeRows(id);
    void loadF1SetupSummary(id);
    void loadF2SetupSummary(id);
  }, [id]);

  const applyWorkflowAction = async ({
    action,
    nextStage,
    nextAction,
    reason,
    logType,
    note,
    successMessage,
  }: {
    action: WorkflowAction;
    nextStage: BatchStage;
    nextAction: string;
    reason: string;
    logType: "taste_test" | "moved_to_f2";
    note: string;
    successMessage: string;
  }): Promise<boolean> => {
    if (!batch) {
      return false;
    }

    if (!user?.id) {
      toast.error("You need to be signed in to update this batch.");
      return false;
    }

    const nowIso = new Date().toISOString();
    const previousStage = batch.currentStage;

    setActionLoading(action);

    try {
      const { error: batchUpdateError } = await supabase
        .from("kombucha_batches")
        .update({
          current_stage: nextStage,
          next_action: nextAction,
          updated_at: nowIso,
        })
        .eq("id", batch.id);

      if (batchUpdateError) {
        throw batchUpdateError;
      }

      const auxiliaryWrites = await Promise.allSettled([
        supabase.from("batch_stage_events").insert({
          batch_id: batch.id,
          from_stage: previousStage,
          to_stage: nextStage,
          reason,
          triggered_by: user.id,
        }),
        supabase.from("batch_logs").insert({
          batch_id: batch.id,
          created_by_user_id: user.id,
          log_type: logType,
          logged_at: nowIso,
          note,
          structured_payload: {
            source: "batch_detail_overview",
            action,
            from_stage: previousStage,
            to_stage: nextStage,
          },
        }),
      ]);

      const auxiliaryWriteFailed = auxiliaryWrites.some((result) => {
        if (result.status === "rejected") {
          return true;
        }

        return !!result.value.error;
      });

      if (auxiliaryWriteFailed) {
        console.error("Batch workflow update partially failed:", auxiliaryWrites);
      }

      setBatch((current) =>
        current
          ? {
              ...current,
              currentStage: nextStage,
              nextAction,
              updatedAt: nowIso,
            }
          : current
      );

      setActiveSurface("overview");
      toast.success(successMessage);
      void loadTimelineEntries(batch.id);

      if (auxiliaryWriteFailed) {
        toast.message("The stage changed, but one of the Journal entries could not be saved.");
      }
      return true;
    } catch (error) {
      console.error("Batch workflow action error:", error);
      toast.error("Couldn't update this batch.");
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartF2 = async () => {
    const moved = await applyWorkflowAction({
      action: "start-f2",
      nextStage: "f2_setup",
      nextAction: "Configure bottles and flavourings for F2",
      reason: "Started F2 from the BatchDetail overview",
      logType: "moved_to_f2",
      note: "User marked the batch as ready and moved into Second Fermentation setup.",
      successMessage: "Moved to Second Fermentation setup.",
    });

    if (moved) {
      navigate(`/batch/${batch?.id}/f2/setup`);
    }
  };

  const handleStillFermenting = async () => {
    await applyWorkflowAction({
      action: "still-fermenting",
      nextStage: "f1_extended",
      nextAction: "Continue F1 and taste again tomorrow",
      reason: "Continued F1 after tasting",
      logType: "taste_test",
      note: "User tasted the batch and chose to keep First Fermentation going.",
      successMessage: "Batch kept in First Fermentation.",
    });
  };

  const handleSaveOutcome = async (
    input: F1PhaseOutcomeInput | F2PhaseOutcomeInput
  ) => {
    if (!batch || !user?.id) {
      toast.error("You need to be signed in to save an outcome.");
      return;
    }

    setOutcomeSaving(true);

    try {
      const { outcome, created } = await savePhaseOutcome({
        batchId: batch.id,
        userId: user.id,
        input,
      });

      setPhaseOutcomes((current) => {
        const otherOutcomes = current.filter(
          (existingOutcome) => existingOutcome.phase !== outcome.phase
        );
        return [...otherOutcomes, outcome];
      });
      setActiveOutcomePhase(null);

      if (created) {
        toast.success(`${input.phase.toUpperCase()} reflection saved.`);
        void loadTimelineEntries(batch.id);
      } else {
        toast.success(`${input.phase.toUpperCase()} reflection updated.`);
      }
    } catch (error) {
      console.error("Save phase outcome error:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not save this reflection."
      );
    } finally {
      setOutcomeSaving(false);
    }
  };

  const handleCompleteReminder = async (reminderId: string) => {
    const completedAt = new Date().toISOString();

    try {
      const { error } = await supabase
        .from("batch_reminders")
        .update({
          is_completed: true,
          completed_at: completedAt,
          updated_at: completedAt,
        })
        .eq("id", reminderId);

      if (error) {
        throw error;
      }

      setReminders((current) => current.filter((reminder) => reminder.id !== reminderId));
      toast.success("Reminder marked done.");
    } catch (error) {
      console.error("Complete reminder error:", error);
      toast.error("Could not update this reminder.");
    }
  };

  const handleSaveQuickLog = async ({
    mode,
    note,
    tasteImpression,
  }: {
    mode: Exclude<QuickLogMode, null>;
    note: string;
    tasteImpression?: TasteTestImpression;
  }) => {
    if (!batch || !user?.id) {
      toast.error("You need to be signed in to save a quick note.");
      return;
    }

    setQuickLogSaving(true);

    try {
      await saveBatchQuickLog({
        batchId: batch.id,
        userId: user.id,
        logType: mode === "note" ? "note_only" : "taste_test",
        note:
          mode === "taste_test" && tasteImpression
            ? `${tasteImpression.replace(/_/g, " ")}. ${note}`.trim()
            : note,
        stageAtLog: batch.currentStage,
        structuredPayload:
          mode === "taste_test"
            ? {
                taste_impression: tasteImpression,
              }
            : undefined,
      });

      setActiveQuickLogMode(null);
      toast.success(mode === "note" ? "Brewing note saved." : "Taste test saved.");
      void loadTimelineEntries(batch.id);
    } catch (error) {
      console.error("Save quick log error:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not save this quick log."
      );
    } finally {
      setQuickLogSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout shell={{ title: "Batch", subtitle: "Loading batch..." }}>
        <div className="max-w-2xl mx-auto px-4 pt-20 text-center">
          <p className="text-muted-foreground">Loading batch...</p>
        </div>
      </AppLayout>
    );
  }

  if (!batch) {
    return (
      <AppLayout shell={{ title: "Batch", subtitle: "Not found" }}>
        <div className="max-w-2xl mx-auto px-4 pt-20 text-center">
          <p className="text-muted-foreground">Batch not found</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/batches")}>
            Back to batches
          </Button>
        </div>
      </AppLayout>
    );
  }

  const dayNumber = getDayNumber(batch.brewStartedAt);

  return (
    <AppLayout
      shell={{
        title: batch.name,
        subtitle: `${getStageLabel(batch.currentStage)} • Day ${dayNumber}`,
      }}
    >
      <div className="mx-auto max-w-6xl space-y-5 px-4 pb-10 pt-2 lg:px-8 lg:pt-4">
        <BatchDetailHero
          batch={batch}
          dayNumber={dayNumber}
          timing={timing}
          reminders={reminders}
          currentF2Setup={currentF2Setup}
          f1Outcome={f1Outcome}
          f2Outcome={f2Outcome}
          canLogTasteTest={["f1_active", "f1_check_window", "f1_extended"].includes(
            batch.currentStage
          )}
          photoSupported={false}
          onAddNote={() => setActiveQuickLogMode("note")}
          onAddTasteTest={() => setActiveQuickLogMode("taste_test")}
          onStartBrewAgain={({ mode, plan, enabledSuggestionIds }) => {
            navigate("/new-batch", {
              state: applyBrewAgainSelection({
                plan,
                mode,
                enabledSuggestionIds,
              }),
            });
          }}
        />

        <BatchDetailSegmentedNav
          activeSurface={activeSurface}
          onChange={setActiveSurface}
        />

        <div className="min-h-[320px]">
          {activeSurface === "overview" && (
            <BatchOverviewSurface
              batch={batch}
              reminders={reminders}
              onCompleteReminder={handleCompleteReminder}
              timing={timing}
              outcomes={phaseOutcomes}
              outcomesLoading={outcomesLoading}
              lineage={lineage}
              lineageLoading={lineageLoading}
              currentF1Setup={currentF1Setup}
              currentF2Setup={currentF2Setup}
              onOpenOutcome={setActiveOutcomePhase}
              onStartF2={handleStartF2}
              onOpenF2Chapter={() => navigate(`/batch/${batch.id}/f2/setup`)}
              onStillFermenting={handleStillFermenting}
              actionLoading={actionLoading}
              onStartBrewAgain={({ mode, plan, enabledSuggestionIds }) => {
                navigate("/new-batch", {
                  state: applyBrewAgainSelection({
                    plan,
                    mode,
                    enabledSuggestionIds,
                  }),
                });
              }}
            />
          )}

          {activeSurface === "journal" && (
            timelineLoading || outcomesLoading ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">Loading journal...</p>
              </div>
            ) : (
              <BatchJournal sections={journalSections} />
            )
          )}

          {activeSurface === "assistant" && (
            <BatchAssistantSurface batch={batch} />
          )}
        </div>
      </div>

      <PhaseOutcomeDrawer
        phase={activeOutcomePhase || "f1"}
        open={activeOutcomePhase !== null}
        saving={outcomeSaving}
        contextSummary={
          activeOutcomePhase === "f2"
            ? currentF2Setup
              ? `${currentF2Setup.bottleCount} bottles, ${currentF2Setup.desiredCarbonationLevel} carbonation target, saved at ${currentF2Setup.ambientTempC}°C.`
              : undefined
            : undefined
        }
        initialOutcome={getOutcomeForPhase(phaseOutcomes, activeOutcomePhase || "f1")}
        onOpenChange={(open) => {
          if (!open) {
            setActiveOutcomePhase(null);
          }
        }}
        onSave={handleSaveOutcome}
      />

      <BatchQuickLogDrawer
        mode={activeQuickLogMode === "taste_test" ? "taste_test" : "note"}
        open={activeQuickLogMode !== null}
        saving={quickLogSaving}
        onOpenChange={(open) => {
          if (!open) {
            setActiveQuickLogMode(null);
          }
        }}
        onSave={({ note, tasteImpression }) =>
          handleSaveQuickLog({
            mode: activeQuickLogMode === "taste_test" ? "taste_test" : "note",
            note,
            tasteImpression,
          })
        }
      />
    </AppLayout>
  );
}
