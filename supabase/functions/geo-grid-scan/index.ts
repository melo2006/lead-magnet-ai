// Geo-Grid Blind-Spot Scan — runs Apify Google Maps searches across a lat/lng grid
// and returns the target business's rank at each point.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN")!;
const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY")!;

// compass/crawler-google-places — supports customGeolocation polygon
const APIFY_ACTOR = "compass~crawler-google-places";

interface GridPoint {
  lat: number;
  lng: number;
  row: number;
  col: number;
  rank: number | null; // null = not in top N
  matchedName?: string;
}

async function geocode(query: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
  const r = await fetch(url);
  const j = await r.json();
  const first = j?.results?.[0];
  if (!first) {
    console.warn("Geocode no results for:", query, "status:", j?.status, j?.error_message);
    return null;
  }
  return { lat: first.geometry.location.lat, lng: first.geometry.location.lng, formatted: first.formatted_address };
}

// Find business via Google Places Text Search (more reliable than geocoding a name)
async function findBusinessLocation(businessName: string, websiteUrl?: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  try {
    const query = websiteUrl ? `${businessName} ${websiteUrl}` : businessName;
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.location,places.formattedAddress,places.displayName",
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1, languageCode: "en" }),
    });
    const j = await res.json();
    const first = j?.places?.[0];
    if (!first?.location) {
      console.warn("Places search no results for:", query, JSON.stringify(j).slice(0, 200));
      return null;
    }
    return { lat: first.location.latitude, lng: first.location.longitude, formatted: first.formattedAddress || "" };
  } catch (e) {
    console.error("findBusinessLocation error:", e);
    return null;
  }
}

// Build a small circle polygon around a point for Apify's customGeolocation
function circlePolygon(lat: number, lng: number, radiusKm = 0.6) {
  const points = 8;
  const coords: number[][] = [];
  const earth = 6371; // km
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dLat = (radiusKm / earth) * (180 / Math.PI);
    const dLng = (radiusKm / earth) * (180 / Math.PI) / Math.cos((lat * Math.PI) / 180);
    coords.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]);
  }
  coords.push(coords[0]);
  return { type: "Polygon", coordinates: [coords] };
}

async function runApifyCell(keyword: string, lat: number, lng: number, maxResults: number, timeoutSec: number): Promise<any[]> {
  const input = {
    searchStringsArray: [keyword],
    locationQuery: "",
    maxCrawledPlacesPerSearch: maxResults,
    language: "en",
    customGeolocation: circlePolygon(lat, lng, 0.6),
    skipClosedPlaces: false,
    scrapePlaceDetailPage: false,
    scrapeReviewsPersonalData: false,
  };
  const url = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${timeoutSec}&memory=1024`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Apify ${res.status}: ${t.slice(0, 200)}`);
  }
  return await res.json();
}

function normalize(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findRank(results: any[], businessName: string, websiteHost?: string): { rank: number | null; matched?: string } {
  const target = normalize(businessName);
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const name = normalize(r?.title || r?.name || "");
    const site = (r?.website || "").toLowerCase();
    if (target && name && (name.includes(target) || target.includes(name))) {
      return { rank: i + 1, matched: r?.title };
    }
    if (websiteHost && site && site.includes(websiteHost)) {
      return { rank: i + 1, matched: r?.title };
    }
  }
  return { rank: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      businessName,
      websiteUrl,
      address,
      keyword,
      centerLat,
      centerLng,
      gridSize = 3,         // 3x3 = 9 points
      stepKm = 1.6,         // ~1 mile spacing
      maxResultsPerCell = 20,
      cellTimeoutSec = 90,
    } = await req.json();

    if (!keyword || !businessName) {
      return new Response(JSON.stringify({ error: "keyword and businessName are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve center — try in order: explicit coords -> address geocode -> Places text search -> business+website geocode -> business name geocode
    let center: { lat: number; lng: number; formatted?: string } | null = null;
    if (typeof centerLat === "number" && typeof centerLng === "number") {
      center = { lat: centerLat, lng: centerLng };
    }
    if (!center && address) center = await geocode(address);
    if (!center) center = await findBusinessLocation(businessName, websiteUrl);
    if (!center && websiteUrl) center = await geocode(`${businessName} ${websiteUrl}`.trim());
    if (!center) center = await geocode(businessName);

    if (!center) {
      return new Response(JSON.stringify({
        error: `Could not locate "${businessName}" on Google Maps. Try providing the business address.`,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build grid
    const half = Math.floor(gridSize / 2);
    const points: { lat: number; lng: number; row: number; col: number }[] = [];
    const kmPerDegLat = 110.574;
    const kmPerDegLng = 111.320 * Math.cos((center.lat * Math.PI) / 180);
    for (let r = -half; r <= half; r++) {
      for (let c = -half; c <= half; c++) {
        points.push({
          lat: center.lat + (r * stepKm) / kmPerDegLat,
          lng: center.lng + (c * stepKm) / kmPerDegLng,
          row: r + half,
          col: c + half,
        });
      }
    }

    let websiteHost: string | undefined;
    try { if (websiteUrl) websiteHost = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname.replace(/^www\./, ""); } catch {}

    // Fire all cells in parallel
    const settled = await Promise.allSettled(
      points.map((p) => runApifyCell(keyword, p.lat, p.lng, maxResultsPerCell, cellTimeoutSec)),
    );

    const grid: GridPoint[] = points.map((p, i) => {
      const s = settled[i];
      if (s.status !== "fulfilled") return { ...p, rank: null };
      const { rank, matched } = findRank(s.value as any[], businessName, websiteHost);
      return { ...p, rank, matchedName: matched };
    });

    const ranked = grid.filter((g) => g.rank !== null).map((g) => g.rank as number);
    const avgRank = ranked.length ? ranked.reduce((a, b) => a + b, 0) / ranked.length : null;
    const visibility = Math.round((grid.filter((g) => g.rank !== null && (g.rank as number) <= 3).length / grid.length) * 100);

    return new Response(JSON.stringify({
      center,
      grid,
      keyword,
      businessName,
      stats: {
        totalCells: grid.length,
        rankedCells: ranked.length,
        avgRank,
        top3VisibilityPct: visibility,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("geo-grid-scan error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
