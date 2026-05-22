import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Radar,
  Copy,
  ExternalLink,
  Sparkles,
  Trash2,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

type Platform = "meta" | "tiktok" | "linkedin" | "google";
type SupportedPlatform = "meta" | "tiktok";
type EngagementTarget = "all" | "commentable_only" | "all_with_contact";
type AdsFilter = "all" | "commentable" | "contact_fallback" | "dark";

interface ScrapedAd {
  id: string;
  platform: Platform;
  advertiser_name: string;
  landing_url: string;
  cta_text: string | null;
  ad_creative_text: string | null;
  ad_media_url: string | null;
  source_ad_url: string | null;
  posted_at: string | null;
  comment_template: string | null;
  status: string;
  prospect_id: string | null;
  scan_job_id: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

interface ScanJob {
  id: string;
  niche: string;
  location: string | null;
  platforms: string[];
  status: string;
  ads_found: number;
  total_cost_usd: number;
  last_error: string | null;
  created_at: string;
  platform_results?: Record<string, unknown> | null;
}

interface PlatformScanResult {
  count: number;
  error?: string;
}

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const NICHE_OPTIONS = [
  {
    id: "med-spa",
    label: "Med Spa",
    keywords: ["med spa", "botox", "laser hair removal", "weight loss clinic", "skin rejuvenation"],
  },
  {
    id: "dental",
    label: "Dental",
    keywords: ["dentist", "cosmetic dentist", "dental implants", "orthodontist", "emergency dentist"],
  },
  {
    id: "home-services",
    label: "Home Services",
    keywords: ["roofer", "plumber", "hvac", "water damage restoration", "pest control"],
  },
  {
    id: "legal",
    label: "Legal",
    keywords: ["personal injury lawyer", "family lawyer", "estate planning attorney", "criminal defense lawyer"],
  },
  {
    id: "wellness",
    label: "Wellness",
    keywords: ["chiropractor", "physical therapy", "mental health clinic", "iv therapy", "functional medicine"],
  },
  { id: "custom", label: "Custom", keywords: ["custom"] },
];

const US_STATES = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
]);

const VERIFIED_CITIES = [
  "Fort Lauderdale, FL",
  "Miami, FL",
  "West Palm Beach, FL",
  "Boca Raton, FL",
  "Orlando, FL",
  "Tampa, FL",
  "Jacksonville, FL",
  "Atlanta, GA",
  "Dallas, TX",
  "Houston, TX",
  "Austin, TX",
  "Los Angeles, CA",
  "San Diego, CA",
  "New York, NY",
  "Chicago, IL",
  "Phoenix, AZ",
  "Denver, CO",
  "Charlotte, NC",
  "Nashville, TN",
  "Las Vegas, NV",
];

const PLATFORMS: { id: Platform; label: string; supported: boolean; note: string }[] = [
  { id: "meta", label: "Meta (FB+IG)", supported: true, note: "Apify actor connected" },
  { id: "tiktok", label: "TikTok", supported: true, note: "Apify actor connected" },
  { id: "linkedin", label: "LinkedIn", supported: false, note: "No reliable actor connected yet" },
  { id: "google", label: "Google", supported: false, note: "No reliable actor connected yet" },
];

const formatLocation = (value: string) =>
  value
    .split(",")
    .map((part, index) =>
      index === 1
        ? part.trim().toUpperCase()
        : part
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase()),
    )
    .join(", ");

const validateLocation = (value: string): { valid: boolean; message: string; normalized: string } => {
  const trimmed = value.trim();
  if (!trimmed) return { valid: true, message: "Optional, but city + state improves local ad quality.", normalized: "" };

  const match = trimmed.match(/^([a-zA-Z .'-]{2,60}),\s*([a-zA-Z]{2})$/);
  if (!match) {
    return { valid: false, message: "Use City, ST format, for example Fort Lauderdale, FL.", normalized: trimmed };
  }

  const normalized = formatLocation(`${match[1]}, ${match[2]}`);
  const state = match[2].toUpperCase();
  if (!US_STATES.has(state)) return { valid: false, message: "State must be a valid 2-letter US state code.", normalized };

  const verified = VERIFIED_CITIES.some((city) => city.toLowerCase() === normalized.toLowerCase());
  return {
    valid: true,
    message: verified ? "Verified city format for Apify searches." : "Valid city/state format; not in quick-pick list, but safe to scan.",
    normalized,
  };
};

const safeHost = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const metaStr = (ad: ScrapedAd, key: string): string | null => {
  const v = ad.metadata?.[key];
  return typeof v === "string" && v.trim() ? v : null;
};

const getAdLinks = (ad: ScrapedAd) => ({
  fbPost: metaStr(ad, "fb_post_url"),
  igPost: metaStr(ad, "ig_post_url"),
  fbPage: metaStr(ad, "fb_page_url"),
  igPage: metaStr(ad, "ig_page_url"),
  contactPage: metaStr(ad, "contact_page_url"),
  library: metaStr(ad, "library_url") || ad.source_ad_url,
});

const getPublisherPlatforms = (ad: ScrapedAd): string[] => {
  const raw = ad.metadata?.publisher_platforms;
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => String(v).toLowerCase());
};

const isCommentable = (ad: ScrapedAd): boolean => {
  if (ad.metadata?.is_commentable === true) return true;
  const l = getAdLinks(ad);
  return Boolean(l.fbPost || l.igPost);
};

const hasContactFallback = (ad: ScrapedAd): boolean => Boolean(getAdLinks(ad).contactPage);

const matchesAdsFilter = (ad: ScrapedAd, filter: AdsFilter): boolean => {
  if (filter === "commentable") return isCommentable(ad);
  if (filter === "contact_fallback") return hasContactFallback(ad);
  if (filter === "dark") return !isCommentable(ad);
  return true;
};

export default function AdHijack() {
  const { toast } = useToast();
  const [selectedNicheId, setSelectedNicheId] = useState("med-spa");
  const [subNiche, setSubNiche] = useState("med spa");
  const [customNiche, setCustomNiche] = useState("");
  const [location, setLocation] = useState("Fort Lauderdale, FL");
  const [limit, setLimit] = useState("25");
  const [selectedPlatforms, setSelectedPlatforms] = useState<SupportedPlatform[]>(["meta"]);
  const [scanning, setScanning] = useState(false);
  const [scanningJobId, setScanningJobId] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [ads, setAds] = useState<ScrapedAd[]>([]);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [engagementTarget, setEngagementTarget] = useState<EngagementTarget>("all_with_contact");
  const [adsFilter, setAdsFilter] = useState<AdsFilter>("all");

  const loadData = useCallback(async () => {
    const [adsRes, jobsRes] = await Promise.all([
      supabase.from("scraped_ads").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("ad_scan_jobs").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (adsRes.data) setAds(adsRes.data as ScrapedAd[]);
    if (jobsRes.data) setJobs(jobsRes.data as ScanJob[]);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedNiche = NICHE_OPTIONS.find((item) => item.id === selectedNicheId) ?? NICHE_OPTIONS[0];
  const searchKeyword = selectedNicheId === "custom" ? customNiche.trim() : subNiche.trim();
  const locationCheck = validateLocation(location);

  const togglePlatform = (p: Platform) => {
    const platform = PLATFORMS.find((item) => item.id === p);
    if (!platform?.supported) {
      toast({ title: `${platform?.label ?? p} is disabled`, description: platform?.note, variant: "destructive" });
      return;
    }

    const supported = p as SupportedPlatform;
    setSelectedPlatforms((prev) =>
      prev.includes(supported) ? prev.filter((x) => x !== supported) : [...prev, supported],
    );
  };

  const runScan = async (override?: {
    niche?: string;
    location?: string | null;
    platforms?: string[];
    mode?: "fresh" | "rescan";
    jobId?: string;
    engagementTarget?: EngagementTarget;
  }) => {
    const scanNiche = (override?.niche ?? searchKeyword).trim();
    const scanLocationRaw = (override?.location ?? location) ?? "";
    const scanLocation = validateLocation(scanLocationRaw);
    const scanPlatforms = (override?.platforms ?? selectedPlatforms).filter(
      (p): p is SupportedPlatform => p === "meta" || p === "tiktok",
    );

    if (!scanNiche || scanPlatforms.length === 0) {
      toast({ title: "Keyword and at least one supported platform required", variant: "destructive" });
      return;
    }
    if (!scanLocation.valid) {
      toast({ title: "Fix the location first", description: scanLocation.message, variant: "destructive" });
      return;
    }

    setScanning(true);
    setScanningJobId(override?.jobId ?? null);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-social-ads", {
        body: {
          niche: scanNiche,
          location: scanLocation.normalized,
          platforms: scanPlatforms,
          limit: override?.mode === "rescan" ? Math.max(Number(limit), 50) : Number(limit),
          mode: override?.mode ?? "fresh",
          engagement_target: override?.engagementTarget ?? engagementTarget,
        },
      });
      if (error) throw error;

      const duplicates = data?.platform_results?._duplicates_skipped ?? 0;
      const platformSummary = Object.entries(data?.platform_results ?? {})
        .filter(([platform]) => !platform.startsWith("_"))
        .map(([platform, result]) => {
          const scanResult = result as PlatformScanResult;
          return `${platform}: ${scanResult.count}${scanResult.error ? " ⚠" : ""}`;
        })
        .join(" · ");

      toast({
        title: `${override?.mode === "rescan" ? "Rescan" : "Scan"} complete — ${data?.ads_found ?? 0} new ads`,
        description: `${platformSummary}${duplicates ? ` · ${duplicates} duplicates skipped` : ""}`,
      });
      await loadData();
    } catch (e: unknown) {
      toast({
        title: "Scan failed",
        description: getErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setScanning(false);
      setScanningJobId(null);
    }
  };

  const checkApify = async () => {
    setApiStatus("Checking…");
    try {
      const { data, error } = await supabase.functions.invoke("scrape-social-ads", { body: { verify: true } });
      if (error) throw error;
      setApiStatus(data?.ok ? `Connected as ${data.username}` : data?.error ?? "Not connected");
      toast({ title: data?.ok ? "Apify API is working" : "Apify check failed", description: data?.username ?? data?.error });
    } catch (e: unknown) {
      setApiStatus(getErrorMessage(e));
      toast({ title: "Apify check failed", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  const generateComment = async (ad: ScrapedAd) => {
    setGeneratingFor(ad.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ad-comment", {
        body: { scraped_ad_id: ad.id },
      });
      if (error) throw error;
      setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, comment_template: data.comment } : a)));
      toast({ title: "Comment generated" });
    } catch (e: unknown) {
      toast({ title: "Generation failed", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setGeneratingFor(null);
    }
  };

  const convertToProspect = async (ad: ScrapedAd) => {
    try {
      const { data: existing } = await supabase
        .from("prospects")
        .select("id")
        .eq("website_url", ad.landing_url)
        .maybeSingle();

      let prospectId = existing?.id;
      if (!prospectId) {
        const { data: created, error } = await supabase
          .from("prospects")
          .insert({
            business_name: ad.advertiser_name,
            website_url: ad.landing_url,
            place_id: `ad_hijack_${ad.id}`,
            contact_method: "ad_hijack",
            notes: `Sourced from ${ad.platform} ad. Ad copy: ${(ad.ad_creative_text ?? "").slice(0, 200)}`,
            tags: ["ad_hijack", ad.platform],
            social_profiles: { [`${ad.platform}_ad_url`]: ad.source_ad_url ?? null },
          })
          .select("id")
          .single();
        if (error) throw error;
        prospectId = created.id;
      }
      await supabase
        .from("scraped_ads")
        .update({ prospect_id: prospectId, status: "converted" })
        .eq("id", ad.id);
      setAds((prev) =>
        prev.map((a) => (a.id === ad.id ? { ...a, prospect_id: prospectId!, status: "converted" } : a)),
      );
      toast({ title: "Converted to prospect", description: ad.advertiser_name });
    } catch (e: unknown) {
      toast({ title: "Convert failed", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const deleteAd = async (id: string) => {
    await supabase.from("scraped_ads").delete().eq("id", id);
    setAds((prev) => prev.filter((a) => a.id !== id));
  };

  const filteredAds = ads.filter((ad) => matchesAdsFilter(ad, adsFilter));
  const commentableCount = ads.filter(isCommentable).length;
  const contactFallbackCount = ads.filter(hasContactFallback).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Ad <span className="text-primary">Hijack</span> Engine
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Scrape active competitor ads, auto-generate personalized demo links, post smarter comments instead of paying for ads.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radar className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">New Scan</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Niche</label>
            <Select
              value={selectedNicheId}
              onValueChange={(value) => {
                setSelectedNicheId(value);
                const next = NICHE_OPTIONS.find((item) => item.id === value);
                if (next && value !== "custom") setSubNiche(next.keywords[0]);
              }}
            >
              <SelectTrigger className="h-9 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NICHE_OPTIONS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Sub-niche / keyword</label>
            {selectedNicheId === "custom" ? (
              <Input
                placeholder="Type exact keyword"
                value={customNiche}
                onChange={(e) => setCustomNiche(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            ) : (
              <Select value={subNiche} onValueChange={setSubNiche}>
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedNiche.keywords.map((keyword) => (
                    <SelectItem key={keyword} value={keyword}>
                      {keyword}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">City, State</label>
            <Input
              list="verified-cities"
              placeholder="Fort Lauderdale, FL"
              value={location}
              onBlur={() => locationCheck.valid && setLocation(locationCheck.normalized)}
              onChange={(e) => setLocation(e.target.value)}
              className={`h-9 text-xs mt-1 ${location && !locationCheck.valid ? "border-destructive" : ""}`}
            />
            <datalist id="verified-cities">
              {VERIFIED_CITIES.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            <p className={`text-[10px] mt-1 ${locationCheck.valid ? "text-muted-foreground" : "text-destructive"}`}>
              {locationCheck.message}
            </p>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Result limit</label>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="h-9 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 ads</SelectItem>
                <SelectItem value="25">25 ads</SelectItem>
                <SelectItem value="50">50 ads</SelectItem>
                <SelectItem value="100">100 ads</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Engagement target</label>
            <Select value={engagementTarget} onValueChange={(value) => setEngagementTarget(value as EngagementTarget)}>
              <SelectTrigger className="h-9 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_with_contact">All + contact fallback</SelectItem>
                <SelectItem value="commentable_only">Public/commentable only</SelectItem>
                <SelectItem value="all">All ads only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Platforms</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  disabled={!p.supported}
                  title={p.note}
                  className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                    selectedPlatforms.includes(p.id as SupportedPlatform)
                      ? "bg-primary text-primary-foreground border-primary"
                      : p.supported
                        ? "border-border text-muted-foreground hover:bg-muted/50"
                        : "border-border text-muted-foreground/40 cursor-not-allowed"
                  }`}
                >
                  {p.label} {!p.supported && <span className="opacity-70">soon</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">
              Use Public/commentable only for direct FB/IG comment threads. Use All + contact fallback to find a website contact page for dark posts.
            </p>
            {apiStatus && <p className="text-[10px] text-primary">Apify status: {apiStatus}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={checkApify} disabled={scanning} size="sm" variant="outline">
              <ShieldCheck className="h-3 w-3" /> Check Apify
            </Button>
            <Button onClick={() => runScan()} disabled={scanning || !locationCheck.valid} size="sm">
              {scanning && !scanningJobId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Radar className="h-3 w-3" />}
              {scanning && !scanningJobId ? "Scanning…" : "Run Scan"}
            </Button>
          </div>
        </div>
      </Card>

      {jobs.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-bold mb-2">Recent Scans</h2>
          <div className="space-y-1">
            {jobs.slice(0, 5).map((j) => (
              <div
                key={j.id}
                className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between text-[11px] py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={j.status === "completed" ? "default" : j.status === "failed" ? "destructive" : "secondary"} className="text-[9px]">
                    {j.status}
                  </Badge>
                  <span className="font-medium">{j.niche}</span>
                  {j.location && <span className="text-muted-foreground">· {j.location}</span>}
                  <span className="text-muted-foreground">· {j.platforms.join(", ")}</span>
                  {j.last_error && <span className="text-destructive">· {j.last_error.slice(0, 80)}</span>}
                </div>
                <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                  <span>{j.ads_found} new ads</span>
                  <span>${Number(j.total_cost_usd).toFixed(2)}</span>
                  <span>{new Date(j.created_at).toLocaleString()}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={scanning}
                    onClick={() => runScan({ niche: j.niche, location: j.location, platforms: j.platforms, mode: "rescan", jobId: j.id })}
                    className="h-7 text-[10px]"
                  >
                    {scanningJobId === j.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Rescan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-sm font-bold">
            Scraped Ads ({commentableOnly ? ads.filter(isCommentable).length : ads.length}
            {commentableOnly ? ` of ${ads.length}` : ""})
          </h2>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={commentableOnly}
              onChange={(e) => setCommentableOnly(e.target.checked)}
              className="accent-primary"
            />
            Show only commentable ads (with a real public post)
          </label>
        </div>
        {ads.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No ads scraped yet. Run your first scan above.</p>
        ) : (
          <div className="space-y-3">
            {(commentableOnly ? ads.filter(isCommentable) : ads).map((ad) => {
              const links = getAdLinks(ad);
              const platforms = getPublisherPlatforms(ad);
              const onFb = platforms.includes("facebook") || Boolean(links.fbPost || links.fbPage);
              const onIg = platforms.includes("instagram") || Boolean(links.igPost || links.igPage);
              const commentable = isCommentable(ad);

              const openWithComment = (url: string, label: string) => {
                if (ad.comment_template) navigator.clipboard.writeText(ad.comment_template);
                window.open(url, "_blank", "noopener,noreferrer");
                toast({
                  title: ad.comment_template ? "Comment copied — paste with Cmd/Ctrl+V" : `Opening ${label}`,
                  description: label,
                });
              };

              return (
              <div key={ad.id} className="border border-border rounded p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[9px]">{ad.platform}</Badge>
                      {onFb && <Badge variant="outline" className="text-[9px] border-blue-500/40 text-blue-400">FB</Badge>}
                      {onIg && <Badge variant="outline" className="text-[9px] border-pink-500/40 text-pink-400">IG</Badge>}
                      <span className="text-xs font-bold truncate">{ad.advertiser_name}</span>
                      <Badge variant={ad.status === "converted" ? "default" : "secondary"} className="text-[9px]">
                        {ad.status}
                      </Badge>
                      {commentable ? (
                        <Badge className="text-[9px] bg-primary/20 text-primary border-primary/40">Commentable</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-400" title="Dark post — no public thread to comment on. Use Open Page to comment on their latest organic post or DM them.">
                          Dark post · no public thread
                        </Badge>
                      )}
                    </div>
                    {ad.cta_text && <p className="text-[11px] mt-1 font-medium">{ad.cta_text}</p>}
                    {ad.ad_creative_text && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{ad.ad_creative_text}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <a href={ad.landing_url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="h-2.5 w-2.5" /> {safeHost(ad.landing_url)}
                      </a>
                    </div>
                  </div>
                  <button onClick={() => deleteAd(ad.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {!ad.prospect_id ? (
                    <Button size="sm" variant="outline" onClick={() => convertToProspect(ad)} className="h-7 text-[10px]">
                      <ArrowRight className="h-3 w-3" /> Convert to Prospect
                    </Button>
                  ) : (
                    <Badge className="text-[9px]">In CRM</Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => generateComment(ad)}
                    disabled={generatingFor === ad.id} className="h-7 text-[10px]">
                    {generatingFor === ad.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {ad.comment_template ? "Regenerate Comment" : "Generate Comment"}
                  </Button>
                </div>

                {ad.comment_template && (
                  <div className="bg-muted/30 rounded p-2 mt-2">
                    <p className="text-[11px] whitespace-pre-wrap break-all">{ad.comment_template}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      <Button size="sm" variant="ghost" onClick={() => copyText(ad.comment_template!)} className="h-6 text-[10px]">
                        <Copy className="h-3 w-3" /> Copy comment
                      </Button>
                      {links.fbPost && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-blue-400"
                          onClick={() => openWithComment(links.fbPost!, "Facebook post — paste & comment")}>
                          <ExternalLink className="h-3 w-3" /> Copy + Open FB post
                        </Button>
                      )}
                      {links.igPost && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-pink-400"
                          onClick={() => openWithComment(links.igPost!, "Instagram post — paste & comment")}>
                          <ExternalLink className="h-3 w-3" /> Copy + Open IG post
                        </Button>
                      )}
                      {!commentable && links.fbPage && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-blue-400"
                          onClick={() => openWithComment(links.fbPage!, "FB Page — comment on their latest organic post")}>
                          <ExternalLink className="h-3 w-3" /> Open FB Page
                        </Button>
                      )}
                      {!commentable && links.igPage && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-pink-400"
                          onClick={() => openWithComment(links.igPage!, "IG profile — DM or comment on latest post")}>
                          <ExternalLink className="h-3 w-3" /> Open IG Profile
                        </Button>
                      )}
                      {links.library && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground"
                          onClick={() => openWithComment(links.library!, "Meta Ad Library (reference only — no comments)")}>
                          <ExternalLink className="h-3 w-3" /> Ad Library
                        </Button>
                      )}
                    </div>
                    {!commentable && (
                      <p className="text-[10px] text-amber-400/80 mt-2">
                        This ad has no public post thread (a "dark post"). Open the FB Page or IG profile and comment on their most recent organic post, or send a DM.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );})}
          </div>
        )}
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">
        ⚠ Comments are copy-paste only. Never automate posting — it violates platform TOS and risks account bans.
      </p>
    </div>
  );
}
