import { Button } from "@/components/ui/button";
import { NewBatchWizardProgress } from "@/components/f1/new-batch-wizard/NewBatchWizardProgress";
import { f1NewBatchCopy } from "@/copy/f1-new-batch";
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
      <h2 className="mt-2 text-2xl font-semibold text-foreground">
        {f1NewBatchCopy.steps.vessel.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {f1NewBatchCopy.steps.vessel.description}
      </p>

      <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {f1NewBatchCopy.steps.vessel.currentVessel}
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
            {f1NewBatchCopy.steps.vessel.fitStatus(fit.fitState)}
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
          {f1NewBatchCopy.steps.vessel.actions.chooseSaved}
        </Button>
        <Button type="button" variant="ghost" onClick={onToggleCustom}>
          {customExpanded
            ? f1NewBatchCopy.steps.vessel.actions.hideCustom
            : f1NewBatchCopy.steps.vessel.actions.useCustom}
        </Button>
      </div>

      {customExpanded ? (
        <div className="mt-4 space-y-4 rounded-2xl border border-border/80 bg-background p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {f1NewBatchCopy.steps.vessel.fields.vesselName}
              </label>
              <input
                type="text"
                value={manualVesselDraft.name}
                onChange={(event) => onUpdateDraft("name", event.target.value)}
                placeholder={f1NewBatchCopy.steps.vessel.fields.vesselNamePlaceholder}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {f1NewBatchCopy.steps.vessel.fields.material}
              </label>
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
                <option value="glass">{f1NewBatchCopy.steps.vessel.fields.materials.glass}</option>
                <option value="ceramic_glazed_food_safe">
                  {f1NewBatchCopy.steps.vessel.fields.materials.ceramic_glazed_food_safe}
                </option>
                <option value="food_grade_plastic">
                  {f1NewBatchCopy.steps.vessel.fields.materials.food_grade_plastic}
                </option>
                <option value="unknown_plastic">
                  {f1NewBatchCopy.steps.vessel.fields.materials.unknown_plastic}
                </option>
                <option value="stainless_steel">
                  {f1NewBatchCopy.steps.vessel.fields.materials.stainless_steel}
                </option>
                <option value="reactive_metal">
                  {f1NewBatchCopy.steps.vessel.fields.materials.reactive_metal}
                </option>
                <option value="other">{f1NewBatchCopy.steps.vessel.fields.materials.other}</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {f1NewBatchCopy.steps.vessel.fields.capacity}
              </label>
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
                {f1NewBatchCopy.steps.vessel.fields.maxFill}
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
                placeholder={f1NewBatchCopy.steps.vessel.fields.optional}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onSaveCustom} disabled={savingCustomVessel}>
              {savingCustomVessel
                ? f1NewBatchCopy.steps.vessel.actions.saving
                : f1NewBatchCopy.steps.vessel.actions.saveToLibrary}
            </Button>
            <Button type="button" variant="ghost" onClick={onUseCustomToday}>
              {f1NewBatchCopy.steps.vessel.actions.useToday}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
