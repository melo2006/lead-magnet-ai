// Twilio webhook receiver for SMS status callbacks AND inbound replies (STOP keyword)
// Configure in Twilio console:
//   Status callback URL: https://<project>.supabase.co/functions/v1/twilio-sms-status
//   Messaging webhook (inbound): same URL
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPT_OUT_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // Twilio posts application/x-www-form-urlencoded
    const formText = await req.text();
    const params = new URLSearchParams(formText);
    const p: Record<string, string> = {};
    params.forEach((v, k) => { p[k] = v; });
    console.log('Twilio webhook payload:', p);

    const messageSid = p.MessageSid || p.SmsSid;
    const status = (p.MessageStatus || p.SmsStatus || '').toLowerCase();
    const from = p.From;
    const inboundBody = (p.Body || '').trim().toUpperCase();

    // ── Inbound message (reply) ──
    if (inboundBody && from && !status) {
      const isOptOut = OPT_OUT_KEYWORDS.includes(inboundBody.split(/\s+/)[0]);
      if (isOptOut) {
        await supabase.from('sms_opt_outs').upsert(
          { phone: from, reason: `Replied "${inboundBody.slice(0, 40)}"` },
          { onConflict: 'phone' },
        );
        // Flag prospects with this phone
        await supabase
          .from('prospects')
          .update({ do_not_contact: true })
          .eq('phone', from);
        // Log opt-out as an event
        await supabase.from('sms_delivery_log').insert({
          to_phone: from,
          status: 'opt_out',
          is_opt_out: true,
          body: inboundBody,
        });
        // Twilio expects empty TwiML to silence auto-replies
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          headers: { 'Content-Type': 'text/xml' },
        });
      }
      // Non-opt-out inbound — just log
      await supabase.from('sms_delivery_log').insert({
        to_phone: from,
        status: 'inbound',
        body: inboundBody.slice(0, 500),
      });
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // ── Status callback ──
    if (messageSid && status) {
      const update: Record<string, unknown> = { status };
      if (p.ErrorCode) update.error_code = p.ErrorCode;
      if (p.ErrorMessage) update.error_message = p.ErrorMessage;
      if (status === 'delivered') update.delivered_at = new Date().toISOString();

      const { data: existing } = await supabase
        .from('sms_delivery_log')
        .select('id')
        .eq('message_sid', messageSid)
        .maybeSingle();

      if (existing) {
        await supabase.from('sms_delivery_log').update(update).eq('message_sid', messageSid);
      } else {
        // Insert minimal row if we missed the initial send
        await supabase.from('sms_delivery_log').insert({
          message_sid: messageSid,
          to_phone: p.To || 'unknown',
          from_phone: p.From || null,
          ...update,
        });
      }
    }

    return new Response('ok', { headers: corsHeaders });
  } catch (err) {
    console.error('twilio-sms-status error:', err);
    return new Response('error', { status: 200, headers: corsHeaders });
  }
});
