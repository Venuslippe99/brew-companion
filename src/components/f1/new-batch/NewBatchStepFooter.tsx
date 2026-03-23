import { Button } from "@/components/ui/button";

type NewBatchStepFooterProps = {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
  helperText?: string;
};

export function NewBatchStepFooter({
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryLoading = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
  helperText,
}: NewBatchStepFooterProps) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t border-border/80 bg-background/95 px-4 pb-safe pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 pb-3">
        {helperText ? (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        ) : null}

        <div className="flex gap-3">
          {secondaryLabel && onSecondary ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={secondaryDisabled || primaryLoading}
              onClick={onSecondary}
            >
              {secondaryLabel}
            </Button>
          ) : null}

          <Button
            type="button"
            size="xl"
            className="flex-[1.4]"
            disabled={primaryDisabled || primaryLoading}
            onClick={onPrimary}
          >
            {primaryLoading ? "Working..." : primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
