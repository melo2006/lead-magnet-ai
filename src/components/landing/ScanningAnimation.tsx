import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Globe, MessageSquare, Mic, PhoneCall, Sparkles } from "lucide-react";

const featureSlides = [
  {
    icon: Globe,
    eyebrow: "Real website first",
    title: "The live homepage shows first.",
    description: "Prospects see the real site immediately instead of waiting on a fake mockup to build.",
  },
  {
    icon: Mic,
    eyebrow: "Voice AI",
    title: "Answers like a real receptionist.",
    description: "Aspen answers common questions, qualifies callers, and keeps the conversation moving.",
  },
  {
    icon: MessageSquare,
    eyebrow: "Chat AI",
    title: "Replies instantly on the site.",
    description: "Visitors get immediate answers and turn into captured leads instead of bouncing away.",
  },
  {
    icon: PhoneCall,
    eyebrow: "Warm transfer",
    title: "Hot leads go to a human fast.",
    description: "Ready-to-buy callers can be handed off live before the momentum disappears.",
  },
  {
    icon: Sparkles,
    eyebrow: "Better conversion",
    title: "Cleaner experience, stronger trust.",
    description: "The site, chat, and voice assistant work together like one polished sales system.",
  },
] as const;

const orbitIcons = [Globe, Mic, MessageSquare, PhoneCall] as const;
const orbitPositions = [
  "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
  "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
  "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2",
  "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
] as const;
const SLIDE_DURATION = 2600;

interface ScanningAnimationProps {
  websiteUrl: string;
  businessName?: string;
  onComplete: () => void;
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
        setCurrentStep((prev) => (prev + 1) % featureSlides.length);
      }, SLIDE_DURATION);

      return () => {
        window.clearInterval(intervalId);
      };
    }

    let stepTimeout: ReturnType<typeof setTimeout> | undefined;
    let progressInterval: ReturnType<typeof setInterval> | undefined;
    let elapsed = 0;
    const totalDuration = featureSlides.length * SLIDE_DURATION;

    progressInterval = window.setInterval(() => {
      elapsed += 50;
      setProgress(Math.min((elapsed / totalDuration) * 100, 100));
    }, 50);

    const advanceSteps = (stepIndex: number) => {
      if (stepIndex >= featureSlides.length) {
        if (progressInterval) window.clearInterval(progressInterval);
        setProgress(100);
        window.setTimeout(() => onCompleteRef.current(), 600);
        return;
      }

      setCurrentStep(stepIndex);
      stepTimeout = window.setTimeout(() => advanceSteps(stepIndex + 1), SLIDE_DURATION);
    };

    advanceSteps(0);

    return () => {
      if (stepTimeout) window.clearTimeout(stepTimeout);
      if (progressInterval) window.clearInterval(progressInterval);
    };
  }, [businessName, mode, websiteUrl]);

  const activeSlide = featureSlides[currentStep] ?? featureSlides[0];
  const websiteLabel = getWebsiteLabel(websiteUrl);
  const displayName = businessName?.trim() || websiteLabel;
  const showTimedProgress = mode === "timed";
  const isComplete = showTimedProgress && progress >= 100;
  const CurrentIcon = isComplete ? CheckCircle : activeSlide.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto flex h-full w-full max-w-3xl items-center justify-center"
    >
      <div className="relative w-full overflow-hidden rounded-[2rem] border border-border bg-card/95 px-5 py-6 shadow-xl sm:px-8 sm:py-8 [@media(max-height:520px)]:px-4 [@media(max-height:520px)]:py-5">
        <div className="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-10 bottom-6 h-28 w-28 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -right-8 top-12 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-[11px]">
              Building your live demo
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl [@media(max-height:520px)]:text-2xl">
              {displayName}
            </h2>
            {displayName.toLowerCase() !== websiteLabel.toLowerCase() && (
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground [@media(max-height:520px)]:text-[11px]">
                {websiteLabel}
              </p>
            )}
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base [@media(max-height:520px)]:mt-2 [@media(max-height:520px)]:text-xs [@media(max-height:520px)]:leading-5">
              We load the real website first, then layer the AI demo on top.
            </p>
          </div>

          <div className="mt-6 flex flex-col items-center [@media(max-height:520px)]:mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary [@media(max-height:520px)]:px-2.5 [@media(max-height:520px)]:py-1 [@media(max-height:520px)]:text-[10px]"
              >
                <CurrentIcon className="h-4 w-4" />
                <span>{isComplete ? "Preview ready" : activeSlide.eyebrow}</span>
              </motion.div>
            </AnimatePresence>

            <div className="relative mt-4 flex h-[220px] w-[220px] items-center justify-center [@media(max-height:520px)]:mt-3 [@media(max-height:520px)]:h-[170px] [@media(max-height:520px)]:w-[170px]">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                {orbitIcons.map((Icon, index) => (
                  <div
                    key={`${activeSlide.eyebrow}-${index}`}
                    className={`absolute ${orbitPositions[index]} flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background/90 shadow-sm [@media(max-height:520px)]:h-9 [@media(max-height:520px)]:w-9`}
                  >
                    <Icon className="h-5 w-5 text-primary [@media(max-height:520px)]:h-4 [@media(max-height:520px)]:w-4" />
                  </div>
                ))}
              </motion.div>

              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.55, 0.3] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-[18%] rounded-full bg-primary/10 blur-2xl"
              />

              <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex h-28 w-28 items-center justify-center rounded-full border border-primary/20 bg-background/85 shadow-lg [@media(max-height:520px)]:h-24 [@media(max-height:520px)]:w-24"
              >
                <CurrentIcon className="h-11 w-11 text-primary [@media(max-height:520px)]:h-9 [@media(max-height:520px)]:w-9" />
              </motion.div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentStep}-copy`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="mt-5 max-w-xl text-center [@media(max-height:520px)]:mt-4"
              >
                <p className="text-lg font-semibold text-foreground sm:text-xl [@media(max-height:520px)]:text-base">
                  {isComplete ? "Everything is ready." : activeSlide.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base [@media(max-height:520px)]:mt-1.5 [@media(max-height:520px)]:text-xs [@media(max-height:520px)]:leading-5">
                  {isComplete
                    ? "The real site, AI voice, chat, and transfer flow are ready together."
                    : activeSlide.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ScanningAnimation;
