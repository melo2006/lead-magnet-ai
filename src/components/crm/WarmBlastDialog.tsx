import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  X, Flame, Mail, Phone, Eye, MousePointerClick,
  Loader2, CheckCircle2, Zap, Send
} from "lucide-react";

type WarmProspect = {
  id: string;
  business_name: string;
  owner_name: string | null;
  owner_email: string | null;
  email: string | null;
  website_url: string | null;
  website_screenshot: string | null;
  niche: string | null;
  phone: string | null;
  owner_phone: string | null;
  email_sent_at: string | null;
  email_opened_at: string | null;
  email_clicked_at: string | null;
  demo_viewed_at: string | null;
  pipeline_stage: string;
};

type BlastPhase = "config" | "sending" | "monitoring";

interface Props {
  onClose: () => void;
}

export default function WarmBlastDialog({ onClose }: Props) {
  const [phase, setPhase] = useState<BlastPhase>("config");
  const [prospects, setProspects] = useState<WarmProspect[]>([]);
  const [emailableCount, setEmailableCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [_sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  // Config
  const [subject, setSubject] = useState("See how AI can transform your business");
  const [template, setTemplate] = useState<"browser_mockup" | "phone_mockup" | "clean_card">("browser_mockup");
  const [customMessage, setCustomMessage] = useState("");

  // Monitoring
  const [warmResponders, setWarmResponders] = useState<WarmProspect[]>([]);
  const [monitorStarted, setMonitorStarted] = useState<Date | null>(null);

  // Load emailable prospects
  useEffect(() => {
    loadProspects();
  }, []);

  const loadProspects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prospects")
      .select("id, business_name, owner_name, owner_email, email, website_url, website_screenshot, niche, phone, owner_phone, email_sent_at, email_opened_at, email_clicked_at, demo_viewed_at, pipeline_stage")
      .eq("do_not_contact", false)
      .order("lead_score", { ascending: false });
    
    if (error) {
      toast.error("Failed to load prospects");
      setLoading(false);
      return;
    }

    const all = (data || []) as WarmProspect[];
    setProspects(all);
    setEmailableCount(all.filter(p => p.owner_email || p.email).length);
    setLoading(false);
  };

  // Send email blast
  const sendBlast = async () => {
    setSending(true);
    setPhase("sending");
    
    const emailable = prospects.filter(p => p.owner_email || p.email);
    const batchSize = 25;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < emailable.length; i += batchSize) {
      const batch = emailable.slice(i, i + batchSize);
      
      try {
        const { data, error } = await supabase.functions.invoke("send-outreach-email", {
          body: {
            prospects: batch.map(p => ({
              id: p.id,
              business_name: p.business_name,
              email: p.email,
              owner_email: p.owner_email,
              owner_name: p.owner_name,
              website_url: p.website_url,
              website_screenshot: p.website_screenshot,
              niche: p.niche,
            })),
            subject,
            customMessage,
            templateStyle: template,
            senderName: "AI Hidden Leads",
            baseUrl: window.location.origin,
          },
        });

        if (error) throw error;
        sent += data?.sent || 0;
        failed += data?.failed || 0;
      } catch (err) {
        console.error("Batch send failed:", err);
        failed += batch.length;
      }

      setSentCount(sent);
      setFailedCount(failed);
    }

    setSending(false);
    setPhase("monitoring");
    setMonitorStarted(new Date());
    toast.success(`Warm blast sent! ${sent} emails delivered. Monitoring for opens...`);
  };

  // Real-time monitoring of warm responders
  useEffect(() => {
    if (phase !== "monitoring") return;

    const pollWarm = async () => {
      const fiveMinAgo = monitorStarted ? new Date(monitorStarted.getTime() - 60000).toISOString() : new Date(Date.now() - 5 * 60000).toISOString();
      
      const { data } = await supabase
        .from("prospects")
        .select("id, business_name, owner_name, owner_email, email, website_url, website_screenshot, niche, phone, owner_phone, email_sent_at, email_opened_at, email_clicked_at, demo_viewed_at, pipeline_stage")
        .eq("do_not_contact", false)
        .or(`email_opened_at.gte.${fiveMinAgo},email_clicked_at.gte.${fiveMinAgo},demo_viewed_at.gte.${fiveMinAgo}`)
        .order("email_opened_at", { ascending: false });

      if (data) setWarmResponders(data as WarmProspect[]);
    };

    pollWarm();
    const interval = setInterval(pollWarm, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [phase, monitorStarted]);

  const getEngagementLevel = (p: WarmProspect) => {
    if (p.demo_viewed_at) return { label: "Demo Viewed", color: "text-red-400", icon: Eye };
    if (p.email_clicked_at) return { label: "Clicked", color: "text-orange-400", icon: MousePointerClick };
    if (p.email_opened_at) return { label: "Opened", color: "text-emerald-400", icon: Mail };
    return { label: "Sent", color: "text-muted-foreground", icon: Send };
  };

  const calledCount = warmResponders.filter(p => p.pipeline_stage === "contacted").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Warm-First Blast</h2>
              <p className="text-xs text-muted-foreground">
                {phase === "config" && "Email all → Auto-call warm responders"}
                {phase === "sending" && "Sending emails..."}
                {phase === "monitoring" && "Monitoring warm responders — auto-calling openers"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* CONFIG PHASE */}
          {phase === "config" && (
            <>
              {/* Cost comparison */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-emerald-400 mb-1">💡 Warm-First = 80% Cost Savings</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-card rounded-lg p-2.5 border border-border">
                    <p className="text-muted-foreground">Cold-call everyone</p>
                    <p className="text-lg font-bold text-red-400">${(emailableCount * 0.56).toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">{emailableCount} calls × $0.56/call</p>
                  </div>
                  <div className="bg-card rounded-lg p-2.5 border border-emerald-500/20">
                    <p className="text-muted-foreground">Warm-first (this)</p>
                    <p className="text-lg font-bold text-emerald-400">
                      ${(emailableCount * 0.001 + Math.round(emailableCount * 0.15) * 0.15).toFixed(0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {emailableCount} emails + ~{Math.round(emailableCount * 0.15)} warm calls
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{prospects.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Prospects</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{emailableCount}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Have Email</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-orange-400">~{Math.round(emailableCount * 0.15)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. Warm Leads</p>
                  </div>
                </div>
              )}

              {/* Email config */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Subject Line</label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Template</label>
                  <div className="flex gap-2">
                    {(["browser_mockup", "phone_mockup", "clean_card"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTemplate(t)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                          template === t
                            ? "bg-primary/20 border-primary/40 text-primary"
                            : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t === "browser_mockup" ? "Browser + AI" : t === "phone_mockup" ? "Phone" : "Clean Card"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Custom Message (optional)</label>
                  <textarea
                    value={customMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    rows={2}
                    placeholder="Add a personal touch..."
                    className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>
              </div>

              {/* Workflow explanation */}
              <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground">How it works:</p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="bg-primary/20 text-primary font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>AI-personalized emails sent to all {emailableCount} prospects with tracking pixels</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-orange-400/20 text-orange-400 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>When someone <strong className="text-foreground">opens</strong> or <strong className="text-foreground">clicks</strong>, the AI Voice Agent calls them within seconds</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-emerald-400/20 text-emerald-400 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>Qualified leads get <strong className="text-foreground">warm-transferred</strong> to you in real-time</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* SENDING PHASE */}
          {phase === "sending" && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <div>
                <p className="text-lg font-bold text-foreground">Sending emails...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {sentCount} sent · {failedCount} failed · {emailableCount - sentCount - failedCount} remaining
                </p>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${((sentCount + failedCount) / emailableCount) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* MONITORING PHASE */}
          {phase === "monitoring" && (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <Mail className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold text-foreground">{sentCount}</p>
                  <p className="text-[10px] text-muted-foreground">Emails Sent</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <Eye className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                  <p className="text-lg font-bold text-emerald-400">{warmResponders.length}</p>
                  <p className="text-[10px] text-muted-foreground">Warm Responders</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <Phone className="w-4 h-4 mx-auto text-orange-400 mb-1" />
                  <p className="text-lg font-bold text-orange-400">{calledCount}</p>
                  <p className="text-[10px] text-muted-foreground">Auto-Called</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <Zap className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
                  <p className="text-lg font-bold text-cyan-400">
                    ${(sentCount * 0.001 + calledCount * 0.15).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Total Cost</p>
                </div>
              </div>

              {/* Live indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                Live monitoring — auto-calling openers via AI Voice Agent
              </div>

              {/* Warm responders list */}
              {warmResponders.length === 0 ? (
                <div className="bg-secondary/50 rounded-xl p-8 text-center">
                  <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Waiting for opens...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    As prospects open your email, they'll appear here and get auto-called
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Warm Responders ({warmResponders.length})</p>
                  {warmResponders.map(p => {
                    const eng = getEngagementLevel(p);
                    const EngIcon = eng.icon;
                    const wasCalled = p.pipeline_stage === "contacted";
                    return (
                      <div key={p.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-2.5">
                        <div className={`p-1.5 rounded-full ${wasCalled ? "bg-orange-400/20" : "bg-emerald-400/20"}`}>
                          {wasCalled ? <Phone className="w-3.5 h-3.5 text-orange-400" /> : <EngIcon className={`w-3.5 h-3.5 ${eng.color}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.business_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {p.owner_name || p.owner_email || p.email}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] font-semibold ${eng.color}`}>{eng.label}</span>
                          {wasCalled && (
                            <p className="text-[10px] text-orange-400 flex items-center gap-0.5 justify-end">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Auto-called
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cost comparison */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-400">
                  ✅ You saved <strong>${((emailableCount * 0.56) - (sentCount * 0.001 + calledCount * 0.15)).toFixed(0)}</strong> vs cold-calling all {emailableCount} prospects
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            {phase === "monitoring" ? "Close" : "Cancel"}
          </button>
          {phase === "config" && (
            <button
              onClick={sendBlast}
              disabled={emailableCount === 0 || !subject.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Flame className="w-4 h-4" />
              Launch Warm Blast ({emailableCount} emails)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
