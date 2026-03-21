import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, type ExperienceLevel, type BrewingGoal } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, ChevronRight, ChevronLeft } from "lucide-react";
import kombuchaHero from "@/assets/kombucha-hero.jpg";

const steps = ["welcome", "experience", "goals", "start"];

const experienceOptions: { value: ExperienceLevel; label: string; emoji: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", emoji: "🌱", desc: "I'm new to kombucha brewing" },
  { value: "intermediate", label: "Intermediate", emoji: "🍵", desc: "I've brewed a few batches" },
  { value: "advanced", label: "Advanced", emoji: "⚗️", desc: "I brew regularly and want precision" },
];

const goalOptions: { value: BrewingGoal; label: string }[] = [
  { value: "sweeter", label: "Sweeter kombucha" },
  { value: "balanced", label: "Balanced flavour" },
  { value: "tart", label: "More tart & vinegary" },
  { value: "carbonation", label: "Stronger carbonation" },
  { value: "guided", label: "Safer, more guided process" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updatePreferences } = useUser();
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<ExperienceLevel>("beginner");
  const [goal, setGoal] = useState<BrewingGoal>("balanced");

  const finish = (path: string) => {
    updatePreferences({
      experienceLevel: experience,
      brewingGoal: goal,
      onboardingComplete: true,
      prefersGuidedMode: experience === "beginner",
    });
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-6"
            >
              <img src={kombuchaHero} alt="Kombucha brewing" className="w-full max-w-[200px] mx-auto rounded-2xl shadow-lg shadow-primary/10 mb-2" />
              <div className="h-14 w-14 rounded-2xl bg-honey-light flex items-center justify-center mx-auto">
                <FlaskConical className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-semibold text-foreground">Welcome to BrewFlow</h1>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  Your precision kombucha companion. Track batches, get stage guidance, and brew with confidence.
                </p>
              </div>
              <Button size="xl" className="w-full" onClick={() => setStep(1)}>
                Get Started <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="experience"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-display text-2xl font-semibold text-foreground">Your experience level</h2>
                <p className="text-sm text-muted-foreground mt-1">This adjusts how much guidance you'll see.</p>
              </div>
              <div className="space-y-3">
                {experienceOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setExperience(opt.value)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      experience === opt.value
                        ? "border-primary bg-honey-light"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{opt.emoji}</span>
                      <div>
                        <p className="font-medium text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(2)} className="flex-1">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-display text-2xl font-semibold text-foreground">Brewing preference</h2>
                <p className="text-sm text-muted-foreground mt-1">What matters most to you?</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {goalOptions.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGoal(g.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      goal === g.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="start"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-6"
            >
              <div className="h-16 w-16 rounded-2xl bg-sage-light flex items-center justify-center mx-auto">
                <span className="text-3xl">🫖</span>
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-foreground">You're all set</h2>
                <p className="text-muted-foreground mt-2">
                  Start your first batch or explore our brewing guides.
                </p>
              </div>
              <div className="space-y-3">
                <Button size="xl" className="w-full" onClick={() => finish("/new-batch")}>
                  Start First Batch
                </Button>
                <Button variant="outline" size="lg" className="w-full" onClick={() => finish("/guides")}>
                  Browse Guides First
                </Button>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => finish("/")}>
                  Go to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
