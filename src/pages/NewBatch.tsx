import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { F1RecipeEditor } from "@/components/f1/F1RecipeEditor";
import { F1RecipePicker } from "@/components/f1/F1RecipePicker";
import { F1RecommendationSection } from "@/components/f1/F1RecommendationSection";
import { F1SetupSummary } from "@/components/f1/F1SetupSummary";
import { F1VesselPicker } from "@/components/f1/F1VesselPicker";
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
import { getPhaseOutcomeLabel } from "@/lib/phase-outcome-options";
import { isBrewAgainNavigationState } from "@/lib/brew-again";
import type { BrewAgainNavigationState } from "@/lib/brew-again-types";
import { loadF1Recipes, saveF1Recipe } from "@/lib/f1-recipes";
import { saveBatchF1Setup } from "@/lib/f1-setups";
import { loadFermentationVessels, saveFermentationVessel } from "@/lib/f1-vessels";
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
  F1_TARGET_PREFERENCES,
  F1_TEA_AMOUNT_UNITS,
  F1_TEA_SOURCE_FORMS,
  F1_TEA_TYPES,
  F1_SUGAR_TYPES,
  type F1BatchSetupFields,
  type F1RecipeDraft,
  type F1RecipeSummary,
} from "@/lib/f1-recipe-types";
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
import { loadStarterSourceCandidates, type LineageBatchSummary } from "@/lib/lineage";

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

export default function NewBatch() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isBeginner } = useUser();
  const { user } = useAuth();

  const brewAgainState = isBrewAgainNavigationState(location.state)
    ? (location.state as BrewAgainNavigationState)
    : null;
  const recommendedStarterSourceBatchId = brewAgainState?.sourceSummary.sourceBatchId || null;

  const [showAdvanced, setShowAdvanced] = useState(false);
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
  const [manualVesselDraft, setManualVesselDraft] = useState<FermentationVesselDraft>(() => {
    const initialSelection = createManualVesselSelection(buildInitialForm(brewAgainState).vesselType);
    return {
      ...createEmptyFermentationVesselDraft(),
      name: initialSelection.name,
      materialType: initialSelection.materialType,
      f1Suitability: initialSelection.f1Suitability,
    };
  });
  const [selectedVessel, setSelectedVessel] = useState<SelectedF1Vessel>(() =>
    createManualVesselSelection(buildInitialForm(brewAgainState).vesselType)
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
  const [form, setForm] = useState<NewBatchForm>(() => buildInitialForm(brewAgainState));

  const update = <K extends keyof NewBatchForm>(key: K, value: NewBatchForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const loadRecipes = async () => {
    setRecipeLoading(true);

    try {
      const loaded = await loadF1Recipes();
      setAvailableRecipes(loaded);
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
      const loaded = await loadFermentationVessels();
      setAvailableVessels(loaded);
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
      brewAgainSourceBatchId: brewAgainState?.sourceSummary.sourceBatchId || null,
    }),
    [
      batchSetupFields,
      brewAgainState?.sourceSummary.sourceBatchId,
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
    [
      appliedAdjustments,
      recommendationHistory,
      recommendationDraft,
    ]
  );

  const applyRecipeDefaults = (recipe: F1RecipeSummary) => {
    const recipeFields = applyRecipeToBatchSetup(recipe);

    setSelectedRecipe(recipe);
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
        preferredVesselId:
          selectedVessel.source === "saved" ? selectedVessel.vesselId : null,
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

    toast.success("Applied recommendation to today's draft.");
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
        brew_again_source_batch_id: brewAgainState?.sourceSummary.sourceBatchId || null,
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
        brewAgainSourceBatchId: brewAgainState?.sourceSummary.sourceBatchId || null,
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

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 pt-6 lg:pt-10 lg:px-8 space-y-6 pb-10">
        <ScrollReveal>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground">New Batch</h1>
              <p className="text-sm text-muted-foreground">Kombucha - First Fermentation</p>
            </div>
          </div>
        </ScrollReveal>

        {isBeginner ? (
          <ScrollReveal delay={0.04}>
            <div className="rounded-2xl border border-primary/10 bg-honey-light p-4">
              <p className="text-sm text-foreground">
                Start from scratch or load a saved recipe. Recipes store reusable defaults, while the form below should reflect what you are actually brewing today.
              </p>
            </div>
          </ScrollReveal>
        ) : null}

        <ScrollReveal delay={0.06}>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Recipe source
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {selectedRecipe ? selectedRecipe.name : "Build this batch manually"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedRecipe
                    ? "Recipe defaults are loaded, but every field below stays editable so the batch records what you actually brewed today."
                    : "No recipe is linked yet. You can keep going from scratch or load a saved recipe first."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setSelectedRecipe(null)}>
                  Start from scratch
                </Button>
                <Button type="button" onClick={() => setRecipePickerOpen(true)}>
                  Use saved recipe
                </Button>
              </div>
            </div>

            {selectedRecipe ? (
              <div className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm text-foreground">
                <p>
                  Loaded recipe defaults for {selectedRecipe.targetTotalVolumeMl}ml, {selectedRecipe.teaAmountValue}
                  {selectedRecipe.teaAmountUnit} tea, and {selectedRecipe.sugarAmountValue}
                  {selectedRecipe.sugarAmountUnit} {selectedRecipe.sugarType}.
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={openSaveRecipeDialog}>
                Save current setup as recipe
              </Button>
              <Button type="button" variant="ghost" onClick={() => navigate("/f1-recipes")}>
                Manage recipe library
              </Button>
            </div>
          </div>
        </ScrollReveal>

        {brewAgainState ? (
          <ScrollReveal delay={0.08}>
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Brew Again
                </p>
                <h2 className="mt-1 text-base font-semibold text-foreground">
                  Based on {brewAgainState.sourceSummary.sourceBatchName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mode: {brewAgainState.mode.replace(/_/g, " ")}. You can review and edit everything before creating this new batch.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-primary/10 bg-background p-3">
                  <p className="text-xs text-muted-foreground">Previous F1</p>
                  <p className="mt-1 text-sm text-foreground">
                    {brewAgainState.sourceSummary.f1Outcome
                      ? `${getPhaseOutcomeLabel(brewAgainState.sourceSummary.f1Outcome.f1_taste_state)} · ${getPhaseOutcomeLabel(brewAgainState.sourceSummary.f1Outcome.f1_readiness)}`
                      : "No saved F1 outcome"}
                  </p>
                </div>
                <div className="rounded-xl border border-primary/10 bg-background p-3">
                  <p className="text-xs text-muted-foreground">Previous F2</p>
                  <p className="mt-1 text-sm text-foreground">
                    {brewAgainState.sourceSummary.f2Outcome
                      ? `${getPhaseOutcomeLabel(brewAgainState.sourceSummary.f2Outcome.f2_overall_result)} · ${getPhaseOutcomeLabel(brewAgainState.sourceSummary.f2Outcome.f2_brew_again)}`
                      : "No saved F2 outcome"}
                  </p>
                </div>
              </div>

              {brewAgainState.acceptedSuggestions.length > 0 ? (
                <div className="rounded-xl border border-primary/10 bg-background p-3">
                  <p className="text-xs text-muted-foreground">Accepted suggestions</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
                    {brewAgainState.acceptedSuggestions.map((suggestion) => (
                      <li key={suggestion.id}>{suggestion.summary}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </ScrollReveal>
        ) : null}

        <ScrollReveal delay={0.1}>
          <F1SetupSummary
            setup={batchSetupFields}
            selectedRecipeName={selectedRecipe?.name || null}
            selectedVessel={selectedVessel}
          />
        </ScrollReveal>

        <ScrollReveal delay={0.11}>
          <F1RecommendationSection
            cards={recommendations.cards}
            loadingHistory={recommendationHistoryLoading}
            appliedRecommendationIds={appliedAdjustments.map((item) => item.recommendationId)}
            onApply={handleApplyRecommendation}
          />
        </ScrollReveal>

        <ScrollReveal delay={0.12}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Batch name *</label>
              <input
                type="text"
                placeholder="e.g. Morning Sun Blend"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Brew date *</label>
                <input
                  type="date"
                  value={form.brewDate}
                  onChange={(event) => update("brewDate", event.target.value)}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Volume (ml) *</label>
                <input
                  type="number"
                  value={form.totalVolumeMl}
                  onChange={(event) => update("totalVolumeMl", Number(event.target.value))}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Tea type *</label>
                <select
                  value={form.teaType}
                  onChange={(event) => update("teaType", event.target.value)}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {F1_TEA_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Tea source form *</label>
                <select
                  value={form.teaSourceForm}
                  onChange={(event) =>
                    update("teaSourceForm", event.target.value as NewBatchForm["teaSourceForm"])
                  }
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                <label className="block text-sm font-medium text-foreground mb-1.5">Tea amount *</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.teaAmountValue}
                  onChange={(event) => update("teaAmountValue", Number(event.target.value))}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Unit</label>
                <select
                  value={form.teaAmountUnit}
                  onChange={(event) =>
                    update("teaAmountUnit", event.target.value as NewBatchForm["teaAmountUnit"])
                  }
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                <label className="block text-sm font-medium text-foreground mb-1.5">Sugar amount (g) *</label>
                <input
                  type="number"
                  value={form.sugarG}
                  onChange={(event) => update("sugarG", Number(event.target.value))}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Sugar type *</label>
                <select
                  value={form.sugarType}
                  onChange={(event) => update("sugarType", event.target.value)}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {F1_SUGAR_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Starter liquid (ml) *</label>
                <input
                  type="number"
                  value={form.starterLiquidMl}
                  onChange={(event) => update("starterLiquidMl", Number(event.target.value))}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Average room temperature (C) *</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.avgRoomTempC}
                  onChange={(event) => update("avgRoomTempC", Number(event.target.value))}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <StarterSourceSelector
              options={starterSourceOptions}
              value={starterSourceBatchId}
              loading={starterSourceLoading}
              recommendedBatchId={recommendedStarterSourceBatchId}
              onChange={setStarterSourceBatchId}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4 sm:col-span-2 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground">Fermentation vessel</label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      The recipe can suggest a default vessel, but today&apos;s actual vessel stays editable here.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setVesselPickerOpen(true)}>
                      Use saved vessel
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedVessel(buildSelectedVesselFromDraft(manualVesselDraft))}
                    >
                      Use manual vessel
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => navigate("/f1-vessels")}>
                      Manage vessels
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Current vessel
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {selectedVessel.name || "Manual vessel"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {getVesselMaterialLabel(selectedVessel.materialType)} · {getVesselSuitabilityLabel(selectedVessel.f1Suitability)}
                    {selectedVessel.capacityMl ? ` · ${selectedVessel.capacityMl}ml` : " · Capacity not added yet"}
                  </p>
                  {selectedRecipe?.preferredVesselId && selectedVessel.source !== "saved" ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      This recipe has a preferred vessel saved, but you are overriding it with a manual vessel for today.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Manual vessel name</label>
                    <input
                      type="text"
                      value={manualVesselDraft.name}
                      onChange={(event) => updateManualVesselDraft("name", event.target.value)}
                      placeholder="e.g. 4L kitchen jar"
                      className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Material</label>
                    <select
                      value={manualVesselDraft.materialType}
                      onChange={(event) => {
                        const materialType = event.target.value as FermentationVesselDraft["materialType"];
                        updateManualVesselDraft("materialType", materialType);
                        updateManualVesselDraft(
                          "f1Suitability",
                          getDefaultSuitabilityForMaterial(materialType)
                        );
                      }}
                      className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                    <label className="block text-sm font-medium text-foreground mb-1.5">Capacity (ml)</label>
                    <input
                      type="number"
                      value={manualVesselDraft.capacityMl ?? ""}
                      onChange={(event) =>
                        updateManualVesselDraft(
                          "capacityMl",
                          event.target.value ? Number(event.target.value) : null
                        )
                      }
                      className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Recommended max fill (ml)</label>
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
                      className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Manual vessel notes</label>
                  <textarea
                    rows={2}
                    value={manualVesselDraft.notes}
                    onChange={(event) => updateManualVesselDraft("notes", event.target.value)}
                    placeholder="Optional notes about this vessel."
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={manualVesselSaving}
                    onClick={handleSaveManualVessel}
                  >
                    {manualVesselSaving ? "Saving vessel..." : "Save manual vessel to library"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedVessel(buildSelectedVesselFromDraft(manualVesselDraft))}
                  >
                    Use these manual vessel details
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">SCOBY present</label>
                <div className="flex gap-2">
                  {[true, false].map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() => update("scobyPresent", value)}
                      className={`flex-1 h-11 rounded-lg text-sm font-medium transition-all ${
                        form.scobyPresent === value
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-muted-foreground"
                      }`}
                    >
                      {value ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Taste target</label>
              <div className="grid grid-cols-3 gap-2">
                {F1_TARGET_PREFERENCES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => update("targetPreference", option)}
                    className={`h-11 rounded-lg text-sm font-medium capitalize transition-all ${
                      form.targetPreference === option
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Advanced options
            </button>

            {showAdvanced ? (
              <div className="space-y-4 animate-slide-up">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Initial pH</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 4.2"
                    value={form.initialPh}
                    onChange={(event) => update("initialPh", event.target.value)}
                    className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Any observations about the setup..."
                    value={form.initialNotes}
                    onChange={(event) => update("initialNotes", event.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={openSaveRecipeDialog}
              >
                Save setup as recipe
              </Button>
              <Button
                size="xl"
                className="w-full"
                disabled={!form.name.trim() || !form.brewDate || isSaving}
                onClick={handleCreate}
              >
                {isSaving ? "Creating..." : "Create batch"}
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </div>

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
              Save reusable defaults from the current setup. This does not create the batch by itself and will not overwrite existing recipes unless you edit them later in the recipe library.
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
        onSelect={(vessel) => setSelectedVessel(buildSelectedVesselFromSaved(vessel))}
        onManageLibrary={() => navigate("/f1-vessels")}
      />
    </AppLayout>
  );
}
