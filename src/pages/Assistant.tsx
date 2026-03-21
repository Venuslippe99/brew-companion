import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, FlaskConical, ShieldAlert } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { Button } from "@/components/ui/button";
import { StageIndicator } from "@/components/common/StageIndicator";
import { TroubleshootingBatchContext } from "@/components/troubleshooting/TroubleshootingBatchContext";
import { TroubleshootingIssuePicker } from "@/components/troubleshooting/TroubleshootingIssuePicker";
import { TroubleshootingQuestionFlow } from "@/components/troubleshooting/TroubleshootingQuestionFlow";
import { TroubleshootingResultCard } from "@/components/troubleshooting/TroubleshootingResultCard";
import { getBatchStageTiming } from "@/lib/batch-timing";
import type { KombuchaBatch } from "@/lib/batches";
import { loadCurrentF2Setup, type LoadedF2Setup } from "@/lib/f2-current-setup";
import { getTroubleshootingIssueDefinition, getTroubleshootingIssues } from "@/lib/troubleshooting/issue-definitions";
import { evaluateTroubleshootingIssue } from "@/lib/troubleshooting/evaluate";
import type {
  TroubleshootingAnswerMap,
  TroubleshootingIssueId,
  TroubleshootingReminderContext,
} from "@/lib/troubleshooting/types";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type AssistantBatchRow = Pick<
  Tables<"kombucha_batches">,
  | "id"
  | "name"
  | "status"
  | "current_stage"
  | "brew_started_at"
  | "f2_started_at"
  | "total_volume_ml"
  | "tea_type"
  | "sugar_g"
  | "starter_liquid_ml"
  | "scoby_present"
  | "avg_room_temp_c"
  | "vessel_type"
  | "target_preference"
  | "initial_ph"
  | "initial_notes"
  | "caution_level"
  | "readiness_window_start"
  | "readiness_window_end"
  | "next_action"
  | "completed_at"
  | "updated_at"
>;

type AssistantReminderRow = Pick<
  Tables<"batch_reminders">,
  "id" | "title" | "due_at" | "urgency_level" | "reminder_type"
>;

type BatchSelectorRow = Pick<
  Tables<"kombucha_batches">,
  "id" | "name" | "current_stage" | "status" | "updated_at"
>;

function mapBatchRow(row: AssistantBatchRow): KombuchaBatch {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    currentStage: row.current_stage,
    brewStartedAt: row.brew_started_at,
    f2StartedAt: row.f2_started_at || undefined,
    totalVolumeMl: row.total_volume_ml,
    teaType: row.tea_type,
    sugarG: Number(row.sugar_g),
    starterLiquidMl: Number(row.starter_liquid_ml),
    scobyPresent: row.scoby_present,
    avgRoomTempC: Number(row.avg_room_temp_c),
    vesselType: row.vessel_type || "Glass jar",
    targetPreference: row.target_preference || "balanced",
    initialPh: row.initial_ph ? Number(row.initial_ph) : undefined,
    initialNotes: row.initial_notes || undefined,
    cautionLevel: row.caution_level === "elevated" ? "high" : row.caution_level,
    readinessWindowStart: row.readiness_window_start || undefined,
    readinessWindowEnd: row.readiness_window_end || undefined,
    nextAction: row.next_action || undefined,
    completedAt: row.completed_at || undefined,
    updatedAt: row.updated_at,
  };
}

export default function Assistant() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [batchOptions, setBatchOptions] = useState<BatchSelectorRow[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<KombuchaBatch | null>(null);
  const [nearestReminder, setNearestReminder] = useState<TroubleshootingReminderContext | null>(null);
  const [f2Setup, setF2Setup] = useState<LoadedF2Setup | null>(null);
  const [loadingBatchList, setLoadingBatchList] = useState(true);
  const [loadingBatchContext, setLoadingBatchContext] = useState(false);
  const [answers, setAnswers] = useState<TroubleshootingAnswerMap>({});
  const [showResult, setShowResult] = useState(false);

  const selectedIssue = searchParams.get("issue") as TroubleshootingIssueId | null;
  const batchId = searchParams.get("batchId");
  const issues = useMemo(() => getTroubleshootingIssues(), []);
  const selectedIssueDefinition = useMemo(
    () => (selectedIssue ? getTroubleshootingIssueDefinition(selectedIssue) : undefined),
    [selectedIssue]
  );
  const timing = useMemo(
    () =>
      selectedBatch
        ? getBatchStageTiming({
            brew_started_at: selectedBatch.brewStartedAt,
            f2_started_at: selectedBatch.f2StartedAt,
            current_stage: selectedBatch.currentStage,
            avg_room_temp_c: selectedBatch.avgRoomTempC,
            target_preference: selectedBatch.targetPreference,
            starter_liquid_ml: selectedBatch.starterLiquidMl,
            total_volume_ml: selectedBatch.totalVolumeMl,
          })
        : null,
    [selectedBatch]
  );
  const questionContext = useMemo(
    () => ({
      issueId: selectedIssue || "not_sure_if_ready",
      batch: selectedBatch,
      timing,
      f2Setup,
      answers,
    }),
    [answers, f2Setup, selectedBatch, selectedIssue, timing]
  );
  const visibleQuestions = useMemo(
    () =>
      selectedIssueDefinition
        ? selectedIssueDefinition
            .getQuestions(questionContext)
            .filter((question) =>
              question.shouldShow ? question.shouldShow(questionContext) : true
            )
        : [],
    [questionContext, selectedIssueDefinition]
  );
  const canSubmit = useMemo(
    () =>
      !!selectedIssueDefinition &&
      visibleQuestions.every((question) => {
        if (question.required === false) {
          return true;
        }

        const value = answers[question.id];
        return value !== undefined && value !== "";
      }),
    [answers, selectedIssueDefinition, visibleQuestions]
  );
  const result = useMemo(
    () =>
      showResult && selectedIssue
        ? evaluateTroubleshootingIssue(selectedIssue, {
            issueId: selectedIssue,
            batch: selectedBatch,
            timing,
            f2Setup,
            nearestReminder,
            answers,
          })
        : null,
    [answers, f2Setup, nearestReminder, selectedBatch, selectedIssue, showResult, timing]
  );

  const issueLabel = useMemo(
    () => selectedIssueDefinition?.title,
    [selectedIssueDefinition]
  );

  useEffect(() => {
    setAnswers({});
    setShowResult(false);
  }, [batchId, selectedIssue]);

  useEffect(() => {
    const loadBatchOptions = async () => {
      setLoadingBatchList(true);

      const { data, error } = await supabase
        .from("kombucha_batches")
        .select("id, name, current_stage, status, updated_at")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Load assistant batch options error:", error);
      } else {
        setBatchOptions((data || []) as BatchSelectorRow[]);
      }

      setLoadingBatchList(false);
    };

    void loadBatchOptions();
  }, []);

  useEffect(() => {
    const loadBatchContext = async () => {
      if (!batchId) {
        setSelectedBatch(null);
        setNearestReminder(null);
        setF2Setup(null);
        return;
      }

      setLoadingBatchContext(true);

      const { data: batchRow, error: batchError } = await supabase
        .from("kombucha_batches")
        .select(`
          id,
          name,
          status,
          current_stage,
          brew_started_at,
          f2_started_at,
          total_volume_ml,
          tea_type,
          sugar_g,
          starter_liquid_ml,
          scoby_present,
          avg_room_temp_c,
          vessel_type,
          target_preference,
          initial_ph,
          initial_notes,
          caution_level,
          readiness_window_start,
          readiness_window_end,
          next_action,
          completed_at,
          updated_at
        `)
        .eq("id", batchId)
        .maybeSingle();

      if (batchError) {
        console.error("Load assistant batch error:", batchError);
        setSelectedBatch(null);
      } else if (batchRow) {
        setSelectedBatch(mapBatchRow(batchRow as AssistantBatchRow));
      } else {
        setSelectedBatch(null);
      }

      const { data: reminderRows, error: reminderError } = await supabase
        .from("batch_reminders")
        .select("id, title, due_at, urgency_level, reminder_type")
        .eq("batch_id", batchId)
        .eq("is_completed", false)
        .order("due_at", { ascending: true })
        .limit(1);

      if (reminderError) {
        console.error("Load assistant reminder error:", reminderError);
        setNearestReminder(null);
      } else {
        const reminder = (reminderRows?.[0] || null) as AssistantReminderRow | null;
        setNearestReminder(
          reminder
            ? {
                id: reminder.id,
                title: reminder.title,
                dueAt: reminder.due_at,
                urgencyLevel: reminder.urgency_level === "critical" ? "high" : reminder.urgency_level,
                reminderType: reminder.reminder_type,
              }
            : null
        );
      }

      try {
        const loadedF2Setup = await loadCurrentF2Setup(batchId);
        setF2Setup(loadedF2Setup);
      } catch (error) {
        console.error("Load assistant F2 setup error:", error);
        setF2Setup(null);
      }

      setLoadingBatchContext(false);
    };

    void loadBatchContext();
  }, [batchId]);

  const handleIssueSelect = (issueId: TroubleshootingIssueId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("issue", issueId);
    setSearchParams(nextParams);
  };

  const handleBatchSelect = (nextBatchId: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (!nextBatchId) {
      nextParams.delete("batchId");
    } else {
      nextParams.set("batchId", nextBatchId);
    }

    setSearchParams(nextParams);
  };

  const handleAnswerChange = (
    questionId: string,
    value: string | number | undefined
  ) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
    setShowResult(false);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-8 pt-6 lg:px-8 lg:pt-10">
        <ScrollReveal>
          <div className="space-y-3">
            <h1 className="font-display text-2xl font-semibold text-foreground lg:text-3xl">
              Troubleshooting Assistant
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Use calm, conservative guidance to decide whether what you are seeing is likely
              normal, needs a closer check, or needs a safer next action.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.04}>
          <div className="rounded-2xl border border-caution/20 bg-caution-bg p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-caution-foreground" />
              <div className="space-y-1 text-sm text-caution-foreground">
                <p className="font-medium">This assistant is cautious on purpose.</p>
                <p>
                  It can help you think through batch stage, timing, carbonation, and visible
                  warning signs, but it cannot confirm contamination or safety with certainty from
                  limited inputs.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Launch context
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">
                    {issueLabel || "Choose an issue"}
                  </h2>
                </div>
                {batchId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <FlaskConical className="h-3.5 w-3.5" />
                    Batch linked
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>
                  The full troubleshooting flow will use the selected issue, optional batch
                  context, timing helpers, and F2 setup data to guide the next step.
                </p>
                {batchId ? (
                  <p>
                    This route was opened with batch context, so the MVP can stay batch-aware
                    instead of asking the same lifecycle questions again.
                  </p>
                ) : (
                  <p>
                    No batch is linked yet, so the flow will support a general troubleshooting path
                    with a few extra context questions.
                  </p>
                )}
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-border bg-background p-3">
                  <label
                    htmlFor="assistant-batch"
                    className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Batch selection
                  </label>
                  <select
                    id="assistant-batch"
                    value={batchId || ""}
                    onChange={(event) => handleBatchSelect(event.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Use general troubleshooting</option>
                    {batchOptions.map((batchOption) => (
                      <option key={batchOption.id} value={batchOption.id}>
                        {batchOption.name}
                      </option>
                    ))}
                  </select>
                  {loadingBatchList ? (
                    <p className="mt-2 text-xs text-muted-foreground">Loading batches...</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => navigate("/batches")}>Open batch list</Button>
                  <Button variant="outline" onClick={() => navigate("/guides")}>
                    Review guides
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-caution" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Attached batch</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The assistant will reuse the saved batch stage, reminders, next action, and F2
                    plan where available.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {batchOptions.slice(0, 4).map((batchOption) => (
                  <button
                    key={batchOption.id}
                    type="button"
                    onClick={() => handleBatchSelect(batchOption.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      batchOption.id === batchId
                        ? "border-primary/30 bg-primary/5 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="min-w-0 truncate">{batchOption.name}</span>
                    <StageIndicator stage={batchOption.current_stage} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <TroubleshootingBatchContext
            batch={selectedBatch}
            timing={timing}
            nearestReminder={nearestReminder}
            f2Setup={f2Setup}
          />
        </ScrollReveal>

        <ScrollReveal delay={0.12}>
          <TroubleshootingIssuePicker
            issues={issues}
            selectedIssueId={selectedIssue}
            onSelect={handleIssueSelect}
          />
        </ScrollReveal>

        <ScrollReveal delay={0.14}>
          {loadingBatchContext ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Loading batch context...</p>
            </div>
          ) : selectedIssueDefinition ? (
            <TroubleshootingQuestionFlow
              questions={visibleQuestions}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              onSubmit={() => setShowResult(true)}
              submitDisabled={!canSubmit}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Choose an issue to continue into the guided troubleshooting flow.
              </p>
            </div>
          )}
        </ScrollReveal>

        {result ? (
          <ScrollReveal delay={0.16}>
            <TroubleshootingResultCard
              result={result}
              onReset={() => {
                setAnswers({});
                setShowResult(false);
              }}
            />
          </ScrollReveal>
        ) : null}
      </div>
    </AppLayout>
  );
}
