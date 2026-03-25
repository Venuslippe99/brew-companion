import {
  NEW_BATCH_WIZARD_STEPS,
  type NewBatchWizardStepId,
} from "@/components/f1/new-batch-wizard/types";
import { cn } from "@/lib/utils";

type NewBatchWizardProgressProps = {
  currentStep: NewBatchWizardStepId;
  className?: string;
};

export function NewBatchWizardProgress({
  currentStep,
  className,
}: NewBatchWizardProgressProps) {
  const currentIndex = NEW_BATCH_WIZARD_STEPS.findIndex((step) => step.id === currentStep);
  const currentLabel = NEW_BATCH_WIZARD_STEPS[currentIndex]?.label;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Step {currentIndex + 1} of {NEW_BATCH_WIZARD_STEPS.length}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {currentLabel}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {Math.round(((currentIndex + 1) / NEW_BATCH_WIZARD_STEPS.length) * 100)}%
        </p>
      </div>

      <div className="flex gap-1.5">
        {NEW_BATCH_WIZARD_STEPS.map((step, index) => (
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
