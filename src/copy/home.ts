import type { HomeQuickLogAction } from "@/lib/home-command-center";

export const homeCopy = {
  page: {
    loadingStateSentence: "Loading your brewing world...",
    loadingPanel: "Loading your brewing world...",
    loadingStats: "Pulling together your brewing snapshot...",
    quickLogSuccess(actionKey: HomeQuickLogAction["key"]) {
      switch (actionKey) {
        case "taste_test":
          return "Taste test saved.";
        case "temp_check":
          return "Temperature check saved.";
        case "carbonation_check":
          return "Carbonation check saved.";
        default:
          return "Brewing note saved.";
      }
    },
    quickLogError: "Could not save this quick log.",
    missingQuickLogContext: "You need to be signed in and choose a batch before logging.",
    headerSettingsAria: "Open settings",
  },
  header: {
    primaryAction: "Start batch",
    secondaryAction: "View batches",
  },
  stats: {
    currentTitle: "Current snapshot",
    currentDescription: "What is active in your brewing world right now.",
    lifetimeTitle: "Lifetime brewing",
    lifetimeDescription: "A bigger picture of what you have brewed so far.",
    active: "Active",
    inF1: "In F1",
    inF2: "In F2",
    attention: "Needs attention today",
    brewed: "Total kombucha brewed",
    bottles: "Total bottles bottled",
    completed: "Completed batches",
    total: "Total batches brewed",
    activeHelper: "Batches still in progress",
    inF1Helper: "Still in first fermentation",
    inF2Helper: "Already in bottling or bottle conditioning",
    attentionHelper: "Batches worth checking today",
    brewedHelper: "Sum of saved batch volume, shown in liters",
    bottlesHelper: "Count of saved bottles across F2 runs",
    completedHelper: "Completed or archived batches",
    totalHelper: "All saved batches except discarded ones",
  },
  primaryFocus: {
    eyebrow: "Primary focus",
    quietEyebrow: "Calm next check",
    emptyEyebrow: "Brewing overview",
    emptyTitle: "Nothing is brewing right now",
    emptySummary:
      "Start a fresh batch, revisit the basics, or open the guides if you want a calmer reset before brewing again.",
    whyThisNext: "Why this is next",
    statusLine: "Status",
    viewBatch: "Open batch",
    openGuides: "Browse guides",
    addNote: "Add note",
    getHelp: "Get help",
  },
  attention: {
    eyebrow: "Also worth checking",
    title: "A few more things to keep in sight",
    description: "These are the other brews most worth a quick look after the main focus.",
    openBatch: "Open batch",
  },
  quickLog: {
    eyebrow: "Quick actions",
    title: "Log a quick check",
    description: "Keep short updates easy without turning Home into a workbench.",
    photoComing: "Photo logging is still coming later",
    whichBatch: "Which batch?",
    howDidItTaste: "How did it taste?",
    chooseOne: "Choose one",
    roomTemperature: "Room temperature",
    temperatureUnit: "deg C",
    close: "Close",
    saving: "Saving...",
    actionCopy(action: HomeQuickLogAction["key"]) {
      switch (action) {
        case "taste_test":
          return {
            title: "Log a taste test",
            description: "Save a quick taste note without changing the batch stage from Home.",
            noteLabel: "What stood out?",
            notePlaceholder: "Short, practical tasting note",
            saveLabel: "Save taste test",
          };
        case "temp_check":
          return {
            title: "Log a temperature check",
            description: "Save the room temperature for this batch and add a note only if it helps.",
            noteLabel: "Optional note",
            notePlaceholder: "Anything unusual about the room or setup?",
            saveLabel: "Save temperature check",
          };
        case "carbonation_check":
          return {
            title: "Log a carbonation check",
            description:
              "Save a quick note on fizz or bottle pressure without moving the batch to a new stage.",
            noteLabel: "What did you notice?",
            notePlaceholder: "Short carbonation or pressure note",
            saveLabel: "Save carbonation check",
          };
        case "note_only":
          return {
            title: "Add a brewing note",
            description: "Save a short observation while the batch is already top of mind.",
            noteLabel: "Your note",
            notePlaceholder: "What do you want to remember?",
            saveLabel: "Save note",
          };
      }
    },
  },
  recentActivity: {
    eyebrow: "Recent activity",
    title: "What changed lately",
    description: "A compact read on the latest movement across your brews.",
    empty: "No recent activity to show yet.",
  },
  support: {
    eyebrow: "Need a little help?",
    assistantFallback: "Open assistant",
    assistantDescription: "Get a steady second opinion before you move on.",
    readingDescription: "Open the best place to read more before you act.",
  },
};
