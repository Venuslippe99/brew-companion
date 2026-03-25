import {
  type NewBatchWizardStepId,
} from "@/components/f1/new-batch-wizard/types";
import { f1NewBatchCopy } from "@/copy/f1-new-batch";
import { cn } from "@/lib/utils";

type NewBatchWizardProgressProps = {
  currentStep: NewBatchWizardStepId;
  className?: string;
};

export function NewBatchWizardProgress({
  currentStep,
  className,
}: NewBatchWizardProgressProps) {
  const currentIndex = f1NewBatchCopy.progress.stepOrder.findIndex((step) => step.id === currentStep);
  const currentLabel = f1NewBatchCopy.progress.stepOrder[currentIndex]?.label;
  const totalSteps = f1NewBatchCopy.progress.stepOrder.length;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {f1NewBatchCopy.progress.stepCounter(currentIndex + 1, totalSteps)}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {currentLabel}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {Math.round(((currentIndex + 1) / totalSteps) * 100)}%
        </p>
      </div>

      <div className="flex gap-1.5">
        {f1NewBatchCopy.progress.stepOrder.map((step, index) => (
          <div
            key={step.id}
            className={`h-2 flex-1 rounded-full ${
              index < currentIndex
                ? "bg-primary/60"
                : index === currentIndex
                  ? "bg-primary"
                  : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
