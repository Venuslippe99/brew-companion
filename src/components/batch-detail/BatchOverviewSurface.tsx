import F2SetupWizard from "@/components/f2/F2SetupWizard";
import { BatchLineageSection } from "@/components/lineage/BatchLineageSection";
import { PhaseOutcomeCard } from "@/components/outcomes/PhaseOutcomeCard";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { BatchJourneyStrip } from "@/components/batch-detail/BatchJourneyStrip";
import { BatchReminderPanel } from "@/components/batch-detail/BatchReminderPanel";
import { BatchCurrentPhaseCard } from "@/components/batch-detail/BatchCurrentPhaseCard";
import { BatchPhaseCollapse } from "@/components/batch-detail/BatchPhaseCollapse";
import { BatchCompletedSummary } from "@/components/batch-detail/BatchCompletedSummary";
import type { BrewAgainPlan, BrewAgainMode } from "@/lib/brew-again-types";
import {
  getCurrentPhaseLabel,
  shouldCollapseChapterByDefault,
  type BatchReminder,
} from "@/lib/batch-detail-view";
import type { BatchTimingResult } from "@/lib/batch-timing";
import type { BatchStage, BatchStatus, KombuchaBatch } from "@/lib/batches";
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
    ["Tea", batch.teaType],
    ["Sugar", `${batch.sugarG}g`],
    ["Starter", `${batch.starterLiquidMl}ml`],
    ["Volume", `${(batch.totalVolumeMl / 1000).toFixed(1)}L`],
    ["Vessel", batch.vesselType],
    ["Target", batch.targetPreference.replace(/_/g, " ")],
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
          <p className="text-xs text-muted-foreground">Setup origin</p>
          <p className="mt-1 font-medium capitalize text-foreground">
            {getJsonString(recipeContext, "origin") || "scratch"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Recipe snapshot</p>
          <p className="mt-1 font-medium text-foreground">
            {getJsonString(recipeContext, "recipeNameSnapshot") || "No linked recipe"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vessel snapshot</p>
          <p className="mt-1 font-medium text-foreground">
            {getJsonString(vesselContext, "vesselNameSnapshot") || "Manual vessel"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Fit state</p>
          <p className="mt-1 font-medium capitalize text-foreground">
            {(getJsonString(fitContext, "fitState") || "unknown").replace(/_/g, " ")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Fill ratio</p>
          <p className="mt-1 font-medium text-foreground">
            {getJsonNumber(fitContext, "fillRatioPercent") !== null
              ? `${getJsonNumber(fitContext, "fillRatioPercent")}%`
              : "Not calculated"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Setup saved</p>
          <p className="mt-1 font-medium text-foreground">
            {new Date(setup.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {recommendationCards.length > 0 ? (
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Setup-time guidance memory
              </p>
              <p className="mt-1 text-sm text-foreground">
                Kombloom saved {recommendationCards.length} recommendation
                {recommendationCards.length === 1 ? "" : "s"} when this batch was created.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {acceptedRecommendationIds.length} applied
            </div>
          </div>

          <div className="space-y-2">
            {recommendationCards.slice(0, 3).map((cardValue, index) => {
              const card = getJsonRecord(cardValue);

              return (
                <div key={`${getJsonString(card, "id") || index}`} className="rounded-xl border border-primary/10 bg-background p-3">
                  <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    <span>{getJsonString(card, "sourceType") || "saved"}</span>
                    <span>{getJsonString(card, "confidence") || "saved"}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {getJsonString(card, "title") || "Saved recommendation"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getJsonString(card, "summary") || getJsonString(card, "explanation") || "Saved with the F1 setup snapshot."}
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
        <p className="text-xs text-muted-foreground">Bottles</p>
        <p className="mt-1 font-medium text-foreground">{setup.bottleCount}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Carbonation</p>
        <p className="mt-1 font-medium capitalize text-foreground">
          {setup.desiredCarbonationLevel}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Pressure risk</p>
        <p className="mt-1 font-medium capitalize text-foreground">
          {setup.estimatedPressureRisk || "Unknown"}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Ambient room</p>
        <p className="mt-1 font-medium text-foreground">{setup.ambientTempC}°C</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Recipe snapshot</p>
        <p className="mt-1 font-medium text-foreground">
          {setup.recipeNameSnapshot || "Saved recipe"}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Setup saved</p>
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
    ? `${currentF2Setup.bottleCount} bottles planned with ${currentF2Setup.desiredCarbonationLevel} carbonation at ${currentF2Setup.ambientTempC}°C.`
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
  userId,
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
  onStillFermenting,
  actionLoading,
  onF2Started,
  onBatchStateChanged,
  onStartBrewAgain,
}: {
  batch: KombuchaBatch;
  userId?: string;
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
  onStillFermenting: () => Promise<void>;
  actionLoading: WorkflowAction | null;
  onF2Started: (args: { f2StartedAt: string; nextAction: string }) => void;
  onBatchStateChanged: (args: {
    currentStage: BatchStage;
    updatedAt: string;
    nextAction: string;
    status: BatchStatus;
    completedAt?: string;
  }) => void;
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
              onStillFermenting={onStillFermenting}
            />
          )}

          {showF2Inline && (
            <BatchPhaseCollapse
              title={`Inside ${chapterLabel}`}
              description="This chapter keeps the bottle plan, flavour setup, and live F2 actions in the main brewing journey instead of sending you to a utility tab."
              defaultOpen={!shouldCollapseChapterByDefault(batch, "second_fermentation")}
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Second Fermentation chapter
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    Use this section to set up bottles, follow carbonation progress, and keep the flavour plan attached to the same batch story.
                  </p>
                </div>

                <F2SetupWizard
                  batch={batch}
                  userId={userId}
                  onF2Started={onF2Started}
                  onBatchStateChanged={onBatchStateChanged}
                />
              </div>
            </BatchPhaseCollapse>
          )}

          {!isF1Stage && (
            <BatchPhaseCollapse
              title="First Fermentation memory"
              description="Keep the base recipe, timing window, and F1 reflection close by without letting old details crowd the current chapter."
              defaultOpen={!shouldCollapseChapterByDefault(batch, "first_fermentation")}
            >
              <div className="space-y-4">
                {currentF1Setup && (
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Saved First Fermentation setup
                    </p>
                    <div className="mt-3">
                      <F1SetupSnapshot setup={currentF1Setup} />
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Base recipe
                  </p>
                  <div className="mt-3">
                    <RecipeSnapshot batch={batch} />
                  </div>
                </div>

                {timing && (
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      First Fermentation timing memory
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      Tasting window: Day {timing.windowStartDay}-{timing.windowEndDay}
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
                Saved First Fermentation setup
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
