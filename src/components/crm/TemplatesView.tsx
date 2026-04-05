import { useState } from "react";
import { Mail, Smartphone, Zap, Eye, FileText, Copy, Check, Monitor, MessageCircle, Phone } from "lucide-react";

type TemplateType = "email" | "sms" | "visual";

interface Template {
  id: string;
  name: string;
  type: TemplateType;
  subject?: string;
  body: string;
  description?: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "visual-browser",
    name: "Browser + AI Mockup",
    type: "visual",
    subject: "Quick idea for your website",
    body: `Hi {{owner_name}},

I was looking at {{business_name}}'s website and had a quick idea — what if visitors could instantly chat or call an AI assistant right from your site?

We mocked up a quick preview showing how it would look on your actual website. Check it out:

{{demo_link}}

It takes 30 seconds — just talk to it or chat like a real customer would.

No pressure, just thought it was worth sharing!`,
    description: "Shows their website in a browser frame with Chat AI + Voice AI widget buttons overlaid",
  },
  {
    id: "visual-phone",
    name: "Phone Mockup",
    type: "visual",
    subject: "See how {{business_name}} looks with AI",
    body: `Hi {{owner_name}},

We built a quick personalized demo for {{business_name}} showing how an AI receptionist handles calls and chats 24/7.

{{demo_link}}

Check it out on your phone — it's a 30-second experience.

Best,
AgentFlow AI Team`,
    description: "Shows their website inside a phone frame with AI widget buttons",
  },
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

const BrowserMockupPreview = () => (
  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
    <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
      <p className="text-[11px] text-gray-500">From: <span className="text-gray-700">ai@yourdomain.com</span></p>
      <p className="text-[11px] text-gray-500">To: <span className="text-gray-700">john@smithroofing.com</span></p>
      <p className="text-sm font-semibold text-gray-900 mt-1">Quick idea for your website</p>
    </div>
    <div className="p-5 space-y-4">
      <p className="text-sm text-gray-700">Hi John,</p>
      <p className="text-sm text-gray-700">
        I was looking at Smith Roofing LLC's website and had a quick idea — what if visitors could instantly chat or call an AI assistant right from your site?
      </p>
      {/* Browser mockup with website + AI widgets */}
      <div className="mx-auto max-w-[360px]">
        <div className="rounded-lg border-2 border-gray-300 overflow-hidden shadow-md">
          {/* Browser chrome */}
          <div className="bg-gray-200 px-3 py-1.5 flex items-center gap-1.5">
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded-md px-2 py-0.5 text-[9px] text-gray-500 ml-2 truncate">
              smithroofing.com
            </div>
          </div>
          {/* Website content area */}
          <div className="relative bg-gradient-to-br from-slate-100 to-blue-50 h-[180px]">
            <div className="p-3">
              <div className="w-20 h-3 bg-gray-300 rounded mb-2" />
              <div className="w-32 h-5 bg-gray-400 rounded mb-1" />
              <div className="w-28 h-3 bg-gray-300 rounded mb-3" />
              <div className="w-24 h-2 bg-gray-200 rounded mb-1" />
              <div className="w-32 h-2 bg-gray-200 rounded mb-1" />
              <div className="w-20 h-2 bg-gray-200 rounded" />
            </div>
            {/* Chat AI button - bottom left */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-emerald-500 text-white rounded-full px-3 py-1.5 shadow-lg">
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">Chat AI</span>
            </div>
            {/* Voice AI button - bottom right */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-blue-600 text-white rounded-full px-3 py-1.5 shadow-lg">
              <Phone className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">Voice AI</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-700">
        We mocked up a quick preview. Check it out:
      </p>
      <a href="#" className="inline-block bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg no-underline">
        See Your AI Demo →
      </a>
      <p className="text-xs text-gray-500">No pressure, just thought it was worth sharing!</p>
    </div>
  </div>
);

const PhoneMockupPreview = () => (
  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
    <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
      <p className="text-[11px] text-gray-500">From: <span className="text-gray-700">ai@yourdomain.com</span></p>
      <p className="text-[11px] text-gray-500">To: <span className="text-gray-700">john@smithroofing.com</span></p>
      <p className="text-sm font-semibold text-gray-900 mt-1">See how Smith Roofing LLC looks with AI</p>
    </div>
    <div className="p-5 space-y-4">
      <p className="text-sm text-gray-700">Hi John,</p>
      <p className="text-sm text-gray-700">We built a quick personalized demo for Smith Roofing LLC:</p>
      {/* Phone mockup */}
      <div className="flex justify-center">
        <div className="w-[160px]">
          <div className="rounded-[1.5rem] border-[4px] border-gray-800 bg-black shadow-2xl overflow-hidden">
            <div className="h-4 bg-black flex items-center justify-center">
              <div className="w-[40px] h-[10px] bg-gray-900 rounded-full" />
            </div>
            <div className="relative bg-gradient-to-br from-slate-100 to-blue-50 h-[220px]">
              <div className="p-2">
                <div className="w-12 h-2 bg-gray-300 rounded mb-1.5" />
                <div className="w-20 h-3 bg-gray-400 rounded mb-1" />
                <div className="w-16 h-2 bg-gray-300 rounded mb-2" />
                <div className="w-full h-1.5 bg-gray-200 rounded mb-0.5" />
                <div className="w-3/4 h-1.5 bg-gray-200 rounded mb-0.5" />
                <div className="w-1/2 h-1.5 bg-gray-200 rounded" />
              </div>
              {/* Chat AI button */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-emerald-500 text-white rounded-full px-2 py-1 shadow-lg">
                <MessageCircle className="w-2.5 h-2.5" />
                <span className="text-[7px] font-semibold">Chat</span>
              </div>
              {/* Voice AI button */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-blue-600 text-white rounded-full px-2 py-1 shadow-lg">
                <Phone className="w-2.5 h-2.5" />
                <span className="text-[7px] font-semibold">Voice</span>
              </div>
            </div>
            <div className="h-3 bg-black flex items-center justify-center">
              <div className="w-[60px] h-[2px] bg-gray-600 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <a href="#" className="inline-block bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg no-underline">
        Try Your AI Demo →
      </a>
    </div>
  </div>
);

const TemplatesView = () => {
  const [selectedType, setSelectedType] = useState<"all" | TemplateType>("all");
  const [previewId, setPreviewId] = useState<string | null>("visual-browser");
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

  const getIcon = (t: Template) => {
    if (t.id === "visual-browser") return <Monitor className="w-4 h-4 text-primary" />;
    if (t.id === "visual-phone") return <Smartphone className="w-4 h-4 text-primary" />;
    if (t.type === "email") return <Mail className="w-4 h-4 text-purple-400" />;
    return <Smartphone className="w-4 h-4 text-blue-400" />;
  };

  const renderPreview = () => {
    if (!previewTemplate) {
      return (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select a template to preview</p>
        </div>
      );
    }

    if (previewTemplate.id === "visual-browser") return <BrowserMockupPreview />;
    if (previewTemplate.id === "visual-phone") return <PhoneMockupPreview />;

    if (previewTemplate.type === "email") {
      return (
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
      );
    }

    // SMS preview
    return (
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
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Templates</h1>
        <p className="text-sm text-muted-foreground">Email, SMS, and visual templates for outreach campaigns</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {([
          { key: "all" as const, label: "All", icon: FileText },
          { key: "visual" as const, label: "Visual", icon: Monitor },
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
                  {getIcon(t)}
                  <span className="text-sm font-semibold text-foreground">{t.name}</span>
                  {t.type === "visual" && (
                    <span className="text-[9px] font-medium bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">NEW</span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); copyTemplate(t); }}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              {t.description && <p className="text-[11px] text-primary/70 mb-1">{t.description}</p>}
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
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default TemplatesView;
