import { encode as base64url } from "https://deno.land/std@0.203.0/encoding/base64url.ts";
import { encode as base64encode } from "https://deno.land/std@0.203.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RETELL_BASE = 'https://api.retellai.com';
const LOVABLE_AI_BASE = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const RESEND_BASE = 'https://api.resend.com/emails';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// Service account credentials for aspen-calendar-bot
const SERVICE_ACCOUNT = {
  client_email: "aspen-calendar-bot@stunning-saga-490517-f1.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCfTMsLXQk/1PpV\ngw1tOG6JOkO8pFL0K+L2/K1Md92JqUHX6lNaYoOp4Ms4vlNR7K3qg4QY1doHo4j8\nm3NxoEsMzBlruM/iqOCcl6XMBWQmQn9uCg/jqVFj3CBVLiZJJ0pq7LXxQOy0Tv+l\naEpP2fJceJRjQ9r726qn+MoD8VbucFmDowNfxde4byPzM9V4aM0BOxIZbip0yPvE\nfmVUo5b5DOIjRge3FQ+bCTNeRyCKbp1J9vIn1f5N3SZXpqwB4mmm4h2vA5RrvaKK\nmhSBeQ/PqzVv+pdQ2jXKBp0vQAzj0GPqs4CTZNd6QUmllwrLoRUoH1+SlOlIXoEl\nZ/65eBJRAgMBAAECggEACv/dNE1qBlWRLIbmTjCbl0+l3jh1fuUp4JaNa86KBkeg\n44ULWN4dC8WZGrOvoqRGVP9cR2+6xJTC8HhWZhXkoL9WEQVbm2HAUqe4+8eyhN7K\nGEHLG5P1KgFI3UDYxWvYXF44aO5r+b5LsjLrkKxyqvZrfpgwnnvqQntwDYokT8Xn\nyifsxXqVePMgEL5Bhz0TWWf7W8hwVNT8Bvg80Q7U0P/9c8DnnmVcAIam0nj7UXL3\nypCjrDlz/PGkM3vslbpiyivT98i93eAgK0T8fibhFLRSnNSoTwfLFJA3dtxAhOrM\nK2s0kdcFNtfs5PfgYYzY5H6Xe35vSZy7lw6Qi2ZObQKBgQDTAVR5bUMeoDuoy9hx\n2aIQjvgnG8Ti3/7pSOKnp/+kCZeMH71dC/8FSewT6f9HUJr+obeSHQr/2lxK5y6E\nEPIzdKyxsKYHFF4wkaQo+Jll18wgky18/29zt2SBj5mY8Sb2K8jTS1vxks1hEv42\nl10mlDGkkauoWyLk5J8bVqznrQKBgQDBROaFrn3cUpAsLFwJ2xNbcQMh/dtIReWP\nS9U6x5L/sAnd+DMJ8ie9Ia8dNm5M+ZoSrvSIJRdwMaWXlsLaz78mK0WixtfEJwTQ\nsXWr/0G3p2AsfI7PSyybqztqPU15Cz0EyyEK7tEEO+8xSYFnGJpnl9jbXyn0mFFk\noH6wY4X5tQKBgG7Er/fep/GX5DnEaSe7PBy9MQA2z7DaLhOBM5sX0lfmwSvKLbp+\n5a19FPWPTXe+lN8/PgLyRCf0FacsnXqu+raQdWgCd+YXhyqwCiGH/9863enr2WFZ\nJsT0bUqme9eSIQXyDkb9tJKoojBnrBQ0ea4a9cSSxC5pSXQnoG7VnYcxAoGAJZmP\n94YA+nIdllpy9X/nfiy4XU6T8LWYeY5ZR3w4PwIyiTqWQ2MXFBaPiPFj+Bm/Pc9H\nx4zfyHYAL0OnWQZ9u6FDhO2GYKTurOM5b2LTmDU54q3A4tdPMGHZx0tx3RCwqFQU\nc5oOk/JNEJuqTzJcJ7dE+zjCYtGXVCpdO1fBYtkCgYAnHDiVSJGem+4hDHDn6wDm\njis8bxwN7I4ouVE2PpG75bbHJNGlmsAZcnZG2JptFRK513O1Lo/ENt3UUIwWZPIz\nR/0CRgTyzHXP6zk93K441egoM6sr6Wz1vfQ6NxQTmzlrNy/dN5y/bYAlimAZbp9e\nJYi8wKsWYjK8G5cBL+RPoA==\n-----END PRIVATE KEY-----\n",
  token_uri: "https://oauth2.googleapis.com/token",
};

// --- Google Calendar helpers ---

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function createSignedJwt(scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: SERVICE_ACCOUNT.client_email,
    scope,
    aud: SERVICE_ACCOUNT.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const keyData = pemToArrayBuffer(SERVICE_ACCOUNT.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, enc.encode(unsigned));
  const sigB64 = base64url(new Uint8Array(signature));

  return `${unsigned}.${sigB64}`;
}

async function getGoogleAccessToken(): Promise<string> {
  const jwt = await createSignedJwt('https://www.googleapis.com/auth/calendar');

  const res = await fetch(SERVICE_ACCOUNT.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Google token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function createCalendarEvent({
  calendarId,
  summary,
  description,
  startTime,
  endTime,
  attendeeEmail,
  timeZone = 'America/New_York',
}: {
  calendarId: string;
  summary: string;
  description: string;
  startTime: string;
  endTime: string;
  attendeeEmail?: string;
  timeZone?: string;
}) {
  const accessToken = await getGoogleAccessToken();

  const event: Record<string, any> = {
    summary,
    description,
    start: { dateTime: startTime, timeZone },
    end: { dateTime: endTime, timeZone },
  };

  if (attendeeEmail) {
    event.attendees = [{ email: attendeeEmail }];
    event.sendUpdates = 'all';
  }

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=${attendeeEmail ? 'all' : 'none'}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Calendar API error [${res.status}]: ${JSON.stringify(data)}`);
  return data;
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizePhoneNumber = (value?: string) => {
  if (!value) return '';

  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (value.trim().startsWith('+')) return value.trim();
  return value.trim();
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

async function retellFetch(path: string, apiKey: string, options: RequestInit = {}) {
  const res = await fetch(`${RETELL_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Retell API error [${res.status}]: ${JSON.stringify(data)}`);
  }

  return data;
}

const getTranscriptText = (callData: any) => {
  if (!callData) return '';

  if (typeof callData.transcript === 'string') {
    return callData.transcript.trim();
  }

  const transcriptCandidates = [
    callData.transcript,
    callData.transcript_object,
    callData.transcript_with_tool_calls,
    callData.transcript_with_tool_calls_without_pii,
  ].filter(Array.isArray);

  for (const transcript of transcriptCandidates) {
    const flattened = transcript
      .map((entry: any) => {
        const speaker = entry?.role || entry?.speaker || entry?.name || 'Speaker';
        const text = entry?.content || entry?.text || entry?.transcript || entry?.message || entry?.result;
        if (!text || typeof text !== 'string') return '';
        return `${speaker}: ${text}`;
      })
      .filter(Boolean)
      .join('\n');

    if (flattened.trim()) return flattened.trim();
  }

  return '';
};

const parseJsonContent = (value: string) => {
  const cleaned = value
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(cleaned);
};

async function summarizeTranscript({
  transcript,
  businessName,
  ownerName,
  ownerPhone,
  ownerEmail,
  lovableApiKey,
  existingSummary,
}: {
  transcript: string;
  businessName: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  lovableApiKey?: string;
  existingSummary?: string;
}) {
  const fallbackFlags = {
    callbackRequested: /callback|call me|call back|speak with|human|owner|transfer/i.test(transcript),
    appointmentRequested: /appointment|book|schedule|consultation|meeting/i.test(transcript),
  };

  if (!lovableApiKey) {
    return {
      summary: existingSummary || 'Call completed. AI summary is unavailable because LOVABLE_API_KEY is not configured.',
      nextStep: fallbackFlags.appointmentRequested
        ? 'Follow up with an appointment option.'
        : fallbackFlags.callbackRequested
          ? 'Call the lead back directly.'
          : 'Review the transcript and follow up if needed.',
      ...fallbackFlags,
      keyPoints: [],
    };
  }

  const response = await fetch(LOVABLE_AI_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You summarize demo call transcripts for business owners. Return strict JSON with these keys only: summary (string), nextStep (string), callbackRequested (boolean), appointmentRequested (boolean), keyPoints (array of up to 4 short strings). Be concise and practical.',
        },
        {
          role: 'user',
          content: `Business: ${businessName}\nOwner: ${ownerName}\nEmail on file: ${ownerEmail}\nPhone on file: ${ownerPhone || 'not provided'}\n\nTranscript:\n${transcript}`,
        },
      ],
    }),
  });

  const completion = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`AI summary failed [${response.status}]: ${JSON.stringify(completion)}`);
  }

  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('AI summary response was empty');
  }

  const parsed = parseJsonContent(content);

  return {
    summary: parsed.summary || existingSummary || 'Call completed.',
    nextStep:
      parsed.nextStep ||
      (fallbackFlags.appointmentRequested
        ? 'Follow up with an appointment option.'
        : fallbackFlags.callbackRequested
          ? 'Call the lead back directly.'
          : 'Review the transcript and follow up if needed.'),
    callbackRequested: Boolean(parsed.callbackRequested ?? fallbackFlags.callbackRequested),
    appointmentRequested: Boolean(parsed.appointmentRequested ?? fallbackFlags.appointmentRequested),
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 4) : [],
  };
}

async function sendSummaryEmail({
  resendApiKey,
  ownerName,
  ownerEmail,
  ownerPhone,
  businessName,
  websiteUrl,
  transcript,
  summary,
  nextStep,
  callbackRequested,
  appointmentRequested,
  keyPoints,
  callDurationSeconds,
}: {
  resendApiKey: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  businessName: string;
  websiteUrl: string;
  transcript: string;
  summary: string;
  nextStep: string;
  callbackRequested: boolean;
  appointmentRequested: boolean;
  keyPoints: string[];
  callDurationSeconds?: number;
}) {
  const pointsHtml = keyPoints.length
    ? `<ul>${keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`
    : '<p>No additional highlights were extracted.</p>';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 760px; margin: 0 auto; color: #0f172a;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Aspen demo call recap</h1>
      <p style="margin-top: 0; color: #475569;">${escapeHtml(businessName)} · ${escapeHtml(websiteUrl)}</p>

      <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0; background: #f8fafc;">
        <h2 style="font-size: 18px; margin: 0 0 8px;">Lead details</h2>
        <p style="margin: 4px 0;"><strong>Name:</strong> ${escapeHtml(ownerName)}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${escapeHtml(ownerEmail)}</p>
        <p style="margin: 4px 0;"><strong>Phone:</strong> ${escapeHtml(ownerPhone || 'Not provided')}</p>
        <p style="margin: 4px 0;"><strong>Call length:</strong> ${callDurationSeconds ? `${callDurationSeconds}s` : 'Unavailable'}</p>
      </div>

      <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <h2 style="font-size: 18px; margin: 0 0 8px;">AI summary</h2>
        <p style="margin: 0 0 12px;">${escapeHtml(summary)}</p>
        <p style="margin: 0 0 12px;"><strong>Next step:</strong> ${escapeHtml(nextStep)}</p>
        <p style="margin: 0 0 8px;"><strong>Callback requested:</strong> ${callbackRequested ? 'Yes' : 'No'}</p>
        <p style="margin: 0 0 8px;"><strong>Appointment requested:</strong> ${appointmentRequested ? 'Yes' : 'No'}</p>
        <div><strong>Key points:</strong>${pointsHtml}</div>
      </div>

      <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <h2 style="font-size: 18px; margin: 0 0 8px;">Transcript</h2>
        <pre style="white-space: pre-wrap; word-break: break-word; font-family: Arial, sans-serif; line-height: 1.6; margin: 0;">${escapeHtml(transcript || 'Transcript was not available yet.')}</pre>
      </div>
    </div>
  `;

  const res = await fetch(RESEND_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SignalAgent Demo <onboarding@resend.dev>',
      to: Array.from(new Set([ownerEmail, 'melo2006@gmail.com'].filter(Boolean))),
      subject: `Aspen demo recap for ${businessName}`,
      html,
      text: `Aspen demo call recap\n\nBusiness: ${businessName}\nWebsite: ${websiteUrl}\nName: ${ownerName}\nEmail: ${ownerEmail}\nPhone: ${ownerPhone || 'Not provided'}\n\nSummary: ${summary}\nNext step: ${nextStep}\nCallback requested: ${callbackRequested ? 'Yes' : 'No'}\nAppointment requested: ${appointmentRequested ? 'Yes' : 'No'}\n\nTranscript:\n${transcript || 'Transcript was not available yet.'}`,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Resend email failed [${res.status}]: ${JSON.stringify(data)}`);
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    if (!retellApiKey) {
      return jsonResponse({ error: 'RETELL_API_KEY not configured' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'create-web-call';

    if (action === 'email-call-summary') {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        return jsonResponse({ error: 'RESEND_API_KEY not configured' }, 500);
      }

      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      const callId = typeof body.callId === 'string' ? body.callId : '';
      const ownerEmail = typeof body.ownerEmail === 'string' ? body.ownerEmail.trim() : '';
      const ownerName = typeof body.ownerName === 'string' ? body.ownerName.trim() : 'Business Owner';
      const ownerPhone = typeof body.ownerPhone === 'string' ? body.ownerPhone.trim() : '';
      const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : 'Demo Business';
      const websiteUrl = typeof body.websiteUrl === 'string' ? body.websiteUrl.trim() : '';

      if (!callId || !ownerEmail) {
        return jsonResponse({ error: 'callId and ownerEmail are required' }, 400);
      }

      console.log('Preparing call summary email for call:', callId);

      let callData: any = null;
      let transcript = '';

      for (let attempt = 0; attempt < 6; attempt += 1) {
        callData = await retellFetch(`/v2/get-call/${callId}`, retellApiKey, { method: 'GET' });
        transcript = getTranscriptText(callData);
        if (transcript) break;
        await delay(2500);
      }

      const aiSummary = await summarizeTranscript({
        transcript,
        businessName,
        ownerName,
        ownerPhone,
        ownerEmail,
        lovableApiKey: lovableApiKey || undefined,
        existingSummary: callData?.call_analysis?.call_summary || callData?.call_analysis?.summary,
      });

      const emailResult = await sendSummaryEmail({
        resendApiKey,
        ownerName,
        ownerEmail,
        ownerPhone,
        businessName,
        websiteUrl,
        transcript,
        summary: aiSummary.summary,
        nextStep: aiSummary.nextStep,
        callbackRequested: aiSummary.callbackRequested,
        appointmentRequested: aiSummary.appointmentRequested,
        keyPoints: aiSummary.keyPoints,
        callDurationSeconds:
          typeof callData?.duration_ms === 'number' ? Math.round(callData.duration_ms / 1000) : undefined,
      });

      console.log('Call summary email sent:', emailResult?.id || 'no-id');

      // If appointment was requested, create a Google Calendar event
      let calendarEventId: string | null = null;
      if (aiSummary.appointmentRequested) {
        try {
          // Schedule for next business day at 10 AM ET by default
          const now = new Date();
          const nextDay = new Date(now);
          nextDay.setDate(nextDay.getDate() + 1);
          // Skip weekends
          while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
            nextDay.setDate(nextDay.getDate() + 1);
          }
          const startTime = new Date(nextDay);
          startTime.setHours(10, 0, 0, 0);
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + 30);

          const formatISO = (d: Date) => d.toISOString().replace('Z', '');

          const calEvent = await createCalendarEvent({
            calendarId: ownerEmail, // books on the owner's calendar (they must share with the service account)
            summary: `Aspen Demo Follow-up: ${ownerName} — ${businessName}`,
            description: `Auto-booked by Aspen AI after a demo call.\n\nSummary: ${aiSummary.summary}\nNext step: ${aiSummary.nextStep}\n\nPhone: ${ownerPhone || 'Not provided'}\nEmail: ${ownerEmail}\nWebsite: ${websiteUrl}`,
            startTime: formatISO(startTime),
            endTime: formatISO(endTime),
            attendeeEmail: ownerEmail,
            timeZone: 'America/New_York',
          });

          calendarEventId = calEvent?.id || null;
          console.log('Calendar event created:', calendarEventId);
        } catch (calErr) {
          console.error('Failed to create calendar event (non-fatal):', calErr);
          // Non-fatal — the email was already sent
        }
      }

      return jsonResponse({
        success: true,
        callbackRequested: aiSummary.callbackRequested,
        appointmentRequested: aiSummary.appointmentRequested,
        emailId: emailResult?.id ?? null,
        calendarEventId,
      });
    }

    const {
      agentId,
      businessName,
      businessNiche,
      ownerName,
      ownerEmail,
      websiteUrl,
      businessInfo,
      ownerPhone,
    } = body;

    if (!agentId) {
      return jsonResponse({ error: 'agentId is required' }, 400);
    }

    const normalizedOwnerPhone = normalizePhoneNumber(ownerPhone);

    console.log('Creating web call for agent:', agentId, 'niche:', businessNiche, 'callbackPhone:', normalizedOwnerPhone);

    const response = await fetch(`${RETELL_BASE}/v2/create-web-call`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        retell_llm_dynamic_variables: {
          business_name: businessName || 'Demo Business',
          business_niche: businessNiche || 'general',
          owner_name: ownerName || 'the business owner',
          owner_email: ownerEmail || '',
          website_url: websiteUrl || '',
          business_info: (businessInfo || 'A professional business offering quality services.').substring(0, 3000),
          owner_phone: normalizedOwnerPhone || '',
        },
        metadata: {
          niche: businessNiche || 'general',
          owner_name: ownerName || '',
          owner_email: ownerEmail || '',
          owner_phone: normalizedOwnerPhone || '',
          business_name: businessName || 'Demo Business',
          website_url: websiteUrl || '',
        },
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('Retell web call error:', data);
      return jsonResponse({ error: data?.error_message || 'Failed to create web call' }, response.status);
    }

    console.log('Web call created:', data.call_id);

    return jsonResponse({
      success: true,
      access_token: data.access_token,
      call_id: data.call_id,
    });
  } catch (error) {
    console.error('Error in retell-web-call:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
