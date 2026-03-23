import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type {
  FermentationVessel,
  FermentationVesselDraft,
  FermentationVesselSummary,
} from "@/lib/f1-vessel-types";

function mapVesselRow(row: Tables<"fermentation_vessels">): FermentationVessel {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    materialType: row.material_type,
    capacityMl: row.capacity_ml,
    recommendedMaxFillMl: row.recommended_max_fill_ml,
    f1Suitability: row.f1_suitability,
    notes: row.notes || "",
    isFavorite: row.is_favorite,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toVesselInsert(
  userId: string,
  draft: FermentationVesselDraft
): TablesInsert<"fermentation_vessels"> {
  return {
    user_id: userId,
    name: draft.name.trim(),
    material_type: draft.materialType,
    capacity_ml: draft.capacityMl,
    recommended_max_fill_ml: draft.recommendedMaxFillMl,
    f1_suitability: draft.f1Suitability,
    notes: draft.notes.trim() || null,
    is_favorite: draft.isFavorite,
  };
}

function toVesselUpdate(
  draft: FermentationVesselDraft
): TablesUpdate<"fermentation_vessels"> {
  return {
    name: draft.name.trim(),
    material_type: draft.materialType,
    capacity_ml: draft.capacityMl,
    recommended_max_fill_ml: draft.recommendedMaxFillMl,
    f1_suitability: draft.f1Suitability,
    notes: draft.notes.trim() || null,
    is_favorite: draft.isFavorite,
  };
}

export async function loadFermentationVessels(args: {
  includeArchived?: boolean;
} = {}): Promise<FermentationVesselSummary[]> {
  const query = supabase
    .from("fermentation_vessels")
    .select("*")
    .order("is_favorite", { ascending: false })
    .order("updated_at", { ascending: false });

  if (!args.includeArchived) {
    query.is("archived_at", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Could not load fermentation vessels: ${error.message}`);
  }

  return (data || []).map(mapVesselRow);
}

export async function saveFermentationVessel(args: {
  userId: string;
  draft: FermentationVesselDraft;
  vesselId?: string;
}): Promise<FermentationVessel> {
  if (!args.draft.name.trim()) {
    throw new Error("Vessel name is required.");
  }

  if (!args.draft.capacityMl || args.draft.capacityMl <= 0) {
    throw new Error("Vessel capacity must be greater than zero.");
  }

  if (
    args.draft.recommendedMaxFillMl &&
    args.draft.recommendedMaxFillMl > args.draft.capacityMl
  ) {
    throw new Error("Recommended max fill cannot be greater than total vessel capacity.");
  }

  if (args.vesselId) {
    const { data, error } = await supabase
      .from("fermentation_vessels")
      .update(toVesselUpdate(args.draft))
      .eq("id", args.vesselId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Could not update vessel: ${error?.message || "unknown error"}`);
    }

    return mapVesselRow(data);
  }

  const { data, error } = await supabase
    .from("fermentation_vessels")
    .insert(toVesselInsert(args.userId, args.draft))
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Could not save vessel: ${error?.message || "unknown error"}`);
  }

  return mapVesselRow(data);
}

export async function duplicateFermentationVessel(args: {
  userId: string;
  vessel: FermentationVesselSummary;
}): Promise<FermentationVessel> {
  const duplicatedDraft: FermentationVesselDraft = {
    name: `${args.vessel.name} Copy`,
    materialType: args.vessel.materialType,
    capacityMl: args.vessel.capacityMl,
    recommendedMaxFillMl: args.vessel.recommendedMaxFillMl,
    f1Suitability: args.vessel.f1Suitability,
    notes: args.vessel.notes,
    isFavorite: false,
  };

  return saveFermentationVessel({
    userId: args.userId,
    draft: duplicatedDraft,
  });
}

export async function setFermentationVesselArchived(args: {
  vesselId: string;
  archived: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("fermentation_vessels")
    .update({
      archived_at: args.archived ? new Date().toISOString() : null,
    })
    .eq("id", args.vesselId);

  if (error) {
    throw new Error(`Could not update vessel archive state: ${error.message}`);
  }
}

export async function setFermentationVesselFavorite(args: {
  vesselId: string;
  isFavorite: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("fermentation_vessels")
    .update({
      is_favorite: args.isFavorite,
    })
    .eq("id", args.vesselId);

  if (error) {
    throw new Error(`Could not update vessel favorite state: ${error.message}`);
  }
}

export async function deleteFermentationVessel(vesselId: string): Promise<void> {
  const { error } = await supabase
    .from("fermentation_vessels")
    .delete()
    .eq("id", vesselId);

  if (error) {
    throw new Error(`Could not delete vessel: ${error.message}`);
  }
}
