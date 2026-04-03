import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CheckCircle, Globe, MessageSquare, Mic, PhoneCall, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const featureSlides = [
  {
    icon: Globe,
    eyebrow: "Live website preview",
    title: "Show the real website first",
    description:
      "The real website loads first so the experience feels believable immediately instead of feeling like a mockup.",
    benefits: ["Real website context", "Instant first impression", "No rebuild delay"],
  },
  {
    icon: Mic,
    eyebrow: "Voice AI",
    title: "Answer calls like a real receptionist",
    description:
      "Aspen sounds human, answers common questions, and keeps callers moving instead of sending leads to voicemail.",
    benefits: ["24/7 phone coverage", "Natural conversations", "Lead qualification"],
  },
  {
    icon: MessageSquare,
    eyebrow: "Chat AI",
    title: "Convert visitors even after hours",
    description:
      "The chat assistant replies instantly, captures intent, and collects contact info so missed visits turn into warmer leads.",
    benefits: ["Instant replies", "Contact capture", "Smarter follow-up"],
  },
  {
    icon: PhoneCall,
    eyebrow: "Warm transfer",
    title: "Route hot leads to a human live",
    description:
      "When someone is ready right now, Aspen can tee up a live handoff so the momentum stays high and the lead stays warm.",
    benefits: ["Live handoff", "Less drop-off", "Faster close path"],
  },
  {
    icon: Sparkles,
    eyebrow: "Conversion lift",
    title: "Sharper site, better follow-up, stronger trust",
    description:
      "A cleaner website experience plus instant AI response creates a more premium first impression that helps more visitors book calls.",
    benefits: ["Premium feel", "Better conversion", "More trust signals"],
  },
  {
    icon: Bot,
    eyebrow: "AI demo engine",
    title: "Aspen keeps learning the business in the background",
    description:
      "While the preview loads, Aspen keeps pulling service details, brand cues, and context so the voice and chat demos feel specific.",
    benefits: ["Business context", "Brand-aware demo", "Stronger answers"],
  },
] as const;

const orbitIcons = [Globe, Mic, MessageSquare, PhoneCall] as const;
const orbitPositions = [
  "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
  "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
  "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2",
  "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
] as const;
const completionBenefits = ["Website ready", "Voice AI ready", "Warm transfer ready"] as const;

const SLIDE_DURATION = 2600;

interface ScanningAnimationProps {
  websiteUrl: string;
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

const ScanningAnimation = ({ websiteUrl, onComplete, mode = "timed" }: ScanningAnimationProps) => {
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
      const interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % featureSlides.length);
      }, SLIDE_DURATION);

      return () => clearInterval(interval);
    }

    let stepTimeout: ReturnType<typeof setTimeout> | undefined;
    let progressInterval: ReturnType<typeof setInterval> | undefined;
    let elapsed = 0;
    const totalDuration = featureSlides.length * SLIDE_DURATION;

    progressInterval = setInterval(() => {
      elapsed += 50;
      const pct = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(pct);
    }, 50);

    const advanceSteps = (stepIndex: number) => {
      if (stepIndex >= featureSlides.length) {
        if (progressInterval) clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => onCompleteRef.current(), 600);
        return;
      }

      setCurrentStep(stepIndex);
      stepTimeout = setTimeout(() => advanceSteps(stepIndex + 1), SLIDE_DURATION);
    };

    advanceSteps(0);

    return () => {
      if (stepTimeout) clearTimeout(stepTimeout);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [mode, websiteUrl]);

  const activeSlide = featureSlides[currentStep] ?? featureSlides[0];
  const showTimedProgress = mode === "timed";
  const isComplete = showTimedProgress && progress >= 100;
  const CurrentIcon = isComplete ? CheckCircle : activeSlide.icon;
  const websiteLabel = getWebsiteLabel(websiteUrl);
  const slideBenefits = isComplete ? completionBenefits : activeSlide.benefits;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto flex h-full w-full max-w-4xl items-center justify-center"
    >
      <div className="relative w-full overflow-hidden rounded-[2rem] border border-border bg-card/95 p-4 shadow-xl sm:p-6">
        <div className="absolute -left-16 top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-12 bottom-6 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
              Aspen is building
            </div>

            <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-3xl [@media(max-height:520px)]:text-lg">
              Building your live demo
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground [@media(max-height:520px)]:text-xs [@media(max-height:520px)]:leading-5">
              Loading <span className="font-medium text-foreground">{websiteLabel}</span> first, then layering AI voice, chat, and warm transfer on top.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[0.95fr,1.05fr] sm:items-center [@media(max-height:520px)]:mt-4 [@media(max-height:520px)]:grid-cols-[0.84fr,1.16fr] [@media(max-height:520px)]:items-center">
            <div className="rounded-[1.75rem] border border-border bg-background/60 p-4 [@media(max-height:520px)]:p-3">
              <div className="relative mx-auto aspect-square w-full max-w-[220px] [@media(max-height:520px)]:max-w-[150px]">
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.45, 0.9, 0.45] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-4 rounded-full border border-primary/20"
                />
                <motion.div
                  animate={{ scale: [1.04, 0.98, 1.04], opacity: [0.25, 0.5, 0.25] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-8 rounded-full border border-accent/20"
                />

                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                >
                  {orbitIcons.map((Icon, index) => (
                    <div
                      key={index}
                      className={`absolute ${orbitPositions[index]} flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm [@media(max-height:520px)]:h-10 [@media(max-height:520px)]:w-10`}
                    >
                      <Icon className="h-5 w-5 text-primary [@media(max-height:520px)]:h-4 [@media(max-height:520px)]:w-4" />
                    </div>
                  ))}
                </motion.div>

                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-[28%] rounded-[1.75rem] border border-primary/20 bg-card shadow-lg [@media(max-height:520px)]:inset-[26%]"
                >
                  <motion.div
                    animate={{ scale: [1, 1.22, 1], opacity: [0.35, 0, 0.35] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-[1.75rem] border border-primary/30"
                  />

                  <div className="relative flex h-full w-full items-center justify-center rounded-[1.75rem] bg-card/95">
                    <CurrentIcon className="h-10 w-10 text-primary [@media(max-height:520px)]:h-8 [@media(max-height:520px)]:w-8" />
                  </div>
                </motion.div>

                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                  <div className="rounded-full border border-border bg-card/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Live site + AI layers
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm font-semibold text-foreground [@media(max-height:520px)]:mt-2 [@media(max-height:520px)]:text-xs">
                {isComplete ? "Everything is ready" : "Real site loads first"}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground [@media(max-height:520px)]:hidden">
                Aspen keeps preparing the voice assistant, chat assistant, and transfer flow while the website comes in.
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.article
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="rounded-[1.75rem] border border-border bg-background/70 p-4 text-left shadow-sm sm:p-5 [@media(max-height:520px)]:p-3.5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 [@media(max-height:520px)]:h-10 [@media(max-height:520px)]:w-10">
                    <CurrentIcon className="h-6 w-6 text-primary [@media(max-height:520px)]:h-5 [@media(max-height:520px)]:w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                      {activeSlide.eyebrow}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground sm:text-xl [@media(max-height:520px)]:mt-1.5 [@media(max-height:520px)]:text-base">
                      {isComplete ? "Demo assets ready" : activeSlide.title}
                    </h3>
                    <p className="mt-2 overflow-hidden text-sm leading-6 text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] sm:text-base [@media(max-height:520px)]:text-xs [@media(max-height:520px)]:leading-5 [@media(max-height:520px)]:[-webkit-line-clamp:3]">
                      {isComplete
                        ? "The preview is ready — Aspen can now show the real website, voice AI, chat AI, and the transfer flow together."
                        : activeSlide.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 [@media(max-height:520px)]:mt-3">
                  {slideBenefits.map((benefit, index) => (
                    <span
                      key={benefit}
                      className={`rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground [@media(max-height:520px)]:text-[11px] ${
                        index > 1 ? "hidden sm:inline-flex [@media(max-height:520px)]:hidden" : ""
                      }`}
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              </motion.article>
            </AnimatePresence>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 [@media(max-height:520px)]:mt-3 [@media(max-height:520px)]:gap-2">
            {showTimedProgress ? (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
                  <span>Preparing site, voice, and chat</span>
                  <span className="shrink-0">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="mt-2 h-1.5" />
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
                Building voice, chat, transfer
              </div>
            )}

            <div className="flex shrink-0 justify-center gap-1.5">
              {featureSlides.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentStep ? "w-7 bg-primary" : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ScanningAnimation;
