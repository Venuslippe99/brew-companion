import { ArrowRight, BookOpen, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { HomeSupportContext } from "@/lib/home-command-center";

export function HomeSupportPanel({
  context,
}: {
  context: HomeSupportContext;
}) {
  const navigate = useNavigate();

  return (
    <section className="home-panel-surface overflow-hidden px-5 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
            {context.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
            {context.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{context.summary}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
          <button
            type="button"
            onClick={() => navigate(context.primaryAction.to)}
            className="rounded-[22px] border border-primary/15 bg-honey-light/60 p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
          >
            <BookOpen className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm font-semibold text-foreground">{context.primaryAction.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">Open the most relevant support path from here.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate((context.secondaryAction || context.primaryAction).to)}
            className="rounded-[22px] border border-border bg-background/90 p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
          >
            <MessageCircle className="h-5 w-5 text-copper" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              {context.secondaryAction?.label || "Open assistant"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Get calmer next-step guidance without leaving the current flow behind.
            </p>
          </button>
        </div>
      </div>

      <div className="mt-5">
        <Button variant="ghost" onClick={() => navigate(context.primaryAction.to)}>
          Go to support
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
