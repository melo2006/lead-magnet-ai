import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Globe, MessageSquare, Mic, PhoneCall, Sparkles, Search } from "lucide-react";

const scanSteps = [
  {
    icon: Search,
    label: "Scanning website content",
    detail: "Reading pages, services, and contact info…",
  },
  {
    icon: Globe,
    label: "Analyzing your online presence",
    detail: "Capturing screenshots and brand details…",
  },
  {
    icon: Mic,
    label: "Preparing Voice AI demo",
    detail: "A new way to never miss a customer call.",
  },
  {
    icon: MessageSquare,
    label: "Setting up Chat AI",
    detail: "Instant answers turn visitors into captured leads.",
  },
  {
    icon: PhoneCall,
    label: "Enabling warm transfers",
    detail: "Hot leads get connected to a human—fast.",
  },
  {
    icon: Sparkles,
    label: "Finalizing your live demo",
    detail: "See how AI captures leads you're missing today.",
  },
] as const;

const STEP_DURATION = 2200;

interface ScanningAnimationProps {
  websiteUrl: string;
  businessName?: string;
  onComplete: () => void;
  onCancel?: () => void;
  mode?: "timed" | "continuous";
}

const getWebsiteLabel = (websiteUrl: string) => {
  try {
    const normalizedUrl = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
    return new URL(normalizedUrl).hostname.replace(/^www\./, "");
  } catch {
    return websiteUrl;
  }
};

const ScanningAnimation = ({
  websiteUrl,
  businessName,
  onComplete,
  onCancel,
  mode = "timed",
}: ScanningAnimationProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setCurrentStep(0);
    setProgress(0);

    if (mode === "continuous") {
      const intervalId = window.setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % scanSteps.length);
      }, STEP_DURATION);
      const progressId = window.setInterval(() => {
        setProgress((p) => {
          if (p >= 88) return 88;
          if (p < 35) return p + 0.35;
          if (p < 60) return p + 0.2;
          if (p < 78) return p + 0.12;
          return p + 0.06;
        });
      }, 120);
      return () => {
        window.clearInterval(intervalId);
        window.clearInterval(progressId);
      };
    }

    let stepTimeout: number | undefined;
    let progressInterval: number | undefined;
    let elapsed = 0;
    const totalDuration = scanSteps.length * STEP_DURATION;

    progressInterval = window.setInterval(() => {
      elapsed += 50;
      setProgress(Math.min((elapsed / totalDuration) * 100, 100));
    }, 50);

    const advanceSteps = (stepIndex: number) => {
      if (stepIndex >= scanSteps.length) {
        if (progressInterval) window.clearInterval(progressInterval);
        setProgress(100);
        window.setTimeout(() => onCompleteRef.current(), 400);
        return;
      }
      setCurrentStep(stepIndex);
      stepTimeout = window.setTimeout(() => advanceSteps(stepIndex + 1), STEP_DURATION);
    };

    advanceSteps(0);

    return () => {
      if (stepTimeout) window.clearTimeout(stepTimeout);
      if (progressInterval) window.clearInterval(progressInterval);
    };
  }, [businessName, mode, websiteUrl]);

  const activeStep = scanSteps[currentStep] ?? scanSteps[0];
  const websiteLabel = getWebsiteLabel(websiteUrl);
  const displayName = businessName?.trim() || websiteLabel;
  const isComplete = mode === "timed" && progress >= 100;
  const StepIcon = isComplete ? CheckCircle : activeStep.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto flex w-full max-w-md items-center justify-center px-4"
    >
      <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card/95 px-4 py-5 shadow-xl sm:rounded-3xl sm:px-6 sm:py-6">
        {/* Glow */}
        <div className="absolute left-1/2 top-0 h-20 w-20 -translate-x-1/2 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative flex flex-col items-center text-center">
          {/* Eyebrow */}
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-primary sm:text-[10px]">
            Building your live demo
          </p>

          {/* Business name */}
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {displayName}
          </h2>
          {displayName.toLowerCase() !== websiteLabel.toLowerCase() && (
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {websiteLabel}
            </p>
          )}

          {/* Animated icon */}
          <div className="relative mt-4 flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.45, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-primary/10 blur-xl"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-dashed border-primary/20"
            />
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-background/90 shadow-md sm:h-14 sm:w-14"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <StepIcon className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Step label + detail */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-3"
            >
              <p className="text-sm font-semibold text-foreground sm:text-base">
                {isComplete ? "Your demo is ready!" : activeStep.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {isComplete
                  ? "The real site with AI voice, chat & warm transfer."
                  : activeStep.detail}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="mt-4 w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <p className="mt-1.5 text-[10px] font-medium text-muted-foreground">
              {isComplete ? "Complete" : `${Math.round(progress)}% — Scanning website + preparing widgets…`}
            </p>
          </div>

          {/* Cancel button */}
          {onCancel && !isComplete && (
            <button
              onClick={onCancel}
              className="mt-4 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Stop creating Live Demo
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ScanningAnimation;
