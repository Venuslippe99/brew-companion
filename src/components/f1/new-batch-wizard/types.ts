export const NEW_BATCH_WIZARD_STEPS = [
  { id: "volume", label: "Volume" },
  { id: "tea", label: "Tea" },
  { id: "sugar", label: "Sugar" },
  { id: "vessel", label: "Vessel" },
  { id: "sweetness", label: "Sweetness" },
  { id: "temperature", label: "Temperature" },
  { id: "recipe", label: "Recipe" },
  { id: "finalize", label: "Finish" },
] as const;

export type NewBatchWizardStepId = (typeof NEW_BATCH_WIZARD_STEPS)[number]["id"];

export type NewBatchWizardMode = "scratch" | "recipe" | "brew_again";

export type NewBatchCoachPopupTone = "info" | "caution";

export type NewBatchCoachPopup = {
  key: string;
  title: string;
  body: string;
  tone: NewBatchCoachPopupTone;
};
