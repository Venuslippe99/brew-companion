import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { getPhaseOutcomeLabel } from "@/lib/phase-outcome-options";
import type { PhaseOutcomeRow } from "@/lib/phase-outcomes";

type PhaseOutcomeCardProps = {
  phase: "f1" | "f2";
  outcome?: PhaseOutcomeRow;
  loading?: boolean;
  canLogNow: boolean;
  contextSummary?: string;
  onAdd: () => void;
  onEdit: () => void;
};

function getPhaseCopy(phase: "f1" | "f2") {
  if (phase === "f1") {
    return {
      title: "F1 Outcome",
      missingNow: "Capture how the base kombucha felt before or around the move into F2.",
      missingLater: "You can log this once the batch reaches the F1 tasting or transition point.",
      noteTitle: "F1 note",
      changeTitle: "Change next time in F1",
      primaryLabel: "Taste state",
      secondaryLabel: "Readiness",
      primaryValueKey: "f1_taste_state" as const,
      secondaryValueKey: "f1_readiness" as const,
      addLabel: "Log F1 outcome",
      editLabel: "Edit F1 outcome",
    };
  }

  return {
    title: "F2 Outcome",
    missingNow: "Capture how the finished batch turned out after chilling or completion.",
    missingLater: "You can log this once the batch reaches chilled ready or completed.",
    noteTitle: "F2 note",
    changeTitle: "Change next time in F2",
    primaryLabel: "Overall result",
    secondaryLabel: "Brew again",
    primaryValueKey: "f2_overall_result" as const,
    secondaryValueKey: "f2_brew_again" as const,
    addLabel: "Log F2 outcome",
    editLabel: "Edit F2 outcome",
  };
}

export function PhaseOutcomeCard({
  phase,
  outcome,
  loading = false,
  canLogNow,
  contextSummary,
  onAdd,
  onEdit,
}: PhaseOutcomeCardProps) {
  const copy = getPhaseCopy(phase);
  const primaryValue = outcome?.[copy.primaryValueKey];
  const secondaryValue = outcome?.[copy.secondaryValueKey];

  return (
    <ScrollReveal delay={0.07}>
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              {copy.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {outcome
                ? "Saved as a quick memory for this batch."
                : canLogNow
                  ? copy.missingNow
                  : copy.missingLater}
            </p>
          </div>

          {outcome ? (
            <Button variant="outline" size="sm" onClick={onEdit}>
              {copy.editLabel}
            </Button>
          ) : canLogNow ? (
            <Button size="sm" onClick={onAdd}>
              {copy.addLabel}
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Loading outcome...</p>
          </div>
        ) : outcome ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{copy.primaryLabel}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {getPhaseOutcomeLabel(primaryValue)}
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{copy.secondaryLabel}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {getPhaseOutcomeLabel(secondaryValue)}
                </p>
              </div>
            </div>

            {outcome.selected_tags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Tags</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {outcome.selected_tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {getPhaseOutcomeLabel(tag)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {outcome.note && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">{copy.noteTitle}</p>
                <p className="mt-1 text-sm text-foreground">{outcome.note}</p>
              </div>
            )}

            {outcome.next_time_change && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">{copy.changeTitle}</p>
                <p className="mt-1 text-sm text-foreground">{outcome.next_time_change}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-border p-4">
              <p className="text-sm text-muted-foreground">
                {canLogNow
                  ? "No outcome saved yet."
                  : "This quick log is not relevant for the batch stage yet."}
              </p>
            </div>

            {contextSummary && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Saved context</p>
                <p className="mt-1 text-sm text-foreground">{contextSummary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}
