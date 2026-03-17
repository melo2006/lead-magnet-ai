import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Rocket, ArrowRight, Globe, Phone, User, Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ScanningAnimation from "./ScanningAnimation";
import DemoResults from "./DemoResults";
import type { DemoLeadData } from "./demo-results/demoResultsUtils";

type ViewState = "form" | "scanning" | "results";

const leadFormSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100, "Name is too long"),
  email: z.string().trim().email("Please enter a valid email address").max(255, "Email is too long"),
  website: z.string().trim().min(1, "Please enter your website URL").max(255, "Website URL is too long"),
  phone: z.string().trim().max(30, "Phone number is too long").optional().or(z.literal("")),
});

const LeadCaptureSection = () => {
  const { toast } = useToast();
  const [viewState, setViewState] = useState<ViewState>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanData, setScanData] = useState<DemoLeadData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = leadFormSchema.safeParse(formData);
    if (!parsed.success) {
      toast({
        title: "Please fix the form",
        description: parsed.error.issues[0]?.message ?? "Please review your details and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: lead, error } = await supabase.from("leads").insert({
        full_name: parsed.data.name,
        email: parsed.data.email,
        website_url: parsed.data.website,
        phone: parsed.data.phone || null,
        niche: "realtors",
      }).select("id").single();

      if (error) throw error;

      setViewState("scanning");

      const scanResult = await supabase.functions.invoke("scan-website", {
        body: { leadId: lead.id, websiteUrl: parsed.data.website },
      });

      if (scanResult.error) {
        console.error("Scan error:", scanResult.error);
      } else {
        console.log("Scan completed:", scanResult.data);
      }

      const { data: updatedLead } = await supabase
        .from("leads")
        .select("*")
        .eq("id", lead.id)
        .single();

      if (updatedLead) {
        setScanData({
          fullName: updatedLead.full_name,
          email: updatedLead.email,
          websiteUrl: updatedLead.website_url,
          phone: updatedLead.phone || parsed.data.phone,
          niche: updatedLead.niche || "realtors",
          screenshot: updatedLead.website_screenshot,
          title: updatedLead.website_title,
          description: updatedLead.website_description,
          websiteContent: updatedLead.website_content,
          colors: updatedLead.brand_colors,
          logo: updatedLead.brand_logo,
        });
      }
    } catch (err) {
      console.error("Error submitting lead:", err);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      setViewState("form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanComplete = useCallback(() => {
    setViewState("results");
  }, []);

  const handleBack = () => {
    setViewState("form");
    setFormData({ name: "", email: "", website: "", phone: "" });
    setScanData(null);
  };

  if (viewState === "scanning") {
    return (
      <section id="demo-form" className="py-12 sm:py-16 relative">
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <ScanningAnimation websiteUrl={formData.website} onComplete={handleScanComplete} />
        </div>
      </section>
    );
  }

  if (viewState === "results" && scanData) {
    return (
      <section id="demo-form" className="py-12 sm:py-16 relative">
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <DemoResults leadData={scanData} onBack={handleBack} />
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
              See Your AI Assistant <span className="text-gradient-primary">In Action</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Enter your info below. In 60 seconds, you'll talk to an AI trained on your business and get the recap emailed back to you.
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
                  placeholder="Tony Miller"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-secondary border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" /> Email Address
                </label>
                <Input
                  type="email"
                  placeholder="tony@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-secondary border-border"
                  required
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
                  <Phone className="w-4 h-4 text-muted-foreground" /> Cell Phone for callback
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
              Use the email and phone where you want callback requests and call summaries sent.
            </p>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default LeadCaptureSection;
