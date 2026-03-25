import { createContext } from "react";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type BrewingGoal = "sweeter" | "balanced" | "tart" | "carbonation" | "guided";

export interface UserPreferences {
  experienceLevel: ExperienceLevel;
  brewingGoal: BrewingGoal;
  prefersGuidedMode: boolean;
  darkMode: boolean;
  onboardingComplete: boolean;
  displayName: string;
}

export interface UserContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  isBeginner: boolean;
  isAdvanced: boolean;
  profileLoading: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);
