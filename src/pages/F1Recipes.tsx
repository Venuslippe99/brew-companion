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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteF1Recipe,
  duplicateF1Recipe,
  loadF1Recipes,
  saveF1Recipe,
  setF1RecipeArchived,
  setF1RecipeFavorite,
} from "@/lib/f1-recipes";
import {
  createEmptyF1RecipeDraft,
  type F1RecipeDraft,
  type F1RecipeSummary,
} from "@/lib/f1-recipe-types";

export default function F1Recipes() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [recipes, setRecipes] = useState<F1RecipeSummary[]>([]);
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
      toast.error(error instanceof Error ? error.message : "Could not load recipes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecipes();
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
      isFavorite: recipe.isFavorite,
    });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("You need to be signed in to save recipes.");
      return;
    }

    setSavingRecipe(true);

    try {
      await saveF1Recipe({
        userId: user.id,
        draft: editorDraft,
        recipeId: editingRecipeId || undefined,
      });

      toast.success(editingRecipeId ? "Recipe updated." : "Recipe saved.");
      setEditorOpen(false);
      await loadRecipes();
    } catch (error) {
      console.error("Save F1 recipe error:", error);
      toast.error(error instanceof Error ? error.message : "Could not save recipe.");
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
      toast.error("Archive this recipe instead. It is already linked to saved batches.");
      return;
    }

    try {
      await deleteF1Recipe(recipe.id);
      toast.success("Recipe deleted.");
      await loadRecipes();
    } catch (error) {
      console.error("Delete F1 recipe error:", error);
      toast.error(error instanceof Error ? error.message : "Could not delete recipe.");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-10 pt-6 lg:px-8 lg:pt-10">
        <ScrollReveal>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground lg:text-3xl">
                F1 Recipes
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Save reusable F1 defaults here, then load them into New Batch when you are ready to brew. Recipes keep your defaults separate from what you actually brewed that day.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate("/new-batch")}>
                Back to New Batch
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> New recipe
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
              {showArchived ? "Hide archived" : "Show archived"}
            </Button>
          </div>
        </ScrollReveal>

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Loading recipes...</p>
            </div>
          ) : visibleRecipes.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No recipes to show yet. Save a setup from New Batch or create one here.
              </p>
            </div>
          ) : (
            visibleRecipes.map((recipe, index) => (
              <ScrollReveal key={recipe.id} delay={index * 0.04}>
                <F1RecipeCard
                  recipe={recipe}
                  onEdit={openEdit}
                  onDuplicate={async (selected) => {
                    if (!user?.id) {
                      toast.error("You need to be signed in to duplicate recipes.");
                      return;
                    }

                    try {
                      await duplicateF1Recipe({
                        userId: user.id,
                        recipe: selected,
                      });
                      toast.success("Recipe duplicated.");
                      await loadRecipes();
                    } catch (error) {
                      console.error("Duplicate F1 recipe error:", error);
                      toast.error(
                        error instanceof Error ? error.message : "Could not duplicate recipe."
                      );
                    }
                  }}
                  onArchiveToggle={async (selected) => {
                    try {
                      await setF1RecipeArchived({
                        recipeId: selected.id,
                        archived: !selected.archivedAt,
                      });
                      toast.success(selected.archivedAt ? "Recipe restored." : "Recipe archived.");
                      await loadRecipes();
                    } catch (error) {
                      console.error("Archive F1 recipe error:", error);
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Could not update the recipe archive state."
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
                        selected.isFavorite ? "Recipe removed from favorites." : "Recipe favorited."
                      );
                      await loadRecipes();
                    } catch (error) {
                      console.error("Favorite F1 recipe error:", error);
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Could not update the favorite state."
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
            <DialogTitle>{editingRecipeId ? "Edit F1 recipe" : "Create F1 recipe"}</DialogTitle>
            <DialogDescription>
              Save reusable defaults here. You will still be able to change actual brew-day values in New Batch before creating a batch.
            </DialogDescription>
          </DialogHeader>

          <F1RecipeEditor
            draft={editorDraft}
            saving={savingRecipe}
            submitLabel={editingRecipeId ? "Save recipe changes" : "Save recipe"}
            onChange={setEditorDraft}
            onSubmit={handleSave}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
