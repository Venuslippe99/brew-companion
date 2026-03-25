import { NewBatchWizardProgress } from "@/components/f1/new-batch-wizard/NewBatchWizardProgress";
import { f1NewBatchCopy } from "@/copy/f1-new-batch";

type TemperatureStepProps = {
  avgRoomTempC: number;
  onChange: (value: number) => void;
};

export function TemperatureStep({ avgRoomTempC, onChange }: TemperatureStepProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
      <NewBatchWizardProgress currentStep="temperature" />
      <h2 className="mt-2 text-2xl font-semibold text-foreground">
        {f1NewBatchCopy.steps.temperature.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {f1NewBatchCopy.steps.temperature.description}
      </p>

      <div className="mt-6 max-w-sm">
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {f1NewBatchCopy.steps.temperature.averageRoomTemp}
        </label>
        <input
          type="number"
          value={avgRoomTempC || ""}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : 0)}
          className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}
