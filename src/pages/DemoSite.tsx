import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
  const [, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const returnTo = searchParams.get("returnTo");
  const previewUrl = leadData?.websiteUrl
    ? leadData.websiteUrl.startsWith("http://")
      ? leadData.websiteUrl.replace(/^http:\/\//i, "https://")
      : leadData.websiteUrl.startsWith("http")
        ? leadData.websiteUrl
        : `https://${leadData.websiteUrl}`
    : "";

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

  useEffect(() => {
    setIframeBlocked(false);
    iframeLoadedRef.current = false;
    setIframeLoaded(false);
  }, [previewUrl]);

  // Iframe block detection: timeout fallback + onLoad check
  const iframeLoadedRef = useRef(false);
  useEffect(() => {
    if (!leadData || iframeBlocked || !previewUrl) return;
    iframeLoadedRef.current = false;
    setIframeLoaded(false);

    const timer = setTimeout(() => {
      if (!iframeLoadedRef.current) {
        setIframeBlocked(true);
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [previewUrl, iframeBlocked, leadData]);

  const handleIframeLoad = () => {
    iframeLoadedRef.current = true;
    setIframeLoaded(true);
    try {
      // If contentDocument is accessible, iframe loaded same-origin content successfully
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        // Same-origin: check if body is empty (blocked)
        const bodyContent = doc.body?.innerHTML || "";
        if (!bodyContent.trim()) {
          setIframeBlocked(true);
        }
      }
      // If doc is null, it's cross-origin. We can't tell if it's blocked or loaded.
      // The timeout will handle truly blocked cases (blank page).
    } catch {
      // Cross-origin access throws — this is normal for successfully loaded cross-origin pages
      // Cancel the timeout since the iframe did load something
    }
  };

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
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 text-center shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Demo Preview</p>
            <h1 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">
              Select a lead to open the live demo
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This page is meant to preview a specific business website with the Aspen voice and chat widgets overlaid on top. Open a lead from Prospects to generate the demo for that company.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate("/prospects")}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Go to Prospects
              </button>
              <button
                onClick={() => navigate("/landing")}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                View Landing Page
              </button>
            </div>
          </div>
        </div>
      );
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
      <div className="relative flex-1 overflow-hidden bg-muted/20">
        <div className="absolute inset-0 overflow-auto">
          <div className="min-h-full w-full px-0 py-0 sm:px-4 sm:py-4 lg:px-6">
            <div className="relative mx-auto min-h-[calc(100vh-11rem)] w-full max-w-[1400px] overflow-hidden bg-background shadow-2xl sm:rounded-[1.75rem] sm:border sm:border-border/70">
              {!iframeBlocked && previewUrl ? (
                <iframe
                  ref={iframeRef}
                  key={previewUrl}
                  src={previewUrl}
                  title={`${siteName} website`}
                  className="h-full min-h-[calc(100vh-11rem)] w-full border-0 bg-background"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  onError={() => setIframeBlocked(true)}
                  onLoad={handleIframeLoad}
                  style={{ width: "100%", height: "100%", minHeight: "calc(100vh - 11rem)" }}
                />
              ) : screenshotSrc ? (
                <div className="relative h-full min-h-[calc(100vh-11rem)] w-full overflow-hidden bg-muted">
                  <img
                    src={screenshotSrc}
                    alt={`${siteName} website`}
                    className="block w-full h-auto"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    style={{ maxWidth: "100%", objectFit: "contain" }}
                  />
                </div>
              ) : (
                <div className="flex h-full min-h-[calc(100vh-11rem)] items-center justify-center bg-muted">
                  <p className="text-lg text-muted-foreground">Website preview unavailable</p>
                </div>
              )}

              {/* DEMO watermark — only show on screenshot fallback */}
              {iframeBlocked && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <p className="select-none text-[clamp(2.5rem,10vw,8rem)] font-black tracking-[0.35em] text-foreground/[0.06]">
                    DEMO
                  </p>
                </div>
              )}

              {/* ===== AI Widget buttons — anchored inside the website frame ===== */}
              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-50 px-3 sm:bottom-6 sm:px-6">
                <div className="relative mx-auto h-0 w-full max-w-[1100px]">
                  <div className="pointer-events-auto absolute bottom-0 left-0">
                    {chatOpen ? (
                      <div className="w-[min(20rem,calc(100vw-2.5rem))] max-h-[60vh] overflow-y-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
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
                        className="group flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-accent-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:px-4 sm:py-2.5"
                      >
                        <div className="relative">
                          <MessageSquare className="h-4 w-4" />
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-accent" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold leading-tight sm:text-sm">Chat with Aspen</p>
                          <p className="hidden text-[9px] opacity-80 sm:block">AI Chat</p>
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="pointer-events-auto absolute bottom-0 right-0">
                    {voiceOpen ? (
                      <div className="w-[min(20rem,calc(100vw-2.5rem))] max-h-[60vh] overflow-y-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
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
                        className="group flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:px-4 sm:py-2.5"
                      >
                        <div className="relative">
                          <Mic className="h-4 w-4" />
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-primary" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold leading-tight sm:text-sm">Talk to Aspen</p>
                          <p className="hidden text-[9px] opacity-80 sm:block">AI Voice</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
