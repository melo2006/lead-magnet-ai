import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

import sarahImg from "@/assets/testimonial-sarah.png";
import mikeImg from "@/assets/testimonial-mike.png";
import jessicaImg from "@/assets/testimonial-jessica.png";
import carlosImg from "@/assets/testimonial-carlos.png";

const testimonials = [
  {
    quote:
      "We never miss a call anymore. The AI voice agent picks up every single inquiry — evenings, weekends, holidays. Our bookings are up 40% since we started using AI Hidden Leads.",
    name: "Sarah Mitchell",
    title: "Real Estate Broker · RE/MAX South Florida",
    image: sarahImg,
  },
  {
    quote:
      "I was skeptical at first, but the personalized demo blew me away. They showed me my own website with AI on it — I signed up that same day. Best decision for my business.",
    name: "Mike Thompson",
    title: "Owner · Thompson Plumbing & HVAC",
    image: mikeImg,
  },
  {
    quote:
      "Our front desk used to miss half the calls during busy hours. Now the AI handles overflow, books consultations, and even follows up with leads we would've lost.",
    name: "Dr. Jessica Reyes",
    title: "Founder · Glow Aesthetic Med Spa",
    image: jessicaImg,
  },
  {
    quote:
      "The speed-to-lead feature is a game-changer. A customer views our demo and within a minute they get a call from our AI — it's like having a tireless sales team.",
    name: "Carlos Gutierrez",
    title: "Owner · Prestige Auto Detail",
    image: carlosImg,
  },
];

const TestimonialSection = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % testimonials.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next]);

  const t = testimonials[current];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 120 : -120, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -120 : 120, opacity: 0 }),
  };

  return (
    <section id="testimonials" className="py-16 sm:py-24 relative overflow-hidden">
      {/* subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
            <span className="text-foreground">Real People. </span>
            <span className="text-gradient-primary">Real Results.</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Business owners across every industry trust AI Hidden Leads to capture more customers.
          </p>
        </motion.div>

        {/* Carousel card */}
        <div className="max-w-3xl mx-auto relative">
          {/* Nav arrows */}
          <button
            onClick={prev}
            aria-label="Previous testimonial"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-12 z-20 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            aria-label="Next testimonial"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-12 z-20 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl p-6 sm:p-10"
            >
              <Quote className="w-8 h-8 text-primary/30 mb-4" />

              <div className="flex justify-center gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>

              <blockquote className="text-lg sm:text-xl font-medium leading-relaxed mb-8 text-foreground text-center">
                "{t.quote}"
              </blockquote>

              <div className="flex items-center justify-center gap-4">
                <img
                  src={t.image}
                  alt={t.name}
                  loading="lazy"
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
                />
                <div className="text-left">
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.title}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > current ? 1 : -1);
                  setCurrent(i);
                }}
                aria-label={`Go to testimonial ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === current
                    ? "bg-primary w-6"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Small avatar row showing all faces */}
        <div className="flex justify-center items-center gap-3 mt-8">
          {testimonials.map((person, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > current ? 1 : -1);
                setCurrent(i);
              }}
              className={`transition-all ${
                i === current
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full scale-110"
                  : "opacity-50 hover:opacity-80"
              }`}
            >
              <img
                src={person.image}
                alt={person.name}
                loading="lazy"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
