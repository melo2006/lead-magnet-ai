import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { MessageSquare, Mic, ArrowLeft } from "lucide-react";
import type { DemoLeadData } from "@/components/landing/demo-results/demoResultsUtils";
import { getImageSrc, getSiteName } from "@/components/landing/demo-results/demoResultsUtils";
import VoiceAgentWidget from "@/components/landing/demo-results/VoiceAgentWidget";
import ChatWidget from "@/components/landing/demo-results/ChatWidget";
import ScanningAnimation from "@/components/landing/ScanningAnimation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DemoSite = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isScanning, setIsScanning] = useState(false);

  const latestLeadData = location.state?.leadData as DemoLeadData | undefined;
  const [leadData, setLeadData] = useState<DemoLeadData | undefined>(latestLeadData);
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const returnTo = searchParams.get("returnTo");

  // Handle URL params from CRM (e.g. /demo?url=...&name=...&niche=...)
  useEffect(() => {
    const urlParam = searchParams.get("url");
    const nameParam = searchParams.get("name");
    const nicheParam = searchParams.get("niche");

    if (!urlParam || latestLeadData) return;

    let cancelled = false;

    // Always clear when opening a lead from CRM so stale demos never bleed into a new one
    setLeadData(undefined);
    setChatOpen(false);
    setVoiceOpen(false);

    const scanWebsite = async () => {
      setIsScanning(true);
      try {
        const { data: insertedLead, error: insertError } = await supabase
          .from("leads")
          .insert({
            full_name: "CRM Prospect",
            business_name: nameParam || "Business",
            website_url: urlParam,
            niche: nicheParam || "general",
            scan_status: "pending",
          })
          .select("id")
          .single();

        if (insertError) throw insertError;

        const { error } = await supabase.functions.invoke("scan-website", {
          body: {
            websiteUrl: urlParam,
            leadId: insertedLead.id,
            initialNiche: nicheParam || "general",
            businessName: nameParam || "",
          },
        });

        if (error) throw error;

        const { data: fullLead, error: fetchError } = await supabase
          .from("leads")
          .select("*")
          .eq("id", insertedLead.id)
          .single();

        if (fetchError) throw fetchError;

        if (cancelled) return;

        const newLeadData: DemoLeadData = {
          fullName: "CRM Prospect",
          businessName: fullLead.business_name || nameParam || "Business",
          websiteUrl: urlParam,
          niche: fullLead.niche || nicheParam || "general",
          screenshot: fullLead.website_screenshot || null,
          title: fullLead.website_title || "",
          description: fullLead.website_description || "",
          websiteContent: fullLead.website_content || "",
          colors: (fullLead.brand_colors as Record<string, string>) || {},
          logo: fullLead.brand_logo || "",
        };

        setLeadData(newLeadData);

        toast.success(`Demo generated for ${nameParam || "this business"}`);
      } catch (err: any) {
        console.error("Scan error:", err);
        toast.error("Failed to generate demo. " + (err.message || ""));
      } finally {
        setIsScanning(false);
      }
    };

    scanWebsite();

    return () => {
      cancelled = true;
    };
  }, [searchParams.toString(), latestLeadData]);

  // Save state data to localStorage
  useEffect(() => {
    if (!latestLeadData) return;
    setLeadData(latestLeadData);
    setChatOpen(false);
    setVoiceOpen(false);
  }, [latestLeadData]);

  const handleBack = () => {
    if (returnTo && returnTo.startsWith("/")) {
      navigate(returnTo);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/prospects");
  };

  // Loading state
  if (isScanning) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-2xl px-4">
          <ScanningAnimation websiteUrl={searchParams.get("url") || "website"} onComplete={() => {}} />
        </div>
      </div>
    );
  }

  if (!leadData) {
    if (!searchParams.get("url")) {
      navigate("/", { replace: true });
      return null;
    }
    return null;
  }

  const screenshotSrc = getImageSrc(leadData.screenshot);
  const siteName = leadData.businessName?.trim() || getSiteName(leadData.websiteUrl, leadData.title);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-sm font-medium text-foreground">{siteName}</span>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:block">
          AI-Enhanced Demo Preview
        </span>
      </div>

      {/* Website display area — live iframe with screenshot fallback */}
      <div className="relative flex-1">
        <div className="h-[calc(100vh-11rem)] overflow-hidden">
          {!iframeBlocked && leadData.websiteUrl ? (
            <iframe
              key={leadData.websiteUrl}
              src={leadData.websiteUrl.startsWith("http") ? leadData.websiteUrl : `https://${leadData.websiteUrl}`}
              title={`${siteName} website`}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              onError={() => setIframeBlocked(true)}
              onLoad={() => {
                // iframe loaded successfully
              }}
            />
          ) : screenshotSrc ? (
            <div className="h-full overflow-y-auto overscroll-contain">
              <img
                src={screenshotSrc}
                alt={`${siteName} website`}
                className="block h-auto w-full object-contain object-top align-top"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center bg-muted">
              <p className="text-lg text-muted-foreground">Website preview unavailable</p>
            </div>
          )}
        </div>

        {/* DEMO watermark — only show on screenshot fallback */}
        {iframeBlocked && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="select-none text-[clamp(2.5rem,10vw,8rem)] font-black tracking-[0.35em] text-foreground/[0.06]">
              DEMO
            </p>
          </div>
        )}

        {/* ===== AI Widget buttons — fixed to bottom-right of viewport, INSIDE the page ===== */}

        {/* Voice widget / button */}
        <div className="fixed bottom-20 right-4 z-50 sm:bottom-24 sm:right-6">
          {voiceOpen ? (
            <div className="w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
              <VoiceAgentWidget
                key={`voice-${leadData.websiteUrl}`}
                businessName={siteName}
                businessNiche={leadData.niche || "general"}
                ownerName={leadData.fullName}
                ownerEmail={leadData.email}
                ownerPhone={leadData.phone}
                websiteUrl={leadData.websiteUrl}
                businessInfo={leadData.websiteContent || leadData.description || ""}
                onClose={() => setVoiceOpen(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => { setVoiceOpen(true); setChatOpen(false); }}
              className="group flex items-center gap-3 rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              <div className="relative">
                <Mic className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold leading-tight">Talk to Aspen</p>
                <p className="text-[10px] opacity-80">AI Voice Assistant</p>
              </div>
            </button>
          )}
        </div>

        {/* Chat widget / button */}
        <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
          {chatOpen ? (
            <div className="w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
              <ChatWidget
                key={`chat-${leadData.websiteUrl}`}
                businessName={siteName}
                businessNiche={leadData.niche || "general"}
                websiteUrl={leadData.websiteUrl}
                businessInfo={leadData.websiteContent || leadData.description || ""}
                ownerName={leadData.fullName}
                callerPhone={leadData.phone}
                onClose={() => setChatOpen(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => { setChatOpen(true); setVoiceOpen(false); }}
              className="group flex items-center gap-3 rounded-2xl bg-accent px-5 py-3.5 text-accent-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              <div className="relative">
                <MessageSquare className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-accent" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold leading-tight">Chat with Aspen</p>
                <p className="text-[10px] opacity-80">AI Chat Assistant</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div className="border-t border-border bg-card px-6 py-6 text-center">
        <p className="mb-3 text-sm text-muted-foreground">
          Impressed? These AI assistants can be added to any website in minutes.
        </p>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Get Started — Contact Us
        </button>
      </div>
    </div>
  );
};

export default DemoSite;
