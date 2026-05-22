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

function cleanUrl(value: unknown): string | undefined {
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

  const startedAt = item.start_date
    ? new Date(Number(item.start_date) * 1000).toISOString()
    : item.startDate
      ? new Date(Number(item.startDate) * 1000).toISOString()
      : firstValue(item.startDateFormatted, item.start_date_formatted);

  const publisherPlatforms = inferPublisherPlatforms(item);
  const isCommentable = Boolean(fbPostUrl || igPostUrl);

  return {
    platform: "meta",
    ad_id: adId,
    advertiser_name: advertiser,
    advertiser_handle: firstValue(s.page_id, s.pageId, item.page_id, item.pageId, item.pageID),
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
      source: "apify/facebook-ads-scraper",
    },
  };
}

async function scrapeMetaViaApify(
  token: string,
  niche: string,
  location: string,
  limit: number,
  engagementTarget: EngagementTarget,
): Promise<{ ads: ScrapedAd[]; rawSample: unknown }> {
  const countryCode = location.toLowerCase().includes("uk") ? "GB" : "US";
  const searchUrl = buildFbAdLibrarySearchUrl(niche, countryCode);
  const actorLimit = engagementTarget === "commentable_only" ? Math.min(limit * 3, 100) : limit;
  console.log(`[meta] searchUrl=${searchUrl} limit=${actorLimit} target=${engagementTarget}`);
  const items = await runApifyActor(token, "apify~facebook-ads-scraper", {
    startUrls: [{ url: searchUrl }],
    resultsLimit: actorLimit,
    activeStatus: "active",
  });
  console.log(`[meta] raw items: ${items.length}`);
  if (items.length > 0) {
    console.log(`[meta] sample keys: ${Object.keys(items[0] as any).slice(0, 30).join(",")}`);
  }
  const normalized = items.map(normalizeMetaAd).filter((x): x is ScrapedAd => !!x);
  const ads = (engagementTarget === "commentable_only" ? normalized.filter((ad) => ad.metadata?.is_commentable === true) : normalized).slice(0, limit);
  console.log(`[meta] normalized: ${ads.length} (dropped ${items.length - ads.length})`);
  return { ads, rawSample: items[0] ?? null };
}

// --- TIKTOK via aiscraperdev/tiktok-ads-library-scraper ---
function normalizeTikTokAd(item: any): ScrapedAd | null {
  const landing =
    item.landingPageUrl ||
    item.landing_url ||
    item.landingUrl ||
    item.adUrl ||
    item.url ||
    item.advertiserUrl ||
    item.click_url;
  if (!landing) return null;
  const landingUrl = String(landing).startsWith("http") ? String(landing) : `https://${landing}`;

  return {
    platform: "tiktok",
    ad_id: item.id || item.adId || item.materialId,
    advertiser_name: item.advertiserName || item.brandName || item.advertiser || "Unknown",
    advertiser_handle: item.advertiserId || item.brandId,
    landing_url: landingUrl,
    cta_text: item.cta || item.ctaText || item.callToAction,
    ad_creative_text: item.title || item.description || item.adText,
    ad_media_url: item.videoUrl || item.coverUrl || item.imageUrl,
    posted_at: item.createdAt || item.startDate || item.firstSeen,
    source_ad_url: item.detailUrl || item.previewUrl,
    metadata: { region: item.region, source: item.source },
  };
}

async function scrapeTikTokViaApify(
  token: string,
  niche: string,
  _location: string,
  limit: number,
): Promise<ScrapedAd[]> {
  const items = await runApifyActor(token, "aiscraperdev~tiktok-ads-library-scraper", {
    searchQuery: niche,
    source: "both",
    region: "US",
    maxAds: limit,
  });
  return items.map(normalizeTikTokAd).filter((x): x is ScrapedAd => !!x);
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
    const location: string = String(body?.location ?? "").trim();
    const requestedPlatforms: string[] = Array.isArray(body?.platforms) ? body.platforms : [];
    const platforms: Platform[] = requestedPlatforms.filter(
      (p): p is Platform => p === "meta" || p === "tiktok",
    );
    const limitPerPlatform: number = Math.min(Math.max(Number(body?.limit ?? 25), 1), 100);
    const verifyOnly: boolean = body?.verify === true;
    const mode: ScanMode = body?.mode === "rescan" ? "rescan" : "fresh";

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
      .insert({ niche, location, platforms, status: "running" })
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
          const r = await scrapeMetaViaApify(APIFY_TOKEN, niche, location, limitPerPlatform);
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

    // Save only new ads for rescans so the count reflects fresh finds, not old duplicates.
    let upsertedCount = 0;
    let duplicateCount = 0;
    const uniqueAds = Array.from(
      new Map(allAds.map((ad) => [`${ad.platform}::${ad.landing_url}`, ad])).values(),
    );
    duplicateCount += allAds.length - uniqueAds.length;

    if (uniqueAds.length > 0) {
      const { data: existingRows, error: existingErr } = await supabase
        .from("scraped_ads")
        .select("platform,landing_url")
        .in("landing_url", uniqueAds.map((a) => a.landing_url));
      if (existingErr) throw existingErr;
      const existingKeys = new Set((existingRows ?? []).map((r: any) => `${r.platform}::${r.landing_url}`));
      const rows = uniqueAds
        .filter((a) => !existingKeys.has(`${a.platform}::${a.landing_url}`))
        .map((a) => ({
          ...a,
          scan_job_id: jobId,
          metadata: { ...(a.metadata ?? {}), search_niche: niche, search_location: location },
        }));
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
        platform_results: { ...platformResults, _duplicates_skipped: duplicateCount, _mode: mode },
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        ads_found: upsertedCount,
        platform_results: { ...platformResults, _duplicates_skipped: duplicateCount, _mode: mode },
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
