import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { F1RecommendationSection } from "@/components/f1/F1RecommendationSection";
import { F1RecipeEditor } from "@/components/f1/F1RecipeEditor";
import { F1RecipePicker } from "@/components/f1/F1RecipePicker";
import { F1SetupSummary } from "@/components/f1/F1SetupSummary";
import { F1VesselPicker } from "@/components/f1/F1VesselPicker";
import { NewBatchProgress } from "@/components/f1/new-batch/NewBatchProgress";
import { NewBatchStepFooter } from "@/components/f1/new-batch/NewBatchStepFooter";
import AppLayout from "@/components/layout/AppLayout";
import { StarterSourceSelector } from "@/components/lineage/StarterSourceSelector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { isBrewAgainNavigationState } from "@/lib/brew-again";
import type { BrewAgainNavigationState } from "@/lib/brew-again-types";
import {
  buildF1Recommendations,
  loadF1RecommendationHistoryContext,
} from "@/lib/f1-recommendations";
import type {
  F1RecommendationCard,
  F1RecommendationSnapshot,
} from "@/lib/f1-recommendation-types";
import {
  applyRecipeToBatchSetup,
  buildRecipeDraftFromBatchSetup,
  createEmptyF1RecipeDraft,
  F1_SUGAR_TYPES,
  F1_TARGET_PREFERENCES,
  F1_TEA_AMOUNT_UNITS,
  F1_TEA_SOURCE_FORMS,
  F1_TEA_TYPES,
  type F1BatchSetupFields,
  type F1RecipeDraft,
  type F1RecipeSummary,
} from "@/lib/f1-recipe-types";
import { buildF1SetupSummary } from "@/lib/f1-setup-summary";
import { saveBatchF1Setup } from "@/lib/f1-setups";
import {
  buildSelectedVesselFromDraft,
  buildSelectedVesselFromSaved,
  createEmptyFermentationVesselDraft,
  createManualVesselSelection,
  getDefaultSuitabilityForMaterial,
  getLegacyVesselTypeLabel,
  getVesselMaterialLabel,
  getVesselSuitabilityLabel,
  type FermentationVesselDraft,
  type FermentationVesselSummary,
  type SelectedF1Vessel,
} from "@/lib/f1-vessel-types";
import { loadFermentationVessels, saveFermentationVessel } from "@/lib/f1-vessels";
import { loadF1Recipes, saveF1Recipe } from "@/lib/f1-recipes";
import { loadStarterSourceCandidates, type LineageBatchSummary } from "@/lib/lineage";

type NewBatchStartMode = "scratch" | "recipe" | "brew_again";
type NewBatchStepId = "start" | "brew" | "context" | "review";

type NewBatchForm = F1BatchSetupFields & {
  name: string;
  brewDate: string;
  initialPh: string;
};

const teaSourceFormLabels: Record<NewBatchForm["teaSourceForm"], string> = {
  tea_bags: "Tea bags",
  loose_leaf: "Loose leaf",
  other: "Other",
};

const stepItems = [
  { id: "start", label: "How to begin", shortLabel: "Start" },
  { id: "brew", label: "Today's brew", shortLabel: "Brew" },
  { id: "context", label: "Vessel and starter", shortLabel: "Context" },
  { id: "review", label: "Review and create", shortLabel: "Review" },
] satisfies { id: NewBatchStepId; label: string; shortLabel: string }[];

function buildInitialForm(brewAgainState: BrewAgainNavigationState | null): NewBatchForm {
  return {
    name: brewAgainState?.prefill.name || "",
    brewDate: brewAgainState?.prefill.brewDate || new Date().toISOString().split("T")[0],
    totalVolumeMl: brewAgainState?.prefill.totalVolumeMl || 3800,
    teaType: brewAgainState?.prefill.teaType || "Black tea",
    teaSourceForm: brewAgainState?.prefill.teaSourceForm || "tea_bags",
    teaAmountValue: brewAgainState?.prefill.teaAmountValue || 8,
    teaAmountUnit: brewAgainState?.prefill.teaAmountUnit || "bags",
    sugarG: brewAgainState?.prefill.sugarG || 200,
    sugarType: brewAgainState?.prefill.sugarType || "Cane sugar",
    starterLiquidMl: brewAgainState?.prefill.starterLiquidMl || 380,
    scobyPresent: brewAgainState?.prefill.scobyPresent ?? true,
    avgRoomTempC: brewAgainState?.prefill.avgRoomTempC || 23,
    vesselType: brewAgainState?.prefill.vesselType || "Glass jar",
    targetPreference: brewAgainState?.prefill.targetPreference || "balanced",
    initialPh: brewAgainState?.prefill.initialPh || "",
    initialNotes: brewAgainState?.prefill.initialNotes || "",
  };
}

function createManualDraftForVessel(vesselType: string): FermentationVesselDraft {
  const selection = createManualVesselSelection(vesselType);

  return {
    ...createEmptyFermentationVesselDraft(),
    name: selection.name,
    materialType: selection.materialType,
    f1Suitability: selection.f1Suitability,
  };
}

function formatLiters(value: number) {
  return `${(value / 1000).toFixed(value % 1000 === 0 ? 1 : 2)}L`;
}

function formatTeaStrength(form: NewBatchForm) {
  const liters = form.totalVolumeMl > 0 ? form.totalVolumeMl / 1000 : 0;

  if (liters <= 0) {
    return null;
  }

  if (form.teaAmountUnit === "g") {
    return `${(form.teaAmountValue / liters).toFixed(1)} g/L`;
  }

  return `${form.teaAmountValue} ${form.teaAmountUnit} for ${formatLiters(form.totalVolumeMl)}`;
}

function getStartCardClasses(selected: boolean) {
  return selected
    ? "border-primary/30 bg-primary/10 shadow-sm shadow-primary/10"
    : "border-border bg-card hover:border-primary/20 hover:bg-primary/5";
}

export default function NewBatch() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isBeginner } = useUser();
  const { user } = useAuth();

  const brewAgainState = isBrewAgainNavigationState(location.state)
    ? (location.state as BrewAgainNavigationState)
    : null;
  const hasBrewAgainOption = !!brewAgainState;
  const initialStartMode: NewBatchStartMode = hasBrewAgainOption ? "brew_again" : "scratch";
  const initialForm = useMemo(() => buildInitialForm(null), []);
  const initialBrewAgainForm = useMemo(() => buildInitialForm(brewAgainState), [brewAgainState]);

  const [currentStep, setCurrentStep] = useState<NewBatchStepId>("start");
  const [startMode, setStartMode] = useState<NewBatchStartMode>(initialStartMode);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showManualVesselDetails, setShowManualVesselDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const [saveRecipeOpen, setSaveRecipeOpen] = useState(false);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [vesselPickerOpen, setVesselPickerOpen] = useState(false);
  const [vesselLoading, setVesselLoading] = useState(false);
  const [manualVesselSaving, setManualVesselSaving] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<F1RecipeSummary | null>(null);
  const [availableRecipes, setAvailableRecipes] = useState<F1RecipeSummary[]>([]);
  const [availableVessels, setAvailableVessels] = useState<FermentationVesselSummary[]>([]);
  const [recipeDraft, setRecipeDraft] = useState<F1RecipeDraft>(createEmptyF1RecipeDraft());
  const [manualVesselDraft, setManualVesselDraft] = useState<FermentationVesselDraft>(
    createManualDraftForVessel(initialBrewAgainForm.vesselType)
  );
  const [selectedVessel, setSelectedVessel] = useState<SelectedF1Vessel>(
    createManualVesselSelection(initialBrewAgainForm.vesselType)
  );
  const [starterSourceOptions, setStarterSourceOptions] = useState<LineageBatchSummary[]>([]);
  const [starterSourceLoading, setStarterSourceLoading] = useState(false);
  const [starterSourceBatchId, setStarterSourceBatchId] = useState<string | null>(null);
  const [recommendationHistoryLoading, setRecommendationHistoryLoading] = useState(false);
  const [recommendationHistory, setRecommendationHistory] = useState<
    Awaited<ReturnType<typeof loadF1RecommendationHistoryContext>>
  >([]);
  const [appliedAdjustments, setAppliedAdjustments] = useState<
    F1RecommendationSnapshot["appliedAdjustments"]
  >([]);
  const [form, setForm] = useState<NewBatchForm>(initialBrewAgainForm);

  const activeBrewAgainSourceBatchId =
    startMode === "brew_again" ? brewAgainState?.sourceSummary.sourceBatchId || null : null;
  const recommendedStarterSourceBatchId = activeBrewAgainSourceBatchId;

  const update = <K extends keyof NewBatchForm>(key: K, value: NewBatchForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const loadRecipes = async () => {
    setRecipeLoading(true);

    try {
      setAvailableRecipes(await loadF1Recipes());
    } catch (error) {
      console.error("Load F1 recipes error:", error);
      toast.error(error instanceof Error ? error.message : "Could not load recipes.");
    } finally {
      setRecipeLoading(false);
    }
  };

  const loadVessels = async () => {
    setVesselLoading(true);

    try {
      setAvailableVessels(await loadFermentationVessels());
    } catch (error) {
      console.error("Load fermentation vessels error:", error);
      toast.error(error instanceof Error ? error.message : "Could not load vessels.");
    } finally {
      setVesselLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setAvailableRecipes([]);
      setAvailableVessels([]);
      return;
    }

    void loadRecipes();
    void loadVessels();
  }, [user?.id]);

  useEffect(() => {
    if (!selectedRecipe?.preferredVesselId) {
      return;
    }

    const preferredVessel = availableVessels.find(
      (vessel) => vessel.id === selectedRecipe.preferredVesselId
    );

    if (preferredVessel) {
      setSelectedVessel(buildSelectedVesselFromSaved(preferredVessel));
    }
  }, [availableVessels, selectedRecipe?.preferredVesselId]);

  useEffect(() => {
    if (!user?.id) {
      setStarterSourceOptions([]);
      setStarterSourceBatchId(null);
      return;
    }

    let isActive = true;
    setStarterSourceLoading(true);

    void loadStarterSourceCandidates(user.id)
      .then((options) => {
        if (!isActive) {
          return;
        }

        setStarterSourceOptions(options);

        if (
          recommendedStarterSourceBatchId &&
          options.some((option) => option.id === recommendedStarterSourceBatchId)
        ) {
          setStarterSourceBatchId(recommendedStarterSourceBatchId);
          return;
        }

        setStarterSourceBatchId((current) =>
          current && options.some((option) => option.id === current) ? current : null
        );
      })
      .catch((error) => {
        console.error("Load starter source candidates error:", error);
        if (isActive) {
          setStarterSourceOptions([]);
          setStarterSourceBatchId(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setStarterSourceLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [recommendedStarterSourceBatchId, user?.id]);

  const batchSetupFields = useMemo<F1BatchSetupFields>(
    () => ({
      totalVolumeMl: form.totalVolumeMl,
      teaType: form.teaType,
      teaSourceForm: form.teaSourceForm,
      teaAmountValue: form.teaAmountValue,
      teaAmountUnit: form.teaAmountUnit,
      sugarG: form.sugarG,
      sugarType: form.sugarType,
      starterLiquidMl: form.starterLiquidMl,
      scobyPresent: form.scobyPresent,
      avgRoomTempC: form.avgRoomTempC,
      vesselType: getLegacyVesselTypeLabel(selectedVessel),
      targetPreference: form.targetPreference,
      initialNotes: form.initialNotes,
    }),
    [form, selectedVessel]
  );

  const recommendationDraft = useMemo(
    () => ({
      brewDate: form.brewDate,
      setup: batchSetupFields,
      selectedRecipeId: selectedRecipe?.id || null,
      selectedVessel,
      starterSourceBatchId,
      brewAgainSourceBatchId: activeBrewAgainSourceBatchId,
    }),
    [
      activeBrewAgainSourceBatchId,
      batchSetupFields,
      form.brewDate,
      selectedRecipe?.id,
      selectedVessel,
      starterSourceBatchId,
    ]
  );

  useEffect(() => {
    if (!user?.id) {
      setRecommendationHistory([]);
      return;
    }

    let isActive = true;
    setRecommendationHistoryLoading(true);

    void loadF1RecommendationHistoryContext({
      userId: user.id,
      draft: recommendationDraft,
    })
      .then((history) => {
        if (isActive) {
          setRecommendationHistory(history);
        }
      })
      .catch((error) => {
        console.error("Load recommendation history error:", error);
        if (isActive) {
          setRecommendationHistory([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setRecommendationHistoryLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [recommendationDraft, user?.id]);

  const recommendations = useMemo(
    () =>
      buildF1Recommendations({
        draft: recommendationDraft,
        history: recommendationHistory,
        appliedAdjustments,
      }),
    [appliedAdjustments, recommendationHistory, recommendationDraft]
  );

  const summary = useMemo(
    () => buildF1SetupSummary(batchSetupFields, selectedVessel),
    [batchSetupFields, selectedVessel]
  );

  const starterRatioPercent =
    form.totalVolumeMl > 0 ? Math.round((form.starterLiquidMl / form.totalVolumeMl) * 100) : 0;
  const sugarPerLiter =
    form.totalVolumeMl > 0 ? Math.round((form.sugarG / form.totalVolumeMl) * 1000) : 0;
  const teaStrength = formatTeaStrength(form);

  const syncManualSelection = (vesselType: string) => {
    const nextDraft = createManualDraftForVessel(vesselType);
    setManualVesselDraft(nextDraft);
    setSelectedVessel(buildSelectedVesselFromDraft(nextDraft));
  };

  const handleChooseScratch = () => {
    setStartMode("scratch");
    setSelectedRecipe(null);
    setAppliedAdjustments([]);
    setForm(initialForm);
    setStarterSourceBatchId(null);
    syncManualSelection(initialForm.vesselType);
  };

  const handleChooseBrewAgain = () => {
    if (!brewAgainState) {
      return;
    }

    setStartMode("brew_again");
    setSelectedRecipe(null);
    setAppliedAdjustments([]);
    setForm(initialBrewAgainForm);
    syncManualSelection(initialBrewAgainForm.vesselType);
  };

  const applyRecipeDefaults = (recipe: F1RecipeSummary) => {
    const recipeFields = applyRecipeToBatchSetup(recipe);

    setStartMode("recipe");
    setSelectedRecipe(recipe);
    setAppliedAdjustments([]);
    setForm((current) => ({
      ...current,
      ...recipeFields,
    }));

    if (recipe.preferredVesselId) {
      const preferredVessel = availableVessels.find(
        (vessel) => vessel.id === recipe.preferredVesselId
      );

      if (preferredVessel) {
        setSelectedVessel(buildSelectedVesselFromSaved(preferredVessel));
      }
    }
  };

  const openSaveRecipeDialog = () => {
    setRecipeDraft(
      buildRecipeDraftFromBatchSetup(batchSetupFields, {
        name: selectedRecipe?.name || form.name.trim() || "",
        description: selectedRecipe?.description || "",
        preferredVesselId: selectedVessel.source === "saved" ? selectedVessel.vesselId : null,
        isFavorite: selectedRecipe?.isFavorite || false,
      })
    );
    setSaveRecipeOpen(true);
  };

  const updateManualVesselDraft = <K extends keyof FermentationVesselDraft>(
    key: K,
    value: FermentationVesselDraft[K]
  ) => {
    setManualVesselDraft((current) => {
      const nextDraft = { ...current, [key]: value };
      setSelectedVessel(buildSelectedVesselFromDraft(nextDraft));
      return nextDraft;
    });
  };

  const handleSaveManualVessel = async () => {
    if (!user?.id) {
      toast.error("You need to be signed in to save vessels.");
      return;
    }

    setManualVesselSaving(true);

    try {
      const saved = await saveFermentationVessel({
        userId: user.id,
        draft: manualVesselDraft,
      });

      setSelectedVessel(buildSelectedVesselFromSaved(saved));
      toast.success("Vessel saved and selected for this batch.");
      await loadVessels();
    } catch (error) {
      console.error("Save manual vessel from New Batch error:", error);
      toast.error(error instanceof Error ? error.message : "Could not save vessel.");
    } finally {
      setManualVesselSaving(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!user?.id) {
      toast.error("You need to be signed in to save recipes.");
      return;
    }

    setRecipeSaving(true);

    try {
      const saved = await saveF1Recipe({
        userId: user.id,
        draft: recipeDraft,
      });

      setSelectedRecipe(saved);
      setSaveRecipeOpen(false);
      toast.success("Recipe saved and linked to this batch setup.");
      await loadRecipes();
    } catch (error) {
      console.error("Save F1 recipe from New Batch error:", error);
      toast.error(error instanceof Error ? error.message : "Could not save recipe.");
    } finally {
      setRecipeSaving(false);
    }
  };

  const handleApplyRecommendation = (card: F1RecommendationCard) => {
    if (!card.applyAction) {
      return;
    }

    const { field, value } = card.applyAction;

    if (field === "starterLiquidMl" || field === "sugarG" || field === "teaAmountValue") {
      update(field, Number(value) as NewBatchForm[typeof field]);
    }

    if (field === "teaType" || field === "sugarType") {
      update(field, String(value) as NewBatchForm[typeof field]);
    }

    setAppliedAdjustments((current) => {
      const next = current.filter((item) => item.recommendationId !== card.id);
      return [...next, { recommendationId: card.id, field, value }];
    });

    toast.success("Applied recommendation to today's brew.");
  };

  const handleCreate = async () => {
    if (!user) {
      toast.error("You must be logged in to create a batch.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Please enter a batch name.");
      return;
    }

    if (!form.brewDate) {
      toast.error("Please select a brew date.");
      return;
    }

    setIsSaving(true);

    const { data: createdBatch, error } = await supabase
      .from("kombucha_batches")
      .insert({
        user_id: user.id,
        name: form.name.trim(),
        status: "active",
        current_stage: "f1_active",
        brew_started_at: new Date(`${form.brewDate}T12:00:00`).toISOString(),
        brew_again_source_batch_id: activeBrewAgainSourceBatchId,
        starter_source_type: starterSourceBatchId ? "previous_batch" : "manual",
        starter_source_batch_id: starterSourceBatchId,
        f1_recipe_id: selectedRecipe?.id || null,
        total_volume_ml: form.totalVolumeMl,
        tea_type: form.teaType,
        tea_source_form: form.teaSourceForm,
        tea_amount_value: form.teaAmountValue,
        tea_amount_unit: form.teaAmountUnit,
        sugar_g: form.sugarG,
        sugar_type: form.sugarType,
        starter_liquid_ml: form.starterLiquidMl,
        scoby_present: form.scobyPresent,
        avg_room_temp_c: form.avgRoomTempC,
        vessel_type: getLegacyVesselTypeLabel(selectedVessel),
        target_preference: form.targetPreference,
        initial_ph: form.initialPh ? Number(form.initialPh) : null,
        initial_notes: form.initialNotes.trim() || null,
      })
      .select("id")
      .single();

    setIsSaving(false);

    if (error || !createdBatch) {
      console.error("Create batch error:", error);
      toast.error(error?.message || "Could not create batch.");
      return;
    }

    try {
      await saveBatchF1Setup({
        batchId: createdBatch.id,
        userId: user.id,
        origin: selectedRecipe ? "recipe" : "scratch",
        setup: batchSetupFields,
        selectedRecipe,
        selectedVessel,
        starterSourceType: starterSourceBatchId ? "previous_batch" : "manual",
        starterSourceBatchId,
        brewAgainSourceBatchId: activeBrewAgainSourceBatchId,
        recommendationSnapshot: recommendations.snapshot,
        acceptedRecommendationIds: appliedAdjustments.map((item) => item.recommendationId),
      });

      toast.success("Batch created.");
      navigate("/batches");
    } catch (snapshotError) {
      console.error("Save batch F1 setup snapshot error:", snapshotError);
      toast.message(
        snapshotError instanceof Error
          ? `Batch created, but the detailed F1 setup snapshot could not be saved: ${snapshotError.message}`
          : "Batch created, but the detailed F1 setup snapshot could not be saved."
      );
      navigate(`/batch/${createdBatch.id}`);
    }
  };

  const currentStepIndex = stepItems.findIndex((item) => item.id === currentStep);
  const nextStep = stepItems[currentStepIndex + 1]?.id || null;
  const previousStep = stepItems[currentStepIndex - 1]?.id || null;

  const canContinueFromStart = startMode !== "recipe" || !!selectedRecipe;
  const canContinueFromBrew =
    !!form.name.trim() &&
    !!form.brewDate &&
    form.totalVolumeMl > 0 &&
    form.teaAmountValue > 0 &&
    form.sugarG > 0 &&
    form.starterLiquidMl > 0;

  const goToStep = (step: NewBatchStepId) => setCurrentStep(step);

  const handlePrimaryAction = () => {
    if (currentStep === "review") {
      void handleCreate();
      return;
    }

    if (nextStep) {
      setCurrentStep(nextStep);
    }
  };

  const primaryLabel =
    currentStep === "start"
      ? "Continue"
      : currentStep === "brew"
        ? "Continue to context"
        : currentStep === "context"
          ? "Continue to review"
          : "Create batch";

  const primaryDisabled =
    currentStep === "start"
      ? !canContinueFromStart
      : currentStep === "brew"
        ? !canContinueFromBrew
        : currentStep === "review"
          ? !form.name.trim() || !form.brewDate || isSaving
          : false;

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-3xl flex-col px-4 pb-6 pt-6 lg:px-8 lg:pt-10">
        <div className="space-y-6">
          <ScrollReveal>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <FlaskConical className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold text-foreground">
                  Start a new batch
                </h1>
                <p className="text-sm text-muted-foreground">
                  Set up first fermentation one step at a time.
                </p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.04}>
            <NewBatchProgress
              items={stepItems}
              currentStepId={currentStep}
              onSelect={(stepId) => goToStep(stepId as NewBatchStepId)}
            />
          </ScrollReveal>

          {isBeginner ? (
            <ScrollReveal delay={0.06}>
              <div className="rounded-2xl border border-primary/10 bg-honey-light p-4">
                <p className="text-sm text-foreground">
                  Recipes and saved vessels can speed things up, but this flow should always match
                  what you are actually brewing today.
                </p>
              </div>
            </ScrollReveal>
          ) : null}

          {currentStep === "start" ? (
            <ScrollReveal delay={0.08}>
              <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Step 1
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">
                    How do you want to begin?
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose the easiest starting point. You can still adjust today&apos;s brew before
                    you create the batch.
                  </p>
                </div>

                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={handleChooseScratch}
                    className={`rounded-2xl border p-4 text-left transition-colors ${getStartCardClasses(startMode === "scratch")}`}
                  >
                    <p className="text-sm font-semibold text-foreground">Start from scratch</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Fill in today&apos;s brew from a clean starting point.
                    </p>
                  </button>

                  <div
                    className={`rounded-2xl border p-4 text-left transition-colors ${getStartCardClasses(startMode === "recipe")}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Use a saved recipe</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Load your usual defaults, then adjust anything that changed today.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStartMode("recipe");
                          setRecipePickerOpen(true);
                        }}
                      >
                        {selectedRecipe ? "Change recipe" : "Choose recipe"}
                      </Button>
                    </div>
                    {selectedRecipe ? (
                      <div className="mt-3 rounded-2xl border border-primary/15 bg-primary/5 p-3">
                        <p className="text-sm font-medium text-foreground">{selectedRecipe.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedRecipe.teaType}, {selectedRecipe.sugarAmountValue}g sugar,{" "}
                          {selectedRecipe.defaultStarterLiquidMl}ml starter.
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          This recipe fills in the form, but today&apos;s batch stays fully editable.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {hasBrewAgainOption ? (
                    <button
                      type="button"
                      onClick={handleChooseBrewAgain}
                      className={`rounded-2xl border p-4 text-left transition-colors ${getStartCardClasses(startMode === "brew_again")}`}
                    >
                      <p className="text-sm font-semibold text-foreground">
                        Brew again from a past batch
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Start from the setup used for {brewAgainState?.sourceSummary.sourceBatchName}.
                      </p>
                      <div className="mt-3 rounded-2xl border border-primary/15 bg-primary/5 p-3">
                        <p className="text-sm font-medium text-foreground">
                          Based on {brewAgainState?.sourceSummary.sourceBatchName}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Volume, tea, sugar, starter, and notes are already filled in so you can
                          make a quick repeat or tweak what changed.
                        </p>
                      </div>
                    </button>
                  ) : null}
                </div>
              </div>
            </ScrollReveal>
          ) : null}

          {currentStep === "brew" ? (
            <ScrollReveal delay={0.08}>
              <div className="space-y-5 rounded-3xl border border-border bg-card p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Step 2
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">
                    What are you brewing today?
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter the actual setup for this batch. If you loaded a recipe, these are the
                    values you want saved for today.
                  </p>
                </div>

                <section className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Batch basics</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Give the batch a name, date, and target volume.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Batch name
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(event) => update("name", event.target.value)}
                        placeholder="Spring black tea batch"
                        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Brew date
                      </label>
                      <input
                        type="date"
                        value={form.brewDate}
                        onChange={(event) => update("brewDate", event.target.value)}
                        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Total volume (ml)
                      </label>
                      <input
                        type="number"
                        value={form.totalVolumeMl}
                        onChange={(event) => update("totalVolumeMl", Number(event.target.value))}
                        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        About {formatLiters(form.totalVolumeMl)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Tea and sugar</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Capture the tea base and sweetener you are using today.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Tea type
                      </label>
                      <select
                        value={form.teaType}
                        onChange={(event) => update("teaType", event.target.value)}
                        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {F1_TEA_TYPES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Tea form
                      </label>
                      <select
                        value={form.teaSourceForm}
                        onChange={(event) =>
                          update("teaSourceForm", event.target.value as NewBatchForm["teaSourceForm"])
                        }
                        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {F1_TEA_SOURCE_FORMS.map((option) => (
                          <option key={option} value={option}>
                            {teaSourceFormLabels[option]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_120px] gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Tea amount
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.teaAmountValue}
                        onChange={(event) => update("teaAmountValue", Number(event.target.value))}
                        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Unit
                      </label>
                      <select
                        value={form.teaAmountUnit}
                        onChange={(event) =>
                          update("teaAmountUnit", event.target.value as NewBatchForm["teaAmountUnit"])
                        }
                        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {F1_TEA_AMOUNT_UNITS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {teaStrength ? (
                    <p className="text-xs text-muted-foreground">Tea strength: {teaStrength}</p>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Sugar amount (g)
                      </label>
                      <input
                        type="number"
                        value={form.sugarG}
                        onChange={(event) => update("sugarG", Number(event.target.value))}
                        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{sugarPerLiter} g/L</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Sugar type
                      </label>
                      <select
                        value={form.sugarType}
                        onChange={(event) => update("sugarType", event.target.value)}
                        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {F1_SUGAR_TYPES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Starter and environment</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      These details help the batch record stay useful later.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Starter liquid (ml)
                      </label>
                      <input
                        type="number"
                        value={form.starterLiquidMl}
                        onChange={(event) => update("starterLiquidMl", Number(event.target.value))}
                        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Starter ratio: {starterRatioPercent}%
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Average room temperature (C)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={form.avgRoomTempC}
                        onChange={(event) => update("avgRoomTempC", Number(event.target.value))}
                        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        SCOBY present
                      </label>
                      <div className="flex gap-2">
                        {[true, false].map((value) => (
                          <button
                            key={String(value)}
                            type="button"
                            onClick={() => update("scobyPresent", value)}
                            className={`h-11 flex-1 rounded-lg text-sm font-medium transition-all ${
                              form.scobyPresent === value
                                ? "bg-primary text-primary-foreground"
                                : "border border-border bg-card text-muted-foreground"
                            }`}
                          >
                            {value ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Taste target
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {F1_TARGET_PREFERENCES.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => update("targetPreference", option)}
                            className={`h-11 rounded-lg text-sm font-medium capitalize transition-all ${
                              form.targetPreference === option
                                ? "bg-primary text-primary-foreground"
                                : "border border-border bg-card text-muted-foreground"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced((current) => !current)}
                    className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Advanced details
                  </button>

                  {showAdvanced ? (
                    <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 animate-slide-up">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Initial pH
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={form.initialPh}
                          onChange={(event) => update("initialPh", event.target.value)}
                          placeholder="Optional"
                          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Setup notes
                        </label>
                        <textarea
                          rows={3}
                          value={form.initialNotes}
                          onChange={(event) => update("initialNotes", event.target.value)}
                          placeholder="Anything you want to remember about this brew day."
                          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            </ScrollReveal>
          ) : null}

          {currentStep === "context" ? (
            <ScrollReveal delay={0.08}>
              <div className="space-y-5 rounded-3xl border border-border bg-card p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Step 3
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">
                    Vessel and starter context
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose the vessel you are using today and link a starter batch if one actually
                    feeds this brew.
                  </p>
                </div>

                <section className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Today&apos;s vessel</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Pick a saved vessel or enter a custom one for this batch.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => setVesselPickerOpen(true)}>
                        Choose saved vessel
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => navigate("/f1-vessels")}>
                        View vessel library
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Selected vessel
                    </p>
                    <p className="mt-1 text-base font-semibold text-foreground">{selectedVessel.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getVesselMaterialLabel(selectedVessel.materialType)} ·{" "}
                      {getVesselSuitabilityLabel(selectedVessel.f1Suitability)}
                      {selectedVessel.capacityMl ? ` · ${selectedVessel.capacityMl}ml` : ""}
                    </p>
                    {selectedRecipe?.preferredVesselId && selectedVessel.source !== "saved" ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Your recipe has a preferred vessel saved, but you can still use something
                        different today.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={selectedVessel.source === "manual" ? "secondary" : "outline"}
                      onClick={() => {
                        setSelectedVessel(buildSelectedVesselFromDraft(manualVesselDraft));
                        setShowManualVesselDetails(true);
                      }}
                    >
                      Use a custom vessel
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowManualVesselDetails((current) => !current)}
                    >
                      {showManualVesselDetails ? "Hide custom details" : "Edit custom details"}
                    </Button>
                  </div>

                  {showManualVesselDetails ? (
                    <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 animate-slide-up">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-foreground">
                            Vessel name
                          </label>
                          <input
                            type="text"
                            value={manualVesselDraft.name}
                            onChange={(event) => updateManualVesselDraft("name", event.target.value)}
                            placeholder="4L kitchen jar"
                            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-foreground">
                            Material
                          </label>
                          <select
                            value={manualVesselDraft.materialType}
                            onChange={(event) => {
                              const materialType =
                                event.target.value as FermentationVesselDraft["materialType"];
                              updateManualVesselDraft("materialType", materialType);
                              updateManualVesselDraft(
                                "f1Suitability",
                                getDefaultSuitabilityForMaterial(materialType)
                              );
                            }}
                            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                          <label className="mb-1.5 block text-sm font-medium text-foreground">
                            Capacity (ml)
                          </label>
                          <input
                            type="number"
                            value={manualVesselDraft.capacityMl ?? ""}
                            onChange={(event) =>
                              updateManualVesselDraft(
                                "capacityMl",
                                event.target.value ? Number(event.target.value) : null
                              )
                            }
                            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-foreground">
                            Max fill (ml)
                          </label>
                          <input
                            type="number"
                            value={manualVesselDraft.recommendedMaxFillMl ?? ""}
                            onChange={(event) =>
                              updateManualVesselDraft(
                                "recommendedMaxFillMl",
                                event.target.value ? Number(event.target.value) : null
                              )
                            }
                            placeholder="Optional"
                            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
                        <textarea
                          rows={2}
                          value={manualVesselDraft.notes}
                          onChange={(event) => updateManualVesselDraft("notes", event.target.value)}
                          placeholder="Optional notes about this vessel."
                          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSaveManualVessel}
                          disabled={manualVesselSaving}
                        >
                          {manualVesselSaving ? "Saving vessel..." : "Save to vessel library"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setSelectedVessel(buildSelectedVesselFromDraft(manualVesselDraft))}
                        >
                          Use these details today
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </section>

                <StarterSourceSelector
                  options={starterSourceOptions}
                  value={starterSourceBatchId}
                  loading={starterSourceLoading}
                  recommendedBatchId={recommendedStarterSourceBatchId}
                  onChange={setStarterSourceBatchId}
                />
              </div>
            </ScrollReveal>
          ) : null}

          {currentStep === "review" ? (
            <ScrollReveal delay={0.08}>
              <div className="space-y-5 rounded-3xl border border-border bg-card p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Step 4
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">
                    Review before you create
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check the setup, see what Kombloom noticed, and make any last changes before
                    this batch is saved.
                  </p>
                </div>

                <F1SetupSummary
                  setup={batchSetupFields}
                  selectedRecipeName={selectedRecipe?.name}
                  selectedVessel={selectedVessel}
                />

                <F1RecommendationSection
                  cards={recommendations.cards}
                  loadingHistory={recommendationHistoryLoading}
                  appliedRecommendationIds={appliedAdjustments.map((item) => item.recommendationId)}
                  onApply={handleApplyRecommendation}
                />

                <div className="rounded-2xl border border-border/80 bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Recipe help</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Want to reuse this setup later? Save it as a recipe after you finish your
                        review.
                      </p>
                    </div>
                    <Button type="button" variant="outline" onClick={openSaveRecipeDialog}>
                      Save as recipe
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ) : null}
        </div>
      </div>

      <NewBatchStepFooter
        primaryLabel={primaryLabel}
        primaryDisabled={primaryDisabled}
        primaryLoading={isSaving}
        onPrimary={handlePrimaryAction}
        secondaryLabel={previousStep ? "Back" : undefined}
        onSecondary={previousStep ? () => goToStep(previousStep) : undefined}
        helperText={
          currentStep === "start"
            ? startMode === "recipe" && !selectedRecipe
              ? "Choose a recipe or switch to another starting point."
              : "Choose a starting point first."
            : currentStep === "brew"
              ? "You can keep editing these values later in the flow."
              : currentStep === "context"
                ? "Starter links and vessel details stay optional."
                : summary.plainLanguageSummary
        }
      />

      <F1RecipePicker
        open={recipePickerOpen}
        loading={recipeLoading}
        recipes={availableRecipes.filter((recipe) => !recipe.archivedAt)}
        onOpenChange={setRecipePickerOpen}
        onSelect={applyRecipeDefaults}
        onManageLibrary={() => navigate("/f1-recipes")}
      />

      <Dialog open={saveRecipeOpen} onOpenChange={setSaveRecipeOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Save this setup as a recipe</DialogTitle>
            <DialogDescription>
              Save reusable defaults from this setup. The batch itself will still be created
              separately.
            </DialogDescription>
          </DialogHeader>

          <F1RecipeEditor
            draft={recipeDraft}
            saving={recipeSaving}
            submitLabel="Save recipe"
            availableVessels={availableVessels}
            onManageVessels={() => navigate("/f1-vessels")}
            onChange={setRecipeDraft}
            onSubmit={handleSaveRecipe}
          />
        </DialogContent>
      </Dialog>

      <F1VesselPicker
        open={vesselPickerOpen}
        loading={vesselLoading}
        vessels={availableVessels}
        onOpenChange={setVesselPickerOpen}
        onSelect={(vessel) => {
          setSelectedVessel(buildSelectedVesselFromSaved(vessel));
          setShowManualVesselDetails(false);
        }}
        onManageLibrary={() => navigate("/f1-vessels")}
      />
    </AppLayout>
  );
}
