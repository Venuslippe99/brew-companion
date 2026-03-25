import { Button } from "@/components/ui/button";
import { NewBatchWizardProgress } from "@/components/f1/new-batch-wizard/NewBatchWizardProgress";
import type { F1BatchSetupFields } from "@/lib/f1-recipe-types";

type FinalizeStepProps = {
  metadata: {
    name: string;
    brewDate: string;
    initialNotes: string;
    initialPh: string;
  };
  setup: F1BatchSetupFields | null;
  onMetadataChange: (
    key: "name" | "brewDate" | "initialNotes" | "initialPh",
    value: string
  ) => void;
  onSaveRecipe: () => void;
};

export function FinalizeStep({
  metadata,
  setup,
  onMetadataChange,
  onSaveRecipe,
}: FinalizeStepProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
        <NewBatchWizardProgress currentStep="finalize" />
        <h2 className="mt-2 text-2xl font-semibold text-foreground">
          Final details and start batch
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add the last details, then start the batch.
        </p>

        {setup ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Recipe:{" "}
            <span className="text-foreground">
              {setup.totalVolumeMl}ml, {setup.teaAmountValue}g {setup.teaType.toLowerCase()},{" "}
              {setup.sugarG}g {setup.sugarType.toLowerCase()}, {setup.starterLiquidMl}ml starter.
            </span>
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Batch name</label>
              <input
                type="text"
                value={metadata.name}
                onChange={(event) => onMetadataChange("name", event.target.value)}
                placeholder="Saturday black tea batch"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Brew date</label>
              <input
                type="date"
                value={metadata.brewDate}
                onChange={(event) => onMetadataChange("brewDate", event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Setup notes (optional)
              </label>
              <textarea
                rows={4}
                value={metadata.initialNotes}
                onChange={(event) => onMetadataChange("initialNotes", event.target.value)}
                placeholder="Anything worth noting about this brew day."
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Initial pH (optional)
              </label>
              <input
                type="number"
                step="0.1"
                value={metadata.initialPh}
                onChange={(event) => onMetadataChange("initialPh", event.target.value)}
                placeholder="Optional"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Save this setup for later</h3>
            <p className="mt-1 text-sm text-muted-foreground">Optional.</p>
          </div>
          <Button type="button" variant="outline" onClick={onSaveRecipe}>
            Save as recipe
          </Button>
        </div>
      </div>
    </div>
  );
}
