import type { HomeQuickLogAction } from "@/lib/home-command-center";

export const homeCopy = {
  page: {
    loadingStateSentence: "Loading today's brews...",
    loadingPanel: "Loading your brews for today...",
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
    activeBrews(count: number) {
      return `${count} active ${count === 1 ? "brew" : "brews"}`;
    },
  },
  primaryFocus: {
    whyThisMattersToday: "Why this matters today",
  },
  queue: {
    eyebrow: "Today",
    title: "Keep an eye on these too",
    description: "A few more brews to keep in sight after the main focus.",
  },
  support: {
    eyebrow: "Help",
    assistantFallback: "Open assistant",
    assistantDescription: "Get a steady second opinion before you move on.",
    readingDescription: "Open the best place to read more before you act.",
  },
  quickLog: {
    eyebrow: "Quick actions",
    title: "Log a quick check",
    description:
      "Save a taste note, temperature check, carbonation check, or short observation without changing the batch stage.",
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
  recentMovement: {
    eyebrow: "Recent changes",
    title: "What changed lately",
    description: "A quieter look at what changed across your brews.",
  },
  roster: {
    eyebrow: "Your brews",
    title: "Keep your active batches close",
    description:
      "Browse your active brews here, then open the full list when you want deeper detail.",
    openMyBatches: "Open My Batches",
  },
};
