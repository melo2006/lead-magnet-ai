import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Shield, Play, Pause, StopCircle, Loader2,
  Globe, Mail, Smartphone, Zap, DollarSign, Filter,
  Monitor, Camera, ChevronDown, ChevronUp
} from "lucide-react";
import type { Prospect } from "@/hooks/useProspectSearch";
import type { UseProspectAnalysisReturn } from "@/hooks/useProspectAnalysis";

interface Props {
  analysis: UseProspectAnalysisReturn;
  prospects: Prospect[];
  onFilterTripleQualified?: () => void;
  onFilterDemoReady?: (mode: "live" | "screenshot") => void;
  onRefetch?: () => void;
}

interface ScanResult {
  prospectId: string;
  businessName: string;
  embeddable: boolean;
  unreachable?: boolean;
}

const COST_FULL_ENRICH = 0.025;  // Full: Firecrawl + Hunter + Twilio + AI

type WorkflowPhase = "idle" | "contact_scan" | "contact_done" | "iframe_scan" | "iframe_done" | "enriching";

const SmartPreScan = ({ analysis, prospects, onFilterTripleQualified, onFilterDemoReady, onRefetch }: Props) => {
  const { analyzeBatch, batchProgress, interruptedState, resumeInterrupted } = analysis;
  const [phase, setPhase] = useState<WorkflowPhase>("idle");
  const [scanProgress, setScanProgress] = useState({ completed: 0, total: 0 });
  const [iframeScanResults, setIframeScanResults] = useState<ScanResult[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const pauseRef = useRef(false);
  const stopRef = useRef(false);

  const hasInterruptedEnrichment = Boolean(interruptedState && !batchProgress.isRunning);
  const interruptedRemaining = interruptedState ? Math.max(0, interruptedState.total - interruptedState.completed) : 0;

  // Stats from current prospect data
  const httpsProspects = prospects.filter(p => p.website_url?.startsWith("https://"));
  const withEmail = prospects.filter(p => (p as any).owner_email || (p as any).email);
  const smsCapable = prospects.filter(p => (p as any).sms_capable === true);
  const enriched = prospects.filter(p => (p as any).ai_analyzed);
  const notEnriched = prospects.filter(p => !(p as any).ai_analyzed && p.id);

  // Dual demo buckets
  const contactReady = prospects.filter(p => {
    const hasEmail = Boolean((p as any).owner_email || (p as any).email);
    const hasSms = (p as any).sms_capable === true;
    return hasEmail || hasSms;
  });

  const liveDemoReady = prospects.filter(p => {
    const isIframe = p.website_url?.startsWith("https://");
    const hasEmail = Boolean((p as any).owner_email || (p as any).email);
    const hasSms = (p as any).sms_capable === true;
    return isIframe && (hasEmail || hasSms);
  });

  const screenshotDemoReady = prospects.filter(p => {
    const notIframe = !p.website_url?.startsWith("https://") || iframeScanResults.some(r => r.prospectId === p.id && !r.embeddable);
    const hasEmail = Boolean((p as any).owner_email || (p as any).email);
    const hasSms = (p as any).sms_capable === true;
    return p.website_url && notIframe && (hasEmail || hasSms);
  });

  const tripleQualified = prospects.filter(p => {
    const hasEmail = Boolean((p as any).owner_email || (p as any).email);
    const hasSms = (p as any).sms_capable === true;
    const isIframe = p.website_url?.startsWith("https://");
    return isIframe && hasEmail && hasSms;
  });

  // iFrame scan helpers
  const iframePassedCount = iframeScanResults.filter(r => r.embeddable).length;
  const iframeFailedCount = iframeScanResults.filter(r => !r.embeddable).length;

  const handlePause = () => { pauseRef.current = true; setIsPaused(true); };
  const handleResume = () => { pauseRef.current = false; setIsPaused(false); };
  const handleStop = () => {
    stopRef.current = true;
    pauseRef.current = false;
    setIsPaused(false);
    if (phase === "contact_scan") setPhase("contact_done");
    if (phase === "iframe_scan") setPhase("iframe_done");
  };

  // Phase 1: Contact-first enrichment (cheaper — email + phone only on ALL leads)
  const startContactEnrich = useCallback(async () => {
    const toEnrich = notEnriched;
    if (toEnrich.length === 0) {
      toast.info("All leads are already enriched");
      return;
    }
    setPhase("contact_scan");
    await analyzeBatch(
      toEnrich.map(p => ({ id: p.id!, website_url: p.website_url, business_name: p.business_name, niche: p.niche }))
    );
    setPhase("contact_done");
    onRefetch?.();
    toast.success("Contact enrichment complete!");
  }, [notEnriched, analyzeBatch, onRefetch]);

  // Phase 2: iFrame scan (free)
  const startIframeScan = useCallback(async () => {
    stopRef.current = false;
    pauseRef.current = false;
    setIsPaused(false);
    setPhase("iframe_scan");
    setIframeScanResults([]);

    const toScan = httpsProspects.filter(p => p.id);
    setScanProgress({ completed: 0, total: toScan.length });
    const results: ScanResult[] = [];
    const embedOrigin = window.location.origin;

    for (let i = 0; i < toScan.length; i++) {
      if (stopRef.current) break;
      while (pauseRef.current) {
        await new Promise(r => setTimeout(r, 300));
        if (stopRef.current) break;
      }
      if (stopRef.current) break;

      const p = toScan[i];
      try {
        const { data, error } = await supabase.functions.invoke("check-iframe-embed", {
          body: { url: p.website_url, embedOrigin },
        });
        const embeddable = !error && data?.embeddable === true;
        results.push({ prospectId: p.id!, businessName: p.business_name, embeddable, unreachable: data?.unreachable });
      } catch {
        results.push({ prospectId: p.id!, businessName: p.business_name, embeddable: false, unreachable: true });
      }

      setIframeScanResults([...results]);
      setScanProgress({ completed: i + 1, total: toScan.length });
    }

    setPhase("iframe_done");
    toast.success(`iFrame scan done: ${results.filter(r => r.embeddable).length} embeddable, ${results.filter(r => !r.embeddable).length} blocked (will use screenshot demo)`);
  }, [httpsProspects]);

  const scanPct = scanProgress.total > 0 ? (scanProgress.completed / scanProgress.total) * 100 : 0;
  const isScanning = phase === "contact_scan" || phase === "iframe_scan";

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Smart Lead Qualifier</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold">
            Save Money
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {!expanded && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span>📧 {withEmail.length} emails</span>
          <span>📱 {smsCapable.length} SMS</span>
          <span>🖥️ {liveDemoReady.length} live demo</span>
          <span>📸 {screenshotDemoReady.length} screenshot demo</span>
        </div>
      )}

      {expanded && (
        <>
          <p className="text-xs text-muted-foreground">
            Enrich contacts first (all leads), then check iframe for demo type. <strong>No lead is wasted</strong> — blocked sites get screenshot demos.
          </p>

          {/* Continue interrupted enrichment */}
          {hasInterruptedEnrichment && interruptedState && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">⚡ Continue enrichment run</p>
                <p className="text-[11px] text-muted-foreground">
                  {interruptedState.completed}/{interruptedState.total} done · {interruptedRemaining} remaining
                </p>
              </div>
              <Button size="sm" onClick={resumeInterrupted}>
                <Play className="w-3.5 h-3.5" />
                Continue ({interruptedRemaining} left)
              </Button>
            </div>
          )}

          {/* Workflow Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Step 1: Enrich ALL contacts */}
            <div className={`rounded-lg border p-3 space-y-2 ${
              phase === "contact_scan" ? "border-primary/40 bg-primary/10" :
              enriched.length > 0 ? "border-emerald-500/30 bg-emerald-500/5" :
              "border-border bg-card/60"
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  enriched.length > 0 ? "bg-emerald-500 text-white" :
                  phase === "contact_scan" ? "bg-primary text-primary-foreground" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {enriched.length > 0 ? "✓" : "1"}
                </div>
                <span className="text-xs font-semibold text-foreground">Contact Discovery</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold">ALL LEADS</span>
              </div>
              <div className="space-y-1 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1"><Mail className="w-3 h-3" />Hunter.io email discovery</div>
                <div className="flex items-center gap-1"><Smartphone className="w-3 h-3" />Twilio SMS capability check</div>
                <div className="flex items-center gap-1"><Globe className="w-3 h-3" />Firecrawl website scan + AI</div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400 font-bold">~${(notEnriched.length * COST_FULL_ENRICH).toFixed(2)}</span>
                  <span>({notEnriched.length} leads × $0.025)</span>
                </div>
              </div>
              {enriched.length > 0 && (
                <div className="text-[10px] space-y-0.5">
                  <p className="text-emerald-400 font-semibold">✓ {enriched.length} enriched</p>
                  {notEnriched.length > 0 && <p className="text-muted-foreground">{notEnriched.length} remaining</p>}
                </div>
              )}
            </div>

            {/* Step 2: iFrame check (free) */}
            <div className={`rounded-lg border p-3 space-y-2 ${
              phase === "iframe_scan" ? "border-primary/40 bg-primary/10" :
              iframeScanResults.length > 0 ? "border-emerald-500/30 bg-emerald-500/5" :
              "border-border bg-card/60"
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  iframeScanResults.length > 0 ? "bg-emerald-500 text-white" :
                  phase === "iframe_scan" ? "bg-primary text-primary-foreground" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {iframeScanResults.length > 0 ? "✓" : "2"}
                </div>
                <span className="text-xs font-semibold text-foreground">Demo Type Sort</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">FREE</span>
              </div>
              <div className="space-y-1 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1"><Monitor className="w-3 h-3" />Live Demo → embeddable sites (iframe)</div>
                <div className="flex items-center gap-1"><Camera className="w-3 h-3" />Screenshot Demo → blocked sites</div>
                <div className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400 font-bold">FREE</span> — header checks only</div>
              </div>
              {phase === "iframe_scan" && (
                <div className="space-y-1">
                  <Progress value={scanPct} className="h-2" />
                  <p className="text-[10px] text-muted-foreground">{scanProgress.completed}/{scanProgress.total} checked</p>
                </div>
              )}
              {iframeScanResults.length > 0 && phase !== "iframe_scan" && (
                <div className="space-y-0.5 text-[10px]">
                  <p className="text-emerald-400 font-semibold">🖥️ {iframePassedCount} → Live Demo</p>
                  <p className="text-amber-400 font-semibold">📸 {iframeFailedCount} → Screenshot Demo</p>
                  <p className="text-muted-foreground italic">No leads wasted!</p>
                </div>
              )}
            </div>
          </div>

          {/* Demo Buckets Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="text-lg font-bold text-foreground">{prospects.length}</p>
            </div>
            <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contactable</p>
              <p className="text-lg font-bold text-foreground">{contactReady.length}</p>
              <p className="text-[9px] text-muted-foreground">email or SMS</p>
            </div>
            <div className="bg-emerald-500/10 rounded-lg px-3 py-2 border border-emerald-500/25">
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold flex items-center justify-center gap-1">
                <Monitor className="w-3 h-3" />Live Demo
              </p>
              <p className="text-lg font-bold text-emerald-400">{liveDemoReady.length}</p>
              <p className="text-[9px] text-muted-foreground">iframe + contact</p>
            </div>
            <div className="bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/25">
              <p className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold flex items-center justify-center gap-1">
                <Camera className="w-3 h-3" />Screenshot Demo
              </p>
              <p className="text-lg font-bold text-amber-400">{screenshotDemoReady.length}</p>
              <p className="text-[9px] text-muted-foreground">blocked + contact</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isScanning && !batchProgress.isRunning && !hasInterruptedEnrichment && (
              <>
                {notEnriched.length > 0 && (
                  <Button size="sm" onClick={startContactEnrich}>
                    <Zap className="w-3.5 h-3.5" />
                    Enrich All Contacts ({notEnriched.length}) ~${(notEnriched.length * COST_FULL_ENRICH).toFixed(2)}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={startIframeScan} disabled={httpsProspects.length === 0}>
                  <Globe className="w-3.5 h-3.5" />
                  iFrame Check ({httpsProspects.length}) — FREE
                </Button>
              </>
            )}

            {isScanning && (
              <>
                {isPaused ? (
                  <Button size="sm" onClick={handleResume}><Play className="w-3.5 h-3.5" />Resume</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={handlePause}><Pause className="w-3.5 h-3.5" />Pause</Button>
                )}
                <Button size="sm" variant="destructive" onClick={handleStop}><StopCircle className="w-3.5 h-3.5" />Stop</Button>
                <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {phase === "iframe_scan" ? `Checking ${scanProgress.completed}/${scanProgress.total}...` : "Enriching..."}
                </span>
              </>
            )}

            {!isScanning && !batchProgress.isRunning && (
              <>
                {tripleQualified.length > 0 && (
                  <Button size="sm" variant="secondary" onClick={onFilterTripleQualified}>
                    <Filter className="w-3.5 h-3.5" />
                    Triple-Qualified ({tripleQualified.length})
                  </Button>
                )}
                {liveDemoReady.length > 0 && onFilterDemoReady && (
                  <Button size="sm" variant="secondary" onClick={() => onFilterDemoReady("live")}>
                    <Monitor className="w-3.5 h-3.5" />
                    Live Demo ({liveDemoReady.length})
                  </Button>
                )}
                {screenshotDemoReady.length > 0 && onFilterDemoReady && (
                  <Button size="sm" variant="secondary" onClick={() => onFilterDemoReady("screenshot")}>
                    <Camera className="w-3.5 h-3.5" />
                    Screenshot Demo ({screenshotDemoReady.length})
                  </Button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SmartPreScan;
