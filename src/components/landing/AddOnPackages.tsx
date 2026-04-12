import { motion } from "framer-motion";
import { Globe, Search, Sparkles, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const addOns = [
  {
    icon: Wrench,
    title: "Website Refresh",
    price: "$99",
    description:
      "Modern redesign of your existing website using the latest technology. Mobile-optimized, fast-loading, and conversion-ready.",
    note: "One-time fee",
  },
  {
    icon: Search,
    title: "SEO Audit Report",
    price: "FREE",
    description:
      "Full audit of your website's SEO health — what's broken, what's missing, and exactly what to fix to rank higher on Google.",
    note: "Included with any plan",
  },
  {
    icon: Sparkles,
    title: "AI Search Optimization",
    price: "$249",
    priceNote: "/mo",
    description:
      "Get your business cited by ChatGPT, Gemini, and Perplexity. The future of search isn't Google — it's AI. We optimize your presence for AI-powered results.",
    note: "New — early adopter pricing",
    badge: "Coming Soon",
  },
  {
    icon: Globe,
    title: "Google Maps Boost",
    price: "$149",
    priceNote: "/mo",
    description:
      "Climb the Google Maps 3-pack. We optimize your Google Business Profile, build citations, and manage review velocity for local dominance.",
    note: "Results in 60–90 days",
  },
];

const AddOnPackages = () => {
  const scrollToDemo = () => {
    document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-16 sm:py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            À La Carte
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Add-On <span className="text-gradient-primary">Growth Packages</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Boost your results with these targeted services. Add to any plan, cancel anytime.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {addOns.map((addon, i) => (
            <motion.div
              key={addon.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group rounded-2xl border border-border bg-card p-6 flex flex-col hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <addon.icon className="w-5 h-5 text-primary" />
                </div>
                {addon.badge && (
                  <Badge variant="outline" className="border-accent/30 text-accent text-[10px] px-2 py-0.5">
                    {addon.badge}
                  </Badge>
                )}
              </div>

              <h3 className="text-lg font-semibold mb-1">{addon.title}</h3>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-extrabold text-primary">{addon.price}</span>
                {addon.priceNote && (
                  <span className="text-sm text-muted-foreground">{addon.priceNote}</span>
                )}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                {addon.description}
              </p>

              <p className="text-xs text-muted-foreground italic mb-4">{addon.note}</p>

              <Button
                onClick={scrollToDemo}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Learn More
              </Button>
            </motion.div>
          ))}
        </div>

        {/* AI Search teaser */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 max-w-3xl mx-auto"
        >
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">🔮 The Future of Search:</span>{" "}
              Google isn't the only way customers find you anymore. ChatGPT, Gemini, and Perplexity are answering questions like{" "}
              <span className="italic">"best HVAC company near me"</span> — and citing businesses directly. 
              Our AI Search Optimization (GEO) ensures your business shows up in these AI-powered results.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AddOnPackages;
