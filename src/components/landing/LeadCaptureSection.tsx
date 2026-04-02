import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Rocket,
  ArrowRight,
  Globe,
  Phone,
  User,
  Loader2,
  Mail,
  Upload,
  X,
  FileText,
  Link2,
  Building2,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { NicheData } from "@/data/nicheData";
import ScanningAnimation from "./ScanningAnimation";
import type { DemoLeadData } from "./demo-results/demoResultsUtils";

type ViewState = "form" | "scanning" | "results";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const LAST_DEMO_STORAGE_KEY = "lastDemoLeadData";
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const optionalEmailSchema = z
  .string()
  .trim()
  .max(255, "Email is too long")
  .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
    message: "Please enter a valid email address",
  });

const leadFormSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100, "Name is too long"),
  businessName: z.string().trim().min(1, "Please enter your business name").max(150, "Business name is too long"),
  email: optionalEmailSchema,
  website: z.string().trim().min(1, "Please enter your website URL").max(255, "Website URL is too long"),
  phone: z.string().trim().max(30, "Phone number is too long").optional().or(z.literal("")),
  secondaryUrl: z.string().trim().max(255, "URL is too long").optional().or(z.literal("")),
});

interface LeadCaptureSectionProps {
  selectedNiche: NicheData;
}

const LeadCaptureSection = ({ selectedNiche }: LeadCaptureSectionProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<ViewState>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanData, setScanData] = useState<DemoLeadData | null>(null);
  const [scanAnimationDone, setScanAnimationDone] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem("leadFormData");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { name: "", businessName: "", email: "", website: "", phone: "", secondaryUrl: "" };
  });

  // Persist form data to localStorage during dev
  const updateFormData = (update: Partial<typeof formData>) => {
    const next = { ...formData, ...update };
    setFormData(next);
    try { localStorage.setItem("leadFormData", JSON.stringify(next)); } catch {}
  };

  const storeDemoLeadData = useCallback((nextScanData: DemoLeadData) => {
    setScanData(nextScanData);
    try {
      localStorage.setItem(LAST_DEMO_STORAGE_KEY, JSON.stringify(nextScanData));
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    if (viewState !== "scanning" || !scanAnimationDone || !scanData) return;

    navigate("/demo", { state: { leadData: scanData } });
    setViewState("form");
    setScanAnimationDone(false);
  }, [navigate, scanAnimationDone, scanData, viewState]);

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const valid = newFiles.filter((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast({ title: "Invalid file type", description: `${f.name} is not a PDF, TXT, or Word document.`, variant: "destructive" });
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: "File too large", description: `${f.name} exceeds 20MB.`, variant: "destructive" });
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (leadId: string) => {
    const paths: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() || "bin";
      const filePath = `${leadId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("lead-uploads").upload(filePath, file);
      if (error) {
        console.error("File upload error:", error);
        continue;
      }
      paths.push(filePath);
    }
    return paths;
  };

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
    setScanAnimationDone(false);
    try {
      const { data: lead, error } = await supabase
        .from("leads")
        .insert([
          {
            business_name: parsed.data.businessName,
            full_name: parsed.data.name,
            email: parsed.data.email || null,
            website_url: parsed.data.website,
            phone: parsed.data.phone || null,
            secondary_url: parsed.data.secondaryUrl || null,
            niche: selectedNiche.id,
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      let filePaths: string[] = [];
      if (files.length > 0) {
        filePaths = await uploadFiles(lead.id);
        if (filePaths.length > 0) {
          await supabase.from("leads").update({ uploaded_files: filePaths }).eq("id", lead.id);
        }
      }

      setViewState("scanning");

      const scanResult = await supabase.functions.invoke("scan-website", {
        body: {
          leadId: lead.id,
          websiteUrl: parsed.data.website,
          businessName: parsed.data.businessName,
          secondaryUrl: parsed.data.secondaryUrl || null,
          uploadedFiles: filePaths,
          initialNiche: selectedNiche.id,
        },
      });

      if (scanResult.error) {
        console.error("Scan error:", scanResult.error);
        toast({
          title: "Loading a basic demo",
          description: "The site scan took too long, so the demo is opening with the saved business details.",
        });
      } else {
        console.log("Scan completed:", scanResult.data);
      }

      const fallbackScanData: DemoLeadData = {
        leadId: lead.id,
        fullName: parsed.data.name,
        businessName: parsed.data.businessName,
        email: parsed.data.email || undefined,
        websiteUrl: parsed.data.website,
        phone: parsed.data.phone || undefined,
        niche: selectedNiche.id,
        screenshot: undefined,
        title: parsed.data.businessName,
        description: undefined,
        websiteContent: undefined,
        colors: undefined,
        logo: undefined,
      };

      const { data: updatedLead } = await supabase
        .from("leads")
        .select("*")
        .eq("id", lead.id)
        .single();

      if (updatedLead) {
        const normalizedColors =
          updatedLead.brand_colors &&
          typeof updatedLead.brand_colors === "object" &&
          !Array.isArray(updatedLead.brand_colors)
            ? (updatedLead.brand_colors as Record<string, string | undefined>)
            : undefined;

        storeDemoLeadData({
          leadId: updatedLead.id,
          fullName: updatedLead.full_name,
          businessName: updatedLead.business_name || parsed.data.businessName,
          email: parsed.data.email || undefined,
          websiteUrl: updatedLead.website_url,
          phone: parsed.data.phone || undefined,
          niche: updatedLead.niche || selectedNiche.id,
          screenshot: updatedLead.website_screenshot,
          title: updatedLead.website_title,
          description: updatedLead.website_description,
          websiteContent: updatedLead.website_content,
          colors: normalizedColors,
          logo: updatedLead.brand_logo,
        });
      } else {
        storeDemoLeadData(fallbackScanData);
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
    setScanAnimationDone(true);
  }, []);

  if (viewState === "scanning") {
    return (
      <section id="demo-form" className="py-12 sm:py-16 relative">
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <ScanningAnimation websiteUrl={formData.website} onComplete={handleScanComplete} />
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
              Enter your info below. In 60 seconds, you'll see your website screenshot with live AI chat and voice assistants.
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
                  <User className="w-4 h-4 text-muted-foreground" /> Your Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Alex Johnson"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  className="bg-secondary border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" /> Business Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Sunrise Dental Studio"
                  value={formData.businessName}
                  onChange={(e) => updateFormData({ businessName: e.target.value })}
                  className="bg-secondary border-border"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" /> Website URL <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="https://yourwebsite.com"
                  value={formData.website}
                  onChange={(e) => updateFormData({ website: e.target.value })}
                  className="bg-secondary border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" /> Email Address <span className="text-xs text-muted-foreground">(optional)</span>
                </label>
                <Input
                  type="email"
                  placeholder="owner@business.com"
                  value={formData.email}
                  onChange={(e) => updateFormData({ email: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div className="mb-4 space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" /> Cell Phone for callback <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <Input
                type="tel"
                placeholder="(954) 555-1234"
                value={formData.phone}
                onChange={(e) => updateFormData({ phone: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>

            <div className="mb-4 space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-muted-foreground" /> Additional URL <span className="text-xs text-muted-foreground">(optional — vendor site, partner page, etc.)</span>
              </label>
              <Input
                placeholder="https://vendor-or-partner-site.com"
                value={formData.secondaryUrl}
                onChange={(e) => updateFormData({ secondaryUrl: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>

            <div className="mb-6 space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Upload className="w-4 h-4 text-muted-foreground" /> Upload Documents <span className="text-xs text-muted-foreground">(optional — PDF, TXT, Word — up to 3 files)</span>
              </label>
              <div
                className="rounded-xl border-2 border-dashed border-border bg-secondary/50 p-4 text-center cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const dt = e.dataTransfer;
                  if (dt?.files) {
                    const fakeEvent = { target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>;
                    handleFileAdd(fakeEvent);
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.doc,.docx"
                  multiple
                  onChange={handleFileAdd}
                />
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Drag & drop files here, or <span className="text-primary font-medium">click to browse</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mb-2">
                    {files.length}/{MAX_FILES} files selected — click to add more
                  </p>
                )}
              </div>
              {files.length > 0 && (
                <div className="space-y-1">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1 text-foreground">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)}KB</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
              Required: owner name, business name, and website URL. Email and phone are optional but recommended for recap + scheduling.
            </p>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default LeadCaptureSection;
