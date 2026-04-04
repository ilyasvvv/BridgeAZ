// Qovshaq Phase 1A — Onboarding flow
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../utils/auth";
import { qApi } from "../utils/qApi";
import { categories } from "../utils/categories";
import QLocationPicker from "../components/QLocationPicker";
import QButton from "../components/QButton";

const steps = ["welcome", "location", "interests", "done"];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function QOnboard() {
  const { user, token, setUser } = useAuth();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [location, setLocation] = useState({
    country: "",
    countryCode: "",
    city: "",
    region: "",
  });
  const [interests, setInterests] = useState([]);
  const [saving, setSaving] = useState(false);

  const step = steps[stepIndex];

  const next = () => {
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const back = () => {
    setDirection(-1);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const toggleInterest = (id) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const updated = await qApi.completeOnboarding(
        { location, interests },
        token
      );
      setUser((prev) => ({ ...prev, ...updated, qOnboarded: true }));
      next();
      setTimeout(() => navigate("/q", { replace: true }), 1200);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center -mt-2">
      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === stepIndex ? "w-8 bg-q-primary" : i < stepIndex ? "w-1.5 bg-q-primary/40" : "w-1.5 bg-q-border"
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative overflow-x-hidden" style={{ minHeight: 350 }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full"
          >
            {step === "welcome" && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl md:text-6xl mb-4"
                >
                  {"\u{1F44B}"}
                </motion.div>
                <h1 className="font-q-display text-2xl md:text-3xl text-q-text mb-3">
                  Welcome to Qovshaq{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
                </h1>
                <p className="text-q-text-muted text-sm leading-relaxed mb-8 max-w-sm mx-auto">
                  Your gathering place for the global Azerbaijani community.
                  Let's get you set up in a few quick steps.
                </p>
                <QButton onClick={next} size="lg">
                  Let's go
                </QButton>
              </div>
            )}

            {step === "location" && (
              <div>
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">{"\u{1F30D}"}</div>
                  <h2 className="font-q-display text-xl md:text-2xl text-q-text mb-2">Where are you?</h2>
                  <p className="text-q-text-muted text-sm">
                    This helps us show you what's happening nearby
                  </p>
                </div>

                <QLocationPicker
                  value={location}
                  onChange={setLocation}
                  className="mb-8"
                />

                <div className="flex justify-between">
                  <QButton variant="ghost" onClick={back}>Back</QButton>
                  <QButton onClick={next}>
                    {location.city ? "Next" : "Skip for now"}
                  </QButton>
                </div>
              </div>
            )}

            {step === "interests" && (
              <div>
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">{"\u2728"}</div>
                  <h2 className="font-q-display text-xl md:text-2xl text-q-text mb-2">What interests you?</h2>
                  <p className="text-q-text-muted text-sm">
                    Pick a few to customize your feed
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {categories.map((cat) => {
                    const selected = interests.includes(cat.id);
                    return (
                      <motion.button
                        key={cat.id}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => toggleInterest(cat.id)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                          selected
                            ? "border-q-primary bg-q-primary-light shadow-sm"
                            : "border-q-border bg-q-surface hover:border-q-text-muted/30"
                        }`}
                      >
                        <span className="text-2xl">{cat.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-q-text">{cat.label}</div>
                          <div className="text-[11px] text-q-text-muted">{cat.description}</div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="flex justify-between">
                  <QButton variant="ghost" onClick={back}>Back</QButton>
                  <QButton onClick={handleComplete} disabled={saving}>
                    {saving ? "Saving..." : interests.length ? "Finish" : "Skip"}
                  </QButton>
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="text-5xl md:text-6xl mb-4"
                >
                  {"\u{1F389}"}
                </motion.div>
                <h2 className="font-q-display text-2xl text-q-text mb-2">You're all set!</h2>
                <p className="text-q-text-muted text-sm">
                  Taking you to your community feed...
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
