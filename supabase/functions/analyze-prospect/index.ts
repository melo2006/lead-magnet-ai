import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';
const LOVABLE_AI_BASE = 'https://ai.gateway.lovable.dev/v1/chat/completions';

Deno.serve(async (req) => {
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let html = '';
    let markdown = '';
    let websiteScreenshot = '';
    let hasChatWidget = false;
    let hasVoiceAi = false;
    let hasOnlineBooking = false;
    let websiteQualityScore = 0;

    // Step 1: Scrape the website with Firecrawl
    if (firecrawlKey) {
      try {
        const url = website_url.startsWith('http') ? website_url : `https://${website_url}`;
        console.log('Scraping website:', url);

        const response = await fetch(`${FIRECRAWL_BASE}/scrape`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            formats: ['html', 'markdown', 'screenshot'],
            onlyMainContent: false,
            waitFor: 3000,
            timeout: 30000,
          }),
        });

        const data = await response.json().catch(() => null);
        if (response.ok) {
          const payload = data?.data ?? data ?? {};
          html = (payload.html || '').toLowerCase();
          markdown = payload.markdown || '';

          // Detect chat widgets
          const chatPatterns = [
            'tawk.to', 'tidio', 'intercom', 'drift', 'crisp', 'zendesk',
            'livechat', 'hubspot', 'freshchat', 'olark', 'chatwoot',
            'chatbot', 'chat-widget', 'chat_widget', 'messenger-widget',
            'fb-messenger', 'whatsapp-widget', 'botpress', 'landbot',
            'manychat', 'dialogflow', 'chatfuel', 'kommunicate',
            'smartsupp', 'pure-chat', 'jivochat', 'userlike',
            'widget.intercom', 'js.intercomcdn', 'embed.tawk',
          ];
          hasChatWidget = chatPatterns.some(p => html.includes(p));

          // Detect voice AI
          const voicePatterns = [
            'retell', 'vapi', 'bland.ai', 'voiceflow', 'play.ai',
            'voice-agent', 'voice_agent', 'ai-phone', 'ai_phone',
            'callrail', 'aircall', 'dialpad', 'ringcentral',
          ];
          hasVoiceAi = voicePatterns.some(p => html.includes(p));

          // Detect online booking
          const bookingPatterns = [
            'calendly', 'acuity', 'booksy', 'square appointments',
            'book-now', 'book_now', 'booknow', 'schedule-appointment',
            'schedule_appointment', 'booking-widget', 'booking_widget',
            'appointlet', 'setmore', 'vagaro', 'mindbody',
            'schedulista', 'simplybook', 'zcal', 'cal.com',
            'housecallpro', 'jobber', 'servicetitan',
            'book online', 'book an appointment', 'schedule now',
            'book a consultation', 'request appointment',
          ];
          hasOnlineBooking = bookingPatterns.some(p => html.includes(p));

          // Website quality scoring
          let quality = 50;
          if (html.includes('ssl') || website_url.startsWith('https')) quality += 10;
          if (html.includes('responsive') || html.includes('viewport')) quality += 10;
          if (html.includes('schema.org') || html.includes('jsonld')) quality += 10;
          if (!html.includes('wordpress') && !html.includes('wix') && !html.includes('squarespace')) quality += 5;
          if (html.length > 10000) quality += 5;
          if (html.includes('google-analytics') || html.includes('gtag') || html.includes('gtm')) quality += 10;
          websiteQualityScore = Math.min(100, quality);
        } else {
          console.error('Firecrawl scrape failed:', data);
        }
      } catch (err) {
        console.error('Scrape error:', err);
      }
    }

    // Step 2: AI Analysis
    let aiAnalysis = '';
    let enrichmentData: Record<string, any> = {};
    if (lovableApiKey) {
      try {
        const context = [
          `Business: ${business_name}`,
          `Website: ${website_url}`,
          `Niche: ${niche || 'unknown'}`,
          `Has Chat Widget: ${hasChatWidget}`,
          `Has Voice AI: ${hasVoiceAi}`,
          `Has Online Booking: ${hasOnlineBooking}`,
          `Website Quality Score: ${websiteQualityScore}/100`,
          markdown ? `Website Content (first 3000 chars):\n${markdown.slice(0, 3000)}` : 'No website content available',
        ].join('\n');

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
- "owner_name": The business owner or manager name if found on the website (null if not found)
- "owner_email": Owner/manager email if found (null if not found)
- "owner_phone": Owner/manager personal or mobile phone if found, different from business line (null if not found)
- "linkedin_url": LinkedIn profile URL if found (null if not found)
- "facebook_url": Facebook page URL if found (null if not found)
- "instagram_url": Instagram profile URL if found (null if not found)
- "whatsapp_number": WhatsApp number if found (null if not found)
- "contact_method": Best way to reach the decision-maker: "mobile", "email", "linkedin", "facebook", "instagram", "whatsapp", "business_phone", or "unknown"

Be direct and specific. Return ONLY valid JSON, no markdown formatting or code blocks.`,
              },
              { role: 'user', content: context },
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

    // Step 3: Update the prospect in the database
    const updateData: Record<string, any> = {
      has_chat_widget: hasChatWidget,
      has_voice_ai: hasVoiceAi,
      has_online_booking: hasOnlineBooking,
      website_quality_score: websiteQualityScore,
      ai_analysis: aiAnalysis,
      ai_analyzed: true,
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
