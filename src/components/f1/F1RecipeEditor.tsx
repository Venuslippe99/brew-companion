import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  F1_SUGAR_AMOUNT_UNITS,
  F1_SUGAR_TYPES,
  F1_TARGET_PREFERENCES,
  F1_TEA_AMOUNT_UNITS,
  F1_TEA_SOURCE_FORMS,
  F1_TEA_TYPES,
  type F1RecipeDraft,
} from "@/lib/f1-recipe-types";
import type { FermentationVesselSummary } from "@/lib/f1-vessel-types";

type F1RecipeEditorProps = {
  draft: F1RecipeDraft;
  saving?: boolean;
  submitLabel: string;
  availableVessels?: FermentationVesselSummary[];
  onManageVessels?: () => void;
  onChange: (nextDraft: F1RecipeDraft) => void;
  onSubmit: () => void;
};

const teaSourceFormLabels: Record<F1RecipeDraft["teaSourceForm"], string> = {
  tea_bags: "Tea bags",
  loose_leaf: "Loose leaf",
  other: "Other",
};

export function F1RecipeEditor({
  draft,
  saving = false,
  submitLabel,
  availableVessels = [],
  onManageVessels,
  onChange,
  onSubmit,
}: F1RecipeEditorProps) {
  const update = <K extends keyof F1RecipeDraft>(key: K, value: F1RecipeDraft[K]) => {
    onChange({
      ...draft,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="f1-recipe-name">Recipe name</Label>
          <Input
            id="f1-recipe-name"
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="e.g. House Black Tea Base"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="f1-recipe-description">Description</Label>
          <Textarea
            id="f1-recipe-description"
            value={draft.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Optional notes about when you like to use this recipe."
            className="min-h-[88px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-recipe-volume">Target volume (ml)</Label>
          <Input
            id="f1-recipe-volume"
            type="number"
            value={draft.targetTotalVolumeMl}
            onChange={(event) => update("targetTotalVolumeMl", Number(event.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-recipe-preference">Taste target</Label>
          <select
            id="f1-recipe-preference"
            value={draft.targetPreference}
            onChange={(event) =>
              update("targetPreference", event.target.value as F1RecipeDraft["targetPreference"])
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {F1_TARGET_PREFERENCES.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-recipe-tea-type">Tea type</Label>
          <select
            id="f1-recipe-tea-type"
            value={draft.teaType}
            onChange={(event) => update("teaType", event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {F1_TEA_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-recipe-tea-form">Tea source form</Label>
          <select
            id="f1-recipe-tea-form"
            value={draft.teaSourceForm}
            onChange={(event) =>
              update("teaSourceForm", event.target.value as F1RecipeDraft["teaSourceForm"])
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {F1_TEA_SOURCE_FORMS.map((option) => (
              <option key={option} value={option}>
                {teaSourceFormLabels[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-recipe-tea-amount">Tea amount</Label>
          <Input
            id="f1-recipe-tea-amount"
            type="number"
            step="0.1"
            value={draft.teaAmountValue}
            onChange={(event) => update("teaAmountValue", Number(event.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-recipe-tea-unit">Tea amount unit</Label>
          <select
            id="f1-recipe-tea-unit"
            value={draft.teaAmountUnit}
            onChange={(event) =>
              update("teaAmountUnit", event.target.value as F1RecipeDraft["teaAmountUnit"])
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {F1_TEA_AMOUNT_UNITS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-recipe-sugar-type">Sugar type</Label>
          <select
            id="f1-recipe-sugar-type"
            value={draft.sugarType}
            onChange={(event) => update("sugarType", event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {F1_SUGAR_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-recipe-sugar-amount">Sugar amount</Label>
          <Input
            id="f1-recipe-sugar-amount"
            type="number"
            step="1"
            value={draft.sugarAmountValue}
            onChange={(event) => update("sugarAmountValue", Number(event.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-recipe-sugar-unit">Sugar unit</Label>
          <select
            id="f1-recipe-sugar-unit"
            value={draft.sugarAmountUnit}
            onChange={(event) =>
              update("sugarAmountUnit", event.target.value as F1RecipeDraft["sugarAmountUnit"])
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {F1_SUGAR_AMOUNT_UNITS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-recipe-starter">Starter liquid (ml)</Label>
          <Input
            id="f1-recipe-starter"
            type="number"
            value={draft.defaultStarterLiquidMl}
            onChange={(event) =>
              update("defaultStarterLiquidMl", Number(event.target.value))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="f1-recipe-temp">Default room temperature (C)</Label>
          <Input
            id="f1-recipe-temp"
            type="number"
            step="0.5"
            value={draft.defaultRoomTempC ?? ""}
            onChange={(event) =>
              update(
                "defaultRoomTempC",
                event.target.value ? Number(event.target.value) : null
              )
            }
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="f1-recipe-vessel">Preferred vessel</Label>
            {onManageVessels ? (
              <Button type="button" variant="ghost" size="sm" onClick={onManageVessels}>
                View vessels
              </Button>
            ) : null}
          </div>
          <select
            id="f1-recipe-vessel"
            value={draft.preferredVesselId || ""}
            onChange={(event) =>
              update("preferredVesselId", event.target.value || null)
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">No preferred vessel</option>
            {availableVessels.map((vessel) => (
              <option key={vessel.id} value={vessel.id}>
                {vessel.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            This only sets a starting vessel for the recipe. You can still choose a different
            vessel for any batch.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((value) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => update("defaultScobyPresent", value)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                draft.defaultScobyPresent === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {value ? "SCOBY default: Yes" : "SCOBY default: No"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => update("isFavorite", !draft.isFavorite)}
          className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
            draft.isFavorite
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-border bg-background text-muted-foreground"
          }`}
        >
          {draft.isFavorite ? "Saved as a favorite" : "Mark as favorite"}
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="f1-recipe-default-notes">Default notes</Label>
        <Textarea
          id="f1-recipe-default-notes"
          value={draft.defaultNotes}
          onChange={(event) => update("defaultNotes", event.target.value)}
          placeholder="Optional notes to prefill when you use this recipe."
          className="min-h-[88px]"
        />
      </div>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={saving || !draft.name.trim()}
        className="w-full"
      >
        {saving ? "Saving recipe..." : submitLabel}
      </Button>
    </div>
  );
}
