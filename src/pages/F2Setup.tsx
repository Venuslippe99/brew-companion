import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import F2SetupWizard from "@/components/f2/F2SetupWizard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { BatchStage, KombuchaBatch } from "@/lib/batches";

const ALLOWED_F2_STAGES: BatchStage[] = [
  "f2_setup",
  "f2_active",
  "refrigerate_now",
  "chilled_ready",
  "completed",
  "archived",
] as const;

export default function F2Setup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [batch, setBatch] = useState<KombuchaBatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBatch = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: batchRow, error } = await supabase
        .from("kombucha_batches")
        .select(`
          id,
          name,
          status,
          current_stage,
          brew_started_at,
          f2_started_at,
          f1_recipe_id,
          total_volume_ml,
          tea_type,
          tea_source_form,
          tea_amount_value,
          tea_amount_unit,
          sugar_g,
          sugar_type,
          starter_liquid_ml,
          scoby_present,
          avg_room_temp_c,
          vessel_type,
          target_preference,
          initial_ph,
          initial_notes,
          caution_level,
          readiness_window_start,
          readiness_window_end,
          next_action,
          completed_at,
          updated_at
        `)
        .eq("id", id)
        .single();

      if (error || !batchRow) {
        console.error("Load batch for F2 setup error:", error);
        setBatch(null);
        setLoading(false);
        return;
      }

      setBatch({
        id: batchRow.id,
        name: batchRow.name,
        status: batchRow.status,
        currentStage: batchRow.current_stage,
        brewStartedAt: batchRow.brew_started_at,
        f2StartedAt: batchRow.f2_started_at || undefined,
        f1RecipeId: batchRow.f1_recipe_id || undefined,
        totalVolumeMl: batchRow.total_volume_ml,
        teaType: batchRow.tea_type,
        teaSourceForm: batchRow.tea_source_form || undefined,
        teaAmountValue:
          batchRow.tea_amount_value !== null ? Number(batchRow.tea_amount_value) : undefined,
        teaAmountUnit: batchRow.tea_amount_unit || undefined,
        sugarG: Number(batchRow.sugar_g),
        sugarType: batchRow.sugar_type || undefined,
        starterLiquidMl: Number(batchRow.starter_liquid_ml),
        scobyPresent: batchRow.scoby_present,
        avgRoomTempC: Number(batchRow.avg_room_temp_c),
        vesselType: batchRow.vessel_type || "Glass jar",
        targetPreference: batchRow.target_preference || "balanced",
        initialPh: batchRow.initial_ph ? Number(batchRow.initial_ph) : undefined,
        initialNotes: batchRow.initial_notes || undefined,
        cautionLevel:
          batchRow.caution_level === "elevated" ? "high" : batchRow.caution_level,
        readinessWindowStart: batchRow.readiness_window_start || undefined,
        readinessWindowEnd: batchRow.readiness_window_end || undefined,
        nextAction: batchRow.next_action || undefined,
        completedAt: batchRow.completed_at || undefined,
        updatedAt: batchRow.updated_at,
      });
      setLoading(false);
    };

    void loadBatch();
  }, [id]);

  if (loading) {
    return (
      <AppLayout shell={{ title: "F2 Setup", subtitle: "Loading bottling setup..." }}>
        <div className="mx-auto max-w-3xl px-4 pt-20 text-center">
          <p className="text-muted-foreground">Loading bottling setup...</p>
        </div>
      </AppLayout>
    );
  }

  if (!batch) {
    return (
      <AppLayout shell={{ title: "F2 Setup", subtitle: "Batch not found." }}>
        <div className="mx-auto max-w-3xl px-4 pt-20 text-center">
          <p className="text-muted-foreground">Batch not found.</p>
          <Button className="mt-4" onClick={() => navigate("/batches")}>
            Back to batches
          </Button>
        </div>
      </AppLayout>
    );
  }

  const canOpenF2Chapter = ALLOWED_F2_STAGES.includes(batch.currentStage);

  return (
    <AppLayout
      shell={{
        title: batch.name,
        subtitle: "Second Fermentation",
      }}
    >
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-10 pt-2 lg:px-8 lg:pt-4">
        <div className="rounded-[32px] border border-border bg-gradient-to-br from-background via-card to-muted/60 p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Second Fermentation
              </p>
              <div>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Build bottle groups, assign different flavour plans within the same
                  F1 batch, and save one clear bottling chapter for this brew.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-background/80 p-4 text-sm shadow-sm">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Batch
              </p>
              <p className="mt-2 font-semibold text-foreground">{batch.name}</p>
              <p className="mt-1 text-muted-foreground">
                {(batch.totalVolumeMl / 1000).toFixed(1)}L base batch
              </p>
            </div>
          </div>
        </div>

        {!canOpenF2Chapter ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-lg font-semibold text-foreground">
              Move this batch into Second Fermentation first
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Open this chapter from the batch overview once the brew is ready to
              leave F1.
            </p>
            <Button className="mt-4" onClick={() => navigate(`/batch/${batch.id}`)}>
              Back to batch
            </Button>
          </div>
        ) : (
          <F2SetupWizard
            batch={batch}
            userId={user?.id}
            onF2Started={({ f2StartedAt, nextAction }) => {
              setBatch((current) =>
                current
                  ? {
                      ...current,
                      currentStage: "f2_active",
                      f2StartedAt,
                      nextAction,
                      updatedAt: f2StartedAt,
                    }
                  : current
              );
            }}
            onBatchStateChanged={({ currentStage, updatedAt, nextAction, status, completedAt }) => {
              setBatch((current) =>
                current
                  ? {
                      ...current,
                      currentStage,
                      nextAction,
                      status,
                      completedAt,
                      updatedAt,
                    }
                  : current
              );
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
