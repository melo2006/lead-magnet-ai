import { ArrowRight, Bot, MapPin, MessageSquare, Mic, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { DemoLeadData, buildModernHeadline, buildSupportingCopy, extractBulletItems, extractHeadings, extractNavigationLabels, getImageSrc, getSiteName, getThemeColor } from "./demoResultsUtils";
import VoiceAgentWidget from "./VoiceAgentWidget";

interface AfterPreviewProps {
  leadData: DemoLeadData;
}

const tint = (channels: string, alpha: number) => `hsl(${channels} / ${alpha})`;

const AfterPreview = ({ leadData }: AfterPreviewProps) => {
  const siteName = getSiteName(leadData.websiteUrl, leadData.title);
  const logoSrc = getImageSrc(leadData.logo);
  const primaryColor = getThemeColor(leadData.colors?.primary, "160 84% 50%");
  const accentColor = getThemeColor(leadData.colors?.accent ?? leadData.colors?.link, "262 83% 65%");
  const backgroundColor = getThemeColor(leadData.colors?.background, "220 18% 8%");
  const textColor = getThemeColor(leadData.colors?.textPrimary, "210 40% 96%");
  const navigationLabels = extractNavigationLabels(leadData.websiteContent);
  const headings = extractHeadings(leadData.websiteContent);
  const locations = extractBulletItems(leadData.websiteContent, 5);
  const headline = buildModernHeadline({ siteName, title: leadData.title });
  const supportingCopy = buildSupportingCopy({ description: leadData.description, siteName });

  const shellStyle: CSSProperties = {
    background: `linear-gradient(145deg, ${tint(backgroundColor, 1)} 0%, ${tint(backgroundColor, 0.96)} 58%, ${tint(primaryColor, 0.18)} 100%)`,
    color: `hsl(${textColor})`,
    boxShadow: `0 22px 60px -32px ${tint(primaryColor, 0.7)}`,
  };

  const softPrimaryStyle: CSSProperties = {
    backgroundColor: tint(primaryColor, 0.14),
    borderColor: tint(primaryColor, 0.22),
  };

  const softAccentStyle: CSSProperties = {
    backgroundColor: tint(accentColor, 0.14),
    borderColor: tint(accentColor, 0.22),
  };

  const glassPanelStyle: CSSProperties = {
    backgroundColor: tint(textColor, 0.06),
    borderColor: tint(textColor, 0.1),
  };

  const primaryButtonStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${tint(primaryColor, 0.26)}, ${tint(accentColor, 0.22)})`,
    borderColor: tint(primaryColor, 0.35),
    boxShadow: `0 14px 30px -20px ${tint(primaryColor, 0.9)}`,
  };

  const serviceHighlights = headings.length > 0 ? headings : ["Core Services", "Customer Experience", "Easy Booking"];
  const neighborhoodHighlights = locations.length > 0 ? locations : ["Featured Service", "Popular Choice", "Premium Package", "New Clients"];
  const menuItems = navigationLabels.length > 0 ? navigationLabels : ["Services", "About", "Book Now", "Contact"];

  return (
    <div className="rounded-[1.75rem] border border-primary/20 bg-card p-4 sm:p-5">
      <div className="mb-4 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          02 · Modern redesign concept
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">A real redesign direction for this brand</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Built from the scraped logo, colors, title, and page content — not just two floating icons.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-border p-3 sm:p-4" style={shellStyle}>
        <div className="rounded-[1.25rem] border px-4 py-3 backdrop-blur" style={softPrimaryStyle}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={`${siteName} logo`}
                  className="h-10 w-10 rounded-xl border object-contain p-1"
                  style={glassPanelStyle}
                  loading="lazy"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border" style={glassPanelStyle}>
                  <Sparkles className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{siteName}</p>
                <p className="text-xs" style={{ color: tint(textColor, 0.72) }}>
                  Modern AI-powered experience
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] font-medium" style={{ color: tint(textColor, 0.84) }}>
              {menuItems.slice(0, 4).map((item) => (
                <span key={item} className="rounded-full border px-3 py-1" style={softAccentStyle}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.5rem] border p-5 sm:p-6" style={softPrimaryStyle}>
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={softAccentStyle}>
              <Sparkles className="h-3.5 w-3.5" />
              Homepage hero concept
            </div>

            <h4 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{headline}</h4>
            <p className="mt-3 max-w-xl text-sm sm:text-base" style={{ color: tint(textColor, 0.8) }}>
              {supportingCopy}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold" style={primaryButtonStyle}>
                Explore services
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold" style={softAccentStyle}>
                <MessageSquare className="h-4 w-4" />
                Meet the AI concierge
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {serviceHighlights.slice(0, 3).map((item) => (
                <div key={item} className="rounded-2xl border p-3" style={softAccentStyle}>
                  <p className="text-sm font-semibold">{item}</p>
                  <p className="mt-1 text-xs" style={{ color: tint(textColor, 0.7) }}>
                    Cleaner layout with better hierarchy and faster customer engagement.
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.5rem] border p-4" style={softAccentStyle}>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Bot className="h-4 w-4" />
                Featured collections
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {menuItems.slice(0, 4).map((item, index) => (
                  <div key={item} className="rounded-2xl border p-4" style={glassPanelStyle}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: tint(textColor, 0.64) }}>
                      Collection {index + 1}
                    </p>
                    <p className="mt-2 text-lg font-semibold">{item}</p>
                    <p className="mt-1 text-sm" style={{ color: tint(textColor, 0.74) }}>
                      Designed to surface key content faster and feel more premium.
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border p-4" style={softPrimaryStyle}>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4" />
                  AI chat capture
                </div>
                <p className="text-sm" style={{ color: tint(textColor, 0.76) }}>
                  Answers buyer questions, qualifies leads, and books follow-up instantly.
                </p>
              </div>
              <VoiceAgentWidget
                businessName={siteName}
                businessNiche={leadData.niche || "general"}
                ownerName={leadData.fullName}
                ownerPhone={leadData.phone}
                websiteUrl={leadData.websiteUrl}
                businessInfo={leadData.websiteContent || leadData.description || ""}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[1.5rem] border p-4" style={softAccentStyle}>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4" />
              Area expertise section
            </div>
            <div className="flex flex-wrap gap-2">
              {neighborhoodHighlights.map((item) => (
                <span key={item} className="rounded-full border px-3 py-1.5 text-xs font-medium" style={glassPanelStyle}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border p-4" style={softPrimaryStyle}>
            <p className="text-sm font-semibold">Why this feels modern</p>
            <ul className="mt-3 space-y-2 text-sm" style={{ color: tint(textColor, 0.76) }}>
              <li>• Stronger hero section with clear value proposition</li>
              <li>• Better mobile-first structure and navigation</li>
              <li>• Brand colors integrated into the whole page system</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AfterPreview;
