import { motion } from "framer-motion";
import { Zap, Bot, PhoneCall, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

const stepKeys = ["s1", "s2", "s3", "s4"] as const;
const stepIcons = [Zap, Bot, PhoneCall, TrendingUp];
const stepAccents = ["primary", "accent", "primary", "accent"];

const HowItWorksSection = () => {
  const { t } = useTranslation();

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
            {t("how.title1")}{" "}
            <span className="text-gradient-primary">{t("how.title2")}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {t("how.sub")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-5 max-w-6xl mx-auto">
          {stepKeys.map((key, i) => {
            const Icon = stepIcons[i];
            const accent = stepAccents[i];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative"
              >
                {i < stepKeys.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div className={`w-20 h-20 rounded-2xl bg-${accent}/10 border border-${accent}/20 flex items-center justify-center`}>
                      <Icon className={`w-8 h-8 text-${accent}`} />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-foreground">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">{t(`how.${key}.title`)}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{t(`how.${key}.desc`)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
