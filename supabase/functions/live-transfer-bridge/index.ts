/**
 * Live Transfer Bridge — Owner-Only Dial
 *
 * Flow:
 * 1) Web app invokes this function while the Retell web call stays alive.
 * 2) We dial ONLY the owner via Twilio.
 * 3) Owner hears a whisper with caller details and presses any key.
 * 4) Twilio then dials the caller's phone and patches them together.
 * 5) The web call naturally ends when the caller picks up their phone.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TWILIO_GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';
const TWILIO_CALLER_ID = '+15612755757';
const DEFAULT_OWNER_NAME = 'Ron Melo';
const DEFAULT_TRANSFER_NUMBER = '+19547706622';

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const twimlResponse = (xml: string) =>
  new Response(xml, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
  });

const normalizePhoneNumber = (value?: string | null) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (value.trim().startsWith('+')) return value.trim();
  return '';
};

const normalizeEmailCandidate = (value?: string | null) => {
  if (!value) return '';
  const normalized = value.toLowerCase().replace(/\s+/g, '').replace(/\(at\)|\[at\]/g, '@').replace(/\(dot\)|\[dot\]/g, '.').replace(/@+/g, '@');
  const match = normalized.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return match ? match[0] : '';
};

const formatPhoneForSpeech = (value?: string | null) => {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) return '';
  const digits = normalized.replace(/^\+1/, '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3).split('').join(' ')}. ${digits.slice(3, 6).split('').join(' ')}. ${digits.slice(6).split('').join(' ')}`;
  }
  return normalized.split('').join(' ');
};

const formatEmailForSpeech = (value?: string | null) => {
  const normalized = normalizeEmailCandidate(value);
  if (!normalized) return '';
  return normalized.replace(/@/g, ' at ').replace(/\./g, ' dot ').replace(/-/g, ' dash ').replace(/_/g, ' underscore ');
};

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestUrl = new URL(req.url);
  const action = requestUrl.searchParams.get('action') || 'init';

  // ── TwiML: Owner hears whisper, presses key to connect ──
  if (action === 'owner-twiml') {
    const ownerName = requestUrl.searchParams.get('owner_name') || DEFAULT_OWNER_NAME;
    const callerName = requestUrl.searchParams.get('caller_name') || 'the caller';
    const callerPhone = normalizePhoneNumber(requestUrl.searchParams.get('caller_phone') || '');
    const callerEmail = normalizeEmailCandidate(requestUrl.searchParams.get('caller_email') || '');
    const businessName = requestUrl.searchParams.get('business_name') || 'the business';

    const connectUrl = `${requestUrl.origin}${requestUrl.pathname}?action=connect-caller&caller_phone=${encodeURIComponent(callerPhone)}`;

    const whisperText = [
      `Hello ${ownerName}. This is Aspen with a live handoff from the ${businessName} demo.`,
      `${callerName} is on the line and ready to speak with you.`,
      callerPhone ? `Their phone number is ${formatPhoneForSpeech(callerPhone)}.` : 'I do not have a confirmed callback number on file.',
      callerEmail ? `Their email is ${formatEmailForSpeech(callerEmail)}.` : '',
      callerPhone ? 'Press any key to be connected now.' : 'Their details have been sent to your email. Goodbye.',
    ].filter(Boolean).join(' ');

    if (!callerPhone) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna-Neural" language="en-US">${escapeXml(whisperText)}</Say><Hangup/></Response>`;
      return twimlResponse(twiml);
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="dtmf" numDigits="1" timeout="15" action="${escapeXml(connectUrl)}" method="POST"><Say voice="Polly.Joanna-Neural" language="en-US">${escapeXml(whisperText)}</Say></Gather><Say voice="Polly.Joanna-Neural" language="en-US">No response received. The caller details have been sent to your email. Goodbye.</Say><Hangup/></Response>`;
    return twimlResponse(twiml);
  }

  // ── TwiML: After owner presses key, dial the caller's phone directly ──
  if (action === 'connect-caller') {
    const callerPhone = normalizePhoneNumber(requestUrl.searchParams.get('caller_phone') || '');
    if (!callerPhone) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna-Neural" language="en-US">Sorry, I don't have the caller's phone number on file. Their details have been sent to your email.</Say><Hangup/></Response>`;
      return twimlResponse(twiml);
    }
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna-Neural" language="en-US">Connecting you now.</Say><Dial callerId="${escapeXml(TWILIO_CALLER_ID)}"><Number>${escapeXml(callerPhone)}</Number></Dial></Response>`;
    return twimlResponse(twiml);
  }

  // ── Status callback (logging only) ──
  if (action === 'status') {
    const statusBody = await req.text().catch(() => '');
    console.log('Live transfer status:', statusBody.slice(0, 500));
    return new Response('ok', { headers: corsHeaders });
  }

  // ── Main: dial the owner only ──
  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) return jsonResponse({ success: false, error: 'LOVABLE_API_KEY not configured' }, 500);

    const twilioApiKey = Deno.env.get('TWILIO_API_KEY');
    if (!twilioApiKey) return jsonResponse({ success: false, error: 'TWILIO_API_KEY not configured' }, 500);

    const body = await req.json().catch(() => ({}));
    const transferTo = normalizePhoneNumber(typeof body.transferTo === 'string' ? body.transferTo : '') || DEFAULT_TRANSFER_NUMBER;
    const callerPhone = normalizePhoneNumber(typeof body.callerPhone === 'string' ? body.callerPhone : '');
    const callerName = typeof body.callerName === 'string' && body.callerName.trim() ? body.callerName.trim() : 'the caller';
    const callerEmail = normalizeEmailCandidate(typeof body.callerEmail === 'string' ? body.callerEmail : '');
    const businessName = typeof body.businessName === 'string' && body.businessName.trim() ? body.businessName.trim() : 'Demo Business';
    const ownerName = typeof body.ownerName === 'string' && body.ownerName.trim() ? body.ownerName.trim() : DEFAULT_OWNER_NAME;

    console.log('Live transfer: dialing owner', { transferTo, callerPhone: callerPhone ? `***${callerPhone.slice(-4)}` : 'none' });

    const baseFunctionUrl = `${requestUrl.origin}${requestUrl.pathname}`;
    const ownerTwimlUrl = `${baseFunctionUrl}?action=owner-twiml&owner_name=${encodeURIComponent(ownerName)}&caller_name=${encodeURIComponent(callerName)}&caller_phone=${encodeURIComponent(callerPhone)}&caller_email=${encodeURIComponent(callerEmail)}&business_name=${encodeURIComponent(businessName)}`;
    const statusUrl = `${baseFunctionUrl}?action=status`;

    const ownerResponse = await fetch(`${TWILIO_GATEWAY_URL}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': twilioApiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: transferTo,
        From: TWILIO_CALLER_ID,
        Url: ownerTwimlUrl,
        Method: 'POST',
        StatusCallback: statusUrl,
        StatusCallbackMethod: 'POST',
        StatusCallbackEvent: 'initiated ringing answered completed',
      }),
    });

    const ownerData = await ownerResponse.json().catch(() => null);
    if (!ownerResponse.ok) {
      throw new Error(`Twilio call to owner failed [${ownerResponse.status}]: ${JSON.stringify(ownerData)}`);
    }

    console.log('Live transfer: owner dialed', { ownerCallSid: ownerData?.sid, transferTo });

    return jsonResponse({
      success: true,
      bridgeMode: 'owner_dial',
      ownerCallSid: ownerData?.sid ?? null,
      transferTo,
    });
  } catch (error: unknown) {
    console.error('Live transfer bridge error:', error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});