const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, websiteUrl } = await req.json();

    if (!leadId || !websiteUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'leadId and websiteUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase with service role for updates
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update scan status
    await supabase.from('leads').update({ scan_status: 'scanning' }).eq('id', leadId);

    // Format URL
    let formattedUrl = websiteUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scanning website:', formattedUrl);

    // Scrape with branding, markdown, screenshot, and links
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'screenshot', 'branding'],
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error('Firecrawl error:', scrapeData);
      await supabase.from('leads').update({ scan_status: 'failed' }).eq('id', leadId);
      return new Response(
        JSON.stringify({ success: false, error: scrapeData.error || 'Scrape failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract data from response
    const data = scrapeData.data || scrapeData;
    const branding = data.branding || {};
    const metadata = data.metadata || {};

    // Update lead with scraped data
    const updateResult = await supabase.from('leads').update({
      brand_colors: branding.colors || null,
      brand_logo: branding.images?.logo || branding.logo || null,
      brand_fonts: branding.fonts || branding.typography || null,
      website_screenshot: data.screenshot || null,
      website_content: data.markdown?.substring(0, 10000) || null, // limit content size
      website_title: metadata.title || null,
      website_description: metadata.description || null,
      scan_status: 'completed',
    }).eq('id', leadId);

    if (updateResult.error) {
      console.error('Error updating lead:', updateResult.error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save scan results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scan completed for lead:', leadId);
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          title: metadata.title,
          description: metadata.description,
          colors: branding.colors,
          logo: branding.images?.logo || branding.logo,
          screenshot: data.screenshot ? true : false,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scan-website:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
