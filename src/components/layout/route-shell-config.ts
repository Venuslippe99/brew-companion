import { matchPath } from "react-router-dom";

import { shellCopy } from "@/copy/shell";

export type ShellVariant = "overview" | "detail" | "flow" | "settings" | "simple";
export type BottomNavTone = "standard" | "subdued" | "hidden";
export type ShellNavKey = "home" | "batches" | "new-batch" | "guides" | "assistant" | "settings" | null;

export type RouteShellDefinition = {
  key: string;
  pattern: string;
  variant: ShellVariant;
  title: string;
  subtitle?: string;
  showHeader: boolean;
  stickyHeader: boolean;
  showBackButton?: boolean;
  backTo?: string;
  bottomNavTone: BottomNavTone;
  navKey: ShellNavKey;
};

export type ResolvedRouteShell = RouteShellDefinition;

const routeShellDefinitions: RouteShellDefinition[] = [
  {
    key: "home",
    pattern: "/",
    variant: "overview",
    title: shellCopy.titles.home,
    subtitle: shellCopy.subtitles.home,
    showHeader: true,
    stickyHeader: true,
    bottomNavTone: "standard",
    navKey: "home",
  },
  {
    key: "batches",
    pattern: "/batches",
    variant: "overview",
    title: shellCopy.titles.myBatches,
    subtitle: shellCopy.subtitles.myBatches,
    showHeader: true,
    stickyHeader: true,
    bottomNavTone: "standard",
    navKey: "batches",
  },
  {
    key: "new-batch",
    pattern: "/new-batch",
    variant: "flow",
    title: shellCopy.titles.newBatch,
    subtitle: shellCopy.subtitles.newBatch,
    showHeader: true,
    stickyHeader: true,
    showBackButton: true,
    backTo: "/batches",
    bottomNavTone: "subdued",
    navKey: "new-batch",
  },
  {
    key: "batch-detail",
    pattern: "/batch/:id",
    variant: "detail",
    title: shellCopy.titles.batchDetail,
    showHeader: true,
    stickyHeader: true,
    showBackButton: true,
    backTo: "/batches",
    bottomNavTone: "standard",
    navKey: "batches",
  },
  {
    key: "f2-setup",
    pattern: "/batch/:id/f2/setup",
    variant: "flow",
    title: shellCopy.titles.f2Setup,
    subtitle: shellCopy.subtitles.f2Setup,
    showHeader: true,
    stickyHeader: true,
    showBackButton: true,
    backTo: "/batch/:id",
    bottomNavTone: "subdued",
    navKey: "batches",
  },
  {
    key: "batch-lineage",
    pattern: "/batch/:id/lineage",
    variant: "detail",
    title: shellCopy.titles.lineage,
    subtitle: shellCopy.subtitles.lineage,
    showHeader: true,
    stickyHeader: true,
    showBackButton: true,
    backTo: "/batch/:id",
    bottomNavTone: "standard",
    navKey: "batches",
  },
  {
    key: "f1-recipes",
    pattern: "/f1-recipes",
    variant: "overview",
    title: shellCopy.titles.f1Recipes,
    subtitle: shellCopy.subtitles.f1Recipes,
    showHeader: true,
    stickyHeader: true,
    bottomNavTone: "standard",
    navKey: null,
  },
  {
    key: "f1-vessels",
    pattern: "/f1-vessels",
    variant: "overview",
    title: shellCopy.titles.f1Vessels,
    subtitle: shellCopy.subtitles.f1Vessels,
    showHeader: true,
    stickyHeader: true,
    bottomNavTone: "standard",
    navKey: null,
  },
  {
    key: "settings",
    pattern: "/settings",
    variant: "settings",
    title: shellCopy.titles.settings,
    subtitle: shellCopy.subtitles.settings,
    showHeader: true,
    stickyHeader: true,
    bottomNavTone: "standard",
    navKey: "settings",
  },
  {
    key: "guides",
    pattern: "/guides",
    variant: "simple",
    title: shellCopy.titles.guides,
    showHeader: false,
    stickyHeader: false,
    bottomNavTone: "standard",
    navKey: "guides",
  },
  {
    key: "guide-detail",
    pattern: "/guides/:slug",
    variant: "simple",
    title: shellCopy.titles.guides,
    showHeader: false,
    stickyHeader: false,
    bottomNavTone: "standard",
    navKey: "guides",
  },
  {
    key: "assistant",
    pattern: "/assistant",
    variant: "simple",
    title: shellCopy.titles.assistant,
    showHeader: false,
    stickyHeader: false,
    bottomNavTone: "standard",
    navKey: "assistant",
  },
];

const defaultShell: ResolvedRouteShell = {
  key: "default",
  pattern: "*",
  variant: "simple",
  title: shellCopy.brand.name,
  showHeader: false,
  stickyHeader: false,
  bottomNavTone: "standard",
  navKey: null,
};

export function resolveRouteShell(pathname: string): ResolvedRouteShell {
  for (const definition of routeShellDefinitions) {
    if (matchPath({ path: definition.pattern, end: true }, pathname)) {
      return definition;
    }
  }

  return defaultShell;
}

export function resolveShellPath(template: string | undefined, params: Record<string, string | undefined>) {
  if (!template) {
    return undefined;
  }

  return template.replace(/:([a-zA-Z0-9_]+)/g, (_match, key) => params[key] || "");
}
