import { motion } from "framer-motion";
import { Zap, Bot, PhoneCall, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Zap,
    title: "We Set Up Your AI",
    description: "In under 48 hours, we install a custom AI voice agent and chat widget on your website — trained on YOUR business, services, and FAQs.",
    accent: "primary",
  },
  {
    icon: Bot,
    title: "AI Answers Every Call & Chat",
    description: "24/7 — no missed calls, no hold times. Your AI books appointments, answers questions, and captures every lead automatically.",
    accent: "accent",
  },
  {
    icon: PhoneCall,
    title: "Hot Leads Get Warm-Transferred",
    description: "When a caller is ready to buy, AI warm-transfers them directly to your phone. You pick up a qualified, ready-to-close lead.",
    accent: "primary",
  },
  {
    icon: TrendingUp,
    title: "You Grow — We Handle the Rest",
    description: "Automated follow-ups, review requests, and lead nurturing run on autopilot. You focus on your business while we drive growth.",
    accent: "accent",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-14 sm:py-20 relative">
      <div className="container mx-auto px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            From Sign-Up to Results in{" "}
            <span className="text-gradient-primary">4 Simple Steps</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            No tech skills needed. No long contracts. We handle the setup — you get the leads.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-5 max-w-6xl mx-auto">
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
                <h3 className="text-lg sm:text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
