import { Button } from "@/components/ui/button";
import { f1NewBatchCopy } from "@/copy/f1-new-batch";

type NewBatchWizardFooterProps = {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  helperText?: string;
  onBack?: () => void;
  backDisabled?: boolean;
};

export function NewBatchWizardFooter({
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryLoading = false,
  helperText,
  onBack,
  backDisabled = false,
}: NewBatchWizardFooterProps) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-border/80 bg-background/95 px-4 pb-safe pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 pb-3">
        {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}

        <div className="flex gap-3">
          {onBack ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={backDisabled || primaryLoading}
              onClick={onBack}
            >
              {f1NewBatchCopy.footer.back}
            </Button>
          ) : null}
          <Button
            type="button"
            className="flex-[1.4]"
            disabled={primaryDisabled || primaryLoading}
            onClick={onPrimary}
          >
            {primaryLoading ? f1NewBatchCopy.footer.working : primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
