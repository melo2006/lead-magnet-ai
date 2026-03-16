import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  ExternalLink,
  MessageSquare,
  Mic,
  MonitorSmartphone,
  Palette,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import newLaptop from "@/assets/new-website-laptop.png";
import newPhone from "@/assets/new-website-phone.png";

interface DemoResultsProps {
  leadData: {
    fullName: string;
    websiteUrl: string;
    screenshot?: string;
    title?: string;
    description?: string;
    colors?: {
      primary?: string;
      accent?: string;
      background?: string;
      textPrimary?: string;
    };
    logo?: string;
  };
  onBack: () => void;
}

const getImageSrc = (value?: string) => {
  if (!value) return null;
  if (value.startsWith("http") || value.startsWith("data:")) return value;
  return `data:image/png;base64,${value}`;
};

const getSiteName = (websiteUrl: string, title?: string) => {
  if (title?.trim()) return title.trim();

  try {
    const normalizedUrl = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
    return new URL(normalizedUrl).hostname.replace(/^www\./, "");
  } catch {
    return websiteUrl;
  }
};

const hexToHsl = (value?: string) => {
  if (!value) return null;
  if (value.startsWith("hsl(")) return value;
  if (!value.startsWith("#")) return null;

  const hex = value.replace("#", "");
  const normalized = hex.length === 3
    ? hex.split("").map((char) => `${char}${char}`).join("")
    : hex;

  if (normalized.length !== 6) return null;

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return `hsl(0 0% ${Math.round(lightness * 100)}%)`;
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue = 0;
  switch (max) {
    case r:
      hue = (g - b) / delta + (g < b ? 6 : 0);
      break;
    case g:
      hue = (b - r) / delta + 2;
      break;
    default:
      hue = (r - g) / delta + 4;
  }

  hue /= 6;

  return `hsl(${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%)`;
};

const DemoResults = ({ leadData, onBack }: DemoResultsProps) => {
  const screenshotSrc = getImageSrc(leadData.screenshot);
  const logoSrc = getImageSrc(leadData.logo);
  const siteName = getSiteName(leadData.websiteUrl, leadData.title);
  const colorEntries = Object.entries(leadData.colors ?? {}).filter(([, color]) => Boolean(color));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          Your redesign concept is ready
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
          Here’s the <span className="text-gradient-primary">modern AI version</span> of {siteName}
        </h2>
        <p className="mx-auto max-w-3xl text-sm sm:text-lg text-muted-foreground">
          We kept your brand, then rebuilt the experience into a high-converting website with AI chat, voice capture, and a cleaner real estate presentation.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.15fr]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-[1.75rem] border border-border bg-card p-4 sm:p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Current website we scraped</p>
              <p className="text-xs text-muted-foreground">Live capture from your existing site</p>
            </div>
            <div className="rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
              Before
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.25rem] border border-border bg-secondary/40">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
              <div className="ml-2 flex min-w-0 items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] text-muted-foreground">
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{leadData.websiteUrl}</span>
              </div>
            </div>

            {screenshotSrc ? (
              <img
                src={screenshotSrc}
                alt={`Current version of ${siteName}`}
                className="w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-muted px-6 text-center text-sm text-muted-foreground">
                We captured the site data, but the visual screenshot wasn’t available.
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-foreground">{siteName}</p>
            {leadData.description && (
              <p className="text-sm text-muted-foreground">{leadData.description}</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-card"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_40%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.16),transparent_35%)]" />
          <div className="relative flex h-full flex-col p-5 sm:p-7">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <Wand2 className="h-3.5 w-3.5" />
                  After redesign
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold">A real modern website concept</h3>
                  <p className="mt-2 max-w-xl text-sm sm:text-base text-muted-foreground">
                    This is the new website direction: cleaner listings, stronger branding, faster lead capture, and built-in AI everywhere.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-2 text-xs font-medium text-foreground">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  AI Chat
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-2 text-xs font-medium text-foreground">
                  <Mic className="h-3.5 w-3.5 text-primary" />
                  Voice Agent
                </div>
              </div>
            </div>

            <div className="grid flex-1 items-center gap-6 xl:grid-cols-[0.72fr_1.28fr]">
              <div className="space-y-4">
                <div className="rounded-[1.25rem] border border-border bg-background/70 p-4 backdrop-blur">
                  <div className="mb-4 flex items-center gap-3">
                    {logoSrc ? (
                      <img src={logoSrc} alt={`${siteName} logo`} className="h-10 w-10 rounded-xl border border-border bg-card object-contain p-1" loading="lazy" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">Brand-forward redesign</p>
                      <p className="text-xs text-muted-foreground">Built around {siteName}</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <MonitorSmartphone className="mt-0.5 h-4 w-4 text-primary" />
                      <span>Modern desktop + mobile layouts that actually look premium.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <MessageSquare className="mt-0.5 h-4 w-4 text-primary" />
                      <span>Conversational AI captures and qualifies leads instantly.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mic className="mt-0.5 h-4 w-4 text-primary" />
                      <span>Voice assistant answers questions even when you miss calls.</span>
                    </div>
                  </div>
                </div>

                {colorEntries.length > 0 && (
                  <div className="rounded-[1.25rem] border border-border bg-background/70 p-4 backdrop-blur">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Palette className="h-4 w-4 text-primary" />
                      Brand colors pulled from your site
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {colorEntries.slice(0, 4).map(([name, color]) => {
                        const hslColor = hexToHsl(color);
                        return (
                          <div key={name} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
                            <div
                              className="h-8 w-8 rounded-lg border border-border"
                              style={hslColor ? { backgroundColor: hslColor } : undefined}
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium capitalize text-foreground">{name}</p>
                              <p className="truncate text-[11px] text-muted-foreground">{color}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative min-h-[320px] rounded-[1.5rem] border border-border bg-secondary/50 p-4 sm:p-6">
                <div className="absolute right-4 top-4 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  New homepage preview
                </div>
                <div className="absolute left-4 top-4 rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                  {siteName}
                </div>

                <img
                  src={newLaptop}
                  alt={`Modern desktop redesign preview for ${siteName}`}
                  className="ml-auto mt-10 w-full max-w-2xl"
                  loading="lazy"
                />
                <img
                  src={newPhone}
                  alt={`Modern mobile redesign preview for ${siteName}`}
                  className="absolute bottom-4 left-3 w-24 sm:left-6 sm:w-32 lg:w-36"
                  loading="lazy"
                />

                <div className="absolute bottom-5 right-5 flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-2 text-xs font-medium text-foreground shadow-lg">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    AI buyer assistant
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-2 text-xs font-medium text-foreground shadow-lg">
                    <Mic className="h-3.5 w-3.5 text-primary" />
                    Voice lead capture
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex flex-col gap-3 rounded-[1.5rem] border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-lg font-semibold text-foreground">Want this exact redesign built for your business?</p>
          <p className="text-sm text-muted-foreground">We can turn this concept into your live AI-powered website.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="rounded-xl px-8 py-6 text-lg font-semibold"
          >
            Build this redesign for me
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onBack}
            className="rounded-xl"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Try another website
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default DemoResults;
