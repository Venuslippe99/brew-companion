import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Info, SlidersHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NewBatchWizardProgress } from "@/components/f1/new-batch-wizard/NewBatchWizardProgress";
import { F1RecommendationSection } from "@/components/f1/F1RecommendationSection";
import { f1NewBatchCopy } from "@/copy/f1-new-batch";
import type { BatchTimingResult } from "@/lib/batch-timing";
import type { F1RecipeGeneratorResult } from "@/lib/f1-generator-types";
import type { F1RecommendationCard } from "@/lib/f1-recommendation-types";

type RecipeStepProps = {
  generatedRecipe: F1RecipeGeneratorResult | null;
  estimatedF1Timing: BatchTimingResult | null;
  overrideTeaG: number | null;
  overrideSugarG: number | null;
  overrideStarterMl: number | null;
  requiresManualSugar: boolean;
  recommendationHistoryLoading: boolean;
  onOverrideChange: (field: "teaG" | "sugarG" | "starterMl", value: number | null) => void;
  secondaryCards: F1RecommendationCard[];
};

type RecipeDialogView = "calculation" | "context" | null;

function inputValue(value: number | null) {
  return value === null ? "" : value.toString();
}

export function RecipeStep({
  generatedRecipe,
  estimatedF1Timing,
  overrideTeaG,
  overrideSugarG,
  overrideStarterMl,
  requiresManualSugar,
  recommendationHistoryLoading,
  onOverrideChange,
  secondaryCards,
}: RecipeStepProps) {
  const [dialogView, setDialogView] = useState<RecipeDialogView>(null);
  const [showAdjustments, setShowAdjustments] = useState(false);

  useEffect(() => {
    const hasOverrides =
      overrideTeaG !== null || overrideSugarG !== null || overrideStarterMl !== null;

    if (requiresManualSugar || hasOverrides) {
      setShowAdjustments(true);
    }
  }, [overrideStarterMl, overrideSugarG, overrideTeaG, requiresManualSugar]);

  if (!generatedRecipe) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
        <NewBatchWizardProgress currentStep="recipe" />
        <h2 className="mt-2 text-2xl font-semibold text-foreground">
          {f1NewBatchCopy.steps.recipe.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {f1NewBatchCopy.steps.recipe.emptyDescription}
        </p>
      </div>
    );
  }

  const chosenTeaG = overrideTeaG ?? generatedRecipe.recommendedTeaG;
  const chosenSugarG = overrideSugarG ?? generatedRecipe.recommendedSugarG;
  const chosenStarterMl = overrideStarterMl ?? generatedRecipe.recommendedStarterMl;
  const chosenFreshTeaVolumeMl = Math.max(generatedRecipe.finalBatchVolumeMl - chosenStarterMl, 0);
  const hasOverrides =
    overrideTeaG !== null || overrideSugarG !== null || overrideStarterMl !== null;
  const hasMoreContext = recommendationHistoryLoading || secondaryCards.length > 0;
  const adjustmentsLockedOpen = requiresManualSugar || hasOverrides;

  return (
    <>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
        <NewBatchWizardProgress currentStep="recipe" />
        <h2 className="mt-2 text-2xl font-semibold text-foreground">
          {f1NewBatchCopy.steps.recipe.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {f1NewBatchCopy.steps.recipe.description}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/80 bg-background p-4">
            <p className="text-xs text-muted-foreground">
              {f1NewBatchCopy.steps.recipe.summary.finalBatchVolume}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {generatedRecipe.finalBatchVolumeMl}ml
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background p-4">
            <p className="text-xs text-muted-foreground">
              {f1NewBatchCopy.steps.recipe.summary.freshTeaToBrew}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {generatedRecipe.freshTeaVolumeMl}ml
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background p-4">
            <p className="text-xs text-muted-foreground">
              {f1NewBatchCopy.steps.recipe.summary.starterToAdd}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {generatedRecipe.recommendedStarterMl}ml
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background p-4">
            <p className="text-xs text-muted-foreground">
              {f1NewBatchCopy.steps.recipe.summary.estimatedFirstTaste}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {estimatedF1Timing
                ? `Day ${estimatedF1Timing.windowStartDay}-${estimatedF1Timing.windowEndDay}`
                : f1NewBatchCopy.steps.recipe.summary.fallbackTasteWindow}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {estimatedF1Timing?.windowDateRangeText ||
                f1NewBatchCopy.steps.recipe.summary.fallbackTasteWindowDescription}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">
              {f1NewBatchCopy.steps.recipe.composition.tea}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {generatedRecipe.recommendedTeaG}g
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {f1NewBatchCopy.steps.recipe.composition.teaBags(
                generatedRecipe.recommendedTeaBagsApprox
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">
              {f1NewBatchCopy.steps.recipe.composition.sugar}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {generatedRecipe.recommendedSugarG === null
                ? f1NewBatchCopy.steps.recipe.composition.chooseManually
                : `${generatedRecipe.recommendedSugarG}g`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {generatedRecipe.recommendedSugarG === null
                ? f1NewBatchCopy.steps.recipe.composition.manualSugarNeeded
                : f1NewBatchCopy.steps.recipe.composition.sugarTarget(
                    generatedRecipe.effectiveSugarTargetGPL
                  )}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border/80 bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {f1NewBatchCopy.steps.recipe.adjustments.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {f1NewBatchCopy.steps.recipe.adjustments.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasOverrides ? (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                  {f1NewBatchCopy.steps.recipe.adjustments.adjustedBadge}
                </span>
              ) : null}
              {!adjustmentsLockedOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdjustments((value) => !value)}
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  {showAdjustments
                    ? f1NewBatchCopy.steps.recipe.adjustments.hideManualEdits
                    : f1NewBatchCopy.steps.recipe.adjustments.adjustManually}
                  {showAdjustments ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              ) : null}
            </div>
          </div>

          {showAdjustments ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    {f1NewBatchCopy.steps.recipe.adjustments.fields.tea}
                  </label>
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
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    {f1NewBatchCopy.steps.recipe.adjustments.fields.sugar}
                  </label>
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
                        ? f1NewBatchCopy.steps.recipe.adjustments.fields.required
                        : generatedRecipe.recommendedSugarG.toString()
                    }
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {requiresManualSugar ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {f1NewBatchCopy.steps.recipe.adjustments.fields.manualSugarRequired}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    {f1NewBatchCopy.steps.recipe.adjustments.fields.starter}
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
                <p className="text-sm text-muted-foreground">
                  {f1NewBatchCopy.steps.recipe.adjustments.overrideSummary({
                    chosenFreshTeaVolumeMl,
                    chosenStarterMl,
                    finalBatchVolumeMl: generatedRecipe.finalBatchVolumeMl,
                  })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setDialogView("calculation")}>
            <Info className="mr-2 h-4 w-4" />
            {f1NewBatchCopy.steps.recipe.actions.whyThisRecipe}
          </Button>
          {hasMoreContext ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setDialogView("context")}>
              {f1NewBatchCopy.steps.recipe.actions.moreContext}
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={dialogView !== null} onOpenChange={(open) => !open && setDialogView(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {dialogView === "calculation" ? (
            <>
              <DialogHeader>
                <DialogTitle>{f1NewBatchCopy.steps.recipe.dialogs.calculation.title}</DialogTitle>
                <DialogDescription>
                  {f1NewBatchCopy.steps.recipe.dialogs.calculation.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  {generatedRecipe.reasons.map((reason) => (
                    <p key={reason} className="text-sm text-foreground">
                      {reason}
                    </p>
                  ))}
                </div>

                {generatedRecipe.cautionFlags.length > 0 ? (
                  <div className="rounded-2xl border border-honey/40 bg-honey-light/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {f1NewBatchCopy.steps.recipe.dialogs.calculation.cautionTitle}
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
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{f1NewBatchCopy.steps.recipe.dialogs.context.title}</DialogTitle>
                <DialogDescription>
                  {f1NewBatchCopy.steps.recipe.dialogs.context.description}
                </DialogDescription>
              </DialogHeader>

              {hasMoreContext ? (
                <F1RecommendationSection
                  cards={secondaryCards}
                  loadingHistory={recommendationHistoryLoading}
                  appliedRecommendationIds={[]}
                  onApply={() => {}}
                  eyebrow={f1NewBatchCopy.steps.recipe.dialogs.context.eyebrow}
                  title={f1NewBatchCopy.steps.recipe.dialogs.context.sectionTitle}
                  description={f1NewBatchCopy.steps.recipe.dialogs.context.sectionDescription}
                  maxPrimary={2}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {f1NewBatchCopy.steps.recipe.dialogs.context.empty}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
