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
  Check,
  X,
  Globe,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Platform = "meta" | "tiktok" | "linkedin" | "google";
type SupportedPlatform = "meta" | "tiktok";
type EngagementTarget = "all" | "commentable_only" | "all_with_contact";
type AdsFilter =
  | "all" | "commentable" | "contact_fallback" | "dark"
  | "pending" | "approved" | "rejected"
  | "winners" | "scaling" | "video" | "affiliate"
  | "ig_only" | "fb_only" | "tiktok_only";
type Country = "US" | "CA" | "GB" | "AU";

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
  approval_status: string | null;
  engagement_status: string | null;
  detected_language: string | null;
  ad_country: string | null;
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
  countries?: string[] | null;
  languages?: string[] | null;
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
    id: "ai-tech",
    label: "AI / Tech (hot)",
    keywords: [
      "ai agent",
      "ai voice agent",
      "ai chatbot",
      "ai video generator",
      "ai film",
      "ai marketing tool",
      "ai sales tool",
      "ai automation software",
      "ai news",
      "ai course",
    ],
  },
  {
    id: "skincare-beauty",
    label: "Skincare & Beauty (nationwide)",
    keywords: ["skincare", "anti-aging serum", "retinol cream", "korean skincare", "vitamin c serum", "wrinkle cream", "beauty subscription"],
  },
  {
    id: "supplements",
    label: "Supplements & Health (nationwide)",
    keywords: ["weight loss supplement", "collagen", "greens powder", "pre workout", "testosterone booster", "sleep supplement", "gut health"],
  },
  {
    id: "ecommerce-dtc",
    label: "DTC E-commerce (nationwide)",
    keywords: ["smart watch", "led mask", "posture corrector", "scalp massager", "home gym", "pet supplement", "ergonomic chair"],
  },
  {
    id: "coaching-courses",
    label: "Coaching & Online Courses",
    keywords: ["business coach", "online course", "trading course", "real estate course", "fitness coach", "life coach", "marketing mastermind"],
  },
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

const COUNTRY_OPTIONS: { code: Country; label: string; flag: string }[] = [
  { code: "US", label: "United States", flag: "🇺🇸" },
  { code: "CA", label: "Canada", flag: "🇨🇦" },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", label: "Australia", flag: "🇦🇺" },
];

const validateLocation = (value: string): { valid: boolean; message: string; normalized: string } => {
  const trimmed = value.trim();
  if (!trimmed) return { valid: true, message: "Leave blank for nationwide search across selected countries.", normalized: "" };

  const match = trimmed.match(/^([a-zA-Z .'-]{2,60}),\s*([a-zA-Z]{2})$/);
  if (!match) {
    return { valid: false, message: "Use City, ST format (e.g. Fort Lauderdale, FL) or leave blank for nationwide.", normalized: trimmed };
  }

  const normalized = formatLocation(`${match[1]}, ${match[2]}`);
  const state = match[2].toUpperCase();
  if (!US_STATES.has(state)) return { valid: false, message: "Use a valid 2-letter US state, or leave blank for nationwide.", normalized };

  const verified = VERIFIED_CITIES.some((city) => city.toLowerCase() === normalized.toLowerCase());
  return {
    valid: true,
    message: verified ? "Verified city format." : "Valid city/state format.",
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

const renderLinkedText = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s<>'"]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={`${part}-${index}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 break-all"
      >
        {part}
      </a>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
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
  tiktokPost: metaStr(ad, "tiktok_post_url") || (ad.platform === "tiktok" ? ad.source_ad_url ?? undefined : undefined),
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

const getDaysRunning = (ad: ScrapedAd): number | null => {
  const v = ad.metadata?.days_running;
  return typeof v === "number" ? v : null;
};
const getVariantCount = (ad: ScrapedAd): number => {
  const v = ad.metadata?.variant_count;
  return typeof v === "number" && v > 0 ? v : 1;
};
const getMediaType = (ad: ScrapedAd): string => String(ad.metadata?.media_type ?? "unknown");
const getIsActive = (ad: ScrapedAd): boolean => ad.metadata?.is_active !== false;
const getIsAffiliate = (ad: ScrapedAd): boolean => ad.metadata?.is_affiliate === true;

const matchesAdsFilter = (ad: ScrapedAd, filter: AdsFilter): boolean => {
  if (filter === "commentable") return isCommentable(ad);
  if (filter === "contact_fallback") return hasContactFallback(ad);
  if (filter === "dark") return !isCommentable(ad);
  if (filter === "pending") return (ad.approval_status ?? "pending") === "pending";
  if (filter === "approved") return ad.approval_status === "approved";
  if (filter === "rejected") return ad.approval_status === "rejected";
  if (filter === "winners") return getIsActive(ad) && (getDaysRunning(ad) ?? 0) >= 60;
  if (filter === "scaling") return getVariantCount(ad) >= 10;
  if (filter === "video") return getMediaType(ad) === "video";
  if (filter === "affiliate") return getIsAffiliate(ad);
  if (filter === "ig_only") {
    const p = getPublisherPlatforms(ad);
    const l = getAdLinks(ad);
    return Boolean(l.igPost) || (p.includes("instagram") && !p.includes("facebook"));
  }
  if (filter === "fb_only") {
    const p = getPublisherPlatforms(ad);
    const l = getAdLinks(ad);
    return Boolean(l.fbPost) || (p.includes("facebook") && !p.includes("instagram"));
  }
  if (filter === "tiktok_only") return ad.platform === "tiktok";
  return true;
};

export default function AdHijack() {
  const { toast } = useToast();
  const [selectedNicheId, setSelectedNicheId] = useState("ai-tech");
  const [subNiche, setSubNiche] = useState("ai agent");
  const [customNiche, setCustomNiche] = useState("");
  const [location, setLocation] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<Country[]>(["US", "CA", "GB", "AU"]);
  const [englishOnly, setEnglishOnly] = useState(true);
  const [limit, setLimit] = useState("25");
  const [selectedPlatforms, setSelectedPlatforms] = useState<SupportedPlatform[]>(["meta", "tiktok"]);
  const [scanning, setScanning] = useState(false);
  const [scanningJobId, setScanningJobId] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [ads, setAds] = useState<ScrapedAd[]>([]);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [engagementTarget, setEngagementTarget] = useState<EngagementTarget>("all_with_contact");
  const [adsFilter, setAdsFilter] = useState<AdsFilter>("pending");
  const [editingComment, setEditingComment] = useState<Record<string, string>>({});
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());

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
    countries?: string[];
    languages?: string[];
    mode?: "fresh" | "rescan";
    jobId?: string;
    engagementTarget?: EngagementTarget;
  }) => {
    const isAllSubniches =
      !override?.niche && selectedNicheId !== "custom" && subNiche === "__all__";
    const scanNiche = (override?.niche ?? (isAllSubniches ? selectedNiche.keywords[0] : searchKeyword)).trim();
    const scanLocationRaw = (override?.location ?? location) ?? "";
    const scanLocation = validateLocation(scanLocationRaw);
    const scanPlatforms = (override?.platforms ?? selectedPlatforms).filter(
      (p): p is SupportedPlatform => p === "meta" || p === "tiktok",
    );
    const scanCountries = (override?.countries ?? selectedCountries).filter((c): c is Country =>
      ["US", "CA", "GB", "AU"].includes(c),
    );
    const scanLanguages = override?.languages ?? (englishOnly ? ["en"] : ["en", "other"]);

    if (!scanNiche || scanPlatforms.length === 0) {
      toast({ title: "Keyword and at least one supported platform required", variant: "destructive" });
      return;
    }
    if (scanCountries.length === 0) {
      toast({ title: "Pick at least one country", variant: "destructive" });
      return;
    }
    if (!scanLocation.valid) {
      toast({ title: "Fix the city or leave blank", description: scanLocation.message, variant: "destructive" });
      return;
    }

    setScanning(true);
    setScanningJobId(override?.jobId ?? null);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-social-ads", {
        body: {
          niche: scanNiche,
          location: scanLocation.normalized,
          countries: scanCountries,
          languages: scanLanguages,
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

  const setApproval = async (id: string, status: "approved" | "rejected" | "pending") => {
    const { error } = await supabase.from("scraped_ads").update({ approval_status: status }).eq("id", id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, approval_status: status } : a)));
  };

  const bulkApprovePending = async () => {
    const ids = filteredAds.filter((a) => (a.approval_status ?? "pending") === "pending").map((a) => a.id);
    if (ids.length === 0) { toast({ title: "No pending ads in view" }); return; }
    const { error } = await supabase.from("scraped_ads").update({ approval_status: "approved" }).in("id", ids);
    if (error) { toast({ title: "Bulk approve failed", description: error.message, variant: "destructive" }); return; }
    setAds((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, approval_status: "approved" } : a)));
    toast({ title: `Approved ${ids.length} ads` });
  };

  const saveCommentEdit = async (id: string) => {
    const text = editingComment[id];
    if (text === undefined) return;
    const { error } = await supabase.from("scraped_ads").update({ comment_template: text }).eq("id", id);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, comment_template: text } : a)));
    setEditingComment((prev) => { const n = { ...prev }; delete n[id]; return n; });
    toast({ title: "Comment saved" });
  };

  const toggleSelect = (id: string) => {
    setSelectedAdIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedAdIds((prev) => {
      const next = new Set(prev);
      filteredAds.forEach((a) => next.add(a.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedAdIds(new Set());

  const bulkOpenSelected = async (mode: "post" | "contact") => {
    const targets = ads.filter((a) => selectedAdIds.has(a.id));
    if (targets.length === 0) { toast({ title: "Nothing selected" }); return; }
    // Build a single joined comment block for paste-into-many workflow
    const comments = targets.map((a) => a.comment_template).filter(Boolean);
    if (comments.length) navigator.clipboard.writeText(comments[0] ?? "");
    let opened = 0;
    for (const ad of targets) {
      const links = getAdLinks(ad);
      const url = mode === "post"
        ? (links.tiktokPost || links.igPost || links.fbPost || links.igPage || links.fbPage)
        : (links.contactPage || links.fbPage);
      if (!url) continue;
      window.open(url, "_blank", "noopener,noreferrer");
      opened += 1;
      await new Promise((r) => setTimeout(r, 250)); // pop-up blocker friendliness
    }
    toast({
      title: `Opened ${opened} tabs`,
      description: comments.length ? "First comment copied. Use Cmd/Ctrl+V in each tab." : "No comments generated yet — generate first.",
    });
  };

  const filteredAds = ads.filter((ad) => matchesAdsFilter(ad, adsFilter));
  const commentableCount = ads.filter(isCommentable).length;
  const contactFallbackCount = ads.filter(hasContactFallback).length;
  const pendingCount = ads.filter((a) => (a.approval_status ?? "pending") === "pending").length;
  const approvedCount = ads.filter((a) => a.approval_status === "approved").length;
  const winnersCount = ads.filter((a) => getIsActive(a) && (getDaysRunning(a) ?? 0) >= 60).length;
  const scalingCount = ads.filter((a) => getVariantCount(a) >= 10).length;
  const videoCount = ads.filter((a) => getMediaType(a) === "video").length;
  const affiliateCount = ads.filter(getIsAffiliate).length;
  const igOnlyCount = ads.filter((a) => matchesAdsFilter(a, "ig_only")).length;
  const fbOnlyCount = ads.filter((a) => matchesAdsFilter(a, "fb_only")).length;
  const tiktokOnlyCount = ads.filter((a) => a.platform === "tiktok").length;

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
                  <SelectItem value="__all__">⭐ All sub-niches ({selectedNiche.keywords.length})</SelectItem>
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
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">City, State (optional)</label>
            <Input
              list="verified-cities"
              placeholder="Leave blank for nationwide"
              value={location}
              onBlur={() => locationCheck.valid && setLocation(locationCheck.normalized)}
              onChange={(e) => setLocation(e.target.value)}
              className={`h-9 text-xs mt-1 ${location && !locationCheck.valid ? "border-destructive" : ""}`}
            />
            <datalist id="verified-cities">
              {VERIFIED_CITIES.map((city) => (<option key={city} value={city} />))}
            </datalist>
            <p className={`text-[10px] mt-1 ${locationCheck.valid ? "text-muted-foreground" : "text-destructive"}`}>
              {locationCheck.message}
            </p>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Countries (English markets)</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {COUNTRY_OPTIONS.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedCountries((prev) => prev.includes(c.code) ? prev.filter((x) => x !== c.code) : [...prev, c.code])}
                  className={`px-2 py-1 rounded text-[11px] border transition-colors ${selectedCountries.includes(c.code) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted/50"}`}
                >
                  {c.flag} {c.code}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={englishOnly} onChange={(e) => setEnglishOnly(e.target.checked)} className="h-3 w-3" />
              English ads only (skip Korean, Chinese, Arabic, etc.)
            </label>
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
                  {typeof j.platform_results?._engagement_target === "string" && (
                    <Badge variant="outline" className="text-[9px]">
                      {String(j.platform_results._engagement_target).replace(/_/g, " ")}
                    </Badge>
                  )}
                  <span>${Number(j.total_cost_usd).toFixed(2)}</span>
                  <span>{new Date(j.created_at).toLocaleString()}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={scanning}
                    onClick={() => runScan({ niche: j.niche, location: j.location, platforms: j.platforms, countries: (j.countries as string[] | undefined) ?? selectedCountries, languages: (j.languages as string[] | undefined) ?? (englishOnly ? ["en"] : ["en","other"]), mode: "rescan", jobId: j.id, engagementTarget })}
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
            Scraped Ads ({filteredAds.length}{adsFilter !== "all" ? ` of ${ads.length}` : ""})
          </h2>
          <Select value={adsFilter} onValueChange={(value) => setAdsFilter(value as AdsFilter)}>
            <SelectTrigger className="h-8 w-[260px] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ads ({ads.length})</SelectItem>
              <SelectItem value="pending">⏳ Pending review ({pendingCount})</SelectItem>
              <SelectItem value="approved">✅ Approved ({approvedCount})</SelectItem>
              <SelectItem value="rejected">❌ Rejected</SelectItem>
              <SelectItem value="ig_only">📸 Instagram only — easy comments ({igOnlyCount})</SelectItem>
              <SelectItem value="tiktok_only">🎵 TikTok only — easiest ({tiktokOnlyCount})</SelectItem>
              <SelectItem value="fb_only">📘 Facebook only — hardest ({fbOnlyCount})</SelectItem>
              <SelectItem value="winners">🔥 Winners — 60d+ active ({winnersCount})</SelectItem>
              <SelectItem value="scaling">📈 Scaling hard — 10+ variants ({scalingCount})</SelectItem>
              <SelectItem value="video">🎬 Video ads ({videoCount})</SelectItem>
              <SelectItem value="affiliate">💰 Has affiliate link ({affiliateCount})</SelectItem>
              <SelectItem value="commentable">Public/commentable ({commentableCount})</SelectItem>
              <SelectItem value="contact_fallback">Website contact fallback ({contactFallbackCount})</SelectItem>
              <SelectItem value="dark">Dark posts / no thread ({ads.length - commentableCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk action toolbar */}
        <div className="flex items-center gap-2 flex-wrap mb-3 p-2 bg-muted/20 rounded text-[10px]">
          <span className="text-muted-foreground">
            {selectedAdIds.size > 0 ? `${selectedAdIds.size} selected` : "Select ads to bulk-act:"}
          </span>
          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={selectAllFiltered}>
            Select all in view
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={clearSelection} disabled={selectedAdIds.size === 0}>
            Clear
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={bulkApprovePending}>
            <Check className="h-3 w-3" /> Bulk approve pending in view
          </Button>
          <div className="w-px h-4 bg-border" />
          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => bulkOpenSelected("post")} disabled={selectedAdIds.size === 0}>
            <ExternalLink className="h-3 w-3" /> Copy + open all selected POSTS
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => bulkOpenSelected("contact")} disabled={selectedAdIds.size === 0}>
            <ExternalLink className="h-3 w-3" /> Copy + open all selected CONTACT pages
          </Button>
        </div>

        {ads.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No ads scraped yet. Run your first scan above.</p>
        ) : (
          <div className="space-y-3">
            {filteredAds.map((ad) => {
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

              const daysRun = getDaysRunning(ad);
              const variants = getVariantCount(ad);
              const mediaType = getMediaType(ad);
              const active = getIsActive(ad);
              const affiliate = getIsAffiliate(ad);
              const approval = ad.approval_status ?? "pending";
              const checked = selectedAdIds.has(ad.id);
              const daysColor = daysRun == null ? "border-border text-muted-foreground"
                : daysRun >= 90 ? "border-orange-500/60 text-orange-400"
                : daysRun >= 60 ? "border-emerald-500/60 text-emerald-400"
                : daysRun >= 14 ? "border-amber-500/60 text-amber-400"
                : "border-red-500/60 text-red-400";

              return (
              <div key={ad.id} className={`border rounded p-3 space-y-2 ${checked ? "border-primary" : "border-border"}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={checked} onChange={() => toggleSelect(ad.id)} className="mt-1 h-3.5 w-3.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[9px]">{ad.platform}</Badge>
                      {onFb && <Badge variant="outline" className="text-[9px] border-blue-500/40 text-blue-400">FB</Badge>}
                      {onIg && <Badge variant="outline" className="text-[9px] border-pink-500/40 text-pink-400">IG</Badge>}
                      <span className="text-xs font-bold truncate">{ad.advertiser_name}</span>

                      {/* Approval badge */}
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${approval === "approved" ? "border-emerald-500/60 text-emerald-400" : approval === "rejected" ? "border-red-500/60 text-red-400" : "border-amber-500/60 text-amber-400"}`}
                      >
                        {approval === "approved" ? "✅ approved" : approval === "rejected" ? "❌ rejected" : "⏳ pending"}
                      </Badge>

                      {/* Performance signals */}
                      {daysRun != null && (
                        <Badge variant="outline" className={`text-[9px] ${daysColor}`} title={`Ad started ~${daysRun}d ago`}>
                          {daysRun >= 90 ? "🔥 " : ""}{daysRun}d {active ? "active" : "ended"}
                        </Badge>
                      )}
                      {variants >= 2 && (
                        <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400" title="Variants of this same advertiser in this scan">
                          {variants}× variants
                        </Badge>
                      )}
                      {mediaType !== "unknown" && (
                        <Badge variant="outline" className="text-[9px] border-purple-500/40 text-purple-400">
                          {mediaType}
                        </Badge>
                      )}
                      {affiliate && (
                        <Badge variant="outline" className="text-[9px] border-yellow-500/40 text-yellow-400" title="Landing URL contains affiliate tracking">
                          💰 affiliate
                        </Badge>
                      )}

                      {commentable ? (
                        <Badge className="text-[9px] bg-primary/20 text-primary border-primary/40">Commentable</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-400" title="Dark post — no public thread.">
                          Dark post
                        </Badge>
                      )}
                      {!commentable && links.contactPage && (
                        <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">
                          Contact page
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
                  <div className="flex items-center gap-1">
                    {approval !== "approved" && (
                      <button onClick={() => setApproval(ad.id, "approved")} title="Approve"
                        className="text-emerald-400 hover:text-emerald-300"><Check className="h-3.5 w-3.5" /></button>
                    )}
                    {approval !== "rejected" && (
                      <button onClick={() => setApproval(ad.id, "rejected")} title="Reject"
                        className="text-amber-400 hover:text-amber-300"><X className="h-3.5 w-3.5" /></button>
                    )}
                    <button onClick={() => deleteAd(ad.id)} title="Delete"
                      className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
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
                    <p className="text-[11px] whitespace-pre-wrap break-words">{renderLinkedText(ad.comment_template)}</p>
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
                      {links.contactPage && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary"
                          onClick={() => openWithComment(links.contactPage!, "Contact page — paste into their form")}> 
                          <ExternalLink className="h-3 w-3" /> Copy + Open Contact Page
                        </Button>
                      )}
                    </div>
                    {!commentable && (
                      <p className="text-[10px] text-amber-400/80 mt-2">
                        This ad has no public post thread (a "dark post"). Use the contact page fallback when available, or open their FB/IG profile for a manual DM/latest-post comment.
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
