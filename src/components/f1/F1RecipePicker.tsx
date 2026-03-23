import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { F1RecipeCard } from "@/components/f1/F1RecipeCard";
import type { F1RecipeSummary } from "@/lib/f1-recipe-types";

type F1RecipePickerProps = {
  open: boolean;
  loading: boolean;
  recipes: F1RecipeSummary[];
  onOpenChange: (open: boolean) => void;
  onSelect: (recipe: F1RecipeSummary) => void;
  onManageLibrary: () => void;
};

export function F1RecipePicker({
  open,
  loading,
  recipes,
  onOpenChange,
  onSelect,
  onManageLibrary,
}: F1RecipePickerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Choose an F1 recipe</SheetTitle>
          <SheetDescription>
            Recipes load defaults into the batch form. You can still adjust today's actual values before creating the batch.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onManageLibrary}>
              Open recipe library
            </Button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Loading recipes...</p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                You do not have any saved F1 recipes yet. Start from scratch, then save the setup as a recipe once it looks right.
              </p>
            </div>
          ) : (
            recipes.map((recipe) => (
              <F1RecipeCard
                key={recipe.id}
                recipe={recipe}
                compact
                onSelect={(selected) => {
                  onSelect(selected);
                  onOpenChange(false);
                }}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
