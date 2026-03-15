import { motion } from "framer-motion";
import { Globe, Cpu, Sparkles, PhoneCall } from "lucide-react";

const steps = [
  {
    icon: Globe,
    title: "Enter Your Website",
    description: "Drop your URL and we scrape your brand, services, and FAQs in seconds.",
    accent: "primary",
  },
  {
    icon: Cpu,
    title: "AI Builds Your Demo",
    description: "We generate a personalized AI assistant trained on YOUR business data.",
    accent: "accent",
  },
  {
    icon: Sparkles,
    title: "Experience It Live",
    description: "Talk to your AI assistant. Ask questions. See it handle real scenarios.",
    accent: "primary",
  },
  {
    icon: PhoneCall,
    title: "Get Warm-Transferred",
    description: "Your AI qualifies the caller and transfers them directly to your phone.",
    accent: "accent",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Live in <span className="text-gradient-primary">60 Seconds</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No setup. No code. No contracts. Just enter your URL and experience the future of customer engagement.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative"
            >
              {/* Connector line */}
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
