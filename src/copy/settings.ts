import type { BrewingGoal, ExperienceLevel } from "@/contexts/UserContext";

export const settingsCopy = {
  page: {
    title: "Settings",
  },
  experience: {
    title: "Experience Level",
    options: [
      {
        value: "beginner" as ExperienceLevel,
        label: "Beginner",
        desc: "More guidance, explanations, and step help",
      },
      {
        value: "intermediate" as ExperienceLevel,
        label: "Intermediate",
        desc: "Balanced explanations and interface",
      },
      {
        value: "advanced" as ExperienceLevel,
        label: "Advanced",
        desc: "Cleaner interface, denser data",
      },
    ],
  },
  goal: {
    title: "Brewing Goal",
    options: [
      { value: "sweeter" as BrewingGoal, label: "Sweeter" },
      { value: "balanced" as BrewingGoal, label: "Balanced" },
      { value: "tart" as BrewingGoal, label: "More Tart" },
      { value: "carbonation" as BrewingGoal, label: "Strong Carbonation" },
      { value: "guided" as BrewingGoal, label: "Safer & Guided" },
    ],
  },
  appearance: {
    title: "Appearance",
    light: "Light",
    dark: "Dark",
  },
  account: {
    title: "Account",
    fallbackName: "Kombloom User",
    signedOutDescription:
      "Sign in to sync your batches across devices and access AI-powered guidance.",
    signIn: "Sign In",
    signOut: "Sign Out",
  },
};
