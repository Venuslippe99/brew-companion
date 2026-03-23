import type { ComponentProps } from "react";
import { BrewAgainLauncher } from "@/components/brew-again/BrewAgainLauncher";
import { BatchHeroQuickActions } from "@/components/batch-detail/BatchHeroQuickActions";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import type {
  BatchReminder,
} from "@/lib/batch-detail-view";
import { getHeroCopy, getStageTone } from "@/lib/batch-detail-view";
import type { BatchTimingResult } from "@/lib/batch-timing";
import type { KombuchaBatch } from "@/lib/batches";
import type { LoadedF2Setup } from "@/lib/f2-current-setup";
import type { PhaseOutcomeRow } from "@/lib/phase-outcomes";

export function BatchDetailHero({
  batch,
  dayNumber,
  timing,
  reminders,
  currentF2Setup,
  f1Outcome,
  f2Outcome,
  canLogTasteTest,
  photoSupported,
  onAddNote,
  onAddTasteTest,
  onStartBrewAgain,
}: {
  batch: KombuchaBatch;
  dayNumber: number;
  timing: BatchTimingResult | null;
  reminders: BatchReminder[];
  currentF2Setup: LoadedF2Setup | null;
  f1Outcome?: PhaseOutcomeRow;
  f2Outcome?: PhaseOutcomeRow;
  canLogTasteTest: boolean;
  photoSupported: boolean;
  onAddNote: () => void;
  onAddTasteTest: () => void;
  onStartBrewAgain: ComponentProps<typeof BrewAgainLauncher>["onContinue"];
}) {
  const heroCopy = getHeroCopy({
    batch,
    timing,
    reminders,
    currentF2Setup,
    f1Outcome,
    f2Outcome,
  });

  return (
    <ScrollReveal>
      <section className={`rounded-[28px] border p-5 lg:p-6 ${getStageTone(batch.cautionLevel)}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              {heroCopy.eyebrow}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-foreground lg:text-4xl">
              {heroCopy.title}
            </h1>
            <p className="mt-2 text-sm font-medium text-foreground/80">{batch.name}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground lg:text-base">
              {heroCopy.summary}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StageIndicator stage={batch.currentStage} size="md" />
              <CautionBadge level={batch.cautionLevel} />
              {heroCopy.helperChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {chip}
                </span>
              ))}
            </div>

            {batch.status !== "completed" && batch.status !== "archived" && (
              <div className="mt-4">
                <BatchHeroQuickActions
                  canLogTasteTest={canLogTasteTest}
                  photoSupported={photoSupported}
                  onAddNote={onAddNote}
                  onAddTasteTest={onAddTasteTest}
                />
              </div>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-4xl font-display font-bold leading-none text-foreground tabular-nums lg:text-5xl">
              {dayNumber}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {dayNumber === 1 ? "Day" : "Days"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {heroCopy.nextStepLabel}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground lg:text-base">
              {heroCopy.nextStepText}
            </p>
            {timing && (
              <p className="mt-2 text-xs text-muted-foreground">
                {timing.statusLabel}. {timing.nextCheckText}.
              </p>
            )}
          </div>

          {(batch.status === "completed" || batch.status === "archived") ? (
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Brew Again
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Carry the useful parts of this batch forward without repeating the same mistakes.
              </p>
              <div className="mt-3">
                <BrewAgainLauncher
                  batch={batch}
                  f1Outcome={f1Outcome}
                  f2Outcome={f2Outcome}
                  currentF2Setup={currentF2Setup}
                  onContinue={onStartBrewAgain}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Why Kombloom is nudging you
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {timing?.explanation ||
                  "The guidance here follows your saved stage, brew timing, and reminders, so you can stay calm and focus on the next useful check."}
              </p>
            </div>
          )}
        </div>
      </section>
    </ScrollReveal>
  );
}
