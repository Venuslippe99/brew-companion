import type {
  NewBatchWizardMode,
  NewBatchWizardStepId,
} from "@/components/f1/new-batch-wizard/types";
import type { F1TargetPreference } from "@/lib/f1-recipe-types";
import type { F1VesselFitResult } from "@/lib/f1-vessel-fit";

export const f1NewBatchCopy = {
  page: {
    saveRecipeDialog: {
      title: "Save this setup as a recipe",
      description:
        "Save the starting point you want to reuse later. Today's batch is still its own brew.",
      submitLabel: "Save recipe",
    },
  },
  header: {
    title: "Start a new batch",
    description: "Set up today's first fermentation one question at a time.",
    exitAriaLabel: "Exit setup",
    modeBadge(args: {
      mode: NewBatchWizardMode;
      recipeName?: string | null;
      brewAgainName?: string | null;
    }) {
      if (args.mode === "recipe" && args.recipeName) {
        return `Saved recipe: ${args.recipeName}`;
      }

      if (args.mode === "brew_again" && args.brewAgainName) {
        return `Brew again: ${args.brewAgainName}`;
      }

      return "Starting from scratch";
    },
  },
  progress: {
    stepOrder: [
      { id: "volume", label: "Volume" },
      { id: "tea", label: "Tea" },
      { id: "sugar", label: "Sugar" },
      { id: "vessel", label: "Vessel" },
      { id: "sweetness", label: "Sweetness" },
      { id: "temperature", label: "Temperature" },
      { id: "recipe", label: "Recipe" },
      { id: "finalize", label: "Finish" },
    ] as const satisfies ReadonlyArray<{ id: NewBatchWizardStepId; label: string }>,
    stepCounter(step: number, total: number) {
      return `Step ${step} of ${total}`;
    },
  },
  footer: {
    back: "Back",
    working: "Working...",
  },
  coachPopup: {
    dismiss: "Dismiss",
    vesselOverfilled: {
      title: "This vessel looks too full",
      body: "The planned volume is above the vessel's recommended fill. A slightly smaller batch or a roomier vessel will feel calmer to manage.",
    },
    vesselTight: {
      title: "This vessel is getting close to full",
      body: "This setup is still workable, but it is close to the vessel's recommended fill. A slightly smaller batch may feel calmer to manage.",
    },
    sugarOther: {
      title: "This sugar needs a manual amount later",
      body: "The app can keep the sweetness target, but you'll choose the exact sugar grams yourself in the recipe step.",
    },
    sugarHoney: {
      title: "Honey is treated as a starting point",
      body: "Honey changes the sugar conversion a bit, so treat the grams you see later as a starting point rather than a hard rule.",
    },
    vesselMaterial: {
      title: "This vessel material deserves a closer look",
      body: "It may still work, but it is worth double-checking that the material is food-safe and comfortable for acidic kombucha.",
    },
    tempCool: {
      title: "This room looks a little cool",
      body: "Cooler batches often hold onto sweetness longer, so expect a gentler pace rather than a fixed schedule.",
    },
    tempWarm: {
      title: "This room looks a little warm",
      body: "Warmer batches often move faster, so it may help to start tasting a bit earlier rather than assuming a longer window.",
    },
    teaLessStandard: {
      title: "This tea is workable, just less standard",
      body: "The app can still build a recipe around it, but black or green are a little easier to compare against the most familiar kombucha patterns.",
    },
    recipeUnknownLineage: {
      title: "The starter line is being treated conservatively",
      body: "Because this culture line is unknown, the starter recommendation is being kept a little higher as a calmer starting point.",
    },
    overrideDrift: {
      title: "Your recipe has moved away from the starting point",
      body: "That can still work, but the batch will be less like the app's recommended baseline from your answers and history.",
    },
  },
  steps: {
    volume: {
      title: "What final batch size do you want to make?",
      description:
        "This is your final kombucha amount, including starter. The recipe will be built inside that total.",
      startingPoint: {
        eyebrow: "Starting point",
        summary(args: {
          mode: NewBatchWizardMode;
          recipeName?: string | null;
          brewAgainName?: string | null;
        }) {
          if (args.mode === "recipe" && args.recipeName) {
            return `Using ${args.recipeName} as the starting point.`;
          }

          if (args.mode === "brew_again" && args.brewAgainName) {
            return `Using ${args.brewAgainName} as the starting point.`;
          }

          return "Starting from scratch.";
        },
        startFromScratch: "Start from scratch",
        useSavedRecipe: "Use saved recipe",
        useBrewAgain: "Use brew again",
      },
      presets: [
        { label: "2L", value: 2000 },
        { label: "3.8L", value: 3800 },
        { label: "5L", value: 5000 },
        { label: "8L", value: 8000 },
      ] as const,
      fields: {
        finalBatchVolume: "Final batch volume (ml)",
      },
      starterLink: {
        eyebrow: "Optional starter link",
        description:
          "Add this if a previous batch is actually feeding today's brew. It helps the recipe use the right culture line from the beginning.",
      },
    },
    tea: {
      title: "What tea do you want to use?",
      description:
        "Choose the tea base first. The app will calculate how much tea to use after the core questions are done.",
    },
    sugar: {
      title: "What sugar do you want to use?",
      description:
        "Choose the sweetener first. The app will convert the target sweetness into a starting F1 recommendation next.",
    },
    sweetness: {
      title: "How sweet do you want the finished batch to feel?",
      description: "This helps set the starting sugar target and the rough tasting pace.",
      optionDescriptions: {
        tart: "A drier, sharper finish.",
        balanced: "A steady middle ground for most batches.",
        sweeter: "A softer, sweeter finish to start from.",
      } as Record<F1TargetPreference, string>,
    },
    temperature: {
      title: "What room temperature do you expect?",
      description:
        "A rough average is enough. It helps the app frame how quickly this batch may move.",
      averageRoomTemp: "Average room temperature (\u00B0C)",
    },
    vessel: {
      title: "What are you brewing in?",
      description:
        "Choose the vessel for today so the fit can be checked before the recipe is shown.",
      currentVessel: "Current vessel",
      fitStatus(fitState: F1VesselFitResult["fitState"]) {
        return fitState ? fitState.replace("_", " ") : "Add capacity to check fit";
      },
      actions: {
        chooseSaved: "Choose saved vessel",
        hideCustom: "Hide custom vessel",
        useCustom: "Use a custom vessel",
        saveToLibrary: "Save to vessel library",
        saving: "Saving...",
        useToday: "Use these details today",
      },
      fields: {
        vesselName: "Vessel name",
        vesselNamePlaceholder: "4L kitchen jar",
        material: "Material",
        capacity: "Capacity (ml)",
        maxFill: "Recommended max fill (ml)",
        optional: "Optional",
        materials: {
          glass: "Glass",
          ceramic_glazed_food_safe: "Glazed food-safe ceramic",
          food_grade_plastic: "Food-grade plastic",
          unknown_plastic: "Unknown plastic",
          stainless_steel: "Stainless steel",
          reactive_metal: "Reactive metal",
          other: "Other",
        },
      },
    },
    recipe: {
      title: "Your recommended F1 recipe",
      emptyDescription:
        "Finish the core setup questions first so the app can build a recipe for you.",
      description: "Here's the recipe to brew. Your final batch size already includes the starter.",
      summary: {
        finalBatchVolume: "Final batch volume",
        freshTeaToBrew: "Fresh tea to brew",
        starterToAdd: "Starter to add",
        estimatedFirstTaste: "Estimated first taste",
        fallbackTasteWindow: "Day 6-9",
        fallbackTasteWindowDescription: "A rough first tasting window",
      },
      composition: {
        tea: "Tea",
        teaBags(count: number) {
          return `About ${count} tea bags`;
        },
        sugar: "Sugar",
        chooseManually: "Choose manually",
        manualSugarNeeded: "This sugar type needs a manual amount.",
        sugarTarget(gpl: number) {
          return `${gpl} g/L starting target`;
        },
      },
      adjustments: {
        title: "Manual adjustments",
        description: "Only open this if you want to change the recommendation.",
        adjustedBadge: "Adjusted from recommendation",
        hideManualEdits: "Hide manual edits",
        adjustManually: "Adjust manually",
        fields: {
          tea: "Tea (g)",
          sugar: "Sugar (g)",
          starter: "Starter (ml)",
          required: "Required",
          manualSugarRequired:
            "Add the sugar grams you want to use before you continue.",
        },
        overrideSummary(args: {
          chosenFreshTeaVolumeMl: number;
          chosenStarterMl: number;
          finalBatchVolumeMl: number;
        }) {
          return `Brewing ${args.chosenFreshTeaVolumeMl}ml fresh sweet tea, then adding ${args.chosenStarterMl}ml starter for a final ${args.finalBatchVolumeMl}ml batch.`;
        },
      },
      actions: {
        whyThisRecipe: "Why this recipe",
        moreContext: "More context",
      },
      dialogs: {
        calculation: {
          title: "Why this recipe",
          description:
            "The recommendation starts from your answers, then folds in lineage, history, and any caution flags.",
          cautionTitle: "Worth checking",
        },
        context: {
          title: "More context",
          description: "Extra notes from similar batches and supporting setup guidance.",
          eyebrow: "Extra notes",
          sectionTitle: "A little more context",
          sectionDescription: "These notes stay secondary to the recipe itself.",
          empty: "No extra notes are needed for this setup right now.",
        },
      },
    },
    finalize: {
      title: "Final details and start batch",
      description: "Add the last details, then start the batch.",
      recipeSummary(setup: {
        totalVolumeMl: number;
        teaAmountValue: number;
        teaType: string;
        sugarG: number;
        sugarType: string;
        starterLiquidMl: number;
      }) {
        return `Recipe: ${setup.totalVolumeMl}ml, ${setup.teaAmountValue}g ${setup.teaType.toLowerCase()}, ${setup.sugarG}g ${setup.sugarType.toLowerCase()}, ${setup.starterLiquidMl}ml starter.`;
      },
      fields: {
        batchName: "Batch name",
        batchNamePlaceholder: "Saturday black tea batch",
        brewDate: "Brew date",
        setupNotes: "Setup notes (optional)",
        setupNotesPlaceholder: "Anything worth noting about this brew day.",
        initialPh: "Initial pH (optional)",
        optional: "Optional",
      },
      save: {
        title: "Save this setup for later",
        description: "Optional.",
        action: "Save as recipe",
      },
    },
  },
  hook: {
    stepHelperText(step: NewBatchWizardStepId, args: {
      fitState: F1VesselFitResult["fitState"];
      requiresManualSugar: boolean;
    }) {
      switch (step) {
        case "volume":
          return "Choose the final batch size first. Starter is included inside that total.";
        case "tea":
          return "Choose the tea base before the app decides how much tea to recommend.";
        case "sugar":
          return "Choose the sweetener now. The grams come later.";
        case "vessel":
          return args.fitState === "overfilled"
            ? "This vessel looks too full for the planned batch size."
            : "This step checks what today's batch is actually going into.";
        case "sweetness":
          return "This sets the starting sugar target, not the final tasting outcome.";
        case "temperature":
          return "A rough average is enough. The app uses it as an estimate, not a promise.";
        case "recipe":
          return args.requiresManualSugar
            ? "Add the sugar grams you want to use before you continue."
            : "Review the recipe first. Open the extra reasoning only if you want it.";
        case "finalize":
          return "Add the final details you want saved with today's brew.";
        default:
          return "";
      }
    },
    primaryLabel(step: NewBatchWizardStepId) {
      switch (step) {
        case "volume":
          return "Continue to tea";
        case "tea":
          return "Continue to sugar";
        case "sugar":
          return "Continue to vessel";
        case "vessel":
          return "Continue to taste target";
        case "sweetness":
          return "Continue to temperature";
        case "temperature":
          return "Show my recipe";
        case "recipe":
          return "Continue to final details";
        case "finalize":
          return "Start batch";
        default:
          return "Continue";
      }
    },
    toasts: {
      finishRecipeFirst: "Finish the recipe first so there is something to save.",
      signInToSaveRecipe: "Sign in first so the recipe can be saved.",
      recipeSaved: "Recipe saved. You can reuse this starting point next time.",
      signInToSaveVessel: "Sign in first so the vessel can be saved.",
      vesselSaved: "Vessel saved. You can reuse it next time.",
      signInToStartBatch: "Sign in first so the batch can be started.",
      finishRecipeBeforeStart: "Finish the recipe before you start the batch.",
      addBatchName: "Add a batch name before you start the batch.",
      chooseBrewDate: "Choose the brew date before you start the batch.",
      vesselTooFull:
        "This vessel looks too full for the planned volume. Adjust the batch size or switch vessels first.",
      batchStarted: "Batch started.",
      saveSnapshotFailure(errorMessage?: string) {
        return errorMessage
          ? `Batch started, but the detailed F1 setup snapshot could not be saved: ${errorMessage}`
          : "Batch started, but the detailed F1 setup snapshot could not be saved.";
      },
    },
  },
  starterSourceSelector: {
    title: "Starter culture for this brew",
    description:
      "Link a previous batch only if its starter liquid or culture is actually feeding this brew today.",
    fieldLabel: "Which batch is feeding this brew?",
    noLinkedStarter: "No linked starter batch",
    bestMatch: "Best match",
    optionBestMatchSuffix: " (best match)",
    loading: "Loading past batches you can link here...",
    empty:
      "No previous batches are in a clearly reusable stage yet, so the app is keeping this brew on the conservative side for now.",
    selectedDescription:
      "This gives the recipe a real culture line to work from if your tea, sugar, or starter choices change from the last linked batch.",
  },
};
