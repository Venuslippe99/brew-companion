import { useUser } from "@/contexts/use-user";
import type { ExperienceLevel, BrewingGoal } from "@/contexts/user-types";
import { useAuth } from "@/contexts/use-auth";
import AppLayout from "@/components/layout/AppLayout";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { Button } from "@/components/ui/button";
import { settingsCopy } from "@/copy/settings";
import { useNavigate } from "react-router-dom";
import { User, Sliders, Moon, Sun, LogOut } from "lucide-react";

const experienceLevels: { value: ExperienceLevel; label: string; desc: string }[] =
  settingsCopy.experience.options;

const goals: { value: BrewingGoal; label: string }[] = settingsCopy.goal.options;

export default function Settings() {
  const { preferences, updatePreferences } = useUser();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-3 lg:pt-4 lg:px-8 space-y-6 pb-8">
        {/* Experience Level */}
        <ScrollReveal delay={0.05}>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                {settingsCopy.experience.title}
              </h2>
            </div>
            <div className="space-y-2">
              {experienceLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => updatePreferences({ experienceLevel: level.value })}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    preferences.experienceLevel === level.value
                      ? "border-primary bg-honey-light"
                      : "border-border hover:border-primary/30 hover:bg-muted"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{level.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{level.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Brewing Goal */}
        <ScrollReveal delay={0.08}>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              {settingsCopy.goal.title}
            </h2>
            <div className="flex flex-wrap gap-2">
              {goals.map((g) => (
                <button
                  key={g.value}
                  onClick={() => updatePreferences({ brewingGoal: g.value })}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    preferences.brewingGoal === g.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Appearance */}
        <ScrollReveal delay={0.1}>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              {settingsCopy.appearance.title}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => updatePreferences({ darkMode: false })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                  !preferences.darkMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Sun className="h-4 w-4" /> {settingsCopy.appearance.light}
              </button>
              <button
                onClick={() => updatePreferences({ darkMode: true })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                  preferences.darkMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Moon className="h-4 w-4" /> {settingsCopy.appearance.dark}
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Account */}
        <ScrollReveal delay={0.12}>
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                {settingsCopy.account.title}
              </h2>
            </div>
            {user ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {preferences.displayName || settingsCopy.account.fallbackName}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Button variant="outline" onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" /> {settingsCopy.account.signOut}
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {settingsCopy.account.signedOutDescription}
                </p>
                <Button variant="outline" onClick={() => navigate("/login")}>
                  {settingsCopy.account.signIn}
                </Button>
              </>
            )}
          </div>
        </ScrollReveal>
      </div>
    </AppLayout>
  );
}
