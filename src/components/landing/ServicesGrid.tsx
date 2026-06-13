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
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

const serviceIcons = {
  voice: Phone,
  chat: MessageSquare,
  reactivation: DatabaseZap,
  leadgen: Search,
  reviews: Star,
  outreach: Send,
  social: Share2,
};

const highlighted: Array<keyof typeof serviceIcons> = ["voice", "chat", "reactivation"];
const other: Array<keyof typeof serviceIcons> = ["leadgen", "reviews", "outreach", "social"];

const ServicesGrid = () => {
  const { t } = useTranslation();

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
            {t("services.title")}{" "}
            <span className="text-gradient-primary">{t("services.titleAccent")}</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-3xl mx-auto">
            {t("services.sub")}
            <span className="block mt-2 text-foreground font-medium">
              {t("services.subStrong")}
            </span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto mb-4">
          {highlighted.map((key, i) => {
            const Icon = serviceIcons[key];
            const badgeLabel = key === "reactivation" ? t("services.quickWins") : t("services.core");
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group rounded-2xl border p-5 sm:p-6 transition-all duration-300 card-glow border-primary/40 bg-primary/5 hover:border-primary/60"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors bg-primary/20 border border-primary/30">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary text-xs px-2 py-0.5">
                    {badgeLabel}
                  </Badge>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">{t(`services.items.${key}.title`)}</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t(`services.items.${key}.desc`)}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-5xl mx-auto">
          {other.map((key, i) => {
            const Icon = serviceIcons[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group rounded-2xl border p-5 sm:p-6 transition-all duration-300 card-glow border-border bg-card hover:border-primary/30"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors bg-primary/10 border border-primary/20 group-hover:bg-primary/20">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">{t(`services.items.${key}.title`)}</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t(`services.items.${key}.desc`)}
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 max-w-3xl mx-auto"
        >
          <div className="rounded-xl border border-border bg-card/50 p-5 text-center">
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{t("services.alsoAvailable")}</span>{" "}
              {t("services.alsoList")}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesGrid;
