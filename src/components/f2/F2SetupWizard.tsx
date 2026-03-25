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
  type LoadedBottleGroup,
  type LoadedF2Setup,
} from "@/lib/f2-current-setup";
import {
  applyF2ActiveAction,
  type F2ActiveAction,
} from "@/lib/f2-active-actions";
import type {
  BatchStage,
  BatchStatus,
  KombuchaBatch,
} from "@/lib/batches";
import type {
  F2BottleGroupDraft,
  F2BottleType,
  F2CarbonationLevel,
  F2RecipeItemDraft,
  F2RecipeSummary,
  FlavourPresetSummary,
  F2GroupRecipeMode,
} from "@/lib/f2-types";
import { calculateF2SetupSummary } from "@/lib/f2-planner";
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
      "Start with the kombucha you actually have today, then choose how much to keep aside as starter for the next batch.",
    nextLabel: "Continue to carbonation",
  },
  {
    id: 2,
    label: "Carbonation",
    title: "How fizzy do you want it to get?",
    description:
      "Set the carbonation target and the room temperature the bottles will sit in.",
    nextLabel: "Continue to bottle groups",
  },
  {
    id: 3,
    label: "Bottle groups",
    title: "Build your bottle groups",
    description:
      "Add the groups you want to bottle, then use the live fill math to see how much kombucha each one uses.",
    nextLabel: "Continue to flavour plans",
  },
  {
    id: 4,
    label: "Flavour plans",
    title: "Assign a flavour plan to each bottle group",
    description:
      "Different groups can use different recipes from the same F1 batch, including no flavour at all.",
    nextLabel: "Review bottling plan",
  },
  {
    id: 5,
    label: "Review",
    title: "This is your bottling plan.",
    description:
      "Check the group instructions, total ingredients, and pressure watchouts before you start F2.",
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

const BOTTLE_TYPE_OPTIONS: Array<{
  value: F2BottleType;
  label: string;
}> = [
  { value: "swing_top", label: "Swing top" },
  { value: "crown_cap", label: "Crown cap" },
  { value: "screw_cap", label: "Screw cap" },
  { value: "plastic_test_bottle", label: "Plastic test bottle" },
  { value: "other", label: "Other" },
];

const RECIPE_MODE_OPTIONS: Array<{
  value: F2GroupRecipeMode;
  label: string;
  description: string;
}> = [
  {
    value: "none",
    label: "No flavour",
    description: "Bottle this group plain, with no extra ingredients.",
  },
  {
    value: "saved",
    label: "Saved recipe",
    description: "Use one of your saved flavour recipes for this group.",
  },
  {
    value: "preset",
    label: "Preset recipe",
    description: "Use one of the built-in flavour recipes for this group.",
  },
  {
    value: "custom",
    label: "Custom plan",
    description: "Build a fresh flavour plan just for this group.",
  },
];

function formatLitres(value: number | null | undefined) {
  if (value == null) return "-";
  return `${(value / 1000).toFixed(2)}L`;
}

function formatBottleType(value: string) {
  return value.replace(/_/g, " ");
}

function getStepDefinition(step: WizardStepId) {
  return WIZARD_STEPS.find((item) => item.id === step) ?? WIZARD_STEPS[0];
}

function makeRecipeItem(
  overrides: Partial<F2RecipeItemDraft> = {}
): F2RecipeItemDraft {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    flavourPresetId: overrides.flavourPresetId,
    customIngredientName: overrides.customIngredientName ?? "",
    ingredientForm: overrides.ingredientForm ?? "juice",
    amountPer500: overrides.amountPer500 ?? 30,
    unit: overrides.unit ?? "ml",
    prepNotes: overrides.prepNotes ?? "",
    displacesVolume: overrides.displacesVolume ?? true,
  };
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
    recipe:
      overrides.recipe ?? {
        mode: "none",
        selectedRecipeId: null,
        guidedMode: true,
        recipeName: "",
        recipeDescription: "",
        saveRecipe: false,
        recipeItems: [],
      },
  };
}

function mapRecipeItemRowToDraft(row: {
  id: string;
  flavour_preset_id: string | null;
  custom_ingredient_name: string | null;
  ingredient_form: string | null;
  amount_per_500: number;
  unit: string;
  prep_notes: string | null;
  displaces_volume: boolean | null;
}): F2RecipeItemDraft {
  return {
    id: row.id,
    flavourPresetId: row.flavour_preset_id || undefined,
    customIngredientName: row.custom_ingredient_name || "",
    ingredientForm:
      row.ingredient_form === "juice" ||
      row.ingredient_form === "puree" ||
      row.ingredient_form === "whole_fruit" ||
      row.ingredient_form === "syrup" ||
      row.ingredient_form === "herbs_spices" ||
      row.ingredient_form === "other"
        ? row.ingredient_form
        : "juice",
    amountPer500: Number(row.amount_per_500),
    unit: row.unit,
    prepNotes: row.prep_notes || "",
    displacesVolume: row.displaces_volume ?? true,
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

function GroupSummaryLabel({ group }: { group: LoadedBottleGroup }) {
  const itemCount =
    ((group.recipeSnapshotJson as { items?: unknown[] } | null)?.items || []).length;

  if (group.recipeMode === "none") {
    return <span className="text-sm text-muted-foreground">No added flavourings</span>;
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">
        {group.recipeNameSnapshot || "Group flavour plan"}
      </p>
      <p className="text-xs capitalize text-muted-foreground">
        {group.recipeMode} recipe
        {itemCount > 0 ? ` - ${itemCount} ingredient${itemCount === 1 ? "" : "s"}` : ""}
      </p>
    </div>
  );
}

export function SavedF2SetupView({
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
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Current F2 status
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            Bottling setup saved
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This batch already has a saved F2 setup, so this chapter now focuses on
            the current bottling status and what to do next.
          </p>

          <div className="mt-5 rounded-2xl bg-muted/60 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Current next action
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {currentNextAction || "No next action recorded."}
            </p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              Current stage: {currentStage.replace(/_/g, " ")}
            </p>
          </div>

          <div className="mt-5 space-y-3">
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

        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Bottling summary
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
              <p className="mt-1 font-semibold text-foreground">{setup.bottleCount}</p>
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
              <p className="text-muted-foreground">Flavour plan</p>
              <p className="mt-1 font-semibold text-foreground">
                {setup.recipeNameSnapshot || "Mixed bottle groups"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Bottle groups and flavour plans
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Each group keeps its own bottle sizing, flavour identity, and created
              bottles together.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {setup.groups.length} group{setup.groups.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {setup.groups.map((group, index) => (
            <div
              key={group.id}
              className="rounded-2xl border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {group.groupLabel || `Group ${index + 1}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.bottleCount} x {group.bottleSizeMl}ml {formatBottleType(group.bottleType)}
                    {" - "}
                    {group.targetFillMl}ml target fill
                  </p>
                </div>
                <GroupSummaryLabel group={group} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Group volume
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {formatLitres(group.targetFillMl * group.bottleCount)}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Headspace
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {group.headspaceMl}ml
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Bottles created
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {group.bottles.length}
                  </p>
                </div>
              </div>

              {group.bottles.length > 0 ? (
                <Collapsible className="mt-4">
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline">
                      Show created bottles
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    {group.bottles.map((bottle, bottleIndex) => (
                      <div
                        key={bottle.id}
                        className="rounded-2xl border border-border p-3 text-sm"
                      >
                        <p className="font-medium text-foreground">
                          {bottle.bottleLabel || `Bottle ${bottleIndex + 1}`} -{" "}
                          {bottle.bottleSizeMl}ml
                        </p>
                        {bottle.ingredients.length > 0 ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                            {bottle.ingredients.map((ingredient) => (
                              <li key={ingredient.id}>
                                {ingredient.amountValue}
                                {ingredient.amountUnit} {ingredient.ingredientNameSnapshot}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-muted-foreground">
                            No extra ingredients were saved for this bottle.
                          </p>
                        )}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </div>
          ))}
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
  const [step, setStep] = useState<WizardStepId>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<F2ActiveAction | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [currentSetup, setCurrentSetup] = useState<LoadedF2Setup | null>(null);
  const [totalF1AvailableMl, setTotalF1AvailableMl] = useState(batch.totalVolumeMl);
  const [reserveForStarterMl, setReserveForStarterMl] = useState(
    Math.max(0, Math.min(500, batch.starterLiquidMl || 200))
  );
  const [ambientTempC, setAmbientTempC] = useState(batch.avgRoomTempC || 22);
  const [desiredCarbonationLevel, setDesiredCarbonationLevel] =
    useState<F2CarbonationLevel>("balanced");
  const [bottleGroups, setBottleGroups] = useState<F2BottleGroupDraft[]>([
    makeBottleGroup({
      groupLabel: "Main bottles",
    }),
  ]);
  const [myRecipes, setMyRecipes] = useState<F2RecipeSummary[]>([]);
  const [presetRecipes, setPresetRecipes] = useState<F2RecipeSummary[]>([]);
  const [flavourPresets, setFlavourPresets] = useState<FlavourPresetSummary[]>([]);
  const [recipeItemsByRecipeId, setRecipeItemsByRecipeId] = useState<
    Record<string, F2RecipeItemDraft[]>
  >({});

  const stepDefinition = getStepDefinition(step);

  const flavourPresetMap = useMemo(
    () =>
      Object.fromEntries(
        flavourPresets.map((preset) => [
          preset.id,
          {
            ...preset,
            recommendedDefaultPer500:
              preset.recommendedDefaultPer500 != null
                ? Number(preset.recommendedDefaultPer500)
                : null,
            recommendedMaxPer500:
              preset.recommendedMaxPer500 != null
                ? Number(preset.recommendedMaxPer500)
                : null,
          },
        ])
      ),
    [flavourPresets]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [step, currentSetup?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadSetup = async () => {
      setSetupLoading(true);
      try {
        const data = await loadCurrentF2Setup(batch.id);
        if (isMounted) {
          setCurrentSetup(data);
        }
      } catch (error) {
        console.error("Load current F2 setup error:", error);
        if (isMounted) {
          setCurrentSetup(null);
        }
      } finally {
        if (isMounted) {
          setSetupLoading(false);
        }
      }
    };

    void loadSetup();

    return () => {
      isMounted = false;
    };
  }, [batch.id]);

  useEffect(() => {
    let isMounted = true;

    const loadRecipeLibrary = async () => {
      setLibraryLoading(true);

      try {
        const recipeQueries = [
          userId
            ? supabase
                .from("f2_recipes")
                .select("id, name, description, is_preset")
                .eq("user_id", userId)
                .eq("is_active", true)
                .eq("is_preset", false)
                .order("name", { ascending: true })
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from("f2_recipes")
            .select("id, name, description, is_preset")
            .eq("is_active", true)
            .eq("is_preset", true)
            .order("name", { ascending: true }),
          supabase
            .from("flavour_presets")
            .select(
              "id, name, display_name, default_unit, recommended_default_per_500, recommended_max_per_500, carbonation_tendency, is_liquid"
            )
            .order("display_name", { ascending: true }),
        ] as const;

        const [myRecipesResult, presetRecipesResult, flavourPresetsResult] =
          await Promise.all(recipeQueries);

        if (myRecipesResult.error) throw myRecipesResult.error;
        if (presetRecipesResult.error) throw presetRecipesResult.error;
        if (flavourPresetsResult.error) throw flavourPresetsResult.error;

        if (!isMounted) return;

        setMyRecipes(
          (myRecipesResult.data || []).map((recipe) => ({
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            isPreset: false,
          }))
        );
        setPresetRecipes(
          (presetRecipesResult.data || []).map((recipe) => ({
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            isPreset: true,
          }))
        );
        setFlavourPresets(
          (flavourPresetsResult.data || []).map((preset) => ({
            id: preset.id,
            name: preset.name,
            displayName: preset.display_name,
            defaultUnit: preset.default_unit,
            recommendedDefaultPer500: preset.recommended_default_per_500,
            recommendedMaxPer500: preset.recommended_max_per_500,
            carbonationTendency: Number(preset.carbonation_tendency),
            isLiquid: preset.is_liquid,
          }))
        );
      } catch (error) {
        console.error("Load F2 recipe library error:", error);
        if (isMounted) {
          setMyRecipes([]);
          setPresetRecipes([]);
          setFlavourPresets([]);
        }
      } finally {
        if (isMounted) {
          setLibraryLoading(false);
        }
      }
    };

    void loadRecipeLibrary();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const loadRecipeItems = async (recipeId: string) => {
    if (recipeItemsByRecipeId[recipeId]) {
      return recipeItemsByRecipeId[recipeId];
    }

    const { data, error } = await supabase
      .from("f2_recipe_items")
      .select(
        "id, flavour_preset_id, custom_ingredient_name, ingredient_form, amount_per_500, unit, prep_notes, displaces_volume, sort_order"
      )
      .eq("recipe_id", recipeId)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(`Could not load recipe items: ${error.message}`);
    }

    const mappedItems = (data || []).map(mapRecipeItemRowToDraft);
    setRecipeItemsByRecipeId((current) => ({
      ...current,
      [recipeId]: mappedItems,
    }));
    return mappedItems;
  };

  const summary = useMemo(
    () =>
      calculateF2SetupSummary({
        totalF1AvailableMl,
        reserveForStarterMl,
        ambientTempC,
        desiredCarbonationLevel,
        bottleGroups,
        flavourPresetMap,
      }),
    [
      totalF1AvailableMl,
      reserveForStarterMl,
      ambientTempC,
      desiredCarbonationLevel,
      bottleGroups,
      flavourPresetMap,
    ]
  );

  const structuralErrors = summary.validationErrors.filter(
    (error) =>
      !error.includes("needs at least one ingredient") &&
      !error.includes("needs a selected recipe")
  );

  const flavourErrors = summary.validationErrors.filter(
    (error) =>
      error.includes("needs at least one ingredient") ||
      error.includes("needs a selected recipe")
  );

  const canGoNext = useMemo(() => {
    switch (step) {
      case 1:
        return (
          totalF1AvailableMl > 0 &&
          reserveForStarterMl >= 0 &&
          reserveForStarterMl <= totalF1AvailableMl &&
          summary.availableForBottlingMl > 0
        );
      case 2:
        return ambientTempC > 0;
      case 3:
        return bottleGroups.length > 0 && structuralErrors.length === 0;
      case 4:
        return summary.validationErrors.length === 0;
      default:
        return false;
    }
  }, [
    step,
    totalF1AvailableMl,
    reserveForStarterMl,
    summary.availableForBottlingMl,
    bottleGroups.length,
    structuralErrors.length,
    ambientTempC,
    summary.validationErrors.length,
  ]);

  const updateBottleGroup = (
    groupId: string,
    updater: (group: F2BottleGroupDraft) => F2BottleGroupDraft
  ) => {
    setBottleGroups((current) =>
      current.map((group) => (group.id === groupId ? updater(group) : group))
    );
  };

  const updateGroupField = <K extends keyof F2BottleGroupDraft>(
    groupId: string,
    key: K,
    value: F2BottleGroupDraft[K]
  ) => {
    updateBottleGroup(groupId, (group) => ({
      ...group,
      [key]: value,
    }));
  };

  const updateGroupRecipe = (
    groupId: string,
    updater: (
      recipe: F2BottleGroupDraft["recipe"]
    ) => F2BottleGroupDraft["recipe"]
  ) => {
    updateBottleGroup(groupId, (group) => ({
      ...group,
      recipe: updater(group.recipe),
    }));
  };

  const addBottleGroup = () => {
    setBottleGroups((current) => [
      ...current,
      makeBottleGroup({
        groupLabel: `Group ${current.length + 1}`,
      }),
    ]);
  };

  const removeBottleGroup = (groupId: string) => {
    setBottleGroups((current) =>
      current.length > 1 ? current.filter((group) => group.id !== groupId) : current
    );
  };

  const addRecipeItem = (groupId: string) => {
    updateGroupRecipe(groupId, (recipe) => ({
      ...recipe,
      recipeItems: [...recipe.recipeItems, makeRecipeItem()],
    }));
  };

  const removeRecipeItem = (groupId: string, itemId: string) => {
    updateGroupRecipe(groupId, (recipe) => ({
      ...recipe,
      recipeItems:
        recipe.recipeItems.length > 1
          ? recipe.recipeItems.filter((item) => item.id !== itemId)
          : recipe.recipeItems,
    }));
  };

  const updateRecipeItem = <
    K extends keyof F2RecipeItemDraft
  >(
    groupId: string,
    itemId: string,
    key: K,
    value: F2RecipeItemDraft[K]
  ) => {
    updateGroupRecipe(groupId, (recipe) => ({
      ...recipe,
      recipeItems: recipe.recipeItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [key]: value,
            }
          : item
      ),
    }));
  };

  const applyFlavourPresetToItem = (
    groupId: string,
    itemId: string,
    flavourPresetId: string
  ) => {
    const preset = flavourPresets.find((item) => item.id === flavourPresetId);

    updateGroupRecipe(groupId, (recipe) => ({
      ...recipe,
      recipeItems: recipe.recipeItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              flavourPresetId: flavourPresetId || undefined,
              customIngredientName:
                preset?.displayName || preset?.name || item.customIngredientName,
              unit: preset?.defaultUnit || item.unit,
              amountPer500:
                preset?.recommendedDefaultPer500 != null
                  ? Number(preset.recommendedDefaultPer500)
                  : item.amountPer500,
              displacesVolume: preset?.isLiquid ?? item.displacesVolume,
            }
          : item
      ),
    }));
  };

  const setGroupRecipeMode = (groupId: string, mode: F2GroupRecipeMode) => {
    updateGroupRecipe(groupId, (recipe) => {
      if (mode === "none") {
        return {
          ...recipe,
          mode,
          selectedRecipeId: null,
          recipeName: "",
          recipeDescription: "",
          saveRecipe: false,
          recipeItems: [],
        };
      }

      if (mode === "custom") {
        return {
          ...recipe,
          mode,
          selectedRecipeId: null,
          saveRecipe: recipe.saveRecipe ?? false,
          recipeItems:
            recipe.recipeItems.length > 0 ? recipe.recipeItems : [makeRecipeItem()],
        };
      }

      return {
        ...recipe,
        mode,
        selectedRecipeId: null,
        saveRecipe: false,
      };
    });
  };

  const selectRecipeForGroup = async (
    groupId: string,
    mode: "saved" | "preset",
    recipeId: string
  ) => {
    if (!recipeId) {
      updateGroupRecipe(groupId, (recipe) => ({
        ...recipe,
        mode,
        selectedRecipeId: null,
        recipeName: "",
        recipeDescription: "",
        recipeItems: [],
      }));
      return;
    }

    const recipeList = mode === "saved" ? myRecipes : presetRecipes;
    const recipeSummary = recipeList.find((recipe) => recipe.id === recipeId);

    if (!recipeSummary) {
      toast.error("Could not find that recipe.");
      return;
    }

    try {
      const recipeItems = await loadRecipeItems(recipeId);

      updateGroupRecipe(groupId, (recipe) => ({
        ...recipe,
        mode,
        selectedRecipeId: recipeId,
        recipeName: recipeSummary.name,
        recipeDescription: recipeSummary.description || "",
        saveRecipe: false,
        recipeItems,
      }));
    } catch (error) {
      console.error("Select F2 recipe error:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not load that recipe."
      );
    }
  };

  const handleNext = () => {
    if (step < 5 && canGoNext) {
      setStep((current) => (current + 1) as WizardStepId);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((current) => (current - 1) as WizardStepId);
    }
  };

  const handleApplyActiveAction = async (action: F2ActiveAction) => {
    if (!userId) {
      toast.error("You need to be signed in to update this batch.");
      return;
    }

    setActionLoading(action);

    try {
      const result = await applyF2ActiveAction({
        batch,
        userId,
        action,
      });

      toast.success(result.successMessage);
      onBatchStateChanged?.({
        currentStage: result.currentStage,
        updatedAt: result.updatedAt,
        nextAction: result.nextAction,
        status: result.status,
        completedAt: result.completedAt,
      });

      const refreshedSetup = await loadCurrentF2Setup(batch.id);
      setCurrentSetup(refreshedSetup);
    } catch (error) {
      console.error("Apply F2 active action error:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not update this batch."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAndStartF2 = async () => {
    if (!userId) {
      toast.error("You need to be signed in to start F2.");
      return;
    }

    if (summary.validationErrors.length > 0) {
      toast.error("Fix the review errors before starting F2.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await startF2FromWizard({
        batch,
        userId,
        reserveForStarterMl,
        ambientTempC,
        desiredCarbonationLevel,
        bottleGroups,
        summary,
      });

      const refreshedSetup = await loadCurrentF2Setup(batch.id);
      setCurrentSetup(refreshedSetup);
      toast.success("F2 setup saved and bottles created.");
      onF2Started?.({
        f2StartedAt: result.f2StartedAt,
        nextAction: result.nextAction,
      });
    } catch (error) {
      console.error("Start F2 from wizard error:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not start F2."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (setupLoading || libraryLoading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Loading F2 setup...</p>
      </div>
    );
  }

  if (currentSetup) {
    return (
      <SavedF2SetupView
        setup={currentSetup}
        currentStage={batch.currentStage}
        currentNextAction={batch.nextAction}
        actionLoading={actionLoading}
        onCheckedOneBottle={() => void handleApplyActiveAction("checked-one-bottle")}
        onNeedsMoreCarbonation={() =>
          void handleApplyActiveAction("needs-more-carbonation")
        }
        onRefrigerateNow={() => void handleApplyActiveAction("refrigerate-now")}
        onMovedToFridge={() => void handleApplyActiveAction("moved-to-fridge")}
        onMarkCompleted={() => void handleApplyActiveAction("mark-completed")}
      />
    );
  }

  return (
    <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm lg:p-7">
      <div className="space-y-6">
        <StepHeader step={step} />

        {step === 1 ? (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-border bg-background p-5">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Total kombucha available right now
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={totalF1AvailableMl}
                    onChange={(event) =>
                      setTotalF1AvailableMl(Number(event.target.value) || 0)
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base"
                  />
                </label>
                <p className="mt-3 text-sm text-muted-foreground">
                  Use the amount you actually have ready from F1 today.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-5">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Keep aside for next batch starter
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={reserveForStarterMl}
                    onChange={(event) =>
                      setReserveForStarterMl(Number(event.target.value) || 0)
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base"
                  />
                </label>
                <p className="mt-3 text-sm text-muted-foreground">
                  This amount will not be bottled.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-muted/60 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Total from F1
                </p>
                <p className="mt-2 font-semibold text-foreground">
                  {formatLitres(totalF1AvailableMl)}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Starter reserve
                </p>
                <p className="mt-2 font-semibold text-foreground">
                  {formatLitres(summary.reserveForStarterMl)}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Available for bottling
                </p>
                <p className="mt-2 font-semibold text-foreground">
                  {formatLitres(summary.availableForBottlingMl)}
                </p>
              </div>
            </div>

            {structuralErrors.length > 0 ? (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
                <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
                  {structuralErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
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
                      : "border-border bg-background"
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

            <div className="rounded-2xl border border-border bg-background p-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Ambient room temperature
                </span>
                <input
                  type="number"
                  min={0}
                  value={ambientTempC}
                  onChange={(event) =>
                    setAmbientTempC(Number(event.target.value) || 0)
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base"
                />
              </label>
              <p className="mt-3 text-sm text-muted-foreground">
                Warmer rooms usually carbonate faster and need closer attention.
              </p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-foreground">
                  Bottle groups
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add one group for each bottle size or bottle style you want to use.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={addBottleGroup}>
                Add group
              </Button>
            </div>

            <div className="space-y-4">
              {bottleGroups.map((group, index) => {
                const groupPlan = summary.bottleGroupPlans.find(
                  (plan) => plan.groupId === group.id
                );
                const groupUsage = groupPlan
                  ? formatLitres(groupPlan.totalKombuchaMl)
                  : "-";

                return (
                  <div
                    key={group.id}
                    className="rounded-2xl border border-border bg-background p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {group.groupLabel?.trim() || `Group ${index + 1}`}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          This group uses {groupUsage} kombucha based on its current fill
                          plan.
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

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <label className="space-y-1 xl:col-span-2">
                        <span className="text-sm text-muted-foreground">
                          Group label
                        </span>
                        <input
                          type="text"
                          value={group.groupLabel || ""}
                          onChange={(event) =>
                            updateGroupField(group.id, "groupLabel", event.target.value)
                          }
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">
                          Bottle count
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={group.bottleCount}
                          onChange={(event) =>
                            updateGroupField(
                              group.id,
                              "bottleCount",
                              Number(event.target.value) || 0
                            )
                          }
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">
                          Bottle size (ml)
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={group.bottleSizeMl}
                          onChange={(event) =>
                            updateGroupField(
                              group.id,
                              "bottleSizeMl",
                              Number(event.target.value) || 0
                            )
                          }
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">
                          Headspace (ml)
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={group.headspaceMl}
                          onChange={(event) =>
                            updateGroupField(
                              group.id,
                              "headspaceMl",
                              Number(event.target.value) || 0
                            )
                          }
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>
                    </div>

                    <label className="mt-3 block space-y-1">
                      <span className="text-sm text-muted-foreground">Bottle type</span>
                      <select
                        value={group.bottleType}
                        onChange={(event) =>
                          updateGroupField(
                            group.id,
                            "bottleType",
                            event.target.value as F2BottleType
                          )
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      >
                        {BOTTLE_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Target fill per bottle
                        </p>
                        <p className="mt-2 font-semibold text-foreground">
                          {groupPlan ? `${groupPlan.targetFillMlPerBottle.toFixed(0)}ml` : "-"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Total group fill
                        </p>
                        <p className="mt-2 font-semibold text-foreground">
                          {groupPlan ? formatLitres(groupPlan.totalTargetFillMl) : "-"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Group kombucha use
                        </p>
                        <p className="mt-2 font-semibold text-foreground">{groupUsage}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {structuralErrors.length > 0 ? (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
                <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
                  {structuralErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                {summary.remainingBottlingVolumeMl >= 0
                  ? `You still have ${formatLitres(
                      summary.remainingBottlingVolumeMl
                    )} unassigned for bottling.`
                  : `This bottle plan exceeds the available bottling volume by ${formatLitres(
                      Math.abs(summary.remainingBottlingVolumeMl)
                    )}.`}
              </div>
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Different groups can use different recipes from the same F1 batch.
              Plain bottles, saved recipes, presets, and custom plans can all live
              in the same run.
            </div>

            <div className="space-y-4">
              {bottleGroups.map((group, index) => {
                const recipeOptions =
                  group.recipe.mode === "saved" ? myRecipes : presetRecipes;
                const groupPlan = summary.bottleGroupPlans.find(
                  (plan) => plan.groupId === group.id
                );

                return (
                  <div
                    key={group.id}
                    className="rounded-2xl border border-border bg-background p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {group.groupLabel?.trim() || `Group ${index + 1}`}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {group.bottleCount} x {group.bottleSizeMl}ml{" "}
                          {formatBottleType(group.bottleType)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {groupPlan
                          ? `${formatLitres(groupPlan.totalKombuchaMl)} kombucha in this group`
                          : "No plan yet"}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {RECIPE_MODE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setGroupRecipeMode(group.id, option.value)}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-colors",
                            group.recipe.mode === option.value
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background"
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

                    {group.recipe.mode === "saved" || group.recipe.mode === "preset" ? (
                      <div className="mt-4 space-y-4">
                        <label className="block space-y-1">
                          <span className="text-sm text-muted-foreground">
                            {group.recipe.mode === "saved"
                              ? "Saved recipe"
                              : "Preset recipe"}
                          </span>
                          <select
                            value={group.recipe.selectedRecipeId || ""}
                            onChange={(event) =>
                              void selectRecipeForGroup(
                                group.id,
                                group.recipe.mode === "saved" ? "saved" : "preset",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Choose a recipe</option>
                            {recipeOptions.map((recipe) => (
                              <option key={recipe.id} value={recipe.id}>
                                {recipe.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="grid gap-3 md:grid-cols-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateGroupRecipe(group.id, (recipe) => ({
                                ...recipe,
                                guidedMode: true,
                              }))
                            }
                            className={cn(
                              "rounded-2xl border p-4 text-left transition-colors",
                              group.recipe.guidedMode
                                ? "border-primary bg-primary/5"
                                : "border-border bg-background"
                            )}
                          >
                            <p className="text-sm font-semibold text-foreground">
                              Keep guidance on
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Let the planner tune this recipe for the carbonation
                              target.
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateGroupRecipe(group.id, (recipe) => ({
                                ...recipe,
                                guidedMode: false,
                              }))
                            }
                            className={cn(
                              "rounded-2xl border p-4 text-left transition-colors",
                              !group.recipe.guidedMode
                                ? "border-primary bg-primary/5"
                                : "border-border bg-background"
                            )}
                          >
                            <p className="text-sm font-semibold text-foreground">
                              Use saved amounts
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Bottle this group with the exact stored recipe amounts.
                            </p>
                          </button>
                        </div>

                        {group.recipe.recipeItems.length > 0 ? (
                          <div className="rounded-2xl border border-border p-4">
                            <p className="text-sm font-medium text-foreground">
                              This group will use {group.recipe.recipeName || "this recipe"}
                            </p>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                              {group.recipe.recipeItems.map((item) => (
                                <li key={item.id}>
                                  {item.customIngredientName || "Ingredient"} -{" "}
                                  {item.amountPer500}
                                  {item.unit} per 500ml
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {group.recipe.mode === "custom" ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-sm text-muted-foreground">
                              Recipe name
                            </span>
                            <input
                              type="text"
                              value={group.recipe.recipeName || ""}
                              onChange={(event) =>
                                updateGroupRecipe(group.id, (recipe) => ({
                                  ...recipe,
                                  recipeName: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            />
                          </label>

                          <label className="space-y-1">
                            <span className="text-sm text-muted-foreground">
                              Save this as a reusable recipe
                            </span>
                            <select
                              value={group.recipe.saveRecipe ? "yes" : "no"}
                              onChange={(event) =>
                                updateGroupRecipe(group.id, (recipe) => ({
                                  ...recipe,
                                  saveRecipe: event.target.value === "yes",
                                }))
                              }
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </select>
                          </label>
                        </div>

                        <label className="block space-y-1">
                          <span className="text-sm text-muted-foreground">
                            Description
                          </span>
                          <textarea
                            value={group.recipe.recipeDescription || ""}
                            onChange={(event) =>
                              updateGroupRecipe(group.id, (recipe) => ({
                                ...recipe,
                                recipeDescription: event.target.value,
                              }))
                            }
                            className="min-h-[90px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                          />
                        </label>

                        <div className="grid gap-3 md:grid-cols-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateGroupRecipe(group.id, (recipe) => ({
                                ...recipe,
                                guidedMode: true,
                              }))
                            }
                            className={cn(
                              "rounded-2xl border p-4 text-left transition-colors",
                              group.recipe.guidedMode
                                ? "border-primary bg-primary/5"
                                : "border-border bg-background"
                            )}
                          >
                            <p className="text-sm font-semibold text-foreground">
                              Keep guidance on
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Use flavour presets and let the planner tune the amounts.
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateGroupRecipe(group.id, (recipe) => ({
                                ...recipe,
                                guidedMode: false,
                              }))
                            }
                            className={cn(
                              "rounded-2xl border p-4 text-left transition-colors",
                              !group.recipe.guidedMode
                                ? "border-primary bg-primary/5"
                                : "border-border bg-background"
                            )}
                          >
                            <p className="text-sm font-semibold text-foreground">
                              Edit exact amounts
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Set the ingredient amounts per 500ml yourself.
                            </p>
                          </button>
                        </div>

                        <div className="space-y-4 rounded-2xl border border-border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                Ingredients
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Add the ingredients you plan to bottle with this group.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => addRecipeItem(group.id)}
                            >
                              Add ingredient
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {group.recipe.recipeItems.map((item, itemIndex) => (
                              <div
                                key={item.id}
                                className="rounded-2xl border border-border bg-background p-4"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      Ingredient {itemIndex + 1}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {group.recipe.guidedMode
                                        ? "Guidance can still tune this amount for the carbonation target."
                                        : "These are the exact amounts that will be saved."}
                                    </p>
                                  </div>
                                  {group.recipe.recipeItems.length > 1 ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => removeRecipeItem(group.id, item.id)}
                                    >
                                      Remove
                                    </Button>
                                  ) : null}
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  <label className="space-y-1">
                                    <span className="text-sm text-muted-foreground">
                                      Preset ingredient
                                    </span>
                                    <select
                                      value={item.flavourPresetId || ""}
                                      onChange={(event) =>
                                        applyFlavourPresetToItem(
                                          group.id,
                                          item.id,
                                          event.target.value
                                        )
                                      }
                                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
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
                                          group.id,
                                          item.id,
                                          "customIngredientName",
                                          event.target.value
                                        )
                                      }
                                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                                    />
                                  </label>

                                  <label className="space-y-1">
                                    <span className="text-sm text-muted-foreground">
                                      Form
                                    </span>
                                    <select
                                      value={item.ingredientForm || "juice"}
                                      onChange={(event) =>
                                        updateRecipeItem(
                                          group.id,
                                          item.id,
                                          "ingredientForm",
                                          event.target.value as F2RecipeItemDraft["ingredientForm"]
                                        )
                                      }
                                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
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
                                      Amount per 500ml
                                    </span>
                                    <input
                                      type="number"
                                      value={item.amountPer500}
                                      onChange={(event) =>
                                        updateRecipeItem(
                                          group.id,
                                          item.id,
                                          "amountPer500",
                                          Number(event.target.value) || 0
                                        )
                                      }
                                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                                    />
                                  </label>

                                  <label className="space-y-1">
                                    <span className="text-sm text-muted-foreground">
                                      Unit
                                    </span>
                                    <input
                                      type="text"
                                      value={item.unit}
                                      onChange={(event) =>
                                        updateRecipeItem(
                                          group.id,
                                          item.id,
                                          "unit",
                                          event.target.value
                                        )
                                      }
                                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
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
                                          group.id,
                                          item.id,
                                          "displacesVolume",
                                          event.target.value === "yes"
                                        )
                                      }
                                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                                    >
                                      <option value="yes">Yes</option>
                                      <option value="no">No</option>
                                    </select>
                                  </label>
                                </div>

                                <label className="mt-3 block space-y-1">
                                  <span className="text-sm text-muted-foreground">
                                    Prep notes
                                  </span>
                                  <textarea
                                    value={item.prepNotes || ""}
                                    onChange={(event) =>
                                      updateRecipeItem(
                                        group.id,
                                        item.id,
                                        "prepNotes",
                                        event.target.value
                                      )
                                    }
                                    className="min-h-[70px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                                  />
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                  </div>
                );
              })}
            </div>

            {flavourErrors.length > 0 ? (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
                <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
                  {flavourErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
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

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
                  Bottles
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

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
                <div>
                  <h4 className="text-base font-semibold text-foreground">
                    Per-group bottling instructions
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This is the practical bottling plan for each group.
                  </p>
                </div>

                <div className="space-y-3">
                  {summary.bottleGroupPlans.map((group, index) => (
                    <div
                      key={group.groupId}
                      className="rounded-2xl border border-border p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {group.groupLabel?.trim() || `Group ${index + 1}`}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {group.bottleCount} x {group.bottleSizeMl}ml{" "}
                            {formatBottleType(group.bottleType)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {group.recipeMode === "none"
                            ? "No flavour"
                            : group.recipeName || "Group flavour plan"}
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

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Group kombucha
                          </p>
                          <p className="mt-2 font-semibold text-foreground">
                            {formatLitres(group.totalKombuchaMl)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Group additions
                          </p>
                          <p className="mt-2 font-semibold text-foreground">
                            {formatLitres(group.totalLiquidAdditionsMl)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Group total fill
                          </p>
                          <p className="mt-2 font-semibold text-foreground">
                            {formatLitres(group.totalTargetFillMl)}
                          </p>
                        </div>
                      </div>

                      {group.ingredientTotalsForGroup.length > 0 ? (
                        <div className="mt-4 rounded-2xl border border-border p-3">
                          <p className="text-sm font-medium text-foreground">
                            Ingredients for this group
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {group.ingredientTotalsForGroup.map((item) => (
                              <li key={`${group.groupId}-${item.name}-${item.unit}`}>
                                {item.name}: {item.totalAmount}
                                {item.unit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">
                      Total ingredients for the whole bottling run
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      These totals now reflect every bottle in every group.
                    </p>
                  </div>

                  {summary.ingredientTotals.length > 0 ? (
                    <ul className="space-y-1 text-sm text-foreground">
                      {summary.ingredientTotals.map((item) => (
                        <li key={`${item.name}-${item.unit}`}>
                          {item.name}: {item.totalAmount}
                          {item.unit}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No extra ingredients are needed for this bottling run.
                    </p>
                  )}
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
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

                  <div className="rounded-2xl bg-muted/60 p-4">
                    <p className="text-sm text-muted-foreground">
                      Starting F2 will save the group bottle plan, store each group's
                      flavour snapshot, create the bottles, attach ingredient rows,
                      and update the batch into the active F2 stage.
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
