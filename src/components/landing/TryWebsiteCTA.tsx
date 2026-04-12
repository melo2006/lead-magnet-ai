import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

const TryWebsiteCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-6 sm:py-8">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="relative rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.08),transparent_70%)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">Free Live Demo</span>
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              Hear YOUR Website Come Alive With AI — In Under 2 Minutes
            </h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-4">
              Enter your website URL and hear what your Voice AI receptionist & Chat AI widget would sound like — totally free, no credit card needed.
            </p>
            <Button
              onClick={() => navigate("/demo")}
              size="lg"
              className="px-8 py-6 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 glow-border rounded-xl"
            >
              🎙️ Try Your Website Now — Free
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TryWebsiteCTA;
