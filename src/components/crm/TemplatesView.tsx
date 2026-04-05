import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, Smartphone, Eye, FileText, Copy, Check, Monitor, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BrowserMockupPreview,
  PhoneMockupPreview,
  buildDemoUrl,
  type PreviewBusiness,
} from "@/components/crm/OutreachTemplatePreviews";

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

We mocked up your real website with Chat AI and Voice AI layered directly on top.

• Never miss calls or chats
• Book and update appointments automatically
• Answer pricing and service questions instantly
• Warm transfer qualified callers to your team

{{demo_link}}`,
    description: "Shows a saved website image inside a browser frame with Chat AI + Voice AI buttons on top",
  },
  {
    id: "visual-phone",
    name: "Phone Mockup",
    type: "visual",
    subject: "See how {{business_name}} looks with AI",
    body: `Hi {{owner_name}},

We turned {{business_name}} into a mobile-style demo with Chat AI and Voice AI on top of your website.

Customers can ask questions, book appointments, and reach a live person faster.

{{demo_link}}`,
    description: "Shows the same website concept inside a phone frame with both AI buttons overlaid",
  },
  {
    id: "email-1",
    name: "AI Demo Introduction",
    type: "email",
    subject: "Quick idea for {{business_name}}",
    body: `Hi {{owner_name}},

I put together a quick personalized AI demo for {{business_name}} showing how Voice AI + Chat AI could answer questions, book appointments, and catch leads 24/7.

{{demo_link}}

Worth a quick look when you have 30 seconds.`,
    description: "Short cold email that introduces the AI demo in a personal way",
  },
  {
    id: "email-2",
    name: "Follow-up (No Response)",
    type: "email",
    subject: "Your AI demo is still live, {{business_name}}",
    body: `Hi {{owner_name}},

Just following up — your personalized demo for {{business_name}} is still live.

{{demo_link}}

It shows how AI can answer questions, book appointments, and warm transfer qualified callers to your team.

Happy to hear what you think.`,
    description: "Gentle follow-up that keeps the demo link active without sounding pushy",
  },
  {
    id: "sms-1",
    name: "SMS Demo Intro",
    type: "sms",
    body: `Hi {{owner_name}} — we built a quick AI demo for {{business_name}} so you can see Chat AI + Voice AI on your site: {{demo_link}}`,
    description: "First-touch SMS linking directly to the live demo",
  },
  {
    id: "sms-2",
    name: "SMS Follow-up",
    type: "sms",
    body: `Quick follow-up: your AI demo for {{business_name}} is still live here {{demo_link}} if you want to test it.`,
    description: "Short reminder text to bring the prospect back to the demo",
  },
];

const VARIABLES = [
  { key: "{{business_name}}", label: "Business Name" },
  { key: "{{owner_name}}", label: "Owner Name" },
  { key: "{{demo_link}}", label: "Demo Link" },
  { key: "{{niche}}", label: "Niche" },
];

const EMPTY_PREVIEW_BUSINESS: PreviewBusiness = {
  id: "preview",
  business_name: "Your business",
  owner_name: "there",
  owner_email: null,
  website_url: "yourwebsite.com",
  website_screenshot: null,
  niche: "service business",
};

const mapProspectRow = (row: any): PreviewBusiness => ({
  id: row.id,
  business_name: row.business_name,
  owner_name: row.owner_name,
  owner_email: row.owner_email,
  website_url: row.website_url,
  website_screenshot: row.website_screenshot,
  niche: row.niche,
});

const mapLeadRow = (row: any): PreviewBusiness => ({
  id: row.id,
  business_name: row.business_name,
  owner_name: row.full_name,
  owner_email: row.email,
  website_url: row.website_url,
  website_screenshot: row.website_screenshot,
  niche: row.niche,
});

const getWebsiteHref = (websiteUrl?: string | null) => {
  if (!websiteUrl) return null;
  return websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
};

const fetchPreviewBusiness = async (): Promise<PreviewBusiness> => {
  try {
    const { data: prospectWithImage } = await supabase
      .from("prospects")
      .select("id,business_name,owner_name,owner_email,niche,website_url,website_screenshot")
      .not("website_screenshot", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prospectWithImage) return mapProspectRow(prospectWithImage);

    const { data: leadWithImage } = await supabase
      .from("leads")
      .select("id,business_name,full_name,email,niche,website_url,website_screenshot")
      .not("website_screenshot", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (leadWithImage) return mapLeadRow(leadWithImage);

    const { data: latestProspect } = await supabase
      .from("prospects")
      .select("id,business_name,owner_name,owner_email,niche,website_url,website_screenshot")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestProspect) return mapProspectRow(latestProspect);

    const { data: latestLead } = await supabase
      .from("leads")
      .select("id,business_name,full_name,email,niche,website_url,website_screenshot")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestLead) return mapLeadRow(latestLead);
  } catch (error) {
    console.error("Template preview business error:", error);
  }

  return EMPTY_PREVIEW_BUSINESS;
};

const TemplatesView = () => {
  const [selectedType, setSelectedType] = useState<"all" | TemplateType>("all");
  const [previewId, setPreviewId] = useState<string | null>("visual-browser");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: previewBusinessData, isLoading: previewBusinessLoading } = useQuery({
    queryKey: ["template-preview-business"],
    queryFn: fetchPreviewBusiness,
    staleTime: 60_000,
  });

  const previewBusiness = previewBusinessData || EMPTY_PREVIEW_BUSINESS;
  const previewDemoUrl = useMemo(() => buildDemoUrl(previewBusiness), [previewBusiness]);
  const previewWebsiteHref = useMemo(() => getWebsiteHref(previewBusiness.website_url), [previewBusiness.website_url]);

  const filtered = useMemo(
    () => (selectedType === "all" ? DEFAULT_TEMPLATES : DEFAULT_TEMPLATES.filter((template) => template.type === selectedType)),
    [selectedType],
  );

  useEffect(() => {
    if (!filtered.some((template) => template.id === previewId)) {
      setPreviewId(filtered[0]?.id ?? null);
    }
  }, [filtered, previewId]);

  const previewTemplate = DEFAULT_TEMPLATES.find((template) => template.id === previewId) || filtered[0];

  const fillPreview = (text: string) => {
    return text
      .replace(/\{\{business_name\}\}/g, previewBusiness.business_name)
      .replace(/\{\{owner_name\}\}/g, previewBusiness.owner_name || "there")
      .replace(/\{\{demo_link\}\}/g, previewDemoUrl)
      .replace(/\{\{niche\}\}/g, previewBusiness.niche || "service business");
  };

  const getVariableExample = (key: string) => {
    switch (key) {
      case "{{business_name}}":
        return previewBusiness.business_name;
      case "{{owner_name}}":
        return previewBusiness.owner_name || "there";
      case "{{demo_link}}":
        return previewDemoUrl;
      case "{{niche}}":
        return previewBusiness.niche || "service business";
      default:
        return "";
    }
  };

  const copyTemplate = (template: Template) => {
    navigator.clipboard.writeText(template.body);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getIcon = (template: Template) => {
    if (template.id === "visual-browser") return <Monitor className="w-4 h-4 text-primary" />;
    if (template.id === "visual-phone") return <Smartphone className="w-4 h-4 text-primary" />;
    if (template.type === "email") return <Mail className="w-4 h-4 text-primary" />;
    return <Smartphone className="w-4 h-4 text-primary" />;
  };

  const getTypeBadge = (type: TemplateType) => {
    if (type === "visual") return "bg-primary/15 text-primary";
    if (type === "email") return "bg-secondary text-foreground";
    return "bg-secondary text-muted-foreground";
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

    if (previewTemplate.id === "visual-browser") {
      return (
        <BrowserMockupPreview
          prospect={previewBusiness}
          subject={fillPreview(previewTemplate.subject || "Quick idea for your website")}
          customMessage=""
          demoUrl={previewDemoUrl}
        />
      );
    }

    if (previewTemplate.id === "visual-phone") {
      return (
        <PhoneMockupPreview
          prospect={previewBusiness}
          subject={fillPreview(previewTemplate.subject || "See how your website looks with AI")}
          customMessage=""
          demoUrl={previewDemoUrl}
        />
      );
    }

    if (previewTemplate.type === "email") {
      return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
            <p className="text-[11px] text-gray-500">From: <span className="text-gray-700">ai@yourdomain.com</span></p>
            <p className="text-[11px] text-gray-500">To: <span className="text-gray-700">{previewBusiness.owner_email || "hello@yourbusiness.com"}</span></p>
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
                <p className="text-xs font-semibold text-gray-800">Preview</p>
              </div>
              <div className="bg-emerald-500 text-white rounded-2xl rounded-br-md px-3 py-2 text-[13px] leading-relaxed ml-6 shadow-sm whitespace-pre-wrap">
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

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Live preview data</p>
            <p className="text-sm font-semibold text-foreground">
              {previewBusinessLoading ? "Loading a real business preview..." : previewBusiness.business_name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {previewBusiness.website_screenshot
                ? "Using a saved website image in the visual mockups."
                : "No saved website image exists for this preview record yet, so visual templates use the branded fallback."}
            </p>
          </div>

          {previewWebsiteHref && (
            <a
              href={previewWebsiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open website
            </a>
          )}
        </div>
      </div>

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
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {filtered.map((template) => (
            <div
              key={template.id}
              role="button"
              tabIndex={0}
              onClick={() => setPreviewId(template.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setPreviewId(template.id);
                }
              }}
              className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                previewId === template.id
                  ? "bg-primary/5 border-primary/30"
                  : "bg-card border-border hover:border-primary/20"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {getIcon(template)}
                  <span className="text-sm font-semibold text-foreground">{template.name}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase ${getTypeBadge(template.type)}`}>
                    {template.type}
                  </span>
                  {template.type === "visual" && (
                    <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-medium text-primary">NEW</span>
                  )}
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    copyTemplate(template);
                  }}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedId === template.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {template.description && <p className="mb-1 text-[11px] text-primary/70">{template.description}</p>}
              {template.subject && <p className="mb-1 text-xs text-muted-foreground">Subject: {template.subject}</p>}
              <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{template.body}</p>
            </div>
          ))}

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-foreground mb-2">Available Variables</h3>
            <div className="space-y-1.5">
              {VARIABLES.map((variable) => (
                <div key={variable.key} className="flex items-center justify-between gap-3 text-xs">
                  <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono text-[11px]">{variable.key}</code>
                  <span className="text-right text-muted-foreground">
                    {variable.label} → <span className="text-foreground break-all">{getVariableExample(variable.key)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

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
