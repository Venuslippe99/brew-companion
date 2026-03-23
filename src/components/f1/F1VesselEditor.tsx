import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FERMENTATION_VESSEL_MATERIALS,
  F1_VESSEL_SUITABILITY_STATES,
  getDefaultSuitabilityForMaterial,
  getVesselMaterialLabel,
  getVesselSuitabilityLabel,
  type FermentationVesselDraft,
} from "@/lib/f1-vessel-types";

type F1VesselEditorProps = {
  draft: FermentationVesselDraft;
  saving?: boolean;
  submitLabel: string;
  onChange: (nextDraft: FermentationVesselDraft) => void;
  onSubmit: () => void;
};

export function F1VesselEditor({
  draft,
  saving = false,
  submitLabel,
  onChange,
  onSubmit,
}: F1VesselEditorProps) {
  const update = <K extends keyof FermentationVesselDraft>(
    key: K,
    value: FermentationVesselDraft[K]
  ) => {
    onChange({
      ...draft,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="f1-vessel-name">Vessel name</Label>
          <Input
            id="f1-vessel-name"
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="e.g. 4L kitchen jar"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-vessel-material">Material</Label>
          <select
            id="f1-vessel-material"
            value={draft.materialType}
            onChange={(event) => {
              const materialType = event.target.value as FermentationVesselDraft["materialType"];
              onChange({
                ...draft,
                materialType,
                f1Suitability: getDefaultSuitabilityForMaterial(materialType),
              });
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {FERMENTATION_VESSEL_MATERIALS.map((option) => (
              <option key={option} value={option}>
                {getVesselMaterialLabel(option)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-vessel-suitability">F1 suitability</Label>
          <select
            id="f1-vessel-suitability"
            value={draft.f1Suitability}
            onChange={(event) =>
              update("f1Suitability", event.target.value as FermentationVesselDraft["f1Suitability"])
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {F1_VESSEL_SUITABILITY_STATES.map((option) => (
              <option key={option} value={option}>
                {getVesselSuitabilityLabel(option)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-vessel-capacity">Capacity (ml)</Label>
          <Input
            id="f1-vessel-capacity"
            type="number"
            value={draft.capacityMl ?? ""}
            onChange={(event) =>
              update("capacityMl", event.target.value ? Number(event.target.value) : null)
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-vessel-max-fill">Recommended max fill (ml)</Label>
          <Input
            id="f1-vessel-max-fill"
            type="number"
            value={draft.recommendedMaxFillMl ?? ""}
            onChange={(event) =>
              update(
                "recommendedMaxFillMl",
                event.target.value ? Number(event.target.value) : null
              )
            }
            placeholder="Optional"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => update("isFavorite", !draft.isFavorite)}
        className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
          draft.isFavorite
            ? "border-primary/30 bg-primary/5 text-primary"
            : "border-border bg-background text-muted-foreground"
        }`}
      >
        {draft.isFavorite ? "Favorite vessel" : "Mark as favorite"}
      </button>

      <div className="space-y-2">
        <Label htmlFor="f1-vessel-notes">Notes</Label>
        <Textarea
          id="f1-vessel-notes"
          value={draft.notes}
          onChange={(event) => update("notes", event.target.value)}
          placeholder="Optional notes about cloth cover, size, or how you use this vessel."
          className="min-h-[88px]"
        />
      </div>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={saving || !draft.name.trim()}
        className="w-full"
      >
        {saving ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
}
