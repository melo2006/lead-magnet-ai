const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TWILIO_GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';
const TWILIO_CALLER_ID = '+15612755757';
const DEFAULT_OWNER_NAME = 'Ron Melo';

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

  const normalized = value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\(at\)|\[at\]/g, '@')
    .replace(/\(dot\)|\[dot\]/g, '.')
    .replace(/@+/g, '@');

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

  return normalized
    .replace(/@/g, ' at ')
    .replace(/\./g, ' dot ')
    .replace(/-/g, ' dash ')
    .replace(/_/g, ' underscore ');
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestUrl = new URL(req.url);
  const action = requestUrl.searchParams.get('action') || 'init';

  if (action === 'owner-twiml') {
    const conferenceName = requestUrl.searchParams.get('conference') || `live-bridge-${Date.now()}`;
    const ownerName = requestUrl.searchParams.get('owner_name') || DEFAULT_OWNER_NAME;
    const callerName = requestUrl.searchParams.get('caller_name') || 'the caller';
    const callerPhone = normalizePhoneNumber(requestUrl.searchParams.get('caller_phone') || '');
    const callerEmail = normalizeEmailCandidate(requestUrl.searchParams.get('caller_email') || '');
    const businessName = requestUrl.searchParams.get('business_name') || 'the business';
    const joinUrl = `${requestUrl.origin}${requestUrl.pathname}?action=join-conference&conference=${encodeURIComponent(conferenceName)}`;

    const whisperText = [
      `Hello ${ownerName}. This is Aspen with a live handoff from the ${businessName} demo.`,
      `${callerName} is ready to speak with you now.`,
      callerPhone ? `Their confirmed phone number is ${formatPhoneForSpeech(callerPhone)}.` : 'I do not have a confirmed callback number on file.',
      callerEmail ? `Their confirmed email is ${formatEmailForSpeech(callerEmail)}.` : 'I do not have a confirmed email on file.',
      'Press any key to join the live call now.',
    ].join(' ');

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="dtmf" numDigits="1" timeout="10" action="${escapeXml(joinUrl)}" method="POST"><Say voice="Polly.Joanna-Neural" language="en-US">${escapeXml(whisperText)}</Say></Gather><Say voice="Polly.Joanna-Neural" language="en-US">No key was received. Goodbye.</Say><Hangup/></Response>`;
    return twimlResponse(twiml);
  }

  if (action === 'join-conference') {
    const conferenceName = requestUrl.searchParams.get('conference') || `live-bridge-${Date.now()}`;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference startConferenceOnEnter="true" endConferenceOnExit="true" beep="false">${escapeXml(conferenceName)}</Conference></Dial></Response>`;
    return twimlResponse(twiml);
  }

  if (action === 'caller-twiml') {
    const conferenceName = requestUrl.searchParams.get('conference') || `live-bridge-${Date.now()}`;
    const ownerName = requestUrl.searchParams.get('owner_name') || DEFAULT_OWNER_NAME;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna-Neural" language="en-US">Please hold while I connect you with ${escapeXml(ownerName)}.</Say><Dial><Conference startConferenceOnEnter="false" endConferenceOnExit="true" beep="false">${escapeXml(conferenceName)}</Conference></Dial></Response>`;
    return twimlResponse(twiml);
  }

  if (action === 'status') {
    const statusBody = await req.text().catch(() => '');
    console.log('Live transfer bridge status callback:', {
      conference: requestUrl.searchParams.get('conference') || 'unknown',
      leg: requestUrl.searchParams.get('leg') || 'unknown',
      body: statusBody.slice(0, 500),
    });
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return jsonResponse({ success: false, error: 'LOVABLE_API_KEY is not configured' }, 500);
    }

    const twilioApiKey = Deno.env.get('TWILIO_API_KEY');
    if (!twilioApiKey) {
      return jsonResponse({ success: false, error: 'TWILIO_API_KEY is not configured' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const transferTo = normalizePhoneNumber(typeof body.transferTo === 'string' ? body.transferTo : '');
    const callerPhone = normalizePhoneNumber(typeof body.callerPhone === 'string' ? body.callerPhone : '');
    const callerName = typeof body.callerName === 'string' && body.callerName.trim() ? body.callerName.trim() : 'the caller';
    const callerEmail = normalizeEmailCandidate(typeof body.callerEmail === 'string' ? body.callerEmail : '');
    const businessName = typeof body.businessName === 'string' && body.businessName.trim() ? body.businessName.trim() : 'Demo Business';
    const ownerName = typeof body.ownerName === 'string' && body.ownerName.trim() ? body.ownerName.trim() : DEFAULT_OWNER_NAME;
    const callId = typeof body.callId === 'string' ? body.callId.trim() : '';

    if (!transferTo) {
      return jsonResponse({ success: false, error: 'transferTo is required' }, 400);
    }

    if (!callerPhone) {
      return jsonResponse({ success: false, error: 'callerPhone is required for a live handoff' }, 400);
    }

    const conferenceName = `live-bridge-${callId || crypto.randomUUID()}`;
    const baseFunctionUrl = `${requestUrl.origin}${requestUrl.pathname}`;
    const callerTwimlUrl = `${baseFunctionUrl}?action=caller-twiml&conference=${encodeURIComponent(conferenceName)}&owner_name=${encodeURIComponent(ownerName)}`;
    const ownerTwimlUrl = `${baseFunctionUrl}?action=owner-twiml&conference=${encodeURIComponent(conferenceName)}&owner_name=${encodeURIComponent(ownerName)}&caller_name=${encodeURIComponent(callerName)}&caller_phone=${encodeURIComponent(callerPhone)}&caller_email=${encodeURIComponent(callerEmail)}&business_name=${encodeURIComponent(businessName)}`;
    const callerStatusUrl = `${baseFunctionUrl}?action=status&leg=caller&conference=${encodeURIComponent(conferenceName)}`;
    const ownerStatusUrl = `${baseFunctionUrl}?action=status&leg=owner&conference=${encodeURIComponent(conferenceName)}`;

    const callerResponse = await fetch(`${TWILIO_GATEWAY_URL}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': twilioApiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: callerPhone,
        From: TWILIO_CALLER_ID,
        Url: callerTwimlUrl,
        Method: 'POST',
        StatusCallback: callerStatusUrl,
        StatusCallbackMethod: 'POST',
        StatusCallbackEvent: 'initiated ringing answered completed',
      }),
    });

    const callerData = await callerResponse.json().catch(() => null);
    if (!callerResponse.ok) {
      throw new Error(`Twilio caller leg failed [${callerResponse.status}]: ${JSON.stringify(callerData)}`);
    }

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
        StatusCallback: ownerStatusUrl,
        StatusCallbackMethod: 'POST',
        StatusCallbackEvent: 'initiated ringing answered completed',
      }),
    });

    const ownerData = await ownerResponse.json().catch(() => null);
    if (!ownerResponse.ok) {
      throw new Error(`Twilio owner leg failed [${ownerResponse.status}]: ${JSON.stringify(ownerData)}`);
    }

    console.log('Live transfer bridge initiated:', {
      conferenceName,
      callerCallSid: callerData?.sid,
      ownerCallSid: ownerData?.sid,
    });

    return jsonResponse({
      success: true,
      bridgeMode: 'phone_conference',
      conferenceName,
      callerCallSid: callerData?.sid ?? null,
      ownerCallSid: ownerData?.sid ?? null,
      transferTo,
    });
  } catch (error: unknown) {
    console.error('Live transfer bridge error:', error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});