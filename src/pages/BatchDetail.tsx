import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { mockBatches, mockReminders, getDayNumber, getStageLabel, getNextAction } from "@/lib/mock-data";
import { StageIndicator, CautionBadge } from "@/components/common/StageIndicator";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Thermometer, Droplets, Clock, TestTube2, Camera, StickyNote, MessageCircle, BookOpen, FlaskConical, ChevronRight } from "lucide-react";

const detailTabs = ["Overview", "Timeline", "Logs", "F2 & Bottles", "Photos", "Notes", "Guide", "Assistant"];

function OverviewTab({ batch }: { batch: typeof mockBatches[0] }) {
  const dayNum = getDayNumber(batch.brewStartedAt);
  const reminders = mockReminders.filter((r) => r.batchId === batch.id && !r.isCompleted);

  return (
    <div className="space-y-5">
      {/* Stage Progress */}
      <ScrollReveal>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Stage Progress</h3>
          <div className="flex items-center gap-1">
            {["F1", "Check", "F2", "Chill", "Done"].map((label, i) => {
              const stageIndex = ["f1_active", "f1_check_window", "f2_active", "refrigerate_now", "completed"].indexOf(batch.currentStage);
              const isCompleted = i <= stageIndex;
              const isCurrent = i === stageIndex;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className={`h-1.5 w-full rounded-full transition-colors ${
                      isCompleted ? "bg-primary" : "bg-border"
                    } ${isCurrent ? "animate-pulse-gentle" : ""}`}
                  />
                  <span className={`text-[10px] font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      {/* Next Action */}
      <ScrollReveal delay={0.05}>
        <div className="bg-honey-light border border-primary/10 rounded-xl p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Next Action</p>
          <p className="text-sm font-medium text-foreground">{getNextAction(batch)}</p>
        </div>
      </ScrollReveal>

      {/* Reminders */}
      {reminders.length > 0 && (
        <ScrollReveal delay={0.08}>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Reminders</h3>
            {reminders.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                </div>
                <Button size="sm" variant="outline">Done</Button>
              </div>
            ))}
          </div>
        </ScrollReveal>
      )}

      {/* Recipe Summary */}
      <ScrollReveal delay={0.1}>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Recipe</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Tea", batch.teaType],
              ["Sugar", `${batch.sugarG}g`],
              ["Starter", `${batch.starterLiquidMl}ml`],
              ["Volume", `${(batch.totalVolumeMl / 1000).toFixed(1)}L`],
              ["Vessel", batch.vesselType],
              ["SCOBY", batch.scobyPresent ? "Yes" : "No"],
              ["Room Temp", `${batch.avgRoomTempC}°C`],
              ["Target", batch.targetPreference],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium text-foreground capitalize">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

function TimelineTab() {
  const events = [
    { date: "Today", items: [{ time: "10:30 AM", label: "Temperature logged: 23°C", icon: Thermometer }] },
    { date: "Yesterday", items: [
      { time: "3:00 PM", label: "Taste test — still quite sweet", icon: Droplets },
      { time: "9:00 AM", label: "Visual check — SCOBY forming nicely", icon: FlaskConical },
    ]},
    { date: "3 days ago", items: [
      { time: "2:00 PM", label: "Batch created — F1 started", icon: Clock },
    ]},
  ];

  return (
    <div className="space-y-6">
      {events.map((group) => (
        <ScrollReveal key={group.date}>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group.date}</h3>
            <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-border">
              {group.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-start pl-1">
                  <div className="h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center shrink-0 z-10">
                    <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <ScrollReveal>
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-base font-display font-medium text-foreground mb-1">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </ScrollReveal>
  );
}

export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");

  const batch = mockBatches.find((b) => b.id === id);
  if (!batch) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 pt-20 text-center">
          <p className="text-muted-foreground">Batch not found</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/batches")}>Back to batches</Button>
        </div>
      </AppLayout>
    );
  }

  const dayNum = getDayNumber(batch.brewStartedAt);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-4 lg:pt-8 lg:px-8 space-y-5 pb-8">
        {/* Back button */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Header Card */}
        <ScrollReveal>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-display text-xl lg:text-2xl font-semibold text-foreground">{batch.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <StageIndicator stage={batch.currentStage} size="md" />
                  <CautionBadge level={batch.cautionLevel} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-display font-bold text-foreground tabular-nums">{dayNum}</span>
                <span className="block text-xs text-muted-foreground">{dayNum === 1 ? "day" : "days"}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
              <div className="text-center">
                <Thermometer className="h-4 w-4 mx-auto text-muted-foreground mb-0.5" />
                <p className="text-sm font-semibold text-foreground tabular-nums">{batch.avgRoomTempC}°C</p>
                <p className="text-[10px] text-muted-foreground">Room Temp</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{batch.teaType.split(" ")[0]}</p>
                <p className="text-[10px] text-muted-foreground">Tea</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground capitalize">{batch.targetPreference}</p>
                <p className="text-[10px] text-muted-foreground">Target</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Tabs */}
        <ScrollReveal delay={0.05}>
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {detailTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === "Overview" && <OverviewTab batch={batch} />}
          {activeTab === "Timeline" && <TimelineTab />}
          {activeTab === "Logs" && <PlaceholderTab title="Logs" description="Structured action history will appear here. Add taste tests, temperature readings, and more." />}
          {activeTab === "F2 & Bottles" && <PlaceholderTab title="F2 & Bottles" description="Set up your second fermentation here once F1 is ready. Configure bottles, flavourings, and carbonation targets." />}
          {activeTab === "Photos" && <PlaceholderTab title="Photos" description="Document your batch visually. Upload photos to track SCOBY growth, colour changes, and more." />}
          {activeTab === "Notes" && <PlaceholderTab title="Notes" description="Freeform notes for observations, reflections, and custom tracking." />}
          {activeTab === "Guide" && <PlaceholderTab title="Stage Guide" description="Context-aware tips for your current fermentation stage." />}
          {activeTab === "Assistant" && <PlaceholderTab title="Batch Assistant" description="AI-powered guidance based on this batch's data. Ask questions about your brew." />}
        </div>
      </div>
    </AppLayout>
  );
}
