import type { HomeQuickLogAction } from "@/lib/home-command-center";

export const homeCopy = {
  page: {
    loadingStateSentence: "Loading your brewing world...",
    loadingPanel: "Loading your brewing world...",
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
    currentStatsLabel: "Current",
  },
  stats: {
    lifetimeTitle: "All time",
    lifetimeDescription: "A bigger picture of what you have brewed so far.",
  },
  primaryFocus: {
    whyThisNext: "Why it matters now",
    statusLine: "What to watch",
    quickActionsLabel: "Quick log",
  },
  attention: {
    eyebrow: "Also worth checking",
    title: "A few more things to keep in sight",
    description: "No more than three extra brews that are worth a quick look after the main focus.",
    viewAll: "View all batches",
  },
  quickLog: {
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
    eyebrow: "Recent",
    title: "Latest activity",
    description: "A very short read on what changed lately.",
    empty: "No recent activity to show yet.",
  },
  support: {
    eyebrow: "Help",
    assistantFallback: "Open assistant",
    assistantDescription: "Get a steady second opinion before you move on.",
    readingDescription: "Open the best place to read more before you act.",
  },
};
