import React, { createContext, useContext, useState, useEffect } from "react";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type BrewingGoal = "sweeter" | "balanced" | "tart" | "carbonation" | "guided";

interface UserPreferences {
  experienceLevel: ExperienceLevel;
  brewingGoal: BrewingGoal;
  prefersGuidedMode: boolean;
  darkMode: boolean;
  onboardingComplete: boolean;
  displayName: string;
}

interface UserContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  isBeginner: boolean;
  isAdvanced: boolean;
}

const defaultPreferences: UserPreferences = {
  experienceLevel: "beginner",
  brewingGoal: "balanced",
  prefersGuidedMode: true,
  darkMode: false,
  onboardingComplete: false,
  displayName: "",
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem("brewflow-preferences");
    return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
  });

  useEffect(() => {
    localStorage.setItem("brewflow-preferences", JSON.stringify(preferences));
    if (preferences.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [preferences]);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  };

  return (
    <UserContext.Provider
      value={{
        preferences,
        updatePreferences,
        isBeginner: preferences.experienceLevel === "beginner",
        isAdvanced: preferences.experienceLevel === "advanced",
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
}
