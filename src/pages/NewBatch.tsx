import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FlaskConical, ChevronDown, ChevronUp } from "lucide-react";

const teaTypes = ["Black tea", "Green tea", "Oolong tea", "White tea", "Black & green blend", "Green & white blend"];
const vesselTypes = ["Glass jar", "Ceramic crock", "Food-grade plastic"];
const preferences = ["sweeter", "balanced", "tart"] as const;

type NewBatchForm = {
  name: string;
  brewDate: string;
  totalVolumeMl: number;
  teaType: string;
  sugarG: number;
  starterLiquidMl: number;
  scobyPresent: boolean;
  avgRoomTempC: number;
  vesselType: string;
  targetPreference: (typeof preferences)[number];
  initialPh: string;
  initialNotes: string;
};

export default function NewBatch() {
  const navigate = useNavigate();
  const { isBeginner } = useUser();
  const { user } = useAuth();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<NewBatchForm>({
    name: "",
    brewDate: new Date().toISOString().split("T")[0],
    totalVolumeMl: 3800,
    teaType: "Black tea",
    sugarG: 200,
    starterLiquidMl: 380,
    scobyPresent: true,
    avgRoomTempC: 23,
    vesselType: "Glass jar",
    targetPreference: "balanced" as typeof preferences[number],
    initialPh: "",
    initialNotes: "",
  });

  const update = <K extends keyof NewBatchForm>(key: K, value: NewBatchForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleCreate = async () => {
    if (!user) {
      alert("You must be logged in to create a batch.");
      return;
    }

    if (!form.name.trim()) {
      alert("Please enter a batch name.");
      return;
    }

    if (!form.brewDate) {
      alert("Please select a brew date.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("kombucha_batches")
      .insert({
        user_id: user.id,
        name: form.name.trim(),
        status: "active",
        current_stage: "f1_active",
        brew_started_at: new Date(`${form.brewDate}T12:00:00`).toISOString(),
        total_volume_ml: form.totalVolumeMl,
        tea_type: form.teaType,
        sugar_g: form.sugarG,
        starter_liquid_ml: form.starterLiquidMl,
        scoby_present: form.scobyPresent,
        avg_room_temp_c: form.avgRoomTempC,
        vessel_type: form.vesselType,
        target_preference: form.targetPreference,
        initial_ph: form.initialPh ? Number(form.initialPh) : null,
        initial_notes: form.initialNotes.trim() || null,
      });

    setIsSaving(false);

    if (error) {
      console.error("Create batch error:", error);
      alert(error.message);
      return;
    }

    navigate("/batches");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-6 lg:pt-10 lg:px-8 space-y-6 pb-8">
        <ScrollReveal>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground">New Batch</h1>
              <p className="text-sm text-muted-foreground">Kombucha — First Fermentation</p>
            </div>
          </div>
        </ScrollReveal>

        {isBeginner && (
          <ScrollReveal delay={0.05}>
            <div className="bg-honey-light border border-primary/10 rounded-xl p-4">
              <p className="text-sm text-foreground">
                Fill in what you know — the more detail you add, the better your readiness estimates will be.
                Required fields are marked with *.
              </p>
            </div>
          </ScrollReveal>
        )}

        <ScrollReveal delay={0.08}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Batch Name *</label>
              <input
                type="text"
                placeholder="e.g. Morning Sun Blend"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Brew Date *</label>
                <input
                  type="date"
                  value={form.brewDate}
                  onChange={(e) => update("brewDate", e.target.value)}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Volume (ml) *</label>
                <input
                  type="number"
                  value={form.totalVolumeMl}
                  onChange={(e) => update("totalVolumeMl", Number(e.target.value))}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Tea Type *</label>
              <select
                value={form.teaType}
                onChange={(e) => update("teaType", e.target.value)}
                className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
              >
                {teaTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Sugar (g) *</label>
                <input
                  type="number"
                  value={form.sugarG}
                  onChange={(e) => update("sugarG", Number(e.target.value))}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Starter (ml) *</label>
                <input
                  type="number"
                  value={form.starterLiquidMl}
                  onChange={(e) => update("starterLiquidMl", Number(e.target.value))}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Average Room Temperature (°C) *</label>
              <input
                type="number"
                step="0.5"
                value={form.avgRoomTempC}
                onChange={(e) => update("avgRoomTempC", Number(e.target.value))}
                className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
              />
              {isBeginner && (
                <p className="text-xs text-muted-foreground mt-1">Room temperature significantly affects fermentation speed. Warmer = faster.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Vessel Type</label>
                <select
                  value={form.vesselType}
                  onChange={(e) => update("vesselType", e.target.value)}
                  className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                >
                  {vesselTypes.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">SCOBY Present</label>
                <div className="flex gap-2 mt-1">
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => update("scobyPresent", val)}
                      className={`flex-1 h-11 rounded-lg text-sm font-medium transition-all ${
                        form.scobyPresent === val
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {val ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Taste Target</label>
              <div className="grid grid-cols-3 gap-2">
                {preferences.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => update("targetPreference", p)}
                    className={`h-11 rounded-lg text-sm font-medium capitalize transition-all ${
                      form.targetPreference === p
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Advanced options
            </button>

            {showAdvanced && (
              <div className="space-y-4 animate-slide-up">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Initial pH</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 4.2"
                    value={form.initialPh}
                    onChange={(e) => update("initialPh", e.target.value)}
                    className="w-full h-11 px-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Any observations about the setup..."
                    value={form.initialNotes}
                    onChange={(e) => update("initialNotes", e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>
            )}

            <Button
              size="xl"
              className="w-full"
              disabled={!form.name || !form.brewDate || isSaving}
              onClick={handleCreate}
            >
              {isSaving ? "Creating..." : "Create Batch"}
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </AppLayout>
  );
}
