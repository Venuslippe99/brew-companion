import { FlaskConical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NewBatchWizardMode } from "@/components/f1/new-batch-wizard/types";
import { f1NewBatchCopy } from "@/copy/f1-new-batch";

type NewBatchWizardHeaderProps = {
  mode: NewBatchWizardMode;
  recipeName?: string | null;
  brewAgainName?: string | null;
  onExit: () => void;
};

export function NewBatchWizardHeader({
  mode,
  recipeName,
  brewAgainName,
  onExit,
}: NewBatchWizardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/85 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
          <FlaskConical className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {f1NewBatchCopy.header.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border/80 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {f1NewBatchCopy.header.modeBadge({ mode, recipeName, brewAgainName })}
            </span>
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onExit}
        aria-label={f1NewBatchCopy.header.exitAriaLabel}
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
}
