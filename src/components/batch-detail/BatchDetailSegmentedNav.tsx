import { cn } from "@/lib/utils";
import type { BatchSurface } from "@/lib/batch-detail-view";

const surfaces: Array<{ value: BatchSurface; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "journal", label: "Journal" },
  { value: "assistant", label: "Assistant" },
];

export function BatchDetailSegmentedNav({
  activeSurface,
  onChange,
}: {
  activeSurface: BatchSurface;
  onChange: (surface: BatchSurface) => void;
}) {
  return (
    <div className="rounded-2xl bg-muted p-1">
      <div className="grid grid-cols-3 gap-1">
        {surfaces.map((surface) => (
          <button
            key={surface.value}
            type="button"
            onClick={() => onChange(surface.value)}
            className={cn(
              "rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              activeSurface === surface.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {surface.label}
          </button>
        ))}
      </div>
    </div>
  );
}
