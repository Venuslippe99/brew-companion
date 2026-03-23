import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  TASTE_TEST_IMPRESSIONS,
  type TasteTestImpression,
} from "@/lib/batch-quick-logs";

type QuickLogMode = "note" | "taste_test";

function getCopy(mode: QuickLogMode) {
  if (mode === "taste_test") {
    return {
      title: "Log a taste test",
      description:
        "Keep a quick note about how First Fermentation tastes right now without forcing a stage change.",
      primaryLabel: "How did it taste?",
      saveLabel: "Save taste test",
      placeholder: "What stood out? Keep it short and practical.",
    };
  }

  return {
    title: "Add a brewing note",
    description:
      "Capture a quick thought, observation, or reminder while you are still with the batch.",
    primaryLabel: "",
    saveLabel: "Save note",
    placeholder: "What do you want to remember about this batch?",
  };
}

export function BatchQuickLogDrawer({
  mode,
  open,
  saving = false,
  onOpenChange,
  onSave,
}: {
  mode: QuickLogMode;
  open: boolean;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (args: { note: string; tasteImpression?: TasteTestImpression }) => Promise<void>;
}) {
  const copy = getCopy(mode);
  const [note, setNote] = useState("");
  const [tasteImpression, setTasteImpression] = useState<TasteTestImpression | "">("");

  useEffect(() => {
    if (open) {
      setNote("");
      setTasteImpression("");
    }
  }, [open, mode]);

  const canSave =
    mode === "taste_test" ? note.trim().length > 0 && !!tasteImpression : note.trim().length > 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{copy.title}</DrawerTitle>
          <DrawerDescription>{copy.description}</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-5 overflow-y-auto px-4 pb-2">
          {mode === "taste_test" && (
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">{copy.primaryLabel}</span>
              <select
                value={tasteImpression}
                onChange={(event) =>
                  setTasteImpression(event.target.value as TasteTestImpression)
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Choose one</option>
                {TASTE_TEST_IMPRESSIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-sm text-muted-foreground">
              {mode === "taste_test" ? "What did you notice?" : "Your note"}
            </span>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={copy.placeholder}
            />
          </label>
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void onSave({ note, tasteImpression: tasteImpression || undefined })}
            disabled={!canSave || saving}
          >
            {saving ? "Saving..." : copy.saveLabel}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
