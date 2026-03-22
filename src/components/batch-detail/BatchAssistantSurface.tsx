import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import type { KombuchaBatch } from "@/lib/batches";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";

export function BatchAssistantSurface({ batch }: { batch: KombuchaBatch }) {
  const navigate = useNavigate();

  const issueLinks = [
    { id: "not_sure_if_ready", label: "Not sure if ready" },
    { id: "too_sweet_or_not_fermenting", label: "Too sweet or not fermenting enough" },
    { id: "too_much_carbonation", label: "Too much carbonation" },
    { id: "strange_strands_or_sediment", label: "Strange strands or sediment" },
    { id: "mold_concern", label: "Mold concern" },
  ];

  return (
    <div className="space-y-4">
      <ScrollReveal>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Troubleshoot this batch
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open the assistant with this batch attached so the guidance can stay grounded in the current stage, timing, next action, and saved Second Fermentation context.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate(`/assistant?batchId=${batch.id}`)}>
                  Open assistant
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(`/assistant?batchId=${batch.id}&issue=not_sure_if_ready`)
                  }
                >
                  Check readiness
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.04}>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-caution" />
            <div className="w-full">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Common issue shortcuts
              </h3>
              <div className="mt-3 space-y-2">
                {issueLinks.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => navigate(`/assistant?batchId=${batch.id}&issue=${issue.id}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <span>{issue.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
