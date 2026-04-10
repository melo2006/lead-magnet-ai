import { motion } from "framer-motion";
import { Search, Sparkles, MessageSquare, PhoneCall } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "We Find Your Leads",
    description: "AI scans for businesses in your niche that need your services — across Google Maps, directories, and intent signals.",
    accent: "primary",
  },
  {
    icon: Sparkles,
    title: "We Send Personalized Demos",
    description: "Each prospect gets a custom demo showing AI on THEIR website. Voice agent, chat widget — built in 90 seconds.",
    accent: "accent",
  },
  {
    icon: MessageSquare,
    title: "AI Handles Every Response",
    description: "Voice, chat, email, SMS — all answered instantly, 24/7. Your AI qualifies leads and books appointments automatically.",
    accent: "primary",
  },
  {
    icon: PhoneCall,
    title: "You Close the Deal",
    description: "Qualified leads are warm-transferred to your phone or booked on your calendar. You just show up and close.",
    accent: "accent",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-12 sm:py-16 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            From Zero to Leads in{" "}
            <span className="text-gradient-primary">4 Simple Steps</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No setup. No code. No contracts. We handle everything — from finding prospects to closing deals.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative"
            >
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
              )}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <div className={`w-20 h-20 rounded-2xl bg-${step.accent}/10 border border-${step.accent}/20 flex items-center justify-center`}>
                    <step.icon className={`w-8 h-8 text-${step.accent}`} />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-foreground">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
