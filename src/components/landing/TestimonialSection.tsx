import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { NicheData } from "@/data/nicheData";

interface TestimonialSectionProps {
  niche: NicheData;
}

const TestimonialSection = ({ niche }: TestimonialSectionProps) => {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="flex justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-primary text-primary" />
            ))}
          </div>
          <blockquote className="text-xl sm:text-2xl font-medium leading-relaxed mb-8 text-foreground">
            "{niche.testimonial.quote}"
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
              {niche.testimonial.avatar}
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">{niche.testimonial.name}</p>
              <p className="text-sm text-muted-foreground">{niche.testimonial.title}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialSection;
