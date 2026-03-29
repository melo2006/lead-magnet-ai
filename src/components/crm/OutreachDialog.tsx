import { useState } from "react";
import { Mail, Send, Smartphone, X, Zap, Eye } from "lucide-react";
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
  const [previewProspect, setPreviewProspect] = useState<Prospect | null>(prospects[0] || null);

  const demoUrl = (p: Prospect) =>
    `${window.location.origin}/demo?url=${encodeURIComponent(p.website_url || "")}&name=${encodeURIComponent(p.business_name)}&niche=${encodeURIComponent(p.niche || "")}`;

  const handleSend = async () => {
    setSending(true);
    try {
      // Update prospects with demo links and campaign tracking
      for (const p of prospects) {
        const link = demoUrl(p);
        await supabase
          .from("prospects")
          .update({
            demo_link: link,
            pipeline_stage: "contacted",
            email_sent_at: channel !== "sms" ? new Date().toISOString() : undefined,
            sms_sent_at: channel !== "email" ? new Date().toISOString() : undefined,
          } as any)
          .eq("id", p.id);
      }

      toast.success(`Campaign queued for ${prospects.length} prospects!`, {
        description: "Demo links generated. Connect email/SMS service to deliver.",
      });
      onSent();
    } catch (err) {
      toast.error("Failed to queue campaign");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
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
                  placeholder="Never miss a call or lead again!"
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
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</label>
              {prospects.length > 1 && (
                <select
                  onChange={(e) => setPreviewProspect(prospects.find(p => p.place_id === e.target.value) || null)}
                  className="text-[10px] px-2 py-1 rounded bg-secondary border border-border text-foreground"
                >
                  {prospects.map((p) => (
                    <option key={p.place_id} value={p.place_id}>{p.business_name}</option>
                  ))}
                </select>
              )}
            </div>

            {previewProspect && templateStyle === "phone_mockup" && (
              <PhoneMockupPreview prospect={previewProspect} subject={subject} customMessage={customMessage} />
            )}
            {previewProspect && templateStyle === "clean_card" && (
              <CleanCardPreview prospect={previewProspect} subject={subject} customMessage={customMessage} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---- Phone Mockup Email Preview ---- */
const PhoneMockupPreview = ({ prospect, subject, customMessage }: { prospect: Prospect; subject: string; customMessage: string }) => (
  <div className="bg-white rounded-xl p-5 text-gray-800 text-sm space-y-4 max-h-[500px] overflow-y-auto">
    <p className="font-bold text-base text-gray-900">{subject}</p>
    <p className="text-gray-600">{prospect.business_name} | Personalized Demo</p>
    <hr className="border-gray-200" />

    <div className="text-center space-y-3">
      <h3 className="text-xl font-bold text-gray-900">Meet Your <span className="text-emerald-600">AI Employee</span></h3>
      <p><strong className="text-emerald-600">Chat</strong> with it. <strong className="text-emerald-600">Talk</strong> to it.</p>
      {customMessage && <p className="text-gray-600 italic">{customMessage}</p>}
      <p className="text-gray-500 text-xs">Role-play real customer conversations for your business, right now.</p>
    </div>

    {/* Phone mockup */}
    <div className="flex justify-center">
      <div className="w-48 rounded-[1.8rem] border-4 border-gray-800 bg-gray-900 p-1 shadow-xl">
        <div className="rounded-[1.5rem] bg-gradient-to-b from-gray-700 to-gray-900 overflow-hidden">
          <div className="h-5 bg-gray-800 flex items-center justify-center">
            <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
          </div>
          <div className="p-3 text-center space-y-2">
            <p className="text-[10px] font-bold text-white">{prospect.business_name}</p>
            <p className="text-[8px] text-gray-400">AI-powered website preview</p>
            <div className="bg-emerald-600 text-white text-[9px] font-semibold px-3 py-1.5 rounded-lg">
              Try AI Demo →
            </div>
          </div>
          <div className="h-16 bg-gradient-to-t from-gray-900 to-gray-800" />
        </div>
      </div>
    </div>

    <p className="text-gray-500 text-[10px] text-center italic">
      Tap the phone to choose Chat or Voice and experience your AI employee in action.
    </p>

    <div className="text-center">
      <div className="inline-block bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-emerald-700 transition-colors">
        Try Your Personalized Demo →
      </div>
    </div>

    <p className="text-[10px] text-gray-400 text-center">
      This demo was built specifically for {prospect.business_name}. When you become a customer, your AI employees are fully trained on your business.
    </p>
  </div>
);

/* ---- Clean Card Email Preview ---- */
const CleanCardPreview = ({ prospect, subject, customMessage }: { prospect: Prospect; subject: string; customMessage: string }) => (
  <div className="bg-white rounded-xl p-5 text-gray-800 text-sm space-y-4 max-h-[500px] overflow-y-auto">
    <p className="font-bold text-base text-gray-900">{subject}</p>
    <hr className="border-gray-200" />

    <div className="space-y-3">
      <p className="text-gray-700">Hi {prospect.business_name} team,</p>
      {customMessage && <p className="text-gray-600">{customMessage}</p>}
      <p className="text-gray-600">
        We built a quick, personalized AI demo specifically for your business. It shows how an AI receptionist 
        could handle your calls 24/7, book appointments, and never miss a lead.
      </p>
    </div>

    {/* Clean card */}
    <div className="border-2 border-emerald-200 rounded-xl p-4 bg-emerald-50 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
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
          <p className="text-sm font-bold text-gray-900">15 min</p>
          <p className="text-[9px] text-gray-500">Booking</p>
        </div>
        <div className="text-center bg-white rounded-lg p-2 border border-emerald-100">
          <p className="text-sm font-bold text-gray-900">Live AI</p>
          <p className="text-[9px] text-gray-500">Handling</p>
        </div>
      </div>

      <div className="text-center">
        <div className="inline-block bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-emerald-700 transition-colors">
          Watch Your Demo →
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
