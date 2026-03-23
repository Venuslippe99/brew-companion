import { Button } from "@/components/ui/button";
import {
  getVesselMaterialLabel,
  getVesselSuitabilityLabel,
  type FermentationVesselSummary,
} from "@/lib/f1-vessel-types";

type F1VesselCardProps = {
  vessel: FermentationVesselSummary;
  compact?: boolean;
  onSelect?: (vessel: FermentationVesselSummary) => void;
  onEdit?: (vessel: FermentationVesselSummary) => void;
  onDuplicate?: (vessel: FermentationVesselSummary) => void;
  onArchiveToggle?: (vessel: FermentationVesselSummary) => void;
  onFavoriteToggle?: (vessel: FermentationVesselSummary) => void;
  onDelete?: (vessel: FermentationVesselSummary) => void;
};

export function F1VesselCard({
  vessel,
  compact = false,
  onSelect,
  onEdit,
  onDuplicate,
  onArchiveToggle,
  onFavoriteToggle,
  onDelete,
}: F1VesselCardProps) {
  const archived = !!vessel.archivedAt;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{vessel.name}</h3>
            {vessel.isFavorite ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                Favorite
              </span>
            ) : null}
            {archived ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Archived
              </span>
            ) : null}
          </div>
          {vessel.notes ? (
            <p className="mt-1 text-sm text-muted-foreground">{vessel.notes}</p>
          ) : null}
        </div>

        {onSelect ? (
          <Button type="button" size="sm" onClick={() => onSelect(vessel)}>
            Use vessel
          </Button>
        ) : null}
      </div>

      <div className={`mt-4 grid gap-3 text-sm ${compact ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}>
        <div>
          <p className="text-muted-foreground">Material</p>
          <p className="font-medium text-foreground">
            {getVesselMaterialLabel(vessel.materialType)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Capacity</p>
          <p className="font-medium text-foreground">
            {vessel.capacityMl ? `${vessel.capacityMl}ml` : "Not set"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Recommended fill</p>
          <p className="font-medium text-foreground">
            {vessel.recommendedMaxFillMl ? `${vessel.recommendedMaxFillMl}ml` : "Use capacity"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Suitability</p>
          <p className="font-medium text-foreground">
            {getVesselSuitabilityLabel(vessel.f1Suitability)}
          </p>
        </div>
      </div>

      {!compact && (onEdit || onDuplicate || onArchiveToggle || onFavoriteToggle || onDelete) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {onEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(vessel)}>
              Edit
            </Button>
          ) : null}
          {onDuplicate ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onDuplicate(vessel)}>
              Duplicate
            </Button>
          ) : null}
          {onFavoriteToggle ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFavoriteToggle(vessel)}
            >
              {vessel.isFavorite ? "Unfavorite" : "Favorite"}
            </Button>
          ) : null}
          {onArchiveToggle ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onArchiveToggle(vessel)}
            >
              {archived ? "Restore" : "Archive"}
            </Button>
          ) : null}
          {onDelete ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onDelete(vessel)}>
              Delete
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
