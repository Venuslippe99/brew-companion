import { useUser, type ExperienceLevel, type BrewingGoal } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { User, Sliders, Moon, Sun, LogOut } from "lucide-react";

const experienceLevels: { value: ExperienceLevel; label: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", desc: "More guidance, explanations, and step help" },
  { value: "intermediate", label: "Intermediate", desc: "Balanced explanations and interface" },
  { value: "advanced", label: "Advanced", desc: "Cleaner interface, denser data" },
];

const goals: { value: BrewingGoal; label: string }[] = [
  { value: "sweeter", label: "Sweeter" },
  { value: "balanced", label: "Balanced" },
  { value: "tart", label: "More Tart" },
  { value: "carbonation", label: "Strong Carbonation" },
  { value: "guided", label: "Safer & Guided" },
];

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
      <div className="max-w-2xl mx-auto px-4 pt-6 lg:pt-10 lg:px-8 space-y-6 pb-8">
        <ScrollReveal>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">Settings</h1>
        </ScrollReveal>

        {/* Experience Level */}
        <ScrollReveal delay={0.05}>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Experience Level</h2>
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
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Brewing Goal</h2>
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
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Appearance</h2>
            <div className="flex gap-2">
              <button
                onClick={() => updatePreferences({ darkMode: false })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                  !preferences.darkMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Sun className="h-4 w-4" /> Light
              </button>
              <button
                onClick={() => updatePreferences({ darkMode: true })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                  preferences.darkMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Moon className="h-4 w-4" /> Dark
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Account */}
        <ScrollReveal delay={0.12}>
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Account</h2>
            </div>
            {user ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {preferences.displayName || "BrewFlow User"}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Button variant="outline" onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Sign in to sync your batches across devices and access AI-powered guidance.
                </p>
                <Button variant="outline" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
              </>
            )}
          </div>
        </ScrollReveal>
      </div>
    </AppLayout>
  );
}
