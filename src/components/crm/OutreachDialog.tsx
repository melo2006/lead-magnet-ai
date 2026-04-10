import { useState } from "react";
import { Mail, Send, Smartphone, X, Zap, ExternalLink, ChevronLeft, ChevronRight, Monitor, Image, MessageSquareText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Prospect } from "@/hooks/useProspectSearch";
import {
  BrowserMockupPreview,
  CleanCardPreview,
  PhoneMockupPreview,
  buildDemoUrl,
} from "@/components/crm/OutreachTemplatePreviews";
import { smsTemplates, getSmsTemplate } from "@/components/crm/SmsTemplates";

interface Props {
  prospects: Prospect[];
  onClose: () => void;
  onSent: () => void;
}

type TemplateStyle = "phone_mockup" | "clean_card" | "browser_mockup";
type Channel = "email" | "sms" | "both";

const OutreachDialog = ({ prospects, onClose, onSent }: Props) => {
  const [channel, setChannel] = useState<Channel>("email");
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>("browser_mockup");
  const [subject, setSubject] = useState("Quick idea for your website");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const previewProspect = prospects[previewIndex] || null;

  const demoUrl = (p: Prospect) => buildDemoUrl(p);

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
        const smsProspects = prospects.map((p) => ({
          id: p.id!,
          business_name: p.business_name,
          phone: p.phone || null,
          owner_name: p.owner_name || null,
          website_url: p.website_url || null,
          niche: p.niche || null,
        }));

        const { data: smsData, error: smsError } = await supabase.functions.invoke("send-outreach-sms", {
          body: {
            prospects: smsProspects,
            customMessage,
            baseUrl: window.location.origin,
          },
        });

        if (smsError) {
          toast.error("SMS sending failed", { description: smsError.message });
        } else {
          const smsSent = smsData?.sent || 0;
          const smsFailed = smsData?.failed || 0;
          const noPhone = smsData?.results?.filter((r: any) => r.error === "No phone number").length || 0;

          if (smsSent > 0) {
            toast.success(`Sent ${smsSent} SMS${smsSent > 1 ? "es" : ""} via Twilio!`, {
              description: smsFailed > 0 ? `${smsFailed} failed (${noPhone} missing phone)` : undefined,
            });
          } else if (channel === "sms") {
            toast.error(`No SMS sent. ${noPhone} prospects have no phone number.`);
          }
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
          <div className="p-5 space-y-5 border-r border-border">
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

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Email Template</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTemplateStyle("browser_mockup")}
                  className={`p-3 rounded-lg border text-left transition-colors ${templateStyle === "browser_mockup" ? "bg-primary/10 border-primary/40" : "bg-secondary border-border hover:border-primary/20"}`}
                >
                  <Monitor className="w-5 h-5 mb-1 text-primary" />
                  <p className="text-xs font-semibold text-foreground">Browser + AI</p>
                  <p className="text-[10px] text-muted-foreground">Website with Chat & Voice buttons</p>
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

            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending..." : `Send to ${prospects.length} Prospects`}
            </button>
          </div>

          <div className="p-5">
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

            {previewProspect && !previewProspect.website_screenshot && (templateStyle === "browser_mockup" || templateStyle === "phone_mockup") && (
              <p className="mb-3 text-[11px] text-muted-foreground">
                This business does not have a saved website screenshot yet, so the preview uses the branded fallback instead of a live site image.
              </p>
            )}

            {previewProspect && templateStyle === "browser_mockup" && (
              <BrowserMockupPreview
                prospect={previewProspect}
                subject={subject}
                customMessage={customMessage}
                demoUrl={demoUrl(previewProspect)}
              />
            )}
            {previewProspect && templateStyle === "phone_mockup" && (
              <PhoneMockupPreview
                prospect={previewProspect}
                subject={subject}
                customMessage={customMessage}
                demoUrl={demoUrl(previewProspect)}
              />
            )}
            {previewProspect && templateStyle === "clean_card" && (
              <CleanCardPreview
                prospect={previewProspect}
                subject={subject}
                customMessage={customMessage}
                demoUrl={demoUrl(previewProspect)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutreachDialog;
