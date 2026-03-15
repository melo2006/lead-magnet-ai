import { motion } from "framer-motion";
import {
  Phone,
  MessageSquare,
  Calendar,
  ArrowRightLeft,
  Brain,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Phone,
    title: "24/7 AI Voice Agent",
    description: "Never miss a call. Your AI answers instantly, speaks naturally, and handles complex conversations.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat Widget",
    description: "Website visitors get instant answers. Your AI knows your services, pricing, and availability.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Connects to your calendar. Books appointments, sends confirmations, and handles rescheduling.",
  },
  {
    icon: ArrowRightLeft,
    title: "Warm Call Transfer",
    description: "Hot lead? Your AI qualifies, summarizes, then transfers directly to your phone — live.",
  },
  {
    icon: Brain,
    title: "Dynamic Knowledge Base",
    description: "Trained on your website, FAQs, and services. Gets smarter with every conversation.",
  },
  {
    icon: Shield,
    title: "Lead Qualification",
    description: "Captures contact info, understands intent, scores leads, and routes them to your CRM.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-12 sm:py-16 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background" />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything Your Business Needs to{" "}
            <span className="text-gradient-primary">Never Lose a Lead</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            One platform. Voice, chat, scheduling, and CRM — powered by AI that sounds human.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/30 transition-all duration-300 card-glow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
