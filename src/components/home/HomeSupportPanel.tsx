import { BookOpen, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { homeCopy } from "@/copy/home";
import type { HomeSupportContext } from "@/lib/home-command-center";

function getActionMeta(action: { label: string; to: string }) {
  if (action.to.startsWith("/assistant")) {
      return {
        icon: MessageCircle,
        description: homeCopy.support.assistantDescription,
      };
  }

  return {
    icon: BookOpen,
    description: homeCopy.support.readingDescription,
  };
}

export function HomeSupportPanel({
  context,
}: {
  context: HomeSupportContext;
}) {
  const navigate = useNavigate();
  const primaryMeta = getActionMeta(context.primaryAction);
  const secondaryAction = context.secondaryAction || context.primaryAction;
  const secondaryMeta = getActionMeta(secondaryAction);
  const PrimaryIcon = primaryMeta.icon;
  const SecondaryIcon = secondaryMeta.icon;

  return (
    <section className="home-panel-surface overflow-hidden px-5 py-5">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
          {homeCopy.support.eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">
          {context.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{context.summary}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate(context.primaryAction.to)}
          className="rounded-[20px] border border-primary/15 bg-honey-light/55 p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
        >
          <PrimaryIcon className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-semibold text-foreground">{context.primaryAction.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{primaryMeta.description}</p>
        </button>

        <button
          type="button"
          onClick={() => navigate(secondaryAction.to)}
          className="rounded-[20px] border border-border bg-background/90 p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
        >
          <SecondaryIcon className="h-5 w-5 text-copper" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            {context.secondaryAction?.label || homeCopy.support.assistantFallback}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{secondaryMeta.description}</p>
        </button>
      </div>
    </section>
  );
}
