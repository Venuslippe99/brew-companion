import { ArrowRight, Clock3, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  HomePrimaryFocus,
  HomeQuickLogAction,
} from "@/lib/home-command-center";
import { getDayNumber } from "@/lib/batches";

type FocusSecondaryAction = Exclude<HomePrimaryFocus, { kind: "empty" }>["secondaryAction"];

const toneClasses = {
  urgent: "border-destructive/15 bg-[radial-gradient(circle_at_top,_hsl(var(--destructive)/0.12),_transparent_55%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)))]",
  warm: "border-primary/15 bg-[radial-gradient(circle_at_top,_hsl(var(--honey-light)),_transparent_60%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)))]",
  calm: "border-sage/20 bg-[radial-gradient(circle_at_top,_hsl(var(--sage-light)),_transparent_60%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)))]",
};

function QuickLogButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="warm" onClick={onClick}>
      <Sparkles className="h-4 w-4" />
      {label}
    </Button>
  );
}

function hasQuickLogAction(
  action: FocusSecondaryAction
): action is { label: string; quickLogMode: HomeQuickLogAction["key"] } {
  return "quickLogMode" in action;
}

function hasLinkAction(
  action: FocusSecondaryAction
): action is { label: string; to: string } {
  return "to" in action;
}

export function HomePrimaryFocusCard({
  primaryFocus,
  quickLogActions,
  onOpenQuickLog,
}: {
  primaryFocus: HomePrimaryFocus;
  quickLogActions: HomeQuickLogAction[];
  onOpenQuickLog: (actionKey: HomeQuickLogAction["key"]) => void;
}) {
  const navigate = useNavigate();

  if (primaryFocus.kind === "empty") {
    return (
      <section className={cn("home-hero-surface px-5 py-6 lg:px-7 lg:py-7", toneClasses[primaryFocus.tone])}>
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
          <Button variant="outline" size="lg" onClick={() => navigate(primaryFocus.secondaryAction.to)}>
            {primaryFocus.secondaryAction.label}
          </Button>
        </div>
      </section>
    );
  }

  const dayNumber = getDayNumber(primaryFocus.item.batch.brewStartedAt);
  const secondaryAction = primaryFocus.secondaryAction;
  const quickLogMode = hasQuickLogAction(secondaryAction)
    ? secondaryAction.quickLogMode
    : undefined;
  const secondaryLinkAction = hasLinkAction(secondaryAction) ? secondaryAction : undefined;
  const preferredQuickLog = quickLogMode
    ? quickLogActions.find((action) => action.key === quickLogMode)
    : undefined;

  return (
    <section className={cn("home-hero-surface px-5 py-6 lg:px-7 lg:py-7", toneClasses[primaryFocus.tone])}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
            {primaryFocus.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground lg:text-[2.8rem]">
            {primaryFocus.title}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StageIndicator stage={primaryFocus.item.batch.currentStage} size="md" />
            <CautionBadge level={primaryFocus.item.cautionLevel} />
            <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
              Day {dayNumber}
            </span>
            <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-copper">
              {primaryFocus.reasonLabel}
            </span>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground lg:text-base">
            {primaryFocus.summary}
          </p>
        </div>

        <div className="shrink-0 rounded-[24px] border border-border/70 bg-background/80 px-5 py-4 text-left lg:w-[220px]">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Why this is surfaced
          </p>
          <p className="mt-2 text-sm text-foreground">{primaryFocus.explanation}</p>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {primaryFocus.item.secondarySummary}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" onClick={() => navigate(primaryFocus.primaryAction.to)}>
          {primaryFocus.primaryAction.label}
          <ArrowRight className="h-4 w-4" />
        </Button>
        {quickLogMode ? (
          <QuickLogButton
            label={secondaryAction.label}
            onClick={() => onOpenQuickLog(quickLogMode)}
          />
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

      {preferredQuickLog ? (
        <div className="mt-5 rounded-[22px] border border-border/70 bg-background/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ready from here
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{preferredQuickLog.description}</p>
        </div>
      ) : null}
    </section>
  );
}
