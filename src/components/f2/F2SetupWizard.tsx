import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { f2SetupCopy } from "@/copy/f2-setup";
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

function formatLitres(value: number | null | undefined) {
  if (value == null) return "-";
  return `${(value / 1000).toFixed(2)}L`;
}

function formatBottleType(value: string) {
  return value.replace(/_/g, " ");
}

function getStepDefinition(step: WizardStepId) {
  return f2SetupCopy.steps.find((item) => item.id === step) ?? f2SetupCopy.steps[0];
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
  const progressValue = (step / f2SetupCopy.steps.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {f2SetupCopy.progress.stepCounter(step, f2SetupCopy.steps.length)}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {definition.label}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{f2SetupCopy.progress.flowLabel}</p>
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
    return (
      <span className="text-sm text-muted-foreground">
        {f2SetupCopy.common.noAddedFlavorings}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">
        {group.recipeNameSnapshot || f2SetupCopy.common.groupFlavorPlan}
      </p>
      <p className="text-xs capitalize text-muted-foreground">
        {f2SetupCopy.saved.groups.recipeModeSummary({
          recipeMode: group.recipeMode,
          count: itemCount,
        })}
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
            {f2SetupCopy.saved.statusEyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            {f2SetupCopy.saved.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {f2SetupCopy.saved.description}
          </p>

          <div className="mt-5 rounded-2xl bg-muted/60 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {f2SetupCopy.saved.nextAction.eyebrow}
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {currentNextAction || f2SetupCopy.common.noNextAction}
            </p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {f2SetupCopy.saved.nextAction.stage(currentStage)}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium text-foreground">
              {f2SetupCopy.saved.actions.heading}
            </p>

            {currentStage === "f2_active" ? (
              <div className="grid gap-2 md:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCheckedOneBottle}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "checked-one-bottle"
                    ? f2SetupCopy.common.saving
                    : f2SetupCopy.saved.actions.checkedOneBottle}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onNeedsMoreCarbonation}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "needs-more-carbonation"
                    ? f2SetupCopy.common.saving
                    : f2SetupCopy.saved.actions.needsMoreCarbonation}
                </Button>
                <Button
                  type="button"
                  onClick={onRefrigerateNow}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "refrigerate-now"
                    ? f2SetupCopy.common.saving
                    : f2SetupCopy.saved.actions.refrigerateNow}
                </Button>
              </div>
            ) : currentStage === "refrigerate_now" ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  {f2SetupCopy.saved.actions.readyToRefrigerate}
                </p>
                <Button
                  type="button"
                  onClick={onMovedToFridge}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "moved-to-fridge"
                    ? f2SetupCopy.common.saving
                    : f2SetupCopy.saved.actions.movedToFridge}
                </Button>
              </div>
            ) : currentStage === "chilled_ready" ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  {f2SetupCopy.saved.actions.chilledReady}
                </p>
                <Button
                  type="button"
                  onClick={onMarkCompleted}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "mark-completed"
                    ? f2SetupCopy.common.saving
                    : f2SetupCopy.saved.actions.markCompleted}
                </Button>
              </div>
            ) : currentStage === "completed" ? (
              <p className="text-sm text-foreground">
                {f2SetupCopy.saved.actions.completed}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {f2SetupCopy.common.noActionsForStage}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {f2SetupCopy.saved.summary.eyebrow}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">{f2SetupCopy.saved.summary.totalFromF1}</p>
              <p className="mt-1 font-semibold text-foreground">
                {formatLitres(setup.totalF1AvailableMl)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{f2SetupCopy.saved.summary.starterReserve}</p>
              <p className="mt-1 font-semibold text-foreground">
                {formatLitres(setup.reserveForStarterMl)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {f2SetupCopy.saved.summary.availableToBottle}
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {formatLitres(setup.availableForBottlingMl)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{f2SetupCopy.saved.summary.bottles}</p>
              <p className="mt-1 font-semibold text-foreground">{setup.bottleCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{f2SetupCopy.saved.summary.carbonation}</p>
              <p className="mt-1 font-semibold capitalize text-foreground">
                {setup.desiredCarbonationLevel}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pressure watch</p>
              <p className="mt-1 font-semibold capitalize text-foreground">
                {setup.estimatedPressureRisk || f2SetupCopy.common.unknown}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{f2SetupCopy.saved.summary.ambientRoom}</p>
              <p className="mt-1 font-semibold text-foreground">
                {setup.ambientTempC}°C
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{f2SetupCopy.saved.summary.flavourPlan}</p>
              <p className="mt-1 font-semibold text-foreground">
                {setup.recipeNameSnapshot || f2SetupCopy.common.mixedBottleGroups}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {f2SetupCopy.saved.groups.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {f2SetupCopy.saved.groups.description}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {f2SetupCopy.common.groupCount(setup.groups.length)}
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
                    {group.groupLabel || f2SetupCopy.common.groupLabel(index)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {f2SetupCopy.saved.groups.targetFill({
                      bottleCount: group.bottleCount,
                      bottleSizeMl: group.bottleSizeMl,
                      bottleType: group.bottleType,
                      targetFillMl: group.targetFillMl,
                    })}
                  </p>
                </div>
                <GroupSummaryLabel group={group} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {f2SetupCopy.saved.groups.groupVolume}
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {formatLitres(group.targetFillMl * group.bottleCount)}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {f2SetupCopy.saved.groups.headspace}
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {group.headspaceMl}ml
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {f2SetupCopy.saved.groups.bottlesCreated}
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
                      {f2SetupCopy.saved.groups.showCreatedBottles}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    {group.bottles.map((bottle, bottleIndex) => (
                      <div
                        key={bottle.id}
                        className="rounded-2xl border border-border p-3 text-sm"
                      >
                        <p className="font-medium text-foreground">
                          {bottle.bottleLabel || f2SetupCopy.common.bottleLabel(bottleIndex)} -{" "}
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
                            {f2SetupCopy.common.noExtraIngredientsForBottle}
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
      toast.error(f2SetupCopy.feedback.toasts.missingRecipe);
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
      toast.error(error instanceof Error ? error.message : f2SetupCopy.feedback.toasts.loadRecipe);
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
      toast.error(f2SetupCopy.feedback.toasts.signInToUpdate);
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
      toast.error(error instanceof Error ? error.message : f2SetupCopy.feedback.toasts.updateBatch);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAndStartF2 = async () => {
    if (!userId) {
      toast.error(f2SetupCopy.feedback.toasts.signInToStart);
      return;
    }

    if (summary.validationErrors.length > 0) {
      toast.error(f2SetupCopy.feedback.toasts.fixReviewErrors);
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
      toast.success(f2SetupCopy.feedback.toasts.started);
      onF2Started?.({
        f2StartedAt: result.f2StartedAt,
        nextAction: result.nextAction,
      });
    } catch (error) {
      console.error("Start F2 from wizard error:", error);
      toast.error(error instanceof Error ? error.message : f2SetupCopy.feedback.toasts.couldNotStart);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (setupLoading || libraryLoading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{f2SetupCopy.common.loading}</p>
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
                    {f2SetupCopy.setup.volume.totalAvailable}
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
                  {f2SetupCopy.setup.volume.totalAvailableDescription}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-5">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    {f2SetupCopy.setup.volume.reserveForStarter}
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
                  {f2SetupCopy.setup.volume.reserveForStarterDescription}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-muted/60 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {f2SetupCopy.setup.volume.totalFromF1}
                </p>
                <p className="mt-2 font-semibold text-foreground">
                  {formatLitres(totalF1AvailableMl)}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {f2SetupCopy.setup.volume.starterReserve}
                </p>
                <p className="mt-2 font-semibold text-foreground">
                  {formatLitres(summary.reserveForStarterMl)}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {f2SetupCopy.setup.volume.availableForBottling}
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
              {f2SetupCopy.options.carbonation.map((option) => (
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
                  {f2SetupCopy.setup.carbonation.ambientRoomTemperature}
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
                {f2SetupCopy.setup.carbonation.ambientRoomDescription}
              </p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-foreground">
                  {f2SetupCopy.setup.bottleGroups.title}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {f2SetupCopy.setup.bottleGroups.description}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={addBottleGroup}>
                {f2SetupCopy.setup.bottleGroups.addGroup}
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
                          {group.groupLabel?.trim() || f2SetupCopy.common.groupLabel(index)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {f2SetupCopy.setup.bottleGroups.cards.usage(groupUsage)}
                        </p>
                      </div>
                      {bottleGroups.length > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeBottleGroup(group.id)}
                        >
                          {f2SetupCopy.setup.bottleGroups.remove}
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <label className="space-y-1 xl:col-span-2">
                        <span className="text-sm text-muted-foreground">
                          {f2SetupCopy.setup.bottleGroups.fields.groupLabel}
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
                          {f2SetupCopy.setup.bottleGroups.fields.bottleCount}
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
                          {f2SetupCopy.setup.bottleGroups.fields.bottleSizeMl}
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
                          {f2SetupCopy.setup.bottleGroups.fields.headspaceMl}
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
                      <span className="text-sm text-muted-foreground">
                        {f2SetupCopy.setup.bottleGroups.fields.bottleType}
                      </span>
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
                        {f2SetupCopy.options.bottleTypes.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {f2SetupCopy.setup.bottleGroups.cards.targetFillPerBottle}
                        </p>
                        <p className="mt-2 font-semibold text-foreground">
                          {groupPlan ? `${groupPlan.targetFillMlPerBottle.toFixed(0)}ml` : "-"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {f2SetupCopy.setup.bottleGroups.cards.totalGroupFill}
                        </p>
                        <p className="mt-2 font-semibold text-foreground">
                          {groupPlan ? formatLitres(groupPlan.totalTargetFillMl) : "-"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {f2SetupCopy.setup.bottleGroups.cards.groupKombuchaUse}
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
                  ? f2SetupCopy.setup.bottleGroups.cards.remaining(
                      formatLitres(summary.remainingBottlingVolumeMl)
                    )
                  : f2SetupCopy.setup.bottleGroups.cards.exceeds(
                      formatLitres(Math.abs(summary.remainingBottlingVolumeMl))
                    )}
              </div>
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {f2SetupCopy.setup.flavour.intro}
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
                          {group.groupLabel?.trim() || f2SetupCopy.common.groupLabel(index)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {group.bottleCount} x {group.bottleSizeMl}ml{" "}
                          {formatBottleType(group.bottleType)}
                        </p>
                      </div>
                        <p className="text-xs text-muted-foreground">
                          {groupPlan
                            ? f2SetupCopy.setup.flavour.groupUsage(
                                formatLitres(groupPlan.totalKombuchaMl)
                              )
                            : f2SetupCopy.common.noPlanYet}
                        </p>
                      </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {f2SetupCopy.options.recipeModes.map((option) => (
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
                              ? f2SetupCopy.setup.flavour.savedRecipe
                              : f2SetupCopy.setup.flavour.presetRecipe}
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
                            <option value="">{f2SetupCopy.common.chooseRecipePlaceholder}</option>
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
                              {f2SetupCopy.setup.flavour.keepGuidanceOn}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {f2SetupCopy.setup.flavour.keepGuidanceOnDescription}
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
                              {f2SetupCopy.setup.flavour.useSavedAmounts}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {f2SetupCopy.setup.flavour.useSavedAmountsDescription}
                            </p>
                          </button>
                        </div>

                        {group.recipe.recipeItems.length > 0 ? (
                          <div className="rounded-2xl border border-border p-4">
                            <p className="text-sm font-medium text-foreground">
                              {f2SetupCopy.setup.flavour.thisGroupWillUse(
                                group.recipe.recipeName || undefined
                              )}
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
                              {f2SetupCopy.setup.flavour.custom.recipeName}
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
                              {f2SetupCopy.setup.flavour.custom.saveReusableRecipe}
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
                              <option value="no">{f2SetupCopy.options.yesNo.no}</option>
                              <option value="yes">{f2SetupCopy.options.yesNo.yes}</option>
                            </select>
                          </label>
                        </div>

                        <label className="block space-y-1">
                          <span className="text-sm text-muted-foreground">
                            {f2SetupCopy.setup.flavour.custom.description}
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
                              {f2SetupCopy.setup.flavour.keepGuidanceOn}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {f2SetupCopy.setup.flavour.custom.keepGuidanceOnDescription}
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
                              {f2SetupCopy.setup.flavour.custom.editExactAmounts}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {f2SetupCopy.setup.flavour.custom.editExactAmountsDescription}
                            </p>
                          </button>
                        </div>

                        <div className="space-y-4 rounded-2xl border border-border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {f2SetupCopy.setup.flavour.custom.ingredientsTitle}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {f2SetupCopy.setup.flavour.custom.ingredientsDescription}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => addRecipeItem(group.id)}
                            >
                              {f2SetupCopy.setup.flavour.custom.addIngredient}
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
                                      {f2SetupCopy.setup.flavour.custom.ingredient(itemIndex)}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {group.recipe.guidedMode
                                        ? f2SetupCopy.setup.flavour.custom.guidedIngredientDescription
                                        : f2SetupCopy.setup.flavour.custom.exactIngredientDescription}
                                    </p>
                                  </div>
                                  {group.recipe.recipeItems.length > 1 ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => removeRecipeItem(group.id, item.id)}
                                    >
                                      {f2SetupCopy.setup.flavour.custom.remove}
                                    </Button>
                                  ) : null}
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  <label className="space-y-1">
                                    <span className="text-sm text-muted-foreground">
                                      {f2SetupCopy.setup.flavour.custom.fields.presetIngredient}
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
                                      <option value="">
                                        {f2SetupCopy.common.presetIngredientPlaceholder}
                                      </option>
                                      {flavourPresets.map((preset) => (
                                        <option key={preset.id} value={preset.id}>
                                          {preset.displayName || preset.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="space-y-1">
                                    <span className="text-sm text-muted-foreground">
                                      {f2SetupCopy.setup.flavour.custom.fields.ingredientName}
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
                                      {f2SetupCopy.setup.flavour.custom.fields.form}
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
                                      {f2SetupCopy.options.ingredientForms.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="space-y-1">
                                    <span className="text-sm text-muted-foreground">
                                      {f2SetupCopy.setup.flavour.custom.fields.amountPer500}
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
                                      {f2SetupCopy.setup.flavour.custom.fields.unit}
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
                                      {f2SetupCopy.setup.flavour.custom.fields.displacesBottleVolume}
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
                                      <option value="yes">{f2SetupCopy.options.yesNo.yes}</option>
                                      <option value="no">{f2SetupCopy.options.yesNo.no}</option>
                                    </select>
                                  </label>
                                </div>

                                <label className="mt-3 block space-y-1">
                                  <span className="text-sm text-muted-foreground">
                                    {f2SetupCopy.setup.flavour.custom.fields.prepNotes}
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
                  {f2SetupCopy.setup.review.fixBeforeStart}
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
                  {f2SetupCopy.setup.review.totalFromF1}
                </p>
                <p className="mt-2 font-semibold text-foreground">
                  {formatLitres(summary.totalF1AvailableMl)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {f2SetupCopy.setup.review.starterReserve}
                </p>
                <p className="mt-2 font-semibold text-foreground">
                  {formatLitres(summary.reserveForStarterMl)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {f2SetupCopy.setup.review.availableToBottle}
                </p>
                <p className="mt-2 font-semibold text-foreground">
                  {formatLitres(summary.availableForBottlingMl)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {f2SetupCopy.setup.review.bottles}
                </p>
                <p className="mt-2 font-semibold text-foreground">
                  {summary.totalBottleCount}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {f2SetupCopy.setup.review.kombuchaNeeded}
                </p>
                <p className="mt-2 font-semibold text-foreground">
                  {formatLitres(summary.totalKombuchaNeededMl)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {f2SetupCopy.setup.review.pressureWatch}
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
                      {f2SetupCopy.setup.review.groupInstructions}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {f2SetupCopy.setup.review.groupInstructionsDescription}
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
                            {group.groupLabel?.trim() || f2SetupCopy.common.groupLabel(index)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {group.bottleCount} x {group.bottleSizeMl}ml{" "}
                            {formatBottleType(group.bottleType)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {group.recipeMode === "none"
                            ? f2SetupCopy.common.noFlavour
                            : group.recipeName || f2SetupCopy.common.groupFlavorPlan}
                        </p>
                      </div>

                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
                        {group.scaledItemsPerBottle.map((item) => (
                          <li key={item.id}>
                            {f2SetupCopy.setup.review.addInstruction({
                              amount: item.scaledAmount.toFixed(1),
                              unit: item.unit,
                              ingredientName:
                                item.customIngredientName || f2SetupCopy.common.ingredientFallback,
                            })}
                          </li>
                        ))}
                        <li>
                          {f2SetupCopy.setup.review.topWith(
                            group.kombuchaMlPerBottle.toFixed(1)
                          )}
                        </li>
                        <li>{f2SetupCopy.setup.review.leaveHeadspace(group.headspaceMl)}</li>
                      </ul>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {f2SetupCopy.setup.review.groupKombucha}
                          </p>
                          <p className="mt-2 font-semibold text-foreground">
                            {formatLitres(group.totalKombuchaMl)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {f2SetupCopy.setup.review.groupAdditions}
                          </p>
                          <p className="mt-2 font-semibold text-foreground">
                            {formatLitres(group.totalLiquidAdditionsMl)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-muted/60 p-3 text-sm">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {f2SetupCopy.setup.review.groupTotalFill}
                          </p>
                          <p className="mt-2 font-semibold text-foreground">
                            {formatLitres(group.totalTargetFillMl)}
                          </p>
                        </div>
                      </div>

                      {group.ingredientTotalsForGroup.length > 0 ? (
                        <div className="mt-4 rounded-2xl border border-border p-3">
                            <p className="text-sm font-medium text-foreground">
                              {f2SetupCopy.setup.review.ingredientsForGroup}
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
                      {f2SetupCopy.setup.review.totalIngredientsTitle}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {f2SetupCopy.setup.review.totalIngredientsDescription}
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
                      {f2SetupCopy.common.noExtraIngredientsForRun}
                    </p>
                  )}
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">
                      {f2SetupCopy.setup.review.pressureWatchouts}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {f2SetupCopy.setup.review.pressureWatchoutsDescription}
                    </p>
                  </div>

                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {summary.riskNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>

                  <div className="rounded-2xl bg-muted/60 p-4">
                    <p className="text-sm text-muted-foreground">
                      {f2SetupCopy.setup.review.startDescription}
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleConfirmAndStartF2}
                    disabled={isSubmitting || summary.validationErrors.length > 0}
                    className="w-full"
                  >
                    {isSubmitting
                      ? f2SetupCopy.setup.review.starting
                      : f2SetupCopy.setup.review.startAction}
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
            {f2SetupCopy.common.back}
          </Button>

          {step < 5 ? (
            <Button type="button" onClick={handleNext} disabled={!canGoNext}>
              {("nextLabel" in stepDefinition && stepDefinition.nextLabel) ||
                f2SetupCopy.common.continue}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {f2SetupCopy.setup.review.footerHint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
