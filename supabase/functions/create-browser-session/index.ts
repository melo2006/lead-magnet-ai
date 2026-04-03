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
    }, 10000);

    let msgId = 0;
    let pageSessionId: string | null = null;

    try {
      const ws = new WebSocket(connectUrl);

      ws.onopen = () => {
        console.log("CDP connected, getting targets");
        // Get all targets to find the page
        ws.send(JSON.stringify({ id: ++msgId, method: "Target.getTargets" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Response to Target.getTargets
          if (data.id === 1 && data.result?.targetInfos) {
            const pageTarget = data.result.targetInfos.find(
              (t: any) => t.type === "page"
            );
            if (pageTarget) {
              console.log("Found page target:", pageTarget.targetId);
              // Attach to the page target
              ws.send(JSON.stringify({
                id: ++msgId,
                method: "Target.attachToTarget",
                params: { targetId: pageTarget.targetId, flatten: true },
              }));
            } else {
              console.warn("No page target found");
              clearTimeout(timeout);
              ws.close();
              resolve(false);
            }
          }

          // Response to Target.attachToTarget
          if (data.id === 2 && data.result?.sessionId) {
            pageSessionId = data.result.sessionId;
            console.log("Attached to page, sessionId:", pageSessionId);
            // Now navigate within the page session
            ws.send(JSON.stringify({
              id: ++msgId,
              method: "Page.navigate",
              params: { url: targetUrl },
              sessionId: pageSessionId,
            }));
          }

          // Response to Page.navigate
          if (data.id === 3) {
            const success = !data.error;
            console.log("Navigate result:", success ? "success" : JSON.stringify(data.error));
            clearTimeout(timeout);
            ws.close();
            resolve(success);
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    } catch {
      clearTimeout(timeout);
      resolve(false);
    }
  });
}
