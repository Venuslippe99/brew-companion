import type { Tables } from "@/integrations/supabase/types";
import { getDayNumber, type KombuchaBatch } from "@/lib/batches";
import {
  buildTodayActionItems,
  type TodayActionItem,
  type TodayActionReminder,
} from "@/lib/today-actions";

type HomeTone = "urgent" | "warm" | "calm";
type HomeQuickLogActionKey =
  | "taste_test"
  | "temp_check"
  | "carbonation_check"
  | "note_only";

export type HomeQuickLogAction = {
  key: HomeQuickLogActionKey;
  label: string;
  description: string;
  eligibleBatchIds: string[];
  preferredBatchId?: string;
};

export type HomeCurrentStat = {
  key: "active" | "f1" | "f2" | "attention";
  label: string;
  value: number;
  helper: string;
};

export type HomeLifetimeStat = {
  key: "brewed" | "bottles" | "completed" | "total";
  label: string;
  value: string;
  helper: string;
};

export type HomePrimaryFocus =
  | {
      kind: "empty";
      eyebrow: string;
      title: string;
      summary: string;
      tone: HomeTone;
      primaryAction: { label: string; to: string };
      secondaryAction: { label: string; to: string };
    }
  | {
      kind: "batch";
      eyebrow: string;
      title: string;
      summary: string;
      tone: HomeTone;
      batch: KombuchaBatch;
      reasonLabel: string;
      explanation: string;
      statusLine: string;
      primaryAction: { label: string; to: string };
      secondaryAction:
        | { label: string; quickLogMode: HomeQuickLogActionKey }
        | { label: string; to: string };
    };

export type HomeAttentionItem = {
  batch: KombuchaBatch;
  reasonLabel: string;
  statusSummary: string;
  secondarySummary: string;
  linkTo: string;
  tone: HomeTone;
};

export type HomeRecentActivityMiniItem = {
  id: string;
  batchName: string;
  title: string;
  summary: string;
  linkTo: string;
};

export type HomeSupportContext = {
  title: string;
  summary: string;
  primaryAction: { label: string; to: string };
  secondaryAction?: { label: string; to: string };
};

export type HomeCommandCenter = {
  activeBatchCount: number;
  greetingName?: string;
  stateSentence: string;
  currentStats: HomeCurrentStat[];
  lifetimeStats: HomeLifetimeStat[];
  primaryFocus: HomePrimaryFocus;
  attentionList: HomeAttentionItem[];
  quickActions: HomeQuickLogAction[];
  recentActivityMini: HomeRecentActivityMiniItem[];
  supportContext: HomeSupportContext;
};

type HomeTimelineRow = Pick<
  Tables<"batch_timeline_view">,
  "id" | "batch_id" | "event_type" | "event_at" | "title" | "subtitle" | "payload"
>;

const F1_STAGES = new Set<KombuchaBatch["currentStage"]>([
  "f1_active",
  "f1_check_window",
  "f1_extended",
]);

const F2_STAGES = new Set<KombuchaBatch["currentStage"]>([
  "f2_setup",
  "f2_active",
  "refrigerate_now",
  "chilled_ready",
]);

const SECTION_PRIORITY: Record<TodayActionItem["section"], number> = {
  overdue: 0,
  do_now: 1,
  ready_now: 2,
  check_soon: 3,
  recently_updated: 4,
};

const CAUTION_PRIORITY: Record<KombuchaBatch["cautionLevel"], number> = {
  high: 0,
  moderate: 1,
  low: 2,
  none: 3,
};

const TIMING_PRIORITY: Record<NonNullable<TodayActionItem["timingStatus"]>, number> = {
  overdue: 0,
  ready: 1,
  approaching: 2,
  too_early: 3,
};

function formatLiters(totalMl: number) {
  return `${(totalMl / 1000).toFixed(1)} L`;
}

function formatRelativeTime(value: string, now: Date) {
  const diffMs = new Date(value).getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const hours = Math.round(absMs / (1000 * 60 * 60));
  const days = Math.round(absMs / (1000 * 60 * 60 * 24));

  if (hours < 24) {
    if (hours <= 1) {
      return diffMs >= 0 ? "in about 1 hour" : "about 1 hour ago";
    }

    return diffMs >= 0 ? `in ${hours} hours` : `${hours} hours ago`;
  }

  if (days <= 1) {
    return diffMs >= 0 ? "tomorrow" : "yesterday";
  }

  return diffMs >= 0 ? `in ${days} days` : `${days} days ago`;
}

function sortActionItems(left: TodayActionItem, right: TodayActionItem) {
  const sectionDiff = SECTION_PRIORITY[left.section] - SECTION_PRIORITY[right.section];
  if (sectionDiff !== 0) return sectionDiff;

  const reminderUrgencyLeft =
    left.topReminderUrgency === "overdue" ? 0 : left.topReminderUrgency === "high" ? 1 : 2;
  const reminderUrgencyRight =
    right.topReminderUrgency === "overdue" ? 0 : right.topReminderUrgency === "high" ? 1 : 2;
  if (reminderUrgencyLeft !== reminderUrgencyRight) {
    return reminderUrgencyLeft - reminderUrgencyRight;
  }

  const cautionDiff = CAUTION_PRIORITY[left.cautionLevel] - CAUTION_PRIORITY[right.cautionLevel];
  if (cautionDiff !== 0) return cautionDiff;

  if (left.topReminderDueAt && right.topReminderDueAt) {
    const reminderDiff =
      new Date(left.topReminderDueAt).getTime() - new Date(right.topReminderDueAt).getTime();
    if (reminderDiff !== 0) return reminderDiff;
  } else if (left.topReminderDueAt || right.topReminderDueAt) {
    return left.topReminderDueAt ? -1 : 1;
  }

  if (left.timingStatus && right.timingStatus) {
    const timingDiff = TIMING_PRIORITY[left.timingStatus] - TIMING_PRIORITY[right.timingStatus];
    if (timingDiff !== 0) return timingDiff;
  } else if (left.timingStatus || right.timingStatus) {
    return left.timingStatus ? -1 : 1;
  }

  return new Date(right.batch.updatedAt).getTime() - new Date(left.batch.updatedAt).getTime();
}

function getFocusReason(item: TodayActionItem) {
  switch (item.section) {
    case "overdue":
      return {
        label: "Needs attention now",
        explanation:
          item.topReminderUrgency === "overdue"
            ? "A reminder has slipped past its planned time, so this batch should come first."
            : "This batch is past its expected window, so it deserves a closer check now.",
        tone: "urgent" as const,
      };
    case "do_now":
      return {
        label: "Action today",
        explanation:
          "There is a clear next step waiting today, so this batch belongs at the top of the page.",
        tone: "warm" as const,
      };
    case "ready_now":
      return {
        label: "Worth checking now",
        explanation:
          "This batch is in a likely tasting or carbonation window, so it is a strong candidate for today's hands-on check.",
        tone: "warm" as const,
      };
    case "check_soon":
      return {
        label: "Coming up next",
        explanation:
          "Nothing looks urgent yet, but this batch is approaching its next useful check window.",
        tone: "calm" as const,
      };
    case "recently_updated":
      return {
        label: "Recently moved",
        explanation:
          "This batch changed recently, so it is a calm anchor when nothing else needs urgent attention.",
        tone: "calm" as const,
      };
  }
}

function getQuickLogModeForItem(item: TodayActionItem): HomeQuickLogActionKey {
  if (F1_STAGES.has(item.batch.currentStage)) {
    return "taste_test";
  }

  if (F2_STAGES.has(item.batch.currentStage) && item.batch.currentStage !== "f2_setup") {
    return "carbonation_check";
  }

  return "note_only";
}

function getStateSentence(args: {
  activeBatchCount: number;
  attentionCount: number;
  f2Count: number;
}) {
  const { activeBatchCount, attentionCount, f2Count } = args;

  if (activeBatchCount === 0) {
    return "Nothing is brewing right now.";
  }

  if (attentionCount > 0) {
    return `${attentionCount} brew${attentionCount === 1 ? "" : "s"} ${attentionCount === 1 ? "is" : "are"} worth checking today.`;
  }

  if (f2Count > 0) {
    return `${f2Count} batch${f2Count === 1 ? "" : "es"} ${f2Count === 1 ? "is" : "are"} already in the bottling chapter.`;
  }

  if (activeBatchCount === 1) {
    return "Your batch looks steady right now.";
  }

  return "Your brewing world looks steady right now.";
}

function buildCurrentStats(args: {
  activeBatches: KombuchaBatch[];
  attentionCount: number;
}) {
  const f1Count = args.activeBatches.filter((batch) => F1_STAGES.has(batch.currentStage)).length;
  const f2Count = args.activeBatches.filter((batch) => F2_STAGES.has(batch.currentStage)).length;

  return [
    {
      key: "active",
      label: "Active",
      value: args.activeBatches.length,
      helper: "Batches still in progress",
    },
    {
      key: "f1",
      label: "In F1",
      value: f1Count,
      helper: "Still in first fermentation",
    },
    {
      key: "f2",
      label: "In F2",
      value: f2Count,
      helper: "Already in bottling or bottle conditioning",
    },
    {
      key: "attention",
      label: "Needs attention today",
      value: args.attentionCount,
      helper: "Batches worth checking today",
    },
  ] satisfies HomeCurrentStat[];
}

function buildLifetimeStats(args: {
  batches: KombuchaBatch[];
  totalBottlesBottled: number;
}) {
  const brewedBatches = args.batches.filter((batch) => batch.status !== "discarded");
  const completedBatchCount = brewedBatches.filter((batch) =>
    batch.status === "completed" || batch.status === "archived"
  ).length;
  const totalBrewedMl = brewedBatches.reduce((sum, batch) => sum + batch.totalVolumeMl, 0);

  return [
    {
      key: "brewed",
      label: "Total kombucha brewed",
      value: formatLiters(totalBrewedMl),
      helper: "Sum of saved batch volume, shown in liters",
    },
    {
      key: "bottles",
      label: "Total bottles bottled",
      value: `${args.totalBottlesBottled}`,
      helper: "Count of saved bottles across F2 runs",
    },
    {
      key: "completed",
      label: "Completed batches",
      value: `${completedBatchCount}`,
      helper: "Completed or archived batches",
    },
    {
      key: "total",
      label: "Total batches brewed",
      value: `${brewedBatches.length}`,
      helper: "All saved batches except discarded ones",
    },
  ] satisfies HomeLifetimeStat[];
}

function buildRecentActivityMini(args: {
  rows: HomeTimelineRow[];
  batchNameById: Map<string, string>;
  now: Date;
}) {
  const getTitle = (row: HomeTimelineRow, batchName: string) => {
    switch (row.event_type) {
      case "stage_event":
        return `${batchName} changed stage`;
      case "log":
        if (row.title === "taste_test") return `${batchName} had a taste check`;
        if (row.title === "carbonation_check") return `${batchName} had a carbonation check`;
        if (row.title === "temp_check") return `${batchName} got a temperature reading`;
        if (row.title === "note_only") return `${batchName} got a note`;
        return `${batchName} was updated`;
      case "reminder_completed":
        return `${batchName} completed a reminder`;
      case "note":
        return `${batchName} got a journal entry`;
      case "photo":
        return `${batchName} got a photo`;
      default:
        return `${batchName} moved recently`;
    }
  };

  return args.rows
    .filter((row): row is HomeTimelineRow & { id: string; batch_id: string; event_at: string } => {
      return !!row.id && !!row.batch_id && !!row.event_at;
    })
    .slice(0, 3)
    .map((row) => {
      const batchName = args.batchNameById.get(row.batch_id) || "This batch";
      const relative = formatRelativeTime(row.event_at, args.now);

      return {
        id: row.id,
        batchName,
        title: getTitle(row, batchName),
        summary: row.subtitle ? `${row.subtitle} \u2022 ${relative}` : `Updated ${relative}`,
        linkTo: `/batch/${row.batch_id}`,
      } satisfies HomeRecentActivityMiniItem;
    });
}

function buildQuickActions(args: {
  activeBatches: KombuchaBatch[];
  primaryBatchId?: string;
}) {
  const actionDefinitions: Array<{
    key: HomeQuickLogActionKey;
    label: string;
    description: string;
    eligible: (batch: KombuchaBatch) => boolean;
  }> = [
    {
      key: "taste_test",
      label: "Taste test",
      description: "Save a quick taste note.",
      eligible: (batch) => F1_STAGES.has(batch.currentStage),
    },
    {
      key: "temp_check",
      label: "Temperature check",
      description: "Save the room temperature.",
      eligible: () => true,
    },
    {
      key: "carbonation_check",
      label: "Carbonation check",
      description: "Save a quick fizz or pressure note.",
      eligible: (batch) => F2_STAGES.has(batch.currentStage) && batch.currentStage !== "f2_setup",
    },
    {
      key: "note_only",
      label: "Add note",
      description: "Save a short brewing note.",
      eligible: () => true,
    },
  ];

  return actionDefinitions.map((definition) => {
    const eligibleBatchIds = args.activeBatches
      .filter(definition.eligible)
      .map((batch) => batch.id);

    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      eligibleBatchIds,
      preferredBatchId:
        args.primaryBatchId && eligibleBatchIds.includes(args.primaryBatchId)
          ? args.primaryBatchId
          : eligibleBatchIds[0],
    } satisfies HomeQuickLogAction;
  });
}

function buildSupportContext(args: {
  primaryItem?: TodayActionItem;
  hasActiveBatches: boolean;
  isBeginner: boolean;
}) {
  const { primaryItem, hasActiveBatches, isBeginner } = args;

  if (!hasActiveBatches) {
    return {
      title: "Want a calmer refresher before your next batch?",
      summary: "Open the guides or assistant if you want to reset the basics before brewing again.",
      primaryAction: { label: "Browse guides", to: "/guides" },
      secondaryAction: { label: "Open assistant", to: "/assistant" },
    } satisfies HomeSupportContext;
  }

  if (primaryItem?.batch.currentStage === "refrigerate_now") {
    return {
      title: "Need a cautious bottle-pressure check?",
      summary:
        "Use the assistant if the bottles feel harder than expected or if you want a steadier refrigeration decision.",
      primaryAction: {
        label: "Open assistant",
        to: `/assistant?issue=too_much_carbonation&batchId=${primaryItem.batch.id}`,
      },
      secondaryAction: { label: "Browse guides", to: "/guides" },
    } satisfies HomeSupportContext;
  }

  if (primaryItem && F1_STAGES.has(primaryItem.batch.currentStage)) {
    return {
      title: "Want help judging whether F1 is ready?",
      summary:
        "Use the guides or assistant if you want steadier support before you move a batch into bottling.",
      primaryAction: { label: "Browse guides", to: "/guides" },
      secondaryAction: {
        label: "Open assistant",
        to: `/assistant?issue=not_sure_if_ready&batchId=${primaryItem.batch.id}`,
      },
    } satisfies HomeSupportContext;
  }

  if (isBeginner) {
    return {
      title: "Want a little extra support today?",
      summary: "Keep the basics close when the day feels calm or you are not sure what to check next.",
      primaryAction: { label: "Browse guides", to: "/guides" },
      secondaryAction: { label: "Open assistant", to: "/assistant" },
    } satisfies HomeSupportContext;
  }

  return {
    title: "Need a second opinion?",
    summary: "Open the assistant for a cautious next-step check, or dip into the guides for a slower read.",
    primaryAction: { label: "Open assistant", to: "/assistant" },
    secondaryAction: { label: "Browse guides", to: "/guides" },
  } satisfies HomeSupportContext;
}

export function buildHomeCommandCenter(args: {
  batches: KombuchaBatch[];
  reminders: TodayActionReminder[];
  recentTimelineRows: HomeTimelineRow[];
  totalBottlesBottled: number;
  now?: Date;
  displayName?: string;
  isBeginner?: boolean;
}) {
  const now = args.now ?? new Date();
  const activeBatches = args.batches.filter((batch) => batch.status === "active");
  const actionItems = buildTodayActionItems({
    batches: args.batches,
    reminders: args.reminders,
    now,
  }).sort(sortActionItems);
  const attentionCount = actionItems.filter((item) =>
    ["overdue", "do_now", "ready_now"].includes(item.section)
  ).length;
  const primaryItem =
    actionItems[0] ||
    activeBatches
      .slice()
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .map((batch) => actionItems.find((item) => item.batch.id === batch.id))
      .find(Boolean);
  const batchNameById = new Map(args.batches.map((batch) => [batch.id, batch.name]));

  let primaryFocus: HomePrimaryFocus;

  if (!primaryItem) {
    primaryFocus = {
      kind: "empty",
      eyebrow: "Brewing overview",
      title: "Nothing is brewing right now",
      summary:
        "Start a fresh batch, revisit the basics, or open the guides if you want a calmer reset before brewing again.",
      tone: "calm",
      primaryAction: { label: "Start batch", to: "/new-batch" },
      secondaryAction: { label: "Browse guides", to: "/guides" },
    };
  } else {
    const focusReason = getFocusReason(primaryItem);
    const quickLogMode = getQuickLogModeForItem(primaryItem);
    const isAttentionNow = ["overdue", "do_now", "ready_now"].includes(primaryItem.section);

    primaryFocus = {
      kind: "batch",
      eyebrow: isAttentionNow ? "Primary focus" : "Calm next check",
      title: primaryItem.batch.name,
      summary: primaryItem.statusSummary,
      tone: focusReason.tone,
      batch: primaryItem.batch,
      reasonLabel: focusReason.label,
      explanation: focusReason.explanation,
      statusLine: primaryItem.secondarySummary,
      primaryAction: { label: "Open batch", to: primaryItem.linkTo },
      secondaryAction:
        primaryItem.batch.currentStage === "refrigerate_now" && primaryItem.cautionLevel === "high"
          ? {
              label: "Get help",
              to: `/assistant?issue=too_much_carbonation&batchId=${primaryItem.batch.id}`,
            }
          : {
              label:
                quickLogMode === "taste_test"
                  ? "Log taste test"
                  : quickLogMode === "carbonation_check"
                    ? "Log carbonation check"
                    : "Add note",
              quickLogMode,
            },
    };
  }

  const attentionList = actionItems
    .filter((item) => item.batch.id !== (primaryFocus.kind === "batch" ? primaryFocus.batch.id : null))
    .slice(0, 3)
    .map((item) => {
      const focusReason = getFocusReason(item);
      return {
        batch: item.batch,
        reasonLabel: focusReason.label,
        statusSummary: item.statusSummary,
        secondarySummary: item.secondarySummary,
        linkTo: item.linkTo,
        tone: focusReason.tone,
      } satisfies HomeAttentionItem;
    });

  const currentStats = buildCurrentStats({
    activeBatches,
    attentionCount,
  });

  const lifetimeStats = buildLifetimeStats({
    batches: args.batches,
    totalBottlesBottled: args.totalBottlesBottled,
  });

  return {
    activeBatchCount: activeBatches.length,
    greetingName: args.displayName?.trim() || undefined,
    stateSentence: getStateSentence({
      activeBatchCount: activeBatches.length,
      attentionCount,
      f2Count: currentStats.find((stat) => stat.key === "f2")?.value || 0,
    }),
    currentStats,
    lifetimeStats,
    primaryFocus,
    attentionList,
    quickActions: buildQuickActions({
      activeBatches,
      primaryBatchId: primaryFocus.kind === "batch" ? primaryFocus.batch.id : undefined,
    }),
    recentActivityMini: buildRecentActivityMini({
      rows: args.recentTimelineRows,
      batchNameById,
      now,
    }),
    supportContext: buildSupportContext({
      primaryItem,
      hasActiveBatches: activeBatches.length > 0,
      isBeginner: !!args.isBeginner,
    }),
  } satisfies HomeCommandCenter;
}

export function getHomeBatchDayNumber(batch: KombuchaBatch) {
  return getDayNumber(batch.brewStartedAt);
}
