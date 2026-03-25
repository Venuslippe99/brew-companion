import { BatchLineageSection } from "@/components/lineage/BatchLineageSection";
import { PhaseOutcomeCard } from "@/components/outcomes/PhaseOutcomeCard";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { BatchJourneyStrip } from "@/components/batch-detail/BatchJourneyStrip";
import { BatchReminderPanel } from "@/components/batch-detail/BatchReminderPanel";
import { BatchCurrentPhaseCard } from "@/components/batch-detail/BatchCurrentPhaseCard";
import { BatchPhaseCollapse } from "@/components/batch-detail/BatchPhaseCollapse";
import { BatchCompletedSummary } from "@/components/batch-detail/BatchCompletedSummary";
import { Button } from "@/components/ui/button";
import { batchDetailCopy } from "@/copy/batch-detail";
import type { BrewAgainPlan, BrewAgainMode } from "@/lib/brew-again-types";
import {
  getCurrentPhaseLabel,
  shouldCollapseChapterByDefault,
  type BatchReminder,
} from "@/lib/batch-detail-view";
import type { BatchTimingResult } from "@/lib/batch-timing";
import type { BatchStage, KombuchaBatch } from "@/lib/batches";
import type { LoadedF1Setup } from "@/lib/f1-setups";
import type { LoadedF2Setup } from "@/lib/f2-current-setup";
import type { BatchLineage } from "@/lib/lineage";
import {
  canLogF1Outcome,
  canLogF2Outcome,
  getOutcomeForPhase,
  type PhaseOutcomeRow,
} from "@/lib/phase-outcomes";

type WorkflowAction = "start-f2" | "still-fermenting";
const F1_STAGES: BatchStage[] = ["f1_active", "f1_check_window", "f1_extended"];

function RecipeSnapshot({ batch }: { batch: KombuchaBatch }) {
  const items = [
    [batchDetailCopy.overview.recipeSnapshot.tea, batch.teaType],
    [batchDetailCopy.overview.recipeSnapshot.sugar, `${batch.sugarG}g`],
    [batchDetailCopy.overview.recipeSnapshot.starter, `${batch.starterLiquidMl}ml`],
    [
      batchDetailCopy.overview.recipeSnapshot.volume,
      `${(batch.totalVolumeMl / 1000).toFixed(1)}L`,
    ],
    [batchDetailCopy.overview.recipeSnapshot.vessel, batch.vesselType],
    [batchDetailCopy.overview.recipeSnapshot.target, batch.targetPreference.replace(/_/g, " ")],
  ];

  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 font-medium capitalize text-foreground">{value}</p>
        </div>
      ))}
    </div>
  );
}

function getJsonRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getJsonString(record: Record<string, unknown> | null, key: string) {
  return record && typeof record[key] === "string" ? (record[key] as string) : null;
}

function getJsonNumber(record: Record<string, unknown> | null, key: string) {
  return record && typeof record[key] === "number" ? (record[key] as number) : null;
}

function getJsonArray(record: Record<string, unknown> | null, key: string) {
  return record && Array.isArray(record[key]) ? (record[key] as unknown[]) : [];
}

function F1SetupSnapshot({ setup }: { setup: LoadedF1Setup }) {
  const snapshot = getJsonRecord(setup.setupSnapshotJson);
  const recipeContext = getJsonRecord(snapshot?.recipeContext);
  const vesselContext = getJsonRecord(snapshot?.vesselContext);
  const fitContext = getJsonRecord(snapshot?.fitContext);
  const recommendationSnapshot = getJsonRecord(setup.recommendationSnapshotJson);
  const recommendationCards = getJsonArray(recommendationSnapshot, "cards");
  const acceptedRecommendationIds = Array.isArray(setup.acceptedRecommendationIdsJson)
    ? setup.acceptedRecommendationIdsJson
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {batchDetailCopy.overview.f1Setup.setupOrigin}
          </p>
          <p className="mt-1 font-medium capitalize text-foreground">
            {getJsonString(recipeContext, "origin") || batchDetailCopy.overview.f1Setup.scratch}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {batchDetailCopy.overview.f1Setup.recipeSnapshot}
          </p>
          <p className="mt-1 font-medium text-foreground">
            {getJsonString(recipeContext, "recipeNameSnapshot") ||
              batchDetailCopy.overview.f1Setup.noLinkedRecipe}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {batchDetailCopy.overview.f1Setup.vesselSnapshot}
          </p>
          <p className="mt-1 font-medium text-foreground">
            {getJsonString(vesselContext, "vesselNameSnapshot") ||
              batchDetailCopy.overview.f1Setup.manualVessel}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {batchDetailCopy.overview.f1Setup.fitState}
          </p>
          <p className="mt-1 font-medium capitalize text-foreground">
            {(getJsonString(fitContext, "fitState") ||
              batchDetailCopy.overview.f1Setup.unknown).replace(/_/g, " ")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {batchDetailCopy.overview.f1Setup.fillRatio}
          </p>
          <p className="mt-1 font-medium text-foreground">
            {getJsonNumber(fitContext, "fillRatioPercent") !== null
              ? `${getJsonNumber(fitContext, "fillRatioPercent")}%`
              : batchDetailCopy.overview.f1Setup.notCalculated}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {batchDetailCopy.overview.f1Setup.setupSaved}
          </p>
          <p className="mt-1 font-medium text-foreground">
            {new Date(setup.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {recommendationCards.length > 0 ? (
        <div className="space-y-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {batchDetailCopy.overview.f1Setup.guidanceMemoryEyebrow}
              </p>
              <p className="mt-1 text-sm text-foreground">
                {batchDetailCopy.overview.f1Setup.guidanceMemorySummary(
                  recommendationCards.length
                )}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {batchDetailCopy.overview.f1Setup.appliedCount(acceptedRecommendationIds.length)}
            </div>
          </div>

          <div className="space-y-2">
            {recommendationCards.slice(0, 3).map((cardValue, index) => {
              const card = getJsonRecord(cardValue);

              return (
                <div
                  key={`${getJsonString(card, "id") || index}`}
                  className="rounded-xl border border-primary/10 bg-background p-3"
                >
                  <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    <span>
                      {getJsonString(card, "sourceType") ||
                        batchDetailCopy.overview.f1Setup.savedSource}
                    </span>
                    <span>
                      {getJsonString(card, "confidence") ||
                        batchDetailCopy.overview.f1Setup.savedSource}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {getJsonString(card, "title") ||
                      batchDetailCopy.overview.f1Setup.savedRecommendation}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getJsonString(card, "summary") ||
                      getJsonString(card, "explanation") ||
                      batchDetailCopy.overview.f1Setup.savedSetupSnapshot}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function F2Snapshot({ setup }: { setup: LoadedF2Setup }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
      <div>
        <p className="text-xs text-muted-foreground">
          {batchDetailCopy.overview.f2Snapshot.bottles}
        </p>
        <p className="mt-1 font-medium text-foreground">{setup.bottleCount}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">
          {batchDetailCopy.overview.f2Snapshot.carbonation}
        </p>
        <p className="mt-1 font-medium capitalize text-foreground">
          {setup.desiredCarbonationLevel}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">
          {batchDetailCopy.overview.f2Snapshot.pressureRisk}
        </p>
        <p className="mt-1 font-medium capitalize text-foreground">
          {setup.estimatedPressureRisk || batchDetailCopy.overview.f2Snapshot.unknown}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">
          {batchDetailCopy.overview.f2Snapshot.ambientRoom}
        </p>
        <p className="mt-1 font-medium text-foreground">{setup.ambientTempC}\u00B0C</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">
          {batchDetailCopy.overview.f2Snapshot.recipeSnapshot}
        </p>
        <p className="mt-1 font-medium text-foreground">
          {setup.recipeNameSnapshot || batchDetailCopy.overview.f2Snapshot.savedRecipe}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">
          {batchDetailCopy.overview.f2Snapshot.setupSaved}
        </p>
        <p className="mt-1 font-medium text-foreground">
          {new Date(setup.setupCreatedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

function OverviewSupportingPanel({
  batch,
  outcomes,
  outcomesLoading,
  currentF2Setup,
  onOpenOutcome,
  lineage,
  lineageLoading,
}: {
  batch: KombuchaBatch;
  outcomes: PhaseOutcomeRow[];
  outcomesLoading: boolean;
  currentF2Setup: LoadedF2Setup | null;
  onOpenOutcome: (phase: "f1" | "f2") => void;
  lineage: BatchLineage | null;
  lineageLoading: boolean;
}) {
  const f1Outcome = getOutcomeForPhase(outcomes, "f1");
  const f2Outcome = getOutcomeForPhase(outcomes, "f2");
  const showF1Card = F1_STAGES.includes(batch.currentStage);
  const f2ContextSummary = currentF2Setup
    ? batchDetailCopy.overview.support.f2ContextSummary({
        bottleCount: currentF2Setup.bottleCount,
        desiredCarbonationLevel: currentF2Setup.desiredCarbonationLevel,
        ambientTempC: currentF2Setup.ambientTempC,
      })
    : undefined;

  return (
    <div className="space-y-5">
      {showF1Card && (
        <PhaseOutcomeCard
          phase="f1"
          outcome={f1Outcome}
          loading={outcomesLoading}
          canLogNow={canLogF1Outcome(batch)}
          onAdd={() => onOpenOutcome("f1")}
          onEdit={() => onOpenOutcome("f1")}
        />
      )}
      <PhaseOutcomeCard
        phase="f2"
        outcome={f2Outcome}
        loading={outcomesLoading}
        canLogNow={canLogF2Outcome(batch)}
        contextSummary={f2ContextSummary}
        onAdd={() => onOpenOutcome("f2")}
        onEdit={() => onOpenOutcome("f2")}
      />
      <ScrollReveal delay={0.08}>
        <BatchLineageSection
          lineage={lineage}
          loading={lineageLoading}
          rootBatchId={batch.id}
        />
      </ScrollReveal>
    </div>
  );
}

export function BatchOverviewSurface({
  batch,
  reminders,
  onCompleteReminder,
  timing,
  outcomes,
  outcomesLoading,
  lineage,
  lineageLoading,
  currentF1Setup,
  currentF2Setup,
  onOpenOutcome,
  onStartF2,
  onOpenF2Chapter,
  onStillFermenting,
  actionLoading,
  onStartBrewAgain,
}: {
  batch: KombuchaBatch;
  reminders: BatchReminder[];
  onCompleteReminder: (reminderId: string) => void;
  timing: BatchTimingResult | null;
  outcomes: PhaseOutcomeRow[];
  outcomesLoading: boolean;
  lineage: BatchLineage | null;
  lineageLoading: boolean;
  currentF1Setup: LoadedF1Setup | null;
  currentF2Setup: LoadedF2Setup | null;
  onOpenOutcome: (phase: "f1" | "f2") => void;
  onStartF2: () => Promise<void>;
  onOpenF2Chapter: () => void;
  onStillFermenting: () => Promise<void>;
  actionLoading: WorkflowAction | null;
  onStartBrewAgain: (args: {
    mode: BrewAgainMode;
    plan: BrewAgainPlan;
    enabledSuggestionIds: string[];
  }) => void;
}) {
  const isCompletedLike = batch.status === "completed" || batch.status === "archived";
  const f1Outcome = getOutcomeForPhase(outcomes, "f1");
  const f2Outcome = getOutcomeForPhase(outcomes, "f2");
  const chapterLabel = getCurrentPhaseLabel(batch.currentStage);
  const isF1Stage = F1_STAGES.includes(batch.currentStage);
  const showF2Inline = [
    "f2_setup",
    "f2_active",
    "refrigerate_now",
    "chilled_ready",
    "completed",
    "archived",
  ].includes(batch.currentStage);

  return (
    <div className="space-y-5">
      <BatchJourneyStrip batch={batch} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <BatchReminderPanel
            reminders={reminders}
            onCompleteReminder={onCompleteReminder}
          />

          {isCompletedLike ? (
            <BatchCompletedSummary
              batch={batch}
              f1Outcome={f1Outcome}
              f2Outcome={f2Outcome}
              currentF2Setup={currentF2Setup}
              onStartBrewAgain={onStartBrewAgain}
            />
          ) : (
            <BatchCurrentPhaseCard
              batch={batch}
              timing={timing}
              currentF2Setup={currentF2Setup}
              actionLoading={actionLoading}
              onStartF2={onStartF2}
              onOpenF2Chapter={onOpenF2Chapter}
              onStillFermenting={onStillFermenting}
            />
          )}

          {showF2Inline && (
            <BatchPhaseCollapse
              title={batchDetailCopy.overview.secondFermentation.title(chapterLabel)}
              description={batchDetailCopy.overview.secondFermentation.description}
              defaultOpen={!shouldCollapseChapterByDefault(batch, "second_fermentation")}
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {batchDetailCopy.overview.secondFermentation.chapterEyebrow}
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {batchDetailCopy.overview.secondFermentation.chapterDescription}
                  </p>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
                  {currentF2Setup ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {batchDetailCopy.overview.secondFermentation.savedSummary}
                      </p>
                      <F2Snapshot setup={currentF2Setup} />
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        {batchDetailCopy.overview.secondFermentation.readyTitle}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {batchDetailCopy.overview.secondFermentation.readyDescription}
                      </p>
                    </div>
                  )}

                  <Button type="button" onClick={onOpenF2Chapter}>
                    {currentF2Setup
                      ? batchDetailCopy.overview.secondFermentation.openSaved
                      : batchDetailCopy.overview.secondFermentation.openNew}
                  </Button>
                </div>
              </div>
            </BatchPhaseCollapse>
          )}

          {!isF1Stage && (
            <BatchPhaseCollapse
              title={batchDetailCopy.overview.firstFermentation.title}
              description={batchDetailCopy.overview.firstFermentation.description}
              defaultOpen={!shouldCollapseChapterByDefault(batch, "first_fermentation")}
            >
              <div className="space-y-4">
                {currentF1Setup && (
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {batchDetailCopy.overview.firstFermentation.savedSetup}
                    </p>
                    <div className="mt-3">
                      <F1SetupSnapshot setup={currentF1Setup} />
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {batchDetailCopy.overview.firstFermentation.baseRecipe}
                  </p>
                  <div className="mt-3">
                    <RecipeSnapshot batch={batch} />
                  </div>
                </div>

                {timing && (
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {batchDetailCopy.overview.firstFermentation.timingMemory}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {batchDetailCopy.overview.firstFermentation.tastingWindow({
                        startDay: timing.windowStartDay,
                        endDay: timing.windowEndDay,
                      })}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{timing.explanation}</p>
                  </div>
                )}

                <PhaseOutcomeCard
                  phase="f1"
                  outcome={f1Outcome}
                  loading={outcomesLoading}
                  canLogNow={canLogF1Outcome(batch)}
                  onAdd={() => onOpenOutcome("f1")}
                  onEdit={() => onOpenOutcome("f1")}
                />
              </div>
            </BatchPhaseCollapse>
          )}

          {isF1Stage && currentF1Setup && (
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {batchDetailCopy.overview.firstFermentation.savedSetup}
              </p>
              <div className="mt-3">
                <F1SetupSnapshot setup={currentF1Setup} />
              </div>
            </div>
          )}
        </div>

        <OverviewSupportingPanel
          batch={batch}
          outcomes={outcomes}
          outcomesLoading={outcomesLoading}
          currentF2Setup={currentF2Setup}
          onOpenOutcome={onOpenOutcome}
          lineage={lineage}
          lineageLoading={lineageLoading}
        />
      </div>
    </div>
  );
}
