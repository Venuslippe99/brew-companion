import { ScrollReveal } from "@/components/common/ScrollReveal";
import type { KombuchaBatch } from "@/lib/batches";
import { getJourneySteps } from "@/lib/batch-detail-view";

export function BatchJourneyStrip({ batch }: { batch: KombuchaBatch }) {
  const steps = getJourneySteps(batch);

  return (
    <ScrollReveal delay={0.03}>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Brewing Journey
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Follow the current chapter and keep earlier steps tucked away once they are done.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {steps.map((step) => (
            <div key={step.chapter} className="space-y-2">
              <div
                className={`h-2 rounded-full ${
                  step.isCurrent
                    ? "bg-primary"
                    : step.isComplete
                      ? "bg-primary/40"
                      : "bg-border"
                }`}
              />
              <div>
                <p
                  className={`text-sm font-medium ${
                    step.isCurrent ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {step.isCurrent
                    ? "Current chapter"
                    : step.isComplete
                      ? "Already reached"
                      : "Coming later"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}
