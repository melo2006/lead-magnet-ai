const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';
const LOVABLE_AI_BASE = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const ALLOWED_NICHES = ['realtors', 'medspa', 'autodetail', 'veterinary', 'marine', 'general'] as const;
type AllowedNiche = (typeof ALLOWED_NICHES)[number];

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
};

const unwrapFirecrawlPayload = (payload: any) => payload?.data?.data ?? payload?.data ?? payload ?? {};

const cleanText = (value?: string | null) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

const truncate = (value: string, max: number) => value.slice(0, max);

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const parseJsonContent = (value: string) => {
  const cleaned = value
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(cleaned);
};

const getHost = (value: string) => {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const mapDetectedNiche = (value?: string | null, fallback?: string | null): AllowedNiche => {
  const normalized = cleanText(value).toLowerCase();
  const candidate = normalized || cleanText(fallback).toLowerCase();

  if (/realtor|real estate|property/.test(candidate)) return 'realtors';
  if (/medspa|med spa|aesthetic|injectable|botox|facial|skin/.test(candidate)) return 'medspa';
  if (/detail|detailing|ceramic|paint correction|car wash|vehicle/.test(candidate)) return 'autodetail';
  if (/vet|veterinar|animal hospital|pet clinic|pet care/.test(candidate)) return 'veterinary';
  if (/marine|boat|yacht|dock|outboard|inboard|haul/.test(candidate)) return 'marine';
  return 'general';
};

const inferNicheFromKeywords = (value: string, fallback?: string | null): AllowedNiche => mapDetectedNiche(value, fallback);

const pickRelevantLinks = (links: string[], rootUrl: string) => {
  const rootHost = getHost(rootUrl);
  const excluded = /(privacy|terms|login|signin|signup|cart|checkout|wp-admin|feed|tag\/|category\/|author\/)/i;
  const preferred = /(about|service|services|treatment|package|pricing|faq|contact|location|locations|team|gallery|reviews|testimonial|book|appointment|schedule|quote|estimate)/i;

  return unique(
    links
      .map((link) => cleanText(link))
      .filter(Boolean)
      .filter((link) => /^https?:\/\//i.test(link))
      .filter((link) => getHost(link) === rootHost)
      .filter((link) => !excluded.test(link))
      .sort((a, b) => Number(preferred.test(b)) - Number(preferred.test(a))),
  )
    .filter((link) => link !== rootUrl)
    .slice(0, 6);
};

async function firecrawlRequest(path: string, apiKey: string, body: Record<string, unknown>, retries = 2): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Increase timeout on each retry
    const requestBody = { ...body };
    if (attempt > 0) {
      requestBody.timeout = 60000; // 60s on retries
      // Drop heavy formats on retry to reduce timeout risk
      if (Array.isArray(requestBody.formats)) {
        requestBody.formats = (requestBody.formats as string[]).filter(
          (f: string) => !f.startsWith('screenshot')
        );
      }
      console.log(`Firecrawl retry ${attempt} for ${path} (simplified formats)`);
    }

    const response = await fetch(`${FIRECRAWL_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => null);

    if (response.ok) return data;

    lastError = new Error(`Firecrawl error [${response.status}]: ${JSON.stringify(data)}`);

    // Only retry on timeout (408) or server errors (5xx)
    const isRetryable = response.status === 408 || response.status >= 500;
    if (!isRetryable || attempt === retries) break;

    // Brief pause before retry
    await new Promise((r) => setTimeout(r, 1500));
  }

  throw lastError!;
}

async function scrapeMarkdownPage(url: string, apiKey: string) {
  const response = await firecrawlRequest('/scrape', apiKey, {
    url,
    formats: ['markdown', 'summary'],
    onlyMainContent: true,
    waitFor: 2500,
  });

  const data = unwrapFirecrawlPayload(response);
  const markdown = cleanText(data.markdown);
  const summary = cleanText(data.summary);
  const title = cleanText(data.metadata?.title);

  return {
    url,
    title,
    summary,
    markdown: truncate(markdown, 6000),
  };
}

async function webResearch(firecrawlKey: string, queries: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const query of queries) {
    try {
      const response = await fetch(`${FIRECRAWL_BASE}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, limit: 5 }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && Array.isArray(data?.data)) {
        for (const item of data.data) {
          const snippet = [
            item.title ? `**${item.title}**` : '',
            item.description || '',
            item.markdown ? truncate(cleanText(item.markdown), 1500) : '',
          ].filter(Boolean).join('\n');
          if (snippet.length > 10) results.push(snippet);
        }
      }
    } catch (err) {
      console.warn(`Web research failed for query "${query}":`, err);
    }
    // Small delay between searches to avoid rate limits
    await new Promise((r) => setTimeout(r, 800));
  }
  return results;
}

async function analyzeBusinessProfile({
  lovableApiKey,
  websiteUrl,
  providedBusinessName,
  initialNiche,
  title,
  description,
  homepageMarkdown,
  combinedContent,
}: {
  lovableApiKey?: string | null;
  websiteUrl: string;
  providedBusinessName?: string | null;
  initialNiche?: string | null;
  title?: string | null;
  description?: string | null;
  homepageMarkdown: string;
  combinedContent: string;
}) {
  const fallbackNiche = inferNicheFromKeywords(`${title ?? ''}\n${description ?? ''}\n${combinedContent}`, initialNiche);
  const fallbackName = cleanText(providedBusinessName) || cleanText(title) || getHost(websiteUrl) || 'This business';
  const fallbackSummary = cleanText(description) || `Modern, clearer positioning for ${fallbackName}.`;

  if (!lovableApiKey) {
    return {
      businessName: fallbackName,
      detectedNiche: fallbackNiche,
      summary: fallbackSummary,
      serviceArea: '',
      serviceHighlights: [],
      trustSignals: [],
      faqs: [],
      toneKeywords: ['friendly', 'helpful', 'clear'],
      audience: '',
      callGoals: ['Answer questions clearly', 'Guide the caller to the next step'],
      pricing: [],
      competitors: [],
      reviews: [],
    };
  }

  const source = truncate(
    [
      `Website URL: ${websiteUrl}`,
      providedBusinessName ? `Business name from form: ${providedBusinessName}` : '',
      title ? `Title: ${title}` : '',
      description ? `Description: ${description}` : '',
      homepageMarkdown ? `Homepage content:\n${homepageMarkdown}` : '',
      combinedContent ? `Additional website content:\n${combinedContent}` : '',
      initialNiche ? `Initial niche hint from the form: ${initialNiche}` : '',
    ].filter(Boolean).join('\n\n'),
    18000,
  );

  try {
    const response = await fetch(LOVABLE_AI_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Extract a comprehensive business profile from website content. Return strict JSON with these keys only: businessName (string), detectedNiche (string), summary (string), serviceArea (string with city/region/state), serviceHighlights (array of up to 8 short strings describing specific services offered), trustSignals (array of up to 6 short strings), faqs (array of up to 6 question strings a typical caller would ask), toneKeywords (array of up to 5 short strings), audience (string describing target customers), callGoals (array of up to 4 short strings), pricing (array of up to 6 strings with any pricing info found e.g. "Kitchen remodel: $15k-$50k"), competitors (array of up to 3 competitor company names if mentioned). detectedNiche must be one of: realtors, medspa, autodetail, veterinary, marine, general. Use the form niche only as a weak hint. If the website contradicts it, override it. Never default to realtors unless the content clearly indicates real estate. For serviceArea, extract the specific city, region, or metro area they serve.',
          },
          {
            role: 'user',
            content: source,
          },
        ],
      }),
    });

    const completion = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`AI profile failed [${response.status}]: ${JSON.stringify(completion)}`);
    }

    const content = completion?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('AI profile response was empty');

    const parsed = parseJsonContent(content);

    return {
      businessName: cleanText(parsed.businessName) || fallbackName,
      detectedNiche: mapDetectedNiche(parsed.detectedNiche, fallbackNiche),
      summary: cleanText(parsed.summary) || fallbackSummary,
      serviceArea: cleanText(parsed.serviceArea),
      serviceHighlights: Array.isArray(parsed.serviceHighlights) ? unique(parsed.serviceHighlights.map((item: string) => cleanText(item))).slice(0, 8) : [],
      trustSignals: Array.isArray(parsed.trustSignals) ? unique(parsed.trustSignals.map((item: string) => cleanText(item))).slice(0, 6) : [],
      faqs: Array.isArray(parsed.faqs) ? unique(parsed.faqs.map((item: string) => cleanText(item))).slice(0, 6) : [],
      toneKeywords: Array.isArray(parsed.toneKeywords) ? unique(parsed.toneKeywords.map((item: string) => cleanText(item))).slice(0, 5) : ['friendly', 'helpful', 'clear'],
      audience: cleanText(parsed.audience),
      callGoals: Array.isArray(parsed.callGoals) ? unique(parsed.callGoals.map((item: string) => cleanText(item))).slice(0, 4) : ['Answer questions clearly', 'Guide the caller to the next step'],
      pricing: Array.isArray(parsed.pricing) ? unique(parsed.pricing.map((item: string) => cleanText(item))).slice(0, 6) : [],
      competitors: Array.isArray(parsed.competitors) ? unique(parsed.competitors.map((item: string) => cleanText(item))).slice(0, 3) : [],
      reviews: [] as string[],
    };
  } catch (error) {
    console.warn('AI business profile failed, using fallback:', error);
    return {
      businessName: fallbackName,
      detectedNiche: fallbackNiche,
      summary: fallbackSummary,
      serviceArea: '',
      serviceHighlights: [],
      trustSignals: [],
      faqs: [],
      toneKeywords: ['friendly', 'helpful', 'clear'],
      audience: '',
      callGoals: ['Answer questions clearly', 'Guide the caller to the next step'],
      pricing: [],
      competitors: [],
      reviews: [],
    };
  }
}

const NICHE_FALLBACK_KNOWLEDGE: Record<AllowedNiche, { services: string[]; trust: string[]; faqs: string[] }> = {
  realtors: {
    services: ['Buyer and seller representation', 'Listing strategy and market pricing', 'Showings and offer coordination'],
    trust: ['Fast response to inbound leads', 'Neighborhood and market expertise', 'Transparent communication from first contact to closing'],
    faqs: ['How quickly can I book a showing?', 'Can you help me price my home?', 'What neighborhoods fit my budget?'],
  },
  medspa: {
    services: ['Consultations and treatment planning', 'Injectables and skincare programs', 'Follow-up care guidance'],
    trust: ['Licensed, experienced providers', 'Comfort-first appointment experience', 'Clear aftercare and results expectations'],
    faqs: ['Which treatment is best for my goals?', 'How long is recovery?', 'Do you offer consultations?'],
  },
  autodetail: {
    services: ['Interior and exterior detailing', 'Paint correction and ceramic coating', 'Protection packages and maintenance plans'],
    trust: ['Consistent quality and turnaround', 'Clear package recommendations', 'Protection-focused service approach'],
    faqs: ['What package do you recommend?', 'How long does service take?', 'Do you offer ceramic coating?'],
  },
  veterinary: {
    services: ['Wellness and preventive care', 'Vaccinations and diagnostics', 'Urgent pet concerns triage'],
    trust: ['Compassionate pet-first communication', 'Clear care plans and follow-up', 'Responsive scheduling support'],
    faqs: ['Do you accept new patients?', 'What should I do for urgent symptoms?', 'How do I schedule a visit?'],
  },
  marine: {
    services: ['Routine boat maintenance', 'Engine diagnostics and repair', 'Seasonal prep and service scheduling'],
    trust: ['Marine-specific technical expertise', 'Reliable turnaround windows', 'Clear recommendations and next steps'],
    faqs: ['Can you service my engine type?', 'Do you offer seasonal packages?', 'How soon can I get on the schedule?'],
  },
  general: {
    services: ['Consultation and needs assessment', 'Service recommendations by goal', 'Fast support and next-step guidance'],
    trust: ['Prompt customer communication', 'Clear pricing and process expectations', 'Professional service delivery'],
    faqs: ['What services do you offer?', 'How quickly can I get started?', 'What is your process?'],
  },
};

const buildStructuredKnowledge = ({
  websiteUrl,
  profile,
  homepageSummary,
  pageSummaries,
  webResearchContent,
}: {
  websiteUrl: string;
  profile: Awaited<ReturnType<typeof analyzeBusinessProfile>>;
  homepageSummary: string;
  pageSummaries: string[];
  webResearchContent?: string;
}) => {
  const nicheFallback = NICHE_FALLBACK_KNOWLEDGE[profile.detectedNiche] || NICHE_FALLBACK_KNOWLEDGE.general;

  // Use scraped services if available, otherwise fall back to niche defaults
  const services = profile.serviceHighlights.length > 0 ? profile.serviceHighlights : nicheFallback.services;
  const trust = profile.trustSignals.length > 0 ? profile.trustSignals : nicheFallback.trust;
  const faqs = profile.faqs.length > 0 ? profile.faqs : nicheFallback.faqs;

  const sections = [
    `BUSINESS NAME: ${profile.businessName}`,
    `DETECTED NICHE: ${profile.detectedNiche}`,
    profile.serviceArea ? `SERVICE AREA: ${profile.serviceArea}` : '',
    `SUMMARY: ${profile.summary}`,
    homepageSummary ? `HOMEPAGE SUMMARY: ${homepageSummary}` : '',
    profile.audience ? `TARGET AUDIENCE: ${profile.audience}` : '',
    `WEBSITE: ${websiteUrl}`,
    '',
    '=== SERVICES OFFERED ===',
    ...services.map((item) => `- ${item}`),
    '',
    profile.pricing.length > 0 ? '=== PRICING INFO ===' : '',
    ...profile.pricing.map((item) => `- ${item}`),
    '',
    '=== TRUST SIGNALS & DIFFERENTIATORS ===',
    ...trust.map((item) => `- ${item}`),
    '',
    '=== FREQUENTLY ASKED QUESTIONS ===',
    ...faqs.map((item) => `Q: ${item}`),
    '',
    '=== CALL GOALS ===',
    ...profile.callGoals.map((item) => `- ${item}`),
    '',
    '=== TONE ===',
    ...profile.toneKeywords.map((item) => `- ${item}`),
    '',
    profile.competitors.length > 0 ? '=== KNOWN COMPETITORS ===' : '',
    ...profile.competitors.map((item) => `- ${item}`),
    '',
    profile.reviews.length > 0 ? '=== CUSTOMER REVIEWS & REPUTATION ===' : '',
    ...profile.reviews.map((item) => `- ${item}`),
    '',
    ...pageSummaries.map((item) => `- Detail: ${item}`),
    '',
    webResearchContent ? `\n=== INDUSTRY & COMPETITOR RESEARCH ===\n${webResearchContent}` : '',
  ];

  return sections.filter(Boolean).join('\n');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let leadId = '';
  let supabase: ReturnType<typeof createClient> | null = null;

  try {
    const { leadId: incomingLeadId, websiteUrl, businessName, secondaryUrl, uploadedFiles, initialNiche } = await req.json();
    leadId = incomingLeadId;

    if (!leadId || !websiteUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'leadId and websiteUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Backend configuration is incomplete' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('leads').update({ scan_status: 'scanning' }).eq('id', leadId);

    const formattedUrl = normalizeUrl(websiteUrl);
    console.log('Scanning website:', formattedUrl);

    let homepageResponse: any;
    let hasScreenshot = false;

    try {
      homepageResponse = await firecrawlRequest('/scrape', firecrawlKey, {
        url: formattedUrl,
        formats: ['markdown', 'screenshot@fullPage', 'branding', 'links', 'summary'],
        onlyMainContent: false,
        waitFor: 3500,
        timeout: 45000,
      }, 1);
      hasScreenshot = true;
    } catch (screenshotErr) {
      console.warn('Full-page screenshot scrape failed, retrying without screenshot:', screenshotErr);
      // Fallback: scrape without the heavy screenshot format
      homepageResponse = await firecrawlRequest('/scrape', firecrawlKey, {
        url: formattedUrl,
        formats: ['markdown', 'branding', 'links', 'summary'],
        onlyMainContent: false,
        waitFor: 2000,
        timeout: 30000,
      }, 1);
    }

    const homepage = unwrapFirecrawlPayload(homepageResponse);
    const homepageMarkdown = cleanText(homepage.markdown);
    const homepageSummary = cleanText(homepage.summary);
    const branding = homepage.branding || {};
    const metadata = homepage.metadata || {};

    const linkPool = new Set<string>();
    if (Array.isArray(homepage.links)) {
      homepage.links.forEach((link: string) => linkPool.add(cleanText(link)));
    }

    try {
      const mapResponse = await firecrawlRequest('/map', firecrawlKey, {
        url: formattedUrl,
        limit: 30,
        includeSubdomains: false,
      });
      const links = Array.isArray(mapResponse.links) ? mapResponse.links : [];
      links.forEach((link: string) => linkPool.add(cleanText(link)));
    } catch (mapError) {
      console.warn('Firecrawl map failed, continuing with homepage links only:', mapError);
    }

    const candidateLinks = pickRelevantLinks(Array.from(linkPool), formattedUrl);
    console.log('Relevant links selected:', candidateLinks.length);

    const pageResults = await Promise.allSettled(candidateLinks.map((link) => scrapeMarkdownPage(link, firecrawlKey)));
    const successfulPages = pageResults
      .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof scrapeMarkdownPage>>> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((page) => page.markdown || page.summary);

    let secondaryContent = '';
    if (secondaryUrl && typeof secondaryUrl === 'string' && secondaryUrl.trim()) {
      try {
        const secondary = await scrapeMarkdownPage(normalizeUrl(secondaryUrl), firecrawlKey);
        secondaryContent = secondary.markdown;
      } catch (secondaryError) {
        console.warn('Secondary URL scrape error:', secondaryError);
      }
    }

    let filesContent = '';
    if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      for (const filePath of uploadedFiles) {
        try {
          const { data: fileData, error: fileErr } = await supabase.storage.from('lead-uploads').download(filePath);
          if (fileErr || !fileData) continue;

          const ext = filePath.split('.').pop()?.toLowerCase();
          if (ext === 'txt' || ext === 'md') {
            const text = await fileData.text();
            filesContent += `\n--- Uploaded file: ${filePath} ---\n${truncate(text, 10000)}\n`;
          } else {
            filesContent += `\n--- Uploaded file: ${filePath} (document provided for business context) ---\n`;
          }
        } catch (fileError) {
          console.warn('File read error:', fileError);
        }
      }
    }

    const combinedPageContent = successfulPages
      .map((page) => [page.title ? `## ${page.title}` : '', page.summary ? `Summary: ${page.summary}` : '', page.markdown].filter(Boolean).join('\n'))
      .join('\n\n')
      .slice(0, 30000);

    const profile = await analyzeBusinessProfile({
      lovableApiKey,
      websiteUrl: formattedUrl,
      providedBusinessName: cleanText(businessName),
      initialNiche,
      title: cleanText(metadata.title),
      description: cleanText(metadata.description),
      homepageMarkdown,
      combinedContent: [homepageMarkdown, combinedPageContent, secondaryContent, filesContent].filter(Boolean).join('\n\n'),
    });

    const structuredKnowledge = buildStructuredKnowledge({
      websiteUrl: formattedUrl,
      profile,
      homepageSummary,
      pageSummaries: successfulPages.map((page) => page.summary).filter(Boolean).slice(0, 6),
    });

    const fullContent = truncate(
      [
        structuredKnowledge,
        homepageMarkdown ? `\n\n=== HOMEPAGE CONTENT ===\n${homepageMarkdown}` : '',
        combinedPageContent ? `\n\n=== ADDITIONAL WEBSITE CONTENT ===\n${combinedPageContent}` : '',
        secondaryContent ? `\n\n=== SECONDARY WEBSITE ===\n${secondaryContent}` : '',
        filesContent ? `\n\n=== UPLOADED DOCUMENTS ===\n${filesContent}` : '',
      ].join(''),
      60000,
    );

    const title = cleanText(metadata.title) || profile.businessName || getHost(formattedUrl);
    const description = cleanText(metadata.description) || profile.summary;

    const updateResult = await supabase.from('leads').update({
      niche: profile.detectedNiche,
      brand_colors: branding.colors || null,
      brand_logo: branding.images?.logo || branding.logo || null,
      brand_fonts: branding.fonts || branding.typography || null,
      website_screenshot: homepage.screenshot || null,
      website_content: fullContent || null,
      website_title: title || null,
      website_description: description || null,
      scan_status: 'completed',
    }).eq('id', leadId);

    if (updateResult.error) {
      console.error('Error updating lead:', updateResult.error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save scan results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('Scan completed for lead:', leadId, '— total content length:', fullContent.length);
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          title,
          description,
          colors: branding.colors,
          logo: branding.images?.logo || branding.logo,
          screenshot: Boolean(homepage.screenshot),
          pagesScraped: successfulPages.length + 1,
          detectedNiche: profile.detectedNiche,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in scan-website:', error);

    if (supabase && leadId) {
      await supabase.from('leads').update({ scan_status: 'failed' }).eq('id', leadId);
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
