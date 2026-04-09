import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Shield, Play, Pause, StopCircle, Loader2,
  Globe, Mail, Smartphone, Zap, DollarSign, Filter
} from "lucide-react";
import type { Prospect } from "@/hooks/useProspectSearch";
import { useProspectAnalysis } from "@/hooks/useProspectAnalysis";

interface Props {
  prospects: Prospect[];
  onFilterTripleQualified?: () => void;
  onRefetch?: () => void;
}

interface ScanResult {
  prospectId: string;
  businessName: string;
  embeddable: boolean;
  unreachable?: boolean;
}

const COST_PER_PROSPECT = 0.025;

const SmartPreScan = ({ prospects, onFilterTripleQualified, onRefetch }: Props) => {
  const { analyzeBatch } = useProspectAnalysis();
  const [phase, setPhase] = useState<"idle" | "scanning" | "scan_done" | "enriching">("idle");
  const [scanProgress, setScanProgress] = useState({ completed: 0, total: 0 });
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const pauseRef = useRef(false);
  const stopRef = useRef(false);

  // Compute stats from current prospect data
  const httpsProspects = prospects.filter(p => p.website_url?.startsWith("https://"));
  
  const withEmail = prospects.filter(p => (p as any).owner_email || (p as any).email);
  const smsCapable = prospects.filter(p => (p as any).sms_capable === true);
  const tripleQualified = prospects.filter(p => {
    const isIframe = p.website_url?.startsWith("https://");
    const hasEmail = Boolean((p as any).owner_email || (p as any).email);
    const hasSms = (p as any).sms_capable === true;
    return isIframe && hasEmail && hasSms;
  });

  // Prospects eligible for iframe scan (have https website, not yet enriched)
  const scanEligible = httpsProspects.filter(p => !(p as any).ai_analyzed && p.id);
  const iframePassedCount = scanResults.filter(r => r.embeddable).length;
  const iframeFailedCount = scanResults.filter(r => !r.embeddable).length;

  const startIframeScan = useCallback(async () => {
    stopRef.current = false;
    pauseRef.current = false;
    setIsPaused(false);
    setPhase("scanning");
    setScanResults([]);

    const toScan = scanEligible;
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
        results.push({
          prospectId: p.id!,
          businessName: p.business_name,
          embeddable,
          unreachable: data?.unreachable,
        });
      } catch {
        results.push({
          prospectId: p.id!,
          businessName: p.business_name,
          embeddable: false,
          unreachable: true,
        });
      }

      setScanResults([...results]);
      setScanProgress({ completed: i + 1, total: toScan.length });
    }

    setPhase("scan_done");
    toast.success(`iFrame scan complete: ${results.filter(r => r.embeddable).length} embeddable out of ${results.length}`);
  }, [scanEligible]);

  const handlePause = () => { pauseRef.current = true; setIsPaused(true); };
  const handleResume = () => { pauseRef.current = false; setIsPaused(false); };
  const handleStop = () => { stopRef.current = true; pauseRef.current = false; setIsPaused(false); setPhase("scan_done"); };

  const handleEnrichIframeOnly = async () => {
    const passedIds = new Set(scanResults.filter(r => r.embeddable).map(r => r.prospectId));
    const toEnrich = prospects.filter(p => p.id && passedIds.has(p.id) && !(p as any).ai_analyzed);
    if (toEnrich.length === 0) {
      toast.info("No new iframe-capable prospects to enrich");
      return;
    }
    setPhase("enriching");
    await analyzeBatch(toEnrich.map(p => ({ id: p.id!, website_url: p.website_url, business_name: p.business_name, niche: p.niche })));
    onRefetch?.();
  };

  const scanPct = scanProgress.total > 0 ? (scanProgress.completed / scanProgress.total) * 100 : 0;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Smart Pre-Scan</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold">
              Save Money
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Check iframe capability first (free), then enrich only qualified leads
          </p>
        </div>
      </div>

      {/* Phase Overview with Cost Estimates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Phase 1 */}
        <div className={`rounded-lg border p-3 space-y-2 ${phase === "scanning" ? "border-primary/40 bg-primary/10" : phase === "scan_done" || phase === "enriching" ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card/60"}`}>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${phase === "scan_done" || phase === "enriching" ? "bg-emerald-500 text-white" : phase === "scanning" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {phase === "scan_done" || phase === "enriching" ? "✓" : "1"}
            </div>
            <span className="text-xs font-semibold text-foreground">iFrame Check</span>
          </div>
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1"><Globe className="w-3 h-3" />{scanEligible.length} HTTPS sites to check</div>
            <div className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400 font-bold">FREE</span> — header checks only</div>
          </div>
          {phase === "scanning" && (
            <div className="space-y-1">
              <Progress value={scanPct} className="h-2" />
              <p className="text-[10px] text-muted-foreground">{scanProgress.completed}/{scanProgress.total} checked</p>
            </div>
          )}
          {(phase === "scan_done" || phase === "enriching") && scanResults.length > 0 && (
            <div className="space-y-0.5 text-[10px]">
              <p className="text-emerald-400 font-semibold">✓ {iframePassedCount} embeddable</p>
              <p className="text-red-400">✗ {iframeFailedCount} blocked</p>
            </div>
          )}
        </div>

        {/* Phase 2 */}
        <div className={`rounded-lg border p-3 space-y-2 ${phase === "enriching" ? "border-primary/40 bg-primary/10" : "border-border bg-card/60"}`}>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${phase === "enriching" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>2</div>
            <span className="text-xs font-semibold text-foreground">Enrich iFrame-Only</span>
          </div>
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1"><Mail className="w-3 h-3" />Hunter.io emails + Twilio phone check</div>
            <div className="flex items-center gap-1"><Smartphone className="w-3 h-3" />Firecrawl website scan + AI analysis</div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400 font-bold">
                ~${((phase === "scan_done" || phase === "enriching" ? iframePassedCount : scanEligible.length) * COST_PER_PROSPECT).toFixed(2)}
              </span>
              <span>
                ({phase === "scan_done" || phase === "enriching" ? iframePassedCount : scanEligible.length} leads × $0.025)
              </span>
            </div>
          </div>
          {phase === "idle" && (
            <p className="text-[10px] text-muted-foreground italic">
              Without pre-scan: ~${(scanEligible.length * COST_PER_PROSPECT).toFixed(2)} for all {scanEligible.length}
            </p>
          )}
          {phase === "scan_done" && iframePassedCount > 0 && scanEligible.length > iframePassedCount && (
            <p className="text-[10px] text-emerald-400 font-semibold">
              💰 Saving ~${((scanEligible.length - iframePassedCount) * COST_PER_PROSPECT).toFixed(2)} by skipping {scanEligible.length - iframePassedCount} non-embeddable sites
            </p>
          )}
        </div>

        {/* Phase 3 */}
        <div className="rounded-lg border border-border bg-card/60 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-secondary text-muted-foreground">3</div>
            <span className="text-xs font-semibold text-foreground">Triple-Qualified Leads</span>
          </div>
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1"><Globe className="w-3 h-3" />iFrame ✓</div>
            <div className="flex items-center gap-1"><Mail className="w-3 h-3" />Email ✓</div>
            <div className="flex items-center gap-1"><Smartphone className="w-3 h-3" />SMS ✓</div>
            <div className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400 font-bold">FREE</span> — filter only</div>
          </div>
          <p className="text-xs font-bold text-foreground">{tripleQualified.length} currently qualified</p>
        </div>
      </div>

      {/* Current Data Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
        <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-lg font-bold text-foreground">{prospects.length}</p>
        </div>
        <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">HTTPS Sites</p>
          <p className="text-lg font-bold text-foreground">{httpsProspects.length}</p>
        </div>
        <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Has Email</p>
          <p className="text-lg font-bold text-foreground">{withEmail.length}</p>
        </div>
        <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">SMS OK</p>
          <p className="text-lg font-bold text-foreground">{smsCapable.length}</p>
        </div>
        <div className="bg-emerald-500/10 rounded-lg px-3 py-2 border border-emerald-500/25">
          <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Demo Ready</p>
          <p className="text-lg font-bold text-emerald-400">{tripleQualified.length}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {phase === "idle" && (
          <Button size="sm" onClick={startIframeScan} disabled={scanEligible.length === 0}>
            <Play className="w-3.5 h-3.5" />
            Start iFrame Scan ({scanEligible.length} sites) — FREE
          </Button>
        )}
        {phase === "scanning" && (
          <>
            {isPaused ? (
              <Button size="sm" onClick={handleResume}><Play className="w-3.5 h-3.5" />Resume</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handlePause}><Pause className="w-3.5 h-3.5" />Pause</Button>
            )}
            <Button size="sm" variant="destructive" onClick={handleStop}><StopCircle className="w-3.5 h-3.5" />Stop</Button>
            <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Checking {scanProgress.completed}/{scanProgress.total}...
            </span>
          </>
        )}
        {phase === "scan_done" && (
          <>
            {iframePassedCount > 0 && (
              <Button size="sm" onClick={handleEnrichIframeOnly}>
                <Zap className="w-3.5 h-3.5" />
                Enrich {iframePassedCount} iFrame-Capable (~${(iframePassedCount * COST_PER_PROSPECT).toFixed(2)})
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={startIframeScan}>
              <Play className="w-3.5 h-3.5" />
              Re-Scan
            </Button>
            {tripleQualified.length > 0 && (
              <Button size="sm" variant="secondary" onClick={onFilterTripleQualified}>
                <Filter className="w-3.5 h-3.5" />
                Show Demo-Ready ({tripleQualified.length})
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SmartPreScan;
