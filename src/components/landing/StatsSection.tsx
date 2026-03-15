import { motion } from "framer-motion";
import { TrendingDown, Clock, DollarSign, PhoneOff } from "lucide-react";
import type { NicheData } from "@/data/nicheData";

interface StatsSectionProps {
  niche: NicheData;
}

const StatsSection = ({ niche }: StatsSectionProps) => {
  const stats = [
    {
      icon: PhoneOff,
      value: niche.stats.missedCallRate,
      label: "of calls go unanswered",
      sublabel: "during business hours",
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/20",
    },
    {
      icon: DollarSign,
      value: niche.stats.revenuePerMissedCall,
      label: "lost per missed call",
      sublabel: "average revenue impact",
      color: "text-[hsl(var(--warning))]",
      bg: "bg-[hsl(var(--warning)/0.1)]",
      border: "border-[hsl(var(--warning)/0.2)]",
    },
    {
      icon: Clock,
      value: niche.stats.avgResponseTime,
      label: "average response time",
      sublabel: "without AI assistant",
      color: "text-accent",
      bg: "bg-accent/10",
      border: "border-accent/20",
    },
    {
      icon: TrendingDown,
      value: "78%",
      label: "buy from first responder",
      sublabel: "speed wins every time",
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
  ];

  return (
    <section className="py-12 sm:py-16 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background" />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            The Cost of <span className="text-destructive">Silence</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every ring that goes to voicemail is money walking out the door. Here's what the data says about your industry.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border ${stat.border} ${stat.bg} p-6 text-center card-glow transition-all duration-300`}
            >
              <div className={`inline-flex p-3 rounded-xl ${stat.bg} mb-4`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className={`text-4xl font-bold ${stat.color} mb-2`}>{stat.value}</p>
              <p className="text-sm font-medium text-foreground">{stat.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.sublabel}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
