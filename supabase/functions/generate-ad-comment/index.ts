import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json();
    const scrapedAdId: string = String(body?.scraped_ad_id ?? "").trim();
    const demoBaseUrl: string = String(body?.demo_base_url ?? "https://aihiddenleads.com/demo");
    if (!scrapedAdId) {
      return new Response(JSON.stringify({ error: "scraped_ad_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ad, error: adErr } = await supabase
      .from("scraped_ads")
      .select("*")
      .eq("id", scrapedAdId)
      .single();
    if (adErr || !ad) throw new Error("Ad not found");

    const demoLink = ad.prospect_id
      ? `${demoBaseUrl}?prospectId=${ad.prospect_id}`
      : `${demoBaseUrl}?url=${encodeURIComponent(ad.landing_url)}`;

    const systemPrompt = `You write friendly, non-spammy, one-sentence social media comments.
Rules:
- Maximum 220 characters total INCLUDING the demo link.
- Mention ONE genuine detail from their ad (their offer, their niche, or their brand name).
- Sound like a real person, not a marketer. No emojis spam. At most ONE emoji.
- End with: "Made a quick demo for you: <DEMO_LINK>"
- Never use the words "AI", "automation", "leads", or "agency" in the comment body.
- Never use hashtags.`;

    const userPrompt = `Advertiser: ${ad.advertiser_name}
Platform: ${ad.platform}
CTA: ${ad.cta_text ?? "(none)"}
Ad copy: ${(ad.ad_creative_text ?? "").slice(0, 400)}
Their landing page: ${ad.landing_url}
Demo link to insert: ${demoLink}

Write ONE comment.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI gateway: ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    let comment: string = aiJson?.choices?.[0]?.message?.content?.trim() ?? "";
    // Safety: ensure link present
    if (!comment.includes(demoLink)) {
      comment = `${comment}\n\nMade a quick demo for you: ${demoLink}`.trim();
    }

    await supabase
      .from("scraped_ads")
      .update({ comment_template: comment })
      .eq("id", scrapedAdId);

    return new Response(JSON.stringify({ success: true, comment, demo_link: demoLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[generate-ad-comment] error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
