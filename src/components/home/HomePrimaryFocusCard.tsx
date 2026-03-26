import { ArrowRight, Droplets, NotebookPen, Thermometer, Waves } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CautionBadge, StageIndicator } from "@/components/common/StageIndicator";
import { Button } from "@/components/ui/button";
import { homeCopy } from "@/copy/home";
import {
  getHomeBatchDayNumber,
  type HomePrimaryFocus,
  type HomeQuickLogAction,
} from "@/lib/home-command-center";
import { cn } from "@/lib/utils";

type FocusSecondaryAction = Extract<HomePrimaryFocus, { kind: "batch" }>["secondaryAction"];

const toneClasses = {
  urgent: "surface-tone-danger",
  warm: "surface-tone-warm",
  calm: "surface-tone-calm",
};

const quickActionIcons = {
  taste_test: Droplets,
  temp_check: Thermometer,
  carbonation_check: Waves,
  note_only: NotebookPen,
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
  quickActions,
  onOpenQuickLog,
}: {
  primaryFocus: HomePrimaryFocus;
  quickActions: HomeQuickLogAction[];
  onOpenQuickLog: (actionKey: HomeQuickLogAction["key"]) => void;
}) {
  const navigate = useNavigate();

  if (primaryFocus.kind === "empty") {
    return (
      <section
        className={cn("surface-hero px-4 py-5 sm:px-5 sm:py-6 lg:px-7 lg:py-7", toneClasses[primaryFocus.tone])}
      >
        <p className="type-section-kicker">{primaryFocus.eyebrow}</p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold tracking-tight text-foreground lg:text-[2.6rem]">
          {primaryFocus.title}
        </h2>
        <p className="mt-3 max-w-2xl type-helper">{primaryFocus.summary}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={() => navigate(primaryFocus.primaryAction.to)}>
            {primaryFocus.primaryAction.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate(primaryFocus.secondaryAction.to)}>
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
  const batchQuickActions = quickActions.filter((action) =>
    action.eligibleBatchIds.includes(primaryFocus.batch.id)
  );

  return (
    <section
      className={cn("surface-hero px-4 py-5 sm:px-5 sm:py-6 lg:px-7 lg:py-7", toneClasses[primaryFocus.tone])}
    >
      <p className="type-section-kicker">{primaryFocus.eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground lg:text-[2.8rem]">
        {primaryFocus.title}
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StageIndicator stage={primaryFocus.batch.currentStage} size="md" />
        <CautionBadge level={primaryFocus.batch.cautionLevel} />
        <span className="status-badge border-border/70 bg-background/80 text-foreground">
          Day {dayNumber}
        </span>
      </div>

      <p className="mt-4 max-w-2xl type-helper">{primaryFocus.summary}</p>

      <div className="surface-utility mt-4 space-y-3 px-4 py-4">
        <div>
          <p className="type-stat-label">
            {homeCopy.primaryFocus.whyThisNext}
          </p>
          <p className="mt-2 text-sm text-foreground">{primaryFocus.explanation}</p>
        </div>
        <div>
          <p className="type-stat-label">
            {homeCopy.primaryFocus.statusLine}
          </p>
          <p className="mt-2 text-sm text-foreground">{primaryFocus.statusLine}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={() => navigate(primaryFocus.primaryAction.to)}>
          {primaryFocus.primaryAction.label}
          <ArrowRight className="h-4 w-4" />
        </Button>
        {quickLogMode ? (
          <Button variant="outline" onClick={() => onOpenQuickLog(quickLogMode)}>
            {secondaryAction.label}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => secondaryLinkAction && navigate(secondaryLinkAction.to)}
          >
            {secondaryLinkAction?.label}
          </Button>
        )}
      </div>

      {batchQuickActions.length > 0 ? (
        <div className="mt-5">
          <p className="type-stat-label">{homeCopy.primaryFocus.quickActionsLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {batchQuickActions.map((action) => {
              const Icon = quickActionIcons[action.key];
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => onOpenQuickLog(action.key)}
                  className="status-badge gap-2 border-primary/20 bg-background/85 px-3 py-2 text-sm text-foreground transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
