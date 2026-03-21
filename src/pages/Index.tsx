import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { type KombuchaBatch } from "@/lib/batches";
import { BatchCard } from "@/components/batches/BatchCard";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  FlaskConical,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Droplets,
  Thermometer,
  TestTube2,
  Camera,
  StickyNote,
  Settings
} from "lucide-react";

type DashboardReminder = {
  id: string;
  batchId: string;
  batchName: string;
  title: string;
  description: string | null;
  dueAt: string;
  isCompleted: boolean;
  urgencyLevel: "low" | "medium" | "high" | "overdue";
  reminderType: string;
};

function UrgentReminders({ reminders }: { reminders: DashboardReminder[] }) {
  const urgentReminders = reminders
    .filter((r) => !r.isCompleted)
    .sort((a, b) => {
      const order = { overdue: 0, high: 1, medium: 2, low: 3 };
      return order[a.urgencyLevel] - order[b.urgencyLevel];
    });

  if (urgentReminders.length === 0) return null;

  return (
    <ScrollReveal>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Needs Attention
        </h2>
        <div className="space-y-2">
          {urgentReminders.map((r) => {
            const isOverdue = r.urgencyLevel === "overdue";
            return (
              <div
                key={r.id}
                className={`rounded-xl p-4 border transition-all ${
                  isOverdue
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-caution-bg border-caution/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${isOverdue ? "text-destructive" : "text-caution"}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isOverdue ? "text-destructive" : "text-caution-foreground"}`}>
                      {r.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.batchName}</p>
                  </div>
                  {isOverdue && (
                    <span className="text-[10px] font-semibold text-destructive uppercase tracking-wider">
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </ScrollReveal>
  );
}

function SummaryStats({ batches, reminders }: { batches: KombuchaBatch[]; reminders: DashboardReminder[] }) {
  const activeBatches = batches.filter((b) => b.status === "active");
  const readySoon = activeBatches.filter((b) => b.currentStage === "f1_check_window" || b.currentStage === "chilled_ready");
  const overdue = reminders.filter((r) => r.urgencyLevel === "overdue" && !r.isCompleted);
  const completed = batches.filter((b) => b.status === "completed");

  const stats = [
    { label: "Active", value: activeBatches.length, icon: FlaskConical },
    { label: "Ready Soon", value: readySoon.length, icon: Clock },
    { label: "Overdue", value: overdue.length, icon: AlertTriangle },
    { label: "Completed", value: completed.length, icon: CheckCircle2 },
  ];

  return (
    <ScrollReveal delay={0.1}>
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <s.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xl font-display font-semibold text-foreground tabular-nums">{s.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
          </div>
        ))}
      </div>
    </ScrollReveal>
  );
}

function QuickActions() {
  const actions = [
    { label: "Taste Test", icon: Droplets },
    { label: "Temp Check", icon: Thermometer },
    { label: "pH Check", icon: TestTube2 },
    { label: "Add Photo", icon: Camera },
    { label: "Add Note", icon: StickyNote },
  ];

  return (
    <ScrollReveal delay={0.15}>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Quick Log</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {actions.map((a) => (
            <button
              key={a.label}
              className="flex flex-col items-center gap-1.5 px-4 py-3 bg-card border border-border rounded-xl hover:bg-muted transition-colors active:scale-95 shrink-0"
            >
              <a.icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium text-foreground whitespace-nowrap">{a.label}</span>
            </button>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

export default function Dashboard() {
  const { preferences } = useUser();
  const navigate = useNavigate();

  const [batches, setBatches] = useState<KombuchaBatch[]>([]);
  const [reminders, setReminders] = useState<DashboardReminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      const { data: batchRows, error: batchError } = await supabase
        .from("kombucha_batches")
        .select(`
          id,
          name,
          status,
          current_stage,
          brew_started_at,
          total_volume_ml,
          tea_type,
          sugar_g,
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
          completed_at,
          updated_at
        `)
        .order("updated_at", { ascending: false });

      if (batchError) {
        console.error("Load dashboard batches error:", batchError);
        alert(batchError.message);
        setLoading(false);
        return;
      }

      const mappedBatches: KombuchaBatch[] = (batchRows || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        currentStage: row.current_stage,
        brewStartedAt: row.brew_started_at,
        totalVolumeMl: row.total_volume_ml,
        teaType: row.tea_type,
        sugarG: Number(row.sugar_g),
        starterLiquidMl: Number(row.starter_liquid_ml),
        scobyPresent: row.scoby_present,
        avgRoomTempC: Number(row.avg_room_temp_c),
        vesselType: row.vessel_type || "Glass jar",
        targetPreference: row.target_preference || "balanced",
        initialPh: row.initial_ph ? Number(row.initial_ph) : undefined,
        initialNotes: row.initial_notes || undefined,
        cautionLevel: row.caution_level === "elevated" ? "high" : row.caution_level,
        readinessWindowStart: row.readiness_window_start || undefined,
        readinessWindowEnd: row.readiness_window_end || undefined,
        completedAt: row.completed_at || undefined,
        updatedAt: row.updated_at,
      }));

      setBatches(mappedBatches);

      const { data: reminderRows, error: reminderError } = await supabase
        .from("batch_reminders")
        .select(`
          id,
          batch_id,
          title,
          description,
          due_at,
          is_completed,
          urgency_level,
          reminder_type,
          kombucha_batches(name)
        `)
        .eq("is_completed", false)
        .order("due_at", { ascending: true });

      if (reminderError) {
        console.error("Load dashboard reminders error:", reminderError);
      } else {
        const now = new Date();

        const mappedReminders: DashboardReminder[] = (reminderRows || []).map((row: any) => ({
          id: row.id,
          batchId: row.batch_id,
          batchName: row.kombucha_batches?.name || "Unknown batch",
          title: row.title,
          description: row.description,
          dueAt: row.due_at,
          isCompleted: row.is_completed,
          urgencyLevel:
            !row.is_completed && new Date(row.due_at) < now
              ? "overdue"
              : row.urgency_level === "critical"
              ? "high"
              : row.urgency_level,
          reminderType: row.reminder_type,
        }));

        setReminders(mappedReminders);
      }

      setLoading(false);
    };

    loadDashboard();
  }, []);

  const activeBatches = batches.filter((b) => b.status === "active");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-6 lg:pt-10 lg:px-8 space-y-6">
        <ScrollReveal>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground leading-tight">
                {greeting()}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeBatches.length} active {activeBatches.length === 1 ? "brew" : "brews"}
              </p>
            </div>
            <button
              onClick={() => navigate("/settings")}
              className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>
          </div>
        </ScrollReveal>

        <UrgentReminders reminders={reminders} />
        <SummaryStats batches={batches} reminders={reminders} />

        <ScrollReveal delay={0.08}>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Active Batches</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/batches")}>
                View all
              </Button>
            </div>

            {loading ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <p className="text-sm text-muted-foreground">Loading dashboard...</p>
              </div>
            ) : activeBatches.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <FlaskConical className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="font-display text-lg font-medium text-foreground mb-1">No active batches</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start tracking your first kombucha brew
                </p>
                <Button onClick={() => navigate("/new-batch")}>
                  <Plus className="h-4 w-4" /> Start First Batch
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeBatches.map((batch) => (
                  <BatchCard key={batch.id} batch={batch} />
                ))}
              </div>
            )}
          </section>
        </ScrollReveal>

        <QuickActions />

        {preferences.experienceLevel === "beginner" && (
          <ScrollReveal delay={0.2}>
            <section className="bg-honey-light border border-primary/10 rounded-xl p-5">
              <h3 className="font-display text-base font-semibold text-foreground mb-1">New to kombucha?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Browse our guides to learn the basics before your first brew.
              </p>
              <Button variant="warm" size="sm" onClick={() => navigate("/guides")}>
                Browse Guides
              </Button>
            </section>
          </ScrollReveal>
        )}
      </div>
    </AppLayout>
  );
}
