import { useEffect, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import { f1NewBatchCopy } from "@/copy/f1-new-batch";
import { supabase } from "@/integrations/supabase/client";
import type { BrewAgainNavigationState } from "@/lib/brew-again-types";
import { getBatchStageTiming } from "@/lib/batch-timing";
import { buildF1Recommendations, loadF1RecommendationHistoryContext } from "@/lib/f1-recommendations";
import {
  applyRecipeToBatchSetup,
  buildRecipeDraftFromBatchSetup,
  createEmptyF1RecipeDraft,
  F1_SUGAR_TYPES,
  F1_TARGET_PREFERENCES,
  F1_TEA_TYPES,
  type F1BatchSetupFields,
  type F1RecipeDraft,
  type F1RecipeSummary,
  type F1SugarType,
  type F1TargetPreference,
  type F1TeaSourceForm,
  type F1TeaType,
} from "@/lib/f1-recipe-types";
import { generateF1RecipeRecommendation } from "@/lib/f1-recipe-generator";
import { saveBatchF1Setup } from "@/lib/f1-setups";
import { findSimilarF1Setups } from "@/lib/f1-similarity";
import {
  buildSelectedVesselFromDraft,
  buildSelectedVesselFromSaved,
  createEmptyFermentationVesselDraft,
  createManualVesselSelection,
  getLegacyVesselTypeLabel,
  type FermentationVesselDraft,
  type FermentationVesselSummary,
  type SelectedF1Vessel,
} from "@/lib/f1-vessel-types";
import { buildF1VesselFitResult } from "@/lib/f1-vessel-fit";
import { loadFermentationVessels, saveFermentationVessel } from "@/lib/f1-vessels";
import { loadF1Recipes, saveF1Recipe } from "@/lib/f1-recipes";
import { loadStarterSourceCandidates, type LineageBatchSummary } from "@/lib/lineage";
import {
  NEW_BATCH_WIZARD_STEP_IDS,
  type NewBatchCoachPopup,
  type NewBatchWizardMode,
  type NewBatchWizardStepId,
} from "@/components/f1/new-batch-wizard/types";

type WizardState = {
  mode: NewBatchWizardMode;
  step: NewBatchWizardStepId;
  answers: {
    totalVolumeMl: number;
    teaType: F1TeaType;
    sugarType: F1SugarType;
    targetPreference: F1TargetPreference;
    avgRoomTempC: number;
    teaSourceForm: F1TeaSourceForm;
    scobyPresent: boolean;
    starterSourceBatchId: string | null;
    brewAgainSourceBatchId: string | null;
  };
  metadata: { name: string; brewDate: string; initialNotes: string; initialPh: string };
  selectedRecipe: F1RecipeSummary | null;
  selectedVessel: SelectedF1Vessel;
  manualVesselDraft: FermentationVesselDraft;
  overrides: { teaG: number | null; sugarG: number | null; starterMl: number | null };
  coachPopup: NewBatchCoachPopup | null;
};

type WizardAction =
  | { type: "hydrate"; state: WizardState }
  | { type: "set_step"; step: NewBatchWizardStepId }
  | { type: "patch_answers"; patch: Partial<WizardState["answers"]> }
  | { type: "patch_metadata"; patch: Partial<WizardState["metadata"]> }
  | { type: "patch_overrides"; patch: Partial<WizardState["overrides"]> }
  | { type: "set_selected_recipe"; recipe: F1RecipeSummary | null }
  | { type: "set_selected_vessel"; vessel: SelectedF1Vessel }
  | { type: "set_manual_vessel_draft"; draft: FermentationVesselDraft }
  | { type: "set_coach_popup"; popup: NewBatchCoachPopup | null };

type UseNewBatchWizardArgs = {
  userId: string | null | undefined;
  brewAgainState: BrewAgainNavigationState | null;
  navigate: (to: string) => void;
};

function normalizeTeaType(value?: string | null): F1TeaType {
  return F1_TEA_TYPES.includes(value as F1TeaType) ? (value as F1TeaType) : "Black tea";
}

function normalizeSugarType(value?: string | null): F1SugarType {
  return F1_SUGAR_TYPES.includes(value as F1SugarType) ? (value as F1SugarType) : "Cane sugar";
}

function normalizeTargetPreference(value?: string | null): F1TargetPreference {
  return F1_TARGET_PREFERENCES.includes(value as F1TargetPreference)
    ? (value as F1TargetPreference)
    : "balanced";
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

function scrollWizardToTop() {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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

function buildInitialWizardState(brewAgainState: BrewAgainNavigationState | null): WizardState {
  const vesselType = brewAgainState?.prefill.vesselType || "Glass jar";
  const manualVesselDraft = createManualDraftForVessel(vesselType);
  return {
    mode: brewAgainState ? "brew_again" : "scratch",
    step: "volume",
    answers: {
      totalVolumeMl: brewAgainState?.prefill.totalVolumeMl || 3800,
      teaType: normalizeTeaType(brewAgainState?.prefill.teaType),
      sugarType: normalizeSugarType(brewAgainState?.prefill.sugarType),
      targetPreference: normalizeTargetPreference(brewAgainState?.prefill.targetPreference),
      avgRoomTempC: brewAgainState?.prefill.avgRoomTempC || 23,
      teaSourceForm: brewAgainState?.prefill.teaSourceForm || "loose_leaf",
      scobyPresent: brewAgainState?.prefill.scobyPresent ?? true,
      starterSourceBatchId: null,
      brewAgainSourceBatchId: brewAgainState?.sourceSummary.sourceBatchId || null,
    },
    metadata: {
      name: brewAgainState?.prefill.name || "",
      brewDate: brewAgainState?.prefill.brewDate || todayString(),
      initialNotes: brewAgainState?.prefill.initialNotes || "",
      initialPh: brewAgainState?.prefill.initialPh || "",
    },
    selectedRecipe: null,
    selectedVessel: createManualVesselSelection(vesselType),
    manualVesselDraft,
    overrides: { teaG: null, sugarG: null, starterMl: null },
    coachPopup: null,
  };
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "set_step":
      return { ...state, step: action.step };
    case "patch_answers":
      return { ...state, answers: { ...state.answers, ...action.patch } };
    case "patch_metadata":
      return { ...state, metadata: { ...state.metadata, ...action.patch } };
    case "patch_overrides":
      return { ...state, overrides: { ...state.overrides, ...action.patch } };
    case "set_selected_recipe":
      return { ...state, selectedRecipe: action.recipe };
    case "set_selected_vessel":
      return { ...state, selectedVessel: action.vessel };
    case "set_manual_vessel_draft":
      return { ...state, manualVesselDraft: action.draft };
    case "set_coach_popup":
      return { ...state, coachPopup: action.popup };
    default:
      return state;
  }
}

function getNextStep(step: NewBatchWizardStepId) {
  const index = NEW_BATCH_WIZARD_STEP_IDS.findIndex((item) => item === step);
  return NEW_BATCH_WIZARD_STEP_IDS[index + 1] || null;
}

function getPreviousStep(step: NewBatchWizardStepId) {
  const index = NEW_BATCH_WIZARD_STEP_IDS.findIndex((item) => item === step);
  return index > 0 ? NEW_BATCH_WIZARD_STEP_IDS[index - 1] : null;
}

function buildSetupFieldsFromValues(args: {
  state: WizardState;
  teaG: number;
  sugarG: number;
  starterMl: number;
}): F1BatchSetupFields {
  return {
    totalVolumeMl: args.state.answers.totalVolumeMl,
    teaType: args.state.answers.teaType,
    teaSourceForm: args.state.answers.teaSourceForm,
    teaAmountValue: args.teaG,
    teaAmountUnit: "g",
    sugarG: args.sugarG,
    sugarType: args.state.answers.sugarType,
    starterLiquidMl: args.starterMl,
    scobyPresent: args.state.answers.scobyPresent,
    avgRoomTempC: args.state.answers.avgRoomTempC,
    vesselType: getLegacyVesselTypeLabel(args.state.selectedVessel),
    targetPreference: args.state.answers.targetPreference,
    initialNotes: args.state.metadata.initialNotes,
  };
}

const secondaryRecommendationCategories = new Set([
  "timing_expectation",
  "vessel_recommendation",
  "lineage_note",
  "fit_note",
  "similar_setup_note",
  "next_time_lesson",
  "culture_transition_warning",
  "sweetener_transition_warning",
  "combined_transition_warning",
]);

export function useNewBatchWizard({ userId, brewAgainState, navigate }: UseNewBatchWizardArgs) {
  const [state, dispatch] = useReducer(reducer, buildInitialWizardState(brewAgainState));
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const [vesselPickerOpen, setVesselPickerOpen] = useState(false);
  const [saveRecipeOpen, setSaveRecipeOpen] = useState(false);
  const [customVesselExpanded, setCustomVesselExpanded] = useState(false);
  const [dismissedPopupKey, setDismissedPopupKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [manualVesselSaving, setManualVesselSaving] = useState(false);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [vesselLoading, setVesselLoading] = useState(false);
  const [starterSourceLoading, setStarterSourceLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [availableRecipes, setAvailableRecipes] = useState<F1RecipeSummary[]>([]);
  const [availableVessels, setAvailableVessels] = useState<FermentationVesselSummary[]>([]);
  const [starterSourceOptions, setStarterSourceOptions] = useState<LineageBatchSummary[]>([]);
  const [recommendationHistory, setRecommendationHistory] = useState<
    Awaited<ReturnType<typeof loadF1RecommendationHistoryContext>>
  >([]);
  const [recipeDraft, setRecipeDraft] = useState<F1RecipeDraft>(createEmptyF1RecipeDraft());

  useEffect(() => {
    if (!userId) {
      setAvailableRecipes([]);
      setAvailableVessels([]);
      return;
    }
    setRecipeLoading(true);
    setVesselLoading(true);
    void loadF1Recipes()
      .then(setAvailableRecipes)
      .catch((error) => {
        console.error("Load F1 recipes error:", error);
        toast.error(error instanceof Error ? error.message : "Could not load recipes.");
      })
      .finally(() => setRecipeLoading(false));
    void loadFermentationVessels()
      .then(setAvailableVessels)
      .catch((error) => {
        console.error("Load fermentation vessels error:", error);
        toast.error(error instanceof Error ? error.message : "Could not load vessels.");
      })
      .finally(() => setVesselLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setStarterSourceOptions([]);
      return;
    }
    let isActive = true;
    setStarterSourceLoading(true);
    void loadStarterSourceCandidates(userId)
      .then((options) => {
        if (isActive) setStarterSourceOptions(options);
      })
      .catch((error) => {
        console.error("Load starter source candidates error:", error);
        if (isActive) setStarterSourceOptions([]);
      })
      .finally(() => {
        if (isActive) setStarterSourceLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!state.selectedRecipe?.preferredVesselId) return;
    const preferredVessel = availableVessels.find(
      (vessel) => vessel.id === state.selectedRecipe?.preferredVesselId
    );
    if (preferredVessel) {
      dispatch({ type: "set_selected_vessel", vessel: buildSelectedVesselFromSaved(preferredVessel) });
      setCustomVesselExpanded(false);
    }
  }, [availableVessels, state.selectedRecipe?.preferredVesselId]);

  const historyDraft = useMemo(
    () => ({
      brewDate: state.metadata.brewDate,
      setup: {
        totalVolumeMl: state.answers.totalVolumeMl,
        teaType: state.answers.teaType,
        teaSourceForm: state.answers.teaSourceForm,
        teaAmountValue: 0,
        teaAmountUnit: "g",
        sugarG: 0,
        sugarType: state.answers.sugarType,
        starterLiquidMl: 0,
        scobyPresent: state.answers.scobyPresent,
        avgRoomTempC: state.answers.avgRoomTempC,
        vesselType: getLegacyVesselTypeLabel(state.selectedVessel),
        targetPreference: state.answers.targetPreference,
        initialNotes: state.metadata.initialNotes,
      } satisfies F1BatchSetupFields,
      selectedRecipeId: state.selectedRecipe?.id || null,
      selectedVessel: state.selectedVessel,
      starterSourceBatchId: state.answers.starterSourceBatchId,
      brewAgainSourceBatchId: state.answers.brewAgainSourceBatchId,
    }),
    [state]
  );

  useEffect(() => {
    if (!userId) {
      setRecommendationHistory([]);
      return;
    }
    let isActive = true;
    setHistoryLoading(true);
    void loadF1RecommendationHistoryContext({ userId, draft: historyDraft })
      .then((history) => {
        if (isActive) setRecommendationHistory(history);
      })
      .catch((error) => {
        console.error("Load recommendation history error:", error);
        if (isActive) setRecommendationHistory([]);
      })
      .finally(() => {
        if (isActive) setHistoryLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [historyDraft, userId]);

  const canGenerate =
    state.answers.totalVolumeMl > 0 &&
    !!state.answers.teaType &&
    !!state.answers.sugarType &&
    !!state.answers.targetPreference;

  const baseGeneratedRecipe = useMemo(() => {
    if (!canGenerate) return null;
    return generateF1RecipeRecommendation({
      totalVolumeMl: state.answers.totalVolumeMl,
      teaType: state.answers.teaType,
      sugarType: state.answers.sugarType,
      targetPreference: state.answers.targetPreference,
      starterSourceBatchId: state.answers.starterSourceBatchId,
      brewAgainSourceBatchId: state.answers.brewAgainSourceBatchId,
      historyEntries: recommendationHistory,
      similarityMatches: [],
    });
  }, [canGenerate, recommendationHistory, state.answers]);

  const baseDraftForSimilarity = useMemo(() => {
    if (!baseGeneratedRecipe) return null;
    return {
      brewDate: state.metadata.brewDate,
      setup: buildSetupFieldsFromValues({
        state,
        teaG: baseGeneratedRecipe.recommendedTeaG,
        sugarG: baseGeneratedRecipe.recommendedSugarG ?? baseGeneratedRecipe.effectiveSugarTargetG,
        starterMl: baseGeneratedRecipe.recommendedStarterMl,
      }),
      selectedRecipeId: state.selectedRecipe?.id || null,
      selectedVessel: state.selectedVessel,
      starterSourceBatchId: state.answers.starterSourceBatchId,
      brewAgainSourceBatchId: state.answers.brewAgainSourceBatchId,
    };
  }, [baseGeneratedRecipe, state]);

  const similarityMatches = useMemo(() => {
    if (!baseDraftForSimilarity) return [];
    return findSimilarF1Setups({ draft: baseDraftForSimilarity, history: recommendationHistory });
  }, [baseDraftForSimilarity, recommendationHistory]);

  const generatedRecipe = useMemo(() => {
    if (!canGenerate) return null;
    return generateF1RecipeRecommendation({
      totalVolumeMl: state.answers.totalVolumeMl,
      teaType: state.answers.teaType,
      sugarType: state.answers.sugarType,
      targetPreference: state.answers.targetPreference,
      starterSourceBatchId: state.answers.starterSourceBatchId,
      brewAgainSourceBatchId: state.answers.brewAgainSourceBatchId,
      historyEntries: recommendationHistory,
      similarityMatches,
    });
  }, [canGenerate, recommendationHistory, similarityMatches, state.answers]);

  const requiresManualSugar =
    !!generatedRecipe &&
    generatedRecipe.recommendedSugarG === null &&
    state.overrides.sugarG === null;

  const finalTeaG = generatedRecipe ? state.overrides.teaG ?? generatedRecipe.recommendedTeaG : null;
  const finalSugarG = generatedRecipe
    ? state.overrides.sugarG ?? generatedRecipe.recommendedSugarG
    : null;
  const finalStarterMl = generatedRecipe
    ? state.overrides.starterMl ?? generatedRecipe.recommendedStarterMl
    : null;

  const displaySetup = useMemo(() => {
    if (!generatedRecipe || finalTeaG === null || finalStarterMl === null) return null;
    return buildSetupFieldsFromValues({
      state,
      teaG: finalTeaG,
      sugarG: finalSugarG ?? generatedRecipe.effectiveSugarTargetG,
      starterMl: finalStarterMl,
    });
  }, [finalStarterMl, finalSugarG, finalTeaG, generatedRecipe, state]);

  const persistedSetup = useMemo(() => {
    if (!generatedRecipe || finalTeaG === null || finalSugarG === null || finalStarterMl === null) {
      return null;
    }
    return buildSetupFieldsFromValues({ state, teaG: finalTeaG, sugarG: finalSugarG, starterMl: finalStarterMl });
  }, [finalStarterMl, finalSugarG, finalTeaG, generatedRecipe, state]);

  const estimatedF1Timing = useMemo(() => {
    if (!generatedRecipe || finalStarterMl === null) return null;
    return getBatchStageTiming({
      brew_started_at: new Date(`${state.metadata.brewDate || todayString()}T12:00:00`).toISOString(),
      current_stage: "f1_active",
      avg_room_temp_c: state.answers.avgRoomTempC,
      target_preference: state.answers.targetPreference,
      starter_liquid_ml: finalStarterMl,
      total_volume_ml: state.answers.totalVolumeMl,
    });
  }, [finalStarterMl, generatedRecipe, state.answers.avgRoomTempC, state.answers.targetPreference, state.answers.totalVolumeMl, state.metadata.brewDate]);

  const vesselFit = useMemo(
    () => buildF1VesselFitResult({ totalVolumeMl: state.answers.totalVolumeMl, vessel: state.selectedVessel }),
    [state.answers.totalVolumeMl, state.selectedVessel]
  );

  const recommendationDraft = useMemo(() => {
    if (!displaySetup) return null;
    return {
      brewDate: state.metadata.brewDate,
      setup: displaySetup,
      selectedRecipeId: state.selectedRecipe?.id || null,
      selectedVessel: state.selectedVessel,
      starterSourceBatchId: state.answers.starterSourceBatchId,
      brewAgainSourceBatchId: state.answers.brewAgainSourceBatchId,
    };
  }, [displaySetup, state]);

  const secondaryRecommendations = useMemo(() => {
    if (!recommendationDraft) return null;
    return buildF1Recommendations({ draft: recommendationDraft, history: recommendationHistory, appliedAdjustments: [] });
  }, [recommendationDraft, recommendationHistory]);

  const secondaryCards = useMemo(
    () => secondaryRecommendations?.cards.filter((card) => secondaryRecommendationCategories.has(card.category)) || [],
    [secondaryRecommendations?.cards]
  );

  const stepHelperText = useMemo(
    () => f1NewBatchCopy.hook.stepHelperText(state.step, { fitState: vesselFit.fitState, requiresManualSugar }),
    [requiresManualSugar, state.step, vesselFit.fitState]
  );
  const primaryLabel = useMemo(() => f1NewBatchCopy.hook.primaryLabel(state.step), [state.step]);

  const canContinue = useMemo(() => {
    switch (state.step) {
      case "volume":
        return state.answers.totalVolumeMl > 0;
      case "tea":
        return !!state.answers.teaType;
      case "sugar":
        return !!state.answers.sugarType;
      case "vessel":
        return !!state.selectedVessel.name.trim();
      case "sweetness":
        return !!state.answers.targetPreference;
      case "temperature":
        return state.answers.avgRoomTempC > 0;
      case "recipe":
        return !!generatedRecipe && !requiresManualSugar && vesselFit.fitState !== "overfilled";
      case "finalize":
        return !!persistedSetup && !!state.metadata.name.trim() && !!state.metadata.brewDate;
      default:
        return false;
    }
  }, [generatedRecipe, persistedSetup, requiresManualSugar, state.answers.avgRoomTempC, state.answers.sugarType, state.answers.targetPreference, state.answers.teaType, state.answers.totalVolumeMl, state.metadata.brewDate, state.metadata.name, state.selectedVessel.name, state.step, vesselFit.fitState]);

  const recommendedStarterSourceBatchId = state.answers.brewAgainSourceBatchId;

  const coachPopupCandidate = useMemo(() => {
    if (state.step === "vessel" && vesselFit.fitState === "overfilled") {
      return {
        key: `vessel-overfilled-${state.answers.totalVolumeMl}-${state.selectedVessel.name}`,
        title: f1NewBatchCopy.coachPopup.vesselOverfilled.title,
        body: f1NewBatchCopy.coachPopup.vesselOverfilled.body,
        tone: "caution" as const,
      };
    }
    if (state.step === "vessel" && vesselFit.fitState === "tight_fit") {
      return {
        key: `vessel-tight-${state.answers.totalVolumeMl}-${state.selectedVessel.name}`,
        title: f1NewBatchCopy.coachPopup.vesselTight.title,
        body: f1NewBatchCopy.coachPopup.vesselTight.body,
        tone: "caution" as const,
      };
    }
    if (state.step === "sugar" && state.answers.sugarType === "Other") {
      return {
        key: "sugar-other",
        title: f1NewBatchCopy.coachPopup.sugarOther.title,
        body: f1NewBatchCopy.coachPopup.sugarOther.body,
        tone: "caution" as const,
      };
    }
    if (state.step === "sugar" && state.answers.sugarType === "Honey") {
      return {
        key: "sugar-honey",
        title: f1NewBatchCopy.coachPopup.sugarHoney.title,
        body: f1NewBatchCopy.coachPopup.sugarHoney.body,
        tone: "info" as const,
      };
    }
    if (
      state.step === "vessel" &&
      (state.selectedVessel.f1Suitability === "caution" ||
        state.selectedVessel.f1Suitability === "not_recommended")
    ) {
      return {
        key: `vessel-material-${state.selectedVessel.materialType}`,
        title: f1NewBatchCopy.coachPopup.vesselMaterial.title,
        body: f1NewBatchCopy.coachPopup.vesselMaterial.body,
        tone: "caution" as const,
      };
    }
    if (state.step === "temperature" && state.answers.avgRoomTempC < 20) {
      return {
        key: "temp-cool",
        title: f1NewBatchCopy.coachPopup.tempCool.title,
        body: f1NewBatchCopy.coachPopup.tempCool.body,
        tone: "info" as const,
      };
    }
    if (state.step === "temperature" && state.answers.avgRoomTempC > 25) {
      return {
        key: "temp-warm",
        title: f1NewBatchCopy.coachPopup.tempWarm.title,
        body: f1NewBatchCopy.coachPopup.tempWarm.body,
        tone: "info" as const,
      };
    }
    if (
      state.step === "tea" &&
      (state.answers.teaType === "White tea" ||
        state.answers.teaType === "Oolong tea" ||
        state.answers.teaType === "Green & white blend")
    ) {
      return {
        key: `tea-${state.answers.teaType}`,
        title: f1NewBatchCopy.coachPopup.teaLessStandard.title,
        body: f1NewBatchCopy.coachPopup.teaLessStandard.body,
        tone: "info" as const,
      };
    }
    if (state.step === "recipe" && generatedRecipe?.lineageStatus === "unknown") {
      return {
        key: "recipe-unknown-lineage",
        title: f1NewBatchCopy.coachPopup.recipeUnknownLineage.title,
        body: f1NewBatchCopy.coachPopup.recipeUnknownLineage.body,
        tone: "info" as const,
      };
    }
    if (
      state.step === "recipe" &&
      generatedRecipe &&
      ((state.overrides.teaG !== null &&
        Math.abs(state.overrides.teaG - generatedRecipe.recommendedTeaG) >= 4) ||
        (state.overrides.sugarG !== null &&
          generatedRecipe.recommendedSugarG !== null &&
          Math.abs(state.overrides.sugarG - generatedRecipe.recommendedSugarG) >= 20) ||
        (state.overrides.starterMl !== null &&
          Math.abs(state.overrides.starterMl - generatedRecipe.recommendedStarterMl) >= 80))
    ) {
      return {
        key: `override-drift-${state.overrides.teaG}-${state.overrides.sugarG}-${state.overrides.starterMl}`,
        title: f1NewBatchCopy.coachPopup.overrideDrift.title,
        body: f1NewBatchCopy.coachPopup.overrideDrift.body,
        tone: "info" as const,
      };
    }
    return null;
  }, [generatedRecipe, state.answers.avgRoomTempC, state.answers.sugarType, state.answers.teaType, state.answers.totalVolumeMl, state.overrides.sugarG, state.overrides.teaG, state.overrides.starterMl, state.selectedVessel.f1Suitability, state.selectedVessel.materialType, state.selectedVessel.name, state.step, vesselFit.fitState]);

  useEffect(() => {
    if (!coachPopupCandidate) {
      if (dismissedPopupKey) setDismissedPopupKey(null);
      if (state.coachPopup) dispatch({ type: "set_coach_popup", popup: null });
      return;
    }
    if (dismissedPopupKey && dismissedPopupKey !== coachPopupCandidate.key) {
      setDismissedPopupKey(null);
      return;
    }
    if (dismissedPopupKey === coachPopupCandidate.key) {
      if (state.coachPopup) dispatch({ type: "set_coach_popup", popup: null });
      return;
    }
    if (state.coachPopup?.key !== coachPopupCandidate.key) {
      dispatch({ type: "set_coach_popup", popup: coachPopupCandidate });
    }
  }, [coachPopupCandidate, dismissedPopupKey, state.coachPopup]);

  const openSaveRecipe = () => {
    if (!persistedSetup) {
      toast.error(f1NewBatchCopy.hook.toasts.finishRecipeFirst);
      return;
    }
    setRecipeDraft(
      buildRecipeDraftFromBatchSetup(persistedSetup, {
        name: state.selectedRecipe?.name || state.metadata.name.trim() || "",
        description: state.selectedRecipe?.description || "",
        preferredVesselId: state.selectedVessel.source === "saved" ? state.selectedVessel.vesselId : null,
        isFavorite: state.selectedRecipe?.isFavorite || false,
      })
    );
    setSaveRecipeOpen(true);
  };

  const handleSaveRecipe = async () => {
    if (!userId) {
      toast.error(f1NewBatchCopy.hook.toasts.signInToSaveRecipe);
      return;
    }
    setRecipeSaving(true);
    try {
      const savedRecipe = await saveF1Recipe({
        userId,
        draft: recipeDraft,
        recipeId: state.selectedRecipe?.id,
      });
      setAvailableRecipes(await loadF1Recipes());
      dispatch({ type: "set_selected_recipe", recipe: savedRecipe });
      setSaveRecipeOpen(false);
      toast.success(f1NewBatchCopy.hook.toasts.recipeSaved);
    } catch (error) {
      console.error("Save recipe error:", error);
      toast.error(error instanceof Error ? error.message : "Could not save recipe.");
    } finally {
      setRecipeSaving(false);
    }
  };

  const handleSaveManualVessel = async () => {
    if (!userId) {
      toast.error(f1NewBatchCopy.hook.toasts.signInToSaveVessel);
      return;
    }
    setManualVesselSaving(true);
    try {
      const savedVessel = await saveFermentationVessel({ userId, draft: state.manualVesselDraft });
      setAvailableVessels(await loadFermentationVessels());
      dispatch({ type: "set_selected_vessel", vessel: buildSelectedVesselFromSaved(savedVessel) });
      setCustomVesselExpanded(false);
      toast.success(f1NewBatchCopy.hook.toasts.vesselSaved);
    } catch (error) {
      console.error("Save vessel error:", error);
      toast.error(error instanceof Error ? error.message : "Could not save vessel.");
    } finally {
      setManualVesselSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!userId) return void toast.error(f1NewBatchCopy.hook.toasts.signInToStartBatch);
    if (!persistedSetup) return void toast.error(f1NewBatchCopy.hook.toasts.finishRecipeBeforeStart);
    if (!state.metadata.name.trim()) return void toast.error(f1NewBatchCopy.hook.toasts.addBatchName);
    if (!state.metadata.brewDate) return void toast.error(f1NewBatchCopy.hook.toasts.chooseBrewDate);
    if (vesselFit.fitState === "overfilled") return void toast.error(f1NewBatchCopy.hook.toasts.vesselTooFull);
    setIsSaving(true);
    const { data: createdBatch, error } = await supabase
      .from("kombucha_batches")
      .insert({
        user_id: userId,
        name: state.metadata.name.trim(),
        status: "active",
        current_stage: "f1_active",
        brew_started_at: new Date(`${state.metadata.brewDate}T12:00:00`).toISOString(),
        brew_again_source_batch_id: state.answers.brewAgainSourceBatchId,
        starter_source_type: state.answers.starterSourceBatchId ? "previous_batch" : "manual",
        starter_source_batch_id: state.answers.starterSourceBatchId,
        f1_recipe_id: state.selectedRecipe?.id || null,
        total_volume_ml: persistedSetup.totalVolumeMl,
        tea_type: persistedSetup.teaType,
        tea_source_form: persistedSetup.teaSourceForm,
        tea_amount_value: persistedSetup.teaAmountValue,
        tea_amount_unit: persistedSetup.teaAmountUnit,
        sugar_g: persistedSetup.sugarG,
        sugar_type: persistedSetup.sugarType,
        starter_liquid_ml: persistedSetup.starterLiquidMl,
        scoby_present: persistedSetup.scobyPresent,
        avg_room_temp_c: persistedSetup.avgRoomTempC,
        vessel_type: persistedSetup.vesselType,
        target_preference: persistedSetup.targetPreference,
        initial_ph: state.metadata.initialPh ? Number(state.metadata.initialPh) : null,
        initial_notes: state.metadata.initialNotes.trim() || null,
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
        userId,
        origin: state.selectedRecipe ? "recipe" : "scratch",
        setup: persistedSetup,
        selectedRecipe: state.selectedRecipe,
        selectedVessel: state.selectedVessel,
        starterSourceType: state.answers.starterSourceBatchId ? "previous_batch" : "manual",
        starterSourceBatchId: state.answers.starterSourceBatchId,
        brewAgainSourceBatchId: state.answers.brewAgainSourceBatchId,
        generatedRecipe,
        manualOverrides: state.overrides,
        recommendationSnapshot: secondaryRecommendations?.snapshot || null,
        acceptedRecommendationIds: [],
      });
      toast.success(f1NewBatchCopy.hook.toasts.batchStarted);
      navigate("/batches");
    } catch (snapshotError) {
      console.error("Save batch F1 setup snapshot error:", snapshotError);
      toast.message(
        f1NewBatchCopy.hook.toasts.saveSnapshotFailure(
          snapshotError instanceof Error ? snapshotError.message : undefined
        )
      );
      navigate(`/batch/${createdBatch.id}`);
    }
  };

  const goNext = () => {
    if (!canContinue) return;
    if (state.step === "finalize") return void handleCreate();
    const nextStep = getNextStep(state.step);
    if (nextStep) {
      dispatch({ type: "set_coach_popup", popup: null });
      dispatch({ type: "set_step", step: nextStep });
      scrollWizardToTop();
    }
  };

  const goBack = () => {
    const previousStep = getPreviousStep(state.step);
    if (previousStep) {
      dispatch({ type: "set_coach_popup", popup: null });
      dispatch({ type: "set_step", step: previousStep });
      scrollWizardToTop();
    }
  };

  const resetToScratch = () => {
    dispatch({ type: "hydrate", state: buildInitialWizardState(null) });
    setCustomVesselExpanded(false);
    setDismissedPopupKey(null);
    scrollWizardToTop();
  };

  const applyBrewAgainPrefill = () => {
    if (!brewAgainState) return;
    dispatch({ type: "hydrate", state: buildInitialWizardState(brewAgainState) });
    setCustomVesselExpanded(false);
    setDismissedPopupKey(null);
    scrollWizardToTop();
  };

  const applyRecipePrefill = (recipe: F1RecipeSummary) => {
    const recipeFields = applyRecipeToBatchSetup(recipe);
    const nextState = buildInitialWizardState(null);
    nextState.mode = "recipe";
    nextState.selectedRecipe = recipe;
    nextState.step = state.step;
    nextState.answers.totalVolumeMl = recipeFields.totalVolumeMl;
    nextState.answers.teaType = normalizeTeaType(recipeFields.teaType);
    nextState.answers.sugarType = normalizeSugarType(recipeFields.sugarType);
    nextState.answers.targetPreference = recipeFields.targetPreference;
    nextState.answers.avgRoomTempC = recipeFields.avgRoomTempC;
    nextState.answers.teaSourceForm = recipeFields.teaSourceForm;
    nextState.answers.scobyPresent = recipeFields.scobyPresent;
    nextState.metadata.name = recipe.name;
    nextState.metadata.brewDate = state.metadata.brewDate;
    nextState.metadata.initialNotes = recipe.defaultNotes;
    nextState.metadata.initialPh = state.metadata.initialPh;
    nextState.selectedVessel = state.selectedVessel;
    nextState.manualVesselDraft = state.manualVesselDraft;
    const preferredVessel = recipe.preferredVesselId
      ? availableVessels.find((vessel) => vessel.id === recipe.preferredVesselId)
      : null;
    if (preferredVessel) nextState.selectedVessel = buildSelectedVesselFromSaved(preferredVessel);
    dispatch({ type: "hydrate", state: nextState });
    setRecipePickerOpen(false);
    setDismissedPopupKey(null);
    scrollWizardToTop();
  };

  const updateManualVesselDraft = <K extends keyof FermentationVesselDraft>(
    key: K,
    value: FermentationVesselDraft[K]
  ) => {
    const nextDraft = { ...state.manualVesselDraft, [key]: value };
    dispatch({ type: "set_manual_vessel_draft", draft: nextDraft });
    dispatch({ type: "set_selected_vessel", vessel: buildSelectedVesselFromDraft(nextDraft) });
  };

  return {
    state,
    availableRecipes,
    availableVessels,
    starterSourceOptions,
    generatedRecipe,
    estimatedF1Timing,
    displaySetup,
    persistedSetup,
    recommendationHistoryLoading: historyLoading,
    recipeLoading,
    vesselLoading,
    starterSourceLoading,
    recipePickerOpen,
    setRecipePickerOpen,
    vesselPickerOpen,
    setVesselPickerOpen,
    saveRecipeOpen,
    setSaveRecipeOpen,
    recipeDraft,
    setRecipeDraft,
    recipeSaving,
    manualVesselSaving,
    isSaving,
    customVesselExpanded,
    setCustomVesselExpanded,
    vesselFit,
    secondaryCards,
    recommendedStarterSourceBatchId,
    coachPopup: state.coachPopup,
    dismissCoachPopup: () => {
      if (state.coachPopup) setDismissedPopupKey(state.coachPopup.key);
      dispatch({ type: "set_coach_popup", popup: null });
    },
    requiresManualSugar,
    primaryLabel,
    canContinue,
    stepHelperText,
    openSaveRecipe,
    handleSaveRecipe,
    handleSaveManualVessel,
    goNext,
    goBack,
    resetToScratch,
    applyBrewAgainPrefill,
    applyRecipePrefill,
    updateManualVesselDraft,
    updateAnswer: <K extends keyof WizardState["answers"]>(
      key: K,
      value: WizardState["answers"][K]
    ) => dispatch({ type: "patch_answers", patch: { [key]: value } }),
    updateMetadata: <K extends keyof WizardState["metadata"]>(
      key: K,
      value: WizardState["metadata"][K]
    ) => dispatch({ type: "patch_metadata", patch: { [key]: value } }),
    updateOverride: (field: "teaG" | "sugarG" | "starterMl", value: number | null) =>
      dispatch({ type: "patch_overrides", patch: { [field]: value } }),
    setSelectedVesselFromSaved: (vessel: FermentationVesselSummary) => {
      dispatch({ type: "set_selected_vessel", vessel: buildSelectedVesselFromSaved(vessel) });
      setCustomVesselExpanded(false);
      setVesselPickerOpen(false);
    },
    useCustomVesselToday: () =>
      dispatch({ type: "set_selected_vessel", vessel: buildSelectedVesselFromDraft(state.manualVesselDraft) }),
  };
}
