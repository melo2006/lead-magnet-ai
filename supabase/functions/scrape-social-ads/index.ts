import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Platform = "meta" | "tiktok";

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

function pickLandingUrl(item: any): string | undefined {
  // The official Apify FB ads scraper output uses snapshot.link_url plus a few alternatives
  const s = item?.snapshot ?? {};
  return (
    s.link_url ||
    item.link_url ||
    item.url ||
    item.landingPageUrl ||
    item.adLandingPage ||
    item.destinationUrl ||
    (Array.isArray(s.cards) && s.cards[0]?.link_url) ||
    undefined
  );
}

function normalizeMetaAd(item: any): ScrapedAd | null {
  const landing = pickLandingUrl(item);
  if (!landing) return null;
  const landingUrl = String(landing).startsWith("http") ? String(landing) : `https://${landing}`;
  const s = item?.snapshot ?? {};

  return {
    platform: "meta",
    ad_id: item.ad_archive_id || item.adArchiveId || item.id,
    advertiser_name: s.page_name || item.page_name || item.advertiserName || "Unknown",
    advertiser_handle: String(s.page_id || item.page_id || ""),
    landing_url: landingUrl,
    cta_text: s.cta_text || s.title || item.cta,
    ad_creative_text: s.body?.text || s.caption || item.text || s.title,
    ad_media_url:
      s.videos?.[0]?.video_preview_image_url ||
      s.images?.[0]?.original_image_url ||
      s.cards?.[0]?.original_image_url,
    posted_at: item.start_date ? new Date(item.start_date * 1000).toISOString() : undefined,
    source_ad_url: item.url || `https://www.facebook.com/ads/library/?id=${item.ad_archive_id ?? ""}`,
    metadata: {
      publisher_platforms: item.publisher_platform || s.publisher_platform || [],
    },
  };
}

async function scrapeMetaViaApify(
  token: string,
  niche: string,
  location: string,
  limit: number,
): Promise<{ ads: ScrapedAd[]; rawSample: unknown }> {
  const countryCode = location.toLowerCase().includes("uk") ? "GB" : "US";
  const searchUrl = buildFbAdLibrarySearchUrl(niche, countryCode);
  console.log(`[meta] searchUrl=${searchUrl} limit=${limit}`);
  const items = await runApifyActor(token, "apify~facebook-ads-scraper", {
    startUrls: [{ url: searchUrl }],
    resultsLimit: limit,
    activeStatus: "active",
  });
  console.log(`[meta] raw items: ${items.length}`);
  if (items.length > 0) {
    console.log(`[meta] sample keys: ${Object.keys(items[0] as any).slice(0, 30).join(",")}`);
  }
  const ads = items.map(normalizeMetaAd).filter((x): x is ScrapedAd => !!x);
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
          batch = await scrapeMetaViaApify(APIFY_TOKEN, niche, location, limitPerPlatform);
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

    // Upsert dedup by (platform, landing_url)
    let upsertedCount = 0;
    if (allAds.length > 0) {
      const rows = allAds.map((a) => ({ ...a, scan_job_id: jobId }));
      const { data: upserted, error: upErr } = await supabase
        .from("scraped_ads")
        .upsert(rows, { onConflict: "platform,landing_url", ignoreDuplicates: false })
        .select("id");
      if (upErr) throw upErr;
      upsertedCount = upserted?.length ?? 0;
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
        platform_results: platformResults,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        ads_found: upsertedCount,
        platform_results: platformResults,
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
