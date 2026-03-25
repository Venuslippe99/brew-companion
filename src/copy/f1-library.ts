import type { F1RecipeSummary } from "@/lib/f1-recipe-types";
import type { FermentationVesselSummary } from "@/lib/f1-vessel-types";

export const f1LibraryCopy = {
  recipes: {
    page: {
      title: "F1 Recipes",
      description:
        "Save reusable F1 defaults here, then load them into New Batch when you are ready to brew. Recipes keep your defaults separate from what you actually brewed that day.",
      backToNewBatch: "Back to New Batch",
      manageVessels: "Manage vessels",
      newRecipe: "New recipe",
      showArchived: "Show archived",
      hideArchived: "Hide archived",
      loading: "Loading recipes...",
      empty: "No recipes to show yet. Save a setup from New Batch or create one here.",
      savedVessel: "Saved vessel",
    },
    dialog: {
      editTitle: "Edit F1 recipe",
      createTitle: "Create F1 recipe",
      description:
        "Save reusable defaults here. You will still be able to change actual brew-day values in New Batch before creating a batch.",
      saveChanges: "Save recipe changes",
      save: "Save recipe",
    },
    messages: {
      signInToSave: "You need to be signed in to save recipes.",
      loadErrorFallback: "Could not load recipes.",
      loadVesselsErrorFallback: "Could not load vessels.",
      updated: "Recipe updated.",
      saved: "Recipe saved.",
      saveErrorFallback: "Could not save recipe.",
      archiveInstead:
        "Archive this recipe instead. It is already linked to saved batches.",
      deleted: "Recipe deleted.",
      deleteErrorFallback: "Could not delete recipe.",
      signInToDuplicate: "You need to be signed in to duplicate recipes.",
      duplicated: "Recipe duplicated.",
      duplicateErrorFallback: "Could not duplicate recipe.",
      restored: "Recipe restored.",
      archived: "Recipe archived.",
      archiveErrorFallback: "Could not update the recipe archive state.",
      removedFavorite: "Recipe removed from favorites.",
      favorited: "Recipe favorited.",
      favoriteErrorFallback: "Could not update the favorite state.",
    },
    submitLabel(editingRecipeId: string | null) {
      return editingRecipeId ? this.dialog.saveChanges : this.dialog.save;
    },
    dialogTitle(editingRecipeId: string | null) {
      return editingRecipeId ? this.dialog.editTitle : this.dialog.createTitle;
    },
    preferredVesselLabel(
      recipe: F1RecipeSummary,
      vesselName: string | undefined
    ) {
      return recipe.preferredVesselId ? vesselName || this.page.savedVessel : null;
    },
  },
  vessels: {
    page: {
      title: "F1 Vessels",
      description:
        "Save the fermentation vessels you actually use for F1 so recipes and new batches can start from a real container, not just a generic label.",
      backToNewBatch: "Back to New Batch",
      newVessel: "New vessel",
      showArchived: "Show archived",
      hideArchived: "Hide archived",
      loading: "Loading vessels...",
      empty:
        "No vessels to show yet. Add one here or keep using a manual vessel in New Batch.",
    },
    dialog: {
      editTitle: "Edit F1 vessel",
      createTitle: "Create F1 vessel",
      description:
        "Save reusable fermentation vessel details here. New Batch can still fall back to manual vessel details when needed.",
      saveChanges: "Save vessel changes",
      save: "Save vessel",
    },
    messages: {
      signInToSave: "You need to be signed in to save vessels.",
      loadErrorFallback: "Could not load vessels.",
      updated: "Vessel updated.",
      saved: "Vessel saved.",
      saveErrorFallback: "Could not save vessel.",
      usageCheckError: "Could not check vessel usage.",
      archiveInstead:
        "Archive this vessel instead. It is already linked to recipes or saved batches.",
      deleted: "Vessel deleted.",
      deleteErrorFallback: "Could not delete vessel.",
      signInToDuplicate: "You need to be signed in to duplicate vessels.",
      duplicated: "Vessel duplicated.",
      duplicateErrorFallback: "Could not duplicate vessel.",
      restored: "Vessel restored.",
      archived: "Vessel archived.",
      archiveErrorFallback: "Could not update the vessel archive state.",
      removedFavorite: "Vessel removed from favorites.",
      favorited: "Vessel favorited.",
      favoriteErrorFallback: "Could not update the favorite state.",
    },
    submitLabel(editingVesselId: string | null) {
      return editingVesselId ? this.dialog.saveChanges : this.dialog.save;
    },
    dialogTitle(editingVesselId: string | null) {
      return editingVesselId ? this.dialog.editTitle : this.dialog.createTitle;
    },
    preferredVesselLabel(vessel: FermentationVesselSummary) {
      return vessel.name;
    },
  },
};
