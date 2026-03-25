import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomePrimaryFocusCard } from "@/components/home/HomePrimaryFocusCard";
import { HomeQuickLogDock } from "@/components/home/HomeQuickLogDock";
import { HomeRecentMovement } from "@/components/home/HomeRecentMovement";
import { HomeStatsGrid } from "@/components/home/HomeStatsGrid";
import { HomeSupportPanel } from "@/components/home/HomeSupportPanel";
import { HomeTodayQueue } from "@/components/home/HomeTodayQueue";
import { useAuth } from "@/contexts/use-auth";
import { useUser } from "@/contexts/use-user";
import { homeCopy } from "@/copy/home";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { type KombuchaBatch } from "@/lib/batches";
import { buildHomeCommandCenter, type HomeQuickLogAction } from "@/lib/home-command-center";
import { saveBatchQuickLog, type TasteTestImpression } from "@/lib/batch-quick-logs";
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
  const [totalBottlesBottled, setTotalBottlesBottled] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quickLogSaving, setQuickLogSaving] = useState(false);
  const [requestedQuickLogAction, setRequestedQuickLogAction] =
    useState<HomeQuickLogAction["key"] | null>(null);

  const loadHome = useCallback(async () => {
    setLoading(true);

    const [
      { data: batchRows, error: batchError },
      { data: reminderRows, error: reminderError },
      { count: bottleCount, error: bottleCountError },
    ] = await Promise.all([
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
      supabase
        .from("batch_bottles")
        .select("id", { count: "exact", head: true }),
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

    if (bottleCountError) {
      console.error("Load Home bottle count error:", bottleCountError);
      toast.error(bottleCountError.message);
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
    setTotalBottlesBottled(bottleCount || 0);

    const timelineBatchIds = mappedBatches
      .filter((batch) => batch.status !== "discarded")
      .map((batch) => batch.id);

    if (timelineBatchIds.length === 0) {
      setRecentTimelineRows([]);
      setLoading(false);
      return;
    }

    const { data: timelineRows, error: timelineError } = await supabase
      .from("batch_timeline_view")
      .select("id, batch_id, event_type, event_at, title, subtitle, payload")
      .in("batch_id", timelineBatchIds)
      .order("event_at", { ascending: false })
      .limit(8);

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
        totalBottlesBottled,
        displayName: preferences.displayName,
        isBeginner: preferences.experienceLevel === "beginner",
      }),
    [
      batches,
      preferences.displayName,
      preferences.experienceLevel,
      recentTimelineRows,
      reminders,
      totalBottlesBottled,
    ]
  );

  const handlePrimaryQuickLog = (actionKey: HomeQuickLogAction["key"]) => {
    setRequestedQuickLogAction(actionKey);
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
      toast.error(homeCopy.page.missingQuickLogContext);
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

      toast.success(homeCopy.page.quickLogSuccess(actionKey));
      await loadHome();
    } catch (error) {
      console.error("Save Home quick log error:", error);
      toast.error(error instanceof Error ? error.message : homeCopy.page.quickLogError);
    } finally {
      setQuickLogSaving(false);
    }
  };

  return (
    <AppLayout
      shell={{
        subtitle: loading ? homeCopy.page.loadingStateSentence : commandCenter.stateSentence,
      }}
    >
      <div className="home-canvas min-h-screen">
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-3 lg:px-8 lg:pb-10 lg:pt-4">
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            <ScrollReveal>
              <HomeHeader
                stateSentence={
                  loading ? homeCopy.page.loadingStateSentence : commandCenter.stateSentence
                }
                displayName={commandCenter.greetingName}
                currentStats={commandCenter.currentStats}
                onOpenSettings={() => navigate("/settings")}
                onStartBatch={() => navigate("/new-batch")}
                onViewBatches={() => navigate("/batches")}
              />
            </ScrollReveal>

            <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
              <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                <ScrollReveal delay={0.08}>
                  <HomePrimaryFocusCard
                    primaryFocus={commandCenter.primaryFocus}
                    quickActions={commandCenter.quickActions}
                    onOpenQuickLog={handlePrimaryQuickLog}
                  />
                </ScrollReveal>

                <ScrollReveal delay={0.12}>
                  <HomeTodayQueue items={commandCenter.attentionList} />
                </ScrollReveal>
              </div>

              <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                <ScrollReveal delay={0.04}>
                  <HomeStatsGrid stats={commandCenter.lifetimeStats} />
                </ScrollReveal>

                {loading ? (
                  <section className="home-panel-surface px-4 py-6 text-center sm:px-5 sm:py-8">
                    <p className="text-sm text-muted-foreground">{homeCopy.page.loadingPanel}</p>
                  </section>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                    <ScrollReveal delay={0.18}>
                      <HomeRecentMovement items={commandCenter.recentActivityMini} />
                    </ScrollReveal>

                    <ScrollReveal delay={0.22}>
                      <HomeSupportPanel context={commandCenter.supportContext} />
                    </ScrollReveal>
                  </div>
                )}
              </div>
            </div>

            <HomeQuickLogDock
              actions={commandCenter.quickActions}
              batches={batches.filter((batch) => batch.status === "active")}
              saving={quickLogSaving}
              requestedActionKey={requestedQuickLogAction}
              onRequestedActionHandled={() => setRequestedQuickLogAction(null)}
              onSubmit={handleQuickLogSubmit}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
