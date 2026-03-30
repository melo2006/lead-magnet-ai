import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Build niche-specific intent queries
function buildSearchQueries(niche: string, location: string): string[] {
  const nicheKeywords: Record<string, string[]> = {
    roofing: ["need a roofer", "roof leaking", "roof repair needed", "looking for roofing company", "roof replacement"],
    dental: ["need a dentist", "looking for dentist", "dental emergency", "tooth pain", "recommend a dentist"],
    plumbing: ["need a plumber", "pipe burst", "plumbing emergency", "leaking pipe", "recommend plumber"],
    hvac: ["AC not working", "need HVAC repair", "furnace broken", "looking for HVAC company", "air conditioning repair"],
    "pet-grooming": ["dog groomer near me", "need pet groomer", "looking for dog grooming", "recommend pet groomer"],
    "auto-repair": ["car mechanic needed", "auto repair shop", "car won't start", "need mechanic", "recommend auto shop"],
    realtors: ["looking for realtor", "need real estate agent", "selling my house", "buying a home", "recommend a realtor"],
    landscaping: ["need landscaper", "lawn care service", "looking for landscaping", "yard cleanup", "recommend landscaper"],
    "home-cleaning": ["need house cleaner", "looking for cleaning service", "maid service", "recommend cleaning company"],
    electrical: ["need electrician", "electrical problem", "looking for electrician", "wiring issue", "recommend electrician"],
  };

  const keywords = nicheKeywords[niche] || [`need ${niche}`, `looking for ${niche}`, `recommend ${niche}`];

  return keywords.map((kw) => `${kw} ${location}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { niche, location, timeRange, platforms, limit } = await req.json();

    if (!niche || !location) {
      return new Response(
        JSON.stringify({ success: false, error: "Niche and location are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl connector not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI scoring not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map time range to Firecrawl tbs parameter
    const tbsMap: Record<string, string> = {
      "24h": "qdr:d",
      "week": "qdr:w",
      "month": "qdr:m",
      "3months": "qdr:m", // Firecrawl doesn't have 3mo, use month
    };
    const tbs = tbsMap[timeRange] || "qdr:m";

    // Build platform-specific site filters
    const platformSites: Record<string, string> = {
      reddit: "site:reddit.com",
      google_reviews: "site:google.com/maps",
      yelp: "site:yelp.com",
      facebook: "site:facebook.com",
      nextdoor: "site:nextdoor.com",
      forums: "", // no site filter
    };

    const selectedPlatforms: string[] = platforms && platforms.length > 0 
      ? platforms 
      : ["reddit", "google_reviews", "yelp", "forums"];

    const queries = buildSearchQueries(niche, location);
    const allResults: any[] = [];

    // Search across platforms (limit queries to avoid excessive API calls)
    const maxQueries = Math.min(queries.length, 3);
    for (let i = 0; i < maxQueries; i++) {
      for (const platform of selectedPlatforms) {
        const siteFilter = platformSites[platform] || "";
        const searchQuery = `${queries[i]} ${siteFilter}`.trim();

        try {
          console.log(`Searching: ${searchQuery}`);
          const response = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: searchQuery,
              limit: limit || 5,
              tbs,
              scrapeOptions: { formats: ["markdown"] },
            }),
          });

          const data = await response.json();
          if (response.ok && data.success && data.data) {
            for (const result of data.data) {
              allResults.push({
                ...result,
                platform,
                searchQuery: queries[i],
              });
            }
          } else {
            console.error(`Search failed for "${searchQuery}":`, data);
          }
        } catch (err) {
          console.error(`Error searching "${searchQuery}":`, err);
        }
      }
    }

    if (allResults.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: [], message: "No results found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueResults = allResults.filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    // AI scoring - batch process with Lovable AI
    const scoredLeads: any[] = [];
    const batchSize = 5;
    
    for (let i = 0; i < uniqueResults.length; i += batchSize) {
      const batch = uniqueResults.slice(i, i + batchSize);
      const batchPrompt = batch.map((r, idx) => 
        `[RESULT ${idx + 1}]\nURL: ${r.url}\nTitle: ${r.title || "N/A"}\nContent: ${(r.markdown || r.description || "").substring(0, 500)}\n`
      ).join("\n---\n");

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a lead scoring AI. Analyze each result and determine if the author is actively looking for a ${niche} service in or near ${location}. Score each result.`,
              },
              {
                role: "user",
                content: `Score these search results for purchase intent for "${niche}" services in "${location}". For each result, provide a JSON array.\n\n${batchPrompt}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "score_leads",
                  description: "Score leads for purchase intent",
                  parameters: {
                    type: "object",
                    properties: {
                      leads: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            result_index: { type: "number", description: "0-based index" },
                            intent_score: { type: "number", description: "0-100 purchase intent score" },
                            intent_category: {
                              type: "string",
                              enum: ["active_search", "complaint", "recommendation_request", "review", "discussion", "irrelevant"],
                            },
                            summary: { type: "string", description: "1-2 sentence summary of what the person needs" },
                            recommended_services: { type: "string", description: "Comma-separated services to pitch" },
                            author_name: { type: "string", description: "Author name if found" },
                          },
                          required: ["result_index", "intent_score", "intent_category", "summary", "recommended_services"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["leads"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "score_leads" } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const parsed = JSON.parse(toolCall.function.arguments);
            for (const lead of parsed.leads) {
              const result = batch[lead.result_index];
              if (!result) continue;

              const temperature = lead.intent_score >= 80 ? "hot" : lead.intent_score >= 50 ? "warm" : "cold";

              scoredLeads.push({
                source_url: result.url,
                source_platform: result.platform,
                post_content: (result.markdown || result.description || "").substring(0, 2000),
                post_title: result.title || null,
                author_name: lead.author_name || null,
                author_profile_url: null,
                niche,
                location,
                intent_score: lead.intent_score,
                intent_category: lead.intent_category,
                lead_temperature: temperature,
                ai_summary: lead.summary,
                ai_recommended_services: lead.recommended_services,
                search_query: result.searchQuery,
                search_niche: niche,
                search_location: location,
              });
            }
          }
        } else {
          const errText = await aiResponse.text();
          console.error("AI scoring error:", aiResponse.status, errText);
          // Fall back: add results without AI scoring
          for (const result of batch) {
            scoredLeads.push({
              source_url: result.url,
              source_platform: result.platform,
              post_content: (result.markdown || result.description || "").substring(0, 2000),
              post_title: result.title || null,
              niche,
              location,
              intent_score: 0,
              intent_category: "unknown",
              lead_temperature: "cold",
              ai_summary: "AI scoring unavailable",
              ai_recommended_services: "",
              search_query: result.searchQuery,
              search_niche: niche,
              search_location: location,
            });
          }
        }
      } catch (err) {
        console.error("AI scoring failed:", err);
      }
    }

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (scoredLeads.length > 0) {
      const { error: insertError } = await supabase.from("intent_leads").insert(scoredLeads);
      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    // Sort by score descending
    scoredLeads.sort((a, b) => b.intent_score - a.intent_score);

    // Track usage costs
    const firecrawlCalls = maxQueries * selectedPlatforms.length;
    const aiCalls = Math.ceil(uniqueResults.length / batchSize);
    const FIRECRAWL_COST_PER_SEARCH = 0.01; // ~$0.01 per search call
    const estimatedCost = firecrawlCalls * FIRECRAWL_COST_PER_SEARCH;

    try {
      await supabase.from("scraping_usage").insert({
        scan_type: "intent_leads",
        niche,
        location,
        platforms_used: selectedPlatforms,
        firecrawl_calls: firecrawlCalls,
        ai_calls: aiCalls,
        leads_found: scoredLeads.length,
        estimated_cost_usd: estimatedCost,
      });
    } catch (costErr) {
      console.error("Failed to log usage:", costErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: scoredLeads,
        count: scoredLeads.length,
        usage: {
          firecrawl_calls: firecrawlCalls,
          ai_calls: aiCalls,
          estimated_cost_usd: Number(estimatedCost.toFixed(4)),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("search-intent-leads error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
