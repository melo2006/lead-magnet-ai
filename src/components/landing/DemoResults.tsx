import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import AfterPreview from "./demo-results/AfterPreview";
import WebsiteShowcase from "./demo-results/WebsiteShowcase";
import DemoWatermark from "./demo-results/DemoWatermark";
import type { DemoLeadData } from "./demo-results/demoResultsUtils";
import { getImageSrc, getSiteName } from "./demo-results/demoResultsUtils";

interface DemoResultsProps {
  leadData: DemoLeadData;
  onBack: () => void;
}

const DemoResults = ({ leadData, onBack }: DemoResultsProps) => {
  const [step, setStep] = useState<"compare" | "experience">("compare");
  const siteName = getSiteName(leadData.websiteUrl, leadData.title);
  const screenshotSrc = getImageSrc(leadData.screenshot);

  if (step === "experience") {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Interactive redesign experience
          </div>
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
            Experience the <span className="text-gradient-primary">new {siteName}</span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
            This now renders like a proper modern website, with Aspen layered in as the live conversion experience.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AfterPreview leadData={leadData} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center gap-3"
        >
          <Button variant="outline" size="lg" onClick={() => setStep("compare")} className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to comparison
          </Button>
          <Button variant="outline" size="lg" onClick={onBack} className="rounded-xl">
            Try another website
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          Website comparison ready
        </div>
        <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          Current site vs. <span className="text-gradient-primary">Modern redesign</span>
        </h2>
        <p className="mx-auto max-w-3xl text-sm text-muted-foreground sm:text-lg">
          Here&apos;s {siteName} today on the left, and a polished, demo-ready redesign on the right.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[1.75rem] border border-border bg-card p-4 sm:p-5"
        >
          <div className="mb-3 space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
              Current website
            </div>
            <h3 className="text-xl font-bold text-foreground">How it looks today</h3>
          </div>

          <div className="relative mx-auto" style={{ maxWidth: 520 }}>
            <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-border bg-muted/50 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-destructive/60" />
              <span className="h-2 w-2 rounded-full bg-accent/50" />
              <span className="h-2 w-2 rounded-full bg-primary/60" />
              <span className="ml-2 truncate text-[10px] text-muted-foreground">{leadData.websiteUrl}</span>
            </div>
            <div className="overflow-hidden rounded-b-xl border border-border bg-background">
              {screenshotSrc ? (
                <img
                  src={screenshotSrc}
                  alt={`Current ${siteName} website`}
                  className="w-full object-cover object-top"
                  style={{ maxHeight: 340 }}
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center bg-muted text-sm text-muted-foreground" style={{ height: 240 }}>
                  Screenshot not available
                </div>
              )}
            </div>
            <div className="mx-auto h-3 rounded-b-xl border border-t-0 border-border bg-muted/80" style={{ width: "70%" }} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-[1.75rem] border border-primary/20 bg-card p-4 sm:p-5"
        >
          <div className="mb-3 space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3 w-3" />
              Modern redesign
            </div>
            <h3 className="text-xl font-bold text-foreground">How it could look</h3>
          </div>

          <div className="relative mx-auto" style={{ maxWidth: 520 }}>
            <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-primary/20 bg-muted/50 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-primary/60" />
              <span className="h-2 w-2 rounded-full bg-primary/40" />
              <span className="h-2 w-2 rounded-full bg-primary/30" />
              <span className="ml-2 truncate text-[10px] text-primary/70">{leadData.websiteUrl} — redesigned</span>
            </div>
            <div className="max-h-[340px] overflow-hidden rounded-b-xl border border-primary/20 bg-background">
              <WebsiteShowcase leadData={leadData} compact />
            </div>
            <div className="mx-auto h-3 rounded-b-xl border border-t-0 border-primary/10 bg-muted/80" style={{ width: "70%" }} />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-3 rounded-[1.5rem] border border-primary/20 bg-gradient-to-r from-card to-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-lg font-semibold text-foreground">Ready to experience the new website?</p>
          <p className="text-sm text-muted-foreground">Click below to see the full redesign and talk to Aspen inside it.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={() => setStep("experience")}
            className="rounded-xl px-8 py-6 text-lg font-semibold"
          >
            <Eye className="mr-2 h-5 w-5" />
            View new website
          </Button>
          <Button variant="outline" size="lg" onClick={onBack} className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Try another website
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default DemoResults;
