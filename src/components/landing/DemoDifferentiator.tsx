import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, Clock, DollarSign } from "lucide-react";

const DemoDifferentiator = () => {
  return (
    <section className="py-14 sm:py-20 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px]" />
      </div>

      <div className="container mx-auto px-5 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/20 bg-accent/5 mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm sm:text-base font-medium text-accent">Why Businesses Choose Us</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Stop Losing Leads.{" "}
              <span className="text-gradient-primary">Start Converting 24/7.</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Most businesses lose 62% of calls after hours. Our AI answers every call, books appointments, and warm-transfers hot leads — so you never miss revenue again.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-card p-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Live in 48 Hours</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                No months of setup. We scan your website, train your AI agent on your services, and go live — all within 2 business days.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No Hidden Costs</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Transparent pricing from day one. No setup fees, no long-term contracts. Cancel anytime. What you see is what you pay.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-border bg-card p-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Try Before You Buy</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                See AI running on YOUR website in under 2 minutes — free. Talk to it, test it, then decide. No credit card required.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoDifferentiator;
