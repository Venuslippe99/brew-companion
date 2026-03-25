import { NewBatchWizardProgress } from "@/components/f1/new-batch-wizard/NewBatchWizardProgress";
import { F1_SUGAR_TYPES, type F1SugarType } from "@/lib/f1-recipe-types";

type SugarStepProps = {
  sugarType: F1SugarType;
  onChange: (value: F1SugarType) => void;
};

export function SugarStep({ sugarType, onChange }: SugarStepProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
      <NewBatchWizardProgress currentStep="sugar" />
      <h2 className="mt-2 text-2xl font-semibold text-foreground">
        What sugar do you want to use?
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Choose the sweetener first. The app will convert the target sweetness into a starting F1
        recommendation next.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {F1_SUGAR_TYPES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
              sugarType === option
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
