const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BROWSERBASE_API_URL = "https://www.browserbase.com/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("BROWSERBASE_API_KEY");
    const projectId = Deno.env.get("BROWSERBASE_PROJECT_ID");

    if (!apiKey) {
      throw new Error("BROWSERBASE_API_KEY is not configured");
    }
    if (!projectId) {
      throw new Error("BROWSERBASE_PROJECT_ID is not configured");
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'url' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create a Browserbase session
    const createRes = await fetch(`${BROWSERBASE_API_URL}/sessions`, {
      method: "POST",
      headers: {
        "x-bb-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        browserSettings: {
          blockAds: true,
        },
        keepAlive: true,
        timeout: 300, // 5 min max
      }),
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      console.error("Browserbase session creation failed:", createRes.status, errorBody);
      throw new Error(`Browserbase API error [${createRes.status}]: ${errorBody}`);
    }

    const session = await createRes.json();
    const sessionId = session.id;

    if (!sessionId) {
      throw new Error("No session ID returned from Browserbase");
    }

    // 2. Get the debug connection info (contains the live view URL)
    const debugRes = await fetch(`${BROWSERBASE_API_URL}/sessions/${sessionId}/debug`, {
      headers: {
        "x-bb-api-key": apiKey,
      },
    });

    if (!debugRes.ok) {
      const debugError = await debugRes.text();
      console.error("Debug info fetch failed:", debugRes.status, debugError);
      throw new Error(`Failed to get debug info [${debugRes.status}]: ${debugError}`);
    }

    const debugInfo = await debugRes.json();
    const liveViewUrl = debugInfo.debuggerFullscreenUrl;

    if (!liveViewUrl) {
      console.error("Debug info response:", JSON.stringify(debugInfo));
      throw new Error("No debuggerFullscreenUrl returned");
    }

    // 3. Navigate the browser to the target URL using the CDP websocket
    // We'll use the Pages endpoint to navigate
    const connectUrl = debugInfo.debuggerUrl || debugInfo.wsUrl;
    
    // Use the CDP HTTP endpoint to send a navigate command
    // The live view URL already shows the browser - we need to navigate it
    // We can do this via the Browserbase REST API
    const pagesRes = await fetch(`${BROWSERBASE_API_URL}/sessions/${sessionId}/pages`, {
      headers: { "x-bb-api-key": apiKey },
    });

    let navigated = false;
    if (pagesRes.ok) {
      const pages = await pagesRes.json();
      if (pages.length > 0) {
        const pageId = pages[0].id;
        // Send CDP command to navigate
        const cdpRes = await fetch(`${BROWSERBASE_API_URL}/sessions/${sessionId}/pages/${pageId}/cdp`, {
          method: "POST",
          headers: {
            "x-bb-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method: "Page.navigate",
            params: { url },
          }),
        });
        navigated = cdpRes.ok;
        if (!navigated) {
          console.warn("CDP navigate failed:", await cdpRes.text());
        }
      }
    }

    // If CDP navigation didn't work, try an alternative approach
    // Append the URL to the live view as a workaround
    if (!navigated) {
      console.log("CDP navigation not available, session will show default page");
    }

    return new Response(
      JSON.stringify({
        sessionId,
        liveViewUrl,
        navigated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating browser session:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
