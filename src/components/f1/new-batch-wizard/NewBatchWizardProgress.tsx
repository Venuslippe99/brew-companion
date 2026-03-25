import {
  NEW_BATCH_WIZARD_STEPS,
  type NewBatchWizardStepId,
} from "@/components/f1/new-batch-wizard/types";

type NewBatchWizardProgressProps = {
  currentStep: NewBatchWizardStepId;
};

export function NewBatchWizardProgress({ currentStep }: NewBatchWizardProgressProps) {
  const currentIndex = NEW_BATCH_WIZARD_STEPS.findIndex((step) => step.id === currentStep);

  return (
    <div className="rounded-3xl border border-border/80 bg-card/95 p-4 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Guided setup
          </p>
          <p className="mt-1 text-sm text-foreground">
            Step {currentIndex + 1} of {NEW_BATCH_WIZARD_STEPS.length}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {NEW_BATCH_WIZARD_STEPS[currentIndex]?.label}
        </p>
      </div>

      <div className="mt-4 flex gap-2">
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
