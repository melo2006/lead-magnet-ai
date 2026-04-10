import { motion } from "framer-motion";
import {
  Phone,
  MessageSquare,
  Search,
  RefreshCcw,
  Send,
  Zap,
} from "lucide-react";

const services = [
  {
    icon: Phone,
    title: "AI Voice Agent",
    description:
      "24/7 receptionist that answers every call, qualifies leads, books appointments, and warm-transfers hot prospects directly to your phone — live.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat Widget",
    description:
      "Instant website chat trained on your business. Captures leads, answers FAQs, books appointments, and never sleeps.",
  },
  {
    icon: Search,
    title: "Lead Generation Engine",
    description:
      "Intent-based prospecting that finds businesses actively searching for your services across Google Maps, directories, and social media.",
  },
  {
    icon: RefreshCcw,
    title: "Database Reactivation",
    description:
      "AI calls your old, dead lead lists — re-engages cold contacts, books appointments, and resurfaces revenue you thought was gone.",
  },
  {
    icon: Send,
    title: "Automated Outreach",
    description:
      "Multi-step email + SMS + voice campaigns with personalized AI demos attached. Each prospect sees their OWN website with AI built in.",
  },
  {
    icon: Zap,
    title: "Speed-to-Lead",
    description:
      "When a prospect opens your email or views your demo, AI calls them within 60 seconds. First to respond wins — and that's always you.",
  },
];

const ServicesGrid = () => {
  return (
    <section id="services" className="py-16 sm:py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background" />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need to{" "}
            <span className="text-gradient-primary">Dominate Your Market</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            One platform. Lead generation, AI voice, chat, outreach, and reactivation — all working 24/7 so you can focus on closing.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/30 transition-all duration-300 card-glow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <service.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;
