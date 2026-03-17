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
    const { leadId, websiteUrl, secondaryUrl, uploadedFiles } = await req.json();

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('leads').update({ scan_status: 'scanning' }).eq('id', leadId);

    let formattedUrl = websiteUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scanning website:', formattedUrl);

    // Step 1: Scrape homepage for branding + screenshot
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
      console.error('Firecrawl scrape error:', scrapeData);
      await supabase.from('leads').update({ scan_status: 'failed' }).eq('id', leadId);
      return new Response(
        JSON.stringify({ success: false, error: scrapeData.error || 'Scrape failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = scrapeData.data || scrapeData;
    const branding = data.branding || {};
    const metadata = data.metadata || {};
    const homepageMarkdown = data.markdown || '';

    // Step 2: Deep crawl all pages for knowledge base (up to 20 pages)
    let deepContent = '';
    try {
      console.log('Starting deep crawl for:', formattedUrl);
      const crawlResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formattedUrl,
          limit: 20,
          maxDepth: 3,
          scrapeOptions: { formats: ['markdown'] },
        }),
      });

      const crawlData = await crawlResponse.json();

      if (crawlResponse.ok && crawlData.success) {
        // Crawl returns an async job — poll for results
        const crawlId = crawlData.id;
        if (crawlId) {
          console.log('Crawl job started:', crawlId);
          // Poll up to 60 seconds
          for (let i = 0; i < 12; i++) {
            await new Promise((r) => setTimeout(r, 5000));
            const statusRes = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlId}`, {
              headers: { 'Authorization': `Bearer ${firecrawlKey}` },
            });
            const statusData = await statusRes.json();

            if (statusData.status === 'completed' && Array.isArray(statusData.data)) {
              deepContent = statusData.data
                .map((page: any) => {
                  const md = page.markdown || '';
                  const url = page.metadata?.sourceURL || '';
                  return url ? `--- Page: ${url} ---\n${md}` : md;
                })
                .join('\n\n')
                .substring(0, 50000);
              console.log(`Crawl completed: ${statusData.data.length} pages`);
              break;
            }

            if (statusData.status === 'failed') {
              console.warn('Crawl failed, using homepage only');
              break;
            }
          }
        }
      } else {
        console.warn('Crawl initiation failed, using homepage only');
      }
    } catch (crawlErr) {
      console.warn('Deep crawl error, continuing with homepage:', crawlErr);
    }

    // Step 3: Crawl secondary URL if provided
    let secondaryContent = '';
    if (secondaryUrl && typeof secondaryUrl === 'string' && secondaryUrl.trim()) {
      try {
        let formattedSecondary = secondaryUrl.trim();
        if (!formattedSecondary.startsWith('http://') && !formattedSecondary.startsWith('https://')) {
          formattedSecondary = `https://${formattedSecondary}`;
        }
        console.log('Scraping secondary URL:', formattedSecondary);

        const secResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: formattedSecondary,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        const secData = await secResponse.json();
        if (secResponse.ok) {
          secondaryContent = (secData.data?.markdown || secData.markdown || '').substring(0, 10000);
          console.log('Secondary URL scraped successfully');
        }
      } catch (secErr) {
        console.warn('Secondary URL scrape error:', secErr);
      }
    }

    // Step 4: Read uploaded files content
    let filesContent = '';
    if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      for (const filePath of uploadedFiles) {
        try {
          const { data: fileData, error: fileErr } = await supabase.storage
            .from('lead-uploads')
            .download(filePath);
          if (fileErr || !fileData) continue;

          // Only extract text from text-based files
          const ext = filePath.split('.').pop()?.toLowerCase();
          if (ext === 'txt' || ext === 'md') {
            const text = await fileData.text();
            filesContent += `\n--- Uploaded file: ${filePath} ---\n${text.substring(0, 10000)}\n`;
          } else {
            // For PDF/Word, we note the file exists but can't easily parse in Deno
            filesContent += `\n--- Uploaded file: ${filePath} (binary document — content available for AI processing) ---\n`;
          }
        } catch (fErr) {
          console.warn('File read error:', fErr);
        }
      }
    }

    // Combine all content for the knowledge base
    const fullContent = [
      homepageMarkdown,
      deepContent ? `\n\n=== ADDITIONAL PAGES ===\n${deepContent}` : '',
      secondaryContent ? `\n\n=== SECONDARY WEBSITE ===\n${secondaryContent}` : '',
      filesContent ? `\n\n=== UPLOADED DOCUMENTS ===\n${filesContent}` : '',
    ].join('').substring(0, 60000); // Cap at 60K chars

    // Update lead with all scraped data
    const updateResult = await supabase.from('leads').update({
      brand_colors: branding.colors || null,
      brand_logo: branding.images?.logo || branding.logo || null,
      brand_fonts: branding.fonts || branding.typography || null,
      website_screenshot: data.screenshot || null,
      website_content: fullContent || null,
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

    console.log('Scan completed for lead:', leadId, '— total content length:', fullContent.length);
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          title: metadata.title,
          description: metadata.description,
          colors: branding.colors,
          logo: branding.images?.logo || branding.logo,
          screenshot: data.screenshot ? true : false,
          pagesScraped: deepContent ? 'multiple' : 'homepage-only',
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
