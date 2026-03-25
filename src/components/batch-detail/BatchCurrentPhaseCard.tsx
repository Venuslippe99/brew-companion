import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { batchDetailCopy } from "@/copy/batch-detail";
import {
  getCurrentPhaseLabel,
  getPhaseSummaryChips,
} from "@/lib/batch-detail-view";
import type { BatchTimingResult } from "@/lib/batch-timing";
import type { BatchStage, KombuchaBatch } from "@/lib/batches";
import type { LoadedF2Setup } from "@/lib/f2-current-setup";

type WorkflowAction = "start-f2" | "still-fermenting";

const F1_TIMING_STAGES: BatchStage[] = ["f1_active", "f1_check_window", "f1_extended"];

export function BatchCurrentPhaseCard({
  batch,
  timing,
  currentF2Setup,
  actionLoading,
  onStartF2,
  onOpenF2Chapter,
  onStillFermenting,
}: {
  batch: KombuchaBatch;
  timing: BatchTimingResult | null;
  currentF2Setup: LoadedF2Setup | null;
  actionLoading: WorkflowAction | null;
  onStartF2: () => Promise<void>;
  onOpenF2Chapter: () => void;
  onStillFermenting: () => Promise<void>;
}) {
  const showWorkflowActions =
    !!timing &&
    (timing.status === "ready" || timing.status === "overdue") &&
    F1_TIMING_STAGES.includes(batch.currentStage);

  const summaryChips = getPhaseSummaryChips({ batch, currentF2Setup });
  const phaseLabel = getCurrentPhaseLabel(batch.currentStage);
  const isF1Stage = F1_TIMING_STAGES.includes(batch.currentStage);
  const showF2ChapterButton =
    batch.currentStage === "f2_setup" ||
    batch.currentStage === "f2_active" ||
    batch.currentStage === "refrigerate_now" ||
    batch.currentStage === "chilled_ready";

  return (
    <ScrollReveal delay={0.04}>
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {batchDetailCopy.currentPhase.eyebrow}
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold text-foreground">
              {phaseLabel}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {timing?.guidance ||
                batchDetailCopy.currentPhase.stageGuidance(batch.currentStage)}
            </p>
          </div>

          {timing && (
            <div className="rounded-2xl bg-muted/60 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {batchDetailCopy.currentPhase.timingWindow}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                Day {timing.windowStartDay}-{timing.windowEndDay}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {timing.windowDateRangeText}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {summaryChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {batchDetailCopy.currentPhase.nextAction}
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {batch.nextAction || batchDetailCopy.currentPhase.followGuidedCheck}
            </p>
            {timing && (
              <p className="mt-2 text-xs text-muted-foreground">
                {timing.nextCheckText}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {batchDetailCopy.currentPhase.whyKombloomSaysThis}
            </p>
            <p className="mt-2 text-sm text-foreground">
              {timing?.explanation || batchDetailCopy.currentPhase.f2Guidance(!!currentF2Setup)}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-background p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {isF1Stage
              ? batchDetailCopy.currentPhase.baseBrewSnapshot
              : batchDetailCopy.currentPhase.currentPhaseSnapshot}
          </p>
          {isF1Stage ? (
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">{batchDetailCopy.currentPhase.tea}</p>
                <p className="mt-1 font-medium text-foreground">{batch.teaType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{batchDetailCopy.currentPhase.sugar}</p>
                <p className="mt-1 font-medium text-foreground">{batch.sugarG}g</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {batchDetailCopy.currentPhase.starter}
                </p>
                <p className="mt-1 font-medium text-foreground">{batch.starterLiquidMl}ml</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {batchDetailCopy.currentPhase.volume}
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {(batch.totalVolumeMl / 1000).toFixed(1)}L
                </p>
              </div>
            </div>
          ) : currentF2Setup ? (
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  {batchDetailCopy.currentPhase.bottles}
                </p>
                <p className="mt-1 font-medium text-foreground">{currentF2Setup.bottleCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {batchDetailCopy.currentPhase.carbonation}
                </p>
                <p className="mt-1 font-medium capitalize text-foreground">
                  {currentF2Setup.desiredCarbonationLevel}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {batchDetailCopy.currentPhase.pressureRisk}
                </p>
                <p className="mt-1 font-medium capitalize text-foreground">
                  {currentF2Setup.estimatedPressureRisk || batchDetailCopy.currentPhase.unknown}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {batchDetailCopy.currentPhase.recipe}
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {currentF2Setup.recipeNameSnapshot || batchDetailCopy.currentPhase.savedRecipe}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {batchDetailCopy.currentPhase.noSavedF2Setup}
            </p>
          )}
        </div>

        {showWorkflowActions && (
          <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground">
              {batchDetailCopy.currentPhase.tasteFirstTitle}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {batchDetailCopy.currentPhase.tasteFirstDescription}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                className="sm:flex-1"
                onClick={onStartF2}
                disabled={actionLoading !== null}
              >
                {actionLoading === "start-f2"
                  ? batchDetailCopy.currentPhase.openingF2Setup
                  : batchDetailCopy.currentPhase.moveToSecondFermentation}
              </Button>
              <Button
                variant="outline"
                className="sm:flex-1"
                onClick={onStillFermenting}
                disabled={actionLoading !== null}
              >
                {actionLoading === "still-fermenting"
                  ? batchDetailCopy.currentPhase.saving
                  : batchDetailCopy.currentPhase.keepFermenting}
              </Button>
            </div>
          </div>
        )}

        {showF2ChapterButton && (
          <div className="mt-5 rounded-2xl border border-border bg-background p-4">
            <p className="text-sm font-semibold text-foreground">
              {batchDetailCopy.currentPhase.openF2Title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {batchDetailCopy.currentPhase.openF2Description}
            </p>
            <Button className="mt-4" onClick={onOpenF2Chapter}>
              {batch.currentStage === "f2_setup"
                ? batchDetailCopy.currentPhase.openBottlingSetup
                : batchDetailCopy.currentPhase.openF2Chapter}
            </Button>
          </div>
        )}
      </section>
    </ScrollReveal>
  );
}
