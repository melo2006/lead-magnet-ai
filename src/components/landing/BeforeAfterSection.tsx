import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import oldPhone from "@/assets/old-website-phone.png";
import newPhone from "@/assets/new-website-phone.png";
import oldLaptop from "@/assets/old-website-laptop.png";
import newLaptop from "@/assets/new-website-laptop.png";

const BeforeAfterSection = () => {
  const scrollToDemo = () => {
    document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-12 sm:py-16 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-10"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
            <span className="text-foreground">From </span>
            <span className="text-destructive">Outdated</span>
            <span className="text-foreground"> to </span>
            <span className="text-gradient-primary">AI-Powered</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Your website could look like this — with a built-in AI voice agent and smart chatbot that never misses a lead
          </p>
        </motion.div>

        {/* Phone mockups */}
        <div className="flex flex-row items-center justify-center gap-4 sm:gap-8 lg:gap-12 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex-1 max-w-[180px] sm:max-w-[260px]"
          >
            <div className="absolute -inset-2 rounded-3xl bg-destructive/10 blur-xl" />
            <div className="relative">
              <img src={oldPhone} alt="Outdated real estate website on a phone" className="w-full h-auto rounded-2xl" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-destructive/20 border border-destructive/30 text-destructive text-[10px] sm:text-sm font-semibold whitespace-nowrap">
                Your Website Today
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex-shrink-0 hidden sm:flex"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-primary" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex-1 max-w-[180px] sm:max-w-[260px]"
          >
            <div className="absolute -inset-2 rounded-3xl bg-primary/10 blur-xl" />
            <div className="relative">
              <img src={newPhone} alt="Modern AI-powered website with voice and chat widgets" className="w-full h-auto rounded-2xl" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] sm:text-sm font-semibold whitespace-nowrap">
                With SignalAgent ✨
              </div>
            </div>
          </motion.div>
        </div>

        {/* Laptop mockups */}
        <div className="flex flex-row items-center justify-center gap-4 sm:gap-8 lg:gap-12 max-w-5xl mx-auto mt-10 sm:mt-14">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative flex-1 max-w-[260px] sm:max-w-[380px]"
          >
            <div className="absolute -inset-2 rounded-3xl bg-destructive/10 blur-xl" />
            <div className="relative">
              <img src={oldLaptop} alt="Outdated real estate website on a laptop" className="w-full h-auto rounded-xl" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-destructive/20 border border-destructive/30 text-destructive text-[10px] sm:text-sm font-semibold whitespace-nowrap">
                Desktop — Before
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex-shrink-0 hidden sm:flex"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative flex-1 max-w-[260px] sm:max-w-[380px]"
          >
            <div className="absolute -inset-2 rounded-3xl bg-primary/10 blur-xl" />
            <div className="relative">
              <img src={newLaptop} alt="Modern AI-powered website on a laptop with voice and chat widgets" className="w-full h-auto rounded-xl" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] sm:text-sm font-semibold whitespace-nowrap">
                Desktop — With SignalAgent ✨
              </div>
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-10"
        >
          <Button
            onClick={scrollToDemo}
            size="lg"
            className="text-base sm:text-lg px-8 py-5 bg-primary text-primary-foreground hover:bg-primary/90 glow-border rounded-xl font-semibold"
          >
            Transform My Website Now
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default BeforeAfterSection;
