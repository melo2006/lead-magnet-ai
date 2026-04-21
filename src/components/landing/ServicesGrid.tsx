import { motion } from "framer-motion";
import {
  Phone,
  MessageSquare,
  Search,
  Star,
  Send,
  Share2,
  DatabaseZap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const services = [
  {
    icon: Phone,
    title: "AI Voice Agent",
    description:
      "Your 24/7 receptionist. Answers every call in a natural voice, qualifies leads, books appointments, and warm-transfers hot prospects to your phone — live. Never miss a call again.",
    badge: "Core Service",
    highlighted: true,
  },
  {
    icon: MessageSquare,
    title: "AI Chat Widget",
    description:
      "Instant website chat trained on YOUR business. Captures leads, answers FAQs, books appointments, and converts visitors into customers while you sleep.",
    badge: "Core Service",
    highlighted: true,
  },
  {
    icon: DatabaseZap,
    title: "Database Reactivation",
    description:
      "Your old CRM is a goldmine. We reactivate stale leads sitting untouched for months — AI outbound calls, emails & texts that turn forgotten contacts into paying customers again.",
    badge: "Quick Wins",
    highlighted: true,
  },
  {
    icon: Search,
    title: "Lead Generation",
    description:
      "We find businesses and customers actively looking for your services. Intent-based prospecting across Google, directories, and social media — delivered to your CRM daily.",
    badge: null,
    highlighted: false,
  },
  {
    icon: Star,
    title: "Reputation & Reviews",
    description:
      "Get more 5-star Google reviews automatically. We help you respond to reviews, manage your online reputation, and climb Google Maps rankings.",
    badge: null,
    highlighted: false,
  },
  {
    icon: Send,
    title: "Outreach & Nurturing",
    description:
      "Automated email + SMS sequences that follow up with leads for days or weeks. Personalized messages, scheduled drips, and AI-powered callbacks when they engage.",
    badge: null,
    highlighted: false,
  },
  {
    icon: Share2,
    title: "Social Media Management",
    description:
      "Consistent social media posts across your platforms. We create and schedule content so you stay visible without lifting a finger.",
    badge: null,
    highlighted: false,
  },
];

const ServicesGrid = () => {
  return (
    <section id="services" className="py-16 sm:py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background" />
      <div className="container mx-auto px-5 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-4">
            We Know What You Need —{" "}
            <span className="text-gradient-primary">We've Heard It All</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-3xl mx-auto">
            "I want more leads." "I want better reviews." "I want to be on the first page of Google." "I need better customer support."
            <span className="block mt-2 text-foreground font-medium">
              We do all of it — but here's what we recommend you start with.
            </span>
          </p>
        </motion.div>

        {/* Top row — 3 highlighted core services */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto mb-4">
          {services.filter(s => s.highlighted).map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group rounded-2xl border p-5 sm:p-6 transition-all duration-300 card-glow border-primary/40 bg-primary/5 hover:border-primary/60"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors bg-primary/20 border border-primary/30">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
                {service.badge && (
                  <Badge variant="outline" className="border-primary/30 text-primary text-xs px-2 py-0.5">
                    {service.badge}
                  </Badge>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{service.title}</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom row — other services */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-5xl mx-auto">
          {services.filter(s => !s.highlighted).map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group rounded-2xl border p-5 sm:p-6 transition-all duration-300 card-glow border-border bg-card hover:border-primary/30"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors bg-primary/10 border border-primary/20 group-hover:bg-primary/20">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{service.title}</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Additional services note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 max-w-3xl mx-auto"
        >
          <div className="rounded-xl border border-border bg-card/50 p-5 text-center">
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Also available:</span>{" "}
              Website redesign & modernization · SEO & Google Maps ranking · AI Search Optimization (GEO) · Speed-to-lead instant callbacks · Custom AI agent training
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesGrid;
