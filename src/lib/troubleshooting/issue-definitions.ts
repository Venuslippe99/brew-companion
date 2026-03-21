import type {
  TroubleshootingIssueDefinition,
  TroubleshootingIssueId,
  TroubleshootingQuestionContext,
  TroubleshootingQuestionDefinition,
} from "@/lib/troubleshooting/types";

function needsManualStage(context: TroubleshootingQuestionContext) {
  return !context.batch;
}

function needsManualDays(context: TroubleshootingQuestionContext) {
  return !context.timing;
}

function stageQuestion(label = "What stage is this batch in?"): TroubleshootingQuestionDefinition {
  return {
    id: "stage",
    label,
    input: "single_select",
    required: true,
    options: [
      { value: "f1", label: "F1", description: "Still in the main jar" },
      { value: "f2", label: "F2", description: "Already bottled for carbonation" },
      { value: "refrigerated", label: "Refrigerated", description: "Already chilled" },
    ],
    shouldShow: needsManualStage,
  };
}

function daysQuestion(label: string): TroubleshootingQuestionDefinition {
  return {
    id: "days_elapsed",
    label,
    input: "number",
    required: true,
    min: 1,
    max: 60,
    step: 1,
    unitLabel: "days",
    placeholder: "Days",
    shouldShow: needsManualDays,
  };
}

function measuredPhQuestion(): TroubleshootingQuestionDefinition {
  return {
    id: "measured_ph",
    label: "Have you measured pH? If yes, what is it?",
    input: "number",
    min: 1,
    max: 7,
    step: 0.1,
    unitLabel: "pH",
    placeholder: "Optional",
  };
}

function smellQuestion(): TroubleshootingQuestionDefinition {
  return {
    id: "smell",
    label: "How does it smell?",
    input: "single_select",
    required: true,
    options: [
      { value: "normal_acidic", label: "Normal and acidic" },
      { value: "mostly_sweet", label: "Mostly like sweet tea" },
      { value: "rotten_off", label: "Rotten or unusual" },
    ],
  };
}

function moldConcernQuestion(): TroubleshootingQuestionDefinition {
  return {
    id: "visible_mold_concern",
    label: "Do you see fuzz or unusual colored surface growth?",
    input: "single_select",
    required: true,
    options: [
      { value: "no", label: "No" },
      { value: "not_sure", label: "Not sure" },
      { value: "yes", label: "Yes" },
    ],
  };
}

const troubleshootingIssues: TroubleshootingIssueDefinition[] = [
  {
    id: "too_sour",
    title: "Too sour",
    shortLabel: "Too sour",
    summary: "Figure out whether your batch is simply over-fermented or showing another warning sign.",
    getQuestions: () => [
      stageQuestion("What stage is this batch in?"),
      {
        id: "smell",
        label: "Does it smell normal and acidic, or rotten or unusual?",
        input: "single_select",
        required: true,
        options: [
          { value: "normal_acidic", label: "Normal and acidic" },
          { value: "rotten_off", label: "Rotten or unusual" },
        ],
      },
      moldConcernQuestion(),
      {
        id: "sourness_level",
        label: "Which best matches what you are tasting?",
        input: "single_select",
        required: true,
        options: [
          { value: "more_sour_than_wanted", label: "More sour than I wanted" },
          { value: "sharp_vinegar_like", label: "Very sharp or vinegar-like" },
        ],
      },
      measuredPhQuestion(),
    ],
  },
  {
    id: "too_sweet_or_not_fermenting",
    title: "Too sweet / not fermenting enough",
    shortLabel: "Too sweet",
    summary: "Check whether the batch is simply early or whether it needs a safer next check.",
    getQuestions: () => [
      stageQuestion("Is this batch in F1 or F2?"),
      daysQuestion("How many days has it been fermenting or bottled?"),
      smellQuestion(),
      moldConcernQuestion(),
      measuredPhQuestion(),
      {
        id: "room_temp_band",
        label: "How warm has the room been?",
        input: "single_select",
        required: true,
        options: [
          { value: "cool", label: "Cool" },
          { value: "moderate", label: "Moderate" },
          { value: "warm", label: "Warm" },
        ],
      },
    ],
  },
  {
    id: "no_carbonation",
    title: "No carbonation / very flat",
    shortLabel: "No carbonation",
    summary: "Check whether flatness is just a process issue or whether another warning sign is involved.",
    getQuestions: () => [
      {
        id: "sealed_now",
        label: "Is it bottled and sealed right now?",
        input: "single_select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      daysQuestion("How many days has it been in F2?"),
      {
        id: "already_refrigerated",
        label: "Is it already refrigerated?",
        input: "single_select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "f2_additions",
        label: "Did you add fruit, juice, sugar, or another fermentable flavoring?",
        input: "single_select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "seal_confidence",
        label: "Do the bottles seem well sealed?",
        input: "single_select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "not_sure", label: "Not sure" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "looks_smells_normal",
        label: "Does it otherwise smell and look normal?",
        input: "single_select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
  {
    id: "too_much_carbonation",
    title: "Too much carbonation / pressure seems high",
    shortLabel: "Too much carbonation",
    summary: "Take the safest next step for pressure risk in sealed F2 bottles.",
    getQuestions: () => [
      {
        id: "sealed_now",
        label: "Is it bottled and sealed right now?",
        input: "single_select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "pressure_state",
        label: "What are the bottles doing?",
        input: "single_select",
        required: true,
        options: [
          { value: "firm_only", label: "Firm but not alarming" },
          { value: "hard_or_bulging", label: "Very hard or bulging" },
          { value: "leaking_or_spraying", label: "Leaking or spraying" },
        ],
      },
      daysQuestion("How many days has it been in F2?"),
      {
        id: "already_refrigerated",
        label: "Is it already refrigerated?",
        input: "single_select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "f2_additions",
        label: "Did you add fruit, juice, or sugar in F2?",
        input: "single_select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "warm_room",
        label: "Has it been in a warm room?",
        input: "single_select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
    ],
  },
  {
    id: "not_sure_if_ready",
    title: "Not sure if ready",
    shortLabel: "Not sure if ready",
    summary: "Use the current stage and timing window to judge readiness without pretending timing is exact.",
    getQuestions: () => [
      stageQuestion("Is this batch in F1 or F2?"),
      {
        id: "taste_impression",
        label: "Which best matches what you taste or observe?",
        input: "single_select",
        required: true,
        options: [
          { value: "still_sweet", label: "Still sweet" },
          { value: "balanced_tang", label: "Balanced tang" },
          { value: "very_sour", label: "Very sour" },
          { value: "carbonation_right", label: "Carbonation feels right" },
          { value: "not_enough_carbonation", label: "Not enough carbonation" },
        ],
      },
      {
        id: "already_refrigerated",
        label: "Is it already refrigerated?",
        input: "single_select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "checked_bottle_today",
        label: "If this is F2, have you checked a bottle today?",
        input: "single_select",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
        shouldShow: (context) =>
          context.batch?.currentStage === "f2_active" || context.answers.stage === "f2",
      },
      measuredPhQuestion(),
    ],
  },
  {
    id: "strange_strands_or_sediment",
    title: "Strange strands / sediment / new layer",
    shortLabel: "Strange strands",
    summary: "Distinguish common yeast or pellicle changes from the visual signs that need more caution.",
    getQuestions: () => [
      {
        id: "where_seen",
        label: "Where are you seeing it?",
        input: "single_select",
        required: true,
        options: [
          { value: "submerged", label: "Submerged" },
          { value: "surface", label: "On the surface" },
          { value: "both", label: "Both" },
        ],
      },
      {
        id: "texture",
        label: "What does it look like?",
        input: "single_select",
        required: true,
        options: [
          { value: "stringy", label: "Stringy" },
          { value: "sediment", label: "Sediment-like" },
          { value: "smooth_layer", label: "Smooth new layer" },
          { value: "fuzzy", label: "Fuzzy or furry" },
        ],
      },
      {
        id: "color",
        label: "What color is it?",
        input: "single_select",
        required: true,
        options: [
          { value: "cream_tan_brown", label: "Cream, tan, or brown" },
          { value: "smooth_white", label: "Smooth white" },
          { value: "unusual_color", label: "Green, blue, black, or another unusual color" },
        ],
      },
      smellQuestion(),
      stageQuestion("Is this in F1 or F2?"),
    ],
  },
  {
    id: "mold_concern",
    title: "Mold concern",
    shortLabel: "Mold concern",
    summary: "Bias toward caution when the surface looks fuzzy, dry, or unusually colored.",
    getQuestions: () => [
      {
        id: "surface_growth",
        label: "Is the growth on the surface?",
        input: "single_select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "surface_texture",
        label: "Does it look fuzzy, furry, or dry?",
        input: "single_select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "surface_color",
        label: "What color is it?",
        input: "single_select",
        required: true,
        options: [
          { value: "white_or_cream", label: "White or cream" },
          { value: "green_blue_black", label: "Green, blue, black, or another unusual color" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "smooth_or_fuzzy",
        label: "Can you tell whether this is a smooth wet layer or dry fuzzy spots?",
        input: "single_select",
        required: true,
        options: [
          { value: "smooth_wet_layer", label: "Smooth wet layer" },
          { value: "dry_fuzzy_spots", label: "Dry fuzzy spots" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      smellQuestion(),
    ],
  },
];

export function getTroubleshootingIssues() {
  return troubleshootingIssues;
}

export function getTroubleshootingIssueDefinition(issueId: TroubleshootingIssueId) {
  return troubleshootingIssues.find((issue) => issue.id === issueId);
}
