import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { F1VesselCard } from "@/components/f1/F1VesselCard";
import type { FermentationVesselSummary } from "@/lib/f1-vessel-types";

type F1VesselPickerProps = {
  open: boolean;
  loading: boolean;
  vessels: FermentationVesselSummary[];
  onOpenChange: (open: boolean) => void;
  onSelect: (vessel: FermentationVesselSummary) => void;
  onManageLibrary: () => void;
};

export function F1VesselPicker({
  open,
  loading,
  vessels,
  onOpenChange,
  onSelect,
  onManageLibrary,
}: F1VesselPickerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Choose an F1 vessel</SheetTitle>
          <SheetDescription>
            Pick a saved vessel for this batch, or keep using a manual vessel if you are not ready to save one yet.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onManageLibrary}>
              Open vessel library
            </Button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Loading vessels...</p>
            </div>
          ) : vessels.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                You do not have any saved vessels yet. You can keep using a manual vessel in New Batch and save it later if it becomes a regular setup.
              </p>
            </div>
          ) : (
            vessels.map((vessel) => (
              <F1VesselCard
                key={vessel.id}
                vessel={vessel}
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
