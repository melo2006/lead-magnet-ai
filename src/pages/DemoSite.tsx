import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MessageSquare, Mic, ArrowLeft } from "lucide-react";
import type { DemoLeadData } from "@/components/landing/demo-results/demoResultsUtils";
import { getImageSrc, getSiteName } from "@/components/landing/demo-results/demoResultsUtils";
import VoiceAgentWidget from "@/components/landing/demo-results/VoiceAgentWidget";
import ChatWidget from "@/components/landing/demo-results/ChatWidget";

const DemoSite = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const leadData = location.state?.leadData as DemoLeadData | undefined;
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  useEffect(() => {
    if (!leadData) {
      navigate("/", { replace: true });
    }
  }, [leadData, navigate]);

  if (!leadData) return null;

  const screenshotSrc = getImageSrc(leadData.screenshot);
  const siteName = getSiteName(leadData.websiteUrl, leadData.title);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Top banner */}
      <div className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-sm font-medium text-foreground">{siteName}</span>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          This is a demo preview — the floating AI assistants show what your website could look like with our technology.
        </p>
      </div>

      {/* Full-page screenshot as static background */}
      <div className="w-full">
        {screenshotSrc ? (
          <img
            src={screenshotSrc}
            alt={`${siteName} website screenshot`}
            className="w-full h-auto"
          />
        ) : (
          <div className="flex items-center justify-center h-[80vh] bg-muted">
            <p className="text-muted-foreground text-lg">Website screenshot unavailable</p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-border bg-card px-6 py-8 text-center">
        <p className="text-muted-foreground text-sm mb-3">
          Impressed? These AI assistants can be added to any website in minutes.
        </p>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Get Started — Contact Us
        </button>
      </div>

      {/* ── Floating Chat Button (bottom-left) ── */}
      <div className="fixed bottom-6 left-6 z-50">
        {chatOpen ? (
          <div className="mb-3 w-80 sm:w-96 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <ChatWidget
              businessName={siteName}
              businessNiche={leadData.niche || "general"}
              websiteUrl={leadData.websiteUrl}
              businessInfo={leadData.websiteContent || leadData.description || ""}
              callerName={leadData.fullName}
              callerEmail={leadData.email}
              callerPhone={leadData.phone}
              onClose={() => setChatOpen(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="group flex items-center gap-3 rounded-2xl bg-accent px-5 py-3.5 text-accent-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
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

      {/* ── Floating Voice Button (bottom-right) ── */}
      <div className="fixed bottom-6 right-6 z-50">
        {voiceOpen ? (
          <div className="mb-3 w-80 sm:w-96 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <VoiceAgentWidget
              businessName={siteName}
              businessNiche={leadData.niche || "general"}
              ownerName="Ron Melo"
              ownerEmail={leadData.email}
              ownerPhone={leadData.phone}
              websiteUrl={leadData.websiteUrl}
              businessInfo={leadData.websiteContent || leadData.description || ""}
              callerName={leadData.fullName}
              callerEmail={leadData.email}
              onClose={() => setVoiceOpen(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setVoiceOpen(true)}
            className="group flex items-center gap-3 rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
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
    </div>
  );
};

export default DemoSite;
