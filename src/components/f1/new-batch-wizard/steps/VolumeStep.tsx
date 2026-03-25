import { Button } from "@/components/ui/button";
import { NewBatchWizardProgress } from "@/components/f1/new-batch-wizard/NewBatchWizardProgress";
import type { NewBatchWizardMode } from "@/components/f1/new-batch-wizard/types";
import { StarterSourceSelector } from "@/components/lineage/StarterSourceSelector";
import type { LineageBatchSummary } from "@/lib/lineage";

type VolumeStepProps = {
  mode: NewBatchWizardMode;
  recipeName?: string | null;
  brewAgainName?: string | null;
  totalVolumeMl: number;
  starterSourceOptions: LineageBatchSummary[];
  starterSourceLoading: boolean;
  starterSourceBatchId: string | null;
  recommendedStarterSourceBatchId: string | null;
  onChange: (value: number) => void;
  onStarterSourceChange: (value: string | null) => void;
  onChooseRecipe: () => void;
  onChooseScratch: () => void;
  onChooseBrewAgain?: () => void;
};

const VOLUME_PRESETS = [
  { label: "2L", value: 2000 },
  { label: "3.8L", value: 3800 },
  { label: "5L", value: 5000 },
  { label: "8L", value: 8000 },
] as const;

export function VolumeStep({
  mode,
  recipeName,
  brewAgainName,
  totalVolumeMl,
  starterSourceOptions,
  starterSourceLoading,
  starterSourceBatchId,
  recommendedStarterSourceBatchId,
  onChange,
  onStarterSourceChange,
  onChooseRecipe,
  onChooseScratch,
  onChooseBrewAgain,
}: VolumeStepProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
      <NewBatchWizardProgress currentStep="volume" />
      <h2 className="mt-2 text-2xl font-semibold text-foreground">
        What final batch size do you want to make?
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        This is your final kombucha amount, including starter. The recipe will be built inside
        that total.
      </p>

      <div className="mt-5 rounded-2xl border border-border/80 bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Starting point
            </p>
            <p className="mt-1 text-sm text-foreground">
              {mode === "recipe" && recipeName
                ? `Using ${recipeName} as the starting point.`
                : mode === "brew_again" && brewAgainName
                  ? `Using ${brewAgainName} as the starting point.`
                  : "Starting from scratch."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {mode !== "scratch" ? (
              <Button type="button" variant="outline" size="sm" onClick={onChooseScratch}>
                Start from scratch
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={onChooseRecipe}>
              Use saved recipe
            </Button>
            {onChooseBrewAgain ? (
              <Button type="button" variant="ghost" size="sm" onClick={onChooseBrewAgain}>
                Use brew again
              </Button>
            ) : null}
          </div>
        </div>
      </div>

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
