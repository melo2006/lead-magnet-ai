import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TWILIO_GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';
const TWILIO_CALLER_ID = '+15612755757';

const ProspectSchema = z.object({
  id: z.string().uuid(),
  business_name: z.string().min(1).max(500),
  phone: z.string().max(30).nullable().optional(),
  owner_name: z.string().max(500).nullable().optional(),
  website_url: z.string().max(2000).nullable().optional(),
  website_screenshot: z.string().max(4000).nullable().optional(),
  niche: z.string().max(200).nullable().optional(),
});

const BodySchema = z.object({
  prospects: z.array(ProspectSchema).min(1).max(50),
  smsTemplateId: z.string().max(100).optional().default('quick_demo'),
  customMessage: z.string().max(500).optional().default(''),
  baseUrl: z.string().url(),
});

// ── Template definitions (mirrored from client) ──────────────────────
type Prospect = z.infer<typeof ProspectSchema>;

const pName = (p: Prospect) => p.owner_name?.trim() || p.business_name;

const TEMPLATES: Record<string, { mms: boolean; body: (p: Prospect, demoUrl: string) => string }> = {
  quick_demo: {
    mms: false,
    body: (p, url) =>
      `Hi ${pName(p)}! We built a quick AI demo for ${p.business_name} — see Chat AI & Voice AI live on your site.\n\nTry it now, it's totally free:\n${url}\n\n— AI Hidden Leads`,
  },
  quick_demo_mms: {
    mms: true,
    body: (p, url) =>
      `Hi ${pName(p)}! We built a quick AI demo for ${p.business_name} — see Chat AI & Voice AI live on your site.\n\nTry it now, it's totally free:\n${url}\n\n— AI Hidden Leads`,
  },
  missed_calls: {
    mms: false,
    body: (p, url) =>
      `Hey ${pName(p)}, have you missed any leads lately from calls going to voicemail or visitors leaving your site?\n\nI built a Voice AI that talks to your customers, takes notes, books appointments & transfers qualified leads to you live.\n\nCheck out what I set up for ${p.business_name}:\n${url}\n\n— AI Hidden Leads`,
  },
  industry_fomo: {
    mms: false,
    body: (p, url) =>
      `Hi ${pName(p)}, most ${p.niche || 'business'} owners in your area are missing out by not answering calls fast enough.\n\nI built an AI assistant for ${p.business_name} that picks up every call, answers FAQs, and books appointments 24/7.\n\nSee it in action — totally free:\n${url}\n\n— AI Hidden Leads`,
  },
  industry_fomo_mms: {
    mms: true,
    body: (p, url) =>
      `Hi ${pName(p)}, most ${p.niche || 'business'} owners in your area are missing out by not answering calls fast enough.\n\nI built an AI assistant for ${p.business_name} that picks up every call, answers FAQs, and books appointments 24/7.\n\nSee it in action — totally free:\n${url}\n\n— AI Hidden Leads`,
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const twilioApiKey = Deno.env.get('TWILIO_API_KEY');
    if (!twilioApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'TWILIO_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { prospects, smsTemplateId, customMessage, baseUrl } = parsed.data;
    const template = TEMPLATES[smsTemplateId] ?? TEMPLATES['quick_demo'];

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: { id: string; success: boolean; error?: string; messageSid?: string }[] = [];

    for (const prospect of prospects) {
      const phone = prospect.phone;
      if (!phone) {
        results.push({ id: prospect.id, success: false, error: 'No phone number' });
        continue;
      }

      // Normalize phone
      const digits = phone.replace(/\D/g, '');
      let normalizedPhone = phone.trim();
      if (digits.length === 10) normalizedPhone = `+1${digits}`;
      else if (digits.length === 11 && digits.startsWith('1')) normalizedPhone = `+${digits}`;
      else if (!normalizedPhone.startsWith('+')) normalizedPhone = `+${digits}`;

      const demoUrl = `${baseUrl}/demo?url=${encodeURIComponent(prospect.website_url || '')}&name=${encodeURIComponent(prospect.business_name)}&niche=${encodeURIComponent(prospect.niche || '')}&prospectId=${encodeURIComponent(prospect.id)}`;

      const smsBody = customMessage
        ? `${customMessage}\n\nTry it now:\n${demoUrl}\n\n— AI Hidden Leads`
        : template.body(prospect, demoUrl);

      try {
        const params: Record<string, string> = {
          To: normalizedPhone,
          From: TWILIO_CALLER_ID,
          Body: smsBody,
        };

        // Attach screenshot as MMS if template is MMS and screenshot exists
        if (template.mms && prospect.website_screenshot) {
          params.MediaUrl = prospect.website_screenshot;
        }

        const response = await fetch(`${TWILIO_GATEWAY_URL}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'X-Connection-Api-Key': twilioApiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(params),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          results.push({
            id: prospect.id,
            success: false,
            error: data?.message || `Twilio error ${response.status}`,
          });
          continue;
        }

        console.log(`SMS sent to ${normalizedPhone} for ${prospect.business_name}: ${data?.sid}`);

        // Update prospect
        await supabase
          .from('prospects')
          .update({
            sms_sent_at: new Date().toISOString(),
            demo_link: demoUrl,
            pipeline_stage: 'contacted',
            last_contacted_at: new Date().toISOString(),
          })
          .eq('id', prospect.id);

        results.push({ id: prospect.id, success: true, messageSid: data?.sid });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'SMS send failed';
        results.push({ id: prospect.id, success: false, error: msg });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({ success: true, sent, failed, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    console.error('Send outreach SMS error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
