import { cn } from "@/lib/utils";

export type NewBatchProgressItem = {
  id: string;
  label: string;
  shortLabel: string;
};

type NewBatchProgressProps = {
  items: NewBatchProgressItem[];
  currentStepId: string;
  onSelect?: (stepId: string) => void;
};

export function NewBatchProgress({
  items,
  currentStepId,
  onSelect,
}: NewBatchProgressProps) {
  const currentIndex = items.findIndex((item) => item.id === currentStepId);

  return (
    <div className="rounded-3xl border border-border bg-card/95 p-4 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Batch setup
          </p>
          <p className="mt-1 text-sm text-foreground">
            Step {currentIndex + 1} of {items.length}
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {items[currentIndex]?.label}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {items.map((item, index) => {
          const isCurrent = item.id === currentStepId;
          const isComplete = index < currentIndex;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect?.(item.id)}
              className={cn(
                "rounded-2xl border px-3 py-2 text-left transition-colors",
                isCurrent
                  ? "border-primary/30 bg-primary/10"
                  : isComplete
                    ? "border-sage/25 bg-sage-light/60"
                    : "border-border bg-background",
                !onSelect && "cursor-default"
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {index + 1}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{item.shortLabel}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
