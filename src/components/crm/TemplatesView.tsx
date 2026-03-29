import { useState } from "react";
import { Mail, Smartphone, Zap, Eye, FileText, Copy, Check } from "lucide-react";

type TemplateType = "email" | "sms";

interface Template {
  id: string;
  name: string;
  type: TemplateType;
  subject?: string;
  body: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "email-1",
    name: "AI Demo Introduction",
    type: "email",
    subject: "Never miss a call or lead again, {{business_name}}!",
    body: `Hi {{owner_name}},

I noticed {{business_name}} doesn't have an AI assistant handling calls and chats yet. We built a quick personalized demo showing how an AI receptionist could work for your business 24/7.

{{demo_link}}

It takes 30 seconds to try — just talk to it or chat with it like a real customer would.

Best,
AgentFlow AI Team`,
  },
  {
    id: "email-2",
    name: "Follow-up (No Response)",
    type: "email",
    subject: "Quick follow-up — your AI demo is still live, {{business_name}}",
    body: `Hi {{owner_name}},

Just following up on my previous email. Your personalized AI demo is still live and ready to try:

{{demo_link}}

Many {{niche}} businesses like yours are already using AI to handle after-hours calls and book appointments automatically.

Would love to hear your thoughts!

Best,
AgentFlow AI Team`,
  },
  {
    id: "sms-1",
    name: "SMS Demo Intro",
    type: "sms",
    body: `Hi {{owner_name}}! We built a free AI demo for {{business_name}}. Try it here: {{demo_link}} — it answers calls and chats 24/7. Reply STOP to opt out.`,
  },
  {
    id: "sms-2",
    name: "SMS Follow-up",
    type: "sms",
    body: `Hey {{owner_name}}, just checking in! Your AI demo for {{business_name}} is still live: {{demo_link}}. Worth a quick look! Reply STOP to opt out.`,
  },
];

const VARIABLES = [
  { key: "{{business_name}}", label: "Business Name", example: "Smith Roofing" },
  { key: "{{owner_name}}", label: "Owner Name", example: "John" },
  { key: "{{demo_link}}", label: "Demo Link", example: "https://..." },
  { key: "{{niche}}", label: "Niche", example: "roofing" },
  { key: "{{city}}", label: "City", example: "Miami" },
];

const TemplatesView = () => {
  const [selectedType, setSelectedType] = useState<"all" | TemplateType>("all");
  const [previewId, setPreviewId] = useState<string | null>("email-1");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = selectedType === "all"
    ? DEFAULT_TEMPLATES
    : DEFAULT_TEMPLATES.filter((t) => t.type === selectedType);

  const previewTemplate = DEFAULT_TEMPLATES.find((t) => t.id === previewId);

  const fillPreview = (text: string) => {
    return text
      .replace(/\{\{business_name\}\}/g, "Smith Roofing LLC")
      .replace(/\{\{owner_name\}\}/g, "John")
      .replace(/\{\{demo_link\}\}/g, "https://yourdomain.com/demo?id=abc123")
      .replace(/\{\{niche\}\}/g, "roofing")
      .replace(/\{\{city\}\}/g, "Miami");
  };

  const copyTemplate = (template: Template) => {
    navigator.clipboard.writeText(template.body);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Templates</h1>
        <p className="text-sm text-muted-foreground">Email and SMS templates for outreach campaigns</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {([
          { key: "all" as const, label: "All", icon: FileText },
          { key: "email" as const, label: "Email", icon: Mail },
          { key: "sms" as const, label: "SMS", icon: Smartphone },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedType(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedType === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Template List */}
        <div className="space-y-3">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => setPreviewId(t.id)}
              className={`w-full text-left p-4 rounded-xl border transition-colors ${
                previewId === t.id
                  ? "bg-primary/5 border-primary/30"
                  : "bg-card border-border hover:border-primary/20"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {t.type === "email" ? (
                    <Mail className="w-4 h-4 text-purple-400" />
                  ) : (
                    <Smartphone className="w-4 h-4 text-blue-400" />
                  )}
                  <span className="text-sm font-semibold text-foreground">{t.name}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); copyTemplate(t); }}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              {t.subject && <p className="text-xs text-muted-foreground mb-1">Subject: {t.subject}</p>}
              <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
            </button>
          ))}

          {/* Variables Reference */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-foreground mb-2">Available Variables</h3>
            <div className="space-y-1.5">
              {VARIABLES.map((v) => (
                <div key={v.key} className="flex items-center justify-between text-xs">
                  <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono text-[11px]">{v.key}</code>
                  <span className="text-muted-foreground">{v.label} → <span className="text-foreground">{v.example}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Eye className="w-4 h-4 text-primary" /> Live Preview
          </div>

          {previewTemplate ? (
            previewTemplate.type === "email" ? (
              /* Email Preview */
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                  <p className="text-[11px] text-gray-500">From: <span className="text-gray-700">ai@yourdomain.com</span></p>
                  <p className="text-[11px] text-gray-500">To: <span className="text-gray-700">john@smithroofing.com</span></p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{fillPreview(previewTemplate.subject || "")}</p>
                </div>
                <div className="p-5">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {fillPreview(previewTemplate.body)}
                  </pre>
                </div>
              </div>
            ) : (
              /* SMS Preview - iPhone style */
              <div className="flex justify-center">
                <div className="w-[280px]">
                  <div className="rounded-[2.5rem] border-[6px] border-gray-800 bg-black shadow-2xl overflow-hidden">
                    <div className="h-7 bg-black flex items-center justify-center">
                      <div className="w-[60px] h-[18px] bg-gray-900 rounded-full" />
                    </div>
                    <div className="bg-gray-100 min-h-[380px] p-3">
                      <div className="text-center mb-3">
                        <p className="text-[10px] text-gray-500">Text Message</p>
                        <p className="text-xs font-semibold text-gray-800">+1 (555) 123-4567</p>
                      </div>
                      <div className="bg-emerald-500 text-white rounded-2xl rounded-br-md px-3 py-2 text-[13px] leading-relaxed ml-6 shadow-sm">
                        {fillPreview(previewTemplate.body)}
                      </div>
                      <p className="text-[9px] text-gray-400 text-right mt-1 mr-1">Delivered ✓</p>
                    </div>
                    <div className="h-5 bg-black flex items-center justify-center">
                      <div className="w-[100px] h-[4px] bg-gray-600 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Select a template to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplatesView;
