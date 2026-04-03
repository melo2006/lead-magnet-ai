const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BROWSERBASE_API_URL = "https://api.browserbase.com/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("BROWSERBASE_API_KEY");
    const projectId = Deno.env.get("BROWSERBASE_PROJECT_ID");

    if (!apiKey) throw new Error("BROWSERBASE_API_KEY is not configured");
    if (!projectId) throw new Error("BROWSERBASE_PROJECT_ID is not configured");

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'url' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create session
    const createRes = await fetch(`${BROWSERBASE_API_URL}/sessions`, {
      method: "POST",
      headers: {
        "x-bb-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        browserSettings: { blockAds: true },
        keepAlive: true,
        timeout: 300,
      }),
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      console.error("Session creation failed:", createRes.status, errorBody);
      throw new Error(`Browserbase API error [${createRes.status}]: ${errorBody}`);
    }

    const session = await createRes.json();
    const sessionId = session.id;
    if (!sessionId) throw new Error("No session ID returned");

    console.log("Session created:", sessionId);

    // 2. Wait for session to be ready, then get debug/live view URLs
    let debugInfo: any = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));

      const debugRes = await fetch(`${BROWSERBASE_API_URL}/sessions/${sessionId}/debug`, {
        headers: { "x-bb-api-key": apiKey },
      });

      if (!debugRes.ok) {
        console.warn(`Debug fetch attempt ${attempt + 1} failed: ${debugRes.status}`);
        continue;
      }

      debugInfo = await debugRes.json();
      
      // Check if pages are available (browser is ready)
      if (debugInfo.pages && debugInfo.pages.length > 0) {
        console.log(`Browser ready on attempt ${attempt + 1}, pages: ${debugInfo.pages.length}`);
        break;
      }
      console.log(`Attempt ${attempt + 1}: no pages yet`);
    }

    if (!debugInfo?.debuggerFullscreenUrl) {
      throw new Error("Failed to get live view URL");
    }

    const liveViewUrl = debugInfo.debuggerFullscreenUrl;

    // 3. Navigate using page CDP endpoint
    let navigated = false;
    if (debugInfo.pages && debugInfo.pages.length > 0) {
      const pageId = debugInfo.pages[0].id;
      console.log(`Navigating page ${pageId} to ${url}`);

      const cdpRes = await fetch(
        `${BROWSERBASE_API_URL}/sessions/${sessionId}/pages/${pageId}/cdp`,
        {
          method: "POST",
          headers: {
            "x-bb-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method: "Page.navigate",
            params: { url },
          }),
        }
      );

      if (cdpRes.ok) {
        navigated = true;
        console.log("CDP navigation succeeded");
      } else {
        const cdpErr = await cdpRes.text();
        console.warn("CDP navigate failed:", cdpRes.status, cdpErr);
      }
    }

    return new Response(
      JSON.stringify({ sessionId, liveViewUrl, navigated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
