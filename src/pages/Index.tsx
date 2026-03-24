import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { HomeBatchRoster } from "@/components/home/HomeBatchRoster";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomePrimaryFocusCard } from "@/components/home/HomePrimaryFocusCard";
import { HomeQuickLogDock } from "@/components/home/HomeQuickLogDock";
import { HomeRecentMovement } from "@/components/home/HomeRecentMovement";
import { HomeSupportPanel } from "@/components/home/HomeSupportPanel";
import { HomeTodayQueue } from "@/components/home/HomeTodayQueue";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { type KombuchaBatch } from "@/lib/batches";
import {
  buildHomeCommandCenter,
  type HomeQuickLogAction,
} from "@/lib/home-command-center";
import {
  saveBatchQuickLog,
  type TasteTestImpression,
} from "@/lib/batch-quick-logs";
import { type TodayActionReminder } from "@/lib/today-actions";

type DashboardBatchRow = Pick<
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

type DashboardReminderRow = Pick<
  Tables<"batch_reminders">,
  | "id"
  | "batch_id"
  | "title"
  | "description"
  | "due_at"
  | "is_completed"
  | "urgency_level"
  | "reminder_type"
>;

type DashboardTimelineRow = Pick<
  Tables<"batch_timeline_view">,
  "id" | "batch_id" | "event_type" | "event_at" | "title" | "subtitle" | "payload"
>;

function mapBatchRow(row: DashboardBatchRow): KombuchaBatch {
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { preferences } = useUser();
  const { user } = useAuth();

  const [batches, setBatches] = useState<KombuchaBatch[]>([]);
  const [reminders, setReminders] = useState<TodayActionReminder[]>([]);
  const [recentTimelineRows, setRecentTimelineRows] = useState<DashboardTimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickLogSaving, setQuickLogSaving] = useState(false);
  const [requestedQuickLogAction, setRequestedQuickLogAction] =
    useState<HomeQuickLogAction["key"] | null>(null);

  const loadHome = useCallback(async () => {
    setLoading(true);

    const [{ data: batchRows, error: batchError }, { data: reminderRows, error: reminderError }] =
      await Promise.all([
        supabase
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
          .order("updated_at", { ascending: false }),
        supabase
          .from("batch_reminders")
          .select(`
            id,
            batch_id,
            title,
            description,
            due_at,
            is_completed,
            urgency_level,
            reminder_type
          `)
          .eq("is_completed", false)
          .order("due_at", { ascending: true }),
      ]);

    if (batchError) {
      console.error("Load Home batches error:", batchError);
      toast.error(batchError.message);
      setLoading(false);
      return;
    }

    if (reminderError) {
      console.error("Load Home reminders error:", reminderError);
      toast.error(reminderError.message);
    }

    const mappedBatches = ((batchRows || []) as DashboardBatchRow[]).map(mapBatchRow);
    const now = new Date();
    const mappedReminders = ((reminderRows || []) as DashboardReminderRow[]).map((row) => ({
      id: row.id,
      batchId: row.batch_id,
      title: row.title,
      description: row.description,
      dueAt: row.due_at,
      urgencyLevel:
        !row.is_completed && new Date(row.due_at) < now
          ? "overdue"
          : row.urgency_level === "critical"
            ? "high"
            : row.urgency_level,
      reminderType: row.reminder_type,
    })) satisfies TodayActionReminder[];

    setBatches(mappedBatches);
    setReminders(mappedReminders);

    const activeBatchIds = mappedBatches
      .filter((batch) => batch.status === "active")
      .map((batch) => batch.id);

    if (activeBatchIds.length === 0) {
      setRecentTimelineRows([]);
      setLoading(false);
      return;
    }

    const { data: timelineRows, error: timelineError } = await supabase
      .from("batch_timeline_view")
      .select("id, batch_id, event_type, event_at, title, subtitle, payload")
      .in("batch_id", activeBatchIds)
      .order("event_at", { ascending: false })
      .limit(12);

    if (timelineError) {
      console.error("Load Home recent movement error:", timelineError);
      setRecentTimelineRows([]);
    } else {
      setRecentTimelineRows((timelineRows || []) as DashboardTimelineRow[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const commandCenter = useMemo(
    () =>
      buildHomeCommandCenter({
        batches,
        reminders,
        recentTimelineRows,
        displayName: preferences.displayName,
        isBeginner: preferences.experienceLevel === "beginner",
      }),
    [batches, preferences.displayName, preferences.experienceLevel, recentTimelineRows, reminders]
  );

  const handlePrimaryQuickLog = (actionKey: HomeQuickLogAction["key"]) => {
    setRequestedQuickLogAction(actionKey);
    document.getElementById("home-quick-log")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleQuickLogSubmit = async ({
    actionKey,
    batchId,
    note,
    tasteImpression,
    valueNumber,
  }: {
    actionKey: HomeQuickLogAction["key"];
    batchId: string;
    note?: string;
    tasteImpression?: TasteTestImpression;
    valueNumber?: number;
  }) => {
    const batch = batches.find((candidate) => candidate.id === batchId);

    if (!batch || !user?.id) {
      toast.error("You need to be signed in and choose a batch before logging.");
      return;
    }

    setQuickLogSaving(true);

    try {
      await saveBatchQuickLog({
        batchId,
        userId: user.id,
        logType: actionKey,
        note:
          actionKey === "taste_test" && tasteImpression
            ? `${tasteImpression.replace(/_/g, " ")}. ${note || ""}`.trim()
            : note,
        stageAtLog: batch.currentStage,
        valueNumber,
        valueUnit: actionKey === "temp_check" ? "deg C" : undefined,
        source: "home_command_center_quick_log",
        structuredPayload:
          actionKey === "taste_test"
            ? { taste_impression: tasteImpression }
            : actionKey === "temp_check"
              ? { measured_room_temp_c: valueNumber }
              : undefined,
      });

      toast.success(
        actionKey === "taste_test"
          ? "Taste test saved."
          : actionKey === "temp_check"
            ? "Temperature check saved."
            : actionKey === "carbonation_check"
              ? "Carbonation check saved."
              : "Brewing note saved."
      );

      await loadHome();
    } catch (error) {
      console.error("Save Home quick log error:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not save this quick log."
      );
    } finally {
      setQuickLogSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="home-canvas min-h-screen">
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:px-8 lg:pb-10 lg:pt-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)] xl:items-start">
            <div className="space-y-6">
              <ScrollReveal>
                <HomeHeader
                  activeBatchCount={commandCenter.activeBatchCount}
                  stateSentence={loading ? "Loading today's brews..." : commandCenter.stateSentence}
                  displayName={commandCenter.greetingName}
                  onOpenSettings={() => navigate("/settings")}
                />
              </ScrollReveal>

              <ScrollReveal delay={0.04}>
                <HomePrimaryFocusCard
                  primaryFocus={commandCenter.primaryFocus}
                  quickLogActions={commandCenter.quickLogActions}
                  onOpenQuickLog={handlePrimaryQuickLog}
                />
              </ScrollReveal>

              {loading ? (
                <section className="home-panel-surface px-5 py-8 text-center">
                  <p className="text-sm text-muted-foreground">Loading your brews for today...</p>
                </section>
              ) : commandCenter.activeBatchCount > 0 ? (
                <>
                  <ScrollReveal delay={0.08}>
                    <HomeTodayQueue id="home-today-queue" items={commandCenter.todayQueue} />
                  </ScrollReveal>

                  {commandCenter.recentMovement.length > 0 ? (
                    <ScrollReveal delay={0.16}>
                      <HomeRecentMovement
                        id="home-movement"
                        items={commandCenter.recentMovement}
                      />
                    </ScrollReveal>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="space-y-6">
              {!loading && commandCenter.activeBatchCount > 0 ? (
                <>
                  <ScrollReveal delay={0.1}>
                    <HomeQuickLogDock
                      id="home-quick-log"
                      actions={commandCenter.quickLogActions}
                      batches={batches.filter((batch) => batch.status === "active")}
                      saving={quickLogSaving}
                      requestedActionKey={requestedQuickLogAction}
                      onRequestedActionHandled={() => setRequestedQuickLogAction(null)}
                      onSubmit={handleQuickLogSubmit}
                    />
                  </ScrollReveal>

                  <ScrollReveal delay={0.14}>
                    <HomeBatchRoster id="home-roster" items={commandCenter.activeRoster} />
                  </ScrollReveal>
                </>
              ) : null}

              <ScrollReveal delay={0.2}>
                <HomeSupportPanel context={commandCenter.supportContext} />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
