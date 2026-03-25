import { StarterSourceSelector } from "@/components/lineage/StarterSourceSelector";
import type { LineageBatchSummary } from "@/lib/lineage";

type VolumeStepProps = {
  totalVolumeMl: number;
  starterSourceOptions: LineageBatchSummary[];
  starterSourceLoading: boolean;
  starterSourceBatchId: string | null;
  recommendedStarterSourceBatchId: string | null;
  onChange: (value: number) => void;
  onStarterSourceChange: (value: string | null) => void;
};

const VOLUME_PRESETS = [
  { label: "2L", value: 2000 },
  { label: "3.8L", value: 3800 },
  { label: "5L", value: 5000 },
  { label: "8L", value: 8000 },
] as const;

export function VolumeStep({
  totalVolumeMl,
  starterSourceOptions,
  starterSourceLoading,
  starterSourceBatchId,
  recommendedStarterSourceBatchId,
  onChange,
  onStarterSourceChange,
}: VolumeStepProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Step 1
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-foreground">
        What final batch size do you want to make?
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        This is your final kombucha amount, including starter. The recipe will be built inside
        that total.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {VOLUME_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
              totalVolumeMl === preset.value
                ? "border-primary/30 bg-primary/10"
                : "border-border bg-background hover:border-primary/20 hover:bg-primary/5"
            }`}
          >
            <p className="text-sm font-medium text-foreground">{preset.label}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 max-w-sm">
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Final batch volume (ml)
        </label>
        <input
          type="number"
          min={1}
          value={totalVolumeMl || ""}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : 0)}
          className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-6 border-t border-border/70 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Optional starter link
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Add this if a previous batch is actually feeding today&apos;s brew. It helps the recipe use
          the right culture line from the beginning.
        </p>

        <div className="mt-4 max-w-2xl">
          <StarterSourceSelector
            options={starterSourceOptions}
            value={starterSourceBatchId}
            loading={starterSourceLoading}
            recommendedBatchId={recommendedStarterSourceBatchId}
            onChange={onStarterSourceChange}
          />
        </div>
      </div>
    </div>
  );
}
