import type { F1BatchSetupFields } from "@/lib/f1-recipe-types";
import { buildF1SetupSummary } from "@/lib/f1-setup-summary";

type F1SetupSummaryProps = {
  setup: F1BatchSetupFields;
  selectedRecipeName?: string | null;
};

export function F1SetupSummary({
  setup,
  selectedRecipeName,
}: F1SetupSummaryProps) {
  const summary = buildF1SetupSummary(setup);

  return (
    <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Live setup summary
        </p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">
          Review today's F1 setup
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedRecipeName
            ? `Defaults came from ${selectedRecipeName}, but the values below reflect what you are brewing today.`
            : "This summary is based on the actual values you have entered for this batch."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
      </div>

      <div className="rounded-xl border border-primary/10 bg-background p-3">
        <p className="text-xs text-muted-foreground">Plain-language summary</p>
        <p className="mt-1 text-sm text-foreground">{summary.plainLanguageSummary}</p>
      </div>
    </div>
  );
}
