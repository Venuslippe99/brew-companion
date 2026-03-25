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
    <section className="home-panel-surface px-4 py-4 sm:px-5 sm:py-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
          {homeCopy.support.eyebrow}
        </p>
        <h2 className="mt-2 text-base font-semibold text-foreground">{context.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{context.summary}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate(context.primaryAction.to)}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-honey-light/55 px-3 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5"
        >
          <PrimaryIcon className="h-4 w-4 text-primary" />
          {context.primaryAction.label}
        </button>

        <button
          type="button"
          onClick={() => navigate(secondaryAction.to)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5"
        >
          <SecondaryIcon className="h-4 w-4 text-copper" />
          {context.secondaryAction?.label || homeCopy.support.assistantFallback}
        </button>
      </div>
    </section>
  );
}
