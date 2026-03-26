import { Button } from "@/components/ui/button";
import { NewBatchWizardProgress } from "@/components/f1/new-batch-wizard/NewBatchWizardProgress";
import type { NewBatchWizardMode } from "@/components/f1/new-batch-wizard/types";
import { StarterSourceSelector } from "@/components/lineage/StarterSourceSelector";
import { f1NewBatchCopy } from "@/copy/f1-new-batch";
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
    <div className="surface-section-elevated p-6">
      <NewBatchWizardProgress currentStep="volume" />
      <h2 className="mt-2 text-2xl font-semibold text-foreground">{f1NewBatchCopy.steps.volume.title}</h2>
      <p className="mt-2 max-w-2xl type-helper">{f1NewBatchCopy.steps.volume.description}</p>

      <div className="surface-utility mt-5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="type-stat-label">
              {f1NewBatchCopy.steps.volume.startingPoint.eyebrow}
            </p>
            <p className="mt-1 text-sm text-foreground">
              {f1NewBatchCopy.steps.volume.startingPoint.summary({
                mode,
                recipeName,
                brewAgainName,
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {mode !== "scratch" ? (
              <Button type="button" variant="outline" size="sm" onClick={onChooseScratch}>
                {f1NewBatchCopy.steps.volume.startingPoint.startFromScratch}
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={onChooseRecipe}>
              {f1NewBatchCopy.steps.volume.startingPoint.useSavedRecipe}
            </Button>
            {onChooseBrewAgain ? (
              <Button type="button" variant="ghost" size="sm" onClick={onChooseBrewAgain}>
                {f1NewBatchCopy.steps.volume.startingPoint.useBrewAgain}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {f1NewBatchCopy.steps.volume.presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={`surface-list-compact surface-interactive px-4 py-3 text-left transition-colors ${
              totalVolumeMl === preset.value
                ? "border-primary/30 bg-primary/10 shadow-none"
                : "hover:border-primary/20 hover:bg-primary/5"
            }`}
          >
            <p className="text-sm font-medium text-foreground">{preset.label}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 max-w-sm">
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {f1NewBatchCopy.steps.volume.fields.finalBatchVolume}
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
        <p className="type-stat-label">
          {f1NewBatchCopy.steps.volume.starterLink.eyebrow}
        </p>
        <p className="mt-2 max-w-2xl type-helper">
          {f1NewBatchCopy.steps.volume.starterLink.description}
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
