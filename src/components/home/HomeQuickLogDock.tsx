import { useEffect, useMemo, useState } from "react";
import {
  CameraOff,
  Droplets,
  NotebookPen,
  Thermometer,
  Waves,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { KombuchaBatch } from "@/lib/batches";
import type { HomeQuickLogAction } from "@/lib/home-command-center";
import {
  TASTE_TEST_IMPRESSIONS,
  type TasteTestImpression,
} from "@/lib/batch-quick-logs";

const iconMap = {
  taste_test: Droplets,
  temp_check: Thermometer,
  carbonation_check: Waves,
  note_only: NotebookPen,
};

function getActionCopy(action: HomeQuickLogAction["key"]) {
  switch (action) {
    case "taste_test":
      return {
        title: "Log a taste test",
        description:
          "Save a quick taste note without changing the batch stage from Home.",
        noteLabel: "What stood out?",
        notePlaceholder: "Short, practical tasting note",
        saveLabel: "Save taste test",
      };
    case "temp_check":
      return {
        title: "Log a temperature check",
        description:
          "Save the room temperature for this batch and add a note only if it helps.",
        noteLabel: "Optional note",
        notePlaceholder: "Anything unusual about the room or setup?",
        saveLabel: "Save temperature check",
      };
    case "carbonation_check":
      return {
        title: "Log a carbonation check",
        description:
          "Save a quick note on fizz or bottle pressure without moving the batch to a new stage.",
        noteLabel: "What did you notice?",
        notePlaceholder: "Short carbonation or pressure note",
        saveLabel: "Save carbonation check",
      };
    case "note_only":
      return {
        title: "Add a brewing note",
        description: "Save a short observation while the batch is already top of mind.",
        noteLabel: "Your note",
        notePlaceholder: "What do you want to remember?",
        saveLabel: "Save note",
      };
  }
}

export function HomeQuickLogDock({
  actions,
  batches,
  saving = false,
  id,
  requestedActionKey,
  onRequestedActionHandled,
  onSubmit,
}: {
  actions: HomeQuickLogAction[];
  batches: KombuchaBatch[];
  saving?: boolean;
  id?: string;
  requestedActionKey?: HomeQuickLogAction["key"] | null;
  onRequestedActionHandled?: () => void;
  onSubmit: (args: {
    actionKey: HomeQuickLogAction["key"];
    batchId: string;
    note?: string;
    tasteImpression?: TasteTestImpression;
    valueNumber?: number;
  }) => Promise<void>;
}) {
  const [openActionKey, setOpenActionKey] = useState<HomeQuickLogAction["key"] | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [note, setNote] = useState("");
  const [valueNumber, setValueNumber] = useState("");
  const [tasteImpression, setTasteImpression] = useState<TasteTestImpression | "">("");

  const activeAction = useMemo(
    () => actions.find((action) => action.key === openActionKey),
    [actions, openActionKey]
  );
  const eligibleBatches = useMemo(
    () =>
      batches.filter((batch) => activeAction?.eligibleBatchIds.includes(batch.id)),
    [activeAction, batches]
  );

  useEffect(() => {
    if (!requestedActionKey) {
      return;
    }

    setOpenActionKey(requestedActionKey);
    onRequestedActionHandled?.();
  }, [onRequestedActionHandled, requestedActionKey]);

  useEffect(() => {
    if (!activeAction) {
      return;
    }

    setSelectedBatchId(activeAction.preferredBatchId || activeAction.eligibleBatchIds[0] || "");
    setNote("");
    setValueNumber("");
    setTasteImpression("");
  }, [activeAction]);

  const activeCopy = activeAction ? getActionCopy(activeAction.key) : null;
  const canSubmit =
    !!activeAction &&
    !!selectedBatchId &&
    (activeAction.key === "temp_check"
      ? valueNumber.trim().length > 0
      : activeAction.key === "taste_test"
        ? note.trim().length > 0 && !!tasteImpression
        : note.trim().length > 0);

  return (
    <section id={id} className="home-panel-surface px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
            Quick actions
          </p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            Log a quick check
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Save a taste note, temperature check, carbonation check, or short observation without
            changing the batch stage.
          </p>
        </div>
        <div className="hidden rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground lg:block">
          <div className="flex items-center gap-2">
            <CameraOff className="h-3.5 w-3.5 text-copper" />
            Photo logging is still coming later
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = iconMap[action.key];
          const disabled = action.eligibleBatchIds.length === 0;

          return (
            <button
              key={action.key}
              type="button"
              disabled={disabled}
              onClick={() => setOpenActionKey(action.key)}
              className="rounded-[20px] border border-border/75 bg-background/85 px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-honey-light/70 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {action.eligibleBatchIds.length}
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">{action.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
            </button>
          );
        })}
      </div>

      <Drawer open={openActionKey !== null} onOpenChange={(open) => !open && setOpenActionKey(null)}>
        <DrawerContent className="max-h-[92vh]">
          {activeAction && activeCopy ? (
            <>
              <DrawerHeader>
                <DrawerTitle>{activeCopy.title}</DrawerTitle>
                <DrawerDescription>{activeCopy.description}</DrawerDescription>
              </DrawerHeader>

              <div className="space-y-5 overflow-y-auto px-4 pb-3">
                <label className="block space-y-1">
                  <span className="text-sm text-muted-foreground">Which batch?</span>
                  <select
                    value={selectedBatchId}
                    onChange={(event) => setSelectedBatchId(event.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  >
                    {eligibleBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </label>

                {activeAction.key === "taste_test" ? (
                  <label className="block space-y-1">
                    <span className="text-sm text-muted-foreground">How did it taste?</span>
                    <select
                      value={tasteImpression}
                      onChange={(event) => setTasteImpression(event.target.value as TasteTestImpression)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    >
                      <option value="">Choose one</option>
                      {TASTE_TEST_IMPRESSIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {activeAction.key === "temp_check" ? (
                  <label className="block space-y-1">
                    <span className="text-sm text-muted-foreground">Room temperature</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="50"
                        step="0.5"
                        value={valueNumber}
                        onChange={(event) => setValueNumber(event.target.value)}
                        placeholder="22"
                      />
                      <span className="text-sm text-muted-foreground">deg C</span>
                    </div>
                  </label>
                ) : null}

                <label className="block space-y-1">
                  <span className="text-sm text-muted-foreground">{activeCopy.noteLabel}</span>
                  <Textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={activeCopy.notePlaceholder}
                  />
                </label>
              </div>

              <DrawerFooter>
                <Button variant="outline" disabled={saving} onClick={() => setOpenActionKey(null)}>
                  Close
                </Button>
                <Button
                  disabled={!canSubmit || saving}
                  onClick={() =>
                    void onSubmit({
                      actionKey: activeAction.key,
                      batchId: selectedBatchId,
                      note: note.trim() || undefined,
                      tasteImpression: tasteImpression || undefined,
                      valueNumber:
                        activeAction.key === "temp_check" && valueNumber.trim().length > 0
                          ? Number(valueNumber)
                          : undefined,
                    }).then(() => setOpenActionKey(null))
                  }
                >
                  {saving ? "Saving..." : activeCopy.saveLabel}
                </Button>
              </DrawerFooter>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </section>
  );
}
