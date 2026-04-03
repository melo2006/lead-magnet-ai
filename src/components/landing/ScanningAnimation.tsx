import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, CheckCircle, Globe, MessageSquare, Mic, PhoneCall, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const featureSlides = [
  {
    icon: Globe,
    eyebrow: "Live website preview",
    title: "See the real website first",
    description:
      "The demo loads the actual site first, then layers Aspen on top so the experience feels real in seconds instead of feeling like a mockup.",
    benefits: ["Fast first impression", "Interactive preview", "No waiting on a rebuild"],
  },
  {
    icon: Mic,
    eyebrow: "Voice AI",
    title: "Answer calls like a real receptionist",
    description:
      "Aspen sounds human, handles common questions, qualifies callers, and keeps the conversation moving instead of sending leads to voicemail.",
    benefits: ["24/7 phone coverage", "Natural conversations", "Lead qualification"],
  },
  {
    icon: MessageSquare,
    eyebrow: "Chat AI",
    title: "Convert visitors even after hours",
    description:
      "The chat assistant replies instantly, captures intent, and collects contact info so your team wakes up to warmer leads instead of missed opportunities.",
    benefits: ["Instant replies", "Contact capture", "Smarter follow-up"],
  },
  {
    icon: PhoneCall,
    eyebrow: "Warm transfer",
    title: "Route hot leads to a human live",
    description:
      "When someone is ready to talk now, Aspen can tee up a live handoff so momentum stays high and the lead does not go cold.",
    benefits: ["Live handoff", "Less drop-off", "Faster close path"],
  },
  {
    icon: Sparkles,
    eyebrow: "Conversion lift",
    title: "Sharper site, better follow-up, stronger trust",
    description:
      "A cleaner website experience plus instant AI response creates the premium first impression that helps more visitors turn into booked calls.",
    benefits: ["Premium feel", "Better conversion", "More trust signals"],
  },
  {
    icon: Bot,
    eyebrow: "AI demo engine",
    title: "Aspen keeps learning the business in the background",
    description:
      "While the preview loads, Aspen keeps pulling site details, brand cues, and service context so the voice and chat demos feel more specific.",
    benefits: ["Business context", "Brand-aware demo", "Stronger answers"],
  },
] as const;

const SLIDE_DURATION = 2600;

interface ScanningAnimationProps {
  websiteUrl: string;
  onComplete: () => void;
  mode?: "timed" | "continuous";
}

const ScanningAnimation = ({ websiteUrl, onComplete, mode = "timed" }: ScanningAnimationProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setCurrentStep(0);
    setProgress(0);

    if (mode === "continuous") {
      const interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % featureSlides.length);
      }, SLIDE_DURATION);

      return () => clearInterval(interval);
    }

    let stepTimeout: ReturnType<typeof setTimeout>;
    let progressInterval: ReturnType<typeof setInterval>;
    let elapsed = 0;
    const totalDuration = featureSlides.length * SLIDE_DURATION;

    progressInterval = setInterval(() => {
      elapsed += 50;
      const pct = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(pct);
    }, 50);

    const advanceSteps = (stepIndex: number) => {
      if (stepIndex >= featureSlides.length) {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(onComplete, 600);
        return;
      }

      setCurrentStep(stepIndex);
      stepTimeout = setTimeout(() => advanceSteps(stepIndex + 1), SLIDE_DURATION);
    };

    advanceSteps(0);

    return () => {
      clearTimeout(stepTimeout);
      clearInterval(progressInterval);
    };
  }, [mode, onComplete]);

  const activeSlide = featureSlides[currentStep] ?? featureSlides[0];
  const CurrentIcon = activeSlide.icon || CheckCircle;
  const showTimedProgress = mode === "timed";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto w-full max-w-3xl text-center"
    >
      <div className="rounded-[2rem] border border-border bg-card/95 p-6 shadow-xl sm:p-8">
        <div className="mx-auto mb-3 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
          Aspen demo builder
        </div>

        <h2 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Building a live AI demo around the real website
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          While Aspen loads <span className="font-medium text-foreground">{websiteUrl}</span>, here’s what the demo is designed to show your leads.
        </p>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-8"
        >
          <div className="rounded-[1.75rem] border border-border bg-background/70 p-5 text-left shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                {showTimedProgress && progress >= 100 ? (
                  <CheckCircle className="h-8 w-8 text-primary" />
                ) : (
                  <CurrentIcon className="h-8 w-8 text-primary" />
                )}
              </div>

              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  {activeSlide.eyebrow}
                </p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h3 className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">
                      {showTimedProgress && progress >= 100 ? "Demo assets ready" : activeSlide.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                      {showTimedProgress && progress >= 100
                        ? "The preview is ready — Aspen can now show the website, voice AI, chat AI, and follow-up experience together."
                        : activeSlide.description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(showTimedProgress && progress >= 100
                    ? ["Website ready", "Voice AI ready", "Chat AI ready"]
                    : activeSlide.benefits
                  ).map((benefit) => (
                    <span
                      key={benefit}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {showTimedProgress && (
          <div className="mt-6">
            <Progress value={progress} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">{Math.round(progress)}%</p>
          </div>
        )}

        {!showTimedProgress && (
          <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
            Preparing live preview, AI voice, chat, and transfer flow…
          </div>
        )}

        <div className="mt-6 flex justify-center gap-2">
          {featureSlides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentStep ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ScanningAnimation;
