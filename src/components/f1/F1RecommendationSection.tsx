import { F1RecommendationCard } from "@/components/f1/F1RecommendationCard";
import type { F1RecommendationCard as F1RecommendationCardModel } from "@/lib/f1-recommendation-types";

type F1RecommendationSectionProps = {
  cards: F1RecommendationCardModel[];
  loadingHistory: boolean;
  appliedRecommendationIds: string[];
  onApply: (card: F1RecommendationCardModel) => void;
};

export function F1RecommendationSection({
  cards,
  loadingHistory,
  appliedRecommendationIds,
  onApply,
}: F1RecommendationSectionProps) {
  if (cards.length === 0 && !loadingHistory) {
    return null;
  }

  const primaryCards = cards.slice(0, 3);
  const secondaryCards = cards.slice(3);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Review notes
        </p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">
          Suggestions for this batch
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          These notes help you sanity-check the setup before you start. The most important items
          come first, and lighter context stays below.
        </p>
        {loadingHistory ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Checking similar past batches now. The first notes are already based on this setup.
          </p>
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
            Also worth knowing
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
