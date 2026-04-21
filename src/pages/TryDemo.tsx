import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Globe,
  Loader2,
  PhoneForwarded,
  MessageSquare,
  Mail,
  UserCheck,
  Clock,
  Zap,
  Star,
  Shield,
  User,
  Phone,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ScanningAnimation from "@/components/landing/ScanningAnimation";
import type { DemoLeadData } from "@/components/landing/demo-results/demoResultsUtils";

const LAST_DEMO_STORAGE_KEY = "lastDemoLeadData";

const normalizeUrl = (raw: string): string => {
  let url = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  url = url.replace(/^(?:https?:\/\/)/i, "");
  url = url.replace(/\/+$/, "");
  if (!url) return raw.trim();
  return `https://${url}`;
};

const looksLikeDomain = (value: string) =>
  /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+/.test(
    value.replace(/^(?:https?:\/\/)/i, "").replace(/^www\./i, "")
  );

const extractBusinessName = (url: string): string => {
  try {
    const clean = url.replace(/^(?:https?:\/\/)/i, "").replace(/^www\./i, "");
    const domain = clean.split("/")[0].split(".")[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return "Business";
  }
};

const formSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  url: z
    .string()
    .trim()
    .min(1, "Enter your website URL")
    .max(255)
    .refine((v) => looksLikeDomain(v), { message: "Enter a valid domain (e.g. mybusiness.com)" })
    .transform(normalizeUrl),
});

const benefits = [
  { icon: PhoneForwarded, label: "Warm Transfer", desc: "AI transfers hot leads live to you with a full summary" },
  { icon: MessageSquare, label: "SMS After Every Call", desc: "Get an instant text with the lead details & summary" },
  { icon: Mail, label: "Email Summary", desc: "Full call recap emailed to you after every conversation" },
  { icon: UserCheck, label: "Lead Capture & CRM", desc: "Every lead is saved — use our CRM or integrate yours" },
  { icon: Clock, label: "24/7 AI Receptionist", desc: "Never miss a call — AI answers & books appointments" },
  { icon: Zap, label: "Instant Lead Capture", desc: "Converts website visitors into booked calls" },
];

const TryDemo = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanData, setScanData] = useState<DemoLeadData | null>(null);
  // Pre-fill form fields from URL params (e.g. coming from CRM prospect table)
  useEffect(() => {
    const urlParam = searchParams.get("url");
    const nameParam = searchParams.get("name");
    const _nicheParam = searchParams.get("niche");
    const phoneParam = searchParams.get("callerPhone");
    const emailParam = searchParams.get("callerEmail");
    const callerNameParam = searchParams.get("callerName");

    if (urlParam && !url) setUrl(urlParam.replace(/^https?:\/\//i, ""));
    if (callerNameParam && !fullName) setFullName(callerNameParam);
    else if (nameParam && !fullName) setFullName(nameParam);
    if (phoneParam && !phone) setPhone(phoneParam);
    if (emailParam && !email) setEmail(emailParam);
  }, []);

  // Navigate to demo as soon as scan data is ready (animation stays in continuous mode)
  useEffect(() => {
    if (!isScanning || !scanData) return;
    navigate("/demo-site", { state: { leadData: scanData } });
  }, [isScanning, scanData, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = formSchema.safeParse({ fullName, phone, email, url });
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      toast({ title: "Missing info", description: firstError?.message, variant: "destructive" });
      return;
    }

    const { fullName: name, phone: ph, email: em, url: websiteUrl } = parsed.data;
    const businessName = extractBusinessName(websiteUrl);

    setIsSubmitting(true);

    try {
      // Check for a cached scan of this URL (scanned within last 7 days with content)
      const CACHE_MAX_AGE_DAYS = 7;
      const cacheThreshold = new Date(Date.now() - CACHE_MAX_AGE_DAYS * 86400000).toISOString();

      const { data: cachedLead } = await supabase
        .from("leads")
        .select("*")
        .eq("website_url", websiteUrl)
        .eq("scan_status", "complete")
        .not("website_content", "is", null)
        .gte("updated_at", cacheThreshold)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (cachedLead) {
        console.log("Cache hit — reusing existing scan for", websiteUrl);

        // Insert a new lead row referencing the visitor's info but skip re-scanning
        const { data: newLead } = await supabase
          .from("leads")
          .insert([{
            business_name: cachedLead.business_name || businessName,
            full_name: name,
            phone: ph,
            email: em || null,
            website_url: websiteUrl,
            niche: cachedLead.niche || "general",
            scan_status: "complete",
            website_content: cachedLead.website_content,
            website_title: cachedLead.website_title,
            website_description: cachedLead.website_description,
            website_screenshot: cachedLead.website_screenshot,
            brand_colors: cachedLead.brand_colors,
            brand_logo: cachedLead.brand_logo,
            brand_fonts: cachedLead.brand_fonts,
          }])
          .select("id")
          .single();

        const leadId = newLead?.id || cachedLead.id;

        const leadData: DemoLeadData = {
          leadId,
          fullName: name,
          phone: ph,
          email: em || undefined,
          businessName: cachedLead.business_name || businessName,
          websiteUrl,
          niche: cachedLead.niche || "general",
          screenshot: cachedLead.website_screenshot ?? undefined,
          screenshotTablet: (cachedLead as any).screenshot_tablet ?? undefined,
          screenshotMobile: (cachedLead as any).screenshot_mobile ?? undefined,
          title: cachedLead.website_title ?? undefined,
          description: cachedLead.website_description ?? undefined,
          websiteContent: cachedLead.website_content ?? undefined,
          colors: cachedLead.brand_colors && typeof cachedLead.brand_colors === "object" && !Array.isArray(cachedLead.brand_colors)
            ? (cachedLead.brand_colors as Record<string, string | undefined>)
            : undefined,
          logo: cachedLead.brand_logo ?? undefined,
        };

        setScanData(leadData);
        setIsScanning(true);
        try { localStorage.setItem(LAST_DEMO_STORAGE_KEY, JSON.stringify(leadData)); } catch {}
        return;
      }

      // No cache — full scan flow
      const { data: lead, error } = await supabase
        .from("leads")
        .insert([{
          business_name: businessName,
          full_name: name,
          phone: ph,
          email: em || null,
          website_url: websiteUrl,
          niche: "general",
        }])
        .select("id")
        .single();

      if (error) throw error;

      setIsScanning(true);

      const scanResult = await supabase.functions.invoke("scan-website", {
        body: {
          leadId: lead.id,
          websiteUrl,
          businessName,
          initialNiche: "general",
        },
      });

      if (scanResult.error) {
        console.error("Scan error:", scanResult.error);
        toast({ title: "Loading demo", description: "Opening with saved details." });
      }

      const { data: updatedLead } = await supabase
        .from("leads")
        .select("*")
        .eq("id", lead.id)
        .single();

      const leadData: DemoLeadData = {
        leadId: lead.id,
        fullName: name,
        phone: ph,
        email: em || undefined,
        businessName: updatedLead?.business_name || businessName,
        websiteUrl,
        niche: updatedLead?.niche || "general",
        screenshot: updatedLead?.website_screenshot ?? undefined,
        screenshotTablet: (updatedLead as any)?.screenshot_tablet ?? undefined,
        screenshotMobile: (updatedLead as any)?.screenshot_mobile ?? undefined,
        title: updatedLead?.website_title ?? undefined,
        description: updatedLead?.website_description ?? undefined,
        websiteContent: updatedLead?.website_content ?? undefined,
        colors: updatedLead?.brand_colors && typeof updatedLead.brand_colors === "object" && !Array.isArray(updatedLead.brand_colors)
          ? (updatedLead.brand_colors as Record<string, string | undefined>)
          : undefined,
        logo: updatedLead?.brand_logo ?? undefined,
      };

      setScanData(leadData);
      try { localStorage.setItem(LAST_DEMO_STORAGE_KEY, JSON.stringify(leadData)); } catch {}
    } catch (err) {
      console.error("Error:", err);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      setIsScanning(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isScanning) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <ScanningAnimation websiteUrl={url} onComplete={() => {}} mode="continuous" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-4"
        >
          <div className="inline-flex items-center gap-2">
            <img src="/favicon.png" alt="AI Hidden Leads" className="w-7 h-7" />
            <span className="text-sm font-semibold tracking-tight text-muted-foreground">
              AI <span className="text-primary">Hidden</span> Leads
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-3">
            See Your Website With{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AI
            </span>
            {" "}— Live Demo
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg mb-2">
            Enter your info below and within ~90 seconds, watch your website come alive with Voice AI and Chat AI — personalized for your business.
          </p>
          <p className="text-muted-foreground/70 text-xs sm:text-sm mb-5 italic">
            Capture just one or two extra leads a month and the system pays for itself.
          </p>
        </motion.div>

        {/* Benefits grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6"
        >
          {benefits.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border bg-card/60 backdrop-blur-sm text-left"
            >
              <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onSubmit={handleSubmit}
          className="w-full space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Your Full Name *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-9 h-12 text-sm bg-card border-border rounded-xl focus-visible:ring-primary"
                disabled={isSubmitting}
              />
            </div>
            {/* Phone */}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Phone Number *"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9 h-12 text-sm bg-card border-border rounded-xl focus-visible:ring-primary"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Website */}
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="mybusiness.com *"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => {
                  if (url.trim()) {
                    const normalized = normalizeUrl(url);
                    if (normalized !== url) setUrl(normalized);
                  }
                }}
                className="pl-9 h-12 text-sm bg-card border-border rounded-xl focus-visible:ring-primary"
                disabled={isSubmitting}
              />
            </div>
            {/* Email (optional) */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Email (optional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-12 text-sm bg-card border-border rounded-xl focus-visible:ring-primary"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || !url.trim() || !fullName.trim() || !phone.trim()}
            className="w-full h-14 text-base font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.6)] transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Show Me My AI Demo"
            )}
          </Button>
        </motion.form>

        {/* Demo disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-4 px-4 py-3 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm"
        >
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <button
              type="button"
              onClick={() => navigate("/prospects")}
              className="mr-1 inline-flex items-center font-semibold text-foreground/80 transition-colors hover:text-primary"
              title="Go to Prospects"
              aria-label="Go to Prospects"
            >
              ⚡ Quick demo disclaimer:
            </button>
            This is a rapid AI-generated simulation built in about 90 seconds — not a full knowledge base. It gives you a taste of what your AI receptionist will sound like. The production version we build for you will be much more detailed and accurate. You can even test a live warm transfer during the demo!
          </p>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-5 flex flex-col items-center gap-2"
        >
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="text-sm text-muted-foreground ml-1.5">Trusted by 500+ local businesses</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-primary" /> Free
            </span>
            <span>·</span>
            <span>No signup required</span>
            <span>·</span>
            <span>~90 seconds</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TryDemo;
