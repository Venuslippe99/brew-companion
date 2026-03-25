import { NewBatchWizardProgress } from "@/components/f1/new-batch-wizard/NewBatchWizardProgress";
import { f1NewBatchCopy } from "@/copy/f1-new-batch";
import { F1_TARGET_PREFERENCES, type F1TargetPreference } from "@/lib/f1-recipe-types";

type SweetnessStepProps = {
  targetPreference: F1TargetPreference;
  onChange: (value: F1TargetPreference) => void;
};

export function SweetnessStep({ targetPreference, onChange }: SweetnessStepProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
      <NewBatchWizardProgress currentStep="sweetness" />
      <h2 className="mt-2 text-2xl font-semibold text-foreground">
        {f1NewBatchCopy.steps.sweetness.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {f1NewBatchCopy.steps.sweetness.description}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {F1_TARGET_PREFERENCES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
              targetPreference === option
                ? "border-primary/30 bg-primary/10"
                : "border-border bg-background hover:border-primary/20 hover:bg-primary/5"
            }`}
          >
            <p className="text-sm font-medium capitalize text-foreground">{option}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {f1NewBatchCopy.steps.sweetness.optionDescriptions[option]}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
