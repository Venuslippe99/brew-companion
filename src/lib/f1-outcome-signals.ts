import type {
  F1RecommendationCard,
  F1RecommendationHistoryEntry,
  F1RecommendationHistoryOutcome,
} from "@/lib/f1-recommendation-types";
import type { PhaseOutcomeRow } from "@/lib/phase-outcomes";
import type { F1SimilarityMatch } from "@/lib/f1-similarity";

function normalizeSelectedTags(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function attachF1OutcomesToHistory(args: {
  history: F1RecommendationHistoryEntry[];
  outcomeMap: Map<string, PhaseOutcomeRow>;
}) {
  return args.history.map((entry) => {
    const outcome = args.outcomeMap.get(entry.batchId);

    return {
      ...entry,
      outcome: outcome
        ? ({
            tasteState: outcome.f1_taste_state,
            readiness: outcome.f1_readiness,
            selectedTags: normalizeSelectedTags(outcome.selected_tags),
            nextTimeChange: outcome.next_time_change,
          } satisfies F1RecommendationHistoryOutcome)
        : null,
    };
  });
}

function getRelevantOutcomeEntries(matches: F1SimilarityMatch[]) {
  return matches
    .filter((match) => match.tier === "very_close" || match.tier === "close" || match.tier === "related_transition")
    .map((match) => match.historyEntry)
    .filter((entry) => entry.outcome);
}

export function buildF1OutcomeSignalCards(args: {
  matches: F1SimilarityMatch[];
}) {
  const entries = getRelevantOutcomeEntries(args.matches);

  if (entries.length === 0) {
    return [] as F1RecommendationCard[];
  }

  const outcomes = entries.map((entry) => entry.outcome!).filter(Boolean);
  const tooSweetCount = outcomes.filter(
    (outcome) => outcome.tasteState === "too_sweet" || outcome.readiness === "no"
  ).length;
  const tooSourCount = outcomes.filter(
    (outcome) => outcome.tasteState === "too_sour" || outcome.readiness === "maybe_late"
  ).length;
  const weakTeaCount = outcomes.filter((outcome) =>
    outcome.selectedTags.includes("weak_tea_base")
  ).length;
  const strongTeaCount = outcomes.filter((outcome) =>
    outcome.selectedTags.includes("strong_tea_base")
  ).length;
  const notSureCount = outcomes.filter((outcome) =>
    outcome.selectedTags.includes("not_sure")
  ).length;
  const recentNextTimeChange = outcomes
    .map((outcome) => outcome.nextTimeChange?.trim())
    .find((value): value is string => !!value);

  const cards: F1RecommendationCard[] = [];

  if (tooSweetCount >= 2) {
    cards.push({
      id: "outcomes-more-time-first",
      category: "timing_expectation",
      priority: 86,
      title: "Similar batches point to more time before bigger changes",
      summary:
        "Repeated 'too sweet' or 'not ready' outcomes should bias toward more time first.",
      explanation:
        `${tooSweetCount} similar saved batch outcomes landed on the sweeter or not-ready side. That is a stronger reason to taste later before making bigger composition changes.`,
      sourceType: "outcomes",
      confidence: tooSweetCount >= 3 ? "high" : "moderate",
      evidenceCount: tooSweetCount,
      recommendationType: "timing",
      cautionLevel: "low",
    });
  } else if (tooSourCount >= 2) {
    cards.push({
      id: "outcomes-less-time-first",
      category: "timing_expectation",
      priority: 84,
      title: "Similar batches suggest checking a bit earlier",
      summary:
        "Repeated 'too sour' or 'maybe late' outcomes should bias toward less time first.",
      explanation:
        `${tooSourCount} similar saved batch outcomes skewed late or overly sour. That is a clearer reason to check earlier before changing the recipe itself.`,
      sourceType: "outcomes",
      confidence: tooSourCount >= 3 ? "high" : "moderate",
      evidenceCount: tooSourCount,
      recommendationType: "timing",
      cautionLevel: "low",
    });
  }

  if (weakTeaCount >= 2) {
    cards.push({
      id: "outcomes-weak-tea-base",
      category: "tea_amount_recommendation",
      priority: 72,
      title: "Past similar batches often felt light on tea",
      summary: "Repeated `weak_tea_base` tags justify a modestly stronger tea base.",
      explanation:
        `${weakTeaCount} similar saved outcomes called out a weak tea base. That supports a small tea-strength increase more than a dramatic recipe rewrite.`,
      sourceType: "outcomes",
      confidence: weakTeaCount >= 3 ? "moderate" : "low",
      evidenceCount: weakTeaCount,
      recommendationType: "note",
      cautionLevel: "low",
    });
  } else if (strongTeaCount >= 2) {
    cards.push({
      id: "outcomes-strong-tea-base",
      category: "tea_amount_recommendation",
      priority: 70,
      title: "Past similar batches often felt strong on tea",
      summary: "Repeated `strong_tea_base` tags support modestly softening the tea base.",
      explanation:
        `${strongTeaCount} similar saved outcomes tagged the tea base as strong, so a slightly softer tea profile is a reasonable next-time lesson.`,
      sourceType: "outcomes",
      confidence: strongTeaCount >= 3 ? "moderate" : "low",
      evidenceCount: strongTeaCount,
      recommendationType: "note",
      cautionLevel: "low",
    });
  }

  if (recentNextTimeChange) {
    cards.push({
      id: "outcomes-next-time-change",
      category: "next_time_lesson",
      priority: 45,
      title: "A recent similar batch already left a next-time note",
      summary: "The saved reflection from a related batch may be worth carrying forward here.",
      explanation: recentNextTimeChange,
      sourceType: "outcomes",
      confidence: notSureCount > 0 ? "low" : "moderate",
      evidenceCount: outcomes.filter((outcome) => !!outcome.nextTimeChange?.trim()).length,
      recommendationType: "note",
      cautionLevel: "none",
    });
  }

  return cards;
}
