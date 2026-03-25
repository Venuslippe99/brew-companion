import { NewBatchWizardProgress } from "@/components/f1/new-batch-wizard/NewBatchWizardProgress";
import { f1NewBatchCopy } from "@/copy/f1-new-batch";
import { F1_TEA_TYPES, type F1TeaType } from "@/lib/f1-recipe-types";

type TeaStepProps = {
  teaType: F1TeaType;
  onChange: (value: F1TeaType) => void;
};

export function TeaStep({ teaType, onChange }: TeaStepProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
      <NewBatchWizardProgress currentStep="tea" />
      <h2 className="mt-2 text-2xl font-semibold text-foreground">
        {f1NewBatchCopy.steps.tea.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {f1NewBatchCopy.steps.tea.description}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {F1_TEA_TYPES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
              teaType === option
                ? "border-primary/30 bg-primary/10"
                : "border-border bg-background hover:border-primary/20 hover:bg-primary/5"
            }`}
          >
            <p className="text-sm font-medium text-foreground">{option}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
