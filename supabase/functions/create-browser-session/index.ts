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
    const connectUrl = session.connectUrl;
    if (!sessionId) throw new Error("No session ID returned");

    console.log("Session created:", sessionId);

    // 2. Get debug URLs immediately (1 quick attempt)
    await new Promise((r) => setTimeout(r, 2000));

    const debugRes = await fetch(`${BROWSERBASE_API_URL}/sessions/${sessionId}/debug`, {
      headers: { "x-bb-api-key": apiKey },
    });

    if (!debugRes.ok) {
      throw new Error(`Debug fetch failed: ${debugRes.status}`);
    }

    const debugInfo = await debugRes.json();
    const liveViewUrl = debugInfo.debuggerFullscreenUrl;

    if (!liveViewUrl) {
      throw new Error("No live view URL returned");
    }

    // 3. Try to navigate via CDP WebSocket (quick attempt)
    let navigated = false;
    if (connectUrl) {
      try {
        navigated = await navigateViaCDP(connectUrl, url);
      } catch (e) {
        console.warn("CDP WebSocket navigation failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ sessionId, liveViewUrl, connectUrl, navigated }),
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

async function navigateViaCDP(connectUrl: string, targetUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 8000);

    try {
      const ws = new WebSocket(connectUrl);

      ws.onopen = () => {
        console.log("CDP WebSocket connected, sending navigate command");
        ws.send(JSON.stringify({
          id: 1,
          method: "Page.navigate",
          params: { url: targetUrl },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.id === 1) {
            console.log("CDP navigate response:", JSON.stringify(data));
            clearTimeout(timeout);
            ws.close();
            resolve(!data.error);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = (e) => {
        console.warn("CDP WebSocket error:", e);
        clearTimeout(timeout);
        resolve(false);
      };
    } catch (e) {
      console.warn("WebSocket creation failed:", e);
      clearTimeout(timeout);
      resolve(false);
    }
  });
}
