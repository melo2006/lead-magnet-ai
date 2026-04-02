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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [prospectOwner, setProspectOwner] = useState<{name?: string; email?: string; phone?: string} | null>(null);
  const returnTo = searchParams.get("returnTo");
  const prospectIdParam = searchParams.get("prospectId");

  // Handle URL params from CRM (e.g. /demo?url=...&name=...&niche=...)
  useEffect(() => {
    const urlParam = searchParams.get("url");
    const nameParam = searchParams.get("name");
    const nicheParam = searchParams.get("niche");

    if (!urlParam || latestLeadData) return;

    let cancelled = false;

    setLeadData(undefined);
    setChatOpen(false);
    setVoiceOpen(false);
    setIframeBlocked(false);
    setProspectOwner(null);

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
          leadId: insertedLead.id,
          prospectId: prospectIdParam || undefined,
          fullName: fullLead.full_name || "CRM Prospect",
          businessName: fullLead.business_name || nameParam || "Business",
          email: fullLead.email || undefined,
          websiteUrl: fullLead.website_url || urlParam,
          phone: fullLead.phone || undefined,
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

  useEffect(() => {
    if (!latestLeadData) return;
    setLeadData(latestLeadData);
    setChatOpen(false);
    setVoiceOpen(false);
    setIframeBlocked(false);
    setProspectOwner(null);
  }, [latestLeadData]);

  // Fetch prospect owner data when prospectId is available
  useEffect(() => {
    const pid = leadData?.prospectId || prospectIdParam;
    if (!pid) return;
    supabase.from('prospects')
      .select('owner_name, owner_email, owner_phone')
      .eq('id', pid)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProspectOwner({
            name: data.owner_name || undefined,
            email: data.owner_email || undefined,
            phone: data.owner_phone || undefined,
          });
        }
      });
  }, [leadData?.prospectId, prospectIdParam]);

  // Iframe embed-blocking detection
  useEffect(() => {
    if (!leadData || iframeBlocked) return;
    const timer = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      try {
        if (iframe.contentDocument === null) setIframeBlocked(true);
      } catch {
        // Cross-origin error means the site loaded successfully
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [leadData, iframeBlocked]);

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
              This page is meant to preview a specific business website with the Aspen voice and chat widgets overlaid on top.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate("/prospects")}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Go to Prospects
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  const screenshotSrc = getImageSrc(leadData.screenshot);
  const homepageUrl = (() => {
    try {
      const normalizedUrl = leadData.websiteUrl.startsWith("http") ? leadData.websiteUrl : `https://${leadData.websiteUrl}`;
      const url = new URL(normalizedUrl);
      return `${url.protocol}//${url.host}`;
    } catch {
      return leadData.websiteUrl;
    }
  })();
  const hasCrmContext = Boolean(leadData.prospectId || prospectIdParam);
  const knownCallerName = !hasCrmContext && leadData.fullName !== "CRM Prospect" ? leadData.fullName : undefined;
  const knownCallerEmail = !hasCrmContext ? leadData.email : undefined;
  const knownCallerPhone = !hasCrmContext ? leadData.phone : undefined;
  const followUpName = prospectOwner?.name || (hasCrmContext ? "Ron Melo" : knownCallerName);
  const followUpEmail = prospectOwner?.email || (hasCrmContext ? undefined : knownCallerEmail);
  const followUpPhone = prospectOwner?.phone || (hasCrmContext ? undefined : knownCallerPhone);
  const siteName = leadData.businessName?.trim() || getSiteName(homepageUrl, leadData.title);

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
        <div className="flex items-center gap-2">
          <a
            href={homepageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Open Homepage
          </a>
          <span className="hidden rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:inline-flex">
            Live Demo
          </span>
        </div>
      </div>

      {/* Website — iframe first, screenshot fallback */}
      <div className="relative flex-1">
        {!iframeBlocked && (
          <iframe
            ref={iframeRef}
            src={homepageUrl}
            className="w-full border-0"
            style={{ minHeight: '100vh' }}
            title={`${siteName} website`}
            onLoad={() => {
              try {
                if (iframeRef.current?.contentDocument === null) setIframeBlocked(true);
              } catch { /* cross-origin = loaded fine */ }
            }}
            onError={() => setIframeBlocked(true)}
          />
        )}
        {iframeBlocked && (screenshotSrc ? (
          <div className="relative mx-auto w-full max-w-[1600px]">
            <img
              src={screenshotSrc}
              alt={`${siteName} website`}
              className="block w-full h-auto"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
        ) : (
          <div className="flex h-[60vh] w-full items-center justify-center bg-muted">
            <p className="text-lg text-muted-foreground">Website preview unavailable</p>
          </div>
        ))}

        {/* ===== AI Widget buttons — fixed to the bottom of the viewport ===== */}
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-3 sm:bottom-6 sm:px-6">
          <div className="relative mx-auto h-0 w-full max-w-[1100px]">
            <div className="pointer-events-auto absolute bottom-0 left-0">
              {chatOpen ? (
                <div className="w-[min(20rem,calc(100vw-2.5rem))] max-h-[60vh] overflow-y-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
                  <ChatWidget
                    key={`chat-${leadData.websiteUrl}`}
                    businessName={siteName}
                    businessNiche={leadData.niche || "general"}
                    websiteUrl={homepageUrl}
                    businessInfo={leadData.websiteContent || leadData.description || ""}
                    ownerName={followUpName}
                    callerName={knownCallerName}
                    callerEmail={knownCallerEmail}
                    callerPhone={knownCallerPhone}
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
                    leadId={leadData.leadId}
                    prospectId={leadData.prospectId}
                    businessName={siteName}
                    businessNiche={leadData.niche || "general"}
                    ownerName={followUpName}
                    ownerEmail={followUpEmail}
                    ownerPhone={followUpPhone}
                    websiteUrl={homepageUrl}
                    businessInfo={leadData.websiteContent || leadData.description || ""}
                    callerName={knownCallerName}
                    callerEmail={knownCallerEmail}
                    callerPhone={knownCallerPhone}
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
  );
};

export default DemoSite;
