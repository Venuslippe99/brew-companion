import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  F1_READINESS_OPTIONS,
  F1_TAG_OPTIONS,
  F1_TASTE_STATE_OPTIONS,
  F2_BREW_AGAIN_OPTIONS,
  F2_OVERALL_RESULT_OPTIONS,
  F2_TAG_OPTIONS,
  getPhaseOutcomeLabel,
} from "@/lib/phase-outcome-options";
import type {
  F1PhaseOutcomeInput,
  F2PhaseOutcomeInput,
  PhaseOutcomeRow,
} from "@/lib/phase-outcomes";

type PhaseOutcomeDrawerProps = {
  phase: "f1" | "f2";
  open: boolean;
  saving?: boolean;
  contextSummary?: string;
  initialOutcome?: PhaseOutcomeRow;
  onOpenChange: (open: boolean) => void;
  onSave: (input: F1PhaseOutcomeInput | F2PhaseOutcomeInput) => Promise<void>;
};

type DraftState = {
  tasteState: string;
  readiness: string;
  overallResult: string;
  brewAgain: string;
  selectedTags: string[];
  note: string;
  nextTimeChange: string;
};

function buildDraft(phase: "f1" | "f2", initialOutcome?: PhaseOutcomeRow): DraftState {
  return {
    tasteState: phase === "f1" ? initialOutcome?.f1_taste_state || "" : "",
    readiness: phase === "f1" ? initialOutcome?.f1_readiness || "" : "",
    overallResult: phase === "f2" ? initialOutcome?.f2_overall_result || "" : "",
    brewAgain: phase === "f2" ? initialOutcome?.f2_brew_again || "" : "",
    selectedTags: initialOutcome?.selected_tags || [],
    note: initialOutcome?.note || "",
    nextTimeChange: initialOutcome?.next_time_change || "",
  };
}

export function PhaseOutcomeDrawer({
  phase,
  open,
  saving = false,
  contextSummary,
  initialOutcome,
  onOpenChange,
  onSave,
}: PhaseOutcomeDrawerProps) {
  const [draft, setDraft] = useState<DraftState>(buildDraft(phase, initialOutcome));

  useEffect(() => {
    if (open) {
      setDraft(buildDraft(phase, initialOutcome));
    }
  }, [open, phase, initialOutcome]);

  const tagOptions = phase === "f1" ? F1_TAG_OPTIONS : F2_TAG_OPTIONS;
  const title = phase === "f1" ? "Log F1 outcome" : "Log F2 outcome";
  const description =
    phase === "f1"
      ? "Save a quick memory of how the base kombucha felt before or around the F1 to F2 decision."
      : "Save a quick memory of how the finished batch turned out after chilling or completion.";

  const canSave =
    phase === "f1"
      ? !!draft.tasteState && !!draft.readiness
      : !!draft.overallResult && !!draft.brewAgain;

  const toggleTag = (value: string) => {
    setDraft((current) => {
      if (current.selectedTags.includes(value)) {
        return {
          ...current,
          selectedTags: current.selectedTags.filter((tag) => tag !== value),
        };
      }

      if (current.selectedTags.length >= 2) {
        return current;
      }

      return {
        ...current,
        selectedTags: [...current.selectedTags, value],
      };
    });
  };

  const handleSave = async () => {
    if (!canSave) return;

    if (phase === "f1") {
      await onSave({
        phase: "f1",
        tasteState: draft.tasteState as F1PhaseOutcomeInput["tasteState"],
        readiness: draft.readiness as F1PhaseOutcomeInput["readiness"],
        selectedTags: draft.selectedTags as F1PhaseOutcomeInput["selectedTags"],
        note: draft.note,
        nextTimeChange: draft.nextTimeChange,
      });
      return;
    }

    await onSave({
      phase: "f2",
      overallResult: draft.overallResult as F2PhaseOutcomeInput["overallResult"],
      brewAgain: draft.brewAgain as F2PhaseOutcomeInput["brewAgain"],
      selectedTags: draft.selectedTags as F2PhaseOutcomeInput["selectedTags"],
      note: draft.note,
      nextTimeChange: draft.nextTimeChange,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-5 overflow-y-auto px-4 pb-2">
          {phase === "f2" && contextSummary && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Saved F2 setup</p>
              <p className="mt-1 text-sm text-foreground">{contextSummary}</p>
            </div>
          )}

          {phase === "f1" ? (
            <>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">How did F1 taste?</span>
                <select
                  value={draft.tasteState}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, tasteState: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose one</option>
                  {F1_TASTE_STATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Did it feel ready for the next step?</span>
                <select
                  value={draft.readiness}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, readiness: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose one</option>
                  {F1_READINESS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">How did the finished batch turn out overall?</span>
                <select
                  value={draft.overallResult}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, overallResult: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose one</option>
                  {F2_OVERALL_RESULT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Would you brew it again?</span>
                <select
                  value={draft.brewAgain}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, brewAgain: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose one</option>
                  {F2_BREW_AGAIN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Tags</span>
              <span className="text-xs text-muted-foreground">
                Pick up to 2
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {tagOptions.map((option) => {
                const selected = draft.selectedTags.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleTag(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-sm text-muted-foreground">
              {phase === "f1" ? "What would you change next time in F1?" : "What would you change next time in F2?"}
            </span>
            <Input
              value={draft.nextTimeChange}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  nextTimeChange: event.target.value,
                }))
              }
              placeholder={phase === "f1" ? "Example: taste a day earlier" : "Example: reduce fruit and chill sooner"}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-muted-foreground">
              {phase === "f1" ? "Optional F1 note" : "Optional F2 note"}
            </span>
            <Textarea
              value={draft.note}
              onChange={(event) =>
                setDraft((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="Keep this short and practical."
            />
          </label>

          {draft.selectedTags.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Selected tags</p>
              <p className="mt-1 text-sm text-foreground">
                {draft.selectedTags.map((tag) => getPhaseOutcomeLabel(tag)).join(", ")}
              </p>
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave || saving}>
            {saving ? "Saving..." : "Save outcome"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
