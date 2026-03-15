import { useState } from "react";
import { motion } from "framer-motion";
import { Rocket, ArrowRight, Globe, Phone, User, Building2, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LeadCaptureSection = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    business: "",
    website: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.website) {
      toast({ title: "Please fill in your name and website URL", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: lead, error } = await supabase.from("leads").insert({
        full_name: formData.name,
        email: formData.business || "not-provided",
        website_url: formData.website,
        phone: formData.phone,
        niche: "realtors",
      }).select("id").single();

      if (error) throw error;

      setIsSubmitted(true);
      toast({ title: "🎉 Demo request submitted!", description: "Scanning your website now..." });

      // Trigger website scan in background
      supabase.functions.invoke("scan-website", {
        body: { leadId: lead.id, websiteUrl: formData.website },
      }).then((res) => {
        if (res.error) console.error("Scan error:", res.error);
        else console.log("Scan completed:", res.data);
      });
    } catch (err) {
      console.error("Error submitting lead:", err);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <section id="demo-form" className="py-12 sm:py-16 relative">
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto text-center rounded-2xl border border-primary/30 bg-card p-8 sm:p-12 glow-border"
          >
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">You're In! 🚀</h2>
            <p className="text-muted-foreground text-lg">
              We're building your personalized AI demo right now. You'll receive it shortly.
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="demo-form" className="py-12 sm:py-16 relative">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px]" />
      </div>
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <Rocket className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Free personalized demo</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              See Your AI Assistant{" "}
              <span className="text-gradient-primary">In Action</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Enter your info below. In 60 seconds, you'll talk to an AI trained on YOUR business.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 glow-border"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" /> Your Name
                </label>
                <Input
                  placeholder="Kevin Gallagher"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-secondary border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" /> Business / Brokerage
                </label>
                <Input
                  placeholder="RE/MAX South Florida"
                  value={formData.business}
                  onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" /> Website URL
                </label>
                <Input
                  placeholder="https://yourwebsite.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="bg-secondary border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" /> Cell Phone
                </label>
                <Input
                  type="tel"
                  placeholder="(954) 555-1234"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full text-lg py-6 bg-primary text-primary-foreground hover:bg-primary/90 glow-border rounded-xl font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Build My AI Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              No credit card required · Your data is private · Demo ready in 60 seconds
            </p>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default LeadCaptureSection;
