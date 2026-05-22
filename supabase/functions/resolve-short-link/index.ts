import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug =
      url.searchParams.get("slug") ??
      (req.method === "POST" ? (await req.json().catch(() => ({})))?.slug : null);

    if (!slug || typeof slug !== "string") {
      return new Response(JSON.stringify({ error: "slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: link } = await supabase
      .from("short_links")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!link) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire-and-forget click tracking
    supabase
      .from("short_links")
      .update({ click_count: (link.click_count ?? 0) + 1, last_clicked_at: new Date().toISOString() })
      .eq("id", link.id)
      .then(() => {});

    // Also fire engagement tracking if linked to a prospect
    if (link.prospect_id) {
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/track-engagement?pid=${link.prospect_id}&event=click`, {
        headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        success: true,
        target_url: link.target_url,
        prospect_id: link.prospect_id,
        scraped_ad_id: link.scraped_ad_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[resolve-short-link]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
