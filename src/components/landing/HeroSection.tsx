import { motion } from "framer-motion";
import { Phone, PhoneOff, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NicheData } from "@/data/nicheData";

interface HeroSectionProps {
  niche: NicheData;
  onGetDemo: () => void;
}

const HeroSection = ({ niche, onGetDemo }: HeroSectionProps) => {
  return (
    <section className="relative min-h-[50vh] sm:min-h-[70vh] lg:min-h-[80vh] flex items-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_70%)]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-sm font-medium text-primary">
              AI-Powered Lead Generation & Sales Automation
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6"
          >
            <span className="text-foreground">Stop Losing Leads.</span>
            <br />
            <span className="text-gradient-primary glow-text">Start Closing Them</span>
            <br />
            <span className="text-foreground">— With AI.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8"
          >
            AI Hidden Leads finds your ideal customers, reaches out automatically, and answers every call, chat, and text — 24/7. See it work on YOUR business in 90 seconds.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-10"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-destructive/30 bg-destructive/5">
              <PhoneOff className="w-5 h-5 text-destructive" />
              <div className="text-left">
                <p className="text-2xl font-bold text-destructive">78%</p>
                <p className="text-xs text-muted-foreground">Leads Go to First Responder</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-primary/30 bg-primary/5">
              <Phone className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="text-2xl font-bold text-primary">27%</p>
                <p className="text-xs text-muted-foreground">Of Leads Ever Get Contacted</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-accent/30 bg-accent/5">
              <TrendingUp className="w-5 h-5 text-accent" />
              <div className="text-left">
                <p className="text-2xl font-bold text-accent">$1,200</p>
                <p className="text-xs text-muted-foreground">Lost Per Missed Opportunity</p>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              onClick={onGetDemo}
              size="lg"
              className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 glow-border rounded-xl font-semibold"
            >
              See Your Free AI Demo
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 border-border hover:bg-secondary rounded-xl"
            >
              Watch How It Works
            </Button>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-sm text-muted-foreground mt-6"
          >
            No credit card · 90-second setup · Works for any local business
          </motion.p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
