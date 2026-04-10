import { motion } from "framer-motion";
import { Sparkles, Globe, Phone, MessageSquare } from "lucide-react";

const DemoDifferentiator = () => {
  return (
    <section className="py-16 sm:py-20 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/20 bg-accent/5 mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">What Makes Us Different</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Others Send Cold Emails.{" "}
              <span className="text-gradient-primary">We Send Live AI Demos.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every prospect receives a personalized demo showing AI running on THEIR website — voice agent, chat widget, and all. Built in 90 seconds. No coding needed.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-card p-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <Globe className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">We Scan Their Website</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Drop any URL and our AI scrapes their brand, services, and FAQs in seconds to build a fully personalized experience.
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
                <Phone className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">They Experience AI Live</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your prospect sees their own website redesigned with an AI voice agent and chat widget — they can talk to it right there.
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
                <MessageSquare className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">They Want It Immediately</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When they see AI handling their calls and chats with their data, they don't need convincing — they need your number.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoDifferentiator;
