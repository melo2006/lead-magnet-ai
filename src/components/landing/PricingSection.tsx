import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const tiers = [
  {
    name: "AI Essentials",
    tagline: "Voice + Chat — Never Miss a Lead Again",
    price: 49,
    originalPrice: 99,
    setupFee: 49,
    originalSetup: 299,
    icon: Zap,
    popular: false,
    features: [
      "AI Voice Agent (24/7 receptionist)",
      "AI Chat Widget on your website",
      "Lead capture & appointment booking",
      "Warm transfer hot leads to your phone",
      "Up to 100 AI interactions/mo",
      "Email & SMS lead notifications",
      "Basic analytics dashboard",
    ],
    cta: "Start for $49/mo",
    note: "Voice & chat usage billed by volume (~$20–$60/mo)",
  },
  {
    name: "Growth Engine",
    tagline: "Lead Gen + Outreach + Reputation",
    price: 149,
    originalPrice: 299,
    setupFee: 99,
    originalSetup: 499,
    icon: Sparkles,
    popular: true,
    features: [
      "Everything in AI Essentials",
      "Lead Generation (50 new leads/month)",
      "Automated Email & SMS campaigns",
      "Drip sequences (days/weeks of follow-up)",
      "Google Review management",
      "Reputation monitoring & alerts",
      "Speed-to-Lead (60-sec AI callback)",
      "CRM pipeline & tracking",
    ],
    cta: "Grow My Business",
    note: "Most popular — everything you need to grow",
  },
  {
    name: "Full Service",
    tagline: "We Run Your Entire Marketing Machine",
    price: 349,
    originalPrice: 699,
    setupFee: null,
    originalSetup: 499,
    icon: Crown,
    popular: false,
    features: [
      "Everything in Growth Engine",
      "Unlimited lead generation",
      "Unlimited outreach campaigns",
      "Social media content & posting",
      "Website refresh / modernization",
      "Priority AI voice minutes",
      "Dedicated account manager",
      "White-label reporting",
    ],
    cta: "Go Full Service",
    note: "Hands-off — we handle everything for you",
  },
];

const PricingSection = () => {
  const scrollToDemo = () => {
    document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            Launch Special — 50% Off First 3 Months
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Honest, <span className="text-gradient-primary">Transparent Pricing</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No hidden fees. No 12-month contracts. No surprise charges. Cancel anytime.
            <span className="block mt-1 text-sm">
              We show you exactly what you pay — unlike others who hide usage costs in the fine print.
            </span>
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border p-6 sm:p-8 flex flex-col ${
                tier.popular
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                  <tier.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{tier.tagline}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold">${tier.price}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="line-through">${tier.originalPrice}/mo</span>
                  <span className="text-primary ml-2 font-medium">Launch price</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {tier.setupFee !== null ? (
                    <>
                      Setup: <span className="line-through">${tier.originalSetup}</span>{" "}
                      <span className="text-primary font-semibold">${tier.setupFee}</span>
                    </>
                  ) : (
                    <>
                      Setup: <span className="line-through">${tier.originalSetup}</span>{" "}
                      <span className="text-primary font-semibold">FREE</span>
                    </>
                  )}
                </p>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.note && (
                <p className="text-xs text-muted-foreground mb-4 text-center italic">
                  {tier.note}
                </p>
              )}

              <Button
                onClick={scrollToDemo}
                variant={tier.popular ? "default" : "outline"}
                className="w-full"
              >
                {tier.cta}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Competitor comparison */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 max-w-3xl mx-auto"
        >
          <div className="rounded-xl border border-border bg-card/50 p-5">
            <p className="text-sm text-center text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">How we compare:</span>{" "}
              Basic AI voice agents start at $25–$50/mo elsewhere — but they ONLY answer calls. We bundle voice + chat + lead capture + booking + warm transfers starting at{" "}
              <span className="text-primary font-medium">$49/mo</span>. No per-seat fees, no hidden API charges.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
