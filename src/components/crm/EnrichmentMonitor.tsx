import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Loader2, X, ChevronDown, ChevronUp, Mail, Phone, DollarSign, Activity } from "lucide-react";

const STORAGE_KEY = "leadengine_batch_progress";

interface PersistedBatchState {
  total: number;
  completed: number;
  costSummary: { totalCost: number; apiTotals: Record<string, { calls: number; cost: number }> };
  emailsFound: number;
  phonesClassified: number;
  startedAt: number | null;
  interruptedAt: number;
  processedIds: string[];
  pendingProspects: Array<{ id: string; website_url: string; business_name: string; niche: string }>;
}

/**
 * Persistent enrichment monitor that reads localStorage to show batch progress
 * even after page refresh. Displayed at CRM layout level so it's always visible.
 */
export default function EnrichmentMonitor() {
  const [saved, setSaved] = useState<PersistedBatchState | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Poll localStorage every 2s to pick up live updates from the running batch
  useEffect(() => {
    const check = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setSaved(JSON.parse(raw));
          setDismissed(false);
        } else {
          setSaved(null);
        }
      } catch {
        setSaved(null);
      }
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!saved || dismissed) return null;

  const pct = saved.total > 0 ? (saved.completed / saved.total) * 100 : 0;
  const remaining = saved.total - saved.completed;
  const isComplete = remaining === 0;
  const isOnProspectsPage = location.pathname.includes("/prospects");

  // If complete, show a brief success banner
  if (isComplete) {
    return (
      <div className="mx-4 mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-foreground">
            Enrichment complete — {saved.total} prospects analyzed · ${saved.costSummary.totalCost.toFixed(3)} spent
          </span>
        </div>
        <button onClick={() => { setDismissed(true); try { localStorage.removeItem(STORAGE_KEY); } catch {} }} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-2 rounded-xl border-2 border-blue-500/30 bg-blue-500/5 overflow-hidden">
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-2 cursor-pointer hover:bg-blue-500/10 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-bold text-foreground">
              Enrichment: {saved.completed}/{saved.total}
            </span>
            <span className="text-[10px] text-muted-foreground ml-2">
              {remaining} remaining · ${saved.costSummary.totalCost.toFixed(3)} spent
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-24 hidden sm:block">
            <Progress value={pct} className="h-2" />
          </div>
          <span className="text-xs font-mono font-bold text-foreground">{pct.toFixed(0)}%</span>
          {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded details */}
      {!collapsed && (
        <div className="px-4 pb-3 space-y-3 border-t border-blue-500/20">
          <Progress value={pct} className="h-3 mt-3 sm:hidden" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Mail className="w-3 h-3" />Emails</p>
              <p className="text-lg font-bold text-emerald-400">{saved.emailsFound}</p>
            </div>
            <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Phone className="w-3 h-3" />Phones</p>
              <p className="text-lg font-bold text-blue-400">{saved.phonesClassified}</p>
            </div>
            <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><DollarSign className="w-3 h-3" />Cost</p>
              <p className="text-lg font-bold text-primary">${saved.costSummary.totalCost.toFixed(3)}</p>
            </div>
            <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Progress</p>
              <p className="text-lg font-bold text-foreground">{saved.completed}/{saved.total}</p>
            </div>
          </div>

          {/* API breakdown */}
          {Object.keys(saved.costSummary.apiTotals).length > 0 && (
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {Object.entries(saved.costSummary.apiTotals).filter(([, v]) => v.calls > 0).map(([api, usage]) => (
                <span key={api} className="px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                  {api}: {usage.calls} calls {usage.cost > 0 ? `($${usage.cost.toFixed(3)})` : "(free)"}
                </span>
              ))}
            </div>
          )}

          {/* Action: if interrupted (page was refreshed while running) */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isOnProspectsPage && (
              <button
                onClick={() => navigate("/crm/prospects")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/30 transition-colors"
              >
                Go to Prospects to Resume
              </button>
            )}
            <button
              onClick={() => { setDismissed(true); try { localStorage.removeItem(STORAGE_KEY); } catch {} }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary border border-border text-muted-foreground text-xs hover:bg-secondary/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
