import { FlaskConical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NewBatchWizardMode } from "@/components/f1/new-batch-wizard/types";

type NewBatchWizardHeaderProps = {
  mode: NewBatchWizardMode;
  recipeName?: string | null;
  brewAgainName?: string | null;
  onExit: () => void;
  onChooseRecipe: () => void;
  onChooseScratch: () => void;
  onChooseBrewAgain?: () => void;
};

function getModeCopy(args: {
  mode: NewBatchWizardMode;
  recipeName?: string | null;
  brewAgainName?: string | null;
}) {
  if (args.mode === "recipe" && args.recipeName) {
    return `Starting from ${args.recipeName}. You can still change every answer before you brew.`;
  }

  if (args.mode === "brew_again" && args.brewAgainName) {
    return `Starting from ${args.brewAgainName}. This keeps the wizard focused on what you are making today.`;
  }

  return "Answer the core questions first. The recipe comes after that.";
}

export function NewBatchWizardHeader({
  mode,
  recipeName,
  brewAgainName,
  onExit,
  onChooseRecipe,
  onChooseScratch,
  onChooseBrewAgain,
}: NewBatchWizardHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Start a new batch
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up today&apos;s first fermentation one question at a time.
            </p>
          </div>
        </div>

        <Button type="button" variant="ghost" size="icon" onClick={onExit} aria-label="Exit setup">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Starting point
            </p>
            <p className="mt-1 text-sm text-foreground">
              {getModeCopy({ mode, recipeName, brewAgainName })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {mode !== "scratch" ? (
              <Button type="button" variant="outline" onClick={onChooseScratch}>
                Start from scratch
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onChooseRecipe}>
              Use saved recipe
            </Button>
            {onChooseBrewAgain ? (
              <Button type="button" variant="ghost" onClick={onChooseBrewAgain}>
                Use brew again
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
