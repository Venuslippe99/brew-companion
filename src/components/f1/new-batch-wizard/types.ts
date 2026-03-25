export const NEW_BATCH_WIZARD_STEP_IDS = [
  "volume",
  "tea",
  "sugar",
  "vessel",
  "sweetness",
  "temperature",
  "recipe",
  "finalize",
] as const;

export type NewBatchWizardStepId = (typeof NEW_BATCH_WIZARD_STEP_IDS)[number];

export type NewBatchWizardMode = "scratch" | "recipe" | "brew_again";

export type NewBatchCoachPopupTone = "info" | "caution";

export type NewBatchCoachPopup = {
  key: string;
  title: string;
  body: string;
  tone: NewBatchCoachPopupTone;
};
