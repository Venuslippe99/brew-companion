import { useEffect, useMemo, useState } from "react";
import { CameraOff, Droplets, NotebookPen, Thermometer, Waves } from "lucide-react";
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
import { homeCopy } from "@/copy/home";
import type { KombuchaBatch } from "@/lib/batches";
import type { HomeQuickLogAction } from "@/lib/home-command-center";
import { TASTE_TEST_IMPRESSIONS, type TasteTestImpression } from "@/lib/batch-quick-logs";

const iconMap = {
  taste_test: Droplets,
  temp_check: Thermometer,
  carbonation_check: Waves,
  note_only: NotebookPen,
};

function getActionCopy(action: HomeQuickLogAction["key"]) {
  return homeCopy.quickLog.actionCopy(action);
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
    () => batches.filter((batch) => activeAction?.eligibleBatchIds.includes(batch.id)),
    [activeAction, batches]
  );

  useEffect(() => {
    if (!requestedActionKey) return;
    setOpenActionKey(requestedActionKey);
    onRequestedActionHandled?.();
  }, [onRequestedActionHandled, requestedActionKey]);

  useEffect(() => {
    if (!activeAction) return;
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
            {homeCopy.quickLog.eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">{homeCopy.quickLog.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{homeCopy.quickLog.description}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
          <CameraOff className="h-3.5 w-3.5 text-copper" />
          {homeCopy.quickLog.photoComing}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = iconMap[action.key];
          const disabled = action.eligibleBatchIds.length === 0;

          return (
            <Button
              key={action.key}
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => setOpenActionKey(action.key)}
              className="h-auto justify-start gap-2 rounded-full px-4 py-2 text-left"
            >
              <Icon className="h-4 w-4" />
              <span>{action.label}</span>
            </Button>
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
                  <span className="text-sm text-muted-foreground">
                    {homeCopy.quickLog.whichBatch}
                  </span>
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
                    <span className="text-sm text-muted-foreground">
                      {homeCopy.quickLog.howDidItTaste}
                    </span>
                    <select
                      value={tasteImpression}
                      onChange={(event) => setTasteImpression(event.target.value as TasteTestImpression)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    >
                      <option value="">{homeCopy.quickLog.chooseOne}</option>
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
                    <span className="text-sm text-muted-foreground">
                      {homeCopy.quickLog.roomTemperature}
                    </span>
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
                      <span className="text-sm text-muted-foreground">
                        {homeCopy.quickLog.temperatureUnit}
                      </span>
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
                  {homeCopy.quickLog.close}
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
                  {saving ? homeCopy.quickLog.saving : activeCopy.saveLabel}
                </Button>
              </DrawerFooter>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </section>
  );
}
