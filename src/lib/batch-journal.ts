import {
  getPhaseOutcomeLabel,
  type PhaseOutcomePhase,
} from "@/lib/phase-outcome-options";
import type { PhaseOutcomeRow } from "@/lib/phase-outcomes";
import type {
  BatchJourneyChapter,
  BatchTimelineEntry,
} from "@/lib/batch-detail-view";

export type BatchJournalEntryView = {
  id: string;
  chapter: BatchJourneyChapter;
  occurredAt: string;
  title: string;
  body: string | null;
  sourceLabel: string;
  emphasis?: "default" | "reflection";
  tags?: string[];
};

export type BatchJournalSection = {
  chapter: BatchJourneyChapter;
  title: string;
  description: string;
  groups: Array<{
    dateLabel: string;
    entries: BatchJournalEntryView[];
  }>;
};

const chapterMeta: Record<
  BatchJourneyChapter,
  { title: string; description: string }
> = {
  first_fermentation: {
    title: "First Fermentation",
    description:
      "Early checks, stage shifts, and the taste decisions that shaped the base brew.",
  },
  second_fermentation: {
    title: "Second Fermentation",
    description:
      "Bottling, carbonation checks, and the flavour work that happened after F1.",
  },
  finish_reflection: {
    title: "Finish & Reflection",
    description:
      "The final stretch of chilling, completion, and what this batch taught you.",
  },
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDateLabel(iso: string) {
  return dateFormatter.format(new Date(iso));
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
    case "custom_action":
    case "note_only":
    case "photo_added":
    default:
      return "finish_reflection";
  }
}

function buildOutcomeBody(outcome: PhaseOutcomeRow) {
  if (outcome.phase === "f1") {
    const parts = [
      outcome.f1_taste_state
        ? `Taste: ${getPhaseOutcomeLabel(outcome.f1_taste_state)}`
        : null,
      outcome.f1_readiness
        ? `Readiness: ${getPhaseOutcomeLabel(outcome.f1_readiness)}`
        : null,
    ].filter(Boolean);

    return [
      parts.join(" • "),
      outcome.selected_tags.length > 0
        ? `Tags: ${outcome.selected_tags.map(getPhaseOutcomeLabel).join(", ")}`
        : null,
      outcome.note || null,
      outcome.next_time_change ? `Next time: ${outcome.next_time_change}` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }

  const parts = [
    outcome.f2_overall_result
      ? `Result: ${getPhaseOutcomeLabel(outcome.f2_overall_result)}`
      : null,
    outcome.f2_brew_again
      ? `Brew again: ${getPhaseOutcomeLabel(outcome.f2_brew_again)}`
      : null,
  ].filter(Boolean);

  return [
    parts.join(" • "),
    outcome.selected_tags.length > 0
      ? `Tags: ${outcome.selected_tags.map(getPhaseOutcomeLabel).join(", ")}`
      : null,
    outcome.note || null,
    outcome.next_time_change ? `Next time: ${outcome.next_time_change}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildOutcomeEntry(outcome: PhaseOutcomeRow): BatchJournalEntryView {
  const phaseTitle: Record<PhaseOutcomePhase, string> = {
    f1: "Saved a First Fermentation reflection",
    f2: "Saved a finished-batch reflection",
  };

  return {
    id: `outcome-${outcome.id}`,
    chapter: outcome.phase === "f1" ? "first_fermentation" : "finish_reflection",
    occurredAt: outcome.created_at,
    title: phaseTitle[outcome.phase],
    body: buildOutcomeBody(outcome) || null,
    sourceLabel: "Outcome",
    emphasis: "reflection",
    tags: outcome.selected_tags.map(getPhaseOutcomeLabel),
  };
}

function buildTimelineEntry(entry: BatchTimelineEntry): BatchJournalEntryView | null {
  if (entry.logType === "phase_outcome") {
    return null;
  }

  return {
    id: entry.id,
    chapter:
      entry.source === "stage_event"
        ? getChapterForStage(entry.toStage || entry.fromStage)
        : getChapterForLogType(entry.logType),
    occurredAt: entry.eventAt,
    title: entry.title,
    body: entry.subtitle,
    sourceLabel: entry.source === "stage_event" ? "Stage change" : "Journal note",
  };
}

export function buildBatchJournal(args: {
  timelineEntries: BatchTimelineEntry[];
  phaseOutcomes: PhaseOutcomeRow[];
}) {
  const entries = [
    ...args.timelineEntries
      .map(buildTimelineEntry)
      .filter((entry): entry is BatchJournalEntryView => !!entry),
    ...args.phaseOutcomes.map(buildOutcomeEntry),
  ].sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
  );

  return (Object.keys(chapterMeta) as BatchJourneyChapter[])
    .map((chapter) => {
      const chapterEntries = entries.filter((entry) => entry.chapter === chapter);
      const grouped = new Map<string, BatchJournalEntryView[]>();

      chapterEntries.forEach((entry) => {
        const key = formatDateLabel(entry.occurredAt);
        const current = grouped.get(key) || [];
        current.push(entry);
        grouped.set(key, current);
      });

      return {
        chapter,
        title: chapterMeta[chapter].title,
        description: chapterMeta[chapter].description,
        groups: [...grouped.entries()].map(([dateLabel, groupedEntries]) => ({
          dateLabel,
          entries: groupedEntries,
        })),
      } satisfies BatchJournalSection;
    })
    .filter((section) => section.groups.length > 0);
}
