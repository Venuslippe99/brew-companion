import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { startF2FromWizard } from "@/lib/f2-persistence";
import {
  loadCurrentF2Setup,
  type LoadedF2Setup,
} from "@/lib/f2-current-setup";
import {
  applyF2ActiveAction,
  type F2ActiveAction,
} from "@/lib/f2-active-actions";
import {
  getNextAction,
  type BatchStage,
  type BatchStatus,
  type KombuchaBatch,
} from "@/lib/batches";
import type {
  F2BottleGroupDraft,
  F2BottleType,
  F2RecipeItemDraft,
  F2CarbonationLevel,
  F2RecipeSourceTab,
  F2RecipeSummary,
  FlavourPresetSummary,
} from "@/lib/f2-types";
import {
  buildGuidedRecipeItems,
  calculateF2SetupSummary,
  calculateTargetFillMl,
} from "@/lib/f2-planner";
import { cn } from "@/lib/utils";

type F2SetupWizardProps = {
  batch: KombuchaBatch;
  userId?: string;
  onF2Started?: (args: {
    f2StartedAt: string;
    nextAction: string;
  }) => void;
  onBatchStateChanged?: (args: {
    currentStage: BatchStage;
    updatedAt: string;
    nextAction: string;
    status: BatchStatus;
    completedAt?: string;
  }) => void;
};

type WizardStepId = 1 | 2 | 3 | 4 | 5;

type BottlePreset = {
  id: string;
  label: string;
  description: string;
  groups: Array<Omit<F2BottleGroupDraft, "id">>;
};

const WIZARD_STEPS: Array<{
  id: WizardStepId;
  label: string;
  title: string;
  description: string;
  nextLabel?: string;
}> = [
  {
    id: 1,
    label: "Bottling volume",
    title: "How much kombucha is ready to bottle?",
    description:
      "Start with the kombucha you actually have available today, then decide how much to keep aside as starter for the next batch.",
    nextLabel: "Continue to carbonation",
  },
  {
    id: 2,
    label: "Carbonation",
    title: "How fizzy do you want it to get?",
    description:
      "Choose the carbonation target first, then set the room temperature the bottles will sit in.",
    nextLabel: "Continue to bottles",
  },
  {
    id: 3,
    label: "Bottle plan",
    title: "What bottles are you using?",
    description:
      "Build the bottling plan with clear bottle groups, quick presets, and live fill math.",
    nextLabel: "Continue to flavour",
  },
  {
    id: 4,
    label: "Flavour plan",
    title: "How do you want to flavour this batch?",
    description:
      "Choose a saved recipe, start from a preset, or build a custom flavour plan for this run.",
    nextLabel: "Review bottling plan",
  },
  {
    id: 5,
    label: "Review",
    title: "This is your bottling plan.",
    description:
      "Double-check the bottle fills, ingredient totals, and carbonation watchouts, then start F2.",
  },
];

const BOTTLE_PRESETS: BottlePreset[] = [
  {
    id: "6x500-swing",
    label: "6 x 500ml swing tops",
    description: "A common home run with roomy bottles and simple headspace.",
    groups: [
      {
        bottleCount: 6,
        bottleSizeMl: 500,
        bottleType: "swing_top",
        headspaceMl: 20,
        groupLabel: "Swing tops",
      },
    ],
  },
  {
    id: "4x750-swing",
    label: "4 x 750ml bottles",
    description: "Good for larger bottles when you want fewer fills.",
    groups: [
      {
        bottleCount: 4,
        bottleSizeMl: 750,
        bottleType: "swing_top",
        headspaceMl: 25,
        groupLabel: "750ml bottles",
      },
    ],
  },
  {
    id: "8x330-crown",
    label: "8 x 330ml crown caps",
    description: "A tighter small-bottle setup for sharing or portioning.",
    groups: [
      {
        bottleCount: 8,
        bottleSizeMl: 330,
        bottleType: "crown_cap",
        headspaceMl: 15,
        groupLabel: "330ml bottles",
      },
    ],
  },
  {
    id: "5x500-plus-tester",
    label: "5 x 500ml + 1 test bottle",
    description: "Adds one plastic tester to help judge pressure safely.",
    groups: [
      {
        bottleCount: 5,
        bottleSizeMl: 500,
        bottleType: "swing_top",
        headspaceMl: 20,
        groupLabel: "Glass bottles",
      },
      {
        bottleCount: 1,
        bottleSizeMl: 500,
        bottleType: "plastic_test_bottle",
        headspaceMl: 20,
        groupLabel: "Plastic test bottle",
      },
    ],
  },
];

const CARBONATION_OPTIONS: Array<{
  value: F2CarbonationLevel;
  label: string;
  description: string;
}> = [
  {
    value: "light",
    label: "Light",
    description: "A calmer, lower-pressure finish with a gentler fizz target.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "A middle-ground target for everyday kombucha bottling.",
  },
  {
    value: "strong",
    label: "Strong",
    description: "A more active target that needs closer watch on pressure.",
  },
];

function formatLitres(value: number | null | undefined) {
  if (value == null) return "—";
  return `${(value / 1000).toFixed(2)}L`;
}

function formatBottleType(value: string) {
  return value.replace(/_/g, " ");
}

function getStepDefinition(step: WizardStepId) {
  return WIZARD_STEPS.find((item) => item.id === step) ?? WIZARD_STEPS[0];
}

function makeBottleGroup(
  overrides: Partial<Omit<F2BottleGroupDraft, "id">> = {}
): F2BottleGroupDraft {
  return {
    id: crypto.randomUUID(),
    bottleCount: overrides.bottleCount ?? 4,
    bottleSizeMl: overrides.bottleSizeMl ?? 500,
    bottleType: overrides.bottleType ?? "swing_top",
    headspaceMl: overrides.headspaceMl ?? 20,
    groupLabel: overrides.groupLabel ?? "",
  };
}

function makeRecipeItem(
  overrides: Partial<F2RecipeItemDraft> = {}
): F2RecipeItemDraft {
  return {
    id: crypto.randomUUID(),
    customIngredientName: overrides.customIngredientName ?? "",
    ingredientForm: overrides.ingredientForm ?? "juice",
    amountPer500: overrides.amountPer500 ?? 0,
    unit: overrides.unit ?? "ml",
    prepNotes: overrides.prepNotes ?? "",
    displacesVolume: overrides.displacesVolume ?? false,
    flavourPresetId: overrides.flavourPresetId,
  };
}

function StepHeader({ step }: { step: WizardStepId }) {
  const definition = getStepDefinition(step);
  const progressValue = (step / WIZARD_STEPS.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Step {step} of {WIZARD_STEPS.length}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {definition.label}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Guided bottling flow</p>
      </div>

      <Progress value={progressValue} className="h-2" />

      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">
          {definition.title}
        </h3>
        <p className="text-sm text-muted-foreground">{definition.description}</p>
      </div>
    </div>
  );
}

function SavedF2SetupView({
  setup,
  currentStage,
  currentNextAction,
  actionLoading,
  onCheckedOneBottle,
  onNeedsMoreCarbonation,
  onRefrigerateNow,
  onMovedToFridge,
  onMarkCompleted,
}: {
  setup: LoadedF2Setup;
  currentStage: BatchStage;
  currentNextAction?: string;
  actionLoading: F2ActiveAction | null;
  onCheckedOneBottle: () => void;
  onNeedsMoreCarbonation: () => void;
  onRefrigerateNow: () => void;
  onMovedToFridge: () => void;
  onMarkCompleted: () => void;
}) {
  const snapshot = (setup.recipeSnapshotJson || {}) as {
    recipeName?: string | null;
    items?: Array<{
      customIngredientName?: string | null;
      amountPer500?: number;
      unit?: string;
      prepNotes?: string | null;
    }>;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              F2 is already underway
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This setup is saved on the batch, so this chapter now focuses on the
              current bottling status and what to do next.
            </p>
          </div>

          <div className="rounded-2xl bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current next action
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {currentNextAction || "No next action recorded."}
            </p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              Current stage: {currentStage.replace(/_/g, " ")}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">F2 actions</p>

            {currentStage === "f2_active" ? (
              <div className="grid gap-2 md:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCheckedOneBottle}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "checked-one-bottle"
                    ? "Saving..."
                    : "Checked one bottle"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={onNeedsMoreCarbonation}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "needs-more-carbonation"
                    ? "Saving..."
                    : "Needs more carbonation"}
                </Button>

                <Button
                  type="button"
                  onClick={onRefrigerateNow}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "refrigerate-now"
                    ? "Saving..."
                    : "Refrigerate now"}
                </Button>
              </div>
            ) : currentStage === "refrigerate_now" ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  The batch is marked as ready to refrigerate.
                </p>
                <Button
                  type="button"
                  onClick={onMovedToFridge}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "moved-to-fridge"
                    ? "Saving..."
                    : "Moved to fridge"}
                </Button>
              </div>
            ) : currentStage === "chilled_ready" ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  The bottles are chilled and ready. Mark the batch complete when
                  you want to close out the lifecycle.
                </p>
                <Button
                  type="button"
                  onClick={onMarkCompleted}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "mark-completed"
                    ? "Saving..."
                    : "Mark completed"}
                </Button>
              </div>
            ) : currentStage === "completed" ? (
              <p className="text-sm text-foreground">
                This batch has already been marked complete.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No F2 actions are available for this stage.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saved bottling summary
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Total from F1</p>
              <p className="mt-1 font-semibold text-foreground">
                {formatLitres(setup.totalF1AvailableMl)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Starter reserve</p>
              <p className="mt-1 font-semibold text-foreground">
                {formatLitres(setup.reserveForStarterMl)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Available to bottle</p>
              <p className="mt-1 font-semibold text-foreground">
                {formatLitres(setup.availableForBottlingMl)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Bottles</p>
              <p className="mt-1 font-semibold text-foreground">
                {setup.bottleCount}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Carbonation</p>
              <p className="mt-1 font-semibold capitalize text-foreground">
                {setup.desiredCarbonationLevel}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pressure watch</p>
              <p className="mt-1 font-semibold capitalize text-foreground">
                {setup.estimatedPressureRisk || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Ambient room</p>
              <p className="mt-1 font-semibold text-foreground">
                {setup.ambientTempC}°C
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Recipe</p>
              <p className="mt-1 font-semibold text-foreground">
                {setup.recipeNameSnapshot || snapshot.recipeName || "Saved recipe"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              Bottle plan summary
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              The saved bottle groups stay attached to this batch so you can follow
              the same plan while carbonation develops.
            </p>
          </div>

          <div className="space-y-3">
            {setup.groups.map((group, index) => (
              <div
                key={group.id}
                className="rounded-2xl border border-border p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">
                    {group.groupLabel || `Group ${index + 1}`}
                  </p>
                  <p className="text-muted-foreground">
                    {group.bottleCount} x {group.bottleSizeMl}ml
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-muted-foreground md:grid-cols-4">
                  <p>Type: {formatBottleType(group.bottleType)}</p>
                  <p>Headspace: {group.headspaceMl}ml</p>
                  <p>Target fill: {group.targetFillMl}ml</p>
                  <p>
                    Group volume: {formatLitres(group.targetFillMl * group.bottleCount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              Recipe summary
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              The saved flavour snapshot is kept here for traceability without
              taking over the whole chapter.
            </p>
          </div>

          {snapshot.items && snapshot.items.length > 0 ? (
            <div className="space-y-2">
              {snapshot.items.slice(0, 3).map((item, index) => (
                <div
                  key={`${item.customIngredientName || "ingredient"}-${index}`}
                  className="rounded-xl border border-border p-3 text-sm"
                >
                  <p className="font-medium text-foreground">
                    {item.customIngredientName || "Ingredient"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {item.amountPer500 ?? 0}
                    {item.unit || ""} per 500ml
                  </p>
                </div>
              ))}

              {snapshot.items.length > 3 ? (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" className="w-full">
                      Show all saved ingredients
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-3">
                    {snapshot.items.slice(3).map((item, index) => (
                      <div
                        key={`${item.customIngredientName || "ingredient"}-extra-${index}`}
                        className="rounded-xl border border-border p-3 text-sm"
                      >
                        <p className="font-medium text-foreground">
                          {item.customIngredientName || "Ingredient"}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {item.amountPer500 ?? 0}
                          {item.unit || ""} per 500ml
                        </p>
                        {item.prepNotes ? (
                          <p className="mt-1 text-muted-foreground">{item.prepNotes}</p>
                        ) : null}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No recipe snapshot items were found.
            </p>
          )}

          {setup.bottles.length > 0 ? (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full">
                  Show created bottles
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                {setup.bottles.map((bottle, index) => (
                  <div
                    key={bottle.id}
                    className="rounded-2xl border border-border p-4 text-sm"
                  >
                    <p className="font-semibold text-foreground">
                      {bottle.bottleLabel || `Bottle ${index + 1}`} ·{" "}
                      {bottle.bottleSizeMl}ml
                    </p>
                    {bottle.ingredients.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground">
                        {bottle.ingredients.map((ingredient) => (
                          <li key={ingredient.id}>
                            {ingredient.ingredientNameSnapshot}:{" "}
                            {ingredient.amountValue}
                            {ingredient.amountUnit}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-muted-foreground">
                        No saved ingredient rows found for this bottle.
                      </p>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function F2SetupWizard({
  batch,
  userId,
  onF2Started,
  onBatchStateChanged,
}: F2SetupWizardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedActionLoading, setSavedActionLoading] =
    useState<F2ActiveAction | null>(null);
  const [savedSetup, setSavedSetup] = useState<LoadedF2Setup | null>(null);
  const [loadingSavedSetup, setLoadingSavedSetup] = useState(true);
  const [step, setStep] = useState<WizardStepId>(1);

  const [totalF1AvailableMl, setTotalF1AvailableMl] = useState(batch.totalVolumeMl);
  const [reserveForStarterMl, setReserveForStarterMl] = useState(200);
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
  const [recipeItems, setRecipeItems] = useState<F2RecipeItemDraft[]>([]);

  const [loadingRecipeData, setLoadingRecipeData] = useState(false);

  useEffect(() => {
    setStep(1);
    setTotalF1AvailableMl(batch.totalVolumeMl);
    setReserveForStarterMl(200);
    setAmbientTempC(batch.avgRoomTempC || 24);
  }, [batch.id, batch.totalVolumeMl, batch.avgRoomTempC]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [step]);

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

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setLoadingSavedSetup(true);

        const data = await loadCurrentF2Setup(batch.id);

        if (!isMounted) return;
        setSavedSetup(data);
      } catch (error) {
        console.error("Load saved F2 setup error:", error);

        if (!isMounted) return;
        toast.error(
          error instanceof Error ? error.message : "Could not load saved F2 setup."
        );
      } finally {
        if (isMounted) {
          setLoadingSavedSetup(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [batch.id]);

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
      totalF1AvailableMl,
      reserveForStarterMl,
      ambientTempC,
      bottleGroups,
      recipeItems: adjustedRecipeItems,
    });
  }, [
    totalF1AvailableMl,
    reserveForStarterMl,
    ambientTempC,
    bottleGroups,
    adjustedRecipeItems,
  ]);

  const bottlePlansByGroupId = useMemo(() => {
    return Object.fromEntries(
      summary.bottleGroupPlans.map((plan) => [plan.groupId, plan])
    );
  }, [summary.bottleGroupPlans]);

  const activeRecipeList =
    recipeSourceTab === "my"
      ? myRecipes
      : recipeSourceTab === "presets"
        ? presetRecipes
        : [];

  const showSavedSetup =
    savedSetup !== null &&
    ["f2_active", "refrigerate_now", "chilled_ready", "completed"].includes(
      batch.currentStage
    );

  const stepDefinition = getStepDefinition(step);

  const canGoNext = useMemo(() => {
    switch (step) {
      case 1:
        return totalF1AvailableMl > 0 && summary.availableForBottlingMl > 0;
      case 2:
        return ambientTempC > 0;
      case 3:
        return bottleGroups.length > 0;
      case 4:
        return recipeSourceTab === "create"
          ? adjustedRecipeItems.length > 0
          : selectedRecipeId.trim().length > 0;
      case 5:
        return false;
      default:
        return false;
    }
  }, [
    step,
    totalF1AvailableMl,
    summary.availableForBottlingMl,
    ambientTempC,
    bottleGroups.length,
    recipeSourceTab,
    adjustedRecipeItems.length,
    selectedRecipeId,
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

  const addBottleGroup = () => {
    setBottleGroups((current) => [...current, makeBottleGroup()]);
  };

  const removeBottleGroup = (id: string) => {
    setBottleGroups((current) => current.filter((group) => group.id !== id));
  };

  const applyBottlePreset = (preset: BottlePreset) => {
    setBottleGroups(preset.groups.map((group) => makeBottleGroup(group)));
  };

  const addPlasticTestBottle = () => {
    setBottleGroups((current) => [
      ...current,
      makeBottleGroup({
        bottleCount: 1,
        bottleSizeMl: 500,
        bottleType: "plastic_test_bottle",
        headspaceMl: 20,
        groupLabel: "Plastic test bottle",
      }),
    ]);
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

  const addRecipeItem = () => {
    setRecipeItems((current) => [...current, makeRecipeItem()]);
  };

  const removeRecipeItem = (id: string) => {
    setRecipeItems((current) => current.filter((item) => item.id !== id));
  };

  const setRecipeSource = (nextSource: F2RecipeSourceTab) => {
    setRecipeSourceTab(nextSource);

    if (nextSource === "create") {
      setSelectedRecipeId("");
      if (recipeItems.length === 0) {
        setRecipeItems([
          makeRecipeItem({
            customIngredientName: "Orange juice",
            amountPer500: 40,
            unit: "ml",
            ingredientForm: "juice",
            displacesVolume: true,
          }),
        ]);
      }
      return;
    }

    setSaveRecipe(false);
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
              displacesVolume: preset.defaultUnit.toLowerCase() === "ml",
            }
          : item
      )
    );
  };

  const handleNext = () => {
    setStep((current) => Math.min(5, current + 1) as WizardStepId);
  };

  const handleBack = () => {
    setStep((current) => Math.max(1, current - 1) as WizardStepId);
  };

  const handleConfirmAndStartF2 = async () => {
    if (!userId) {
      toast.error("You need to be signed in to start F2.");
      return;
    }

    if (summary.validationErrors.length > 0) {
      toast.error("Fix the bottling plan errors first.");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await startF2FromWizard({
        batch,
        userId,
        reserveForStarterMl,
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

      try {
        const refreshedSetup = await loadCurrentF2Setup(batch.id);
        setSavedSetup(refreshedSetup);
      } catch (refreshError) {
        console.error("Refresh saved F2 setup error:", refreshError);
      }

      onF2Started?.({
        f2StartedAt: result.f2StartedAt,
        nextAction: result.nextAction,
      });

      toast.success("F2 started successfully.");
    } catch (error) {
      console.error("Start F2 error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavedF2Action = async (action: F2ActiveAction) => {
    if (!userId) {
      toast.error("You need to be signed in to update this batch.");
      return;
    }

    try {
      setSavedActionLoading(action);

      const result = await applyF2ActiveAction({
        batch,
        userId,
        action,
      });

      onBatchStateChanged?.({
        currentStage: result.currentStage,
        updatedAt: result.updatedAt,
        nextAction: result.nextAction,
        status: result.status,
        completedAt: result.completedAt,
      });

      toast.success(result.successMessage);
    } catch (error) {
      console.error("Saved F2 action error:", error);
      const message =
        error instanceof Error ? error.message : "Could not update this batch.";
      toast.error(message);
    } finally {
      setSavedActionLoading(null);
    }
  };

  if (loadingSavedSetup) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Loading F2 setup...</p>
      </div>
    );
  }

  if (showSavedSetup) {
    return (
      <SavedF2SetupView
        setup={savedSetup!}
        currentStage={batch.currentStage}
        currentNextAction={batch.nextAction || getNextAction(batch)}
        actionLoading={savedActionLoading}
        onCheckedOneBottle={() => handleSavedF2Action("checked-one-bottle")}
        onNeedsMoreCarbonation={() =>
          handleSavedF2Action("needs-more-carbonation")
        }
        onRefrigerateNow={() => handleSavedF2Action("refrigerate-now")}
        onMovedToFridge={() => handleSavedF2Action("moved-to-fridge")}
        onMarkCompleted={() => handleSavedF2Action("mark-completed")}
      />
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-4 md:p-6">
      <div className="space-y-6">
        <StepHeader step={step} />

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-5 rounded-2xl border border-border p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Total kombucha available right now
                  </span>
                  <input
                    type="number"
                    value={totalF1AvailableMl}
                    onChange={(event) =>
                      setTotalF1AvailableMl(Number(event.target.value))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-sm text-muted-foreground">
                    Start with the real amount you have ready for bottling today.
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Keep aside for next batch starter
                  </span>
                  <input
                    type="number"
                    value={reserveForStarterMl}
                    onChange={(event) =>
                      setReserveForStarterMl(Number(event.target.value))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-sm text-muted-foreground">
                    This amount will not be bottled.
                  </p>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-5">
              <p className="text-sm font-semibold text-foreground">
                Volume breakdown
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Total from F1
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatLitres(summary.totalF1AvailableMl)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Starter reserve
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatLitres(summary.reserveForStarterMl)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Available to bottle
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatLitres(summary.availableForBottlingMl)}
                  </p>
                </div>
              </div>

              {summary.validationErrors.includes(
                "Starter reserve cannot be greater than the kombucha you have available."
              ) ? (
                <p className="mt-4 text-sm text-red-700">
                  Starter reserve cannot be greater than the kombucha you have
                  available.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {CARBONATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDesiredCarbonationLevel(option.value)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    desiredCarbonationLevel === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">
                    {option.label}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="space-y-4 rounded-2xl border border-border p-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Ambient room temperature
                </span>
                <input
                  type="number"
                  value={ambientTempC}
                  onChange={(event) => setAmbientTempC(Number(event.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm md:max-w-xs"
                />
                <p className="text-sm text-muted-foreground">
                  Warmer rooms usually push carbonation along faster.
                </p>
              </label>

              <div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                {desiredCarbonationLevel === "light"
                  ? "Light carbonation is a calmer starting point if you want less pressure buildup."
                  : desiredCarbonationLevel === "strong"
                    ? "Strong carbonation usually needs closer checking, especially in warm rooms."
                    : "Balanced carbonation is a steady middle-ground for most batches."}
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="space-y-4 rounded-2xl border border-border p-5">
              <div>
                <h4 className="text-base font-semibold text-foreground">
                  Quick bottle presets
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start with a common setup, then tweak any group you want.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {BOTTLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyBottlePreset(preset)}
                    className="rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/40"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {preset.label}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-border p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold text-foreground">
                    Bottle groups
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Group similar bottles together so the fill math stays easy to
                    follow.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={addPlasticTestBottle}>
                    Add test bottle
                  </Button>
                  <Button type="button" variant="outline" onClick={addBottleGroup}>
                    Add bottle group
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Available to bottle
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatLitres(summary.availableForBottlingMl)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Assigned kombucha
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatLitres(summary.totalKombuchaNeededMl)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Still unassigned
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-lg font-semibold",
                      summary.remainingBottlingVolumeMl < 0
                        ? "text-red-700"
                        : "text-foreground"
                    )}
                  >
                    {formatLitres(summary.remainingBottlingVolumeMl)}
                  </p>
                </div>
              </div>

              {summary.remainingBottlingVolumeMl < 0 ? (
                <p className="text-sm text-red-700">
                  This bottle plan exceeds the kombucha available for bottling.
                </p>
              ) : summary.remainingBottlingVolumeMl > 0 ? (
                <p className="text-sm text-muted-foreground">
                  You still have {formatLitres(summary.remainingBottlingVolumeMl)}{" "}
                  unassigned, so you can add another bottle group or keep more
                  kombucha back.
                </p>
              ) : null}

              <div className="space-y-3">
                {bottleGroups.map((group, index) => {
                  const groupPlan = bottlePlansByGroupId[group.id];
                  const targetFillMl = calculateTargetFillMl(
                    group.bottleSizeMl,
                    group.headspaceMl
                  );

                  return (
                    <div
                      key={group.id}
                      className="space-y-4 rounded-2xl border border-border bg-background p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {group.groupLabel?.trim() || `Group ${index + 1}`}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {groupPlan
                              ? `This group uses ${formatLitres(groupPlan.totalKombuchaMl)} of kombucha.`
                              : `Each bottle targets ${targetFillMl}ml before flavour additions.`}
                          </p>
                        </div>

                        {bottleGroups.length > 1 ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeBottleGroup(group.id)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-5">
                        <label className="space-y-1">
                          <span className="text-sm text-muted-foreground">Count</span>
                          <input
                            type="number"
                            value={group.bottleCount}
                            onChange={(event) =>
                              updateBottleGroup(
                                group.id,
                                "bottleCount",
                                Number(event.target.value)
                              )
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-sm text-muted-foreground">
                            Bottle size ml
                          </span>
                          <input
                            type="number"
                            value={group.bottleSizeMl}
                            onChange={(event) =>
                              updateBottleGroup(
                                group.id,
                                "bottleSizeMl",
                                Number(event.target.value)
                              )
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-sm text-muted-foreground">Bottle type</span>
                          <select
                            value={group.bottleType}
                            onChange={(event) =>
                              updateBottleGroup(
                                group.id,
                                "bottleType",
                                event.target.value as F2BottleType
                              )
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
                            onChange={(event) =>
                              updateBottleGroup(
                                group.id,
                                "headspaceMl",
                                Number(event.target.value)
                              )
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-sm text-muted-foreground">Label</span>
                          <input
                            type="text"
                            value={group.groupLabel || ""}
                            onChange={(event) =>
                              updateBottleGroup(group.id, "groupLabel", event.target.value)
                            }
                            placeholder="Optional"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          />
                        </label>
                      </div>

                      <div className="grid gap-3 text-sm md:grid-cols-3">
                        <div className="rounded-xl bg-muted/50 p-3">
                          <p className="text-muted-foreground">Target fill per bottle</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {groupPlan?.targetFillMlPerBottle ?? targetFillMl}ml
                          </p>
                        </div>
                        <div className="rounded-xl bg-muted/50 p-3">
                          <p className="text-muted-foreground">Group bottle volume</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {formatLitres(group.bottleSizeMl * group.bottleCount)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-muted/50 p-3">
                          <p className="text-muted-foreground">Group kombucha use</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {formatLitres(groupPlan?.totalKombuchaMl ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  id: "my" as const,
                  title: "Use my saved recipe",
                  description: "Load one of your saved F2 recipes for this batch.",
                },
                {
                  id: "presets" as const,
                  title: "Use a preset",
                  description: "Start from one of the built-in flavour recipes.",
                },
                {
                  id: "create" as const,
                  title: "Build a custom plan",
                  description: "Create a one-off flavour plan and optionally save it.",
                },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRecipeSource(option.id)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    recipeSourceTab === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">
                    {option.title}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>

            {recipeSourceTab !== "create" ? (
              <div className="space-y-4 rounded-2xl border border-border p-5">
                <div>
                  <h4 className="text-base font-semibold text-foreground">
                    Choose a recipe
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The ingredient list will load automatically and stay aligned with
                    your carbonation target.
                  </p>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    {recipeSourceTab === "my"
                      ? "My saved recipes"
                      : "Built-in presets"}
                  </span>
                  <select
                    value={selectedRecipeId}
                    onChange={(event) => setSelectedRecipeId(event.target.value)}
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

                {selectedRecipeId ? (
                  <div className="space-y-3">
                    {adjustedRecipeItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-border bg-background p-4 text-sm"
                      >
                        <p className="font-semibold text-foreground">
                          {item.customIngredientName || `Ingredient ${index + 1}`}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {item.amountPer500}
                          {item.unit} per 500ml
                        </p>
                        {item.prepNotes ? (
                          <p className="mt-1 text-muted-foreground">{item.prepNotes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Pick a recipe to load the flavour plan for this batch.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-border p-5">
                <div>
                  <h4 className="text-base font-semibold text-foreground">
                    Custom flavour plan
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Build the recipe directly for this batch, then decide whether to
                    save it for later.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Recipe name
                    </span>
                    <input
                      type="text"
                      value={recipeName}
                      onChange={(event) => setRecipeName(event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Save recipe for later
                    </span>
                    <select
                      value={saveRecipe ? "yes" : "no"}
                      onChange={(event) => setSaveRecipe(event.target.value === "yes")}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Description
                  </span>
                  <textarea
                    value={recipeDescription}
                    onChange={(event) => setRecipeDescription(event.target.value)}
                    className="min-h-[90px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setGuidedMode(true)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      guidedMode
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background"
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">
                      Keep guidance on
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Use preset defaults and let the planner tune amounts for the
                      carbonation target.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGuidedMode(false)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      !guidedMode
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background"
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">
                      Edit exact amounts
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Manually set the ingredient amounts per 500ml.
                    </p>
                  </button>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-foreground">
                        Ingredients
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Add the flavour additions you plan to bottle with.
                      </p>
                    </div>

                    <Button type="button" variant="outline" onClick={addRecipeItem}>
                      Add ingredient
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {adjustedRecipeItems.map((item, index) => {
                      const rawItem = recipeItems[index] ?? item;

                      return (
                        <div
                          key={item.id}
                          className="space-y-4 rounded-2xl border border-border p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                Ingredient {index + 1}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {guidedMode
                                  ? "Guidance can still tune this amount for the carbonation target."
                                  : "These are the exact amounts that will be saved."}
                              </p>
                            </div>

                            {recipeItems.length > 1 ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => removeRecipeItem(item.id)}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <label className="space-y-1">
                              <span className="text-sm text-muted-foreground">
                                Preset ingredient
                              </span>
                              <select
                                value={rawItem.flavourPresetId || ""}
                                onChange={(event) =>
                                  applyFlavourPresetToItem(item.id, event.target.value)
                                }
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

                            <label className="space-y-1">
                              <span className="text-sm text-muted-foreground">
                                Ingredient name
                              </span>
                              <input
                                type="text"
                                value={item.customIngredientName || ""}
                                onChange={(event) =>
                                  updateRecipeItem(
                                    item.id,
                                    "customIngredientName",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                              />
                            </label>

                            <label className="space-y-1">
                              <span className="text-sm text-muted-foreground">Form</span>
                              <select
                                value={item.ingredientForm || "juice"}
                                onChange={(event) =>
                                  updateRecipeItem(item.id, "ingredientForm", event.target.value)
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
                              <span className="text-sm text-muted-foreground">
                                {guidedMode ? "Guided per 500ml" : "Amount per 500ml"}
                              </span>
                              <input
                                type="number"
                                value={guidedMode ? item.amountPer500 : rawItem.amountPer500}
                                onChange={(event) =>
                                  updateRecipeItem(
                                    item.id,
                                    "amountPer500",
                                    Number(event.target.value)
                                  )
                                }
                                disabled={guidedMode}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                              />
                            </label>

                            <label className="space-y-1">
                              <span className="text-sm text-muted-foreground">Unit</span>
                              <input
                                type="text"
                                value={guidedMode ? item.unit : rawItem.unit}
                                onChange={(event) =>
                                  updateRecipeItem(item.id, "unit", event.target.value)
                                }
                                disabled={guidedMode}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                              />
                            </label>

                            <label className="space-y-1">
                              <span className="text-sm text-muted-foreground">
                                Displaces bottle volume
                              </span>
                              <select
                                value={item.displacesVolume ? "yes" : "no"}
                                onChange={(event) =>
                                  updateRecipeItem(
                                    item.id,
                                    "displacesVolume",
                                    event.target.value === "yes"
                                  )
                                }
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                              >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                              </select>
                            </label>
                          </div>

                          <label className="block space-y-1">
                            <span className="text-sm text-muted-foreground">
                              Prep notes
                            </span>
                            <textarea
                              value={item.prepNotes || ""}
                              onChange={(event) =>
                                updateRecipeItem(item.id, "prepNotes", event.target.value)
                              }
                              className="min-h-[70px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            {summary.validationErrors.length > 0 ? (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">
                  Fix these before you start F2
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                  {summary.validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-2xl border border-border p-5">
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Total from F1
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {formatLitres(summary.totalF1AvailableMl)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Starter reserve
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {formatLitres(summary.reserveForStarterMl)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Available to bottle
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {formatLitres(summary.availableForBottlingMl)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Bottle count
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {summary.totalBottleCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Kombucha needed
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {formatLitres(summary.totalKombuchaNeededMl)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Pressure watch
                  </p>
                  <p className="mt-2 font-semibold capitalize text-foreground">
                    {summary.riskLevel}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4 rounded-2xl border border-border p-5">
                <div>
                  <h4 className="text-base font-semibold text-foreground">
                    Per bottle instructions
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    These are the practical bottling directions for each group.
                  </p>
                </div>

                <div className="space-y-3">
                  {summary.bottleGroupPlans.map((group, index) => (
                    <div
                      key={group.groupId}
                      className="rounded-2xl border border-border bg-background p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                          {bottleGroups.find((item) => item.id === group.groupId)?.groupLabel?.trim() ||
                            `Group ${index + 1}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {group.bottleCount} x {group.bottleSizeMl}ml{" "}
                          {formatBottleType(group.bottleType)}
                        </p>
                      </div>

                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
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

              <div className="space-y-4">
                <div className="space-y-4 rounded-2xl border border-border p-5">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">
                      Total ingredients
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This is everything you need to prepare before bottling.
                    </p>
                  </div>

                  <ul className="space-y-1 text-sm text-foreground">
                    {summary.ingredientTotals.map((item) => (
                      <li key={`${item.name}-${item.unit}`}>
                        {item.name}: {item.totalAmount}
                        {item.unit}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4 rounded-2xl border border-border p-5">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">
                      Pressure watchouts
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use these notes as safety cues while the bottles are at room
                      temperature.
                    </p>
                  </div>

                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {summary.riskNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>

                  <div className="rounded-2xl bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">
                      Starting F2 will save this setup, create the bottles, attach
                      ingredient rows, and update the batch into the active F2 stage.
                    </p>
                  </div>

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
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            Back
          </Button>

          {step < 5 ? (
            <Button type="button" onClick={handleNext} disabled={!canGoNext}>
              {stepDefinition.nextLabel || "Continue"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Start F2 once the bottling plan looks right.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
