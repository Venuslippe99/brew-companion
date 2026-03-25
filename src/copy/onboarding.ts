import type { BrewingGoal, ExperienceLevel } from "@/contexts/UserContext";

export const onboardingCopy = {
  steps: ["welcome", "experience", "goals", "start"] as const,
  experienceOptions: [
    {
      value: "beginner" as ExperienceLevel,
      label: "Beginner",
      emoji: "🌱",
      desc: "I'm new to kombucha brewing",
    },
    {
      value: "intermediate" as ExperienceLevel,
      label: "Intermediate",
      emoji: "🍵",
      desc: "I've brewed a few batches",
    },
    {
      value: "advanced" as ExperienceLevel,
      label: "Advanced",
      emoji: "⚗️",
      desc: "I brew regularly and want precision",
    },
  ],
  goalOptions: [
    { value: "sweeter" as BrewingGoal, label: "Sweeter kombucha" },
    { value: "balanced" as BrewingGoal, label: "Balanced flavour" },
    { value: "tart" as BrewingGoal, label: "More tart & vinegary" },
    { value: "carbonation" as BrewingGoal, label: "Stronger carbonation" },
    { value: "guided" as BrewingGoal, label: "Safer, more guided process" },
  ],
  welcome: {
    heroAlt: "Kombucha brewing",
    title: "Welcome to Kombloom",
    description:
      "Your precision kombucha companion. Track batches, get stage guidance, and brew with confidence.",
    action: "Get Started",
  },
  experience: {
    title: "Your experience level",
    description: "This adjusts how much guidance you'll see.",
  },
  goals: {
    title: "Brewing preference",
    description: "What matters most to you?",
  },
  finish: {
    emoji: "🫖",
    title: "You're all set",
    description: "Start your first batch or explore our brewing guides.",
    startFirstBatch: "Start First Batch",
    browseGuidesFirst: "Browse Guides First",
    goToDashboard: "Go to Dashboard",
  },
  actions: {
    back: "Back",
    continue: "Continue",
  },
};
