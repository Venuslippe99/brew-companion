import type { ActiveBatchLibraryFilter, BatchLibrarySort } from "@/lib/batch-library";
import type { BatchStatus } from "@/lib/batches";

export const batchLibraryCopy = {
  page: {
    eyebrow: "Batch library",
    title: "My Batches",
    description:
      "Browse what is brewing now, revisit finished batches, and find the right brew faster when you want to check in.",
    startBatch: "Start batch",
    showingEyebrow: "Showing",
    searchPlaceholder: "Search by batch name, tea, stage, or vessel",
    searchChip(search: string) {
      return `Search: ${search}`;
    },
    sortBy(label: string) {
      return `Sort by ${label}`;
    },
    sortedBy(label: string) {
      return `Sorted by ${label.toLowerCase()}`;
    },
    totalBatches(count: number) {
      return `${count} total ${count === 1 ? "batch" : "batches"}`;
    },
    activeCount(count: number) {
      return `${count} active`;
    },
    finishedCount(count: number) {
      return `${count} finished`;
    },
  },
  tabs: [
    { label: "Brewing", value: "active" as BatchStatus, heading: "Your active brews" },
    { label: "Finished", value: "completed" as BatchStatus, heading: "Finished batches" },
    { label: "Archived", value: "archived" as BatchStatus, heading: "Archived batches" },
    { label: "Discarded", value: "discarded" as BatchStatus, heading: "Discarded batches" },
  ],
  activeFilters: [
    {
      label: "All active",
      value: "all" as ActiveBatchLibraryFilter,
      heading: "Your active brews",
      emptyTitle: "Nothing is brewing right now",
      emptyDescription: "Start a new batch when you're ready and it will show up here.",
    },
    {
      label: "Needs attention",
      value: "needs_attention" as ActiveBatchLibraryFilter,
      heading: "Brews that need attention",
      emptyTitle: "Nothing needs attention right now",
      emptyDescription:
        "Try a broader active view if you want to scan the rest of your current brews.",
    },
    {
      label: "In F1",
      value: "f1" as ActiveBatchLibraryFilter,
      heading: "Brews in F1",
      emptyTitle: "No brews are in F1 right now",
      emptyDescription: "Switch to another active view to see the rest of your batches.",
    },
    {
      label: "In F2",
      value: "f2" as ActiveBatchLibraryFilter,
      heading: "Brews in F2",
      emptyTitle: "No brews are in F2 right now",
      emptyDescription:
        "Switch to another active view if you want a broader look at today's batches.",
    },
    {
      label: "Ready to check",
      value: "ready_to_check" as ActiveBatchLibraryFilter,
      heading: "Brews ready for a check",
      emptyTitle: "Nothing is waiting for a check right now",
      emptyDescription: "Try the full active view to keep an eye on the rest of your brews.",
    },
    {
      label: "Updated lately",
      value: "recently_updated" as ActiveBatchLibraryFilter,
      heading: "Recently updated brews",
      emptyTitle: "Nothing has changed in the last few days",
      emptyDescription:
        "Open a broader active view if you want to browse all of your current brews.",
    },
  ],
  sortOptions: [
    { label: "Last updated", value: "updated_desc" as BatchLibrarySort },
    { label: "Newest brew date", value: "brew_desc" as BatchLibrarySort },
    { label: "Oldest brew date", value: "brew_asc" as BatchLibrarySort },
    { label: "Name", value: "name_asc" as BatchLibrarySort },
  ],
  loading: {
    title: "We couldn't load your batch library",
    tryAgain: "Try again",
  },
  empty: {
    searchTitle: "No batches matched your search",
    searchDescription: "Try a different name, tea, stage, or vessel search.",
    finishedTitle: "No finished batches yet",
    finishedDescription: "Finished batches will collect here when you complete them.",
    archivedTitle: "Nothing has been archived yet",
    archivedDescription: "Archived batches will stay here for later reference.",
    discardedTitle: "Nothing has been discarded yet",
    discardedDescription: "Discarded batches will stay here as part of your brewing history.",
  },
  helpers: {
    resultsSummary(args: {
      filteredCount: number;
      search: string;
      activeTab: BatchStatus;
      activeFilter: ActiveBatchLibraryFilter;
      activeFilterLabel: string;
    }) {
      const count = args.filteredCount;
      const pluralBatch = count === 1 ? "batch" : "batches";
      const pluralBrew = count === 1 ? "brew" : "brews";
      if (args.search.trim()) {
        return `Showing ${count} ${pluralBatch} that matched "${args.search.trim()}".`;
      }
      if (args.activeTab === "active") {
        if (args.activeFilter === "all") {
          return `Showing ${count} ${count === 1 ? "active brew" : "active brews"}.`;
        }
        if (args.activeFilter === "needs_attention") {
          return `Showing ${count} ${pluralBrew} that need attention.`;
        }
        if (args.activeFilter === "ready_to_check") {
          return `Showing ${count} ${pluralBrew} ready for a check.`;
        }
        if (args.activeFilter === "recently_updated") {
          return `Showing ${count} ${pluralBrew} updated in the last few days.`;
        }
        return `Showing ${count} ${pluralBrew} in ${args.activeFilterLabel.toLowerCase()}.`;
      }
      if (args.activeTab === "completed") {
        return `Showing ${count} ${count === 1 ? "finished batch" : "finished batches"}.`;
      }
      if (args.activeTab === "archived") {
        return `Showing ${count} ${count === 1 ? "archived batch" : "archived batches"}.`;
      }
      return `Showing ${count} ${count === 1 ? "discarded batch" : "discarded batches"}.`;
    },
    emptyTitle(args: {
      hasSearch: boolean;
      activeTab: BatchStatus;
      activeFilterEmptyTitle: string;
    }) {
      if (args.hasSearch) return batchLibraryCopy.empty.searchTitle;
      if (args.activeTab === "active") return args.activeFilterEmptyTitle;
      if (args.activeTab === "completed") return batchLibraryCopy.empty.finishedTitle;
      if (args.activeTab === "archived") return batchLibraryCopy.empty.archivedTitle;
      return batchLibraryCopy.empty.discardedTitle;
    },
    emptyDescription(args: {
      hasSearch: boolean;
      activeTab: BatchStatus;
      activeFilterEmptyDescription: string;
    }) {
      if (args.hasSearch) return batchLibraryCopy.empty.searchDescription;
      if (args.activeTab === "active") return args.activeFilterEmptyDescription;
      if (args.activeTab === "completed") return batchLibraryCopy.empty.finishedDescription;
      if (args.activeTab === "archived") return batchLibraryCopy.empty.archivedDescription;
      return batchLibraryCopy.empty.discardedDescription;
    },
  },
};
