import { useState, useMemo } from "react";
import {
  X, ChevronRight, ChevronLeft, Mail, Smartphone, Send, Monitor,
  Zap, Brain, Loader2, Sparkles, Check, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Prospect } from "@/hooks/useProspectSearch";
import {
  BrowserMockupPreview,
  CleanCardPreview,
  PhoneMockupPreview,
  buildDemoUrl,
} from "@/components/crm/OutreachTemplatePreviews";

type TemplateStyle = "phone_mockup" | "clean_card" | "browser_mockup";
type Channel = "email" | "sms" | "both";
type Step = "review" | "ai_advisor" | "template" | "preview" | "send";

interface Props {
  prospects: Prospect[];
  onClose: () => void;
  onSent: () => void;
}

interface AiRecommendation {
  prospect_id: string;
  business_name: string;
  recommended_channel: "email" | "sms" | "both" | "skip";
  recommended_template: TemplateStyle;
  confidence: number;
  reasoning: string;
}

const STEPS: { key: Step; label: string }[] = [
  { key: "review", label: "Review" },
  { key: "ai_advisor", label: "AI Advisor" },
  { key: "template", label: "Template" },
  { key: "preview", label: "Preview" },
  { key: "send", label: "Send" },
];

const CampaignBuilderDialog = ({ prospects, onClose, onSent }: Props) => {
  const [step, setStep] = useState<Step>("review");
  const [channel, setChannel] = useState<Channel>("email");
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>("browser_mockup");
  const [subject, setSubject] = useState("Quick idea for your website");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [campaignName, setCampaignName] = useState("");
  const [saveCampaign, setSaveCampaign] = useState(true);

  // AI Advisor state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AiRecommendation[]>([]);
  const [aiApplied, setAiApplied] = useState(false);

  // Sending progress
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0, current: "" });
  const [sendComplete, setSendComplete] = useState(false);

  const stepIdx = STEPS.findIndex(s => s.key === step);

  // Stats
  const stats = useMemo(() => {
    const withEmail = prospects.filter(p => (p as any).owner_email || (p as any).email).length;
    const withSms = prospects.filter(p => (p as any).sms_capable === true).length;
    const withPhone = prospects.filter(p => p.phone).length;
    const analyzed = prospects.filter(p => (p as any).ai_analyzed).length;
    return { withEmail, withSms, withPhone, analyzed, total: prospects.length };
  }, [prospects]);

  const handleAiAdvisor = async () => {
    setAiLoading(true);
    try {
      const prospectSummaries = prospects.slice(0, 50).map(p => ({
        id: p.id,
        business_name: p.business_name,
        niche: p.niche,
        has_email: !!(p as any).owner_email || !!(p as any).email,
        sms_capable: (p as any).sms_capable,
        phone_type: (p as any).phone_type,
        has_website: p.has_website,
        lead_score: p.lead_score,
        lead_temperature: p.lead_temperature,
        ai_analyzed: (p as any).ai_analyzed,
        has_chat_widget: p.has_chat_widget,
        has_voice_ai: p.has_voice_ai,
        website_quality_score: (p as any).website_quality_score,
      }));

      const { data, error } = await supabase.functions.invoke("ai-campaign-advisor", {
        body: { prospects: prospectSummaries },
      });

      if (error) throw error;
      if (data?.recommendations) {
        setAiRecommendations(data.recommendations);
        // Apply the most common recommendation
        const channels = data.recommendations.map((r: AiRecommendation) => r.recommended_channel).filter((c: string) => c !== "skip");
        const channelCounts: Record<string, number> = {};
        channels.forEach((c: string) => { channelCounts[c] = (channelCounts[c] || 0) + 1; });
        const bestChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Channel;
        if (bestChannel) setChannel(bestChannel);

        const templates = data.recommendations.map((r: AiRecommendation) => r.recommended_template);
        const templateCounts: Record<string, number> = {};
        templates.forEach((t: string) => { templateCounts[t] = (templateCounts[t] || 0) + 1; });
        const bestTemplate = Object.entries(templateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as TemplateStyle;
        if (bestTemplate) setTemplateStyle(bestTemplate);

        if (data.recommended_subject) setSubject(data.recommended_subject);

        toast.success("AI recommendations ready!");
      }
    } catch (err: any) {
      console.error("AI advisor error:", err);
      toast.error("AI advisor failed: " + (err.message || "Unknown error"));
    } finally {
      setAiLoading(false);
      setAiApplied(true);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setSendComplete(false);
    const total = prospects.length;
    setSendProgress({ sent: 0, failed: 0, total, current: "" });

    try {
      // Save as campaign if requested
      if (saveCampaign && campaignName.trim()) {
        const { error: campError } = await supabase.from("campaigns").insert({
          name: campaignName.trim(),
          status: "active",
          prospect_count: total,
          niche: prospects[0]?.niche || null,
        });
        if (campError) console.error("Campaign save error:", campError);
      }

      // Send emails
      if (channel === "email" || channel === "both") {
        const emailProspects = prospects.filter(p => (p as any).owner_email || (p as any).email);
        if (emailProspects.length > 0) {
          const { data, error } = await supabase.functions.invoke("send-outreach-email", {
            body: {
              prospects: emailProspects.map(p => ({
                id: p.id!, business_name: p.business_name,
                email: (p as any).email || null, owner_email: p.owner_email || null,
                owner_name: p.owner_name || null, website_url: p.website_url || null,
                website_screenshot: p.website_screenshot || null, niche: p.niche || null,
              })),
              subject, customMessage, templateStyle, baseUrl: window.location.origin,
            },
          });
          if (error) throw error;
          setSendProgress(prev => ({ ...prev, sent: prev.sent + (data?.sent || 0), failed: prev.failed + (data?.failed || 0) }));
        }
      }

      // Send SMS
      if (channel === "sms" || channel === "both") {
        const smsProspects = prospects.filter(p => p.phone && (p as any).sms_capable !== false);
        if (smsProspects.length > 0) {
          const { data, error } = await supabase.functions.invoke("send-outreach-sms", {
            body: {
              prospects: smsProspects.map(p => ({
                id: p.id!, business_name: p.business_name, phone: p.phone || null,
                owner_name: p.owner_name || null, website_url: p.website_url || null, niche: p.niche || null,
              })),
              customMessage, baseUrl: window.location.origin,
            },
          });
          if (error) {
            toast.error("SMS failed: " + error.message);
          } else {
            setSendProgress(prev => ({ ...prev, sent: prev.sent + (data?.sent || 0), failed: prev.failed + (data?.failed || 0) }));
          }
        }
      }

      setSendComplete(true);
      toast.success("Campaign sent!");
    } catch (err: any) {
      toast.error("Campaign send failed: " + (err.message || "Unknown error"));
    } finally {
      setSending(false);
    }
  };

  const previewProspect = prospects[previewIndex] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">Campaign Builder</h2>
            <p className="text-xs text-muted-foreground">{prospects.length} prospects selected</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-border bg-secondary/30 shrink-0">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <button
                onClick={() => { if (i <= stepIdx) setStep(s.key); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  step === s.key ? "bg-primary text-primary-foreground" :
                  i < stepIdx ? "bg-primary/20 text-primary cursor-pointer" :
                  "bg-secondary text-muted-foreground"
                }`}
              >
                {i < stepIdx ? <Check className="w-3 h-3" /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px]">{i + 1}</span>}
                {s.label}
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1: Review */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-secondary/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-[11px] text-muted-foreground">Total Selected</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{stats.withEmail}</p>
                  <p className="text-[11px] text-muted-foreground">Have Email</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">{stats.withSms}</p>
                  <p className="text-[11px] text-muted-foreground">SMS Capable</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{stats.analyzed}</p>
                  <p className="text-[11px] text-muted-foreground">AI Analyzed</p>
                </div>
              </div>

              {stats.withEmail === 0 && stats.withSms === 0 && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">No contact info available</p>
                    <p className="text-xs text-muted-foreground">Run "Analyze" on these prospects first to discover emails and verify phone numbers.</p>
                  </div>
                </div>
              )}

              <div className="bg-secondary/30 border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Prospect Summary</h3>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {prospects.slice(0, 20).map(p => (
                    <div key={p.id || p.place_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/50">
                      <span className="text-xs text-foreground truncate max-w-[200px]">{p.business_name}</span>
                      <div className="flex items-center gap-2">
                        {((p as any).owner_email || (p as any).email) && <Mail className="w-3 h-3 text-emerald-400" />}
                        {(p as any).sms_capable && <Smartphone className="w-3 h-3 text-blue-400" />}
                        {(p as any).ai_analyzed && <Brain className="w-3 h-3 text-primary" />}
                      </div>
                    </div>
                  ))}
                  {prospects.length > 20 && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">+{prospects.length - 20} more...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: AI Advisor */}
          {step === "ai_advisor" && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="text-lg font-bold text-foreground mb-1">AI Campaign Advisor</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  AI will analyze each prospect's data and recommend the best channel (Email vs SMS), template, and priority.
                </p>
              </div>

              {!aiApplied && (
                <div className="text-center">
                  <button
                    onClick={handleAiAdvisor}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {aiLoading ? "Analyzing prospects..." : "Get AI Recommendations"}
                  </button>
                </div>
              )}

              {aiRecommendations.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-primary">{channel === "email" ? "Email" : channel === "sms" ? "SMS" : "Both"}</p>
                      <p className="text-[10px] text-muted-foreground">Recommended Channel</p>
                    </div>
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-primary capitalize">{templateStyle.replace("_", " ")}</p>
                      <p className="text-[10px] text-muted-foreground">Best Template</p>
                    </div>
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-primary">{aiRecommendations.filter(r => r.recommended_channel !== "skip").length}</p>
                      <p className="text-[10px] text-muted-foreground">Worth Contacting</p>
                    </div>
                  </div>

                  <div className="bg-secondary/30 border border-border rounded-xl p-4 max-h-48 overflow-y-auto space-y-1.5">
                    {aiRecommendations.map(r => (
                      <div key={r.prospect_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/50">
                        <span className="text-xs text-foreground truncate max-w-[200px]">{r.business_name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            r.recommended_channel === "email" ? "bg-emerald-500/15 text-emerald-400" :
                            r.recommended_channel === "sms" ? "bg-blue-500/15 text-blue-400" :
                            r.recommended_channel === "both" ? "bg-primary/15 text-primary" :
                            "bg-red-500/15 text-red-400"
                          }`}>
                            {r.recommended_channel.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{Math.round(r.confidence * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiApplied && aiRecommendations.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">No recommendations available. Proceed to choose manually.</p>
              )}
            </div>
          )}

          {/* Step 3: Template */}
          {step === "template" && (
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Channel</label>
                <div className="flex gap-2">
                  {([
                    { key: "email" as Channel, icon: Mail, label: "Email", count: stats.withEmail },
                    { key: "sms" as Channel, icon: Smartphone, label: "SMS", count: stats.withSms },
                    { key: "both" as Channel, icon: Send, label: "Both", count: Math.min(stats.withEmail, stats.withSms) },
                  ]).map(ch => (
                    <button
                      key={ch.key}
                      onClick={() => setChannel(ch.key)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        channel === ch.key ? "bg-primary/20 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ch.icon className="w-4 h-4" />{ch.label} <span className="text-[10px] opacity-70">({ch.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {(channel === "email" || channel === "both") && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Email Template</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setTemplateStyle("browser_mockup")}
                        className={`p-3 rounded-lg border text-left transition-colors ${templateStyle === "browser_mockup" ? "bg-primary/10 border-primary/40" : "bg-secondary border-border hover:border-primary/20"}`}
                      >
                        <Monitor className="w-5 h-5 mb-1 text-primary" />
                        <p className="text-xs font-semibold text-foreground">Browser + AI</p>
                        <p className="text-[10px] text-muted-foreground">Website with Chat & Voice</p>
                      </button>
                      <button
                        onClick={() => setTemplateStyle("phone_mockup")}
                        className={`p-3 rounded-lg border text-left transition-colors ${templateStyle === "phone_mockup" ? "bg-primary/10 border-primary/40" : "bg-secondary border-border hover:border-primary/20"}`}
                      >
                        <Smartphone className="w-5 h-5 mb-1 text-primary" />
                        <p className="text-xs font-semibold text-foreground">Phone Mockup</p>
                        <p className="text-[10px] text-muted-foreground">Website in phone frame</p>
                      </button>
                      <button
                        onClick={() => setTemplateStyle("clean_card")}
                        className={`p-3 rounded-lg border text-left transition-colors ${templateStyle === "clean_card" ? "bg-primary/10 border-primary/40" : "bg-secondary border-border hover:border-primary/20"}`}
                      >
                        <Zap className="w-5 h-5 mb-1 text-primary" />
                        <p className="text-xs font-semibold text-foreground">Clean Card</p>
                        <p className="text-[10px] text-muted-foreground">Branded card with demo</p>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Email Subject</label>
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-primary/50" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Custom Message (optional)</label>
                <textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none" placeholder="Add a personalized intro..." />
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === "preview" && previewProspect && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview ({previewIndex + 1}/{prospects.length})</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))} disabled={previewIndex === 0} className="p-1 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-xs text-foreground font-medium">{previewProspect.business_name}</span>
                  <button onClick={() => setPreviewIndex(Math.min(prospects.length - 1, previewIndex + 1))} disabled={previewIndex === prospects.length - 1} className="p-1 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border">
                {templateStyle === "browser_mockup" && <BrowserMockupPreview prospect={previewProspect} subject={subject} customMessage={customMessage} demoUrl={buildDemoUrl(previewProspect)} />}
                {templateStyle === "phone_mockup" && <PhoneMockupPreview prospect={previewProspect} subject={subject} customMessage={customMessage} demoUrl={buildDemoUrl(previewProspect)} />}
                {templateStyle === "clean_card" && <CleanCardPreview prospect={previewProspect} subject={subject} customMessage={customMessage} demoUrl={buildDemoUrl(previewProspect)} />}
              </div>
            </div>
          )}

          {/* Step 5: Send */}
          {step === "send" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Campaign Summary</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Channel:</span><span className="font-medium text-foreground capitalize">{channel}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Template:</span><span className="font-medium text-foreground capitalize">{templateStyle.replace("_", " ")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Prospects:</span><span className="font-medium text-foreground">{prospects.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Reachable:</span><span className="font-medium text-emerald-400">{channel === "email" ? stats.withEmail : channel === "sms" ? stats.withSms : stats.withEmail + stats.withSms}</span></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={saveCampaign} onChange={(e) => setSaveCampaign(e.target.checked)} className="accent-primary" />
                    <span className="text-xs font-medium text-foreground">Save as campaign</span>
                  </label>
                  {saveCampaign && (
                    <input
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Campaign name..."
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-primary/50"
                    />
                  )}
                </div>
              </div>

              {sendComplete && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                  <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-emerald-400">{sendProgress.sent} sent successfully</p>
                  {sendProgress.failed > 0 && <p className="text-xs text-red-400 mt-1">{sendProgress.failed} failed</p>}
                  <button onClick={onSent} className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium">Done</button>
                </div>
              )}

              {!sendComplete && (
                <button
                  onClick={handleSend}
                  disabled={sending || (saveCampaign && !campaignName.trim())}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "Sending..." : `Launch Campaign — ${prospects.length} Prospects`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 shrink-0 bg-secondary/20">
          <button
            onClick={() => { if (stepIdx > 0) setStep(STEPS[stepIdx - 1].key); else onClose(); }}
            className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {stepIdx === 0 ? "Cancel" : "Back"}
          </button>
          {stepIdx < STEPS.length - 1 && (
            <button
              onClick={() => setStep(STEPS[stepIdx + 1].key)}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignBuilderDialog;
