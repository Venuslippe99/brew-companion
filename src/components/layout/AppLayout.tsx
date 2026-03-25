import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { BookOpen, FlaskConical, Home, MessageCircle, Plus, Settings as SettingsIcon } from "lucide-react";

import { PageShellHeader, type PageShellAction } from "@/components/layout/PageShellHeader";
import {
  resolveRouteShell,
  resolveShellPath,
  type BottomNavTone,
  type ResolvedRouteShell,
  type ShellNavKey,
} from "@/components/layout/route-shell-config";
import { shellCopy } from "@/copy/shell";
import { cn } from "@/lib/utils";

type AppLayoutShellOverrides = {
  title?: string;
  subtitle?: string;
  backTo?: string;
  action?: PageShellAction;
};

type NavItem = {
  key: ShellNavKey;
  to: string;
  icon: typeof Home;
  label: string;
  emphasized?: boolean;
};

const navItems: NavItem[] = [
  { key: "home", to: "/", icon: Home, label: shellCopy.nav.home },
  { key: "batches", to: "/batches", icon: FlaskConical, label: shellCopy.nav.batches },
  { key: "new-batch", to: "/new-batch", icon: Plus, label: shellCopy.nav.newBatch, emphasized: true },
  { key: "guides", to: "/guides", icon: BookOpen, label: shellCopy.nav.guides },
  { key: "assistant", to: "/assistant", icon: MessageCircle, label: shellCopy.nav.assistant },
];

function getBottomNavClasses(tone: BottomNavTone) {
  if (tone === "subdued") {
    return "border-border/40 bg-background/72 shadow-[0_18px_36px_-28px_hsl(var(--foreground)/0.45)]";
  }

  return "border-border/70 bg-background/86 shadow-[0_22px_50px_-30px_hsl(var(--foreground)/0.45)]";
}

function MobileNav({
  activeNavKey,
  tone,
}: {
  activeNavKey: ShellNavKey;
  tone: BottomNavTone;
}) {
  if (tone === "hidden") {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
      <div
        className={cn(
          "pointer-events-auto mx-auto grid max-w-md grid-cols-5 items-center gap-1 rounded-[28px] border px-2 py-2 backdrop-blur-2xl transition-all duration-200",
          getBottomNavClasses(tone),
        )}
      >
        {navItems.map((item) => {
          const isActive = activeNavKey === item.key;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-[3.1rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-center transition-all duration-200",
                item.emphasized
                  ? isActive
                    ? "bg-primary text-primary-foreground shadow-[0_16px_28px_-18px_hsl(var(--primary)/0.75)]"
                    : "border border-primary/20 bg-primary/8 text-primary"
                  : isActive
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground/75 hover:text-foreground",
              )}
            >
              <item.icon className={cn(item.emphasized ? "h-4.5 w-4.5" : "h-4.5 w-4.5")} />
              <span className={cn("text-[10px] font-medium leading-none", item.emphasized && "text-[10.5px]")}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function DesktopSidebar({ activeNavKey }: { activeNavKey: ShellNavKey }) {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72 lg:flex-col border-r border-sidebar-border bg-sidebar z-40">
      <div className="border-b border-sidebar-border px-6 py-6">
        <h1 className="font-display text-xl font-semibold tracking-tight text-sidebar-foreground">
          {shellCopy.brand.name}
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{shellCopy.brand.subtitle}</p>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {navItems.map((item) => {
          const isActive = activeNavKey === item.key;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-150",
                item.emphasized
                  ? isActive
                    ? "bg-primary text-primary-foreground shadow-[0_18px_32px_-22px_hsl(var(--primary)/0.75)]"
                    : "bg-primary/10 text-sidebar-primary hover:bg-primary/14"
                  : isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <NavLink
          to="/settings"
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
            activeNavKey === "settings"
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
          )}
        >
          <SettingsIcon className="h-4.5 w-4.5" />
          {shellCopy.nav.settings}
        </NavLink>
      </div>
    </aside>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  shell?: AppLayoutShellOverrides;
}

export default function AppLayout({ children, shell }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [compactHeader, setCompactHeader] = useState(false);

  const routeShell = useMemo(() => resolveRouteShell(location.pathname), [location.pathname]);

  const resolvedShell: ResolvedRouteShell = {
    ...routeShell,
    title: shell?.title || routeShell.title,
    subtitle: shell?.subtitle ?? routeShell.subtitle,
    backTo: shell?.backTo ?? routeShell.backTo,
  };

  const resolvedBackPath = resolveShellPath(
    resolvedShell.backTo,
    params as Record<string, string | undefined>,
  );

  useEffect(() => {
    if (!resolvedShell.showHeader || !resolvedShell.stickyHeader) {
      setCompactHeader(false);
      return;
    }

    const handleScroll = () => {
      setCompactHeader(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [resolvedShell.showHeader, resolvedShell.stickyHeader, location.pathname]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(resolvedBackPath || "/");
  };

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar activeNavKey={routeShell.navKey} />

      <main className="min-h-screen pb-28 lg:pl-72 lg:pb-0">
        {resolvedShell.showHeader ? (
          <PageShellHeader
            shell={resolvedShell}
            title={resolvedShell.title}
            subtitle={resolvedShell.subtitle}
            compact={compactHeader}
            onBack={resolvedShell.showBackButton ? handleBack : undefined}
            action={shell?.action}
          />
        ) : null}

        <div className={cn(resolvedShell.variant === "flow" ? "pb-6" : "")}>{children}</div>
      </main>

      <MobileNav activeNavKey={routeShell.navKey} tone={resolvedShell.bottomNavTone} />
    </div>
  );
}
