import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { BatchCard } from "@/components/batches/BatchCard";
import { type BatchStatus, type KombuchaBatch } from "@/lib/batches";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ArrowUpDown, CircleAlert, Leaf, Archive, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  type ActiveBatchLibraryFilter,
  type BatchLibrarySort,
  getBatchLibraryStatusCount,
  matchesActiveBatchLibraryFilter,
  matchesBatchLibrarySearch,
  sortBatchLibraryBatches,
} from "@/lib/batch-library";

const tabs: Array<{ label: string; value: BatchStatus; heading: string }> = [
  { label: "Brewing", value: "active", heading: "Your active brews" },
  { label: "Finished", value: "completed", heading: "Finished batches" },
  { label: "Archived", value: "archived", heading: "Archived batches" },
  { label: "Discarded", value: "discarded", heading: "Discarded batches" },
];

const activeFilters: Array<{
  label: string;
  value: ActiveBatchLibraryFilter;
  heading: string;
  emptyTitle: string;
  emptyDescription: string;
}> = [
  {
    label: "All active",
    value: "all",
    heading: "Your active brews",
    emptyTitle: "Nothing is brewing right now",
    emptyDescription: "Start a new batch when you're ready and it will show up here.",
  },
  {
    label: "Needs attention",
    value: "needs_attention",
    heading: "Brews that need attention",
    emptyTitle: "Nothing needs attention right now",
    emptyDescription: "Try a broader active view if you want to scan the rest of your current brews.",
  },
  {
    label: "In F1",
    value: "f1",
    heading: "Brews in F1",
    emptyTitle: "No brews are in F1 right now",
    emptyDescription: "Switch to another active view to see the rest of your batches.",
  },
  {
    label: "In F2",
    value: "f2",
    heading: "Brews in F2",
    emptyTitle: "No brews are in F2 right now",
    emptyDescription: "Switch to another active view if you want a broader look at today's batches.",
  },
  {
    label: "Ready to check",
    value: "ready_to_check",
    heading: "Brews ready for a check",
    emptyTitle: "Nothing is waiting for a check right now",
    emptyDescription: "Try the full active view to keep an eye on the rest of your brews.",
  },
  {
    label: "Updated lately",
    value: "recently_updated",
    heading: "Recently updated brews",
    emptyTitle: "Nothing has changed in the last few days",
    emptyDescription: "Open a broader active view if you want to browse all of your current brews.",
  },
];

const sortOptions: Array<{ label: string; value: BatchLibrarySort }> = [
  { label: "Last updated", value: "updated_desc" },
  { label: "Newest brew date", value: "brew_desc" },
  { label: "Oldest brew date", value: "brew_asc" },
  { label: "Name", value: "name_asc" },
];

type MyBatchesRow = Pick<
  Tables<"kombucha_batches">,
  | "id"
  | "name"
  | "status"
  | "current_stage"
  | "brew_started_at"
  | "total_volume_ml"
  | "tea_type"
  | "sugar_g"
  | "starter_liquid_ml"
  | "scoby_present"
  | "avg_room_temp_c"
  | "vessel_type"
  | "target_preference"
  | "initial_ph"
  | "initial_notes"
  | "caution_level"
  | "readiness_window_start"
  | "readiness_window_end"
  | "completed_at"
  | "updated_at"
>;

export default function MyBatches() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<BatchStatus>("active");
  const [activeFilter, setActiveFilter] = useState<ActiveBatchLibraryFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<BatchLibrarySort>("updated_desc");
  const [batches, setBatches] = useState<KombuchaBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("kombucha_batches")
      .select(`
          id,
          name,
          status,
          current_stage,
          brew_started_at,
          total_volume_ml,
          tea_type,
          sugar_g,
          starter_liquid_ml,
          scoby_present,
          avg_room_temp_c,
          vessel_type,
          target_preference,
          initial_ph,
          initial_notes,
          caution_level,
          readiness_window_start,
          readiness_window_end,
          completed_at,
          updated_at
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Load batches error:", error);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const mapped: KombuchaBatch[] = ((data || []) as MyBatchesRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      currentStage: row.current_stage,
      brewStartedAt: row.brew_started_at,
      totalVolumeMl: row.total_volume_ml,
      teaType: row.tea_type,
      sugarG: Number(row.sugar_g),
      starterLiquidMl: Number(row.starter_liquid_ml),
      scobyPresent: row.scoby_present,
      avgRoomTempC: Number(row.avg_room_temp_c),
      vesselType: row.vessel_type || "Glass jar",
      targetPreference: row.target_preference || "balanced",
      initialPh: row.initial_ph ? Number(row.initial_ph) : undefined,
      initialNotes: row.initial_notes || undefined,
      cautionLevel: row.caution_level === "elevated" ? "high" : row.caution_level,
      readinessWindowStart: row.readiness_window_start || undefined,
      readinessWindowEnd: row.readiness_window_end || undefined,
      completedAt: row.completed_at || undefined,
      updatedAt: row.updated_at,
    }));

    setBatches(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (activeTab !== "active") {
      setActiveFilter("all");
    }
  }, [activeTab]);

  const filtered = useMemo(() => {
    let next = batches.filter((batch) => batch.status === activeTab);

    if (activeTab === "active") {
      next = next.filter((batch) => matchesActiveBatchLibraryFilter(batch, activeFilter));
    }

    if (search.trim()) {
      next = next.filter((batch) => matchesBatchLibrarySearch(batch, search));
    }

    return sortBatchLibraryBatches(next, sort);
  }, [activeFilter, activeTab, batches, search, sort]);

  const statusCounts = useMemo(
    () => ({
      active: getBatchLibraryStatusCount(batches, "active"),
      completed: getBatchLibraryStatusCount(batches, "completed"),
      archived: getBatchLibraryStatusCount(batches, "archived"),
      discarded: getBatchLibraryStatusCount(batches, "discarded"),
    }),
    [batches]
  );

  const activeFilterDefinition =
    activeFilters.find((filterOption) => filterOption.value === activeFilter) || activeFilters[0];
  const activeFilterLabel = activeFilterDefinition.label;
  const currentSortLabel =
    sortOptions.find((sortOption) => sortOption.value === sort)?.label || "Last updated";
  const activeTabDefinition = tabs.find((tab) => tab.value === activeTab) || tabs[0];

  const resultsHeading =
    activeTab === "active"
      ? activeFilterDefinition.heading
      : activeTabDefinition.heading;

  const resultsSummary = search.trim()
    ? `Showing ${filtered.length} ${filtered.length === 1 ? "batch" : "batches"} that matched "${search.trim()}".`
    : activeTab === "active"
      ? activeFilter === "all"
        ? `Showing ${filtered.length} ${filtered.length === 1 ? "active brew" : "active brews"}.`
        : activeFilter === "needs_attention"
          ? `Showing ${filtered.length} ${filtered.length === 1 ? "brew" : "brews"} that need attention.`
          : activeFilter === "ready_to_check"
            ? `Showing ${filtered.length} ${filtered.length === 1 ? "brew" : "brews"} ready for a check.`
            : activeFilter === "recently_updated"
              ? `Showing ${filtered.length} ${filtered.length === 1 ? "brew" : "brews"} updated in the last few days.`
              : `Showing ${filtered.length} ${filtered.length === 1 ? "brew" : "brews"} in ${activeFilterLabel.toLowerCase()}.`
      : activeTab === "completed"
        ? `Showing ${filtered.length} ${filtered.length === 1 ? "finished batch" : "finished batches"}.`
        : activeTab === "archived"
          ? `Showing ${filtered.length} ${filtered.length === 1 ? "archived batch" : "archived batches"}.`
          : `Showing ${filtered.length} ${filtered.length === 1 ? "discarded batch" : "discarded batches"}.`;

  const hasActiveNarrowing = activeTab === "active" && activeFilter !== "all";
  const hasSearch = search.trim().length > 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:px-8 lg:pb-10 lg:pt-8">
        <ScrollReveal>
          <section className="rounded-[28px] border bg-card px-5 py-6 shadow-[0_14px_40px_-30px_hsl(var(--tea)/0.22)] lg:px-7 lg:py-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
                  Batch library
                </p>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground lg:text-[2.6rem]">
                  My Batches
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground lg:text-base">
                  Browse what is brewing now, revisit finished batches, and find the right brew faster when you want to check in.
                </p>
              </div>

              <Button size="lg" onClick={() => navigate("/new-batch")}>
                <Plus className="h-4 w-4" />
                Start batch
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
                {batches.length} total {batches.length === 1 ? "batch" : "batches"}
              </span>
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                {statusCounts.active} active
              </span>
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                {statusCounts.completed} finished
              </span>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <section className="mt-6 rounded-[28px] border bg-card px-5 py-5 shadow-[0_12px_32px_-28px_hsl(var(--tea)/0.18)] lg:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 rounded-2xl bg-muted/70 p-1">
                {tabs.map((tab) => {
                  const count = statusCounts[tab.value];

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveTab(tab.value)}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 sm:flex-none ${
                        activeTab === tab.value
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                      {count > 0 ? (
                        <span
                          className={`ml-1.5 text-xs ${
                            activeTab === tab.value ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.5fr)]">
                <label className="relative block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by batch name, tea, stage, or vessel"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                </label>

                <label className="relative block">
                  <ArrowUpDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as BatchLibrarySort)}
                    className="h-11 w-full appearance-none rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        Sort by {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {activeTab === "active" ? (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((filterOption) => (
                    <button
                      key={filterOption.value}
                      type="button"
                      onClick={() => setActiveFilter(filterOption.value)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        activeFilter === filterOption.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {filterOption.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <section className="mt-5 flex flex-col gap-3 rounded-[24px] border border-border/70 bg-background/85 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
                Showing
              </p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">{resultsHeading}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{resultsSummary}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-foreground">
                {tabs.find((tab) => tab.value === activeTab)?.label}
              </span>
              {hasActiveNarrowing ? (
                <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-foreground">
                  {activeFilterLabel}
                </span>
              ) : null}
              {hasSearch ? (
                <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-foreground">
                  Search: {search.trim()}
                </span>
              ) : null}
              <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                Sorted by {currentSortLabel.toLowerCase()}
              </span>
            </div>
          </section>
        </ScrollReveal>

        <div className="mt-5">
          {loading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-border/70 bg-card px-5 py-5 animate-pulse"
                >
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="mt-4 h-6 w-2/3 rounded bg-muted" />
                  <div className="mt-5 h-14 rounded-2xl bg-muted" />
                  <div className="mt-4 h-4 w-1/2 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : errorMessage ? (
            <ScrollReveal>
              <section className="rounded-[28px] border border-destructive/25 bg-card px-6 py-8 text-center">
                <CircleAlert className="mx-auto h-8 w-8 text-destructive/70" />
                <h3 className="mt-3 font-display text-xl font-semibold text-foreground">
                  We couldn't load your batch library
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {errorMessage}
                </p>
                <div className="mt-5">
                  <Button onClick={() => void loadBatches()}>
                    Try again
                  </Button>
                </div>
              </section>
            </ScrollReveal>
          ) : filtered.length === 0 ? (
            <ScrollReveal>
              <section className="rounded-[28px] border bg-card px-6 py-8 text-center">
                {activeTab === "active" ? (
                  <Leaf className="mx-auto h-8 w-8 text-muted-foreground/40" />
                ) : activeTab === "archived" ? (
                  <Archive className="mx-auto h-8 w-8 text-muted-foreground/40" />
                ) : (
                  <History className="mx-auto h-8 w-8 text-muted-foreground/40" />
                )}
                <h3 className="mt-3 font-display text-xl font-semibold text-foreground">
                  {hasSearch
                    ? "No batches matched your search"
                    : activeTab === "active"
                      ? activeFilterDefinition.emptyTitle
                      : activeTab === "completed"
                        ? "No finished batches yet"
                        : activeTab === "archived"
                          ? "Nothing has been archived yet"
                          : "Nothing has been discarded yet"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasSearch
                    ? "Try a different name, tea, stage, or vessel search."
                    : activeTab === "active"
                      ? activeFilterDefinition.emptyDescription
                      : activeTab === "completed"
                        ? "Finished batches will collect here when you complete them."
                        : activeTab === "archived"
                          ? "Archived batches will stay here for later reference."
                          : "Discarded batches will stay here as part of your brewing history."}
                </p>
                {activeTab === "active" && !hasSearch ? (
                  <div className="mt-5">
                    <Button onClick={() => navigate("/new-batch")}>
                      <Plus className="h-4 w-4" />
                      Start batch
                    </Button>
                  </div>
                ) : null}
              </section>
            </ScrollReveal>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filtered.map((batch, index) => (
                <ScrollReveal key={batch.id} delay={index * 0.04}>
                  <BatchCard batch={batch} />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
