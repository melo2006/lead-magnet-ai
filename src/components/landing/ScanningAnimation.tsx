import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Palette, Type, Camera, Bot, CheckCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const scanSteps = [
  { icon: Globe, label: "Connecting to website...", duration: 2000 },
  { icon: Camera, label: "Capturing screenshot...", duration: 3000 },
  { icon: Palette, label: "Extracting brand colors & logo...", duration: 3000 },
  { icon: Type, label: "Analyzing content & fonts...", duration: 2500 },
  { icon: Bot, label: "Generating your AI-powered demo...", duration: 2500 },
];

interface ScanningAnimationProps {
  websiteUrl: string;
  onComplete: () => void;
}

const ScanningAnimation = ({ websiteUrl, onComplete }: ScanningAnimationProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let stepTimeout: ReturnType<typeof setTimeout>;
    let progressInterval: ReturnType<typeof setInterval>;

    const totalDuration = scanSteps.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;

    // Progress bar
    progressInterval = setInterval(() => {
      elapsed += 50;
      const pct = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(pct);
    }, 50);

    // Step transitions
    const advanceSteps = (stepIndex: number) => {
      if (stepIndex >= scanSteps.length) {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(onComplete, 800);
        return;
      }
      setCurrentStep(stepIndex);
      stepTimeout = setTimeout(() => advanceSteps(stepIndex + 1), scanSteps[stepIndex].duration);
    };

    advanceSteps(0);

    return () => {
      clearTimeout(stepTimeout);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  const CurrentIcon = scanSteps[currentStep]?.icon || CheckCircle;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto text-center"
    >
      <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 glow-border">
        {/* Animated icon */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            {progress >= 100 ? (
              <CheckCircle className="w-10 h-10 text-primary" />
            ) : (
              <CurrentIcon className="w-10 h-10 text-primary animate-pulse" />
            )}
          </div>
        </motion.div>

        {/* URL being scanned */}
        <p className="text-sm text-muted-foreground mb-2">Scanning</p>
        <p className="text-lg font-semibold text-foreground mb-6 truncate px-4">
          {websiteUrl}
        </p>

        {/* Progress bar */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{Math.round(progress)}%</p>
        </div>

        {/* Current step */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-primary font-medium text-base">
              {progress >= 100 ? "Scan complete! ✨" : scanSteps[currentStep]?.label}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {scanSteps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i < currentStep
                  ? "bg-primary"
                  : i === currentStep
                  ? "bg-primary animate-pulse"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ScanningAnimation;
