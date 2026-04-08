import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  radius: z.number().min(1).max(80).default(20),
  useGeolocation: z.boolean().optional().default(false),
  lat: z.number().optional(),
  lng: z.number().optional(),
  maxResults: z.number().min(1).max(60).optional().default(60),
});

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.types",
  "places.primaryType",
  "places.location",
  "places.photos",
  "places.regularOpeningHours",
  "places.businessStatus",
  "places.addressComponents",
  "nextPageToken",
].join(",");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("GOOGLE_MAPS_API_KEY is not configured");
    }

    const body = await req.json();
    const parsed = SearchSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, location, radius, useGeolocation, lat, lng, maxResults } = parsed.data;
    const radiusMeters = Math.min(radius * 1609.34, 50000);

    // Step 1: Geocode the location (if not using geolocation)
    let searchLat = lat;
    let searchLng = lng;

    if (!useGeolocation || !searchLat || !searchLng) {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${GOOGLE_MAPS_API_KEY}`;
      const geocodeRes = await fetch(geocodeUrl);
      const geocodeData = await geocodeRes.json();

      if (geocodeData.status !== "OK" || !geocodeData.results?.length) {
        return new Response(
          JSON.stringify({ error: `Could not find location: ${location}`, geocodeStatus: geocodeData.status }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      searchLat = geocodeData.results[0].geometry.location.lat;
      searchLng = geocodeData.results[0].geometry.location.lng;
    }

    // Step 2: Paginate through Google Places Text Search to get up to maxResults
    const allPlaces: any[] = [];
    let pageToken: string | undefined;
    const maxPages = Math.ceil(maxResults / 20);

    for (let page = 0; page < maxPages; page++) {
      const searchBody: any = {
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: searchLat, longitude: searchLng },
            radius: radiusMeters,
          },
        },
        maxResultCount: 20,
        languageCode: "en",
      };

      if (pageToken) {
        searchBody.pageToken = pageToken;
      }

      const placesRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify(searchBody),
      });

      const placesData = await placesRes.json();

      if (!placesRes.ok) {
        console.error("Google Places API error:", JSON.stringify(placesData));
        if (page === 0) {
          throw new Error(`Google Places API error [${placesRes.status}]: ${JSON.stringify(placesData)}`);
        }
        break;
      }

      const places = placesData.places || [];
      allPlaces.push(...places);
      console.log(`Page ${page + 1}: got ${places.length} results (total: ${allPlaces.length})`);

      pageToken = placesData.nextPageToken;
      if (!pageToken || allPlaces.length >= maxResults) break;

      // Google requires a short delay before using pageToken
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Trim to maxResults
    const trimmedPlaces = allPlaces.slice(0, maxResults);

    // Step 3: Transform and score each place
    const prospects = trimmedPlaces.map((place: any) => {
      const hasWebsite = !!place.websiteUri;
      const reviewCount = place.userRatingCount || 0;
      const rating = place.rating || 0;

      let city = "";
      let state = "";
      let zipCode = "";
      if (place.addressComponents) {
        for (const comp of place.addressComponents) {
          if (comp.types?.includes("locality")) city = comp.longText || comp.shortText || "";
          if (comp.types?.includes("administrative_area_level_1")) state = comp.shortText || "";
          if (comp.types?.includes("postal_code")) zipCode = comp.longText || comp.shortText || "";
        }
      }

      // Lead scoring
      let score = 50;
      if (!hasWebsite) score += 30;
      if (hasWebsite) score += 5;
      if (reviewCount < 10) score += 15;
      else if (reviewCount < 50) score += 10;
      if (rating < 4.0 && rating > 0) score += 10;
      if (rating >= 4.5) score -= 5;
      score = Math.min(100, Math.max(0, score));

      let temperature = "cold";
      if (score >= 75) temperature = "hot";
      else if (score >= 50) temperature = "warm";

      const photos = (place.photos || []).slice(0, 5).map((p: any) => ({
        name: p.name,
        widthPx: p.widthPx,
        heightPx: p.heightPx,
      }));

      return {
        place_id: place.id,
        business_name: place.displayName?.text || "Unknown",
        formatted_address: place.formattedAddress || "",
        phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
        website_url: place.websiteUri || null,
        google_maps_url: place.googleMapsUri || null,
        rating: rating || null,
        review_count: reviewCount,
        business_types: place.types || [],
        primary_type: place.primaryType || null,
        niche: query,
        location_lat: place.location?.latitude || null,
        location_lng: place.location?.longitude || null,
        city,
        state,
        zip_code: zipCode,
        photos,
        opening_hours: place.regularOpeningHours || null,
        has_website: hasWebsite,
        lead_score: score,
        lead_temperature: temperature,
        search_query: query,
        search_location: location,
        search_radius: radius,
      };
    });

    // Step 4: Upsert prospects into database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (prospects.length > 0) {
      const { error: upsertError } = await supabase
        .from("prospects")
        .upsert(prospects, { onConflict: "place_id", ignoreDuplicates: false });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: prospects.length,
        prospects,
        searchCenter: { lat: searchLat, lng: searchLng },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Search places error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
