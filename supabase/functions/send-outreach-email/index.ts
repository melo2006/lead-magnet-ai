import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ProspectSchema = z.object({
  id: z.string().uuid(),
  business_name: z.string().min(1).max(500),
  email: z.string().email().nullable().optional(),
  owner_email: z.string().email().nullable().optional(),
  owner_name: z.string().max(500).nullable().optional(),
  website_url: z.string().max(2000).nullable().optional(),
  website_screenshot: z.string().max(5000).nullable().optional(),
  niche: z.string().max(200).nullable().optional(),
});

const BodySchema = z.object({
  prospects: z.array(ProspectSchema).min(1).max(50),
  subject: z.string().min(1).max(500),
  customMessage: z.string().max(2000).optional().default(''),
  templateStyle: z.enum(['phone_mockup', 'clean_card']),
  senderName: z.string().max(200).optional().default('AgentFlow AI'),
  baseUrl: z.string().url(),
});

function buildEmailHtml(
  prospect: z.infer<typeof ProspectSchema>,
  subject: string,
  customMessage: string,
  templateStyle: string,
  demoUrl: string,
): string {
  const name = prospect.owner_name || prospect.business_name;
  const screenshotHtml = prospect.website_screenshot
    ? `<img src="${prospect.website_screenshot}" alt="${prospect.business_name} website" style="width:100%;max-height:200px;object-fit:cover;object-position:top;border-radius:8px 8px 0 0;" />`
    : '';

  if (templateStyle === 'phone_mockup') {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="padding:30px 30px 10px;text-align:center;">
    <h1 style="margin:0;font-size:24px;color:#111;">Meet Your <span style="color:#059669;">AI Employee</span></h1>
    <p style="margin:8px 0 0;font-size:14px;color:#6b7280;"><strong style="color:#059669;">Chat</strong> with it. <strong style="color:#059669;">Talk</strong> to it. Built for ${prospect.business_name}.</p>
    ${customMessage ? `<p style="margin:12px 0 0;font-size:13px;color:#6b7280;font-style:italic;">${customMessage}</p>` : ''}
  </td></tr>
  <tr><td align="center" style="padding:20px 30px;">
    <div style="width:240px;border-radius:32px;border:6px solid #1f2937;background:#000;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.25);">
      <div style="height:24px;background:#000;"></div>
      <div style="background:#fff;min-height:300px;">
        ${screenshotHtml || `<div style="height:260px;background:linear-gradient(180deg,#f3f4f6,#e5e7eb);display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;"><p style="font-size:12px;color:#9ca3af;">${prospect.business_name}</p></div>`}
        <div style="background:linear-gradient(to top,rgba(0,0,0,0.85),transparent);padding:16px 12px 12px;">
          <a href="${demoUrl}" style="display:block;background:#059669;color:#fff;font-size:13px;font-weight:bold;padding:10px 16px;border-radius:10px;text-align:center;text-decoration:none;">Try Your AI Demo →</a>
        </div>
      </div>
      <div style="height:18px;background:#000;"></div>
    </div>
  </td></tr>
  <tr><td style="padding:10px 30px 20px;text-align:center;">
    <p style="font-size:11px;color:#9ca3af;margin:0 0 16px;">Tap to chat or talk with your AI employee — built specifically for ${prospect.business_name}.</p>
    <a href="${demoUrl}" style="display:inline-block;background:#059669;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Try Your Personalized Demo →</a>
  </td></tr>
  <tr><td style="padding:20px 30px;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="font-size:11px;color:#9ca3af;margin:0;">Powered by AgentFlow AI</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  }

  // clean_card
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="padding:30px;">
    <p style="font-size:15px;color:#374151;margin:0 0 12px;">Hi ${name},</p>
    ${customMessage ? `<p style="font-size:14px;color:#6b7280;margin:0 0 12px;">${customMessage}</p>` : ''}
    <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">We built a quick, personalized AI demo specifically for your business. It shows how an AI receptionist could handle your calls 24/7, book appointments, and never miss a lead.</p>
  </td></tr>
  <tr><td style="padding:0 30px 20px;">
    <div style="border:2px solid #a7f3d0;border-radius:12px;overflow:hidden;background:#ecfdf5;">
      ${screenshotHtml}
      <div style="padding:20px;">
        <p style="font-size:16px;font-weight:bold;color:#111;margin:0 0 4px;">${prospect.business_name}</p>
        <p style="font-size:12px;color:#6b7280;margin:0 0 16px;">Personalized AI Demo Ready</p>
        <table width="100%" cellpadding="0" cellspacing="8"><tr>
          <td style="background:#fff;border:1px solid #d1fae5;border-radius:8px;padding:8px;text-align:center;"><strong style="font-size:14px;">24/7</strong><br><span style="font-size:10px;color:#6b7280;">Coverage</span></td>
          <td style="background:#fff;border:1px solid #d1fae5;border-radius:8px;padding:8px;text-align:center;"><strong style="font-size:14px;">Chat+Voice</strong><br><span style="font-size:10px;color:#6b7280;">AI Agents</span></td>
          <td style="background:#fff;border:1px solid #d1fae5;border-radius:8px;padding:8px;text-align:center;"><strong style="font-size:14px;">Live</strong><br><span style="font-size:10px;color:#6b7280;">Demo</span></td>
        </tr></table>
        <div style="text-align:center;margin-top:16px;">
          <a href="${demoUrl}" style="display:inline-block;background:#059669;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Watch Your Demo →</a>
        </div>
      </div>
    </div>
  </td></tr>
  <tr><td style="padding:10px 30px 20px;text-align:center;">
    <p style="font-size:11px;color:#9ca3af;margin:0;">Powered by AgentFlow AI</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prospects, subject, customMessage, templateStyle, senderName, baseUrl } = parsed.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const prospect of prospects) {
      const recipientEmail = prospect.owner_email || prospect.email;
      if (!recipientEmail) {
        results.push({ id: prospect.id, success: false, error: 'No email address' });
        continue;
      }

      const demoUrl = `${baseUrl}/demo?url=${encodeURIComponent(prospect.website_url || '')}&name=${encodeURIComponent(prospect.business_name)}&niche=${encodeURIComponent(prospect.niche || '')}`;
      const html = buildEmailHtml(prospect, subject, customMessage, templateStyle, demoUrl);

      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${senderName} <onboarding@resend.dev>`,
            to: [recipientEmail],
            subject: subject,
            html: html,
          }),
        });

        const emailData = await emailRes.json();

        if (!emailRes.ok) {
          results.push({ id: prospect.id, success: false, error: emailData?.message || `Resend error ${emailRes.status}` });
          continue;
        }

        // Update prospect with sent timestamp and demo link
        await supabase
          .from('prospects')
          .update({
            email_sent_at: new Date().toISOString(),
            demo_link: demoUrl,
            pipeline_stage: 'contacted',
            last_contacted_at: new Date().toISOString(),
          })
          .eq('id', prospect.id);

        results.push({ id: prospect.id, success: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Send failed';
        results.push({ id: prospect.id, success: false, error: msg });
      }
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ success: true, sent, failed, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Send outreach error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
