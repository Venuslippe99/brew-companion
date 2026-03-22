import { BrewAgainLauncher } from "@/components/brew-again/BrewAgainLauncher";
import type { BrewAgainPlan, BrewAgainMode } from "@/lib/brew-again-types";
import { getPhaseOutcomeLabel } from "@/lib/phase-outcome-options";
import type { KombuchaBatch } from "@/lib/batches";
import type { LoadedF2Setup } from "@/lib/f2-current-setup";
import type { PhaseOutcomeRow } from "@/lib/phase-outcomes";

function SummaryBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/50 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function BatchCompletedSummary({
  batch,
  f1Outcome,
  f2Outcome,
  currentF2Setup,
  onStartBrewAgain,
}: {
  batch: KombuchaBatch;
  f1Outcome?: PhaseOutcomeRow;
  f2Outcome?: PhaseOutcomeRow;
  currentF2Setup: LoadedF2Setup | null;
  onStartBrewAgain: (args: {
    mode: BrewAgainMode;
    plan: BrewAgainPlan;
    enabledSuggestionIds: string[];
  }) => void;
}) {
  const nextTimeIdeas = [f1Outcome?.next_time_change, f2Outcome?.next_time_change].filter(
    Boolean
  ) as string[];

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Results summary
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-foreground">
            This batch has reached the reflection chapter
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Look back on how the base brew felt, how the finished drink turned out, and what you would carry into the next run.
          </p>
        </div>

        <div className="shrink-0">
          <BrewAgainLauncher
            batch={batch}
            f1Outcome={f1Outcome}
            f2Outcome={f2Outcome}
            currentF2Setup={currentF2Setup}
            onContinue={onStartBrewAgain}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <SummaryBlock
          label="First Fermentation"
          value={
            f1Outcome
              ? `${getPhaseOutcomeLabel(f1Outcome.f1_taste_state)} • ${getPhaseOutcomeLabel(f1Outcome.f1_readiness)}`
              : "No F1 reflection saved yet"
          }
        />
        <SummaryBlock
          label="Finished batch"
          value={
            f2Outcome
              ? `${getPhaseOutcomeLabel(f2Outcome.f2_overall_result)} • ${getPhaseOutcomeLabel(f2Outcome.f2_brew_again)}`
              : "No finished-batch reflection saved yet"
          }
        />
      </div>

      {nextTimeIdeas.length > 0 && (
        <div className="mt-5 rounded-2xl border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            What to change next time
          </p>
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            {nextTimeIdeas.map((idea) => (
              <li key={idea} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
