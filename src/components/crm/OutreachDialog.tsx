import { useState } from "react";
import { Mail, Send, Smartphone, X, Zap, Eye, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Prospect } from "@/hooks/useProspectSearch";

interface Props {
  prospects: Prospect[];
  onClose: () => void;
  onSent: () => void;
}

type TemplateStyle = "phone_mockup" | "clean_card";
type Channel = "email" | "sms" | "both";

const OutreachDialog = ({ prospects, onClose, onSent }: Props) => {
  const [channel, setChannel] = useState<Channel>("email");
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>("phone_mockup");
  const [subject, setSubject] = useState("Never miss a call or lead again!");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const previewProspect = prospects[previewIndex] || null;

  const demoUrl = (p: Prospect) =>
    `${window.location.origin}/demo?url=${encodeURIComponent(p.website_url || "")}&name=${encodeURIComponent(p.business_name)}&niche=${encodeURIComponent(p.niche || "")}`;

  const handleSend = async () => {
    setSending(true);
    try {
      if (channel === "email" || channel === "both") {
        const prospectData = prospects.map((p) => ({
          id: p.id!,
          business_name: p.business_name,
          email: (p as any).email || null,
          owner_email: p.owner_email || null,
          owner_name: p.owner_name || null,
          website_url: p.website_url || null,
          website_screenshot: p.website_screenshot || null,
          niche: p.niche || null,
        }));

        const { data, error } = await supabase.functions.invoke("send-outreach-email", {
          body: {
            prospects: prospectData,
            subject,
            customMessage,
            templateStyle,
            baseUrl: window.location.origin,
          },
        });

        if (error) throw error;

        const sent = data?.sent || 0;
        const failed = data?.failed || 0;
        const noEmail = data?.results?.filter((r: any) => r.error === "No email address").length || 0;

        if (sent > 0) {
          toast.success(`Sent ${sent} email${sent > 1 ? "s" : ""} successfully!`, {
            description: failed > 0 ? `${failed} failed (${noEmail} missing email)` : undefined,
          });
        } else {
          toast.error(`No emails sent. ${noEmail} prospects have no email address.`);
        }
      }

      if (channel === "sms" || channel === "both") {
        // SMS: just update timestamps for now
        for (const p of prospects) {
          await supabase
            .from("prospects")
            .update({
              sms_sent_at: new Date().toISOString(),
              demo_link: demoUrl(p),
              pipeline_stage: "contacted",
            } as any)
            .eq("id", p.id);
        }
        if (channel === "sms") {
          toast.success(`SMS queued for ${prospects.length} prospects`, {
            description: "Connect Twilio to deliver SMS.",
          });
        }
      }

      onSent();
    } catch (err) {
      console.error("Outreach error:", err);
      toast.error("Failed to send outreach");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Send Outreach Campaign</h2>
            <p className="text-xs text-muted-foreground">{prospects.length} prospects selected</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-0">
          {/* Settings */}
          <div className="p-5 space-y-5 border-r border-border">
            {/* Channel */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Channel</label>
              <div className="flex gap-2">
                {([
                  { key: "email" as Channel, icon: Mail, label: "Email" },
                  { key: "sms" as Channel, icon: Smartphone, label: "SMS" },
                  { key: "both" as Channel, icon: Send, label: "Both" },
                ]).map((ch) => (
                  <button
                    key={ch.key}
                    onClick={() => setChannel(ch.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${channel === ch.key ? "bg-primary/20 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    <ch.icon className="w-4 h-4" />{ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Style */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Email Template</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTemplateStyle("phone_mockup")}
                  className={`p-3 rounded-lg border text-left transition-colors ${templateStyle === "phone_mockup" ? "bg-primary/10 border-primary/40" : "bg-secondary border-border hover:border-primary/20"}`}
                >
                  <Smartphone className="w-5 h-5 mb-1 text-primary" />
                  <p className="text-xs font-semibold text-foreground">Phone Mockup</p>
                  <p className="text-[10px] text-muted-foreground">Shows their website in a phone frame</p>
                </button>
                <button
                  onClick={() => setTemplateStyle("clean_card")}
                  className={`p-3 rounded-lg border text-left transition-colors ${templateStyle === "clean_card" ? "bg-primary/10 border-primary/40" : "bg-secondary border-border hover:border-primary/20"}`}
                >
                  <Zap className="w-5 h-5 mb-1 text-primary" />
                  <p className="text-xs font-semibold text-foreground">Clean Card</p>
                  <p className="text-[10px] text-muted-foreground">Branded card with demo button</p>
                </button>
              </div>
            </div>

            {/* Subject */}
            {channel !== "sms" && (
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Email Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            )}

            {/* Custom message */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Custom Message (optional)</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none"
                placeholder="Add a personalized intro..."
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending..." : `Send to ${prospects.length} Prospects`}
            </button>
          </div>

          {/* Preview */}
          <div className="p-5">
            {/* Prospect navigator */}
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</label>
              {prospects.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                    disabled={previewIndex === 0}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-muted-foreground font-medium min-w-[80px] text-center">
                    {previewIndex + 1} / {prospects.length}
                  </span>
                  <button
                    onClick={() => setPreviewIndex(Math.min(prospects.length - 1, previewIndex + 1))}
                    disabled={previewIndex === prospects.length - 1}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Prospect name bar */}
            {previewProspect && (
              <div className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2 mb-3">
                <span className="text-xs font-semibold text-foreground truncate">{previewProspect.business_name}</span>
                <a
                  href={demoUrl(previewProspect)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Test Demo
                </a>
              </div>
            )}

            {previewProspect && templateStyle === "phone_mockup" && (
              <PhoneMockupPreview prospect={previewProspect} subject={subject} customMessage={customMessage} demoUrl={demoUrl(previewProspect)} />
            )}
            {previewProspect && templateStyle === "clean_card" && (
              <CleanCardPreview prospect={previewProspect} subject={subject} customMessage={customMessage} demoUrl={demoUrl(previewProspect)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---- iPhone-style Phone Mockup ---- */
const PhoneMockupPreview = ({ prospect, subject, customMessage, demoUrl }: { prospect: Prospect; subject: string; customMessage: string; demoUrl: string }) => (
  <div className="bg-white rounded-xl p-5 text-gray-800 text-sm space-y-4 max-h-[500px] overflow-y-auto">
    <p className="font-bold text-base text-gray-900">{subject}</p>
    <p className="text-gray-500 text-xs">{prospect.business_name} | Personalized Demo</p>
    <hr className="border-gray-200" />

    <div className="text-center space-y-2">
      <h3 className="text-xl font-bold text-gray-900">Meet Your <span className="text-emerald-600">AI Employee</span></h3>
      <p className="text-sm"><strong className="text-emerald-600">Chat</strong> with it. <strong className="text-emerald-600">Talk</strong> to it.</p>
      {customMessage && <p className="text-gray-600 italic text-xs">{customMessage}</p>}
      <p className="text-gray-400 text-[10px]">Role-play real customer conversations for your business, right now.</p>
    </div>

    {/* Realistic iPhone mockup */}
    <div className="flex justify-center py-2">
      <div className="relative w-[220px]">
        {/* Phone frame */}
        <div className="rounded-[2.5rem] border-[6px] border-gray-800 bg-black shadow-2xl overflow-hidden">
          {/* Notch / Dynamic Island */}
          <div className="relative h-7 bg-black flex items-center justify-center">
            <div className="w-[80px] h-[22px] bg-black rounded-full absolute top-0" />
            <div className="w-[60px] h-[18px] bg-gray-900 rounded-full z-10 mt-0.5" />
          </div>

          {/* Screen content */}
          <div className="bg-white min-h-[340px] relative">
            {prospect.website_screenshot ? (
              <img
                src={prospect.website_screenshot}
                alt={`${prospect.business_name} website`}
                className="w-full h-[280px] object-cover object-top"
              />
            ) : prospect.website_url ? (
              <div className="w-full h-[280px] bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col items-center justify-center p-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-2">
                  <Zap className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-[10px] font-bold text-gray-700 text-center">{prospect.business_name}</p>
                <p className="text-[8px] text-gray-400 mt-1">{prospect.website_url}</p>
              </div>
            ) : (
              <div className="w-full h-[280px] bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center">
                <p className="text-[10px] text-gray-400">No website available</p>
              </div>
            )}

            {/* CTA overlay at bottom of screen */}
            <div className="bg-gradient-to-t from-black/90 to-transparent p-3 pt-6">
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-emerald-500 text-white text-[11px] font-bold px-4 py-2.5 rounded-xl text-center hover:bg-emerald-600 transition-colors shadow-lg"
              >
                Try Your AI Demo →
              </a>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="h-5 bg-black flex items-center justify-center">
            <div className="w-[100px] h-[4px] bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>

    <p className="text-[10px] text-gray-400 text-center italic">
      Tap to chat or talk with your AI employee — built specifically for {prospect.business_name}.
    </p>

    <div className="text-center">
      <a
        href={demoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors"
      >
        Try Your Personalized Demo →
      </a>
    </div>
  </div>
);

/* ---- Clean Card Email Preview ---- */
const CleanCardPreview = ({ prospect, subject, customMessage, demoUrl }: { prospect: Prospect; subject: string; customMessage: string; demoUrl: string }) => (
  <div className="bg-white rounded-xl p-5 text-gray-800 text-sm space-y-4 max-h-[500px] overflow-y-auto">
    <p className="font-bold text-base text-gray-900">{subject}</p>
    <hr className="border-gray-200" />

    <div className="space-y-3">
      <p className="text-gray-700">Hi {prospect.owner_name || prospect.business_name} team,</p>
      {customMessage && <p className="text-gray-600">{customMessage}</p>}
      <p className="text-gray-600">
        We built a quick, personalized AI demo specifically for your business. It shows how an AI receptionist
        could handle your calls 24/7, book appointments, and never miss a lead.
      </p>
    </div>

    {/* Card with screenshot */}
    <div className="border-2 border-emerald-200 rounded-xl overflow-hidden bg-emerald-50">
      {prospect.website_screenshot && (
        <img
          src={prospect.website_screenshot}
          alt={`${prospect.business_name} website`}
          className="w-full h-[140px] object-cover object-top"
        />
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{prospect.business_name}</p>
            <p className="text-xs text-gray-500">Personalized AI Demo Ready</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center bg-white rounded-lg p-2 border border-emerald-100">
            <p className="text-sm font-bold text-gray-900">24/7</p>
            <p className="text-[9px] text-gray-500">Coverage</p>
          </div>
          <div className="text-center bg-white rounded-lg p-2 border border-emerald-100">
            <p className="text-sm font-bold text-gray-900">Chat + Voice</p>
            <p className="text-[9px] text-gray-500">AI Agents</p>
          </div>
          <div className="text-center bg-white rounded-lg p-2 border border-emerald-100">
            <p className="text-sm font-bold text-gray-900">Live</p>
            <p className="text-[9px] text-gray-500">Demo</p>
          </div>
        </div>

        <div className="text-center">
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors"
          >
            Watch Your Demo →
          </a>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-2 text-[10px] text-gray-400">
      <Eye className="w-3 h-3" />
      <span>We'll know when you view this demo so we can follow up at the right time.</span>
    </div>
  </div>
);

export default OutreachDialog;
