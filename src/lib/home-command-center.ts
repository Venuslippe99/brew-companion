import type { Tables } from "@/integrations/supabase/types";
import { getDayNumber, type KombuchaBatch } from "@/lib/batches";
import {
  buildTodayActionItems,
  type TodayActionItem,
  type TodayActionReminder,
  type TodayActionSectionKey,
} from "@/lib/today-actions";

type HomeLaneKey = "now" | "next_up" | "recently_moved";
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
      kind: "quiet";
      eyebrow: string;
      title: string;
      summary: string;
      tone: HomeTone;
      item: TodayActionItem;
      reasonLabel: string;
      explanation: string;
      primaryAction: { label: string; to: string };
      secondaryAction: { label: string; quickLogMode: HomeQuickLogActionKey };
    }
  | {
      kind: "batch";
      eyebrow: string;
      title: string;
      summary: string;
      tone: HomeTone;
      item: TodayActionItem;
      reasonLabel: string;
      explanation: string;
      primaryAction: { label: string; to: string };
      secondaryAction:
        | { label: string; quickLogMode: HomeQuickLogActionKey }
        | { label: string; to: string };
    };

export type HomeSnapshotStat = {
  key: "active" | "attention" | "window" | "movement";
  label: string;
  value: number;
  description: string;
  targetId: string;
};

export type HomeActionLane = {
  key: HomeLaneKey;
  title: string;
  description: string;
  items: TodayActionItem[];
};

export type HomeRosterItem = {
  batch: KombuchaBatch;
  dayNumber: number;
  statusLine: string;
  linkTo: string;
  tone: HomeTone;
};

export type HomeRecentMovementItem = {
  id: string;
  batchId: string;
  batchName: string;
  eventAt: string;
  title: string;
  summary: string;
  linkTo: string;
};

export type HomeSupportContext = {
  eyebrow: string;
  title: string;
  summary: string;
  primaryAction: { label: string; to: string };
  secondaryAction?: { label: string; to: string };
};

export type HomeCommandCenter = {
  activeBatchCount: number;
  greetingName?: string;
  stateSentence: string;
  primaryFocus: HomePrimaryFocus;
  snapshotStats: HomeSnapshotStat[];
  actionLanes: HomeActionLane[];
  activeRoster: HomeRosterItem[];
  quickLogActions: HomeQuickLogAction[];
  recentMovement: HomeRecentMovementItem[];
  supportContext: HomeSupportContext;
};

type HomeTimelineRow = Pick<
  Tables<"batch_timeline_view">,
  "id" | "batch_id" | "event_type" | "event_at" | "title" | "subtitle" | "payload"
>;

const SECTION_PRIORITY: Record<TodayActionSectionKey, number> = {
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

const LANE_META: Record<HomeLaneKey, { title: string; description: string }> = {
  now: {
    title: "Now",
    description: "These brews have the clearest reason to check or act today.",
  },
  next_up: {
    title: "Next up",
    description: "Keep these batches in sight as their next useful window gets closer.",
  },
  recently_moved: {
    title: "Recently moved",
    description: "Recent updates across your brews, without letting calmer batches disappear.",
  },
};

function formatTodayDate(now: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
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
  if (sectionDiff !== 0) {
    return sectionDiff;
  }

  const reminderUrgencyLeft = left.topReminderUrgency === "overdue" ? 0 : left.topReminderUrgency === "high" ? 1 : 2;
  const reminderUrgencyRight = right.topReminderUrgency === "overdue" ? 0 : right.topReminderUrgency === "high" ? 1 : 2;
  if (reminderUrgencyLeft !== reminderUrgencyRight) {
    return reminderUrgencyLeft - reminderUrgencyRight;
  }

  const cautionDiff = CAUTION_PRIORITY[left.cautionLevel] - CAUTION_PRIORITY[right.cautionLevel];
  if (cautionDiff !== 0) {
    return cautionDiff;
  }

  if (left.topReminderDueAt && right.topReminderDueAt) {
    const reminderDiff =
      new Date(left.topReminderDueAt).getTime() - new Date(right.topReminderDueAt).getTime();
    if (reminderDiff !== 0) {
      return reminderDiff;
    }
  } else if (left.topReminderDueAt || right.topReminderDueAt) {
    return left.topReminderDueAt ? -1 : 1;
  }

  if (left.timingStatus && right.timingStatus) {
    const timingDiff = TIMING_PRIORITY[left.timingStatus] - TIMING_PRIORITY[right.timingStatus];
    if (timingDiff !== 0) {
      return timingDiff;
    }
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
            : "This batch is past its expected window, so it deserves a calmer, closer check now.",
        tone: "urgent" as const,
      };
    case "do_now":
      return {
        label: "Action today",
        explanation:
          "There is a clear next step waiting today, so Home is surfacing this batch before quieter work.",
        tone: "warm" as const,
      };
    case "ready_now":
      return {
        label: "Worth checking now",
        explanation:
          "This batch is in a likely tasting or carbonation window, so it is a good candidate for today's hands-on check.",
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
          "This batch changed recently, so it is the best anchor for a calm day without forcing urgency.",
        tone: "calm" as const,
      };
  }
}

function getQuickLogModeForItem(item: TodayActionItem): HomeQuickLogActionKey {
  if (["f1_active", "f1_check_window", "f1_extended"].includes(item.batch.currentStage)) {
    return "taste_test";
  }

  if (["f2_active", "refrigerate_now", "chilled_ready"].includes(item.batch.currentStage)) {
    return "carbonation_check";
  }

  return "note_only";
}

function getStateSentence(args: {
  activeBatchCount: number;
  nowCount: number;
  readyWindowCount: number;
  recentMovementCount: number;
}) {
  const { activeBatchCount, nowCount, readyWindowCount, recentMovementCount } = args;

  if (activeBatchCount === 0) {
    return "Ready to start your next brew?";
  }

  if (nowCount > 0) {
    return `${nowCount} brew${nowCount === 1 ? "" : "s"} need${nowCount === 1 ? "s" : ""} attention today`;
  }

  if (readyWindowCount > 0) {
    return `${readyWindowCount} batch${readyWindowCount === 1 ? "" : "es"} ${readyWindowCount === 1 ? "is" : "are"} in tasting or carbonation range`;
  }

  if (recentMovementCount > 0) {
    return "Your brews look calm today";
  }

  return "Everything looks steady right now";
}

function buildActionLanes(items: TodayActionItem[]) {
  const grouped: Record<HomeLaneKey, TodayActionItem[]> = {
    now: [],
    next_up: [],
    recently_moved: [],
  };

  items.forEach((item) => {
    if (["overdue", "do_now", "ready_now"].includes(item.section)) {
      grouped.now.push(item);
      return;
    }

    if (item.section === "check_soon") {
      grouped.next_up.push(item);
      return;
    }

    grouped.recently_moved.push(item);
  });

  return (Object.keys(grouped) as HomeLaneKey[])
    .map((key) => ({
      key,
      title: LANE_META[key].title,
      description: LANE_META[key].description,
      items: grouped[key].sort(sortActionItems),
    }))
    .filter((lane) => lane.items.length > 0);
}

function buildRoster(items: TodayActionItem[], activeBatches: KombuchaBatch[]) {
  const itemByBatchId = new Map(items.map((item) => [item.batch.id, item]));

  return [...activeBatches]
    .sort((left, right) => {
      const leftItem = itemByBatchId.get(left.id);
      const rightItem = itemByBatchId.get(right.id);

      if (leftItem && rightItem) {
        return sortActionItems(leftItem, rightItem);
      }

      if (leftItem || rightItem) {
        return leftItem ? -1 : 1;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })
    .map((batch) => {
      const item = itemByBatchId.get(batch.id);
      const tone = item
        ? getFocusReason(item).tone
        : "calm";

      return {
        batch,
        dayNumber: getDayNumber(batch.brewStartedAt),
        statusLine: item?.secondarySummary || item?.nextAction || batch.nextAction || "No next action yet",
        linkTo: `/batch/${batch.id}`,
        tone,
      } satisfies HomeRosterItem;
    });
}

function buildMovementItems(args: {
  rows: HomeTimelineRow[];
  batchNameById: Map<string, string>;
  now: Date;
}) {
  const { rows, batchNameById, now } = args;

  const getTitle = (row: HomeTimelineRow, batchName: string) => {
    switch (row.event_type) {
      case "stage_event":
        return `${batchName} changed stage`;
      case "log":
        if (row.title === "taste_test") return `${batchName} got a taste check`;
        if (row.title === "carbonation_check") return `${batchName} got a carbonation check`;
        if (row.title === "temp_check") return `${batchName} got a temperature check`;
        if (row.title === "note_only") return `${batchName} got a new note`;
        return `${batchName} got a fresh update`;
      case "reminder_completed":
        return `${batchName} checked off a reminder`;
      case "note":
        return `${batchName} got a journal note`;
      case "photo":
        return `${batchName} got a new photo`;
      default:
        return `${batchName} moved recently`;
    }
  };

  const getSummary = (row: HomeTimelineRow) => {
    const relative = row.event_at ? formatRelativeTime(row.event_at, now) : "recently";
    if (row.subtitle) {
      return `${row.subtitle} • ${relative}`;
    }

    return `Updated ${relative}`;
  };

  return rows
    .filter((row): row is HomeTimelineRow & { id: string; batch_id: string; event_at: string } => {
      return !!row.id && !!row.batch_id && !!row.event_at;
    })
    .map((row) => {
      const batchName = batchNameById.get(row.batch_id) || "This batch";

      return {
        id: row.id,
        batchId: row.batch_id,
        batchName,
        eventAt: row.event_at,
        title: getTitle(row, batchName),
        summary: getSummary(row),
        linkTo: `/batch/${row.batch_id}`,
      } satisfies HomeRecentMovementItem;
    });
}

function buildSupportContext(args: {
  primaryFocus: HomePrimaryFocus;
  primaryItem?: TodayActionItem;
  isBeginner: boolean;
}) {
  const { primaryFocus, primaryItem, isBeginner } = args;

  if (primaryFocus.kind === "empty") {
    return {
      eyebrow: "Getting started",
      title: "Start with a calmer first brew",
      summary:
        "Use the beginner-friendly guides to refresh the basics, then start a new batch when you are ready.",
      primaryAction: { label: "Browse guides", to: "/guides" },
      secondaryAction: { label: "Open assistant", to: "/assistant" },
    } satisfies HomeSupportContext;
  }

  if (primaryItem?.batch.currentStage === "refrigerate_now") {
    return {
      eyebrow: "Pressure guidance",
      title: "Need a cautious check on bottle pressure?",
      summary:
        "Use the assistant if the bottles feel harder than expected or if you want safer, step-by-step refrigeration guidance.",
      primaryAction: {
        label: "Open assistant",
        to: `/assistant?issue=too_much_carbonation&batchId=${primaryItem.batch.id}`,
      },
      secondaryAction: { label: "Read pressure safety", to: "/guides/carbonation-pressure" },
    } satisfies HomeSupportContext;
  }

  if (
    primaryItem &&
    ["f1_active", "f1_check_window", "f1_extended"].includes(primaryItem.batch.currentStage) &&
    ["ready_now", "overdue", "do_now"].includes(primaryItem.section)
  ) {
    return {
      eyebrow: "Tasting help",
      title: "Want help judging whether F1 is ready?",
      summary:
        "Use the tasting guide or assistant flow to decide whether to keep fermenting or move toward F2 without guessing.",
      primaryAction: {
        label: "Read tasting guide",
        to: "/guides/f1-tasting",
      },
      secondaryAction: {
        label: "Open assistant",
        to: `/assistant?issue=not_sure_if_ready&batchId=${primaryItem.batch.id}`,
      },
    } satisfies HomeSupportContext;
  }

  if (primaryItem && ["f2_active", "chilled_ready"].includes(primaryItem.batch.currentStage)) {
    return {
      eyebrow: "Carbonation help",
      title: "Use calmer checks during F2",
      summary:
        "If you are not sure whether carbonation is right yet, compare your batch against the F2 guidance before opening more bottles.",
      primaryAction: {
        label: "Read carbonation guide",
        to: "/guides/carbonation-pressure",
      },
      secondaryAction: {
        label: "Open assistant",
        to: `/assistant?issue=not_sure_if_ready&batchId=${primaryItem.batch.id}`,
      },
    } satisfies HomeSupportContext;
  }

  if (isBeginner) {
    return {
      eyebrow: "Beginner support",
      title: "Keep your next check simple",
      summary:
        "If the day feels calm, use this time to review the basics and keep your brewing notes up to date.",
      primaryAction: { label: "Browse guides", to: "/guides" },
      secondaryAction: { label: "Open assistant", to: "/assistant" },
    } satisfies HomeSupportContext;
  }

  return {
    eyebrow: "Support",
    title: "Need a second opinion?",
    summary:
      "Open the assistant for a cautious next-step check, or review the guide library if you want a slower read before acting.",
    primaryAction: { label: "Open assistant", to: "/assistant" },
    secondaryAction: { label: "Browse guides", to: "/guides" },
  } satisfies HomeSupportContext;
}

function buildQuickLogActions(args: {
  activeBatches: KombuchaBatch[];
  primaryBatchId?: string;
}) {
  const { activeBatches, primaryBatchId } = args;

  const actionDefinitions: Array<{
    key: HomeQuickLogActionKey;
    label: string;
    description: string;
    eligible: (batch: KombuchaBatch) => boolean;
  }> = [
    {
      key: "taste_test",
      label: "Taste test",
      description: "Capture a quick F1 taste impression without changing stage.",
      eligible: (batch) => ["f1_active", "f1_check_window", "f1_extended"].includes(batch.currentStage),
    },
    {
      key: "temp_check",
      label: "Temperature check",
      description: "Log the room temperature for any active batch.",
      eligible: () => true,
    },
    {
      key: "carbonation_check",
      label: "Carbonation check",
      description: "Track fizz checks for bottles already in or near F2.",
      eligible: (batch) => ["f2_active", "refrigerate_now", "chilled_ready"].includes(batch.currentStage),
    },
    {
      key: "note_only",
      label: "Add note",
      description: "Capture a practical observation while you are here.",
      eligible: () => true,
    },
  ];

  return actionDefinitions.map((definition) => {
    const eligibleBatchIds = activeBatches
      .filter(definition.eligible)
      .map((batch) => batch.id);

    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      eligibleBatchIds,
      preferredBatchId:
        primaryBatchId && eligibleBatchIds.includes(primaryBatchId)
          ? primaryBatchId
          : eligibleBatchIds[0],
    } satisfies HomeQuickLogAction;
  });
}

export function buildHomeCommandCenter(args: {
  batches: KombuchaBatch[];
  reminders: TodayActionReminder[];
  recentTimelineRows: HomeTimelineRow[];
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
  const actionLanes = buildActionLanes(actionItems);
  const batchNameById = new Map(args.batches.map((batch) => [batch.id, batch.name]));
  const recentMovement = buildMovementItems({
    rows: args.recentTimelineRows,
    batchNameById,
    now,
  }).slice(0, 6);
  const readyWindowCount = actionItems.filter((item) =>
    ["ready_now", "do_now"].includes(item.section)
  ).length;
  const nowCount = actionItems.filter((item) =>
    ["overdue", "do_now", "ready_now"].includes(item.section)
  ).length;
  const primaryItem = actionItems[0];

  let primaryFocus: HomePrimaryFocus;

  if (activeBatches.length === 0) {
    primaryFocus = {
      kind: "empty",
      eyebrow: "Welcome back",
      title: "Your command center is ready for the next brew",
      summary:
        "Start a first batch, revisit the basics, or open the assistant if you want a calmer refresher before brewing again.",
      tone: "calm",
      primaryAction: { label: "Start a batch", to: "/new-batch" },
      secondaryAction: { label: "Browse guides", to: "/guides" },
    };
  } else if (!primaryItem || nowCount === 0) {
    const quietAnchorBatch =
      primaryItem?.batch ||
      activeBatches
        .slice()
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0];

    const quietItem = quietAnchorBatch
      ? actionItems.find((item) => item.batch.id === quietAnchorBatch.id)
      : undefined;
    const quietViewItem = quietItem || primaryItem;

    primaryFocus = {
      kind: "quiet",
      eyebrow: "Quiet day",
      title: "Your brews look calm today",
      summary:
        quietViewItem?.timing?.guidance ||
        "Nothing looks urgent right now, so Home is keeping the next likely check and the wider roster close at hand.",
      tone: "calm",
      item: quietViewItem!,
      reasonLabel: quietViewItem ? getFocusReason(quietViewItem).label : "Calm brewing day",
      explanation:
        quietViewItem?.secondarySummary ||
        "Use the roster below to keep all active brews visible even when nothing needs immediate action.",
      primaryAction: {
        label: quietAnchorBatch ? "Open batch" : "View batches",
        to: quietAnchorBatch ? `/batch/${quietAnchorBatch.id}` : "/batches",
      },
      secondaryAction: { label: "Add note", quickLogMode: "note_only" },
    };
  } else {
    const focusReason = getFocusReason(primaryItem);
    const quickLogMode = getQuickLogModeForItem(primaryItem);

    primaryFocus = {
      kind: "batch",
      eyebrow: `Daily command center - ${formatTodayDate(now)}`,
      title: primaryItem.batch.name,
      summary: primaryItem.statusSummary,
      tone: focusReason.tone,
      item: primaryItem,
      reasonLabel: focusReason.label,
      explanation: focusReason.explanation,
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

  const snapshotStats: HomeSnapshotStat[] = [
    {
      key: "active",
      label: "Active brews",
      value: activeBatches.length,
      description: "See the full active roster",
      targetId: "home-roster",
    },
    {
      key: "attention",
      label: "Needs attention today",
      value: nowCount,
      description: "Jump to the Now lane",
      targetId: "home-lanes",
    },
    {
      key: "window",
      label: "In tasting or carbonation window",
      value: readyWindowCount,
      description: "See what is ready to check",
      targetId: "home-lanes",
    },
    {
      key: "movement",
      label: "Recent activity",
      value: recentMovement.length,
      description: "Read what changed recently",
      targetId: "home-movement",
    },
  ];

  const supportContext = buildSupportContext({
    primaryFocus,
    primaryItem,
    isBeginner: !!args.isBeginner,
  });

  return {
    activeBatchCount: activeBatches.length,
    greetingName: args.displayName?.trim() || undefined,
    stateSentence: getStateSentence({
      activeBatchCount: activeBatches.length,
      nowCount,
      readyWindowCount,
      recentMovementCount: recentMovement.length,
    }),
    primaryFocus,
    snapshotStats,
    actionLanes,
    activeRoster: buildRoster(actionItems, activeBatches),
    quickLogActions: buildQuickLogActions({
      activeBatches,
      primaryBatchId:
        primaryFocus.kind === "batch" || primaryFocus.kind === "quiet"
          ? primaryFocus.item.batch.id
          : undefined,
    }),
    recentMovement,
    supportContext,
  } satisfies HomeCommandCenter;
}
