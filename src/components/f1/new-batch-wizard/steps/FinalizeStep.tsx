import { Button } from "@/components/ui/button";
import { NewBatchWizardProgress } from "@/components/f1/new-batch-wizard/NewBatchWizardProgress";
import { f1NewBatchCopy } from "@/copy/f1-new-batch";
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
          {f1NewBatchCopy.steps.finalize.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {f1NewBatchCopy.steps.finalize.description}
        </p>

        {setup ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Recipe:{" "}
            <span className="text-foreground">
              {f1NewBatchCopy.steps.finalize.recipeSummary(setup)}
            </span>
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {f1NewBatchCopy.steps.finalize.fields.batchName}
              </label>
              <input
                type="text"
                value={metadata.name}
                onChange={(event) => onMetadataChange("name", event.target.value)}
                placeholder={f1NewBatchCopy.steps.finalize.fields.batchNamePlaceholder}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {f1NewBatchCopy.steps.finalize.fields.brewDate}
              </label>
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
                {f1NewBatchCopy.steps.finalize.fields.setupNotes}
              </label>
              <textarea
                rows={4}
                value={metadata.initialNotes}
                onChange={(event) => onMetadataChange("initialNotes", event.target.value)}
                placeholder={f1NewBatchCopy.steps.finalize.fields.setupNotesPlaceholder}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {f1NewBatchCopy.steps.finalize.fields.initialPh}
              </label>
              <input
                type="number"
                step="0.1"
                value={metadata.initialPh}
                onChange={(event) => onMetadataChange("initialPh", event.target.value)}
                placeholder={f1NewBatchCopy.steps.finalize.fields.optional}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {f1NewBatchCopy.steps.finalize.save.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {f1NewBatchCopy.steps.finalize.save.description}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onSaveRecipe}>
            {f1NewBatchCopy.steps.finalize.save.action}
          </Button>
        </div>
      </div>
    </div>
  );
}
