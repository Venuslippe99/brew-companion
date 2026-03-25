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
import { NewBatchBrewRead } from "@/components/f1/new-batch/NewBatchBrewRead";
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
import { buildF1BaselineMetrics } from "@/lib/f1-baseline-rules";
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
import { buildF1VesselFitResult } from "@/lib/f1-vessel-fit";
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

type FlowStepState = {
  status: "blocked" | "warning" | "ready" | "complete";
  helperText: string;
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

const brewRecommendationCategories = new Set([
  "starter_recommendation",
  "sugar_recommendation",
  "tea_amount_recommendation",
  "tea_base_recommendation",
  "timing_expectation",
]);

const contextRecommendationCategories = new Set([
  "culture_transition_warning",
  "sweetener_transition_warning",
  "combined_transition_warning",
  "vessel_recommendation",
  "lineage_note",
  "fit_note",
]);

const reviewRecommendationCategories = new Set(["similar_setup_note", "next_time_lesson"]);

function dedupeRecommendationCards(cards: F1RecommendationCard[]) {
  const seen = new Set<string>();

  return cards.filter((card) => {
    if (seen.has(card.id)) {
      return false;
    }

    seen.add(card.id);
    return true;
  });
}

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

function formatMetricNumber(value: number | null) {
  if (value === null) {
    return null;
  }

  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatTeaRead(args: {
  form: NewBatchForm;
  teaGramsPerLiter: number | null;
  teaEstimateSource: "direct" | "approximate" | "none";
}) {
  if (args.teaGramsPerLiter !== null) {
    return {
      value: `${formatMetricNumber(args.teaGramsPerLiter)} g/L${
        args.teaEstimateSource === "approximate" ? " approx." : ""
      }`,
      hint:
        args.teaEstimateSource === "approximate"
          ? `${args.form.teaAmountValue}${args.form.teaAmountUnit} for ${formatLiters(args.form.totalVolumeMl)}`
          : "Normalized against your current batch volume",
    };
  }

  if (args.form.totalVolumeMl <= 0) {
    return {
      value: "Add a volume",
      hint: "Tea strength becomes easier to compare once the batch size is set.",
    };
  }

  return {
    value: `${args.form.teaAmountValue}${args.form.teaAmountUnit}`,
    hint: `${args.form.teaAmountValue}${args.form.teaAmountUnit} for ${formatLiters(args.form.totalVolumeMl)}`,
  };
}

function joinWithAnd(values: string[]) {
  if (values.length <= 1) {
    return values[0] || "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
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
  const [showBrewDetails, setShowBrewDetails] = useState(!isBeginner);
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

  const brewRecommendationCards = useMemo(
    () =>
      recommendations.cards.filter((card) => brewRecommendationCategories.has(card.category)),
    [recommendations.cards]
  );
  const contextRecommendationCards = useMemo(
    () =>
      recommendations.cards.filter((card) => contextRecommendationCategories.has(card.category)),
    [recommendations.cards]
  );
  const reviewRecommendationCards = useMemo(
    () =>
      recommendations.cards.filter((card) => reviewRecommendationCategories.has(card.category)),
    [recommendations.cards]
  );
  const finalCheckCards = useMemo(
    () =>
      dedupeRecommendationCards(
        recommendations.cards.filter(
          (card) => card.cautionLevel === "high" || card.cautionLevel === "moderate"
        )
      ),
    [recommendations.cards]
  );

  const summary = useMemo(
    () => buildF1SetupSummary(batchSetupFields, selectedVessel),
    [batchSetupFields, selectedVessel]
  );
  const vesselFit = useMemo(
    () =>
      buildF1VesselFitResult({
        totalVolumeMl: form.totalVolumeMl,
        vessel: selectedVessel,
      }),
    [form.totalVolumeMl, selectedVessel]
  );
  const baselineMetrics = useMemo(() => buildF1BaselineMetrics(batchSetupFields), [batchSetupFields]);

  const starterRatioPercent = baselineMetrics.starterRatioPercent ?? 0;
  const sugarPerLiter = baselineMetrics.sugarPerLiter;
  const teaRead = formatTeaRead({
    form,
    teaGramsPerLiter: baselineMetrics.teaGramsPerLiter,
    teaEstimateSource: baselineMetrics.teaGramEstimateSource,
  });
  const tastingWindowText = recommendations.timing
    ? `First tasting should likely land around Day ${recommendations.timing.windowStartDay}-${recommendations.timing.windowEndDay}. ${recommendations.timing.explanation}`
    : "Add a brew date to see a first tasting estimate.";

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
      toast.success("Vessel saved. This batch will use it.");
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
      toast.success("Recipe saved. You can reuse this starting point next time.");
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

    toast.success("Adjustment applied to today's brew.");
  };

  const handleCreate = async () => {
    if (!user) {
      toast.error("You must be logged in to create a batch.");
      return;
    }

    if (reviewStepState.status === "blocked") {
      toast.error(reviewStepState.helperText);
      return;
    }

    if (!form.name.trim()) {
      toast.error("Add a batch name to keep going.");
      return;
    }

    if (!form.brewDate) {
      toast.error("Choose the brew date first.");
      return;
    }

    if (
      form.totalVolumeMl <= 0 ||
      form.teaAmountValue <= 0 ||
      form.sugarG <= 0 ||
      form.starterLiquidMl <= 0
    ) {
      toast.error("Finish the core brew details before you start the batch.");
      return;
    }

    if (vesselFit.fitState === "overfilled") {
      toast.error(
        "This vessel looks too full for the planned volume. Adjust the batch size or switch vessels first."
      );
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
      toast.error(error?.message || "Could not start the batch.");
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

      toast.success("Batch started.");
      navigate("/batches");
    } catch (snapshotError) {
      console.error("Save batch F1 setup snapshot error:", snapshotError);
      toast.message(
        snapshotError instanceof Error
          ? `Batch started, but the detailed F1 setup snapshot could not be saved: ${snapshotError.message}`
          : "Batch started, but the detailed F1 setup snapshot could not be saved."
      );
      navigate(`/batch/${createdBatch.id}`);
    }
  };

  const currentStepIndex = stepItems.findIndex((item) => item.id === currentStep);
  const nextStep = stepItems[currentStepIndex + 1]?.id || null;
  const previousStep = stepItems[currentStepIndex - 1]?.id || null;

  const startStepState: FlowStepState =
    startMode === "recipe" && !selectedRecipe
      ? {
          status: "blocked",
          helperText: "Choose a recipe or switch to another starting point.",
        }
      : {
          status: "complete",
          helperText:
            startMode === "brew_again"
              ? "You are starting from a past batch and can still change the setup."
              : startMode === "recipe"
                ? "You have a saved recipe ready as the starting point."
                : "You are starting from scratch.",
        };

  const missingBrewFields = [
    !form.name.trim() ? "a batch name" : null,
    !form.brewDate ? "a brew date" : null,
    form.totalVolumeMl <= 0 ? "a batch size" : null,
    form.teaAmountValue <= 0 ? "a tea amount" : null,
    form.sugarG <= 0 ? "a sugar amount" : null,
    form.starterLiquidMl <= 0 ? "a starter amount" : null,
  ].filter((value): value is string => !!value);
  const topBrewCaution = brewRecommendationCards.find(
    (card) => card.cautionLevel === "high" || card.cautionLevel === "moderate"
  );
  const brewStepState: FlowStepState =
    missingBrewFields.length > 0
      ? {
          status: "blocked",
          helperText: `Add ${joinWithAnd(missingBrewFields)} to keep going.`,
        }
      : topBrewCaution
        ? {
            status: "warning",
            helperText: `${topBrewCaution.title}. You can continue, but it is worth double-checking first.`,
          }
        : {
            status: "complete",
            helperText: "The core brew setup looks ready for the next step.",
          };

  const topContextCaution = contextRecommendationCards.find(
    (card) => card.cautionLevel === "high" || card.cautionLevel === "moderate"
  );
  const contextStepState: FlowStepState =
    vesselFit.fitState === "overfilled"
      ? {
          status: "blocked",
          helperText: "Your vessel looks too full for this batch size. Lower the volume or switch vessels before you continue.",
        }
      : topContextCaution
        ? {
            status: "warning",
            helperText: `${topContextCaution.title}. This can still work, but it is worth checking before you start.`,
          }
        : {
            status: "complete",
            helperText: "Vessel and starter context look ready for the final check.",
          };

  const reviewStepState: FlowStepState =
    startStepState.status === "blocked"
      ? {
          status: "blocked",
          helperText: startStepState.helperText,
        }
      : brewStepState.status === "blocked"
        ? {
            status: "blocked",
            helperText: brewStepState.helperText,
          }
        : contextStepState.status === "blocked"
          ? {
              status: "blocked",
              helperText: contextStepState.helperText,
            }
          : finalCheckCards.length > 0
            ? {
                status: "warning",
                helperText: `${finalCheckCards[0].title}. You can start the batch once you are comfortable with the remaining checks.`,
              }
            : {
                status: "ready",
                helperText: "This batch looks ready to start.",
              };

  const stepStateMap: Record<NewBatchStepId, FlowStepState> = {
    start: startStepState,
    brew: brewStepState,
    context: contextStepState,
    review: reviewStepState,
  };

  const canNavigateToStep = (step: NewBatchStepId) => {
    const targetIndex = stepItems.findIndex((item) => item.id === step);

    if (targetIndex <= currentStepIndex) {
      return true;
    }

    return stepItems
      .slice(0, targetIndex)
      .every((item) => stepStateMap[item.id].status !== "blocked");
  };

  const goToStep = (step: NewBatchStepId) => {
    if (canNavigateToStep(step)) {
      setCurrentStep(step);
    }
  };

  const handlePrimaryAction = () => {
    if (currentStep === "review") {
      void handleCreate();
      return;
    }

    if (nextStep && canNavigateToStep(nextStep)) {
      setCurrentStep(nextStep);
    }
  };

  const primaryLabel =
    currentStep === "start"
      ? "Continue to brew"
      : currentStep === "brew"
        ? "Continue to vessel and starter"
        : currentStep === "context"
          ? "Continue to final check"
          : "Start batch";

  const primaryDisabled =
    currentStep === "start"
      ? startStepState.status === "blocked"
      : currentStep === "brew"
        ? brewStepState.status === "blocked"
        : currentStep === "context"
          ? contextStepState.status === "blocked"
        : currentStep === "review"
          ? reviewStepState.status === "blocked" || isSaving
          : false;
  const currentStepState = stepStateMap[currentStep];

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
                  Set up today&apos;s first fermentation with guidance as you go.
                </p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.04}>
            <NewBatchProgress
              items={stepItems}
              currentStepId={currentStep}
              itemStates={{
                start: {
                  status: startStepState.status,
                  disabled: !canNavigateToStep("start"),
                },
                brew: {
                  status: brewStepState.status,
                  disabled: !canNavigateToStep("brew"),
                },
                context: {
                  status: contextStepState.status,
                  disabled: !canNavigateToStep("context"),
                },
                review: {
                  status: reviewStepState.status,
                  disabled: !canNavigateToStep("review"),
                },
              }}
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
                    Choose how to begin
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pick the easiest starting point for today. You can still change the brew before
                    you start the batch.
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
                          This fills in your starting point, but today&apos;s batch stays fully
                          editable.
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
                    Build today&apos;s brew
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use the setup you are actually brewing today. Kombloom will keep reading the
                    proportions as you go, so you can judge the brew before review.
                  </p>
                </div>

                <NewBatchBrewRead
                  metrics={[
                    {
                      label: "Batch size",
                      value: formatLiters(form.totalVolumeMl),
                      hint:
                        form.totalVolumeMl > 0
                          ? `${form.totalVolumeMl}ml total volume`
                          : "Set the batch size to compare the rest of the brew.",
                    },
                    {
                      label: "Tea read",
                      value: teaRead.value,
                      hint: teaRead.hint,
                    },
                    {
                      label: "Sugar read",
                      value:
                        sugarPerLiter !== null
                          ? `${formatMetricNumber(sugarPerLiter)} g/L`
                          : "Add a volume",
                      hint:
                        sugarPerLiter !== null
                          ? "This makes it easier to judge how sweet the setup really is."
                          : "Sugar is easier to compare once the batch size is set.",
                    },
                    {
                      label: "Starter read",
                      value: `${starterRatioPercent}% starter`,
                      hint: "Around 10% is a calm everyday reference point.",
                    },
                  ]}
                  summary={summary.brewReadSummary}
                  timingLabel="Likely first taste"
                  timingText={tastingWindowText}
                />

                {selectedRecipe ? (
                  <div className="rounded-2xl border border-primary/10 bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Starting from {selectedRecipe.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      These numbers came from your saved recipe. Keep what still fits today and
                      change anything that does not.
                    </p>
                  </div>
                ) : startMode === "brew_again" && brewAgainState ? (
                  <div className="rounded-2xl border border-primary/10 bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Starting from {brewAgainState.sourceSummary.sourceBatchName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This batch already carries the last setup forward. Use this step to confirm
                      what stayed the same and what changed today.
                    </p>
                  </div>
                ) : null}

                <F1RecommendationSection
                  cards={brewRecommendationCards}
                  loadingHistory={recommendationHistoryLoading}
                  appliedRecommendationIds={appliedAdjustments.map((item) => item.recommendationId)}
                  onApply={handleApplyRecommendation}
                  eyebrow="Worth checking now"
                  title="A few things to watch while you set the brew"
                  description="These notes update from the tea, sugar, starter, and timing choices you are making in this step."
                  secondaryTitle="Still useful to know"
                  maxPrimary={2}
                />

                <section className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Name and batch size</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Give the brew a name, set the brew date, and confirm how much you are
                      making.
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
                    <h3 className="text-sm font-semibold text-foreground">Build the tea base</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Set the tea and sugar in the proportions you actually want to start with.
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
                    <div className="rounded-xl border border-border/80 bg-card p-3">
                      <p className="text-xs text-muted-foreground">Tea read</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{teaRead.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{teaRead.hint}</p>
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
                      <p className="mt-1 text-xs text-muted-foreground">
                        {sugarPerLiter !== null
                          ? `${formatMetricNumber(sugarPerLiter)} g/L`
                          : "Add a volume to compare sugar per liter."}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-card p-3">
                      <p className="text-xs text-muted-foreground">Sugar read</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {sugarPerLiter !== null
                          ? `${formatMetricNumber(sugarPerLiter)} g/L`
                          : "Waiting for batch size"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        This is the clearest way to compare sweetener load against the batch size.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-card p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {showBrewDetails ? "Supporting brew details" : "More brew details"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Tea form, sugar type, and SCOBY details still matter, but they do not
                          need to crowd the main decisions.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBrewDetails((current) => !current)}
                      >
                        {showBrewDetails ? "Hide details" : "Show details"}
                      </Button>
                    </div>

                    {showBrewDetails ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-foreground">
                            Tea form
                          </label>
                          <select
                            value={form.teaSourceForm}
                            onChange={(event) =>
                              update(
                                "teaSourceForm",
                                event.target.value as NewBatchForm["teaSourceForm"]
                              )
                            }
                            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {F1_TEA_SOURCE_FORMS.map((option) => (
                              <option key={option} value={option}>
                                {teaSourceFormLabels[option]}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-foreground">
                            Sugar type
                          </label>
                          <select
                            value={form.sugarType}
                            onChange={(event) => update("sugarType", event.target.value)}
                            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {F1_SUGAR_TYPES.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-sm font-medium text-foreground">
                            SCOBY present
                          </label>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {[true, false].map((value) => (
                              <button
                                key={String(value)}
                                type="button"
                                onClick={() => update("scobyPresent", value)}
                                className={`h-11 rounded-lg text-sm font-medium transition-all ${
                                  form.scobyPresent === value
                                    ? "bg-primary text-primary-foreground"
                                    : "border border-border bg-background text-muted-foreground"
                                }`}
                              >
                                {value ? "Yes, culture mat on hand" : "No, starter liquid only"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Starter and fermentation pace
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Starter, room temperature, and taste target all change how quickly this brew
                      may move.
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
                    <div className="rounded-xl border border-border/80 bg-card p-3">
                      <p className="text-xs text-muted-foreground">Pace read</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {recommendations.timing
                          ? `Day ${recommendations.timing.windowStartDay}-${recommendations.timing.windowEndDay}`
                          : "Add a brew date"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {recommendations.timing
                          ? recommendations.timing.explanation
                          : "The first tasting window appears once the brew date is set."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced((current) => !current)}
                    className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showAdvanced ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    Brew day notes and pH
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
                          placeholder="Anything worth noting about this brew day."
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
                    Confirm vessel and culture context
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Confirm what this batch is going into and where the starter is coming from if a
                    previous batch really feeds this brew.
                  </p>
                </div>

                <section className="space-y-4 rounded-2xl border border-border/80 bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Today&apos;s vessel</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Pick the vessel you are actually using today, then check how the batch will fit.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => setVesselPickerOpen(true)}>
                        Choose saved vessel
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => navigate("/f1-vessels")}>
                        Open vessel library
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Current vessel
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

                  <div className="rounded-2xl border border-border/80 bg-card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {summary.fitStateLabel || "Add vessel capacity"}
                      </p>
                      {summary.suitabilityLabel ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {summary.suitabilityLabel}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{summary.fitSummary}</p>
                    {summary.cautionNotes.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {summary.cautionNotes.map((note) => (
                          <p key={note} className="text-xs text-muted-foreground">
                            {note}
                          </p>
                        ))}
                      </div>
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

                <F1RecommendationSection
                  cards={contextRecommendationCards}
                  loadingHistory={recommendationHistoryLoading}
                  appliedRecommendationIds={appliedAdjustments.map((item) => item.recommendationId)}
                  onApply={handleApplyRecommendation}
                  eyebrow="Context read"
                  title="What the vessel and starter path change"
                  description="These notes focus on fit, material, lineage, and any tea or sugar changes that matter once the culture source is known."
                  secondaryTitle="Also useful context"
                  maxPrimary={2}
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
                    Final check before you start
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Look over the batch, check anything still worth your attention, and start when
                    it feels right.
                  </p>
                </div>

                <F1SetupSummary
                  setup={batchSetupFields}
                  selectedRecipeName={selectedRecipe?.name}
                  selectedVessel={selectedVessel}
                />

                {finalCheckCards.length > 0 ? (
                  <div className="rounded-2xl border border-honey/50 bg-honey-light/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Still worth a last look
                    </p>
                    <div className="mt-3 space-y-2">
                      {finalCheckCards.slice(0, 3).map((card) => (
                        <p key={card.id} className="text-sm text-foreground">
                          {card.title}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}

                <F1RecommendationSection
                  cards={reviewRecommendationCards}
                  loadingHistory={recommendationHistoryLoading}
                  appliedRecommendationIds={appliedAdjustments.map((item) => item.recommendationId)}
                  onApply={handleApplyRecommendation}
                  eyebrow="Final checks"
                  title="Anything still worth a last look"
                  description="This final pass keeps the bigger cautions and the most useful history-backed context in one place."
                  secondaryTitle="Helpful context from past batches"
                />

                <div className="rounded-2xl border border-border/80 bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Save this setup for later
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        If this feels like a good starting point to repeat, save it as a recipe
                        before you start the batch.
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
        helperText={currentStep === "review" ? reviewStepState.helperText : currentStepState.helperText}
        helperTone={
          currentStepState.status === "blocked"
            ? "blocked"
            : currentStepState.status === "warning"
              ? "warning"
              : "default"
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
              Save the parts you want to reuse later. Starting today&apos;s batch is still a
              separate step.
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
