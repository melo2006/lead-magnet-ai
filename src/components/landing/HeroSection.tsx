import { motion } from "framer-motion";
import { Phone, PhoneOff, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { NicheData } from "@/data/nicheData";

interface HeroSectionProps {
  niche: NicheData;
  onGetDemo: () => void;
}

const HeroSection = ({ niche, onGetDemo }: HeroSectionProps) => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[40vh] sm:min-h-[55vh] lg:min-h-[65vh] flex items-center overflow-hidden pt-16 sm:pt-20">
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-sm font-medium text-primary">
              Try Your Own Website With AI Voice — Free in 2 Minutes
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-5"
          >
            <span className="text-foreground">Missing Calls =</span>
            <br />
            <span className="text-gradient-primary glow-text">Losing Money.</span>
            <br />
            <span className="text-foreground text-3xl sm:text-4xl lg:text-5xl">We Fix That — Starting at $49/mo.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6"
          >
            AI voice receptionist + chat widget + lead generation — all in one platform. 
            See it working on YOUR website in 90 seconds. No credit card, no sales pitch.
          </motion.p>

          {/* Primary CTA — big and prominent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-6"
          >
            <Button
              onClick={() => navigate("/demo")}
              size="lg"
              className="text-lg px-10 py-7 bg-primary text-primary-foreground hover:bg-primary/90 glow-border rounded-xl font-semibold"
            >
              🎙️ Try AI Voice on Your Website — Free
            </Button>
            <Button
              onClick={onGetDemo}
              variant="outline"
              size="lg"
              className="text-lg px-8 py-7 border-border hover:bg-secondary rounded-xl"
            >
              See Plans & Pricing
            </Button>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-sm text-muted-foreground mb-8"
          >
            No credit card · 90-second setup · Works for any business
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto"
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-destructive/30 bg-destructive/5">
              <PhoneOff className="w-4 h-4 text-destructive shrink-0" />
              <div className="text-left">
                <p className="text-xl font-bold text-destructive">78%</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Leads Go to First Responder</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5">
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <div className="text-left">
                <p className="text-xl font-bold text-primary">27%</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Of Leads Ever Get Contacted</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-accent/30 bg-accent/5">
              <TrendingUp className="w-4 h-4 text-accent shrink-0" />
              <div className="text-left">
                <p className="text-xl font-bold text-accent">$1,200</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Lost Per Missed Opportunity</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <div className="text-left">
                <p className="text-xl font-bold text-primary">97%</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Report Increased Revenue With AI</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
