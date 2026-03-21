import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { KombuchaBatch } from "@/lib/batches";
import type {
  F2BottleGroupDraft,
  F2RecipeItemDraft,
  F2CarbonationLevel,
} from "@/lib/f2-types";
import { calculateF2SetupSummary } from "@/lib/f2-planner";

type F2SetupWizardProps = {
  batch: KombuchaBatch;
};

function makeBottleGroup(): F2BottleGroupDraft {
  return {
    id: crypto.randomUUID(),
    bottleCount: 4,
    bottleSizeMl: 500,
    bottleType: "swing_top",
    headspaceMl: 20,
    groupLabel: "",
  };
}

function makeRecipeItem(): F2RecipeItemDraft {
  return {
    id: crypto.randomUUID(),
    customIngredientName: "",
    ingredientForm: "juice",
    amountPer500: 40,
    unit: "ml",
    prepNotes: "",
    displacesVolume: false,
  };
}

export default function F2SetupWizard({ batch }: F2SetupWizardProps) {
  const [step, setStep] = useState(1);

  const [reserveForSedimentMl, setReserveForSedimentMl] = useState(200);
  const [ambientTempC, setAmbientTempC] = useState(batch.avgRoomTempC || 24);
  const [desiredCarbonationLevel, setDesiredCarbonationLevel] =
    useState<F2CarbonationLevel>("balanced");

  const [bottleGroups, setBottleGroups] = useState<F2BottleGroupDraft[]>([
    makeBottleGroup(),
  ]);

  const [recipeName, setRecipeName] = useState("New recipe");
  const [recipeDescription, setRecipeDescription] = useState("");
  const [saveRecipe, setSaveRecipe] = useState(false);

  const [recipeItems, setRecipeItems] = useState<F2RecipeItemDraft[]>([
    {
      ...makeRecipeItem(),
      customIngredientName: "Orange juice",
      amountPer500: 40,
      unit: "ml",
    },
  ]);

  const summary = useMemo(() => {
    return calculateF2SetupSummary({
      totalBatchVolumeMl: batch.totalVolumeMl,
      reserveForSedimentMl,
      ambientTempC,
      bottleGroups,
      recipeItems,
    });
  }, [batch.totalVolumeMl, reserveForSedimentMl, ambientTempC, bottleGroups, recipeItems]);

  const updateBottleGroup = (
    id: string,
    field: keyof F2BottleGroupDraft,
    value: string | number
  ) => {
    setBottleGroups((current) =>
      current.map((group) =>
        group.id === id
          ? {
              ...group,
              [field]: value,
            }
          : group
      )
    );
  };

  const removeBottleGroup = (id: string) => {
    setBottleGroups((current) => current.filter((group) => group.id !== id));
  };

  const addBottleGroup = () => {
    setBottleGroups((current) => [...current, makeBottleGroup()]);
  };

  const updateRecipeItem = (
    id: string,
    field: keyof F2RecipeItemDraft,
    value: string | number | boolean
  ) => {
    setRecipeItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const removeRecipeItem = (id: string) => {
    setRecipeItems((current) => current.filter((item) => item.id !== id));
  };

  const addRecipeItem = () => {
    setRecipeItems((current) => [...current, makeRecipeItem()]);
  };

  const canGoNext =
    step === 1
      ? bottleGroups.length > 0
      : step === 2
        ? recipeItems.length > 0
        : true;

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold text-foreground">F2 Setup Wizard</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Plan your bottles, recipe, and exact kombucha fill before starting carbonation.
        </p>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {[1, 2, 3].map((n) => {
            const labels = {
              1: "Bottle Plan",
              2: "Recipe",
              3: "Review",
            } as const;

            const active = step === n;

            return (
              <button
                key={n}
                type="button"
                onClick={() => setStep(n)}
                className={`rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border"
                }`}
              >
                {labels[n as 1 | 2 | 3]}
              </button>
            );
          })}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h4 className="text-base font-semibold text-foreground">Global setup</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="space-y-1">
                <span className="text-sm text-muted-foreground">Reserve for sediment ml</span>
                <input
                  type="number"
                  value={reserveForSedimentMl}
                  onChange={(e) => setReserveForSedimentMl(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-muted-foreground">Ambient temperature °C</span>
                <input
                  type="number"
                  value={ambientTempC}
                  onChange={(e) => setAmbientTempC(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-muted-foreground">Carbonation level</span>
                <select
                  value={desiredCarbonationLevel}
                  onChange={(e) =>
                    setDesiredCarbonationLevel(e.target.value as F2CarbonationLevel)
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="light">Light</option>
                  <option value="balanced">Balanced</option>
                  <option value="strong">Strong</option>
                </select>
              </label>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-foreground">Bottle groups</h4>
              <Button type="button" variant="outline" onClick={addBottleGroup}>
                Add bottle group
              </Button>
            </div>

            {bottleGroups.map((group, index) => (
              <div
                key={group.id}
                className="rounded-xl border border-border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    Group {index + 1}
                  </p>
                  {bottleGroups.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeBottleGroup(group.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Count</span>
                    <input
                      type="number"
                      value={group.bottleCount}
                      onChange={(e) =>
                        updateBottleGroup(group.id, "bottleCount", Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Bottle size ml</span>
                    <input
                      type="number"
                      value={group.bottleSizeMl}
                      onChange={(e) =>
                        updateBottleGroup(group.id, "bottleSizeMl", Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Bottle type</span>
                    <select
                      value={group.bottleType}
                      onChange={(e) =>
                        updateBottleGroup(group.id, "bottleType", e.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="swing_top">Swing top</option>
                      <option value="crown_cap">Crown cap</option>
                      <option value="screw_cap">Screw cap</option>
                      <option value="plastic_test_bottle">Plastic test bottle</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Headspace ml</span>
                    <input
                      type="number"
                      value={group.headspaceMl}
                      onChange={(e) =>
                        updateBottleGroup(group.id, "headspaceMl", Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Label</span>
                    <input
                      type="text"
                      value={group.groupLabel || ""}
                      onChange={(e) =>
                        updateBottleGroup(group.id, "groupLabel", e.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Optional"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h4 className="text-base font-semibold text-foreground mb-3">Live volume summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Available F1</p>
                <p className="font-semibold text-foreground">
                  {(summary.availableF1VolumeMl / 1000).toFixed(2)}L
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Bottle count</p>
                <p className="font-semibold text-foreground">{summary.totalBottleCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Planned fill</p>
                <p className="font-semibold text-foreground">
                  {(summary.totalTargetFillMl / 1000).toFixed(2)}L
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Remaining</p>
                <p className="font-semibold text-foreground">
                  {(summary.remainingVolumeMl / 1000).toFixed(2)}L
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h4 className="text-base font-semibold text-foreground">Recipe</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-sm text-muted-foreground">Recipe name</span>
                <input
                  type="text"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-muted-foreground">Save recipe for later</span>
                <select
                  value={saveRecipe ? "yes" : "no"}
                  onChange={(e) => setSaveRecipe(e.target.value === "yes")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-sm text-muted-foreground">Description</span>
              <textarea
                value={recipeDescription}
                onChange={(e) => setRecipeDescription(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
              />
            </label>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-foreground">Ingredients</h4>
              <Button type="button" variant="outline" onClick={addRecipeItem}>
                Add ingredient
              </Button>
            </div>

            {recipeItems.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    Ingredient {index + 1}
                  </p>
                  {recipeItems.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeRecipeItem(item.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-sm text-muted-foreground">Ingredient name</span>
                    <input
                      type="text"
                      value={item.customIngredientName || ""}
                      onChange={(e) =>
                        updateRecipeItem(item.id, "customIngredientName", e.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      placeholder="e.g. Orange juice"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Form</span>
                    <select
                      value={item.ingredientForm || "juice"}
                      onChange={(e) =>
                        updateRecipeItem(item.id, "ingredientForm", e.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="juice">Juice</option>
                      <option value="puree">Puree</option>
                      <option value="whole_fruit">Whole fruit</option>
                      <option value="syrup">Syrup</option>
                      <option value="herbs_spices">Herbs / spices</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Amount per 500ml</span>
                    <input
                      type="number"
                      value={item.amountPer500}
                      onChange={(e) =>
                        updateRecipeItem(item.id, "amountPer500", Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Unit</span>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) =>
                        updateRecipeItem(item.id, "unit", e.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      placeholder="ml / g / tsp"
                    />
                  </label>
                </div>

                <label className="space-y-1 block">
                  <span className="text-sm text-muted-foreground">Prep notes</span>
                  <input
                    type="text"
                    value={item.prepNotes || ""}
                    onChange={(e) =>
                      updateRecipeItem(item.id, "prepNotes", e.target.value)
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Optional"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h4 className="text-base font-semibold text-foreground">Review</h4>

            {summary.validationErrors.length > 0 && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">Fix these first</p>
                <ul className="mt-2 space-y-1 text-sm text-red-700 list-disc pl-5">
                  {summary.validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Available F1</p>
                <p className="font-semibold text-foreground">
                  {(summary.availableF1VolumeMl / 1000).toFixed(2)}L
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Kombucha needed</p>
                <p className="font-semibold text-foreground">
                  {(summary.totalKombuchaNeededMl / 1000).toFixed(2)}L
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Remaining</p>
                <p className="font-semibold text-foreground">
                  {(summary.remainingVolumeMl / 1000).toFixed(2)}L
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Risk</p>
                <p className="font-semibold text-foreground capitalize">
                  {summary.riskLevel}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h4 className="text-base font-semibold text-foreground">Per bottle instructions</h4>

            <div className="space-y-3">
              {summary.bottleGroupPlans.map((group) => (
                <div key={group.groupId} className="rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {group.bottleCount} × {group.bottleSizeMl}ml {group.bottleType}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Per bottle: {group.kombuchaMlPerBottle.toFixed(0)}ml kombucha
                  </p>

                  <ul className="mt-2 space-y-1 text-sm text-foreground list-disc pl-5">
                    {group.scaledItemsPerBottle.map((item) => (
                      <li key={item.id}>
                        {(item.customIngredientName || "Ingredient")}:{" "}
                        {item.scaledAmount.toFixed(1)}
                        {item.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h4 className="text-base font-semibold text-foreground">Total ingredients needed</h4>

            <ul className="space-y-1 text-sm text-foreground list-disc pl-5">
              {summary.ingredientTotals.map((item) => (
                <li key={`${item.name}-${item.unit}`}>
                  {item.name}: {item.totalAmount}
                  {item.unit}
                </li>
              ))}
            </ul>

            <div className="pt-2 border-t border-border">
              <p className="text-sm font-semibold text-foreground">Risk notes</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc pl-5">
                {summary.riskNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Persistence and actual F2 start come next. This step is currently only for planning and review.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((current) => Math.max(1, current - 1))}
          disabled={step === 1}
        >
          Back
        </Button>

        <Button
          type="button"
          onClick={() => setStep((current) => Math.min(3, current + 1))}
          disabled={step === 3 || !canGoNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
