import { motion } from "framer-motion";
import { MessageSquare, Mic, ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DemoResultsProps {
  leadData: {
    fullName: string;
    websiteUrl: string;
    screenshot?: string;
    title?: string;
    description?: string;
    colors?: {
      primary?: string;
      accent?: string;
      background?: string;
      textPrimary?: string;
    };
    logo?: string;
  };
  onBack: () => void;
}

const DemoResults = ({ leadData, onBack }: DemoResultsProps) => {
  const primaryColor = leadData.colors?.primary || "#10b981";

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">
          Your AI-Powered Demo is Ready! 🚀
        </h2>
        <p className="text-muted-foreground">
          Here's what <span className="text-primary font-semibold">{leadData.title || leadData.websiteUrl}</span> could look like with SignalAgent
        </p>
      </motion.div>

      {/* Before / After */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Before - Current Website */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-destructive/30 bg-card overflow-hidden"
        >
          <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20">
            <p className="text-sm font-semibold text-destructive">📍 Your Website Today</p>
          </div>
          <div className="p-4">
            {leadData.screenshot ? (
              <img
                src={`data:image/png;base64,${leadData.screenshot}`}
                alt="Current website screenshot"
                className="w-full rounded-lg border border-border"
              />
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Screenshot unavailable</p>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="w-3 h-3" />
              <span className="truncate">{leadData.websiteUrl}</span>
            </div>
          </div>
        </motion.div>

        {/* After - AI Enhanced */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-primary/30 bg-card overflow-hidden relative"
        >
          <div className="px-4 py-3 bg-primary/10 border-b border-primary/20">
            <p className="text-sm font-semibold text-primary">✨ With SignalAgent AI</p>
          </div>
          <div className="p-4">
            {leadData.screenshot ? (
              <div className="relative">
                <img
                  src={`data:image/png;base64,${leadData.screenshot}`}
                  alt="AI-enhanced website preview"
                  className="w-full rounded-lg border border-border"
                />
                {/* AI Widget overlays */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-2 rounded-full bg-purple-600 text-white shadow-lg text-xs font-medium">
                  <MessageSquare className="w-4 h-4" />
                  AI Chat
                </div>
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-500 text-white shadow-lg text-xs font-medium">
                  <Mic className="w-4 h-4" />
                  Voice AI
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Preview unavailable</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Extracted Branding */}
      {leadData.colors && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-border bg-card p-6 mb-8"
        >
          <h3 className="text-lg font-semibold mb-4">🎨 Your Brand Identity (Extracted)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {leadData.logo && (
              <div className="col-span-2 sm:col-span-4 mb-2">
                <p className="text-xs text-muted-foreground mb-1">Logo</p>
                <img src={leadData.logo} alt="Brand logo" className="h-8 object-contain" />
              </div>
            )}
            {Object.entries(leadData.colors).map(([name, color]) => (
              <div key={name} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border border-border shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <div>
                  <p className="text-xs font-medium capitalize">{name}</p>
                  <p className="text-xs text-muted-foreground">{color}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="text-center space-y-4"
      >
        <p className="text-muted-foreground">
          Ready to add AI Chat and Voice AI to your website?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 glow-border rounded-xl font-semibold"
          >
            Let's Build My AI Website 🚀
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onBack}
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Try Another Website
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default DemoResults;
