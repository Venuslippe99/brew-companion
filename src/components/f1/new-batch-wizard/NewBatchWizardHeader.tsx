import { FlaskConical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NewBatchWizardMode } from "@/components/f1/new-batch-wizard/types";

type NewBatchWizardHeaderProps = {
  mode: NewBatchWizardMode;
  recipeName?: string | null;
  brewAgainName?: string | null;
  onExit: () => void;
};

function getModeBadge(args: {
  mode: NewBatchWizardMode;
  recipeName?: string | null;
  brewAgainName?: string | null;
}) {
  if (args.mode === "recipe" && args.recipeName) {
    return `Saved recipe: ${args.recipeName}`;
  }

  if (args.mode === "brew_again" && args.brewAgainName) {
    return `Brew again: ${args.brewAgainName}`;
  }

  return "Starting from scratch";
}

export function NewBatchWizardHeader({
  mode,
  recipeName,
  brewAgainName,
  onExit,
}: NewBatchWizardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <FlaskConical className="h-5 w-5 text-primary" />
        </div>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Start a new batch
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Set up today&apos;s first fermentation one question at a time.
              </p>
              <span className="rounded-full border border-border/80 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {getModeBadge({ mode, recipeName, brewAgainName })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Button type="button" variant="ghost" size="icon" onClick={onExit} aria-label="Exit setup">
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
}
