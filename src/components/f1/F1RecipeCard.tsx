import { Button } from "@/components/ui/button";
import type { F1RecipeSummary } from "@/lib/f1-recipe-types";

type F1RecipeCardProps = {
  recipe: F1RecipeSummary;
  compact?: boolean;
  onSelect?: (recipe: F1RecipeSummary) => void;
  onEdit?: (recipe: F1RecipeSummary) => void;
  onDuplicate?: (recipe: F1RecipeSummary) => void;
  onArchiveToggle?: (recipe: F1RecipeSummary) => void;
  onFavoriteToggle?: (recipe: F1RecipeSummary) => void;
  onDelete?: (recipe: F1RecipeSummary) => void;
};

export function F1RecipeCard({
  recipe,
  compact = false,
  onSelect,
  onEdit,
  onDuplicate,
  onArchiveToggle,
  onFavoriteToggle,
  onDelete,
}: F1RecipeCardProps) {
  const archived = !!recipe.archivedAt;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{recipe.name}</h3>
            {recipe.isFavorite ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                Favorite
              </span>
            ) : null}
            {archived ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Archived
              </span>
            ) : null}
          </div>
          {recipe.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{recipe.description}</p>
          ) : null}
        </div>

        {onSelect ? (
          <Button type="button" size="sm" onClick={() => onSelect(recipe)}>
            Use recipe
          </Button>
        ) : null}
      </div>

      <div className={`mt-4 grid gap-3 text-sm ${compact ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}>
        <div>
          <p className="text-muted-foreground">Volume</p>
          <p className="font-medium text-foreground">{recipe.targetTotalVolumeMl}ml</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tea</p>
          <p className="font-medium text-foreground">
            {recipe.teaAmountValue}
            {recipe.teaAmountUnit} {recipe.teaType}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Sugar</p>
          <p className="font-medium text-foreground">
            {recipe.sugarAmountValue}
            {recipe.sugarAmountUnit} {recipe.sugarType}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Starter</p>
          <p className="font-medium text-foreground">{recipe.defaultStarterLiquidMl}ml</p>
        </div>
      </div>

      {!compact && (onEdit || onDuplicate || onArchiveToggle || onFavoriteToggle || onDelete) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {onEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(recipe)}>
              Edit
            </Button>
          ) : null}
          {onDuplicate ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onDuplicate(recipe)}>
              Duplicate
            </Button>
          ) : null}
          {onFavoriteToggle ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFavoriteToggle(recipe)}
            >
              {recipe.isFavorite ? "Unfavorite" : "Favorite"}
            </Button>
          ) : null}
          {onArchiveToggle ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onArchiveToggle(recipe)}
            >
              {archived ? "Restore" : "Archive"}
            </Button>
          ) : null}
          {onDelete ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onDelete(recipe)}>
              Delete
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
