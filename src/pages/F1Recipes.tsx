import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { F1RecipeCard } from "@/components/f1/F1RecipeCard";
import { F1RecipeEditor } from "@/components/f1/F1RecipeEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/use-auth";
import { f1LibraryCopy } from "@/copy/f1-library";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteF1Recipe,
  duplicateF1Recipe,
  loadF1Recipes,
  saveF1Recipe,
  setF1RecipeArchived,
  setF1RecipeFavorite,
} from "@/lib/f1-recipes";
import { loadFermentationVessels } from "@/lib/f1-vessels";
import {
  createEmptyF1RecipeDraft,
  type F1RecipeDraft,
  type F1RecipeSummary,
} from "@/lib/f1-recipe-types";
import type { FermentationVesselSummary } from "@/lib/f1-vessel-types";

export default function F1Recipes() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [recipes, setRecipes] = useState<F1RecipeSummary[]>([]);
  const [availableVessels, setAvailableVessels] = useState<FermentationVesselSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<F1RecipeDraft>(createEmptyF1RecipeDraft());
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [savingRecipe, setSavingRecipe] = useState(false);

  const visibleRecipes = useMemo(
    () => recipes.filter((recipe) => showArchived || !recipe.archivedAt),
    [recipes, showArchived]
  );

  const loadRecipes = async () => {
    setLoading(true);

    try {
      const loaded = await loadF1Recipes({ includeArchived: true });
      setRecipes(loaded);
    } catch (error) {
      console.error("Load F1 recipes error:", error);
      toast.error(
        error instanceof Error ? error.message : f1LibraryCopy.recipes.messages.loadErrorFallback
      );
    } finally {
      setLoading(false);
    }
  };

  const loadVessels = async () => {
    try {
      const loaded = await loadFermentationVessels({ includeArchived: true });
      setAvailableVessels(loaded);
    } catch (error) {
      console.error("Load fermentation vessels for recipes error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : f1LibraryCopy.recipes.messages.loadVesselsErrorFallback
      );
    }
  };

  useEffect(() => {
    void loadRecipes();
    void loadVessels();
  }, []);

  const openCreate = () => {
    setEditingRecipeId(null);
    setEditorDraft(createEmptyF1RecipeDraft());
    setEditorOpen(true);
  };

  const openEdit = (recipe: F1RecipeSummary) => {
    setEditingRecipeId(recipe.id);
    setEditorDraft({
      name: recipe.name,
      description: recipe.description || "",
      targetTotalVolumeMl: recipe.targetTotalVolumeMl,
      teaType: recipe.teaType,
      teaSourceForm: recipe.teaSourceForm,
      teaAmountValue: recipe.teaAmountValue,
      teaAmountUnit: recipe.teaAmountUnit,
      sugarType: recipe.sugarType,
      sugarAmountValue: recipe.sugarAmountValue,
      sugarAmountUnit: recipe.sugarAmountUnit,
      defaultStarterLiquidMl: recipe.defaultStarterLiquidMl,
      defaultScobyPresent: recipe.defaultScobyPresent,
      targetPreference: recipe.targetPreference,
      defaultRoomTempC: recipe.defaultRoomTempC,
      defaultNotes: recipe.defaultNotes || "",
      preferredVesselId: recipe.preferredVesselId,
      isFavorite: recipe.isFavorite,
    });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error(f1LibraryCopy.recipes.messages.signInToSave);
      return;
    }

    setSavingRecipe(true);

    try {
      await saveF1Recipe({
        userId: user.id,
        draft: editorDraft,
        recipeId: editingRecipeId || undefined,
      });

      toast.success(
        editingRecipeId
          ? f1LibraryCopy.recipes.messages.updated
          : f1LibraryCopy.recipes.messages.saved
      );
      setEditorOpen(false);
      await loadRecipes();
    } catch (error) {
      console.error("Save F1 recipe error:", error);
      toast.error(
        error instanceof Error ? error.message : f1LibraryCopy.recipes.messages.saveErrorFallback
      );
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleDelete = async (recipe: F1RecipeSummary) => {
    const { count, error } = await supabase
      .from("kombucha_batches")
      .select("id", { count: "exact", head: true })
      .eq("f1_recipe_id", recipe.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    if ((count || 0) > 0) {
      toast.error(f1LibraryCopy.recipes.messages.archiveInstead);
      return;
    }

    try {
      await deleteF1Recipe(recipe.id);
      toast.success(f1LibraryCopy.recipes.messages.deleted);
      await loadRecipes();
    } catch (error) {
      console.error("Delete F1 recipe error:", error);
      toast.error(
        error instanceof Error ? error.message : f1LibraryCopy.recipes.messages.deleteErrorFallback
      );
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-10 pt-3 lg:px-8 lg:pt-4">
        <ScrollReveal>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {f1LibraryCopy.recipes.page.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate("/new-batch")}>
                {f1LibraryCopy.recipes.page.backToNewBatch}
              </Button>
              <Button variant="outline" onClick={() => navigate("/f1-vessels")}>
                {f1LibraryCopy.recipes.page.manageVessels}
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> {f1LibraryCopy.recipes.page.newRecipe}
              </Button>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.04}>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived((current) => !current)}
            >
              {showArchived
                ? f1LibraryCopy.recipes.page.hideArchived
                : f1LibraryCopy.recipes.page.showArchived}
            </Button>
          </div>
        </ScrollReveal>

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">{f1LibraryCopy.recipes.page.loading}</p>
            </div>
          ) : visibleRecipes.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {f1LibraryCopy.recipes.page.empty}
              </p>
            </div>
          ) : (
            visibleRecipes.map((recipe, index) => (
              <ScrollReveal key={recipe.id} delay={index * 0.04}>
                <F1RecipeCard
                  recipe={recipe}
                  preferredVesselLabel={
                    f1LibraryCopy.recipes.preferredVesselLabel(
                      recipe,
                      availableVessels.find((vessel) => vessel.id === recipe.preferredVesselId)
                        ?.name
                    )
                  }
                  onEdit={openEdit}
                  onDuplicate={async (selected) => {
                    if (!user?.id) {
                      toast.error(f1LibraryCopy.recipes.messages.signInToDuplicate);
                      return;
                    }

                    try {
                      await duplicateF1Recipe({
                        userId: user.id,
                        recipe: selected,
                      });
                      toast.success(f1LibraryCopy.recipes.messages.duplicated);
                      await loadRecipes();
                    } catch (error) {
                      console.error("Duplicate F1 recipe error:", error);
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : f1LibraryCopy.recipes.messages.duplicateErrorFallback
                      );
                    }
                  }}
                  onArchiveToggle={async (selected) => {
                    try {
                      await setF1RecipeArchived({
                        recipeId: selected.id,
                        archived: !selected.archivedAt,
                      });
                      toast.success(
                        selected.archivedAt
                          ? f1LibraryCopy.recipes.messages.restored
                          : f1LibraryCopy.recipes.messages.archived
                      );
                      await loadRecipes();
                    } catch (error) {
                      console.error("Archive F1 recipe error:", error);
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : f1LibraryCopy.recipes.messages.archiveErrorFallback
                      );
                    }
                  }}
                  onFavoriteToggle={async (selected) => {
                    try {
                      await setF1RecipeFavorite({
                        recipeId: selected.id,
                        isFavorite: !selected.isFavorite,
                      });
                      toast.success(
                        selected.isFavorite
                          ? f1LibraryCopy.recipes.messages.removedFavorite
                          : f1LibraryCopy.recipes.messages.favorited
                      );
                      await loadRecipes();
                    } catch (error) {
                      console.error("Favorite F1 recipe error:", error);
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : f1LibraryCopy.recipes.messages.favoriteErrorFallback
                      );
                    }
                  }}
                  onDelete={handleDelete}
                />
              </ScrollReveal>
            ))
          )}
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{f1LibraryCopy.recipes.dialogTitle(editingRecipeId)}</DialogTitle>
            <DialogDescription>
              {f1LibraryCopy.recipes.dialog.description}
            </DialogDescription>
          </DialogHeader>

          <F1RecipeEditor
            draft={editorDraft}
            saving={savingRecipe}
            submitLabel={f1LibraryCopy.recipes.submitLabel(editingRecipeId)}
            availableVessels={availableVessels}
            onManageVessels={() => navigate("/f1-vessels")}
            onChange={setEditorDraft}
            onSubmit={handleSave}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
