export const batchDetailCopy = {
  currentPhase: {
    eyebrow: "Current chapter",
    timingWindow: "Timing window",
    nextAction: "What to do next",
    whyKombloomSaysThis: "Why Kombloom says this",
    followGuidedCheck: "Follow the next guided check for this stage.",
    baseBrewSnapshot: "Base brew snapshot",
    currentPhaseSnapshot: "Current phase snapshot",
    tea: "Tea",
    sugar: "Sugar",
    starter: "Starter",
    volume: "Volume",
    bottles: "Bottles",
    carbonation: "Carbonation",
    pressureRisk: "Pressure risk",
    recipe: "Recipe",
    unknown: "Unknown",
    savedRecipe: "Saved recipe",
    noSavedF2Setup:
      "This stage does not have a saved Second Fermentation setup yet, so Kombloom is still working from the base batch details.",
    tasteFirstTitle: "Taste first, then choose the next chapter",
    tasteFirstDescription:
      "If the brew feels ready, move into Second Fermentation. If not, keep it going and come back for another taste.",
    openingF2Setup: "Opening F2 setup...",
    saving: "Saving...",
    moveToSecondFermentation: "Move to Second Fermentation",
    keepFermenting: "Keep fermenting",
    openF2Title: "Open the F2 chapter",
    openF2Description:
      "The bottle setup and saved Second Fermentation summary now live in a dedicated bottling view.",
    openBottlingSetup: "Open bottling setup",
    openF2Chapter: "Open F2 chapter",
    stageGuidance(batchStage: string) {
      if (batchStage === "f2_setup") {
        return "You are at the handoff between your base kombucha and the bottled phase.";
      }
      if (batchStage === "refrigerate_now") {
        return "The warm fermentation window has likely done its job. Chilling is the safest next move.";
      }
      if (batchStage === "chilled_ready") {
        return "The lively work is finished. This is a good time to taste and reflect.";
      }
      return "This section keeps the most relevant context for the phase you are in now.";
    },
    f2Guidance(hasSetup: boolean) {
      return hasSetup
        ? "This guidance follows the saved bottle setup and the current Second Fermentation stage."
        : "This guidance follows the current stage and saved batch details.";
    },
  },
  overview: {
    f1Setup: {
      setupOrigin: "Setup origin",
      recipeSnapshot: "Recipe snapshot",
      vesselSnapshot: "Vessel snapshot",
      fitState: "Fit state",
      fillRatio: "Fill ratio",
      setupSaved: "Setup saved",
      scratch: "scratch",
      noLinkedRecipe: "No linked recipe",
      manualVessel: "Manual vessel",
      unknown: "unknown",
      notCalculated: "Not calculated",
      guidanceMemoryEyebrow: "Setup-time guidance memory",
      guidanceMemorySummary(count: number) {
        return `Kombloom saved ${count} recommendation${count === 1 ? "" : "s"} when this batch was created.`;
      },
      appliedCount(count: number) {
        return `${count} applied`;
      },
      savedSource: "saved",
      savedRecommendation: "Saved recommendation",
      savedSetupSnapshot: "Saved with the F1 setup snapshot.",
    },
    f2Snapshot: {
      bottles: "Bottles",
      carbonation: "Carbonation",
      pressureRisk: "Pressure risk",
      ambientRoom: "Ambient room",
      recipeSnapshot: "Recipe snapshot",
      setupSaved: "Setup saved",
      unknown: "Unknown",
      savedRecipe: "Saved recipe",
    },
    secondFermentation: {
      title(chapterLabel: string) {
        return `Inside ${chapterLabel}`;
      },
      description:
        "Second Fermentation now opens as a dedicated bottling chapter, while this overview keeps the summary close to the rest of the batch story.",
      chapterEyebrow: "Second Fermentation chapter",
      chapterDescription:
        "Open the dedicated bottling setup to build bottle groups, assign flavour plans, and follow the saved F2 chapter.",
      savedSummary: "Saved F2 summary",
      readyTitle: "Bottling setup is ready to open.",
      readyDescription:
        "Build bottle groups, assign different flavour plans per group, and review the full bottling run in a dedicated setup view.",
      openSaved: "Open F2 chapter",
      openNew: "Open bottling setup",
    },
    firstFermentation: {
      title: "First Fermentation memory",
      description:
        "Keep the base recipe, timing window, and F1 reflection close by without letting old details crowd the current chapter.",
      savedSetup: "Saved First Fermentation setup",
      baseRecipe: "Base recipe",
      timingMemory: "First Fermentation timing memory",
      tastingWindow(args: { startDay: number; endDay: number }) {
        return `Tasting window: Day ${args.startDay}-${args.endDay}`;
      },
    },
    support: {
      f2ContextSummary(args: {
        bottleCount: number;
        desiredCarbonationLevel: string;
        ambientTempC: number;
      }) {
        return `${args.bottleCount} bottles planned with ${args.desiredCarbonationLevel} carbonation at ${args.ambientTempC}\u00B0C.`;
      },
    },
    recipeSnapshot: {
      tea: "Tea",
      sugar: "Sugar",
      starter: "Starter",
      volume: "Volume",
      vessel: "Vessel",
      target: "Target",
    },
  },
  completed: {
    eyebrow: "Results summary",
    title: "This batch has reached the reflection chapter",
    description:
      "Look back on how the base brew felt, how the finished drink turned out, and what you would carry into the next run.",
    firstFermentation: "First Fermentation",
    finishedBatch: "Finished batch",
    noF1Reflection: "No F1 reflection saved yet",
    noFinishedReflection: "No finished-batch reflection saved yet",
    nextTime: "What to change next time",
  },
  reminders: {
    title: "What needs attention",
    description:
      "These reminders stay near the top because they matter more than the background details right now.",
    duePrefix: "Due",
    markDone: "Mark done",
  },
  hero: {
    brewAgain: "Brew Again",
    brewAgainDescription:
      "Carry the useful parts of this batch forward without repeating the same mistakes.",
    whyKombloomIsNudgingYou: "Why Kombloom is nudging you",
    fallbackNudging:
      "The guidance here follows your saved stage, brew timing, and reminders, so you can stay calm and focus on the next useful check.",
    nextCheckSuffix(args: { statusLabel: string; nextCheckText: string }) {
      return `${args.statusLabel}. ${args.nextCheckText}.`;
    },
    day(dayNumber: number) {
      return dayNumber === 1 ? "Day" : "Days";
    },
  },
};
