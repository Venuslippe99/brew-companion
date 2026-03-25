import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { shellCopy } from "@/copy/shell";
import type { ResolvedRouteShell, ShellVariant } from "@/components/layout/route-shell-config";
import { cn } from "@/lib/utils";

export type PageShellAction = {
  label: string;
  onClick: () => void;
};

type PageShellHeaderProps = {
  shell: ResolvedRouteShell;
  title: string;
  subtitle?: string;
  compact: boolean;
  onBack?: () => void;
  action?: PageShellAction;
};

function getVariantClasses(variant: ShellVariant, compact: boolean) {
  switch (variant) {
    case "flow":
      return {
        wrapper:
          "border-b border-primary/12 bg-background/86 supports-[backdrop-filter]:bg-background/72",
        title: compact ? "text-base lg:text-lg" : "text-xl lg:text-2xl",
      };
    case "detail":
      return {
        wrapper:
          "border-b border-border/70 bg-background/90 supports-[backdrop-filter]:bg-background/78",
        title: compact ? "text-base lg:text-lg" : "text-lg lg:text-xl",
      };
    case "settings":
      return {
        wrapper:
          "border-b border-border/60 bg-background/90 supports-[backdrop-filter]:bg-background/80",
        title: compact ? "text-base lg:text-lg" : "text-lg lg:text-xl",
      };
    case "overview":
      return {
        wrapper:
          "border-b border-border/60 bg-background/92 supports-[backdrop-filter]:bg-background/80",
        title: compact ? "text-base lg:text-lg" : "text-xl lg:text-2xl",
      };
    default:
      return {
        wrapper:
          "border-b border-border/60 bg-background/90 supports-[backdrop-filter]:bg-background/80",
        title: compact ? "text-base lg:text-lg" : "text-lg lg:text-xl",
      };
  }
}

export function PageShellHeader({
  shell,
  title,
  subtitle,
  compact,
  onBack,
  action,
}: PageShellHeaderProps) {
  const variantClasses = getVariantClasses(shell.variant, compact);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-200",
        variantClasses.wrapper,
        compact && "shadow-[0_12px_30px_-26px_hsl(var(--tea)/0.35)]",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-3 px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] lg:px-8 lg:pb-4 lg:pt-4">
        <div className="flex min-w-0 items-start gap-3">
          {shell.showBackButton ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 shrink-0 rounded-full"
              aria-label={shellCopy.header.back}
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}

          <div className="min-w-0">
            <p
              className={cn(
                "truncate font-display font-semibold tracking-tight text-foreground transition-all duration-200",
                variantClasses.title,
              )}
            >
              {title}
            </p>

            {subtitle ? (
              <p
                className={cn(
                  "mt-1 max-w-2xl text-xs text-muted-foreground transition-all duration-200 lg:text-sm",
                  compact ? "max-h-0 overflow-hidden opacity-0" : "max-h-16 opacity-100",
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {action ? (
          <Button
            type="button"
            size="sm"
            variant={shell.variant === "flow" ? "default" : "outline"}
            className="shrink-0 rounded-full px-3"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
