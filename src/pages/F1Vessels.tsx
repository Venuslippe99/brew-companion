import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { F1VesselCard } from "@/components/f1/F1VesselCard";
import { F1VesselEditor } from "@/components/f1/F1VesselEditor";
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
  deleteFermentationVessel,
  duplicateFermentationVessel,
  loadFermentationVessels,
  saveFermentationVessel,
  setFermentationVesselArchived,
  setFermentationVesselFavorite,
} from "@/lib/f1-vessels";
import {
  createEmptyFermentationVesselDraft,
  type FermentationVesselDraft,
  type FermentationVesselSummary,
} from "@/lib/f1-vessel-types";

export default function F1Vessels() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [vessels, setVessels] = useState<FermentationVesselSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<FermentationVesselDraft>(
    createEmptyFermentationVesselDraft()
  );
  const [editingVesselId, setEditingVesselId] = useState<string | null>(null);
  const [savingVessel, setSavingVessel] = useState(false);

  const visibleVessels = useMemo(
    () => vessels.filter((vessel) => showArchived || !vessel.archivedAt),
    [showArchived, vessels]
  );

  const loadVessels = async () => {
    setLoading(true);

    try {
      const loaded = await loadFermentationVessels({ includeArchived: true });
      setVessels(loaded);
    } catch (error) {
      console.error("Load fermentation vessels error:", error);
      toast.error(error instanceof Error ? error.message : "Could not load vessels.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVessels();
  }, []);

  const openCreate = () => {
    setEditingVesselId(null);
    setEditorDraft(createEmptyFermentationVesselDraft());
    setEditorOpen(true);
  };

  const openEdit = (vessel: FermentationVesselSummary) => {
    setEditingVesselId(vessel.id);
    setEditorDraft({
      name: vessel.name,
      materialType: vessel.materialType,
      capacityMl: vessel.capacityMl,
      recommendedMaxFillMl: vessel.recommendedMaxFillMl,
      f1Suitability: vessel.f1Suitability,
      notes: vessel.notes || "",
      isFavorite: vessel.isFavorite,
    });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("You need to be signed in to save vessels.");
      return;
    }

    setSavingVessel(true);

    try {
      await saveFermentationVessel({
        userId: user.id,
        draft: editorDraft,
        vesselId: editingVesselId || undefined,
      });

      toast.success(editingVesselId ? "Vessel updated." : "Vessel saved.");
      setEditorOpen(false);
      await loadVessels();
    } catch (error) {
      console.error("Save vessel error:", error);
      toast.error(error instanceof Error ? error.message : "Could not save vessel.");
    } finally {
      setSavingVessel(false);
    }
  };

  const handleDelete = async (vessel: FermentationVesselSummary) => {
    const [{ count: recipeCount, error: recipeError }, { count: setupCount, error: setupError }] =
      await Promise.all([
        supabase
          .from("f1_recipes")
          .select("id", { count: "exact", head: true })
          .eq("preferred_vessel_id", vessel.id),
        supabase
          .from("batch_f1_setups")
          .select("id", { count: "exact", head: true })
          .eq("selected_vessel_id", vessel.id),
      ]);

    if (recipeError || setupError) {
      toast.error(recipeError?.message || setupError?.message || "Could not check vessel usage.");
      return;
    }

    if ((recipeCount || 0) > 0 || (setupCount || 0) > 0) {
      toast.error("Archive this vessel instead. It is already linked to recipes or saved batches.");
      return;
    }

    try {
      await deleteFermentationVessel(vessel.id);
      toast.success("Vessel deleted.");
      await loadVessels();
    } catch (error) {
      console.error("Delete vessel error:", error);
      toast.error(error instanceof Error ? error.message : "Could not delete vessel.");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-10 pt-6 lg:px-8 lg:pt-10">
        <ScrollReveal>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground lg:text-3xl">
                F1 Vessels
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Save the fermentation vessels you actually use for F1 so recipes and new batches can start from a real container, not just a generic label.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate("/new-batch")}>
                Back to New Batch
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> New vessel
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
              <p className="text-sm text-muted-foreground">Loading vessels...</p>
            </div>
          ) : visibleVessels.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No vessels to show yet. Add one here or keep using a manual vessel in New Batch.
              </p>
            </div>
          ) : (
            visibleVessels.map((vessel, index) => (
              <ScrollReveal key={vessel.id} delay={index * 0.04}>
                <F1VesselCard
                  vessel={vessel}
                  onEdit={openEdit}
                  onDuplicate={async (selected) => {
                    if (!user?.id) {
                      toast.error("You need to be signed in to duplicate vessels.");
                      return;
                    }

                    try {
                      await duplicateFermentationVessel({
                        userId: user.id,
                        vessel: selected,
                      });
                      toast.success("Vessel duplicated.");
                      await loadVessels();
                    } catch (error) {
                      console.error("Duplicate vessel error:", error);
                      toast.error(
                        error instanceof Error ? error.message : "Could not duplicate vessel."
                      );
                    }
                  }}
                  onArchiveToggle={async (selected) => {
                    try {
                      await setFermentationVesselArchived({
                        vesselId: selected.id,
                        archived: !selected.archivedAt,
                      });
                      toast.success(selected.archivedAt ? "Vessel restored." : "Vessel archived.");
                      await loadVessels();
                    } catch (error) {
                      console.error("Archive vessel error:", error);
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Could not update the vessel archive state."
                      );
                    }
                  }}
                  onFavoriteToggle={async (selected) => {
                    try {
                      await setFermentationVesselFavorite({
                        vesselId: selected.id,
                        isFavorite: !selected.isFavorite,
                      });
                      toast.success(
                        selected.isFavorite ? "Vessel removed from favorites." : "Vessel favorited."
                      );
                      await loadVessels();
                    } catch (error) {
                      console.error("Favorite vessel error:", error);
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
            <DialogTitle>{editingVesselId ? "Edit F1 vessel" : "Create F1 vessel"}</DialogTitle>
            <DialogDescription>
              Save reusable fermentation vessel details here. New Batch can still fall back to manual vessel details when needed.
            </DialogDescription>
          </DialogHeader>

          <F1VesselEditor
            draft={editorDraft}
            saving={savingVessel}
            submitLabel={editingVesselId ? "Save vessel changes" : "Save vessel"}
            onChange={setEditorDraft}
            onSubmit={handleSave}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
