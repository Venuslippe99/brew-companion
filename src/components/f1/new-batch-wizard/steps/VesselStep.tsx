import { Button } from "@/components/ui/button";
import { NewBatchWizardProgress } from "@/components/f1/new-batch-wizard/NewBatchWizardProgress";
import {
  getDefaultSuitabilityForMaterial,
  getVesselMaterialLabel,
  getVesselSuitabilityLabel,
  type FermentationVesselDraft,
  type SelectedF1Vessel,
} from "@/lib/f1-vessel-types";
import type { F1VesselFitResult } from "@/lib/f1-vessel-fit";

type VesselStepProps = {
  selectedVessel: SelectedF1Vessel;
  manualVesselDraft: FermentationVesselDraft;
  fit: F1VesselFitResult;
  customExpanded: boolean;
  savingCustomVessel: boolean;
  onChooseSaved: () => void;
  onToggleCustom: () => void;
  onUseCustomToday: () => void;
  onSaveCustom: () => void;
  onUpdateDraft: <K extends keyof FermentationVesselDraft>(
    key: K,
    value: FermentationVesselDraft[K]
  ) => void;
};

export function VesselStep({
  selectedVessel,
  manualVesselDraft,
  fit,
  customExpanded,
  savingCustomVessel,
  onChooseSaved,
  onToggleCustom,
  onUseCustomToday,
  onSaveCustom,
  onUpdateDraft,
}: VesselStepProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/5">
      <NewBatchWizardProgress currentStep="vessel" />
      <h2 className="mt-2 text-2xl font-semibold text-foreground">What are you brewing in?</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Choose the vessel for today so the fit can be checked before the recipe is shown.
      </p>

      <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Current vessel
        </p>
        <p className="mt-1 text-base font-semibold text-foreground">{selectedVessel.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {getVesselMaterialLabel(selectedVessel.materialType)} ·{" "}
          {getVesselSuitabilityLabel(selectedVessel.f1Suitability)}
          {selectedVessel.capacityMl ? ` · ${selectedVessel.capacityMl}ml` : ""}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-border/80 bg-background p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {fit.fitState ? fit.fitState.replace("_", " ") : "Add capacity to check fit"}
          </p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {getVesselSuitabilityLabel(selectedVessel.f1Suitability)}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{fit.plainLanguageSummary}</p>
        {fit.cautionNotes.length > 0 ? (
          <div className="mt-3 space-y-2">
            {fit.cautionNotes.map((note) => (
              <p key={note} className="text-xs text-muted-foreground">
                {note}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onChooseSaved}>
          Choose saved vessel
        </Button>
        <Button type="button" variant="ghost" onClick={onToggleCustom}>
          {customExpanded ? "Hide custom vessel" : "Use a custom vessel"}
        </Button>
      </div>

      {customExpanded ? (
        <div className="mt-4 space-y-4 rounded-2xl border border-border/80 bg-background p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Vessel name</label>
              <input
                type="text"
                value={manualVesselDraft.name}
                onChange={(event) => onUpdateDraft("name", event.target.value)}
                placeholder="4L kitchen jar"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Material</label>
              <select
                value={manualVesselDraft.materialType}
                onChange={(event) => {
                  const materialType =
                    event.target.value as FermentationVesselDraft["materialType"];
                  onUpdateDraft("materialType", materialType);
                  onUpdateDraft("f1Suitability", getDefaultSuitabilityForMaterial(materialType));
                }}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="glass">Glass</option>
                <option value="ceramic_glazed_food_safe">Glazed food-safe ceramic</option>
                <option value="food_grade_plastic">Food-grade plastic</option>
                <option value="unknown_plastic">Unknown plastic</option>
                <option value="stainless_steel">Stainless steel</option>
                <option value="reactive_metal">Reactive metal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Capacity (ml)</label>
              <input
                type="number"
                value={manualVesselDraft.capacityMl ?? ""}
                onChange={(event) =>
                  onUpdateDraft(
                    "capacityMl",
                    event.target.value ? Number(event.target.value) : null
                  )
                }
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Recommended max fill (ml)
              </label>
              <input
                type="number"
                value={manualVesselDraft.recommendedMaxFillMl ?? ""}
                onChange={(event) =>
                  onUpdateDraft(
                    "recommendedMaxFillMl",
                    event.target.value ? Number(event.target.value) : null
                  )
                }
                placeholder="Optional"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onSaveCustom} disabled={savingCustomVessel}>
              {savingCustomVessel ? "Saving..." : "Save to vessel library"}
            </Button>
            <Button type="button" variant="ghost" onClick={onUseCustomToday}>
              Use these details today
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
