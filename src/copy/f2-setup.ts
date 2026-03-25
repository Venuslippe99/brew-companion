import type {
  F2BottleType,
  F2CarbonationLevel,
  F2GroupRecipeMode,
  F2RecipeItemDraft,
} from "@/lib/f2-types";

export const f2SetupCopy = {
  progress: {
    flowLabel: "Guided bottling flow",
    stepCounter(step: number, total: number) {
      return `Step ${step} of ${total}`;
    },
  },
  steps: [
    {
      id: 1,
      label: "Bottling volume",
      title: "How much kombucha is ready to bottle?",
      description:
        "Start with the kombucha you actually have today, then choose how much to keep aside as starter for the next batch.",
      nextLabel: "Continue to carbonation",
    },
    {
      id: 2,
      label: "Carbonation",
      title: "How fizzy do you want it to get?",
      description:
        "Set the carbonation target and the room temperature the bottles will sit in.",
      nextLabel: "Continue to bottle groups",
    },
    {
      id: 3,
      label: "Bottle groups",
      title: "Build your bottle groups",
      description:
        "Add the groups you want to bottle, then use the live fill math to see how much kombucha each one uses.",
      nextLabel: "Continue to flavour plans",
    },
    {
      id: 4,
      label: "Flavour plans",
      title: "Assign a flavour plan to each bottle group",
      description:
        "Different groups can use different recipes from the same F1 batch, including no flavour at all.",
      nextLabel: "Review bottling plan",
    },
    {
      id: 5,
      label: "Review",
      title: "This is your bottling plan.",
      description:
        "Check the group instructions, total ingredients, and pressure watchouts before you start F2.",
    },
  ] as const,
  options: {
    carbonation: [
      {
        value: "light" as F2CarbonationLevel,
        label: "Light",
        description: "A calmer, lower-pressure finish with a gentler fizz target.",
      },
      {
        value: "balanced" as F2CarbonationLevel,
        label: "Balanced",
        description: "A middle-ground target for everyday kombucha bottling.",
      },
      {
        value: "strong" as F2CarbonationLevel,
        label: "Strong",
        description: "A more active target that needs closer watch on pressure.",
      },
    ],
    bottleTypes: [
      { value: "swing_top" as F2BottleType, label: "Swing top" },
      { value: "crown_cap" as F2BottleType, label: "Crown cap" },
      { value: "screw_cap" as F2BottleType, label: "Screw cap" },
      { value: "plastic_test_bottle" as F2BottleType, label: "Plastic test bottle" },
      { value: "other" as F2BottleType, label: "Other" },
    ],
    recipeModes: [
      {
        value: "none" as F2GroupRecipeMode,
        label: "No flavour",
        description: "Bottle this group plain, with no extra ingredients.",
      },
      {
        value: "saved" as F2GroupRecipeMode,
        label: "Saved recipe",
        description: "Use one of your saved flavour recipes for this group.",
      },
      {
        value: "preset" as F2GroupRecipeMode,
        label: "Preset recipe",
        description: "Use one of the built-in flavour recipes for this group.",
      },
      {
        value: "custom" as F2GroupRecipeMode,
        label: "Custom plan",
        description: "Build a fresh flavour plan just for this group.",
      },
    ],
    ingredientForms: [
      { value: "juice" as F2RecipeItemDraft["ingredientForm"], label: "Juice" },
      { value: "puree" as F2RecipeItemDraft["ingredientForm"], label: "Puree" },
      { value: "whole_fruit" as F2RecipeItemDraft["ingredientForm"], label: "Whole fruit" },
      { value: "syrup" as F2RecipeItemDraft["ingredientForm"], label: "Syrup" },
      { value: "herbs_spices" as F2RecipeItemDraft["ingredientForm"], label: "Herbs / spices" },
      { value: "other" as F2RecipeItemDraft["ingredientForm"], label: "Other" },
    ],
    yesNo: {
      yes: "Yes",
      no: "No",
    },
  },
  common: {
    loading: "Loading F2 setup...",
    continue: "Continue",
    back: "Back",
    saving: "Saving...",
    noPlanYet: "No plan yet",
    unknown: "Unknown",
    groupFlavorPlan: "Group flavour plan",
    noAddedFlavorings: "No added flavourings",
    noExtraIngredientsForBottle: "No extra ingredients were saved for this bottle.",
    noExtraIngredientsForRun: "No extra ingredients are needed for this bottling run.",
    noNextAction: "No next action recorded.",
    noActionsForStage: "No F2 actions are available for this stage.",
    mixedBottleGroups: "Mixed bottle groups",
    noFlavour: "No flavour",
    ingredientFallback: "ingredient",
    presetIngredientPlaceholder: "Choose preset ingredient",
    chooseRecipePlaceholder: "Choose a recipe",
    groupLabel(index: number) {
      return `Group ${index + 1}`;
    },
    bottleLabel(index: number) {
      return `Bottle ${index + 1}`;
    },
    ingredientCount(count: number) {
      return `${count} ingredient${count === 1 ? "" : "s"}`;
    },
    groupCount(count: number) {
      return `${count} group${count === 1 ? "" : "s"}`;
    },
  },
  saved: {
    statusEyebrow: "Current F2 status",
    title: "Bottling setup saved",
    description:
      "This batch already has a saved F2 setup, so this chapter now focuses on the current bottling status and what to do next.",
    nextAction: {
      eyebrow: "Current next action",
      stage(stage: string) {
        return `Current stage: ${stage.replace(/_/g, " ")}`;
      },
    },
    actions: {
      heading: "F2 actions",
      checkedOneBottle: "Checked one bottle",
      needsMoreCarbonation: "Needs more carbonation",
      refrigerateNow: "Refrigerate now",
      movedToFridge: "Moved to fridge",
      markCompleted: "Mark completed",
      readyToRefrigerate: "The batch is marked as ready to refrigerate.",
      chilledReady:
        "The bottles are chilled and ready. Mark the batch complete when you want to close out the lifecycle.",
      completed: "This batch has already been marked complete.",
    },
    summary: {
      eyebrow: "Bottling summary",
      totalFromF1: "Total from F1",
      starterReserve: "Starter reserve",
      availableToBottle: "Available to bottle",
      bottles: "Bottles",
      carbonation: "Carbonation",
      pressureWatch: "Pressure watch",
      ambientRoom: "Ambient room",
      flavourPlan: "Flavour plan",
    },
    groups: {
      title: "Bottle groups and flavour plans",
      description:
        "Each group keeps its own bottle sizing, flavour identity, and created bottles together.",
      groupVolume: "Group volume",
      headspace: "Headspace",
      bottlesCreated: "Bottles created",
      showCreatedBottles: "Show created bottles",
      targetFill(group: { bottleCount: number; bottleSizeMl: number; bottleType: string; targetFillMl: number }) {
        return `${group.bottleCount} x ${group.bottleSizeMl}ml ${group.bottleType.replace(/_/g, " ")} - ${group.targetFillMl}ml target fill`;
      },
      recipeModeSummary(args: { recipeMode: string; count: number }) {
        return `${args.recipeMode} recipe${args.count > 0 ? ` - ${f2SetupCopy.common.ingredientCount(args.count)}` : ""}`;
      },
    },
  },
  setup: {
    volume: {
      totalAvailable: "Total kombucha available right now",
      totalAvailableDescription: "Use the amount you actually have ready from F1 today.",
      reserveForStarter: "Keep aside for next batch starter",
      reserveForStarterDescription: "This amount will not be bottled.",
      totalFromF1: "Total from F1",
      starterReserve: "Starter reserve",
      availableForBottling: "Available for bottling",
    },
    carbonation: {
      ambientRoomTemperature: "Ambient room temperature",
      ambientRoomDescription: "Warmer rooms usually carbonate faster and need closer attention.",
    },
    bottleGroups: {
      title: "Bottle groups",
      description: "Add one group for each bottle size or bottle style you want to use.",
      addGroup: "Add group",
      remove: "Remove",
      fields: {
        groupLabel: "Group label",
        bottleCount: "Bottle count",
        bottleSizeMl: "Bottle size (ml)",
        headspaceMl: "Headspace (ml)",
        bottleType: "Bottle type",
      },
      cards: {
        usage(volume: string) {
          return `This group uses ${volume} kombucha based on its current fill plan.`;
        },
        targetFillPerBottle: "Target fill per bottle",
        totalGroupFill: "Total group fill",
        groupKombuchaUse: "Group kombucha use",
        remaining(volume: string) {
          return `You still have ${volume} unassigned for bottling.`;
        },
        exceeds(volume: string) {
          return `This bottle plan exceeds the available bottling volume by ${volume}.`;
        },
      },
    },
    flavour: {
      intro:
        "Different groups can use different recipes from the same F1 batch. Plain bottles, saved recipes, presets, and custom plans can all live in the same run.",
      groupUsage(volume: string) {
        return `${volume} kombucha in this group`;
      },
      savedRecipe: "Saved recipe",
      presetRecipe: "Preset recipe",
      keepGuidanceOn: "Keep guidance on",
      keepGuidanceOnDescription:
        "Let the planner tune this recipe for the carbonation target.",
      useSavedAmounts: "Use saved amounts",
      useSavedAmountsDescription: "Bottle this group with the exact stored recipe amounts.",
      thisGroupWillUse(name?: string) {
        return `This group will use ${name || "this recipe"}`;
      },
      custom: {
        recipeName: "Recipe name",
        saveReusableRecipe: "Save this as a reusable recipe",
        description: "Description",
        keepGuidanceOnDescription:
          "Use flavour presets and let the planner tune the amounts.",
        editExactAmounts: "Edit exact amounts",
        editExactAmountsDescription: "Set the ingredient amounts per 500ml yourself.",
        ingredientsTitle: "Ingredients",
        ingredientsDescription: "Add the ingredients you plan to bottle with this group.",
        addIngredient: "Add ingredient",
        ingredient(index: number) {
          return `Ingredient ${index + 1}`;
        },
        guidedIngredientDescription:
          "Guidance can still tune this amount for the carbonation target.",
        exactIngredientDescription: "These are the exact amounts that will be saved.",
        remove: "Remove",
        fields: {
          presetIngredient: "Preset ingredient",
          ingredientName: "Ingredient name",
          form: "Form",
          amountPer500: "Amount per 500ml",
          unit: "Unit",
          displacesBottleVolume: "Displaces bottle volume",
          prepNotes: "Prep notes",
        },
      },
    },
    review: {
      fixBeforeStart: "Fix these before you start F2",
      totalFromF1: "Total from F1",
      starterReserve: "Starter reserve",
      availableToBottle: "Available to bottle",
      bottles: "Bottles",
      kombuchaNeeded: "Kombucha needed",
      pressureWatch: "Pressure watch",
      groupInstructions: "Per-group bottling instructions",
      groupInstructionsDescription: "This is the practical bottling plan for each group.",
      addInstruction(args: { amount: string; unit: string; ingredientName: string }) {
        return `Add ${args.amount}${args.unit} ${args.ingredientName}`;
      },
      topWith(volume: string) {
        return `Top with ${volume}ml kombucha`;
      },
      leaveHeadspace(volume: number) {
        return `Leave ${volume}ml headspace`;
      },
      groupKombucha: "Group kombucha",
      groupAdditions: "Group additions",
      groupTotalFill: "Group total fill",
      ingredientsForGroup: "Ingredients for this group",
      totalIngredientsTitle: "Total ingredients for the whole bottling run",
      totalIngredientsDescription: "These totals now reflect every bottle in every group.",
      pressureWatchouts: "Pressure watchouts",
      pressureWatchoutsDescription:
        "Use these notes as safety cues while the bottles are at room temperature.",
      startDescription:
        "Starting F2 will save the group bottle plan, store each group's flavour snapshot, create the bottles, attach ingredient rows, and update the batch into the active F2 stage.",
      startAction: "I bottled this and start F2",
      starting: "Starting F2...",
      footerHint: "Start F2 once the bottling plan looks right.",
    },
  },
  feedback: {
    toasts: {
      missingRecipe: "Could not find that recipe.",
      loadRecipe: "Could not load that recipe.",
      signInToUpdate: "You need to be signed in to update this batch.",
      updateBatch: "Could not update this batch.",
      signInToStart: "You need to be signed in to start F2.",
      fixReviewErrors: "Fix the review errors before starting F2.",
      started: "F2 setup saved and bottles created.",
      couldNotStart: "Could not start F2.",
    },
  },
};
