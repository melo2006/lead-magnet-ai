import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';
const LOVABLE_AI_BASE = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const EXA_BASE = 'https://api.exa.ai';

// Structured schema for Firecrawl AI JSON extraction
const BUSINESS_SCHEMA = {
  type: 'object',
  properties: {
    business_name: { type: 'string', description: 'Official business name' },
    tagline: { type: 'string', description: 'Business tagline or slogan' },
    about: { type: 'string', description: 'About the business, mission statement, or company description (2-4 sentences)' },
    services: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'string' },
        },
        required: ['name'],
      },
      description: 'List of services or products offered with optional pricing',
    },
    pricing: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          price: { type: 'string' },
          details: { type: 'string' },
        },
        required: ['item'],
      },
      description: 'Pricing tiers or packages if available',
    },
    faqs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
        },
        required: ['question', 'answer'],
      },
      description: 'Frequently asked questions and answers',
    },
    service_areas: {
      type: 'array',
      items: { type: 'string' },
      description: 'Geographic areas or cities served',
    },
    team_members: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
        },
        required: ['name'],
      },
      description: 'Key team members or staff',
    },
    unique_selling_points: {
      type: 'array',
      items: { type: 'string' },
      description: 'What makes this business stand out (certifications, awards, guarantees, years in business)',
    },
    contact_info: {
      type: 'object',
      properties: {
        phone: { type: 'string' },
        email: { type: 'string' },
        address: { type: 'string' },
      },
      description: 'Contact information found on the website',
    },
    business_hours: { type: 'string', description: 'Operating hours if listed' },
    social_links: {
      type: 'object',
      properties: {
        facebook: { type: 'string' },
        instagram: { type: 'string' },
        linkedin: { type: 'string' },
        twitter: { type: 'string' },
        youtube: { type: 'string' },
        yelp: { type: 'string' },
      },
      description: 'Social media profile URLs',
    },
  },
  required: ['business_name'],
};

/** Search Exa for company/owner intelligence (FREE — 1,000 requests/month) */
async function exaResearch(
  apiKey: string,
  businessName: string,
  websiteUrl: string,
): Promise<{
  linkedinUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  snippets: string[];
}> {
  const result = {
    linkedinUrl: null as string | null,
    facebookUrl: null as string | null,
    instagramUrl: null as string | null,
    snippets: [] as string[],
  };

  const domain = (() => {
    try { return new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`).hostname.replace(/^www\./, ''); } catch { return ''; }
  })();

  // Search 1: Find owner/manager info + company details
  try {
    console.log('[Exa] Searching for owner info:', businessName, domain);
    const ownerRes = await fetch(`${EXA_BASE}/search`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `"${businessName}" owner OR founder OR manager OR CEO ${domain}`,
        num_results: 5,
        type: 'auto',
        contents: { text: { max_characters: 500 }, highlights: { num_sentences: 3 } },
      }),
    });

    if (ownerRes.ok) {
      const ownerData = await ownerRes.json();
      for (const r of ownerData.results || []) {
        const text = (r.text || '') + ' ' + ((r.highlights || []).join(' '));
        result.snippets.push(text.slice(0, 400));
        if (!result.linkedinUrl && r.url?.includes('linkedin.com/in/')) {
          result.linkedinUrl = r.url;
        }
      }
    } else {
      console.warn('[Exa] Owner search failed:', ownerRes.status);
    }
  } catch (err) {
    console.warn('[Exa] Owner search error:', err);
  }

  // Search 2: Find social media profiles
  try {
    console.log('[Exa] Searching for social profiles:', businessName);
    const socialRes = await fetch(`${EXA_BASE}/search`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `"${businessName}" ${domain}`,
        num_results: 5,
        type: 'auto',
        include_domains: ['linkedin.com', 'facebook.com', 'instagram.com', 'yelp.com'],
        contents: { text: { max_characters: 200 } },
      }),
    });

    if (socialRes.ok) {
      const socialData = await socialRes.json();
      for (const r of socialData.results || []) {
        const url = r.url || '';
        if (!result.linkedinUrl && url.includes('linkedin.com')) result.linkedinUrl = url;
        if (!result.facebookUrl && url.includes('facebook.com')) result.facebookUrl = url;
        if (!result.instagramUrl && url.includes('instagram.com')) result.instagramUrl = url;
      }
    } else {
      console.warn('[Exa] Social search failed:', socialRes.status);
    }
  } catch (err) {
    console.warn('[Exa] Social search error:', err);
  }

  console.log('[Exa] Research complete:', {
    linkedinFound: !!result.linkedinUrl,
    facebookFound: !!result.facebookUrl,
    instagramFound: !!result.instagramUrl,
    snippets: result.snippets.length,
  });

  return result;
}


  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prospect_id, website_url, business_name, niche } = await req.json();

    if (!prospect_id || !website_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'prospect_id and website_url are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const exaApiKey = Deno.env.get('EXA_API_KEY');
    const browserlessKey = Deno.env.get('BROWSERLESS_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let markdown = '';
    let websiteScreenshot = '';
    let hasChatWidget = false;
    let hasVoiceAi = false;
    let hasOnlineBooking = false;
    let websiteQualityScore = 0;
    let businessData: Record<string, any> = {};
    let brandingData: Record<string, any> = {};

    // Step 1: Scrape with Firecrawl — structured JSON + branding + screenshot + markdown
    if (firecrawlKey) {
      try {
        const url = website_url.startsWith('http') ? website_url : `https://${website_url}`;
        console.log('Scraping website with structured extraction:', url);

        const response = await fetch(`${FIRECRAWL_BASE}/scrape`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            formats: [
              'markdown',
              'screenshot',
              'branding',
              {
                type: 'json',
                schema: BUSINESS_SCHEMA,
              },
            ],
            onlyMainContent: false,
            waitFor: 3000,
            timeout: 30000,
          }),
        });

        const data = await response.json().catch(() => null);
        if (response.ok) {
          const payload = data?.data ?? data ?? {};
          markdown = payload.markdown || '';
          websiteScreenshot = payload.screenshot || '';
          businessData = payload.json || {};
          brandingData = payload.branding || {};

          // Merge social links from structured extraction
          const socialLinks = businessData.social_links || {};

          // Detect tech from HTML-level markdown
          const htmlLower = (markdown || '').toLowerCase();

          const chatPatterns = [
            'tawk.to', 'tidio', 'intercom', 'drift', 'crisp', 'zendesk',
            'livechat', 'hubspot', 'freshchat', 'olark', 'chatwoot',
            'chatbot', 'chat-widget', 'chat_widget', 'messenger-widget',
            'botpress', 'landbot', 'manychat', 'dialogflow',
            'smartsupp', 'pure-chat', 'jivochat', 'userlike',
          ];
          hasChatWidget = chatPatterns.some(p => htmlLower.includes(p));

          const voicePatterns = [
            'retell', 'vapi', 'bland.ai', 'voiceflow', 'play.ai',
            'voice-agent', 'voice_agent', 'ai-phone',
            'callrail', 'aircall', 'dialpad',
          ];
          hasVoiceAi = voicePatterns.some(p => htmlLower.includes(p));

          const bookingPatterns = [
            'calendly', 'acuity', 'booksy', 'square appointments',
            'book-now', 'book_now', 'booknow', 'schedule-appointment',
            'appointlet', 'setmore', 'vagaro', 'mindbody',
            'simplybook', 'cal.com', 'housecallpro', 'jobber',
            'book online', 'book an appointment', 'schedule now',
          ];
          hasOnlineBooking = bookingPatterns.some(p => htmlLower.includes(p));

          // Quality scoring
          let quality = 50;
          if (url.startsWith('https')) quality += 10;
          if (htmlLower.includes('viewport')) quality += 10;
          if (htmlLower.includes('schema.org') || htmlLower.includes('jsonld')) quality += 10;
          if (htmlLower.length > 10000) quality += 5;
          if (htmlLower.includes('google-analytics') || htmlLower.includes('gtag') || htmlLower.includes('gtm')) quality += 10;
          if ((businessData.services?.length || 0) > 0) quality += 5;
          websiteQualityScore = Math.min(100, quality);

          console.log('Structured extraction result:', {
            servicesFound: businessData.services?.length || 0,
            faqsFound: businessData.faqs?.length || 0,
            pricingFound: businessData.pricing?.length || 0,
            hasBranding: !!brandingData.colors,
          });
        } else {
          console.error('Firecrawl scrape failed:', data);
        }
      } catch (err) {
        console.error('Scrape error:', err);
      }
    }

    // Step 2: AI Sales Analysis (uses structured data for richer assessment)
    let aiAnalysis = '';
    let enrichmentData: Record<string, any> = {};
    if (lovableApiKey) {
      try {
        const structuredSummary = [
          `Business: ${businessData.business_name || business_name}`,
          `Website: ${website_url}`,
          `Niche: ${niche || 'unknown'}`,
          businessData.about ? `About: ${businessData.about}` : '',
          businessData.services?.length ? `Services (${businessData.services.length}): ${businessData.services.map((s: any) => s.name).join(', ')}` : '',
          businessData.pricing?.length ? `Pricing tiers: ${businessData.pricing.length}` : 'No pricing found on website',
          businessData.faqs?.length ? `FAQs: ${businessData.faqs.length} found` : 'No FAQs found',
          businessData.unique_selling_points?.length ? `USPs: ${businessData.unique_selling_points.join('; ')}` : '',
          `Has Chat Widget: ${hasChatWidget}`,
          `Has Voice AI: ${hasVoiceAi}`,
          `Has Online Booking: ${hasOnlineBooking}`,
          `Website Quality Score: ${websiteQualityScore}/100`,
          markdown ? `Additional context (first 2000 chars):\n${markdown.slice(0, 2000)}` : '',
        ].filter(Boolean).join('\n');

        const response = await fetch(LOVABLE_AI_BASE, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content: `You are a sales intelligence analyst for an AI agency that sells voice AI agents, AI chatbots, and automation solutions to local businesses.

Analyze the prospect and return a JSON object with these fields:
- "sales_assessment": A concise 2-3 sentence sales assessment (is this a good lead, what AI services are they missing, recommended approach)
- "owner_name": The business owner or manager name if found (null if not found)
- "owner_email": Owner/manager email if found (null if not found)
- "owner_phone": Owner/manager personal phone if found (null if not found)
- "linkedin_url": LinkedIn profile URL if found (null if not found)
- "facebook_url": Facebook page URL if found (null if not found)
- "instagram_url": Instagram profile URL if found (null if not found)
- "whatsapp_number": WhatsApp number if found (null if not found)
- "contact_method": Best way to reach the decision-maker: "mobile", "email", "linkedin", "facebook", "instagram", "whatsapp", "business_phone", or "unknown"

Be direct and specific. Return ONLY valid JSON, no markdown formatting or code blocks.`,
              },
              { role: 'user', content: structuredSummary },
            ],
          }),
        });

        if (response.ok) {
          const completion = await response.json();
          const raw = completion?.choices?.[0]?.message?.content?.trim() || '';
          try {
            const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            aiAnalysis = parsed.sales_assessment || raw;
            enrichmentData = {
              owner_name: parsed.owner_name || null,
              owner_email: parsed.owner_email || null,
              owner_phone: parsed.owner_phone || null,
              linkedin_url: parsed.linkedin_url || null,
              facebook_url: parsed.facebook_url || null,
              instagram_url: parsed.instagram_url || null,
              whatsapp_number: parsed.whatsapp_number || null,
              contact_method: parsed.contact_method || 'unknown',
            };

            // Merge social links from structured scrape if AI didn't find them
            const socialLinks = businessData.social_links || {};
            if (!enrichmentData.facebook_url && socialLinks.facebook) enrichmentData.facebook_url = socialLinks.facebook;
            if (!enrichmentData.instagram_url && socialLinks.instagram) enrichmentData.instagram_url = socialLinks.instagram;
            if (!enrichmentData.linkedin_url && socialLinks.linkedin) enrichmentData.linkedin_url = socialLinks.linkedin;
          } catch {
            aiAnalysis = raw;
          }
        } else if (response.status === 429) {
          aiAnalysis = 'Analysis temporarily unavailable (rate limited). Try again shortly.';
        } else if (response.status === 402) {
          aiAnalysis = 'AI analysis requires credits. Please add funds to continue.';
        }
      } catch (err) {
        console.error('AI analysis error:', err);
        aiAnalysis = 'AI analysis unavailable.';
      }
    }

    // Step 3: Build voice agent context from structured data
    const voiceAgentContext = buildVoiceAgentContext(businessData, business_name, niche);

    // Step 4: Update the prospect in the database
    const updateData: Record<string, any> = {
      has_chat_widget: hasChatWidget,
      has_voice_ai: hasVoiceAi,
      has_online_booking: hasOnlineBooking,
      website_quality_score: websiteQualityScore,
      website_screenshot: websiteScreenshot || null,
      ai_analysis: aiAnalysis,
      ai_analyzed: true,
      business_data: {
        ...businessData,
        branding: brandingData,
        voice_agent_context: voiceAgentContext,
      },
      ...enrichmentData,
    };

    const { error: updateError } = await supabase
      .from('prospects')
      .update(updateData)
      .eq('id', prospect_id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update prospect: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          has_chat_widget: hasChatWidget,
          has_voice_ai: hasVoiceAi,
          has_online_booking: hasOnlineBooking,
          website_quality_score: websiteQualityScore,
          ai_analysis: aiAnalysis,
          business_data: businessData,
          branding: brandingData,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Analyze prospect error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Build a concise, structured context string for the Retell voice agent
 * so it can "talk shop" about the business's real services, pricing, and FAQs.
 */
function buildVoiceAgentContext(
  data: Record<string, any>,
  fallbackName: string,
  niche?: string,
): string {
  const parts: string[] = [];

  const name = data.business_name || fallbackName;
  parts.push(`Business: ${name}`);
  if (niche) parts.push(`Industry: ${niche}`);
  if (data.tagline) parts.push(`Tagline: ${data.tagline}`);
  if (data.about) parts.push(`About: ${data.about}`);

  if (data.services?.length) {
    const serviceLines = data.services.map((s: any) => {
      let line = `- ${s.name}`;
      if (s.price) line += ` ($${s.price})`;
      if (s.description) line += `: ${s.description}`;
      return line;
    });
    parts.push(`Services:\n${serviceLines.join('\n')}`);
  }

  if (data.pricing?.length) {
    const pricingLines = data.pricing.map((p: any) => {
      let line = `- ${p.item}`;
      if (p.price) line += `: ${p.price}`;
      if (p.details) line += ` (${p.details})`;
      return line;
    });
    parts.push(`Pricing:\n${pricingLines.join('\n')}`);
  }

  if (data.faqs?.length) {
    const faqLines = data.faqs.slice(0, 8).map((f: any) =>
      `Q: ${f.question}\nA: ${f.answer}`
    );
    parts.push(`FAQs:\n${faqLines.join('\n\n')}`);
  }

  if (data.service_areas?.length) {
    parts.push(`Service areas: ${data.service_areas.join(', ')}`);
  }

  if (data.unique_selling_points?.length) {
    parts.push(`Why choose us: ${data.unique_selling_points.join('; ')}`);
  }

  if (data.business_hours) {
    parts.push(`Hours: ${data.business_hours}`);
  }

  return parts.join('\n\n');
}
