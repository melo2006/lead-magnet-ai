import { motion } from "framer-motion";
import { ArrowRight, MessageSquare, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NicheData } from "@/data/nicheData";

// Realtors
import oldPhoneRealtors from "@/assets/old-website-phone.png";
import newPhoneRealtors from "@/assets/new-website-phone.png";
import oldLaptopRealtors from "@/assets/old-website-laptop.png";
import newLaptopRealtors from "@/assets/new-website-laptop.png";

// Med Spas
import oldPhoneMedspa from "@/assets/old-medspa-phone.png";
import newPhoneMedspa from "@/assets/new-medspa-phone.png";
import oldLaptopMedspa from "@/assets/old-medspa-laptop.png";
import newLaptopMedspa from "@/assets/new-medspa-laptop.png";

// Auto Detailing
import oldPhoneAuto from "@/assets/old-autodetail-phone.png";
import newPhoneAuto from "@/assets/new-autodetail-phone.png";
import oldLaptopAuto from "@/assets/old-autodetail-laptop.png";
import newLaptopAuto from "@/assets/new-autodetail-laptop.png";

// Vet Clinics
import oldPhoneVet from "@/assets/old-vet-phone.png";
import newPhoneVet from "@/assets/new-vet-phone.png";
import oldLaptopVet from "@/assets/old-vet-laptop.png";
import newLaptopVet from "@/assets/new-vet-laptop.png";

// Marine Services
import oldPhoneMarine from "@/assets/old-marine-phone.png";
import newPhoneMarine from "@/assets/new-marine-phone.png";
import oldLaptopMarine from "@/assets/old-marine-laptop.png";
import newLaptopMarine from "@/assets/new-marine-laptop.png";

interface NicheAssets {
  oldPhone: string;
  newPhone: string;
  oldLaptop: string;
  newLaptop: string;
  subtitle: string;
  beforeLabel: string;
  afterLabel: string;
}

const nicheAssets: Record<string, NicheAssets> = {
  realtors: {
    oldPhone: oldPhoneRealtors,
    newPhone: newPhoneRealtors,
    oldLaptop: oldLaptopRealtors,
    newLaptop: newLaptopRealtors,
    subtitle: "Your listing site could look like this — with a built-in AI voice agent and smart chatbot that never misses a buyer",
    beforeLabel: "Your Realtor Site Today",
    afterLabel: "With SignalAgent ✨",
  },
  medspa: {
    oldPhone: oldPhoneMedspa,
    newPhone: newPhoneMedspa,
    oldLaptop: oldLaptopMedspa,
    newLaptop: newLaptopMedspa,
    subtitle: "Your med spa site could look like this — with AI booking and a voice assistant that captures every consultation request",
    beforeLabel: "Your Med Spa Site Today",
    afterLabel: "With SignalAgent ✨",
  },
  autodetail: {
    oldPhone: oldPhoneAuto,
    newPhone: newPhoneAuto,
    oldLaptop: oldLaptopAuto,
    newLaptop: newLaptopAuto,
    subtitle: "Your detailing site could look like this — with an AI assistant that books jobs while you're polishing a Tesla",
    beforeLabel: "Your Detail Site Today",
    afterLabel: "With SignalAgent ✨",
  },
  veterinary: {
    oldPhone: oldPhoneVet,
    newPhone: newPhoneVet,
    oldLaptop: oldLaptopVet,
    newLaptop: newLaptopVet,
    subtitle: "Your vet clinic site could look like this — with AI triage and a voice agent that handles panicked pet parents 24/7",
    beforeLabel: "Your Vet Site Today",
    afterLabel: "With SignalAgent ✨",
  },
  marine: {
    oldPhone: oldPhoneMarine,
    newPhone: newPhoneMarine,
    oldLaptop: oldLaptopMarine,
    newLaptop: newLaptopMarine,
    subtitle: "Your marine service site could look like this — with AI scheduling and a voice agent that books haul-outs while you're on the dock",
    beforeLabel: "Your Marine Site Today",
    afterLabel: "With SignalAgent ✨",
  },
};

interface BeforeAfterSectionProps {
  niche: NicheData;
}

const BeforeAfterSection = ({ niche }: BeforeAfterSectionProps) => {
  const assets = nicheAssets[niche.id] ?? nicheAssets.realtors;

  const scrollToDemo = () => {
    document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-12 sm:py-16 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          key={niche.id + "-header"}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-10"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
            <span className="text-foreground">From </span>
            <span className="text-destructive">Outdated</span>
            <span className="text-foreground"> to </span>
            <span className="text-gradient-primary">AI-Powered</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {assets.subtitle}
          </p>
        </motion.div>

        {/* Phone mockups */}
        <div className="flex flex-row items-center justify-center gap-4 sm:gap-8 lg:gap-12 max-w-4xl mx-auto">
          <motion.div
            key={niche.id + "-old-phone"}
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex-1 max-w-[180px] sm:max-w-[260px]"
          >
            <div className="absolute -inset-2 rounded-3xl bg-destructive/10 blur-xl" />
            <div className="relative">
              <img src={assets.oldPhone} alt={`Outdated ${niche.label} website on a phone`} className="w-full h-auto rounded-2xl" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-destructive/20 border border-destructive/30 text-destructive text-[10px] sm:text-sm font-semibold whitespace-nowrap">
                {assets.beforeLabel}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex-shrink-0 hidden sm:flex"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-primary" />
            </div>
          </motion.div>

          <motion.div
            key={niche.id + "-new-phone"}
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex-1 max-w-[200px] sm:max-w-[290px]"
          >
            <div className="absolute -inset-2 rounded-3xl bg-primary/10 blur-xl" />
            <div className="relative overflow-hidden rounded-2xl">
              <img src={assets.newPhone} alt={`Modern AI-powered ${niche.label} website`} className="w-full h-auto" />
              {/* AI Chat icon - bottom left, inside device */}
              <div className="absolute bottom-[12%] left-[8%] flex flex-col items-center gap-0.5">
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-[hsl(262,83%,58%)] shadow-lg shadow-[hsl(262,83%,58%)]/40 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-white" />
                </div>
                <span className="text-[6px] sm:text-[8px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">AI Chat</span>
              </div>
              {/* Voice AI icon - bottom right, inside device */}
              <div className="absolute bottom-[12%] right-[8%] flex flex-col items-center gap-0.5">
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-[hsl(142,71%,45%)] shadow-lg shadow-[hsl(142,71%,45%)]/40 flex items-center justify-center">
                  <Mic className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-white" />
                </div>
                <span className="text-[6px] sm:text-[8px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Voice AI</span>
              </div>
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] sm:text-sm font-semibold whitespace-nowrap">
              {assets.afterLabel}
            </div>
          </motion.div>
        </div>

        {/* Laptop mockups */}
        <div className="flex flex-row items-center justify-center gap-4 sm:gap-8 lg:gap-12 max-w-5xl mx-auto mt-10 sm:mt-14">
          <motion.div
            key={niche.id + "-old-laptop"}
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative flex-1 max-w-[260px] sm:max-w-[380px]"
          >
            <div className="absolute -inset-2 rounded-3xl bg-destructive/10 blur-xl" />
            <div className="relative">
              <img src={assets.oldLaptop} alt={`Outdated ${niche.label} website on a laptop`} className="w-full h-auto rounded-xl" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-destructive/20 border border-destructive/30 text-destructive text-[10px] sm:text-sm font-semibold whitespace-nowrap">
                Desktop — Before
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex-shrink-0 hidden sm:flex"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>
          </motion.div>

          <motion.div
            key={niche.id + "-new-laptop"}
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative flex-1 max-w-[260px] sm:max-w-[380px]"
          >
            <div className="absolute -inset-2 rounded-3xl bg-primary/10 blur-xl" />
            <div className="relative">
              <img src={assets.newLaptop} alt={`Modern AI-powered ${niche.label} website on a laptop`} className="w-full h-auto rounded-xl" />
              {/* AI Chat icon - bottom left */}
              <div className="absolute bottom-6 sm:bottom-8 left-3 sm:left-5 flex flex-col items-center gap-0.5">
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[hsl(262,83%,58%)] shadow-lg shadow-[hsl(262,83%,58%)]/40 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-[7px] sm:text-[9px] font-bold text-white drop-shadow-md">AI Chat</span>
              </div>
              {/* Voice AI icon - bottom right */}
              <div className="absolute bottom-6 sm:bottom-8 right-3 sm:right-5 flex flex-col items-center gap-0.5">
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[hsl(142,71%,45%)] shadow-lg shadow-[hsl(142,71%,45%)]/40 flex items-center justify-center">
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-[7px] sm:text-[9px] font-bold text-white drop-shadow-md">Voice AI</span>
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] sm:text-sm font-semibold whitespace-nowrap">
                Desktop — With SignalAgent ✨
              </div>
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-10"
        >
          <Button
            onClick={scrollToDemo}
            size="lg"
            className="text-base sm:text-lg px-8 py-5 bg-primary text-primary-foreground hover:bg-primary/90 glow-border rounded-xl font-semibold"
          >
            Transform My Website Now
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default BeforeAfterSection;
