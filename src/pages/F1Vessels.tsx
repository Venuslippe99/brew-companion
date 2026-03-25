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
import { useAuth } from "@/contexts/use-auth";
import { f1LibraryCopy } from "@/copy/f1-library";
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
      toast.error(
        error instanceof Error ? error.message : f1LibraryCopy.vessels.messages.loadErrorFallback
      );
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
      toast.error(f1LibraryCopy.vessels.messages.signInToSave);
      return;
    }

    setSavingVessel(true);

    try {
      await saveFermentationVessel({
        userId: user.id,
        draft: editorDraft,
        vesselId: editingVesselId || undefined,
      });

      toast.success(
        editingVesselId
          ? f1LibraryCopy.vessels.messages.updated
          : f1LibraryCopy.vessels.messages.saved
      );
      setEditorOpen(false);
      await loadVessels();
    } catch (error) {
      console.error("Save vessel error:", error);
      toast.error(
        error instanceof Error ? error.message : f1LibraryCopy.vessels.messages.saveErrorFallback
      );
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
      toast.error(
        recipeError?.message ||
          setupError?.message ||
          f1LibraryCopy.vessels.messages.usageCheckError
      );
      return;
    }

    if ((recipeCount || 0) > 0 || (setupCount || 0) > 0) {
      toast.error(f1LibraryCopy.vessels.messages.archiveInstead);
      return;
    }

    try {
      await deleteFermentationVessel(vessel.id);
      toast.success(f1LibraryCopy.vessels.messages.deleted);
      await loadVessels();
    } catch (error) {
      console.error("Delete vessel error:", error);
      toast.error(
        error instanceof Error ? error.message : f1LibraryCopy.vessels.messages.deleteErrorFallback
      );
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-10 pt-6 lg:px-8 lg:pt-10">
        <ScrollReveal>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground lg:text-3xl">
                {f1LibraryCopy.vessels.page.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {f1LibraryCopy.vessels.page.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate("/new-batch")}>
                {f1LibraryCopy.vessels.page.backToNewBatch}
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> {f1LibraryCopy.vessels.page.newVessel}
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
              {showArchived
                ? f1LibraryCopy.vessels.page.hideArchived
                : f1LibraryCopy.vessels.page.showArchived}
            </Button>
          </div>
        </ScrollReveal>

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">{f1LibraryCopy.vessels.page.loading}</p>
            </div>
          ) : visibleVessels.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {f1LibraryCopy.vessels.page.empty}
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
                      toast.error(f1LibraryCopy.vessels.messages.signInToDuplicate);
                      return;
                    }

                    try {
                      await duplicateFermentationVessel({
                        userId: user.id,
                        vessel: selected,
                      });
                      toast.success(f1LibraryCopy.vessels.messages.duplicated);
                      await loadVessels();
                    } catch (error) {
                      console.error("Duplicate vessel error:", error);
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : f1LibraryCopy.vessels.messages.duplicateErrorFallback
                      );
                    }
                  }}
                  onArchiveToggle={async (selected) => {
                    try {
                      await setFermentationVesselArchived({
                        vesselId: selected.id,
                        archived: !selected.archivedAt,
                      });
                      toast.success(
                        selected.archivedAt
                          ? f1LibraryCopy.vessels.messages.restored
                          : f1LibraryCopy.vessels.messages.archived
                      );
                      await loadVessels();
                    } catch (error) {
                      console.error("Archive vessel error:", error);
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : f1LibraryCopy.vessels.messages.archiveErrorFallback
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
                        selected.isFavorite
                          ? f1LibraryCopy.vessels.messages.removedFavorite
                          : f1LibraryCopy.vessels.messages.favorited
                      );
                      await loadVessels();
                    } catch (error) {
                      console.error("Favorite vessel error:", error);
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : f1LibraryCopy.vessels.messages.favoriteErrorFallback
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
            <DialogTitle>{f1LibraryCopy.vessels.dialogTitle(editingVesselId)}</DialogTitle>
            <DialogDescription>
              {f1LibraryCopy.vessels.dialog.description}
            </DialogDescription>
          </DialogHeader>

          <F1VesselEditor
            draft={editorDraft}
            saving={savingVessel}
            submitLabel={f1LibraryCopy.vessels.submitLabel(editingVesselId)}
            onChange={setEditorDraft}
            onSubmit={handleSave}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
