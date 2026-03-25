import { Button } from "@/components/ui/button";
import type { NewBatchCoachPopup as NewBatchCoachPopupModel } from "@/components/f1/new-batch-wizard/types";

type NewBatchCoachPopupProps = {
  popup: NewBatchCoachPopupModel | null;
  onDismiss: () => void;
};

export function NewBatchCoachPopup({ popup, onDismiss }: NewBatchCoachPopupProps) {
  if (!popup) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-30 sm:left-auto sm:right-6 sm:w-full sm:max-w-sm">
      <div
        className={`rounded-2xl border p-4 shadow-lg shadow-black/10 backdrop-blur ${
          popup.tone === "caution"
            ? "border-honey/50 bg-honey-light/95"
            : "border-primary/20 bg-card/95"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{popup.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{popup.body}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
