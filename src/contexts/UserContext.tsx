import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/use-auth";
import { BrewingGoal, ExperienceLevel, UserContext, UserPreferences } from "@/contexts/user-types";

// Map frontend goal values to DB enum values
const goalToDb: Record<BrewingGoal, string | null> = {
  sweeter: "sweeter",
  balanced: "balanced",
  tart: "tart",
  carbonation: "stronger_carbonation",
  guided: "safer_guided",
};

const dbToGoal: Record<string, BrewingGoal> = {
  sweeter: "sweeter",
  balanced: "balanced",
  tart: "tart",
  stronger_carbonation: "carbonation",
  safer_guided: "guided",
};

const defaultPreferences: UserPreferences = {
  experienceLevel: "beginner",
  brewingGoal: "balanced",
  prefersGuidedMode: true,
  darkMode: false,
  onboardingComplete: false,
  displayName: "",
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem("kombloom-preferences");
    return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
  });

  // Load profile from DB when user logs in
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setProfileLoading(true);

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (cancelled) return;
      setProfileLoading(false);

      if (data && !error) {
        const dbPrefs: Partial<UserPreferences> = {
          experienceLevel: data.experience_level as ExperienceLevel,
          brewingGoal: data.brewing_goal ? (dbToGoal[data.brewing_goal] || "balanced") : "balanced",
          prefersGuidedMode: data.prefers_guided_mode,
          darkMode: data.dark_mode,
          displayName: data.display_name || "",
          onboardingComplete: true, // If profile exists in DB, onboarding is done
        };
        setPreferences((prev) => ({ ...prev, ...dbPrefs }));
      }
    };

    loadProfile();
    return () => { cancelled = true; };
  }, [user]);

  // Persist to localStorage always
  useEffect(() => {
    localStorage.setItem("kombloom-preferences", JSON.stringify(preferences));
    if (preferences.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [preferences]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };

      // Sync to DB if authenticated
      if (user) {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.experienceLevel !== undefined) dbUpdates.experience_level = updates.experienceLevel;
        if (updates.brewingGoal !== undefined) dbUpdates.brewing_goal = goalToDb[updates.brewingGoal] || null;
        if (updates.prefersGuidedMode !== undefined) dbUpdates.prefers_guided_mode = updates.prefersGuidedMode;
        if (updates.darkMode !== undefined) dbUpdates.dark_mode = updates.darkMode;
        if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;

        if (Object.keys(dbUpdates).length > 0) {
          supabase.from("profiles").update(dbUpdates).eq("id", user.id).then();
        }
      }

      return next;
    });
  }, [user]);

  return (
    <UserContext.Provider
      value={{
        preferences,
        updatePreferences,
        isBeginner: preferences.experienceLevel === "beginner",
        isAdvanced: preferences.experienceLevel === "advanced",
        profileLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
