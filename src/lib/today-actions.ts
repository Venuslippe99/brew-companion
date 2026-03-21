import {
  getNextAction,
  getStageLabel,
  type BatchCautionLevel,
  type BatchStage,
  type KombuchaBatch,
} from "@/lib/batches";
import {
  getBatchStageTiming,
  type BatchTimingResult,
  type BatchTimingStatus,
} from "@/lib/batch-timing";

export type TodayActionReminder = {
  id: string;
  batchId: string;
  title: string;
  description?: string | null;
  dueAt: string;
  urgencyLevel: "low" | "medium" | "high" | "overdue";
  reminderType: string;
};

export type TodayActionSectionKey =
  | "overdue"
  | "do_now"
  | "ready_now"
  | "check_soon"
  | "recently_updated";

export type TodayActionItem = {
  batch: KombuchaBatch;
  currentStageLabel: string;
  nextAction: string;
  timing: BatchTimingResult | null;
  section: TodayActionSectionKey;
  statusSummary: string;
  secondarySummary: string;
  attentionLabel?: string;
  cautionLevel: BatchCautionLevel;
  linkTo: string;
};

export type TodayActionSection = {
  key: TodayActionSectionKey;
  title: string;
  description: string;
  items: TodayActionItem[];
};

const SECTION_ORDER: TodayActionSectionKey[] = [
  "overdue",
  "do_now",
  "ready_now",
  "check_soon",
  "recently_updated",
];

const ACTIVE_STAGES = new Set<BatchStage>([
  "f1_active",
  "f1_check_window",
  "f1_extended",
  "f2_setup",
  "f2_active",
  "refrigerate_now",
  "chilled_ready",
]);

const SECTION_META: Record<
  TodayActionSectionKey,
  { title: string; description: string }
> = {
  overdue: {
    title: "Overdue",
    description: "These batches likely need attention right away.",
  },
  do_now: {
    title: "Do now",
    description: "These batches have a clear next step for today.",
  },
  ready_now: {
    title: "Ready now",
    description: "These batches are in a ready window and worth checking now.",
  },
  check_soon: {
    title: "Check soon",
    description: "These batches are approaching their next check window.",
  },
  recently_updated: {
    title: "Recently updated",
    description: "These batches changed recently but do not need action first.",
  },
};

function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDaysUntil(targetIso: string, now: Date) {
  const target = stripTime(new Date(targetIso));
  const today = stripTime(now);
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getReminderSummary(reminder: TodayActionReminder, now: Date) {
  const daysUntil = getDaysUntil(reminder.dueAt, now);

  if (daysUntil < 0) {
    return "Reminder overdue";
  }

  if (daysUntil === 0) {
    return "Reminder due today";
  }

  if (daysUntil === 1) {
    return "Reminder due tomorrow";
  }

  return `Reminder due in ${daysUntil} days`;
}

function getSectionForBatch(args: {
  batch: KombuchaBatch;
  timing: BatchTimingResult | null;
  reminders: TodayActionReminder[];
  now: Date;
}) {
  const { batch, timing, reminders, now } = args;

  const hasOverdueReminder = reminders.some((reminder) => reminder.urgencyLevel === "overdue");
  const hasDueTodayReminder = reminders.some(
    (reminder) => getDaysUntil(reminder.dueAt, now) === 0
  );
  const hasSoonReminder = reminders.some((reminder) => {
    const daysUntil = getDaysUntil(reminder.dueAt, now);
    return daysUntil > 0 && daysUntil <= 2;
  });
  const updatedRecently =
    now.getTime() - new Date(batch.updatedAt).getTime() <= 1000 * 60 * 60 * 24;

  if (hasOverdueReminder || timing?.status === "overdue") {
    return "overdue";
  }

  if (
    batch.currentStage === "refrigerate_now" ||
    batch.currentStage === "f2_setup" ||
    hasDueTodayReminder
  ) {
    return "do_now";
  }

  if (timing?.status === "ready" || batch.currentStage === "chilled_ready") {
    return "ready_now";
  }

  if (timing?.status === "approaching" || hasSoonReminder) {
    return "check_soon";
  }

  if (updatedRecently) {
    return "recently_updated";
  }

  return "check_soon";
}

function getAttentionLabel(args: {
  section: TodayActionSectionKey;
  reminders: TodayActionReminder[];
  timingStatus?: BatchTimingStatus;
}) {
  const { section, reminders, timingStatus } = args;

  if (section === "overdue") {
    if (reminders.some((reminder) => reminder.urgencyLevel === "overdue")) {
      return "Overdue reminder";
    }

    if (timingStatus === "overdue") {
      return "Past expected window";
    }
  }

  if (section === "do_now") {
    if (reminders.some((reminder) => reminder.urgencyLevel === "high")) {
      return "Needs attention";
    }

    return "Action today";
  }

  return undefined;
}

function getStatusSummary(args: {
  batch: KombuchaBatch;
  timing: BatchTimingResult | null;
  reminders: TodayActionReminder[];
  now: Date;
}) {
  const { batch, timing, reminders, now } = args;
  const topReminder = reminders[0];

  if (topReminder) {
    return topReminder.title;
  }

  if (timing) {
    return `${timing.stageLabel} Day ${timing.elapsedDays} - ${timing.statusLabel}`;
  }

  return getStageLabel(batch.currentStage);
}

function getSecondarySummary(args: {
  batch: KombuchaBatch;
  timing: BatchTimingResult | null;
  reminders: TodayActionReminder[];
  now: Date;
}) {
  const { batch, timing, reminders, now } = args;
  const topReminder = reminders[0];

  if (topReminder) {
    return getReminderSummary(topReminder, now);
  }

  if (timing) {
    return timing.nextCheckText;
  }

  return `Current stage: ${getStageLabel(batch.currentStage)}`;
}

export function buildTodayActionSections(args: {
  batches: KombuchaBatch[];
  reminders: TodayActionReminder[];
  now?: Date;
}): TodayActionSection[] {
  const now = args.now ?? new Date();
  const remindersByBatchId = new Map<string, TodayActionReminder[]>();

  args.reminders.forEach((reminder) => {
    const existing = remindersByBatchId.get(reminder.batchId);

    if (existing) {
      existing.push(reminder);
      return;
    }

    remindersByBatchId.set(reminder.batchId, [reminder]);
  });

  const items = args.batches
    .filter((batch) => batch.status === "active" && ACTIVE_STAGES.has(batch.currentStage))
    .map((batch) => {
      const batchReminders = [...(remindersByBatchId.get(batch.id) || [])].sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      );
      const timing = getBatchStageTiming({
        brew_started_at: batch.brewStartedAt,
        f2_started_at: batch.f2StartedAt,
        current_stage: batch.currentStage,
        avg_room_temp_c: batch.avgRoomTempC,
        target_preference: batch.targetPreference,
        starter_liquid_ml: batch.starterLiquidMl,
        total_volume_ml: batch.totalVolumeMl,
      });

      const section = getSectionForBatch({
        batch,
        timing,
        reminders: batchReminders,
        now,
      });

      return {
        batch,
        currentStageLabel: getStageLabel(batch.currentStage),
        nextAction: getNextAction(batch),
        timing,
        section,
        statusSummary: getStatusSummary({
          batch,
          timing,
          reminders: batchReminders,
          now,
        }),
        secondarySummary: getSecondarySummary({
          batch,
          timing,
          reminders: batchReminders,
          now,
        }),
        attentionLabel: getAttentionLabel({
          section,
          reminders: batchReminders,
          timingStatus: timing?.status,
        }),
        cautionLevel: batch.cautionLevel,
        linkTo: `/batch/${batch.id}`,
      } satisfies TodayActionItem;
    });

  return SECTION_ORDER.map((key) => {
    const sectionItems = items
      .filter((item) => item.section === key)
      .sort((a, b) => new Date(b.batch.updatedAt).getTime() - new Date(a.batch.updatedAt).getTime());

    return {
      key,
      title: SECTION_META[key].title,
      description: SECTION_META[key].description,
      items: sectionItems,
    };
  }).filter((section) => section.items.length > 0);
}
