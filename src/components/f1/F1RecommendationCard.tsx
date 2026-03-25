import { Button } from "@/components/ui/button";
import type { F1RecommendationCard as F1RecommendationCardModel } from "@/lib/f1-recommendation-types";

type F1RecommendationCardProps = {
  card: F1RecommendationCardModel;
  applied: boolean;
  compact?: boolean;
  onApply?: (card: F1RecommendationCardModel) => void;
};

function getSourceLabel(sourceType: F1RecommendationCardModel["sourceType"]) {
  switch (sourceType) {
    case "baseline":
      return "General F1 guidance";
    case "transition":
      return "Compared with your chosen starter path";
    case "similar_setups":
      return "Seen in similar batches";
    case "lineage":
      return "From this culture line";
    case "outcomes":
      return "From past batch notes";
    default:
      return "From setup and history together";
  }
}

function getCautionClasses(cautionLevel: F1RecommendationCardModel["cautionLevel"]) {
  switch (cautionLevel) {
    case "high":
      return "border-amber-300/70 bg-amber-50";
    case "moderate":
      return "border-honey/50 bg-honey-light/70";
    case "low":
      return "border-primary/15 bg-primary/5";
    default:
      return "border-border bg-background";
  }
}

export function F1RecommendationCard({
  card,
  applied,
  compact = false,
  onApply,
}: F1RecommendationCardProps) {
  return (
    <div className={`rounded-2xl border p-4 ${getCautionClasses(card.cautionLevel)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2 text-[11px] font-medium">
            <span className="rounded-full bg-background/90 px-2 py-1 text-muted-foreground">
              {getSourceLabel(card.sourceType)}
            </span>
            {card.evidenceCount > 0 ? (
              <span className="rounded-full bg-background/90 px-2 py-1 text-muted-foreground">
                {card.evidenceCount} related batch
                {card.evidenceCount === 1 ? "" : "es"}
              </span>
            ) : null}
          </div>
          <h3 className={`${compact ? "text-base" : "text-lg"} font-semibold text-foreground`}>
            {card.title}
          </h3>
          <p className="text-sm font-medium text-foreground">{card.summary}</p>
        </div>

        {card.applyAction && onApply ? (
          <Button
            type="button"
            variant={applied ? "secondary" : "outline"}
            size="sm"
            onClick={() => onApply(card)}
          >
            {applied ? "Using this adjustment" : card.applyAction.label || "Use this adjustment"}
          </Button>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{card.explanation}</p>
    </div>
  );
}
