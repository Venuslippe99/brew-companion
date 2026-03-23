import {
  getPhaseOutcomeLabel,
  type PhaseOutcomePhase,
} from "@/lib/phase-outcome-options";
import type { PhaseOutcomeRow } from "@/lib/phase-outcomes";
import type {
  BatchJourneyChapter,
  BatchTimelineEntry,
} from "@/lib/batch-detail-view";

export type BatchJournalEntryKind =
  | "stage_transition"
  | "taste_test"
  | "note"
  | "photo"
  | "reflection"
  | "f2_action"
  | "completion"
  | "system_event";

export type BatchJournalEntryView = {
  id: string;
  chapter: BatchJourneyChapter;
  kind: BatchJournalEntryKind;
  occurredAt: string;
  occurredAtLabel: string;
  beatLabel: string;
  title: string;
  body: string | null;
  sourceLabel: string;
  emphasis?: "default" | "highlight" | "reflection";
  tags?: string[];
};

export type BatchJournalRecap = {
  eyebrow: string;
  title: string;
  summary: string;
  timeframe: string | null;
  highlights: string[];
};

export type BatchJournalSection = {
  chapter: BatchJourneyChapter;
  title: string;
  description: string;
  recap: BatchJournalRecap;
  entries: BatchJournalEntryView[];
};

const chapterMeta: Record<
  BatchJourneyChapter,
  { title: string; description: string }
> = {
  first_fermentation: {
    title: "First Fermentation",
    description:
      "How the base brew settled in, what you checked, and when it felt ready for the next step.",
  },
  second_fermentation: {
    title: "Second Fermentation",
    description:
      "The bottling chapter, including carbonation checks, bottle decisions, and flavour follow-through.",
  },
  finish_reflection: {
    title: "Finish & Reflection",
    description:
      "How the batch was chilled, wrapped up, and remembered for the next brew.",
  },
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatEntryTimestamp(iso: string) {
  return dateTimeFormatter.format(new Date(iso));
}

function formatDateLabel(iso: string) {
  return dateFormatter.format(new Date(iso));
}

function getPayloadObject(entry: BatchTimelineEntry) {
  const payload = entry.structuredPayload;
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;
}

function getPayloadString(
  payload: Record<string, unknown> | null,
  key: string
) {
  return payload && typeof payload[key] === "string"
    ? (payload[key] as string)
    : undefined;
}

function getChapterForStage(stage?: string | null): BatchJourneyChapter {
  if (!stage) {
    return "first_fermentation";
  }

  if (["f1_active", "f1_check_window", "f1_extended"].includes(stage)) {
    return "first_fermentation";
  }

  if (["f2_setup", "f2_active", "refrigerate_now"].includes(stage)) {
    return "second_fermentation";
  }

  return "finish_reflection";
}

function getChapterForPhase(phase?: string): BatchJourneyChapter | null {
  if (phase === "f1") {
    return "first_fermentation";
  }

  if (phase === "f2") {
    return "finish_reflection";
  }

  return null;
}

function getChapterForLogType(logType?: string): BatchJourneyChapter {
  switch (logType) {
    case "taste_test":
    case "temp_check":
    case "ph_check":
    case "sweetness_check":
      return "first_fermentation";
    case "moved_to_f2":
    case "bottle_burped":
    case "carbonation_check":
      return "second_fermentation";
    case "refrigerated":
      return "finish_reflection";
    case "custom_action":
    case "note_only":
    case "photo_added":
    default:
      return "finish_reflection";
  }
}

function getChapterThresholds(entries: BatchTimelineEntry[]) {
  const secondChapterStart = entries
    .filter(
      (entry) =>
        entry.source === "stage_event" &&
        ["f2_setup", "f2_active", "refrigerate_now"].includes(entry.toStage || "")
    )
    .map((entry) => new Date(entry.eventAt).getTime())
    .sort((left, right) => left - right)[0];

  const finishChapterStart = entries
    .filter(
      (entry) =>
        entry.source === "stage_event" &&
        ["chilled_ready", "completed", "archived", "discarded"].includes(
          entry.toStage || ""
        )
    )
    .map((entry) => new Date(entry.eventAt).getTime())
    .sort((left, right) => left - right)[0];

  return {
    secondChapterStart,
    finishChapterStart,
  };
}

function inferChapterFromTimeline(
  entry: BatchTimelineEntry,
  thresholds: ReturnType<typeof getChapterThresholds>
): BatchJourneyChapter {
  if (entry.stageAtLog) {
    return getChapterForStage(entry.stageAtLog);
  }

  const payload = getPayloadObject(entry);
  const payloadPhase = getChapterForPhase(getPayloadString(payload, "phase"));
  if (payloadPhase) {
    return payloadPhase;
  }

  const toStage = getPayloadString(payload, "to_stage");
  if (toStage) {
    return getChapterForStage(toStage);
  }

  const fromStage = getPayloadString(payload, "from_stage");
  if (fromStage) {
    return getChapterForStage(fromStage);
  }

  const action = getPayloadString(payload, "action");
  if (action === "moved-to-fridge" || action === "mark-completed") {
    return "finish_reflection";
  }

  if (
    action === "checked-one-bottle" ||
    action === "needs-more-carbonation" ||
    action === "refrigerate-now" ||
    entry.sourceHint === "f2_setup_wizard" ||
    entry.sourceHint === "saved_f2_view"
  ) {
    return "second_fermentation";
  }

  const eventAtMs = new Date(entry.eventAt).getTime();
  if (
    typeof thresholds.finishChapterStart === "number" &&
    eventAtMs >= thresholds.finishChapterStart
  ) {
    return "finish_reflection";
  }

  if (
    typeof thresholds.secondChapterStart === "number" &&
    eventAtMs >= thresholds.secondChapterStart
  ) {
    return "second_fermentation";
  }

  return getChapterForLogType(entry.logType);
}

function getTasteImpressionLabel(value?: string) {
  switch (value) {
    case "still_sweet":
      return "still sweet";
    case "balanced":
      return "nicely balanced";
    case "tart":
      return "tart";
    case "very_tart":
      return "very tart";
    case "not_sure":
      return "still hard to judge";
    default:
      return null;
  }
}

function stripTastePrefix(note: string, tasteImpression?: string) {
  const tasteLabel = getTasteImpressionLabel(tasteImpression);
  if (!tasteLabel) {
    return note.trim();
  }

  const expectedPrefix = `${tasteImpression?.replace(/_/g, " ")}.`;
  if (note.toLowerCase().startsWith(expectedPrefix.toLowerCase())) {
    return note.slice(expectedPrefix.length).trim();
  }

  return note.trim();
}

function buildStageTransitionContent(entry: BatchTimelineEntry) {
  switch (entry.toStage) {
    case "f2_setup":
    case "f2_active":
      return {
        beatLabel: "Chapter turn",
        title: "Moved into Second Fermentation",
        body:
          entry.subtitle ||
          "The base brew was ready to leave First Fermentation and move into the bottle-planning chapter.",
        sourceLabel: "Stage change",
        emphasis: "highlight" as const,
      };
    case "f1_extended":
      return {
        beatLabel: "Check-in",
        title: "Kept First Fermentation going",
        body:
          entry.subtitle ||
          "The batch needed more time before bottling, so the tasting window stayed open.",
        sourceLabel: "Stage change",
        emphasis: "default" as const,
      };
    case "refrigerate_now":
      return {
        beatLabel: "Carbonation call",
        title: "Marked the bottles ready to chill",
        body:
          entry.subtitle ||
          "The batch had reached the point where refrigeration was the safest next step.",
        sourceLabel: "Stage change",
        emphasis: "highlight" as const,
      };
    case "chilled_ready":
      return {
        beatLabel: "Finish step",
        title: "Moved the bottles into the fridge",
        body:
          entry.subtitle ||
          "Room-temperature fermentation was wrapped up so the flavour and fizz could settle down.",
        sourceLabel: "Stage change",
        emphasis: "highlight" as const,
      };
    case "completed":
      return {
        beatLabel: "Chapter ending",
        title: "Wrapped up this batch",
        body:
          entry.subtitle ||
          "The brewing journey was marked complete and ready to look back on.",
        sourceLabel: "Stage change",
        emphasis: "reflection" as const,
      };
    case "archived":
      return {
        beatLabel: "Archive",
        title: "Archived this batch",
        body:
          entry.subtitle ||
          "The batch was moved out of the active brewing flow but kept as a reference.",
        sourceLabel: "Stage change",
        emphasis: "reflection" as const,
      };
    case "discarded":
      return {
        beatLabel: "Outcome",
        title: "Set this batch aside",
        body:
          entry.subtitle ||
          "The batch was marked as discarded and kept only as a record of what happened.",
        sourceLabel: "Stage change",
        emphasis: "reflection" as const,
      };
    default:
      return {
        beatLabel: "Stage change",
        title: entry.title,
        body: entry.subtitle,
        sourceLabel: "Stage change",
        emphasis: "default" as const,
      };
  }
}

function buildLogEntry(
  entry: BatchTimelineEntry,
  chapter: BatchJourneyChapter
): BatchJournalEntryView | null {
  if (entry.logType === "phase_outcome") {
    return null;
  }

  const payload = getPayloadObject(entry);
  const action = getPayloadString(payload, "action");
  const note = entry.subtitle?.trim() || null;
  const shared = {
    id: entry.id,
    chapter,
    occurredAt: entry.eventAt,
    occurredAtLabel: formatEntryTimestamp(entry.eventAt),
    tags: [] as string[],
  };

  switch (entry.logType) {
    case "taste_test": {
      const tasteImpression = getPayloadString(payload, "taste_impression");
      const cleanedNote = note ? stripTastePrefix(note, tasteImpression) : null;
      const impressionLabel = getTasteImpressionLabel(tasteImpression);

      return {
        ...shared,
        kind: "taste_test",
        beatLabel: "Taste check",
        title: "Taste-tested the base brew",
        body: impressionLabel
          ? cleanedNote
            ? `It tasted ${impressionLabel}, and this note was saved: ${cleanedNote}`
            : `It tasted ${impressionLabel}.`
          : cleanedNote || "A quick taste check was saved for this point in the brew.",
        sourceLabel: "Quick log",
        emphasis: "highlight",
      };
    }
    case "note_only":
      return {
        ...shared,
        kind: "note",
        beatLabel: chapter === "finish_reflection" ? "Reflection note" : "Brewing note",
        title:
          chapter === "finish_reflection"
            ? "Left a note for later reflection"
            : "Left a brewing note",
        body: note || "A short note was saved for this batch.",
        sourceLabel: "Quick log",
        emphasis: "default",
      };
    case "photo_added":
      return {
        ...shared,
        kind: "photo",
        beatLabel: "Photo",
        title: "Added a batch photo",
        body: note || "A photo was attached to this part of the brewing story.",
        sourceLabel: "Photo",
        emphasis: "default",
      };
    case "moved_to_f2": {
      const bottleCount = getPayloadString(payload, "bottle_count");
      const carbonationTarget = getPayloadString(payload, "carbonation_target");
      const details = [
        bottleCount ? `${bottleCount} bottles planned` : null,
        carbonationTarget ? `${carbonationTarget} carbonation target` : null,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        ...shared,
        kind: "f2_action",
        beatLabel: "Bottle setup",
        title: "Started Second Fermentation",
        body:
          note ||
          (details
            ? `The batch was bottled for F2 with ${details}.`
            : "The batch moved out of F1 and into the bottled phase."),
        sourceLabel: "F2 action",
        emphasis: "highlight",
      };
    }
    case "bottle_burped":
      return {
        ...shared,
        kind: "f2_action",
        beatLabel: "Pressure check",
        title: "Burped a bottle during F2",
        body: note || "A bottle was opened briefly to release pressure.",
        sourceLabel: "F2 action",
        emphasis: "default",
      };
    case "carbonation_check":
      return {
        ...shared,
        kind: "f2_action",
        beatLabel: "Carbonation check",
        title:
          action === "checked-one-bottle"
            ? "Checked one bottle for fizz"
            : action === "needs-more-carbonation"
              ? "Decided the bottles needed more time"
              : "Checked carbonation",
        body:
          note ||
          (action === "needs-more-carbonation"
            ? "The batch stayed in Second Fermentation for a little longer."
            : "A carbonation check was saved for the bottled phase."),
        sourceLabel: "F2 action",
        emphasis: "default",
      };
    case "refrigerated":
      return {
        ...shared,
        kind: "completion",
        beatLabel: "Finish step",
        title: "Moved the bottles into the fridge",
        body:
          note ||
          "The batch was chilled to slow fermentation and settle the finished drink.",
        sourceLabel: "Finish",
        emphasis: "highlight",
      };
    case "custom_action":
      return {
        ...shared,
        kind:
          action === "mark-completed" || chapter === "finish_reflection"
            ? "completion"
            : "f2_action",
        beatLabel:
          action === "mark-completed" || chapter === "finish_reflection"
            ? "Outcome"
            : "Batch action",
        title:
          action === "refrigerate-now"
            ? "Marked the bottles ready to chill"
            : action === "mark-completed"
              ? "Marked the batch complete"
              : "Recorded a batch action",
        body: note || "A batch action was saved for this chapter.",
        sourceLabel:
          action === "mark-completed" || chapter === "finish_reflection"
            ? "Finish"
            : "F2 action",
        emphasis:
          action === "refrigerate-now" || action === "mark-completed"
            ? "highlight"
            : "default",
      };
    case "temp_check":
      return {
        ...shared,
        kind: "system_event",
        beatLabel: "Check",
        title: "Checked the room temperature",
        body: note || "A temperature check was recorded for this batch.",
        sourceLabel: "Check",
        emphasis: "default",
      };
    case "ph_check":
      return {
        ...shared,
        kind: "system_event",
        beatLabel: "Check",
        title: "Checked the pH",
        body: note || "A pH reading was logged for this batch.",
        sourceLabel: "Check",
        emphasis: "default",
      };
    case "sweetness_check":
      return {
        ...shared,
        kind: "system_event",
        beatLabel: "Check",
        title: "Checked sweetness",
        body: note || "A sweetness check was recorded for this batch.",
        sourceLabel: "Check",
        emphasis: "default",
      };
    default:
      return {
        ...shared,
        kind: "system_event",
        beatLabel: "Journal entry",
        title: entry.title,
        body: note,
        sourceLabel: "Journal",
        emphasis: "default",
      };
  }
}

function buildOutcomeBody(outcome: PhaseOutcomeRow) {
  if (outcome.phase === "f1") {
    const lines = [
      outcome.f1_taste_state
        ? `The base kombucha tasted ${getPhaseOutcomeLabel(outcome.f1_taste_state).toLowerCase()}.`
        : null,
      outcome.f1_readiness
        ? `It felt ${getPhaseOutcomeLabel(outcome.f1_readiness).toLowerCase()} for the next step.`
        : null,
      outcome.note || null,
      outcome.next_time_change ? `Next time: ${outcome.next_time_change}` : null,
    ].filter(Boolean);

    return lines.join(" ");
  }

  const lines = [
    outcome.f2_overall_result
      ? `The finished batch turned out ${getPhaseOutcomeLabel(outcome.f2_overall_result).toLowerCase()}.`
      : null,
    outcome.f2_brew_again
      ? `Brew again: ${getPhaseOutcomeLabel(outcome.f2_brew_again)}.`
      : null,
    outcome.note || null,
    outcome.next_time_change ? `Next time: ${outcome.next_time_change}` : null,
  ].filter(Boolean);

  return lines.join(" ");
}

function buildOutcomeEntry(outcome: PhaseOutcomeRow): BatchJournalEntryView {
  const phaseTitle: Record<PhaseOutcomePhase, string> = {
    f1: "Captured a First Fermentation reflection",
    f2: "Captured a finished-batch reflection",
  };

  return {
    id: `outcome-${outcome.id}`,
    chapter: outcome.phase === "f1" ? "first_fermentation" : "finish_reflection",
    kind: "reflection",
    occurredAt: outcome.created_at,
    occurredAtLabel: formatEntryTimestamp(outcome.created_at),
    beatLabel: outcome.phase === "f1" ? "F1 reflection" : "Final reflection",
    title: phaseTitle[outcome.phase],
    body: buildOutcomeBody(outcome) || null,
    sourceLabel: "Outcome",
    emphasis: "reflection",
    tags: outcome.selected_tags.map(getPhaseOutcomeLabel),
  };
}

function buildTimelineEntry(
  entry: BatchTimelineEntry,
  thresholds: ReturnType<typeof getChapterThresholds>
): BatchJournalEntryView | null {
  const chapter =
    entry.source === "stage_event"
      ? getChapterForStage(entry.toStage || entry.fromStage)
      : inferChapterFromTimeline(entry, thresholds);

  if (entry.source === "stage_event") {
    const content = buildStageTransitionContent(entry);

    return {
      id: entry.id,
      chapter,
      kind:
        chapter === "finish_reflection" && ["completed", "archived", "discarded"].includes(entry.toStage || "")
          ? "completion"
          : "stage_transition",
      occurredAt: entry.eventAt,
      occurredAtLabel: formatEntryTimestamp(entry.eventAt),
      tags: [],
      ...content,
    };
  }

  return buildLogEntry(entry, chapter);
}

function getTimeframeLabel(entries: BatchJournalEntryView[]) {
  if (entries.length === 0) {
    return null;
  }

  const first = entries[0];
  const last = entries[entries.length - 1];
  const firstLabel = formatDateLabel(first.occurredAt);
  const lastLabel = formatDateLabel(last.occurredAt);

  return firstLabel === lastLabel ? firstLabel : `${firstLabel} to ${lastLabel}`;
}

function buildChapterRecap(
  chapter: BatchJourneyChapter,
  entries: BatchJournalEntryView[]
): BatchJournalRecap {
  const notes = entries.filter((entry) => entry.kind === "note").length;
  const tasteChecks = entries.filter((entry) => entry.kind === "taste_test").length;
  const reflections = entries.filter((entry) => entry.kind === "reflection").length;
  const transitions = entries.filter((entry) => entry.kind === "stage_transition").length;
  const completions = entries.filter((entry) => entry.kind === "completion").length;
  const f2Actions = entries.filter((entry) => entry.kind === "f2_action").length;
  const timeframe = getTimeframeLabel(entries);

  if (chapter === "first_fermentation") {
    return {
      eyebrow: "Chapter recap",
      title: "This is where the base brew found its direction",
      summary:
        "First Fermentation is the slow-building chapter where sweetness softens, acidity develops, and the batch starts to show whether it is ready for the next step.",
      timeframe,
      highlights: [
        tasteChecks > 0 ? `${tasteChecks} taste check${tasteChecks === 1 ? "" : "s"} logged` : null,
        notes > 0 ? `${notes} brewing note${notes === 1 ? "" : "s"} saved` : null,
        transitions > 0 ? "Stage decisions were recorded in this chapter" : null,
        reflections > 0 ? "An F1 reflection was saved before moving on" : null,
      ].filter((value): value is string => !!value),
    };
  }

  if (chapter === "second_fermentation") {
    return {
      eyebrow: "Chapter recap",
      title: "This chapter tracks bottling, flavour, and fizz",
      summary:
        "Second Fermentation covers what happened after the base brew left F1, including bottle setup, pressure checks, and the calls that shaped the final drink.",
      timeframe,
      highlights: [
        f2Actions > 0 ? `${f2Actions} F2 action${f2Actions === 1 ? "" : "s"} recorded` : null,
        notes > 0 ? `${notes} supporting note${notes === 1 ? "" : "s"} saved` : null,
        completions > 0 ? "This chapter includes the move toward chilling" : null,
      ].filter((value): value is string => !!value),
    };
  }

  return {
    eyebrow: "Chapter recap",
    title: "This final chapter captures the result and what it taught you",
    summary:
      "Finish & Reflection is where the batch settles down, gets tasted with more confidence, and turns into useful memory for the next brew.",
    timeframe,
    highlights: [
      reflections > 0 ? `${reflections} reflection${reflections === 1 ? "" : "s"} saved` : null,
      completions > 0 ? `${completions} finish step${completions === 1 ? "" : "s"} recorded` : null,
      notes > 0 ? `${notes} reflection note${notes === 1 ? "" : "s"} kept` : null,
    ].filter((value): value is string => !!value),
  };
}

export function buildBatchJournal(args: {
  timelineEntries: BatchTimelineEntry[];
  phaseOutcomes: PhaseOutcomeRow[];
}) {
  const thresholds = getChapterThresholds(args.timelineEntries);

  const entries = [
    ...args.timelineEntries
      .map((entry) => buildTimelineEntry(entry, thresholds))
      .filter((entry): entry is BatchJournalEntryView => !!entry),
    ...args.phaseOutcomes.map(buildOutcomeEntry),
  ];

  return (Object.keys(chapterMeta) as BatchJourneyChapter[])
    .map((chapter) => {
      const chapterEntries = entries
        .filter((entry) => entry.chapter === chapter)
        .sort(
          (left, right) =>
            new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()
        );

      return {
        chapter,
        title: chapterMeta[chapter].title,
        description: chapterMeta[chapter].description,
        recap: buildChapterRecap(chapter, chapterEntries),
        entries: chapterEntries,
      } satisfies BatchJournalSection;
    })
    .filter((section) => section.entries.length > 0);
}
