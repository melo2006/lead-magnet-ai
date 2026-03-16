import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import BeforePreview from "./demo-results/BeforePreview";
import AfterPreview from "./demo-results/AfterPreview";
import type { DemoLeadData } from "./demo-results/demoResultsUtils";
import { getSiteName } from "./demo-results/demoResultsUtils";

interface DemoResultsProps {
  leadData: DemoLeadData;
  onBack: () => void;
}

const DemoResults = ({ leadData, onBack }: DemoResultsProps) => {
  const siteName = getSiteName(leadData.websiteUrl, leadData.title);

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          Website comparison ready
        </div>
        <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          Real website on the left. <span className="text-gradient-primary">Modern redesign</span> on the right.
        </h2>
        <p className="mx-auto max-w-3xl text-sm text-muted-foreground sm:text-lg">
          For {siteName}, we now show the exact scraped homepage first, then a personalized redesign concept built from the brand and page content.
        </p>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <BeforePreview leadData={leadData} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AfterPreview leadData={leadData} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-3 rounded-[1.5rem] border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-lg font-semibold text-foreground">This is much closer to the actual before/after story.</p>
          <p className="text-sm text-muted-foreground">If you want, I can next make the redesign even more aggressive and luxury-looking.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="rounded-xl px-8 py-6 text-lg font-semibold">
            Build this redesign for me
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
