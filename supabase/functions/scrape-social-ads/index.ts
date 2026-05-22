import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Platform = "meta" | "tiktok" | "linkedin" | "google";

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

// --- META AD LIBRARY (official, free) ---
async function scrapeMeta(token: string, niche: string, location: string, limit: number): Promise<ScrapedAd[]> {
  // https://developers.facebook.com/docs/marketing-api/reference/ads_archive/
  const country = location.toLowerCase().includes("uk") ? "GB" : "US";
  const params = new URLSearchParams({
    access_token: token,
    search_terms: niche,
    ad_reached_countries: `["${country}"]`,
    ad_active_status: "ACTIVE",
    ad_type: "ALL",
    fields:
      "id,page_name,page_id,ad_creative_link_captions,ad_creative_link_titles,ad_creative_link_descriptions,ad_creative_bodies,ad_snapshot_url,ad_delivery_start_time,publisher_platforms",
    limit: String(Math.min(limit, 100)),
  });

  const url = `https://graph.facebook.com/v19.0/ads_archive?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Meta Ad Library: ${res.status} ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  const items = json.data ?? [];

  const out: ScrapedAd[] = [];
  for (const item of items) {
    const captions: string[] = item.ad_creative_link_captions ?? [];
    const titles: string[] = item.ad_creative_link_titles ?? [];
    const bodies: string[] = item.ad_creative_bodies ?? [];
    const landing = captions[0] || titles[0]?.match(/https?:\/\/\S+/)?.[0];
    if (!landing) continue;

    // Normalize bare domains into https URLs
    const landingUrl = landing.startsWith("http") ? landing : `https://${landing.replace(/^\/+/, "")}`;

    out.push({
      platform: "meta",
      ad_id: item.id,
      advertiser_name: item.page_name ?? "Unknown",
      advertiser_handle: item.page_id,
      landing_url: landingUrl,
      cta_text: titles[0],
      ad_creative_text: bodies[0],
      source_ad_url: item.ad_snapshot_url,
      posted_at: item.ad_delivery_start_time,
      metadata: { publisher_platforms: item.publisher_platforms ?? [] },
    });
  }
  return out;
}

// --- APIFY (TikTok / LinkedIn / Google Ads transparency) ---
async function runApifyActor(
  token: string,
  actorId: string,
  input: Record<string, unknown>,
): Promise<unknown[]> {
  // Sync run with dataset items returned inline
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=120`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Apify ${actorId}: ${res.status} ${t.slice(0, 300)}`);
  }
  return await res.json();
}

function normalizeApifyAd(platform: Platform, item: any): ScrapedAd | null {
  // Apify actor schemas vary; we coalesce common fields defensively.
  const landing =
    item.landingPageUrl ||
    item.landing_url ||
    item.url ||
    item.adUrl ||
    item.link ||
    item.destinationUrl;
  if (!landing) return null;
  const landingUrl = String(landing).startsWith("http") ? String(landing) : `https://${landing}`;

  return {
    platform,
    ad_id: item.id || item.adId || item.adArchiveId,
    advertiser_name: item.advertiserName || item.pageName || item.author || item.brandName || "Unknown",
    advertiser_handle: item.advertiserId || item.pageId || item.authorId,
    landing_url: landingUrl,
    cta_text: item.cta || item.ctaText || item.callToAction,
    ad_creative_text: item.text || item.description || item.body || item.caption,
    ad_media_url: item.imageUrl || item.videoUrl || item.thumbnail,
    posted_at: item.startDate || item.firstSeen || item.createdAt,
    source_ad_url: item.adLibraryUrl || item.adUrl || item.permalink,
    metadata: { raw_keys: Object.keys(item).slice(0, 20) },
  };
}

async function scrapeApifyPlatform(
  token: string,
  platform: Platform,
  niche: string,
  location: string,
  limit: number,
): Promise<ScrapedAd[]> {
  const actorMap: Record<Platform, { id: string; input: Record<string, unknown> }> = {
    tiktok: {
      id: "apify~tiktok-ads-library-scraper",
      input: { keyword: niche, country: "US", maxItems: limit },
    },
    linkedin: {
      id: "apify~linkedin-ads-library-scraper",
      input: { keyword: niche, country: "US", maxItems: limit },
    },
    google: {
      id: "apify~google-ads-transparency-scraper",
      input: { searchTerm: niche, region: "US", maxItems: limit },
    },
    meta: { id: "", input: {} }, // handled separately
  };

  const cfg = actorMap[platform];
  if (!cfg.id) return [];
  const items = await runApifyActor(token, cfg.id, cfg.input);
  return items.map((i) => normalizeApifyAd(platform, i)).filter((x): x is ScrapedAd => !!x);
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
    const platforms: Platform[] = Array.isArray(body?.platforms) ? body.platforms : [];
    const limitPerPlatform: number = Math.min(Math.max(Number(body?.limit ?? 25), 1), 100);

    if (!niche || platforms.length === 0) {
      return new Response(JSON.stringify({ error: "niche and platforms[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create job
    const { data: job, error: jobErr } = await supabase
      .from("ad_scan_jobs")
      .insert({ niche, location, platforms, status: "running" })
      .select()
      .single();
    if (jobErr) throw jobErr;
    jobId = job.id;

    const META_TOKEN = Deno.env.get("META_ADS_ACCESS_TOKEN");
    const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");

    const allAds: ScrapedAd[] = [];
    const platformResults: Record<string, { count: number; error?: string }> = {};
    let totalCost = 0;

    for (const platform of platforms) {
      try {
        let batch: ScrapedAd[] = [];
        if (platform === "meta") {
          if (!META_TOKEN) throw new Error("META_ADS_ACCESS_TOKEN not configured");
          batch = await scrapeMeta(META_TOKEN, niche, location, limitPerPlatform);
          // Meta API is free
        } else {
          if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN not configured");
          batch = await scrapeApifyPlatform(APIFY_TOKEN, platform, niche, location, limitPerPlatform);
          totalCost += (batch.length / 1000) * 0.5; // ~$0.50/1k ads estimate
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
        total_cost_usd: totalCost,
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
