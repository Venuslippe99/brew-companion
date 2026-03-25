import type { F1BatchSetupFields } from "@/lib/f1-recipe-types";
import { buildF1SetupSummary } from "@/lib/f1-setup-summary";
import type { SelectedF1Vessel } from "@/lib/f1-vessel-types";

type F1SetupSummaryProps = {
  setup: F1BatchSetupFields;
  selectedRecipeName?: string | null;
  selectedVessel?: SelectedF1Vessel | null;
};

export function F1SetupSummary({
  setup,
  selectedRecipeName,
  selectedVessel,
}: F1SetupSummaryProps) {
  const summary = buildF1SetupSummary(setup, selectedVessel);

  return (
    <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Batch read
        </p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">
          Today&apos;s batch at a glance
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedRecipeName
            ? `${selectedRecipeName} gave you the starting point, and this shows the batch you are actually about to start today.`
            : "This is the setup you are about to start today."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-xl border border-primary/10 bg-background p-3">
          <p className="text-xs text-muted-foreground">Volume</p>
          <p className="mt-1 text-sm font-medium text-foreground">{setup.totalVolumeMl}ml</p>
        </div>
        <div className="rounded-xl border border-primary/10 bg-background p-3">
          <p className="text-xs text-muted-foreground">Starter</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {setup.starterLiquidMl}ml ({summary.starterRatioPercent}%)
          </p>
        </div>
        <div className="rounded-xl border border-primary/10 bg-background p-3">
          <p className="text-xs text-muted-foreground">Tea profile</p>
          <p className="mt-1 text-sm font-medium text-foreground">{summary.teaProfile}</p>
        </div>
        <div className="rounded-xl border border-primary/10 bg-background p-3">
          <p className="text-xs text-muted-foreground">Sugar profile</p>
          <p className="mt-1 text-sm font-medium text-foreground">{summary.sugarProfile}</p>
        </div>
        <div className="rounded-xl border border-primary/10 bg-background p-3">
          <p className="text-xs text-muted-foreground">Vessel</p>
          <p className="mt-1 text-sm font-medium text-foreground">{summary.vesselProfile}</p>
        </div>
        <div className="rounded-xl border border-primary/10 bg-background p-3">
          <p className="text-xs text-muted-foreground">Fit</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {summary.fitStateLabel || "Needs capacity"}
          </p>
        </div>
      </div>

      {(summary.fitSummary || summary.suitabilityLabel) && selectedVessel ? (
        <div className="rounded-xl border border-primary/10 bg-background p-3 space-y-2">
          <div className="flex flex-wrap gap-2 text-xs">
            {summary.suitabilityLabel ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                {summary.suitabilityLabel}
              </span>
            ) : null}
            {summary.fitStateLabel ? (
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                {summary.fitStateLabel}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-foreground">{summary.fitSummary}</p>
          {summary.cautionNotes.length > 0 ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {summary.cautionNotes.map((note) => (
                <li key={note}>- {note}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-primary/10 bg-background p-3">
        <p className="text-xs text-muted-foreground">Quick read</p>
        <p className="mt-1 text-sm text-foreground">{summary.plainLanguageSummary}</p>
      </div>
    </div>
  );
}
