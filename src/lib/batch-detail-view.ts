import { formatDistanceToNowStrict } from "date-fns";
import {
  getNextAction,
  type BatchCautionLevel,
  type BatchStage,
  type KombuchaBatch,
} from "@/lib/batches";
import type { BatchTimingResult } from "@/lib/batch-timing";
import type { LoadedF2Setup } from "@/lib/f2-current-setup";
import type { PhaseOutcomeRow } from "@/lib/phase-outcomes";

export type BatchSurface = "overview" | "journal" | "assistant";

export type BatchReminder = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  isCompleted: boolean;
  urgencyLevel: "low" | "medium" | "high" | "overdue";
};

export type BatchTimelineEntry = {
  id: string;
  eventAt: string;
  title: string;
  subtitle: string | null;
  source: "stage_event" | "log";
  logType?: string;
  fromStage?: BatchStage | null;
  toStage?: BatchStage | null;
  stageAtLog?: BatchStage | null;
  sourceHint?: string | null;
  structuredPayload?: Record<string, unknown> | null;
};

export type BatchJourneyChapter =
  | "first_fermentation"
  | "second_fermentation"
  | "finish_reflection";

type BatchHeroCopy = {
  eyebrow: string;
  title: string;
  summary: string;
  nextStepLabel: string;
  nextStepText: string;
  helperChips: string[];
};

const F1_STAGES: BatchStage[] = ["f1_active", "f1_check_window", "f1_extended"];
const F2_STAGES: BatchStage[] = ["f2_setup", "f2_active", "refrigerate_now"];
const FINISH_STAGES: BatchStage[] = [
  "chilled_ready",
  "completed",
  "archived",
  "discarded",
];

function formatRelativeUpdate(updatedAt: string) {
  return formatDistanceToNowStrict(new Date(updatedAt), { addSuffix: true });
}

export function getBatchJourneyChapter(
  stage: BatchStage
): BatchJourneyChapter {
  if (F1_STAGES.includes(stage)) {
    return "first_fermentation";
  }

  if (F2_STAGES.includes(stage)) {
    return "second_fermentation";
  }

  return "finish_reflection";
}

export function getJourneySteps(batch: KombuchaBatch) {
  const currentChapter = getBatchJourneyChapter(batch.currentStage);
  const order: BatchJourneyChapter[] = [
    "first_fermentation",
    "second_fermentation",
    "finish_reflection",
  ];
  const labels: Record<BatchJourneyChapter, string> = {
    first_fermentation: "First Fermentation",
    second_fermentation: "Second Fermentation",
    finish_reflection: "Finish & Reflection",
  };

  return order.map((chapter, index) => {
    const currentIndex = order.indexOf(currentChapter);
    return {
      chapter,
      label: labels[chapter],
      isCurrent: chapter === currentChapter,
      isComplete: index < currentIndex,
    };
  });
}

export function shouldCollapseChapterByDefault(
  batch: KombuchaBatch,
  chapter: BatchJourneyChapter
) {
  const order: BatchJourneyChapter[] = [
    "first_fermentation",
    "second_fermentation",
    "finish_reflection",
  ];

  return (
    order.indexOf(chapter) < order.indexOf(getBatchJourneyChapter(batch.currentStage))
  );
}

export function getReminderTone(level: BatchReminder["urgencyLevel"]) {
  if (level === "overdue") {
    return {
      card: "border-caution/30 bg-caution-bg/50",
      pill: "bg-caution text-caution-foreground",
      label: "Overdue",
    };
  }

  if (level === "high") {
    return {
      card: "border-primary/20 bg-primary/5",
      pill: "bg-primary text-primary-foreground",
      label: "Today",
    };
  }

  if (level === "medium") {
    return {
      card: "border-border bg-card",
      pill: "bg-muted text-foreground",
      label: "Soon",
    };
  }

  return {
    card: "border-border bg-card",
    pill: "bg-muted text-muted-foreground",
    label: "Later",
  };
}

export function formatReminderDueText(dueAt: string) {
  return formatDistanceToNowStrict(new Date(dueAt), { addSuffix: true });
}

export function getHeroCopy(args: {
  batch: KombuchaBatch;
  timing: BatchTimingResult | null;
  reminders: BatchReminder[];
  currentF2Setup: LoadedF2Setup | null;
  f1Outcome?: PhaseOutcomeRow;
  f2Outcome?: PhaseOutcomeRow;
}): BatchHeroCopy {
  const { batch, timing, reminders, currentF2Setup, f1Outcome, f2Outcome } = args;
  const nextStepText = batch.nextAction || getNextAction(batch);
  const helperChips = [
    `${batch.avgRoomTempC}°C room`,
    batch.targetPreference.replace(/_/g, " "),
    `Updated ${formatRelativeUpdate(batch.updatedAt)}`,
  ];

  if (reminders.length > 0) {
    helperChips.unshift(
      `${reminders.length} reminder${reminders.length === 1 ? "" : "s"}`
    );
  }

  switch (batch.currentStage) {
    case "f1_active":
    case "f1_check_window":
    case "f1_extended":
      return {
        eyebrow: "First Fermentation",
        title:
          timing?.status === "ready" || timing?.status === "overdue"
            ? "Your brew is ready for a closer look"
            : "Your brew is settling into First Fermentation",
        summary:
          timing?.guidance ||
          "Keep an eye on the batch, let the acids build gently, and come back when it reaches its tasting window.",
        nextStepLabel: "What to do next",
        nextStepText,
        helperChips,
      };
    case "f2_setup":
      return {
        eyebrow: "Second Fermentation",
        title: "It is time to bottle and shape the next chapter",
        summary:
          "Your base kombucha is ready to move into Second Fermentation. Review the flavour plan, bottle setup, and safety cues before you start.",
        nextStepLabel: "What to do next",
        nextStepText,
        helperChips,
      };
    case "f2_active":
      return {
        eyebrow: "Second Fermentation",
        title: "Your bottles are building fizz",
        summary:
          timing?.guidance ||
          "Second Fermentation is active now. Check pressure carefully, taste through one tester bottle, and chill once the carbonation feels right.",
        nextStepLabel: "What to do next",
        nextStepText,
        helperChips: currentF2Setup
          ? [`${currentF2Setup.bottleCount} bottles`, ...helperChips]
          : helperChips,
      };
    case "refrigerate_now":
      return {
        eyebrow: "Finish & Reflection",
        title: "This batch wants to be chilled now",
        summary:
          "Your bottles are likely at the end of their room-temperature window. Moving them to the fridge now will slow pressure and lock in the flavour you have built.",
        nextStepLabel: "What to do next",
        nextStepText,
        helperChips: currentF2Setup
          ? [`${currentF2Setup.desiredCarbonationLevel} fizz target`, ...helperChips]
          : helperChips,
      };
    case "chilled_ready":
      return {
        eyebrow: "Finish & Reflection",
        title: "Your brew is chilled and ready to enjoy",
        summary:
          "The active fermentation work is done. This is the right moment to taste, decide how it turned out, and capture what you would change next time.",
        nextStepLabel: "What to do next",
        nextStepText,
        helperChips,
      };
    case "completed":
    case "archived":
      return {
        eyebrow: "Reflection",
        title: "This brewing journey is ready to look back on",
        summary:
          f2Outcome?.note ||
          f1Outcome?.note ||
          "Review how both phases turned out, keep the useful learnings, and use them when you brew this batch again.",
        nextStepLabel: "What to do next",
        nextStepText,
        helperChips,
      };
    case "discarded":
      return {
        eyebrow: "Reflection",
        title: "This batch has been set aside",
        summary:
          "Keep the record for context, note what happened, and use the Journal to preserve any learning that helps future batches.",
        nextStepLabel: "What to do next",
        nextStepText,
        helperChips,
      };
    default:
      return {
        eyebrow: "Brewing journey",
        title: batch.name,
        summary: "Review the current stage, the next step, and what has happened so far.",
        nextStepLabel: "What to do next",
        nextStepText,
        helperChips,
      };
  }
}

export function getCurrentPhaseLabel(stage: BatchStage) {
  if (F1_STAGES.includes(stage)) {
    return "First Fermentation";
  }

  if (F2_STAGES.includes(stage)) {
    return "Second Fermentation";
  }

  if (FINISH_STAGES.includes(stage)) {
    return "Finish & Reflection";
  }

  return "Brewing journey";
}

export function getStageTone(level: BatchCautionLevel) {
  if (level === "high") {
    return "border-caution/30 bg-caution-bg/30";
  }

  if (level === "moderate") {
    return "border-primary/15 bg-primary/5";
  }

  return "border-border bg-card";
}

export function getPhaseSummaryChips(args: {
  batch: KombuchaBatch;
  currentF2Setup: LoadedF2Setup | null;
}) {
  const { batch, currentF2Setup } = args;

  if (F1_STAGES.includes(batch.currentStage)) {
    return [
      `${(batch.totalVolumeMl / 1000).toFixed(1)}L batch`,
      `${batch.sugarG}g sugar`,
      `${batch.starterLiquidMl}ml starter`,
    ];
  }

  if (currentF2Setup) {
    return [
      `${currentF2Setup.bottleCount} bottles`,
      `${currentF2Setup.desiredCarbonationLevel} carbonation`,
      `${currentF2Setup.ambientTempC}°C room`,
    ];
  }

  return [
    `${(batch.totalVolumeMl / 1000).toFixed(1)}L batch`,
    batch.teaType,
    batch.vesselType,
  ];
}
