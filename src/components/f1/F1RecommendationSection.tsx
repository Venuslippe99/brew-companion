import { F1RecommendationCard } from "@/components/f1/F1RecommendationCard";
import type { F1RecommendationCard as F1RecommendationCardModel } from "@/lib/f1-recommendation-types";

type F1RecommendationSectionProps = {
  cards: F1RecommendationCardModel[];
  loadingHistory: boolean;
  appliedRecommendationIds: string[];
  onApply: (card: F1RecommendationCardModel) => void;
  eyebrow?: string;
  title?: string;
  description?: string;
  loadingText?: string;
  secondaryTitle?: string;
  maxPrimary?: number;
};

export function F1RecommendationSection({
  cards,
  loadingHistory,
  appliedRecommendationIds,
  onApply,
  eyebrow = "Worth checking",
  title = "A few things worth checking",
  description = "These notes help you judge the setup without waiting until the end of the flow.",
  loadingText = "Checking similar past batches now. The first notes already reflect the brew in front of you.",
  secondaryTitle = "Also useful context",
  maxPrimary = 3,
}: F1RecommendationSectionProps) {
  if (cards.length === 0 && !loadingHistory) {
    return null;
  }

  const primaryCards = cards.slice(0, maxPrimary);
  const secondaryCards = cards.slice(maxPrimary);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {loadingHistory ? (
          <p className="mt-2 text-xs text-muted-foreground">{loadingText}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        {primaryCards.map((card) => (
          <F1RecommendationCard
            key={card.id}
            card={card}
            applied={appliedRecommendationIds.includes(card.id)}
            onApply={onApply}
          />
        ))}
      </div>

      {secondaryCards.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {secondaryTitle}
          </p>
          {secondaryCards.map((card) => (
            <F1RecommendationCard
              key={card.id}
              card={card}
              compact
              applied={appliedRecommendationIds.includes(card.id)}
              onApply={onApply}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
