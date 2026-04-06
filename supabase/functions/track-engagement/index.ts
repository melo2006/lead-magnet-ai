import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 1x1 transparent GIF for tracking pixels
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
  0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b,
]);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const prospectId = url.searchParams.get('pid');
  const event = url.searchParams.get('event') || 'open'; // open, click, demo_view
  const redirect = url.searchParams.get('redirect');

  if (!prospectId) {
    return new Response('Missing prospect ID', { status: 400 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    // Update prospect engagement timestamps
    const updates: Record<string, string> = { updated_at: now };
    
    if (event === 'open') {
      updates.email_opened_at = now;
    } else if (event === 'click') {
      updates.email_clicked_at = now;
    } else if (event === 'demo_view') {
      updates.demo_viewed_at = now;
    }

    await supabase.from('prospects').update(updates).eq('id', prospectId);

    console.log(`Engagement tracked: ${event} for prospect ${prospectId}`);

    // For click and demo_view events, trigger speed-to-lead auto-call
    if (event === 'click' || event === 'demo_view') {
      console.log(`Triggering speed-to-lead for prospect ${prospectId} (${event})`);
      
      // Fire and forget - call the speed-to-lead function
      fetch(`${supabaseUrl}/functions/v1/speed-to-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          prospect_id: prospectId,
          trigger: event,
        }),
      }).catch(err => console.error('Speed-to-lead trigger failed:', err));
    }

    // If redirect URL provided, redirect (for link clicks)
    if (redirect) {
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirect },
      });
    }

    // Otherwise return tracking pixel (for email opens)
    return new Response(TRACKING_PIXEL, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Track engagement error:', error);
    
    // Still redirect or return pixel even on error
    if (redirect) {
      return new Response(null, { status: 302, headers: { 'Location': redirect } });
    }
    return new Response(TRACKING_PIXEL, {
      headers: { 'Content-Type': 'image/gif' },
    });
  }
});
