import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  ThermometerSnowflake,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type {
  TroubleshootingResult,
  TroubleshootingSeverity,
} from "@/lib/troubleshooting/types";

const severityMeta: Record<
  TroubleshootingSeverity,
  {
    label: string;
    className: string;
    icon: typeof CheckCircle2;
  }
> = {
  likely_normal: {
    label: "Likely normal",
    className: "bg-primary/10 text-primary",
    icon: CheckCircle2,
  },
  monitor_check_soon: {
    label: "Monitor / check soon",
    className: "bg-muted text-foreground",
    icon: AlertTriangle,
  },
  caution: {
    label: "Caution",
    className: "bg-caution-bg text-caution-foreground",
    icon: ShieldAlert,
  },
  urgent_action: {
    label: "Urgent action",
    className: "bg-destructive/10 text-destructive",
    icon: ThermometerSnowflake,
  },
  discard_unsafe: {
    label: "Discard / unsafe to continue",
    className: "bg-destructive/10 text-destructive",
    icon: Trash2,
  },
};

type Props = {
  result: TroubleshootingResult;
  onReset: () => void;
};

export function TroubleshootingResultCard({ result, onReset }: Props) {
  const navigate = useNavigate();
  const meta = severityMeta[result.severity];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
          >
            <meta.icon className="h-3.5 w-3.5" />
            {meta.label}
          </p>
          <h2 className="mt-3 text-xl font-semibold text-foreground">{result.headline}</h2>
        </div>

        <Button variant="ghost" size="sm" onClick={onReset}>
          Start over
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What this probably means
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {result.interpretation}
          </p>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Why the app thinks this
          </h3>
          <div className="mt-2 space-y-2">
            {result.whyTheAppThinksThis.map((reason) => (
              <p key={reason} className="text-sm leading-relaxed text-foreground">
                {reason}
              </p>
            ))}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What to do now
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {result.immediateAction}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What to watch next
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {result.nextCheck}
            </p>
          </section>
        </div>

        <section className="rounded-xl border border-border bg-muted/40 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Uncertainty note
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {result.uncertaintyNote}
          </p>
        </section>

        {result.escalationNote ? (
          <section className="rounded-xl border border-caution/20 bg-caution-bg p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-caution-foreground">
              Escalation note
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-caution-foreground">
              {result.escalationNote}
            </p>
          </section>
        ) : null}
      </div>

      {result.relatedBatchAction ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {result.relatedBatchAction.href ? (
            <Button onClick={() => navigate(result.relatedBatchAction.href || "/batches")}>
              {result.relatedBatchAction.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button>{result.relatedBatchAction.label}</Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
