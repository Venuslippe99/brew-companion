import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { startF2FromWizard } from "@/lib/f2-persistence";
import type { KombuchaBatch } from "@/lib/batches";
import type {
  F2BottleGroupDraft,
  F2RecipeItemDraft,
  F2CarbonationLevel,
  F2RecipeSourceTab,
  F2RecipeSummary,
  FlavourPresetSummary,
} from "@/lib/f2-types";
import {
  calculateF2SetupSummary,
  buildGuidedRecipeItems,
} from "@/lib/f2-planner";

type F2SetupWizardProps = {
  batch: KombuchaBatch;
  userId?: string;
  onF2Started?: (args: {
    f2StartedAt: string;
    nextAction: string;
  }) => void;
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
    amountPer500: 0,
    unit: "ml",
    prepNotes: "",
    displacesVolume: false,
  };
}

export default function F2SetupWizard({
  batch,
  userId,
  onF2Started,
}: F2SetupWizardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [reserveForSedimentMl, setReserveForSedimentMl] = useState(200);
  const [ambientTempC, setAmbientTempC] = useState(batch.avgRoomTempC || 24);
  const [desiredCarbonationLevel, setDesiredCarbonationLevel] =
    useState<F2CarbonationLevel>("balanced");

  const [bottleGroups, setBottleGroups] = useState<F2BottleGroupDraft[]>([
    makeBottleGroup(),
  ]);

  const [recipeSourceTab, setRecipeSourceTab] =
    useState<F2RecipeSourceTab>("presets");
  const [guidedMode, setGuidedMode] = useState(true);

  const [myRecipes, setMyRecipes] = useState<F2RecipeSummary[]>([]);
  const [presetRecipes, setPresetRecipes] = useState<F2RecipeSummary[]>([]);
  const [flavourPresets, setFlavourPresets] = useState<FlavourPresetSummary[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");

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

  const [loadingRecipeData, setLoadingRecipeData] = useState(false);

  useEffect(() => {
    const loadRecipeSources = async () => {
      setLoadingRecipeData(true);

      const [{ data: myRecipeRows }, { data: presetRecipeRows }, { data: flavourRows }] =
        await Promise.all([
          supabase
            .from("f2_recipes")
            .select("id, name, description, is_preset")
            .eq("is_preset", false)
            .order("name", { ascending: true }),
          supabase
            .from("f2_recipes")
            .select("id, name, description, is_preset")
            .eq("is_preset", true)
            .order("name", { ascending: true }),
          supabase
            .from("flavour_presets")
            .select(
              "id, name, display_name, default_unit, recommended_default_per_500, recommended_max_per_500, carbonation_tendency, is_liquid"
            )
            .eq("is_active", true)
            .order("name", { ascending: true }),
        ]);

      setMyRecipes(
        (myRecipeRows || []).map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          isPreset: row.is_preset,
        }))
      );

      setPresetRecipes(
        (presetRecipeRows || []).map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          isPreset: row.is_preset,
        }))
      );

      setFlavourPresets(
        (flavourRows || []).map((row) => ({
          id: row.id,
          name: row.name,
          displayName: row.display_name,
          defaultUnit: row.default_unit,
          recommendedDefaultPer500: row.recommended_default_per_500,
          recommendedMaxPer500: row.recommended_max_per_500,
          carbonationTendency: row.carbonation_tendency,
          isLiquid: row.is_liquid,
        }))
      );

      setLoadingRecipeData(false);
    };

    loadRecipeSources();
  }, []);

  useEffect(() => {
    const loadSelectedRecipeItems = async () => {
      if (!selectedRecipeId) return;

      const { data: itemRows } = await supabase
        .from("f2_recipe_items")
        .select(
          "id, flavour_preset_id, custom_ingredient_name, ingredient_form, amount_per_500, unit, prep_notes, displaces_volume"
        )
        .eq("recipe_id", selectedRecipeId)
        .order("sort_order", { ascending: true });

      if (!itemRows) return;

      setRecipeItems(
        itemRows.map((row) => ({
          id: row.id,
          flavourPresetId: row.flavour_preset_id || undefined,
          customIngredientName: row.custom_ingredient_name || "",
          ingredientForm: row.ingredient_form || "juice",
          amountPer500: Number(row.amount_per_500),
          unit: row.unit,
          prepNotes: row.prep_notes || "",
          displacesVolume: row.displaces_volume,
        }))
      );

      const allRecipes = [...myRecipes, ...presetRecipes];
      const selectedRecipe = allRecipes.find((recipe) => recipe.id === selectedRecipeId);

      if (selectedRecipe) {
        setRecipeName(selectedRecipe.name);
        setRecipeDescription(selectedRecipe.description || "");
      }
    };

    loadSelectedRecipeItems();
  }, [selectedRecipeId, myRecipes, presetRecipes]);

  const flavourPresetMap = useMemo(() => {
    return Object.fromEntries(flavourPresets.map((preset) => [preset.id, preset]));
  }, [flavourPresets]);

  const adjustedRecipeItems = useMemo(() => {
    if (!guidedMode) return recipeItems;

    return buildGuidedRecipeItems({
      recipeItems,
      flavourPresetMap,
      desiredCarbonationLevel,
    });
  }, [recipeItems, flavourPresetMap, desiredCarbonationLevel, guidedMode]);

  const summary = useMemo(() => {
    return calculateF2SetupSummary({
      totalBatchVolumeMl: batch.totalVolumeMl,
      reserveForSedimentMl,
      ambientTempC,
      bottleGroups,
      recipeItems: adjustedRecipeItems,
    });
  }, [
    batch.totalVolumeMl,
    reserveForSedimentMl,
    ambientTempC,
    bottleGroups,
    adjustedRecipeItems,
  ]);

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

  const applyFlavourPresetToItem = (id: string, flavourPresetId: string) => {
    const preset = flavourPresetMap[flavourPresetId];
    if (!preset) return;

    setRecipeItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              flavourPresetId,
              customIngredientName: preset.displayName || preset.name,
              unit: preset.defaultUnit || "ml",
              ingredientForm: preset.isLiquid ? "juice" : item.ingredientForm || "other",
              amountPer500:
                preset.recommendedDefaultPer500 != null
                  ? preset.recommendedDefaultPer500
                  : item.amountPer500,
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
        ? adjustedRecipeItems.length > 0
        : true;

  const activeRecipeList =
    recipeSourceTab === "my" ? myRecipes : recipeSourceTab === "presets" ? presetRecipes : [];
  const handleConfirmAndStartF2 = async () => {
  if (!userId) {
    toast.error("You need to be signed in to start F2.");
    return;
  }

  if (summary.validationErrors.length > 0) {
    toast.error("Fix the review errors first.");
    return;
  }

  try {
    setIsSubmitting(true);

    const result = await startF2FromWizard({
      batch,
      userId,
      reserveForSedimentMl,
      ambientTempC,
      desiredCarbonationLevel,
      bottleGroups,
      recipeSourceTab,
      guidedMode,
      selectedRecipeId,
      recipeName,
      recipeDescription,
      saveRecipe,
      adjustedRecipeItems,
      summary,
    });

    onF2Started?.({
      f2StartedAt: result.f2StartedAt,
      nextAction: result.nextAction,
    });

    toast.success("F2 started successfully.");
  } catch (error) {
    console.error("Start F2 error:", error);
    toast.error("Could not start F2.");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold text-foreground">F2 Setup Wizard</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Plan bottles, choose a recipe, and generate a carbonation-ready bottling plan.
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
                <span className="text-sm text-muted-foreground">Carbonation target</span>
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
            <h4 className="text-base font-semibold text-foreground">Recipe source</h4>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRecipeSourceTab("my")}
                className={`rounded-lg px-3 py-2 text-sm font-medium border ${
                  recipeSourceTab === "my"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border"
                }`}
              >
                My recipes
              </button>
              <button
                type="button"
                onClick={() => setRecipeSourceTab("presets")}
                className={`rounded-lg px-3 py-2 text-sm font-medium border ${
                  recipeSourceTab === "presets"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border"
                }`}
              >
                Presets
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecipeSourceTab("create");
                  setSelectedRecipeId("");
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium border ${
                  recipeSourceTab === "create"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border"
                }`}
              >
                Create new
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-sm text-muted-foreground">Carbonation target</span>
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

              <label className="space-y-1">
                <span className="text-sm text-muted-foreground">Planner mode</span>
                <select
                  value={guidedMode ? "guided" : "advanced"}
                  onChange={(e) => setGuidedMode(e.target.value === "guided")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="guided">Guided</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </div>

            {recipeSourceTab !== "create" && (
              <div className="space-y-2">
                <label className="space-y-1 block">
                  <span className="text-sm text-muted-foreground">
                    {recipeSourceTab === "my" ? "Choose one of your recipes" : "Choose a preset"}
                  </span>
                  <select
                    value={selectedRecipeId}
                    onChange={(e) => setSelectedRecipeId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">
                      {loadingRecipeData
                        ? "Loading..."
                        : activeRecipeList.length === 0
                          ? "No recipes available"
                          : "Select a recipe"}
                    </option>
                    {activeRecipeList.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedRecipeId && (
                  <p className="text-sm text-muted-foreground">
                    Recipe items are loaded automatically and adjusted for your carbonation target.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h4 className="text-base font-semibold text-foreground">
              {recipeSourceTab === "create" ? "Recipe builder" : "Recipe items"}
            </h4>

            {recipeSourceTab === "create" && (
              <>
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
              </>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Guided mode uses preset defaults and adjusts them to the carbonation target.
              </p>
              {recipeSourceTab === "create" && (
                <Button type="button" variant="outline" onClick={addRecipeItem}>
                  Add ingredient
                </Button>
              )}
            </div>

            {adjustedRecipeItems.map((item, index) => {
              const suggestedAmount =
                guidedMode ? item.amountPer500 : recipeItems[index]?.amountPer500 ?? item.amountPer500;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      Ingredient {index + 1}
                    </p>
                    {recipeSourceTab === "create" && recipeItems.length > 1 && (
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
                    {recipeSourceTab === "create" && (
                      <label className="space-y-1 md:col-span-2">
                        <span className="text-sm text-muted-foreground">Preset ingredient</span>
                        <select
                          value={recipeItems[index]?.flavourPresetId || ""}
                          onChange={(e) => applyFlavourPresetToItem(item.id, e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Choose preset ingredient</option>
                          {flavourPresets.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.displayName || preset.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <label className="space-y-1 md:col-span-2">
                      <span className="text-sm text-muted-foreground">Ingredient name</span>
                      <input
                        type="text"
                        value={item.customIngredientName || ""}
                        onChange={(e) =>
                          updateRecipeItem(item.id, "customIngredientName", e.target.value)
                        }
                        disabled={recipeSourceTab !== "create"}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">Form</span>
                      <select
                        value={item.ingredientForm || "juice"}
                        onChange={(e) =>
                          updateRecipeItem(item.id, "ingredientForm", e.target.value)
                        }
                        disabled={recipeSourceTab !== "create"}
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
                      <span className="text-sm text-muted-foreground">
                        {guidedMode ? "Suggested per 500ml" : "Amount per 500ml"}
                      </span>
                      <input
                        type="number"
                        value={suggestedAmount}
                        onChange={(e) =>
                          updateRecipeItem(item.id, "amountPer500", Number(e.target.value))
                        }
                        disabled={guidedMode || recipeSourceTab !== "create"}
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
                        disabled={guidedMode || recipeSourceTab !== "create"}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  {guidedMode && (
                    <p className="text-sm text-muted-foreground">
                      This amount is automatically adjusted for your carbonation target.
                    </p>
                  )}
                </div>
              );
            })}
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
            <h4 className="text-base font-semibold text-foreground">
              Per bottle instructions
            </h4>

            <div className="space-y-3">
              {summary.bottleGroupPlans.map((group) => (
                <div key={group.groupId} className="rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {group.bottleCount} × {group.bottleSizeMl}ml {group.bottleType}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-foreground list-disc pl-5">
                    {group.scaledItemsPerBottle.map((item) => (
                      <li key={item.id}>
                        Add {item.scaledAmount.toFixed(1)}
                        {item.unit} {item.customIngredientName || "ingredient"}
                      </li>
                    ))}
                    <li>Top with {group.kombuchaMlPerBottle.toFixed(1)}ml kombucha</li>
                    <li>Leave {group.headspaceMl}ml headspace</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h4 className="text-base font-semibold text-foreground">
              Total ingredients needed
            </h4>

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

            <div className="pt-2 border-t border-border space-y-3">
  <p className="text-sm text-muted-foreground">
    This will save your setup, create your bottles, save ingredient rows, and start F2 for this batch.
  </p>

  <Button
    type="button"
    onClick={handleConfirmAndStartF2}
    disabled={isSubmitting || summary.validationErrors.length > 0}
    className="w-full"
  >
    {isSubmitting ? "Starting F2..." : "I bottled this and start F2"}
  </Button>
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
