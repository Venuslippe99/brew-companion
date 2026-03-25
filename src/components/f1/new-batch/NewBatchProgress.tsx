import { cn } from "@/lib/utils";

export type NewBatchProgressItem = {
  id: string;
  label: string;
  shortLabel: string;
};

export type NewBatchProgressState = {
  status?: "blocked" | "warning" | "complete" | "ready" | "upcoming";
  detail?: string;
  disabled?: boolean;
};

type NewBatchProgressProps = {
  items: NewBatchProgressItem[];
  currentStepId: string;
  itemStates?: Record<string, NewBatchProgressState>;
  onSelect?: (stepId: string) => void;
};

export function NewBatchProgress({
  items,
  currentStepId,
  itemStates = {},
  onSelect,
}: NewBatchProgressProps) {
  const currentIndex = items.findIndex((item) => item.id === currentStepId);

  function getStatusLabel(status: NewBatchProgressState["status"], isCurrent: boolean) {
    if (isCurrent) {
      return "Current";
    }

    switch (status) {
      case "blocked":
        return "Fix";
      case "warning":
        return "Check";
      case "complete":
        return "Done";
      case "ready":
        return "Ready";
      default:
        return "Next";
    }
  }

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
          const itemState = itemStates[item.id];
          const isBlocked = itemState?.status === "blocked";
          const isWarning = itemState?.status === "warning";
          const isReady = itemState?.status === "ready";

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (!itemState?.disabled) {
                  onSelect?.(item.id);
                }
              }}
              disabled={itemState?.disabled}
              className={cn(
                "rounded-2xl border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                isCurrent
                  ? "border-primary/30 bg-primary/10"
                  : isBlocked
                    ? "border-amber-300/70 bg-amber-50"
                    : isWarning
                      ? "border-honey/50 bg-honey-light/70"
                      : isComplete
                    ? "border-sage/25 bg-sage-light/60"
                    : isReady
                      ? "border-primary/15 bg-primary/5"
                    : "border-border bg-background",
                !onSelect && "cursor-default"
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {index + 1}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{item.shortLabel}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {getStatusLabel(itemState?.status, isCurrent)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
