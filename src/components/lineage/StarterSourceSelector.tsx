import { getStageLabel } from "@/lib/batches";
import type { LineageBatchSummary } from "@/lib/lineage";

type StarterSourceSelectorProps = {
  options: LineageBatchSummary[];
  value: string | null;
  loading: boolean;
  recommendedBatchId?: string | null;
  onChange: (value: string | null) => void;
};

function formatBatchMeta(batch: LineageBatchSummary) {
  const stageLabel = getStageLabel(batch.currentStage);
  const statusLabel =
    batch.status === "active" ? "Active" : batch.status.charAt(0).toUpperCase() + batch.status.slice(1);

  return `${stageLabel} · ${statusLabel}`;
}

export function StarterSourceSelector({
  options,
  value,
  loading,
  recommendedBatchId,
  onChange,
}: StarterSourceSelectorProps) {
  const selectedBatch = options.find((option) => option.id === value) || null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Starter culture for this brew</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Link a previous batch only if its starter liquid or culture is actually feeding this brew
          today.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Which batch is feeding this brew?
        </label>
        <select
          value={value || ""}
          onChange={(event) => onChange(event.target.value || null)}
          disabled={loading}
          className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none disabled:opacity-70"
        >
          <option value="">No linked starter batch</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
              {option.id === recommendedBatchId ? " (best match)" : ""}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground">
          Loading past batches you can link here...
        </p>
      )}

      {!loading && options.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No previous batches are in a clearly reusable stage yet, so the app is keeping this brew
          on the conservative side for now.
        </p>
      )}

      {selectedBatch && (
        <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{selectedBatch.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatBatchMeta(selectedBatch)}
              </p>
            </div>
            {selectedBatch.id === recommendedBatchId && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                Best match
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            This gives the recipe a real culture line to work from if your tea, sugar, or starter
            choices change from the last linked batch.
          </p>
        </div>
      )}
    </div>
  );
}
