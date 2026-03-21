import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { getDayNumber, type BatchStage, type KombuchaBatch } from "@/lib/batches";
import { getBatchStageTiming } from "@/lib/batch-timing";
import { supabase } from "@/integrations/supabase/client";
import { StageIndicator, CautionBadge } from "@/components/common/StageIndicator";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  Thermometer,
  Clock,
} from "lucide-react";

const detailTabs = ["Overview", "Timeline", "Logs", "F2 & Bottles", "Photos", "Notes", "Guide", "Assistant"];

type BatchReminder = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  isCompleted: boolean;
  urgencyLevel: "low" | "medium" | "high" | "overdue";
};

type WorkflowAction = "start-f2" | "still-fermenting";

const f1TimingStages: BatchStage[] = ["f1_active", "f1_check_window", "f1_extended"];

function getStageProgressIndex(stage: BatchStage) {
  switch (stage) {
    case "f1_active":
      return 0;
    case "f1_check_window":
    case "f1_extended":
      return 1;
    case "f2_setup":
    case "f2_active":
      return 2;
    case "refrigerate_now":
      return 3;
    case "chilled_ready":
    case "completed":
    case "archived":
    case "discarded":
      return 4;
    default:
      return 0;
  }
}

function OverviewTab({
  batch,
  reminders,
  onStartF2,
  onStillFermenting,
  actionLoading,
}: {
  batch: KombuchaBatch;
  reminders: BatchReminder[];
  onStartF2: () => Promise<void>;
  onStillFermenting: () => Promise<void>;
  actionLoading: WorkflowAction | null;
}) {
  const timing = getBatchStageTiming({
    brew_started_at: batch.brewStartedAt,
    current_stage: batch.currentStage,
    avg_room_temp_c: batch.avgRoomTempC,
    target_preference: batch.targetPreference,
    starter_liquid_ml: batch.starterLiquidMl,
    total_volume_ml: batch.totalVolumeMl,
  });

  const stageIndex = getStageProgressIndex(batch.currentStage);

  const timingStatusClasses =
    timing?.status === "ready"
      ? "bg-primary/10 text-primary border border-primary/15"
      : timing?.status === "overdue"
        ? "bg-caution-bg text-caution-foreground border border-caution/15"
        : "bg-muted text-foreground border border-border";

  const showWorkflowActions =
    !!timing &&
    (timing.status === "ready" || timing.status === "overdue") &&
    f1TimingStages.includes(batch.currentStage);

  const actionsDisabled = actionLoading !== null;

  return (
    <div className="space-y-5">
      <ScrollReveal>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Stage Progress</h3>
          <div className="flex items-center gap-1">
            {["F1", "Check", "F2", "Chill", "Done"].map((label, i) => {
              const isCompleted = i <= stageIndex;
              const isCurrent = i === stageIndex;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className={`h-1.5 w-full rounded-full transition-colors ${
                      isCompleted ? "bg-primary" : "bg-border"
                    } ${isCurrent ? "animate-pulse-gentle" : ""}`}
                  />
                  <span className={`text-[10px] font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        {timing ? (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current Stage
                </p>
                <h3 className="text-lg font-semibold text-foreground mt-1">
                  {timing.stageLabel} Day {timing.elapsedDays}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {timing.guidance}
                </p>
              </div>

              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${timingStatusClasses}`}
              >
                {timing.statusLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Estimated tasting window</p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  Day {timing.windowStartDay}–{timing.windowEndDay}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {timing.windowDateRangeText}
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Next step</p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {timing.nextActionLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {timing.nextCheckText}
                </p>
              </div>
            </div>

            {showWorkflowActions && (
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    After tasting
                  </p>
                  <p className="text-sm text-foreground mt-1">
                    Record what happened so the batch moves into the right next step.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    className="sm:flex-1"
                    onClick={onStartF2}
                    disabled={actionsDisabled}
                  >
                    {actionLoading === "start-f2" ? "Starting F2..." : "Start F2"}
                  </Button>

                  <Button
                    variant="outline"
                    className="sm:flex-1"
                    onClick={onStillFermenting}
                    disabled={actionsDisabled}
                  >
                    {actionLoading === "still-fermenting" ? "Saving..." : "Still fermenting"}
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-honey-light border border-primary/10 p-3">
              <p className="text-xs text-muted-foreground">Why this estimate</p>
              <p className="text-sm text-foreground mt-1">{timing.explanation}</p>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">
              Timing estimate is not available for this batch yet.
            </p>
          </div>
        )}
      </ScrollReveal>

      {reminders.length > 0 && (
        <ScrollReveal delay={0.08}>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Reminders</h3>
            {reminders.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.description || "No description"}</p>
                </div>
                <Button size="sm" variant="outline">Done</Button>
              </div>
            ))}
          </div>
        </ScrollReveal>
      )}

      <ScrollReveal delay={0.1}>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Recipe</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Tea", batch.teaType],
              ["Sugar", `${batch.sugarG}g`],
              ["Starter", `${batch.starterLiquidMl}ml`],
              ["Volume", `${(batch.totalVolumeMl / 1000).toFixed(1)}L`],
              ["Vessel", batch.vesselType],
              ["SCOBY", batch.scobyPresent ? "Yes" : "No"],
              ["Room Temp", `${batch.avgRoomTempC}°C`],
              ["Target", batch.targetPreference],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium text-foreground capitalize">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

function TimelineTab({ batch }: { batch: KombuchaBatch }) {
  const events = [
    {
      date: "Batch Created",
      items: [
        {
          time: new Date(batch.brewStartedAt).toLocaleString(),
          label: "Batch created and F1 started",
          icon: Clock,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {events.map((group) => (
        <ScrollReveal key={group.date}>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group.date}</h3>
            <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-border">
              {group.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-start pl-1">
                  <div className="h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center shrink-0 z-10">
                    <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <ScrollReveal>
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-base font-display font-medium text-foreground mb-1">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </ScrollReveal>
  );
}

export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Overview");
  const [batch, setBatch] = useState<KombuchaBatch | null>(null);
  const [reminders, setReminders] = useState<BatchReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<WorkflowAction | null>(null);

  useEffect(() => {
    const loadBatch = async () => {
      if (!id) return;

      setLoading(true);

      const { data: batchRow, error: batchError } = await supabase
        .from("kombucha_batches")
        .select(`
          id,
          name,
          status,
          current_stage,
          brew_started_at,
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
        totalVolumeMl: batchRow.total_volume_ml,
        teaType: batchRow.tea_type,
        sugarG: Number(batchRow.sugar_g),
        starterLiquidMl: Number(batchRow.starter_liquid_ml),
        scobyPresent: batchRow.scoby_present,
        avgRoomTempC: Number(batchRow.avg_room_temp_c),
        vesselType: batchRow.vessel_type || "Glass jar",
        targetPreference: batchRow.target_preference || "balanced",
        initialPh: batchRow.initial_ph ? Number(batchRow.initial_ph) : undefined,
        initialNotes: batchRow.initial_notes || undefined,
        cautionLevel: batchRow.caution_level === "elevated" ? "high" : batchRow.caution_level,
        readinessWindowStart: batchRow.readiness_window_start || undefined,
        readinessWindowEnd: batchRow.readiness_window_end || undefined,
        completedAt: batchRow.completed_at || undefined,
        updatedAt: batchRow.updated_at,
      };

      setBatch(mappedBatch);

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

        const mappedReminders: BatchReminder[] = (reminderRows || []).map((row: any) => ({
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
        }));

        setReminders(mappedReminders);
      }

      setLoading(false);
    };

    loadBatch();
  }, [id]);

  const applyWorkflowAction = async ({
    action,
    nextStage,
    nextAction,
    reason,
    logType,
    note,
    successMessage,
    nextTab,
  }: {
    action: WorkflowAction;
    nextStage: BatchStage;
    nextAction: string;
    reason: string;
    logType: "taste_test" | "moved_to_f2";
    note: string;
    successMessage: string;
    nextTab?: string;
  }) => {
    if (!batch) return;

    if (!user?.id) {
      toast.error("You need to be signed in to update this batch.");
      return;
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
            source: "timing_card",
            action,
            from_stage: previousStage,
            to_stage: nextStage,
          },
        }),
      ]);

      const auxiliaryWriteFailed = auxiliaryWrites.some((result) => {
        if (result.status === "rejected") return true;
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
              updatedAt: nowIso,
            }
          : current
      );

      if (nextTab) {
        setActiveTab(nextTab);
      }

      toast.success(successMessage);

      if (auxiliaryWriteFailed) {
        toast.message("The stage changed, but one of the timeline entries could not be saved.");
      }
    } catch (error) {
      console.error("Batch workflow action error:", error);
      toast.error("Couldn't update this batch.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartF2 = async () => {
    await applyWorkflowAction({
      action: "start-f2",
      nextStage: "f2_setup",
      nextAction: "Configure bottles and flavourings for F2",
      reason: "Started F2 from timing card",
      logType: "moved_to_f2",
      note: "User marked the batch as ready and moved into F2 setup from the timing card.",
      successMessage: "Moved to F2 setup.",
      nextTab: "F2 & Bottles",
    });
  };

  const handleStillFermenting = async () => {
    await applyWorkflowAction({
      action: "still-fermenting",
      nextStage: "f1_extended",
      nextAction: "Continue F1 and taste again tomorrow",
      reason: "Continued F1 after tasting",
      logType: "taste_test",
      note: "User tasted the batch and chose to continue F1.",
      successMessage: "Batch kept in F1.",
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 pt-20 text-center">
          <p className="text-muted-foreground">Loading batch...</p>
        </div>
      </AppLayout>
    );
  }

  if (!batch) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 pt-20 text-center">
          <p className="text-muted-foreground">Batch not found</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/batches")}>Back to batches</Button>
        </div>
      </AppLayout>
    );
  }

  const dayNum = getDayNumber(batch.brewStartedAt);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-4 lg:pt-8 lg:px-8 space-y-5 pb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <ScrollReveal>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-display text-xl lg:text-2xl font-semibold text-foreground">{batch.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <StageIndicator stage={batch.currentStage} size="md" />
                  <CautionBadge level={batch.cautionLevel} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-display font-bold text-foreground tabular-nums">{dayNum}</span>
                <span className="block text-xs text-muted-foreground">{dayNum === 1 ? "day" : "days"}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
              <div className="text-center">
                <Thermometer className="h-4 w-4 mx-auto text-muted-foreground mb-0.5" />
                <p className="text-sm font-semibold text-foreground tabular-nums">{batch.avgRoomTempC}°C</p>
                <p className="text-[10px] text-muted-foreground">Room Temp</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{batch.teaType.split(" ")[0]}</p>
                <p className="text-[10px] text-muted-foreground">Tea</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground capitalize">{batch.targetPreference}</p>
                <p className="text-[10px] text-muted-foreground">Target</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {detailTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <div className="min-h-[300px]">
          {activeTab === "Overview" && (
            <OverviewTab
              batch={batch}
              reminders={reminders}
              onStartF2={handleStartF2}
              onStillFermenting={handleStillFermenting}
              actionLoading={actionLoading}
            />
          )}
          {activeTab === "Timeline" && <TimelineTab batch={batch} />}
          {activeTab === "Logs" && <PlaceholderTab title="Logs" description="Structured action history will appear here. Add taste tests, temperature readings, and more." />}
          {activeTab === "F2 & Bottles" && <PlaceholderTab title="F2 & Bottles" description="Set up your second fermentation here once F1 is ready. Configure bottles, flavourings, and carbonation targets." />}
          {activeTab === "Photos" && <PlaceholderTab title="Photos" description="Document your batch visually. Upload photos to track SCOBY growth, colour changes, and more." />}
          {activeTab === "Notes" && <PlaceholderTab title="Notes" description="Freeform notes for observations, reflections, and custom tracking." />}
          {activeTab === "Guide" && <PlaceholderTab title="Stage Guide" description="Context-aware tips for your current fermentation stage." />}
          {activeTab === "Assistant" && <PlaceholderTab title="Batch Assistant" description="AI-powered guidance based on this batch's data. Ask questions about your brew." />}
        </div>
      </div>
    </AppLayout>
  );
}
