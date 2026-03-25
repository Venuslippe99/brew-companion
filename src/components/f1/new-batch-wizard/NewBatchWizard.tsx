import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { F1RecipeEditor } from "@/components/f1/F1RecipeEditor";
import { F1RecipePicker } from "@/components/f1/F1RecipePicker";
import { F1VesselPicker } from "@/components/f1/F1VesselPicker";
import { NewBatchCoachPopup } from "@/components/f1/new-batch-wizard/NewBatchCoachPopup";
import { NewBatchWizardFooter } from "@/components/f1/new-batch-wizard/NewBatchWizardFooter";
import { NewBatchWizardHeader } from "@/components/f1/new-batch-wizard/NewBatchWizardHeader";
import { FinalizeStep } from "@/components/f1/new-batch-wizard/steps/FinalizeStep";
import { RecipeStep } from "@/components/f1/new-batch-wizard/steps/RecipeStep";
import { SugarStep } from "@/components/f1/new-batch-wizard/steps/SugarStep";
import { SweetnessStep } from "@/components/f1/new-batch-wizard/steps/SweetnessStep";
import { TeaStep } from "@/components/f1/new-batch-wizard/steps/TeaStep";
import { TemperatureStep } from "@/components/f1/new-batch-wizard/steps/TemperatureStep";
import { VesselStep } from "@/components/f1/new-batch-wizard/steps/VesselStep";
import { VolumeStep } from "@/components/f1/new-batch-wizard/steps/VolumeStep";
import { useNewBatchWizard } from "@/components/f1/new-batch-wizard/useNewBatchWizard";
import { f1NewBatchCopy } from "@/copy/f1-new-batch";
import type { BrewAgainNavigationState } from "@/lib/brew-again-types";

type NewBatchWizardProps = {
  userId: string | null | undefined;
  brewAgainState: BrewAgainNavigationState | null;
};

export function NewBatchWizard({ userId, brewAgainState }: NewBatchWizardProps) {
  const navigate = useNavigate();
  const wizard = useNewBatchWizard({
    userId,
    brewAgainState,
    navigate,
  });

  const currentStepView = useMemo(() => {
    switch (wizard.state.step) {
      case "volume":
        return (
          <VolumeStep
            mode={wizard.state.mode}
            recipeName={wizard.state.selectedRecipe?.name}
            brewAgainName={brewAgainState?.sourceSummary.sourceBatchName}
            totalVolumeMl={wizard.state.answers.totalVolumeMl}
            starterSourceOptions={wizard.starterSourceOptions}
            starterSourceLoading={wizard.starterSourceLoading}
            starterSourceBatchId={wizard.state.answers.starterSourceBatchId}
            recommendedStarterSourceBatchId={wizard.recommendedStarterSourceBatchId}
            onChange={(value) => wizard.updateAnswer("totalVolumeMl", value)}
            onStarterSourceChange={(value) => wizard.updateAnswer("starterSourceBatchId", value)}
            onChooseRecipe={() => wizard.setRecipePickerOpen(true)}
            onChooseScratch={wizard.resetToScratch}
            onChooseBrewAgain={brewAgainState ? wizard.applyBrewAgainPrefill : undefined}
          />
        );
      case "tea":
        return (
          <TeaStep
            teaType={wizard.state.answers.teaType}
            onChange={(value) => wizard.updateAnswer("teaType", value)}
          />
        );
      case "sugar":
        return (
          <SugarStep
            sugarType={wizard.state.answers.sugarType}
            onChange={(value) => wizard.updateAnswer("sugarType", value)}
          />
        );
      case "vessel":
        return (
          <VesselStep
            selectedVessel={wizard.state.selectedVessel}
            manualVesselDraft={wizard.state.manualVesselDraft}
            fit={wizard.vesselFit}
            customExpanded={wizard.customVesselExpanded}
            savingCustomVessel={wizard.manualVesselSaving}
            onChooseSaved={() => wizard.setVesselPickerOpen(true)}
            onToggleCustom={() => wizard.setCustomVesselExpanded(!wizard.customVesselExpanded)}
            onUseCustomToday={wizard.useCustomVesselToday}
            onSaveCustom={wizard.handleSaveManualVessel}
            onUpdateDraft={wizard.updateManualVesselDraft}
          />
        );
      case "sweetness":
        return (
          <SweetnessStep
            targetPreference={wizard.state.answers.targetPreference}
            onChange={(value) => wizard.updateAnswer("targetPreference", value)}
          />
        );
      case "temperature":
        return (
          <TemperatureStep
            avgRoomTempC={wizard.state.answers.avgRoomTempC}
            onChange={(value) => wizard.updateAnswer("avgRoomTempC", value)}
          />
        );
      case "recipe":
        return (
          <RecipeStep
            generatedRecipe={wizard.generatedRecipe}
            estimatedF1Timing={wizard.estimatedF1Timing}
            overrideTeaG={wizard.state.overrides.teaG}
            overrideSugarG={wizard.state.overrides.sugarG}
            overrideStarterMl={wizard.state.overrides.starterMl}
            requiresManualSugar={wizard.requiresManualSugar}
            onOverrideChange={wizard.updateOverride}
            recommendationHistoryLoading={wizard.recommendationHistoryLoading}
            secondaryCards={wizard.secondaryCards}
          />
        );
      case "finalize":
        return (
          <FinalizeStep
            metadata={wizard.state.metadata}
            setup={wizard.persistedSetup}
            onMetadataChange={wizard.updateMetadata}
            onSaveRecipe={wizard.openSaveRecipe}
          />
        );
      default:
        return null;
    }
  }, [brewAgainState, wizard]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [wizard.state.step]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-5xl flex-col gap-4 px-4 pb-6 pt-6 lg:px-8 lg:pt-8">
      <NewBatchWizardHeader
        mode={wizard.state.mode}
        recipeName={wizard.state.selectedRecipe?.name}
        brewAgainName={brewAgainState?.sourceSummary.sourceBatchName}
        onExit={() => navigate("/batches")}
      />

      <div className="flex-1">{currentStepView}</div>

      <NewBatchCoachPopup popup={wizard.coachPopup} onDismiss={wizard.dismissCoachPopup} />

      <NewBatchWizardFooter
        primaryLabel={wizard.primaryLabel}
        primaryDisabled={!wizard.canContinue}
        primaryLoading={wizard.isSaving}
        onPrimary={wizard.goNext}
        helperText={wizard.stepHelperText}
        onBack={wizard.state.step !== "volume" ? wizard.goBack : undefined}
      />

      <F1RecipePicker
        open={wizard.recipePickerOpen}
        loading={wizard.recipeLoading}
        recipes={wizard.availableRecipes.filter((recipe) => !recipe.archivedAt)}
        onOpenChange={wizard.setRecipePickerOpen}
        onSelect={wizard.applyRecipePrefill}
        onManageLibrary={() => navigate("/f1-recipes")}
      />

      <F1VesselPicker
        open={wizard.vesselPickerOpen}
        loading={wizard.vesselLoading}
        vessels={wizard.availableVessels}
        onOpenChange={wizard.setVesselPickerOpen}
        onSelect={wizard.setSelectedVesselFromSaved}
        onManageLibrary={() => navigate("/f1-vessels")}
      />

      <Dialog open={wizard.saveRecipeOpen} onOpenChange={wizard.setSaveRecipeOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{f1NewBatchCopy.page.saveRecipeDialog.title}</DialogTitle>
            <DialogDescription>
              {f1NewBatchCopy.page.saveRecipeDialog.description}
            </DialogDescription>
          </DialogHeader>

          <F1RecipeEditor
            draft={wizard.recipeDraft}
            saving={wizard.recipeSaving}
            submitLabel={f1NewBatchCopy.page.saveRecipeDialog.submitLabel}
            availableVessels={wizard.availableVessels}
            onManageVessels={() => navigate("/f1-vessels")}
            onChange={wizard.setRecipeDraft}
            onSubmit={wizard.handleSaveRecipe}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
