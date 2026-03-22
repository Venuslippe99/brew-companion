import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPhaseOutcomeLabel } from "@/lib/phase-outcome-options";
import { buildBrewAgainPlan } from "@/lib/brew-again";
import type {
  BrewAgainMode,
  BrewAgainPlan,
} from "@/lib/brew-again-types";
import type { KombuchaBatch } from "@/lib/batches";
import type { LoadedF2Setup } from "@/lib/f2-current-setup";
import type { PhaseOutcomeRow } from "@/lib/phase-outcomes";

type BrewAgainLauncherProps = {
  batch: KombuchaBatch;
  f1Outcome?: PhaseOutcomeRow;
  f2Outcome?: PhaseOutcomeRow;
  currentF2Setup?: LoadedF2Setup | null;
  onContinue: (args: {
    mode: BrewAgainMode;
    plan: BrewAgainPlan;
    enabledSuggestionIds: string[];
  }) => void;
};

function OutcomeSummary({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="mt-2 space-y-1">
        {lines.map((line) => (
          <p key={line} className="text-sm text-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function buildOutcomeLines(
  phase: "f1" | "f2",
  outcome?: PhaseOutcomeRow,
  currentF2Setup?: LoadedF2Setup | null
) {
  if (!outcome) {
    return phase === "f1"
      ? ["No F1 outcome was saved for this batch."]
      : currentF2Setup
        ? [
            "No F2 outcome was saved for this batch.",
            `${currentF2Setup.bottleCount} bottles with ${currentF2Setup.desiredCarbonationLevel} carbonation were set up.`,
          ]
        : ["No F2 outcome was saved for this batch."];
  }

  if (phase === "f1") {
    return [
      `Taste: ${getPhaseOutcomeLabel(outcome.f1_taste_state)}`,
      `Readiness: ${getPhaseOutcomeLabel(outcome.f1_readiness)}`,
      ...(outcome.selected_tags.length > 0
        ? [`Tags: ${outcome.selected_tags.map(getPhaseOutcomeLabel).join(", ")}`]
        : []),
      ...(outcome.next_time_change
        ? [`Next time: ${outcome.next_time_change}`]
        : []),
    ];
  }

  return [
    `Overall result: ${getPhaseOutcomeLabel(outcome.f2_overall_result)}`,
    `Brew again: ${getPhaseOutcomeLabel(outcome.f2_brew_again)}`,
    ...(outcome.selected_tags.length > 0
      ? [`Tags: ${outcome.selected_tags.map(getPhaseOutcomeLabel).join(", ")}`]
      : []),
    ...(outcome.next_time_change
      ? [`Next time: ${outcome.next_time_change}`]
      : []),
    ...(currentF2Setup
      ? [
          `${currentF2Setup.bottleCount} bottles at ${currentF2Setup.ambientTempC}°C with ${currentF2Setup.desiredCarbonationLevel} carbonation.`,
        ]
      : []),
  ];
}

function ModeCard({
  mode,
  title,
  description,
  selected,
  recommended,
  onSelect,
}: {
  mode: BrewAgainMode;
  title: string;
  description: string;
  selected: boolean;
  recommended: boolean;
  onSelect: (mode: BrewAgainMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:bg-muted"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {recommended && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            Recommended
          </span>
        )}
      </div>
    </button>
  );
}

export function BrewAgainLauncher({
  batch,
  f1Outcome,
  f2Outcome,
  currentF2Setup,
  onContinue,
}: BrewAgainLauncherProps) {
  const [open, setOpen] = useState(false);
  const plan = useMemo(
    () =>
      buildBrewAgainPlan({
        batch,
        f1Outcome,
        f2Outcome,
        currentF2Setup,
      }),
    [batch, f1Outcome, f2Outcome, currentF2Setup]
  );
  const [mode, setMode] = useState<BrewAgainMode>(plan.defaultMode);
  const [enabledSuggestionIds, setEnabledSuggestionIds] = useState<string[]>(
    plan.suggestions
      .filter((suggestion) => suggestion.defaultEnabled)
      .map((suggestion) => suggestion.id)
  );

  const defaultEnabledSuggestionIds = plan.suggestions
    .filter((suggestion) => suggestion.defaultEnabled)
    .map((suggestion) => suggestion.id);

  const recommendationMatches = (candidate: BrewAgainMode) =>
    candidate === plan.defaultMode;

  return (
    <>
      <Button variant="outline" onClick={() => {
        setMode(plan.defaultMode);
        setEnabledSuggestionIds(defaultEnabledSuggestionIds);
        setOpen(true);
      }}>
        Brew Again
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Brew Again</DialogTitle>
            <DialogDescription>
              Review what happened in F1 and F2 before you start the next batch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">{plan.headline}</p>
              <p className="mt-1 text-sm text-muted-foreground">{plan.explanation}</p>
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lineage handoff
              </p>
              <p className="mt-2 text-sm text-foreground">
                Continuing from here will always mark the next batch as brewed from {batch.name}.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                On the next screen, you can separately keep, change, or clear whether this batch is also the starter source.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <OutcomeSummary
                title="F1 Outcome"
                lines={buildOutcomeLines("f1", f1Outcome)}
              />
              <OutcomeSummary
                title="F2 Outcome"
                lines={buildOutcomeLines("f2", f2Outcome, currentF2Setup)}
              />
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pick a restart mode
              </p>
              <div className="mt-3 space-y-3">
                <ModeCard
                  mode="repeat_exactly"
                  title="Repeat exactly"
                  description="Reuse the same saved setup without applying outcome-based changes."
                  selected={mode === "repeat_exactly"}
                  recommended={recommendationMatches("repeat_exactly")}
                  onSelect={setMode}
                />
                <ModeCard
                  mode="repeat_with_changes"
                  title="Repeat with suggested changes"
                  description="Start from the same setup, but review a small list of outcome-aware adjustments."
                  selected={mode === "repeat_with_changes"}
                  recommended={recommendationMatches("repeat_with_changes")}
                  onSelect={setMode}
                />
                <ModeCard
                  mode="edit_manually"
                  title="Start from this batch and edit manually"
                  description="Use this batch as your starting point, then make your own changes before creating."
                  selected={mode === "edit_manually"}
                  recommended={recommendationMatches("edit_manually")}
                  onSelect={setMode}
                />
              </div>
            </div>

            {plan.suggestions.length > 0 && (
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Suggested changes
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      These come from the saved F1 and F2 outcomes. You can turn them on or off before creating the next batch.
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {enabledSuggestionIds.length} selected
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  {plan.suggestions.map((suggestion) => {
                    const selected = enabledSuggestionIds.includes(suggestion.id);
                    const toggleDisabled = mode !== "repeat_with_changes";

                    return (
                      <button
                        key={suggestion.id}
                        type="button"
                        disabled={toggleDisabled}
                        onClick={() => {
                          setEnabledSuggestionIds((current) =>
                            current.includes(suggestion.id)
                              ? current.filter((id) => id !== suggestion.id)
                              : [...current, suggestion.id]
                          );
                        }}
                        className={`w-full rounded-xl border p-3 text-left transition-colors ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background"
                        } ${toggleDisabled ? "cursor-default opacity-80" : "hover:bg-muted"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {suggestion.summary}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {suggestion.reason}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                              {suggestion.phase}
                            </span>
                            <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {suggestion.effectType === "prefill_patch"
                                ? "Prefill"
                                : "Advisory"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {mode !== "repeat_with_changes" && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Suggestion toggles turn on when you choose Repeat with suggested changes.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onContinue({
                  mode,
                  plan,
                  enabledSuggestionIds:
                    mode === "repeat_with_changes" ? enabledSuggestionIds : [],
                });
                setOpen(false);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
