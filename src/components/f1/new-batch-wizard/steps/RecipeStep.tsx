import { F1RecommendationSection } from "@/components/f1/F1RecommendationSection";
import type { F1RecipeGeneratorResult } from "@/lib/f1-generator-types";
import type { F1RecommendationCard } from "@/lib/f1-recommendation-types";

type RecipeStepProps = {
  generatedRecipe: F1RecipeGeneratorResult | null;
  overrideTeaG: number | null;
  overrideSugarG: number | null;
  overrideStarterMl: number | null;
  requiresManualSugar: boolean;
  recommendationHistoryLoading: boolean;
  onOverrideChange: (field: "teaG" | "sugarG" | "starterMl", value: number | null) => void;
  secondaryCards: F1RecommendationCard[];
};

function inputValue(value: number | null) {
  return value === null ? "" : value.toString();
}

export function RecipeStep({
  generatedRecipe,
  overrideTeaG,
  overrideSugarG,
  overrideStarterMl,
  requiresManualSugar,
  recommendationHistoryLoading,
  onOverrideChange,
  secondaryCards,
}: RecipeStepProps) {
  if (!generatedRecipe) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
        <h2 className="text-2xl font-semibold text-foreground">Your recommended F1 recipe</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Finish the core setup questions first so the app can build a recipe for you.
        </p>
      </div>
    );
  }

  const chosenTeaG = overrideTeaG ?? generatedRecipe.recommendedTeaG;
  const chosenSugarG = overrideSugarG ?? generatedRecipe.recommendedSugarG;
  const chosenStarterMl = overrideStarterMl ?? generatedRecipe.recommendedStarterMl;
  const chosenFreshTeaVolumeMl = Math.max(
    generatedRecipe.finalBatchVolumeMl - chosenStarterMl,
    0
  );
  const hasOverrides =
    overrideTeaG !== null || overrideSugarG !== null || overrideStarterMl !== null;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Step 7
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">Your recommended F1 recipe</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          This is the starting recipe the app would use for this batch from what you&apos;ve told it
          so far. Your chosen batch size is the final kombucha amount, with starter included inside
          that total.
        </p>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-background p-4">
            <p className="text-xs text-muted-foreground">Final batch volume</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {generatedRecipe.finalBatchVolumeMl}ml
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Starter is already included in this total
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background p-4">
            <p className="text-xs text-muted-foreground">Fresh sweet tea to brew</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {generatedRecipe.freshTeaVolumeMl}ml
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Brew this first before adding starter
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background p-4">
            <p className="text-xs text-muted-foreground">Starter to add</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {generatedRecipe.recommendedStarterMl}ml
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {Math.round(generatedRecipe.starterRatioUsed * 100)}% starter inside the final total
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">Tea</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {generatedRecipe.recommendedTeaG}g
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              About {generatedRecipe.recommendedTeaBagsApprox} tea bags
            </p>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">Sugar</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {generatedRecipe.recommendedSugarG === null
                ? "Choose manually"
                : `${generatedRecipe.recommendedSugarG}g`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {generatedRecipe.recommendedSugarG === null
                ? "This sugar type needs a manual amount."
                : `${generatedRecipe.effectiveSugarTargetGPL} g/L starting target`}
            </p>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">Starter</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {generatedRecipe.recommendedStarterMl}ml
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {Math.round(generatedRecipe.starterRatioUsed * 100)}% starter
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border/80 bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Why this is the starting point
          </p>
          <div className="mt-3 space-y-2">
            {generatedRecipe.reasons.map((reason) => (
              <p key={reason} className="text-sm text-foreground">
                {reason}
              </p>
            ))}
          </div>
        </div>

        {generatedRecipe.cautionFlags.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-honey/40 bg-honey-light/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Worth knowing
            </p>
            <div className="mt-2 space-y-2">
              {generatedRecipe.cautionFlags.map((flag) => (
                <p key={flag.code} className="text-sm text-foreground">
                  {flag.message}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-4 rounded-2xl border border-border/80 bg-background p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Adjust it yourself</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep the recommendation as-is, or change the amounts you want to brew with today.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Tea (g)</label>
              <input
                type="number"
                value={inputValue(overrideTeaG)}
                onChange={(event) =>
                  onOverrideChange("teaG", event.target.value ? Number(event.target.value) : null)
                }
                placeholder={generatedRecipe.recommendedTeaG.toString()}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Sugar (g)</label>
              <input
                type="number"
                value={inputValue(overrideSugarG)}
                onChange={(event) =>
                  onOverrideChange(
                    "sugarG",
                    event.target.value ? Number(event.target.value) : null
                  )
                }
                placeholder={
                  generatedRecipe.recommendedSugarG === null
                    ? "Required"
                    : generatedRecipe.recommendedSugarG.toString()
                }
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {requiresManualSugar ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Add the sugar grams you want to use before you continue.
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Starter (ml)
              </label>
              <input
                type="number"
                value={inputValue(overrideStarterMl)}
                onChange={(event) =>
                  onOverrideChange(
                    "starterMl",
                    event.target.value ? Number(event.target.value) : null
                  )
                }
                placeholder={generatedRecipe.recommendedStarterMl.toString()}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {hasOverrides ? (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Your chosen recipe
              </p>
              <p className="mt-2 text-sm text-foreground">
                {chosenTeaG}g tea,{" "}
                {chosenSugarG === null ? "manual sugar amount still needed" : `${chosenSugarG}g sugar`},
                {" "}{chosenFreshTeaVolumeMl}ml fresh sweet tea, then {chosenStarterMl}ml starter
                for a final {generatedRecipe.finalBatchVolumeMl}ml batch.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <F1RecommendationSection
        cards={secondaryCards}
        loadingHistory={recommendationHistoryLoading}
        appliedRecommendationIds={[]}
        onApply={() => {}}
        eyebrow="Also worth knowing"
        title="A little extra context"
        description="These notes stay secondary to the recipe itself. They are here if you want the extra read."
        maxPrimary={2}
      />
    </div>
  );
}
