import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import { Button } from "@/components/ui/button";
import { homeCopy } from "@/copy/home";
import { getHomeBatchDayNumber, type HomePrimaryFocus, type HomeQuickLogAction } from "@/lib/home-command-center";
import { cn } from "@/lib/utils";

type FocusSecondaryAction = Extract<HomePrimaryFocus, { kind: "batch" }>["secondaryAction"];

const toneClasses = {
  urgent:
    "border-destructive/20 bg-[radial-gradient(circle_at_top,_hsl(var(--destructive)/0.12),_transparent_55%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)))]",
  warm:
    "border-primary/20 bg-[radial-gradient(circle_at_top,_hsl(var(--honey-light)),_transparent_60%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)))]",
  calm:
    "border-sage/25 bg-[radial-gradient(circle_at_top,_hsl(var(--sage-light)),_transparent_60%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)))]",
};

function hasQuickLogAction(
  action: FocusSecondaryAction
): action is { label: string; quickLogMode: HomeQuickLogAction["key"] } {
  return "quickLogMode" in action;
}

function hasLinkAction(action: FocusSecondaryAction): action is { label: string; to: string } {
  return "to" in action;
}

export function HomePrimaryFocusCard({
  primaryFocus,
  onOpenQuickLog,
}: {
  primaryFocus: HomePrimaryFocus;
  onOpenQuickLog: (actionKey: HomeQuickLogAction["key"]) => void;
}) {
  const navigate = useNavigate();

  if (primaryFocus.kind === "empty") {
    return (
      <section
        className={cn("home-hero-surface px-5 py-6 lg:px-7 lg:py-7", toneClasses[primaryFocus.tone])}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
          {primaryFocus.eyebrow}
        </p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold tracking-tight text-foreground lg:text-[2.6rem]">
          {primaryFocus.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground lg:text-base">
          {primaryFocus.summary}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => navigate(primaryFocus.primaryAction.to)}>
            {primaryFocus.primaryAction.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(primaryFocus.secondaryAction.to)}
          >
            {primaryFocus.secondaryAction.label}
          </Button>
        </div>
      </section>
    );
  }

  const dayNumber = getHomeBatchDayNumber(primaryFocus.batch);
  const secondaryAction = primaryFocus.secondaryAction;
  const quickLogMode = hasQuickLogAction(secondaryAction)
    ? secondaryAction.quickLogMode
    : undefined;
  const secondaryLinkAction = hasLinkAction(secondaryAction) ? secondaryAction : undefined;

  return (
    <section
      className={cn("home-hero-surface px-5 py-6 lg:px-7 lg:py-7", toneClasses[primaryFocus.tone])}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
        {primaryFocus.eyebrow}
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground lg:text-[2.8rem]">
        {primaryFocus.title}
      </h2>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StageIndicator stage={primaryFocus.batch.currentStage} size="md" />
        <CautionBadge level={primaryFocus.batch.cautionLevel} />
        <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
          Day {dayNumber}
        </span>
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground lg:text-base">
        {primaryFocus.summary}
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-[20px] border border-border/70 bg-background/85 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {homeCopy.primaryFocus.whyThisNext}
          </p>
          <p className="mt-2 text-sm text-foreground">{primaryFocus.explanation}</p>
        </div>
        <div className="rounded-[20px] border border-border/70 bg-background/85 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {homeCopy.primaryFocus.statusLine}
          </p>
          <p className="mt-2 text-sm text-foreground">{primaryFocus.statusLine}</p>
          <p className="mt-2 text-xs text-muted-foreground">{primaryFocus.reasonLabel}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" onClick={() => navigate(primaryFocus.primaryAction.to)}>
          {primaryFocus.primaryAction.label}
          <ArrowRight className="h-4 w-4" />
        </Button>
        {quickLogMode ? (
          <Button variant="outline" size="lg" onClick={() => onOpenQuickLog(quickLogMode)}>
            {secondaryAction.label}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            onClick={() => secondaryLinkAction && navigate(secondaryLinkAction.to)}
          >
            {secondaryLinkAction?.label}
          </Button>
        )}
      </div>
    </section>
  );
}
