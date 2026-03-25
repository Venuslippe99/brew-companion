type VolumeStepProps = {
  totalVolumeMl: number;
  onChange: (value: number) => void;
};

const VOLUME_PRESETS = [
  { label: "2L", value: 2000 },
  { label: "3.8L", value: 3800 },
  { label: "5L", value: 5000 },
  { label: "8L", value: 8000 },
] as const;

export function VolumeStep({ totalVolumeMl, onChange }: VolumeStepProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Step 1
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-foreground">
        How much kombucha do you want to brew?
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Pick the total amount you want to make today. Everything else will scale from this.
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
        <label className="mb-1.5 block text-sm font-medium text-foreground">Total volume (ml)</label>
        <input
          type="number"
          min={1}
          value={totalVolumeMl || ""}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : 0)}
          className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}
