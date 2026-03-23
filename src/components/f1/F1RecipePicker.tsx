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
          <SheetTitle>Choose a recipe</SheetTitle>
          <SheetDescription>
            A recipe fills in your usual defaults first. You can still change anything before you
            create today&apos;s batch.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={onManageLibrary}>
              View recipe library
            </Button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Loading your saved recipes...</p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                You do not have any saved recipes yet. Start from scratch, then save a setup once
                it feels worth reusing.
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
