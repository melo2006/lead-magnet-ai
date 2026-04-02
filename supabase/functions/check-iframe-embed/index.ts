const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
};

const stripQuotes = (value: string) => value.trim().replace(/^['"]|['"]$/g, "");

const getOrigin = (value: string | null | undefined) => {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const wildcardHostMatch = (hostname: string, pattern: string) => {
  const normalizedPattern = pattern.replace(/^\*\./, "").toLowerCase();
  const normalizedHost = hostname.toLowerCase();

  return normalizedHost === normalizedPattern || normalizedHost.endsWith(`.${normalizedPattern}`);
};

const parseFrameAncestors = (cspHeader: string | null) => {
  if (!cspHeader) return null;

  const directive = cspHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("frame-ancestors"));

  if (!directive) return null;

  return directive
    .split(/\s+/)
    .slice(1)
    .map(stripQuotes)
    .filter(Boolean);
};

const matchesSourceExpression = (source: string, embedOrigin: string, targetOrigin: string) => {
  const normalizedSource = stripQuotes(source);
  const lowerSource = normalizedSource.toLowerCase();

  if (!normalizedSource) return false;
  if (normalizedSource === "*") return true;
  if (lowerSource === "none") return false;
  if (lowerSource === "self") return embedOrigin === targetOrigin;

  try {
    const embedUrl = new URL(embedOrigin);

    if (/^[a-z][a-z0-9+.-]*:$/i.test(normalizedSource)) {
      return embedUrl.protocol === normalizedSource.toLowerCase();
    }

    if (normalizedSource.startsWith("*.")) {
      return wildcardHostMatch(embedUrl.hostname, normalizedSource);
    }

    if (normalizedSource.includes("://")) {
      const [scheme, hostPattern] = normalizedSource.split("://");
      if (!hostPattern) return false;
      if (embedUrl.protocol !== `${scheme.toLowerCase()}:`) return false;

      return hostPattern.startsWith("*.")
        ? wildcardHostMatch(embedUrl.hostname, hostPattern)
        : embedUrl.host.toLowerCase() === hostPattern.toLowerCase();
    }

    return wildcardHostMatch(embedUrl.hostname, normalizedSource);
  } catch {
    return false;
  }
};

const isFrameAncestorsAllowed = (sources: string[] | null, embedOrigin: string, targetOrigin: string) => {
  if (!sources || sources.length === 0) return true;
  if (sources.some((source) => stripQuotes(source).toLowerCase() === "none")) return false;

  return sources.some((source) => matchesSourceExpression(source, embedOrigin, targetOrigin));
};

const isXFrameOptionsAllowed = (headerValue: string | null, embedOrigin: string, targetOrigin: string) => {
  if (!headerValue) return true;

  const directives = headerValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  for (const directive of directives) {
    const lowerDirective = directive.toLowerCase();

    if (lowerDirective === "deny") return false;
    if (lowerDirective === "sameorigin") return embedOrigin === targetOrigin;

    if (lowerDirective.startsWith("allow-from")) {
      const allowedOrigin = getOrigin(directive.split(/\s+/).slice(1).join(" "));
      return allowedOrigin ? allowedOrigin === embedOrigin : false;
    }
  }

  return true;
};

const fetchResponse = async (url: string) => {
  let lastError: unknown = null;

  for (const method of ["HEAD", "GET"] as const) {
    try {
      const response = await fetch(url, {
        method,
        redirect: "follow",
        headers: {
          "user-agent": "LovableIframeChecker/1.0",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (response.status !== 405 && response.status !== 501) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Unable to inspect iframe headers");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, embedOrigin } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ success: false, error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedUrl = normalizeUrl(url);
    const response = await fetchResponse(normalizedUrl);
    const finalUrl = response.url || normalizedUrl;
    const targetOrigin = getOrigin(finalUrl) || getOrigin(normalizedUrl) || normalizedUrl;
    const safeEmbedOrigin = getOrigin(typeof embedOrigin === "string" ? embedOrigin : "") || "";
    const xFrameOptions = response.headers.get("x-frame-options");
    const frameAncestors = parseFrameAncestors(response.headers.get("content-security-policy"));

    const embeddable = safeEmbedOrigin
      ? isXFrameOptionsAllowed(xFrameOptions, safeEmbedOrigin, targetOrigin) &&
        isFrameAncestorsAllowed(frameAncestors, safeEmbedOrigin, targetOrigin)
      : true;

    return new Response(
      JSON.stringify({
        success: true,
        checked: true,
        embeddable,
        finalUrl,
        headers: {
          xFrameOptions,
          frameAncestors,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("check-iframe-embed failed:", error);

    return new Response(
      JSON.stringify({
        success: true,
        checked: false,
        embeddable: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});