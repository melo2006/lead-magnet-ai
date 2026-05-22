/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Platform = "meta" | "tiktok";

type ScanMode = "fresh" | "rescan";
type EngagementTarget = "all" | "commentable_only" | "all_with_contact";

interface ScanQualityFilters {
  minTikTokActiveDays: number;
  minTikTokAudience: number;
  requireBusinessWebsite: boolean;
}

interface ScrapedAd {
  platform: Platform;
  ad_id?: string;
  advertiser_name: string;
  advertiser_handle?: string;
  landing_url: string;
  cta_text?: string;
  ad_creative_text?: string;
  ad_media_url?: string;
  posted_at?: string;
  source_ad_url?: string;
  metadata?: Record<string, unknown>;
}

// --- APIFY HELPERS ---
async function verifyApifyToken(token: string): Promise<{ ok: boolean; username?: string; error?: string }> {
  try {
    const res = await fetch(`https://api.apify.com/v2/users/me?token=${token}`);
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
    }
    const json = await res.json();
    return { ok: true, username: json?.data?.username };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

async function runApifyActor(
  token: string,
  actorId: string,
  input: Record<string, unknown>,
  timeoutSec = 180,
): Promise<unknown[]> {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSec}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Apify ${actorId}: ${res.status} ${t.slice(0, 400)}`);
  }
  return await res.json();
}

// --- META (Facebook + Instagram) via apify/facebook-ads-scraper ---
const SUPPORTED_COUNTRIES = ["US", "CA", "GB", "AU"] as const;

function buildFbAdLibrarySearchUrl(niche: string, countryCode: string): string {
  const params = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country: countryCode,
    q: niche,
    search_type: "keyword_unordered",
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

// Detect non-English ads by checking for CJK / Korean / Arabic / Cyrillic / Thai / Hebrew blocks.
const NON_ENGLISH_REGEX = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0E00-\u0E7F\u1100-\u11FF\u3040-\u30FF\u3130-\u318F\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/;
function detectLanguage(text: string | undefined): { isEnglish: boolean; language: string } {
  if (!text || text.trim().length < 4) return { isEnglish: true, language: "unknown" };
  if (!NON_ENGLISH_REGEX.test(text)) return { isEnglish: true, language: "en" };
  if (/[\u3040-\u30FF]/.test(text)) return { isEnglish: false, language: "ja" };
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return { isEnglish: false, language: "ko" };
  if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(text)) return { isEnglish: false, language: "zh" };
  if (/[\u0600-\u06FF]/.test(text)) return { isEnglish: false, language: "ar" };
  if (/[\u0590-\u05FF]/.test(text)) return { isEnglish: false, language: "he" };
  if (/[\u0400-\u04FF]/.test(text)) return { isEnglish: false, language: "ru" };
  if (/[\u0E00-\u0E7F]/.test(text)) return { isEnglish: false, language: "th" };
  return { isEnglish: false, language: "other" };
}

function cleanUrl(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = cleanUrl(item);
      if (url) return url;
    }
    return undefined;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const preferredKeys = ["url", "play_url", "download_url", "1080p", "720p", "540p", "480p", "360p", "hd", "sd"];
    for (const key of preferredKeys) {
      const url = cleanUrl(obj[key]);
      if (url) return url;
    }
    for (const nested of Object.values(obj).slice(0, 12)) {
      const url = cleanUrl(nested);
      if (url) return url;
    }
    return undefined;
  }
  if (!value) return undefined;
  const raw = String(value).trim();
  if (!raw || raw === "null" || raw === "undefined") return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.includes(".") && !raw.includes(" ")) return `https://${raw}`;
  return undefined;
}

function getOrigin(value: string | undefined): string | undefined {
  try {
    if (!value) return undefined;
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

function absolutizeUrl(href: string, base: string): string | undefined {
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
}

function isLikelyContactUrl(url: string): boolean {
  return /\/(contact|contact-us|book|booking|appointment|appointments|consultation|request|quote|schedule)(\/|\?|#|$)/i.test(url);
}

function canDiscoverContactPage(landingUrl: string | undefined): boolean {
  if (!landingUrl) return false;
  try {
    const host = new URL(landingUrl).hostname.toLowerCase();
    return !/(^|\.)(facebook|fb|instagram|tiktok)\.com$/.test(host);
  } catch {
    return false;
  }
}

async function discoverContactPage(landingUrl: string, timeoutMs = 6500): Promise<string | undefined> {
  const origin = getOrigin(landingUrl);
  if (!origin) return undefined;

  const candidates = new Set<string>();
  const commonPaths = ["/contact", "/contact-us", "/book", "/booking", "/appointments", "/schedule", "/request-quote"];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(landingUrl, {
      headers: { "User-Agent": "Mozilla/5.0 AIHiddenLeadsBot/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const html = (await res.text()).slice(0, 180_000);
      const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;
      while ((match = anchorRegex.exec(html)) !== null) {
        const href = match[1];
        const label = match[2].replace(/<[^>]+>/g, " ");
        const absolute = absolutizeUrl(href, landingUrl);
        if (!absolute) continue;
        if (new URL(absolute).origin !== origin) continue;
        if (isLikelyContactUrl(absolute) || /contact|book|appointment|consultation|quote|schedule/i.test(label)) {
          candidates.add(absolute.split("#")[0]);
        }
      }
    }
  } catch (e) {
    console.log(`[contact-discovery] landing fetch skipped for ${landingUrl}: ${String((e as Error)?.message ?? e)}`);
  }

  commonPaths.forEach((path) => candidates.add(`${origin}${path}`));

  for (const url of Array.from(candidates).slice(0, 8)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0 AIHiddenLeadsBot/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok && /html|text/i.test(res.headers.get("content-type") ?? "")) return url;
    } catch {
      // Try the next likely contact URL.
    }
  }

  return undefined;
}

function firstValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const cleaned = String(value).replace(/[^0-9.]/g, "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function firstCleanUrl(...values: unknown[]): string | undefined {
  for (const value of values) {
    const url = cleanUrl(value);
    if (url) return url;
  }
  return undefined;
}

function pickLandingUrl(item: any): string | undefined {
  const s = item?.snapshot ?? {};
  const cards = Array.isArray(s.cards) ? s.cards : [];
  const link = firstValue(
    s.link_url, s.linkUrl, s.link, s.website_url, s.websiteUrl,
    cards[0]?.link_url, cards[0]?.linkUrl, cards[0]?.link,
    item.link_url, item.linkUrl, item.landingPageUrl, item.landing_page_url,
    item.adLandingPage, item.destinationUrl, item.url,
  );
  return cleanUrl(link);
}

function pickFbPostUrl(item: any): string | undefined {
  const s = item?.snapshot ?? {};
  const cards = Array.isArray(s.cards) ? s.cards : [];
  const url = cleanUrl(firstValue(
    s.page_post_url, s.pagePostUrl, s.post_url, s.postUrl,
    s.permalink_url, s.permalinkUrl,
    cards[0]?.page_post_url, cards[0]?.post_url,
    item.page_post_url, item.pagePostUrl, item.post_url, item.postUrl,
    item.permalink_url, item.permalinkUrl,
  ));
  if (!url) return undefined;
  return /facebook\.com|fb\.com|fb\.watch/i.test(url) ? url : undefined;
}

function pickIgPostUrl(item: any): string | undefined {
  const s = item?.snapshot ?? {};
  const cards = Array.isArray(s.cards) ? s.cards : [];
  const candidates = [
    s.instagram_url, s.instagramUrl, s.ig_post_url, s.igPostUrl,
    s.instagram_permalink, s.instagramPermalink,
    cards[0]?.instagram_url, cards[0]?.instagramUrl,
    item.instagram_url, item.instagramUrl, item.ig_post_url,
  ];
  for (const v of candidates) {
    const u = cleanUrl(v);
    if (u && /instagram\.com/i.test(u)) return u;
  }
  return undefined;
}

function pickFbPageUrl(item: any): string | undefined {
  const s = item?.snapshot ?? {};
  const direct = cleanUrl(firstValue(
    s.page_profile_uri, s.pageProfileUri, s.page_url, s.pageUrl,
    item.page_profile_uri, item.pageProfileUri, item.page_url, item.pageUrl,
  ));
  if (direct && /facebook\.com|fb\.com/i.test(direct)) return direct;
  const pageId = firstValue(s.page_id, s.pageId, item.page_id, item.pageId, item.pageID);
  if (pageId) return `https://www.facebook.com/${pageId}`;
  return undefined;
}

function pickIgPageUrl(item: any): string | undefined {
  const s = item?.snapshot ?? {};
  const handle = firstValue(
    s.instagram_handle, s.instagramHandle,
    s.instagram_actor_name, s.instagramActorName,
    item.instagram_handle, item.instagramHandle,
  );
  if (handle) {
    const clean = String(handle).replace(/^@/, "").trim();
    if (clean) return `https://www.instagram.com/${clean}`;
  }
  const direct = cleanUrl(firstValue(s.instagram_profile_url, s.instagramProfileUrl));
  return direct && /instagram\.com/i.test(direct) ? direct : undefined;
}

function inferPublisherPlatforms(item: any): string[] {
  const raw = item.publisher_platform || item.publisherPlatform ||
    item?.snapshot?.publisher_platform || item?.snapshot?.publisherPlatform || [];
  const arr = Array.isArray(raw) ? raw : [raw].filter(Boolean);
  return arr.map((p: unknown) => String(p).toLowerCase());
}

function inferMediaType(item: any): "video" | "carousel" | "image" | "dco" | "unknown" {
  const s = item?.snapshot ?? {};
  const cards = Array.isArray(s.cards) ? s.cards : [];
  if (Array.isArray(s.videos) && s.videos.length > 0) return "video";
  if (cards.length > 1) return "carousel";
  if (s.display_format === "dco" || item.display_format === "dco") return "dco";
  if (Array.isArray(s.images) && s.images.length > 0) return "image";
  if (cards.length === 1) return "image";
  return "unknown";
}

// Affiliate-link detection — regex for common affiliate network params and domains
const AFFILIATE_REGEX =
  /(\?|&)(aff_?id|affiliate|ref(_?id)?|partner(_?id)?|sub_?id|clickid|utm_aff)=|clickbank|digistore24|shareasale|impact\.com|partnerstack|rakuten|cj\.com|clkbank|warriorplus|jvzoo|skimresources|skimlinks|linksynergy/i;
function detectAffiliate(landingUrl: string | undefined): boolean {
  if (!landingUrl) return false;
  return AFFILIATE_REGEX.test(landingUrl);
}

function isBusinessWebsiteUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes(".")) return false;
    return !/(^|\.)(facebook|fb|instagram|tiktok|youtube|youtu|google|doubleclick|linktr|bit\.ly|tinyurl|snapchat|pinterest)\./i.test(host)
      && host !== "library.tiktok.com"
      && host !== "ads.tiktok.com"
      && !/tiktokcdn|byteoversea|ibyteimg|cloudfront|shopifycdn/i.test(host);
  } catch {
    return false;
  }
}

function getAdAudience(ad: ScrapedAd): number | null {
  const meta = ad.metadata ?? {};
  return numberValue(meta.estimated_audience, meta.target_audience_size, meta.likes, meta.views);
}

function passesTikTokQuality(ad: ScrapedAd, countries: string[], quality: ScanQualityFilters): boolean {
  const meta = ad.metadata ?? {};
  const region = String(meta.region ?? "").toUpperCase();
  const sourceChannel = String(meta.source_channel ?? "").toLowerCase();

  if (quality.requireBusinessWebsite && !isBusinessWebsiteUrl(ad.landing_url)) return false;
  if (quality.minTikTokActiveDays > 0 && ((typeof meta.days_running === "number" ? meta.days_running : null) ?? -1) < quality.minTikTokActiveDays) return false;

  if (quality.minTikTokAudience > 0) {
    const audience = getAdAudience(ad);
    if (audience === null || audience < quality.minTikTokAudience) return false;
  }

  if (region && region !== "ALL" && countries.length > 0 && !countries.includes(region)) return false;
  if (region === "ALL" && sourceChannel === "ad_library" && countries.includes("US")) return false;

  return true;
}

function computeDaysRunning(startMs: number | null, endMs: number | null): number | null {
  if (!startMs) return null;
  const end = endMs ?? Date.now();
  return Math.floor(Math.max(0, end - startMs) / 86400000);
}

function normalizeMetaAd(item: any): ScrapedAd | null {
  const s = item?.snapshot ?? {};
  const cards = Array.isArray(s.cards) ? s.cards : [];
  const adId = firstValue(item.ad_archive_id, item.adArchiveId, item.adArchiveID, item.id);
  const fbPostUrl = pickFbPostUrl(item);
  const igPostUrl = pickIgPostUrl(item);
  const fbPageUrl = pickFbPageUrl(item);
  const igPageUrl = pickIgPageUrl(item);
  const libraryUrl = cleanUrl(item.url) || (adId ? `https://www.facebook.com/ads/library/?id=${adId}` : undefined);
  const sourceUrl = fbPostUrl || igPostUrl || libraryUrl;
  const landingUrl = pickLandingUrl(item) || sourceUrl;
  const advertiser = firstValue(s.page_name, s.pageName, item.page_name, item.pageName, item.advertiserName);
  if (!landingUrl || !advertiser) return null;

  const startMs = item.start_date ? Number(item.start_date) * 1000
    : item.startDate ? Number(item.startDate) * 1000 : null;
  const endMs = item.end_date ? Number(item.end_date) * 1000
    : item.endDate ? Number(item.endDate) * 1000 : null;
  const startedAt = startMs ? new Date(startMs).toISOString()
    : firstValue(item.startDateFormatted, item.start_date_formatted);

  const isActive = (item.is_active ?? item.isActive ?? (item.end_date == null && item.endDate == null)) !== false;
  const daysRunning = computeDaysRunning(startMs, isActive ? null : endMs);
  const mediaType = inferMediaType(item);
  const publisherPlatforms = inferPublisherPlatforms(item);
  const isCommentable = Boolean(fbPostUrl || igPostUrl);
  const pageId = firstValue(s.page_id, s.pageId, item.page_id, item.pageId, item.pageID);
  const pageTotalAds = Number(
    s.page_like_count_active_ads ?? item.page_total_active_ads ?? item.pageTotalActiveAds ?? 0,
  ) || null;
  const isAffiliate = detectAffiliate(landingUrl);

  return {
    platform: "meta",
    ad_id: adId,
    advertiser_name: advertiser,
    advertiser_handle: pageId,
    landing_url: landingUrl,
    cta_text: firstValue(s.cta_text, s.ctaText, s.title, cards[0]?.cta_text, cards[0]?.ctaText, item.cta),
    ad_creative_text: firstValue(
      s.body?.text, s.bodyText, s.caption, s.title,
      s.link_description, s.linkDescription,
      cards[0]?.body, cards[0]?.bodyText, cards[0]?.title, item.text,
    ),
    ad_media_url: cleanUrl(firstValue(
      s.videos?.[0]?.video_preview_image_url, s.videos?.[0]?.videoPreviewImageUrl,
      s.images?.[0]?.original_image_url, s.images?.[0]?.originalImageUrl,
      cards[0]?.original_image_url, cards[0]?.originalImageUrl,
    )),
    posted_at: startedAt,
    source_ad_url: sourceUrl,
    metadata: {
      publisher_platforms: publisherPlatforms,
      fb_post_url: fbPostUrl,
      ig_post_url: igPostUrl,
      fb_page_url: fbPageUrl,
      ig_page_url: igPageUrl,
      post_url: fbPostUrl || igPostUrl,
      library_url: libraryUrl,
      is_commentable: isCommentable,
      page_id: pageId,
      days_running: daysRunning,
      is_active: isActive,
      end_date: endMs ? new Date(endMs).toISOString() : null,
      media_type: mediaType,
      card_count: cards.length,
      page_total_active_ads: pageTotalAds,
      is_affiliate: isAffiliate,
      source: "apify/facebook-ads-scraper",
    },
  };
}

async function scrapeMetaViaApify(
  token: string,
  niche: string,
  countries: string[],
  limit: number,
  engagementTarget: EngagementTarget,
  englishOnly: boolean,
): Promise<{ ads: ScrapedAd[]; rawSample: unknown }> {
  const safeCountries = countries.length ? countries : ["US"];
  const startUrls = safeCountries.map((cc) => ({ url: buildFbAdLibrarySearchUrl(niche, cc) }));
  // Over-scrape when we need to filter (commentable or non-English)
  const overscrapeFactor = engagementTarget === "commentable_only" ? 3 : englishOnly ? 1.6 : 1;
  const actorLimit = Math.min(Math.ceil(limit * overscrapeFactor), 200);
  console.log(`[meta] countries=${safeCountries.join(",")} actorLimit=${actorLimit} target=${engagementTarget} englishOnly=${englishOnly}`);
  const items = await runApifyActor(token, "apify~facebook-ads-scraper", {
    startUrls,
    resultsLimit: actorLimit,
    activeStatus: "active",
  });
  console.log(`[meta] raw items: ${items.length}`);
  if (items.length > 0) {
    console.log(`[meta] sample keys: ${Object.keys(items[0] as any).slice(0, 30).join(",")}`);
  }
  const normalized = items.map(normalizeMetaAd).filter((x): x is ScrapedAd => !!x);

  // Aggregate variant_count per page_id (signals "scaling hard" advertisers)
  const variantCounts = new Map<string, number>();
  for (const ad of normalized) {
    const pid = String(ad.metadata?.page_id ?? "");
    if (!pid) continue;
    variantCounts.set(pid, (variantCounts.get(pid) ?? 0) + 1);
  }

  // Annotate with detected language + country tag + variant count
  for (const ad of normalized) {
    const detection = detectLanguage(ad.ad_creative_text);
    const pid = String(ad.metadata?.page_id ?? "");
    ad.metadata = {
      ...(ad.metadata ?? {}),
      detected_language: detection.language,
      is_english: detection.isEnglish,
      variant_count: pid ? variantCounts.get(pid) ?? 1 : 1,
    };
  }

  let filtered = normalized;
  if (englishOnly) filtered = filtered.filter((ad) => ad.metadata?.is_english !== false);
  if (engagementTarget === "commentable_only") filtered = filtered.filter((ad) => ad.metadata?.is_commentable === true);

  const ads = filtered.slice(0, limit);
  console.log(`[meta] normalized: ${normalized.length} after-filter: ${filtered.length} kept: ${ads.length}`);
  return { ads, rawSample: items[0] ?? null };
}

// --- TIKTOK via aiscraperdev/tiktok-ads-library-scraper ---
function pickTikTokPostUrl(item: any): string | undefined {
  const candidates = [
    item.detailUrl, item.detail_url, item.previewUrl, item.preview_url,
    item.videoUrl, item.video_url, item.shareUrl, item.share_url,
    item.adUrl, item.ad_url, item.landing_page_url, item.landingPageUrl, item.url,
  ];
  for (const v of candidates) {
    const u = cleanUrl(v);
    if (u && /tiktok\.com/i.test(u)) return u;
  }
  return undefined;
}

const TIKTOK_QUERY_EXPANSIONS: Record<string, string[]> = {
  skincare: ["skincare", "skin care", "retinol cream", "vitamin c serum", "anti-aging serum", "beauty subscription"],
  "skin care": ["skin care", "skincare", "retinol cream", "vitamin c serum", "anti-aging serum", "beauty subscription"],
  collagen: ["collagen", "collagen peptides", "collagen powder", "skin supplement"],
  "weight loss supplement": ["weight loss supplement", "fat burner", "greens powder", "gut health", "metabolism supplement"],
};

function getTikTokSearchQueries(niche: string): string[] {
  const normalized = niche.trim().toLowerCase();
  const expanded = TIKTOK_QUERY_EXPANSIONS[normalized] ?? [niche];
  return Array.from(new Set([niche, ...expanded].map((q) => q.trim()).filter(Boolean))).slice(0, 6);
}

function normalizeTikTokAd(item: any): ScrapedAd | null {
  const adId = firstValue(item.id, item.ad_id, item.adId, item.materialId, item.adIdStr);
  const detailUrl = adId ? `https://library.tiktok.com/ads/detail/?ad_id=${adId}` : undefined;
  const landingUrlCandidate = firstCleanUrl(
    item.landingPageUrl,
    item.landing_page_url,
    item.landing_url,
    item.landingUrl,
    item.adUrl,
    item.ad_url,
    item.advertiserUrl,
    item.click_url,
    item.brandUrl,
    item.brand_url,
    typeof item.url === "string" ? item.url : undefined,
  );
  const tikTokPostUrl = pickTikTokPostUrl(item);
  const videoUrl = firstCleanUrl(
    item.videoUrl || item.video_url || item.videoUrl1080p || item.videoUrl720p ||
    item.video_url_1080p || item.video_url_720p || item.video_url_hd,
  );
  const coverUrl = firstCleanUrl(item.coverUrl, item.cover_url, item.cover_image_url, item.imageUrl);
  const advertiserName =
    item.advertiserName || item.advertiser_name || item.brandName || item.advertiser ||
    item.brand || item.author || item.nickname || "Unknown";

  // Permissive: keep if we have ANY usable signal.
  if (!landingUrlCandidate && !tikTokPostUrl && !detailUrl && !videoUrl && advertiserName === "Unknown") return null;

  const landingUrl = landingUrlCandidate || tikTokPostUrl || detailUrl || videoUrl || coverUrl || "";

  const startRaw =
    item.createdAt || item.startDate || item.first_seen || item.firstSeen ||
    item.firstShownDate || item.first_shown_date || item.adShowDate;
  const endRaw = item.lastShownDate || item.last_shown_date || item.endDate;
  const startMs = startRaw ? new Date(String(startRaw)).getTime() : NaN;
  const endMs = endRaw ? new Date(String(endRaw)).getTime() : NaN;
  const isActive = item.isActive ?? item.is_active ?? true;
  const daysRunning = computeDaysRunning(
    Number.isFinite(startMs) ? startMs : null,
    Number.isFinite(endMs) ? endMs : null,
  );
  const isAffiliate = detectAffiliate(landingUrl);

  return {
    platform: "tiktok",
    ad_id: adId || tikTokPostUrl || crypto.randomUUID(),
    advertiser_name: advertiserName,
    advertiser_handle: item.advertiserId || item.advertiser_id || item.brandId || item.uniqueId,
    landing_url: landingUrl,
    cta_text: item.cta || item.ctaText || item.cta_text || item.callToAction,
    ad_creative_text: item.title || item.description || item.adText || item.ad_text || item.text,
    ad_media_url: videoUrl || coverUrl,
    posted_at: startRaw ? String(startRaw) : undefined,
    source_ad_url: tikTokPostUrl,
    metadata: {
      publisher_platforms: ["tiktok"],
      tiktok_post_url: tikTokPostUrl,
      tiktok_detail_url: detailUrl,
      post_url: tikTokPostUrl,
      library_url: detailUrl,
      is_commentable: Boolean(tikTokPostUrl && /tiktok\.com\/@[^/]+\/video\//i.test(tikTokPostUrl)),
      days_running: daysRunning,
      is_active: isActive !== false,
      media_type: videoUrl ? "video" : "image",
      is_affiliate: isAffiliate,
      region: item.region || item.country,
      ctr_rank: item.ctrRank || item.ctr_rank,
      likes: item.likes || item.likeCount,
      source: "aiscraperdev/tiktok-ads-library-scraper",
      raw_keys: Object.keys(item).slice(0, 30),
    },
  };
}

async function scrapeTikTokViaApify(
  token: string,
  niche: string,
  _location: string,
  limit: number,
): Promise<ScrapedAd[]> {
  const searchQueries = getTikTokSearchQueries(niche);
  const actorLimit = limit;
  const items = await runApifyActor(token, "aiscraperdev~tiktok-ads-library-scraper", {
    searchQueries,
    source: "both",
    region: "US",
    adStatus: "active",
    adFormat: "all",
    dateRange: "last_90_days",
    maxResults: actorLimit,
    maxAds: actorLimit,
  });
  console.log(`[tiktok] queries=${searchQueries.join("|")} actorLimit=${actorLimit} raw items: ${items.length}`);
  if (items[0]) {
    console.log(`[tiktok] sample keys: ${Object.keys(items[0]).join(",")}`);
    console.log(`[tiktok] sample item: ${JSON.stringify(items[0]).slice(0, 800)}`);
  }
  const normalized = items.map(normalizeTikTokAd).filter((x): x is ScrapedAd => !!x);
  console.log(`[tiktok] normalized: ${normalized.length}`);
  return normalized.slice(0, limit);
}

function getStoredLandingUrl(ad: ScrapedAd): string {
  if (ad.platform !== "tiktok" || !ad.ad_id) return ad.landing_url;
  if (ad.landing_url.includes("src_ad_id=")) return ad.landing_url;
  return `${ad.landing_url}${ad.landing_url.includes("?") ? "&" : "?"}src_ad_id=${encodeURIComponent(ad.ad_id)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let jobId: string | null = null;

  try {
    const body = await req.json();
    const niche: string = String(body?.niche ?? "").trim();
    const location: string = String(body?.location ?? "").trim(); // optional now
    const requestedCountries: string[] = Array.isArray(body?.countries) && body.countries.length
      ? body.countries.map((c: unknown) => String(c).toUpperCase()).filter((c: string) => (SUPPORTED_COUNTRIES as readonly string[]).includes(c))
      : ["US"];
    const countries = requestedCountries.length ? requestedCountries : ["US"];
    const languages: string[] = Array.isArray(body?.languages) && body.languages.length
      ? body.languages.map((l: unknown) => String(l).toLowerCase())
      : ["en"];
    const englishOnly = languages.includes("en") && languages.length === 1;
    const requestedPlatforms: string[] = Array.isArray(body?.platforms) ? body.platforms : [];
    const platforms: Platform[] = requestedPlatforms.filter(
      (p): p is Platform => p === "meta" || p === "tiktok",
    );
    const limitPerPlatform: number = Math.min(Math.max(Number(body?.limit ?? 25), 1), 100);
    const verifyOnly: boolean = body?.verify === true;
    const mode: ScanMode = body?.mode === "rescan" ? "rescan" : "fresh";
    const requestedTarget = String(body?.engagement_target ?? "all_with_contact");
    const engagementTarget: EngagementTarget =
      requestedTarget === "commentable_only" || requestedTarget === "all" || requestedTarget === "all_with_contact"
        ? requestedTarget
        : "all_with_contact";

    const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");

    // Diagnostic: just verify the Apify token works
    if (verifyOnly) {
      if (!APIFY_TOKEN) {
        return new Response(
          JSON.stringify({ ok: false, error: "APIFY_API_TOKEN not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const v = await verifyApifyToken(APIFY_TOKEN);
      return new Response(JSON.stringify(v), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!niche || platforms.length === 0) {
      return new Response(
        JSON.stringify({
          error: "niche and platforms[] required (supported: 'meta', 'tiktok')",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!APIFY_TOKEN) {
      return new Response(
        JSON.stringify({ error: "APIFY_API_TOKEN not configured on the server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify token once up front — surface auth issues immediately
    const tokenCheck = await verifyApifyToken(APIFY_TOKEN);
    if (!tokenCheck.ok) {
      return new Response(
        JSON.stringify({ error: `Apify token invalid: ${tokenCheck.error}` }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create job
    const { data: job, error: jobErr } = await supabase
      .from("ad_scan_jobs")
      .insert({
        niche,
        location: location || null,
        platforms,
        countries,
        languages,
        result_limit: limitPerPlatform,
        status: "running",
      })
      .select()
      .single();
    if (jobErr) throw jobErr;
    jobId = job.id;

    const allAds: ScrapedAd[] = [];
    const platformResults: Record<string, { count: number; error?: string }> = {};
    let totalCost = 0;

    for (const platform of platforms) {
      try {
        let batch: ScrapedAd[] = [];
        if (platform === "meta") {
          const r = await scrapeMetaViaApify(APIFY_TOKEN, niche, countries, limitPerPlatform, engagementTarget, englishOnly);
          batch = r.ads;
          totalCost += (batch.length / 1000) * 3.4;
        } else if (platform === "tiktok") {
          batch = await scrapeTikTokViaApify(APIFY_TOKEN, niche, location, limitPerPlatform);
          totalCost += (batch.length / 1000) * 3.5;
        }
        platformResults[platform] = { count: batch.length };
        allAds.push(...batch);
      } catch (e: any) {
        console.error(`[scrape-social-ads] ${platform} failed:`, e?.message);
        platformResults[platform] = { count: 0, error: String(e?.message ?? e) };
      }
    }

    if (engagementTarget === "all_with_contact") {
      const darkAds = allAds.filter((ad) => ad.metadata?.is_commentable !== true && canDiscoverContactPage(ad.landing_url));
      let checked = 0;
      for (const ad of darkAds.slice(0, Math.min(darkAds.length, 20))) {
        const contactPageUrl = await discoverContactPage(ad.landing_url);
        checked += 1;
        ad.metadata = {
          ...(ad.metadata ?? {}),
          contact_page_url: contactPageUrl,
          has_contact_fallback: Boolean(contactPageUrl),
        };
      }
      platformResults._contact_fallbacks = {
        count: allAds.filter((ad) => Boolean(ad.metadata?.contact_page_url)).length,
        error: checked < darkAds.length ? `Checked ${checked} of ${darkAds.length} dark ads to keep scans fast` : undefined,
      };
    }

    // Save only new ads for rescans so the count reflects fresh finds, not old duplicates.
    let upsertedCount = 0;
    let duplicateCount = 0;
    const uniqueAds = Array.from(
      new Map(allAds.map((ad) => [`${ad.platform}::${ad.ad_id || ad.landing_url}`, ad])).values(),
    );
    duplicateCount += allAds.length - uniqueAds.length;

    if (uniqueAds.length > 0) {
      const storedLandingUrls = uniqueAds.map(getStoredLandingUrl);
      const { data: existingRows, error: existingErr } = await supabase
        .from("scraped_ads")
        .select("platform,landing_url")
        .in("landing_url", storedLandingUrls);
      if (existingErr) throw existingErr;
      const existingKeys = new Set((existingRows ?? []).map((r: any) => `${r.platform}::${r.landing_url}`));
      const rows = uniqueAds
        .filter((a) => !existingKeys.has(`${a.platform}::${getStoredLandingUrl(a)}`))
        .map((a) => {
          const meta = a.metadata ?? {};
          const isCommentable = meta.is_commentable === true;
          const hasContact = Boolean(meta.contact_page_url);
          const engagement_status = isCommentable ? "commentable" : hasContact ? "contact_form" : "dark_post";
          return {
            ...a,
            landing_url: getStoredLandingUrl(a),
            scan_job_id: jobId,
            approval_status: "pending",
            engagement_status,
            detected_language: typeof meta.detected_language === "string" ? meta.detected_language : null,
            ad_country: countries[0] ?? null,
            metadata: { ...meta, search_niche: niche, search_location: location, search_countries: countries, engagement_target: engagementTarget },
          };
        });
      duplicateCount += uniqueAds.length - rows.length;
      if (rows.length > 0) {
        const { data: inserted, error: insertErr } = await supabase.from("scraped_ads").insert(rows).select("id");
        if (insertErr) throw insertErr;
        upsertedCount = inserted?.length ?? 0;
      }
    }

    // Log usage
    await supabase.from("scraping_usage").insert({
      scan_type: "ad_hijack",
      niche,
      location,
      platforms_used: platforms,
      firecrawl_calls: 0,
      ai_calls: 0,
      leads_found: upsertedCount,
      estimated_cost_usd: Number(totalCost.toFixed(3)),
    });

    // Finalize job
    await supabase
      .from("ad_scan_jobs")
      .update({
        status: "completed",
        ads_found: upsertedCount,
        total_cost_usd: Number(totalCost.toFixed(3)),
        platform_results: { ...platformResults, _duplicates_skipped: duplicateCount, _mode: mode, _engagement_target: engagementTarget },
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        ads_found: upsertedCount,
        platform_results: { ...platformResults, _duplicates_skipped: duplicateCount, _mode: mode, _engagement_target: engagementTarget },
        total_cost_usd: Number(totalCost.toFixed(3)),
        apify_user: tokenCheck.username,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[scrape-social-ads] error:", e);
    if (jobId) {
      await supabase
        .from("ad_scan_jobs")
        .update({
          status: "failed",
          last_error: String(e?.message ?? e),
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
