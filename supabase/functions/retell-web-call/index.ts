import { encode as base64url } from "https://deno.land/std@0.203.0/encoding/base64url.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RETELL_BASE = 'https://api.retellai.com';
const LOVABLE_AI_BASE = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const RESEND_BASE = 'https://api.resend.com/emails';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const TWILIO_GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';
const DEFAULT_OWNER_NAME = 'Ron Melo';
const TESTING_INBOX_EMAIL = 'melo2006@gmail.com';
const DEFAULT_TIME_ZONE = 'America/New_York';
const DEFAULT_TRANSFER_NUMBER = '+19547706622';
const TWILIO_CALLER_ID = '+15612755757';
const TRANSFER_TITLE = 'AI Solutions Specialist';

// Service account credentials for aspen-calendar-bot
const SERVICE_ACCOUNT = {
  client_email: "aspen-calendar-bot@stunning-saga-490517-f1.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCfTMsLXQk/1PpV\ngw1tOG6JOkO8pFL0K+L2/K1Md92JqUHX6lNaYoOp4Ms4vlNR7K3qg4QY1doHo4j8\nm3NxoEsMzBlruM/iqOCcl6XMBWQmQn9uCg/jqVFj3CBVLiZJJ0pq7LXxQOy0Tv+l\naEpP2fJceJRjQ9r726qn+MoD8VbucFmDowNfxde4byPzM9V4aM0BOxIZbip0yPvE\nfmVUo5b5DOIjRge3FQ+bCTNeRyCKbp1J9vIn1f5N3SZXpqwB4mmm4h2vA5RrvaKK\nmhSBeQ/PqzVv+pdQ2jXKBp0vQAzj0GPqs4CTZNd6QUmllwrLoRUoH1+SlOlIXoEl\nZ/65eBJRAgMBAAECggEACv/dNE1qBlWRLIbmTjCbl0+l3jh1fuUp4JaNa86KBkeg\n44ULWN4dC8WZGrOvoqRGVP9cR2+6xJTC8HhWZhXkoL9WEQVbm2HAUqe4+8eyhN7K\nGEHLG5P1KgFI3UDYxWvYXF44aO5r+b5LsjLrkKxyqvZrfpgwnnvqQntwDYokT8Xn\nyifsxXqVePMgEL5Bhz0TWWf7W8hwVNT8Bvg80Q7U0P/9c8DnnmVcAIam0nj7UXL3\nypCjrDlz/PGkM3vslbpiyivT98i93eAgK0T8fibhFLRSnNSoTwfLFJA3dtxAhOrM\nK2s0kdcFNtfs5PfgYYzY5H6Xe35vSZy7lw6Qi2ZObQKBgQDTAVR5bUMeoDuoy9hx\n2aIQjvgnG8Ti3/7pSOKnp/+kCZeMH71dC/8FSewT6f9HUJr+obeSHQr/2lxK5y6E\nEPIzdKyxsKYHFF4wkaQo+Jll18wgky18/29zt2SBj5mY8Sb2K8jTS1vxks1hEv42\nl10mlDGkkauoWyLk5J8bVqznrQKBgQDBROaFrn3cUpAsLFwJ2xNbcQMh/dtIReWP\nS9U6x5L/sAnd+DMJ8ie9Ia8dNm5M+ZoSrvSIJRdwMaWXlsLaz78mK0WixtfEJwTQ\nsXWr/0G3p2AsfI7PSyybqztqPU15Cz0EyyEK7tEEO+8xSYFnGJpnl9jbXyn0mFFk\noH6wY4X5tQKBgG7Er/fep/GX5DnEaSe7PBy9MQA2z7DaLhOBM5sX0lfmwSvKLbp+\n5a19FPWPTXe+lN8/PgLyRCf0FacsnXqu+raQdWgCd+YXhyqwCiGH/9863enr2WFZ\nJsT0bUqme9eSIQXyDkb9tJKoojBnrBQ0ea4a9cSSxC5pSXQnoG7VnYcxAoGAJZmP\n94YA+nIdllpy9X/nfiy4XU6T8LWYeY5ZR3w4PwIyiTqWQ2MXFBaPiPFj+Bm/Pc9H\nx4zfyHYAL0OnWQZ9u6FDhO2GYKTurOM5b2LTmDU54q3A4tdPMGHZx0tx3RCwqFQU\nc5oOk/JNEJuqTzJcJ7dE+zjCYtGXVCpdO1fBYtkCgYAnHDiVSJGem+4hDHDn6wDm\njis8bxwN7I4ouVE2PpG75bbHJNGlmsAZcnZG2JptFRK513O1Lo/ENt3UUIwWZPIz\nR/0CRgTyzHXP6zk93K441egoM6sr6Wz1vfQ6NxQTmzlrNy/dN5y/bYAlimAZbp9e\nJYi8wKsWYjK8G5cBL+RPoA==\n-----END PRIVATE KEY-----\n",
  token_uri: "https://oauth2.googleapis.com/token",
};

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

async function getFreeBusy(calendarId: string, timeMin: string, timeMax: string): Promise<{ start: string; end: string }[]> {
  const accessToken = await getGoogleAccessToken();

  const res = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: DEFAULT_TIME_ZONE,
      items: [{ id: calendarId }],
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`FreeBusy API error [${res.status}] for ${calendarId}: ${JSON.stringify(data)}`);
  }

  return data?.calendars?.[calendarId]?.busy ?? [];
}

async function findAvailableSlot(calendarId: string, preferredStart: Date, durationMinutes = 15): Promise<Date> {
  // Check a 3-day window from the preferred start
  const windowStart = new Date(preferredStart);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 3);

  const busySlots = await getFreeBusy(
    calendarId,
    windowStart.toISOString(),
    windowEnd.toISOString(),
  );

  const isSlotFree = (start: Date, end: Date): boolean => {
    return !busySlots.some((busy) => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return start < busyEnd && end > busyStart;
    });
  };

  // First try the preferred time
  const preferredEnd = new Date(preferredStart);
  preferredEnd.setMinutes(preferredEnd.getMinutes() + durationMinutes);
  if (isSlotFree(preferredStart, preferredEnd)) {
    return preferredStart;
  }

  console.log('Preferred slot is busy, searching for next available...');

  // Search forward in 30-min increments, business hours only (9am-5pm)
  const candidate = new Date(preferredStart);
  for (let i = 0; i < 48; i++) {
    candidate.setMinutes(candidate.getMinutes() + 30);

    // Skip weekends
    if (candidate.getDay() === 0 || candidate.getDay() === 6) {
      candidate.setDate(candidate.getDate() + (candidate.getDay() === 0 ? 1 : 2));
      candidate.setHours(9, 0, 0, 0);
      continue;
    }

    // Skip outside business hours
    if (candidate.getHours() < 9) {
      candidate.setHours(9, 0, 0, 0);
    }
    if (candidate.getHours() >= 17) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(9, 0, 0, 0);
      continue;
    }

    const candEnd = new Date(candidate);
    candEnd.setMinutes(candEnd.getMinutes() + durationMinutes);
    if (isSlotFree(candidate, candEnd)) {
      return new Date(candidate);
    }
  }

  // Fallback: return the preferred time anyway
  return preferredStart;
}

async function findAvailableSlotAcrossCalendars(calendarIds: string[], preferredStart: Date, durationMinutes = 15) {
  const uniqueCalendarIds = Array.from(new Set(calendarIds.map((value) => value.trim()).filter(Boolean)));
  let lastError: Error | null = null;

  for (let index = 0; index < uniqueCalendarIds.length; index += 1) {
    const calendarId = uniqueCalendarIds[index];

    try {
      const slot = await findAvailableSlot(calendarId, preferredStart, durationMinutes);
      return {
        calendarId,
        slot,
        warning:
          index > 0
            ? `The owner's calendar is not shared yet, so Aspen used the connected demo calendar to check availability.`
            : null,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown calendar lookup error');
      console.warn(`Calendar lookup failed for ${calendarId}:`, lastError.message);
    }
  }

  throw lastError ?? new Error('No accessible calendar was available for booking.');
}

async function createCalendarEvent({
  calendarId,
  summary,
  description,
  startTime,
  endTime,
  attendeeEmail,
  timeZone = DEFAULT_TIME_ZONE,
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

const pad2 = (value: number) => value.toString().padStart(2, '0');

const formatNaiveCalendarDateTime = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;

const formatAppointmentLabel = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  return `${parts} ET`;
};

const getDefaultAppointmentStart = () => {
  const start = new Date();
  start.setDate(start.getDate() + 1);

  while (start.getDay() === 0 || start.getDay() === 6) {
    start.setDate(start.getDate() + 1);
  }

  start.setHours(10, 0, 0, 0);
  return start;
};

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const extractAppointmentTimeHint = (transcript: string) => {
  if (!transcript) return '';

  const compactTranscript = transcript.replace(/\s+/g, ' ').trim();
  const patterns = [
    /((?:today|tomorrow|next business day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[^.!?]{0,80})/i,
    /((?:at|for|around|by)\s+\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|in the morning|in the afternoon|in the evening)?)/i,
  ];

  for (const pattern of patterns) {
    const match = compactTranscript.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return '';
};

const parseRequestedAppointmentStart = (appointmentTimeText?: string, transcript = '') => {
  const source = `${appointmentTimeText ?? ''} ${transcript}`.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!source) return null;

  const hasDayHint = /today|tomorrow|next business day|monday|tuesday|wednesday|thursday|friday|saturday|sunday/.test(source);

  const timePatterns = [
    { pattern: /\b(?:at|for|around|by)\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/, hourIndex: 1, minuteIndex: 2, meridiemIndex: 3 },
    { pattern: /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/, hourIndex: 1, minuteIndex: 2, meridiemIndex: 3 },
    { pattern: /\b(\d{1,2})\s*o'?clock\b/, hourIndex: 1, minuteIndex: -1, meridiemIndex: -1 },
  ];

  let parsedTime: { hour: number; minute: number; meridiem?: string } | null = null;

  for (const config of timePatterns) {
    const match = source.match(config.pattern);
    if (!match) continue;

    parsedTime = {
      hour: parseInt(match[config.hourIndex], 10),
      minute: config.minuteIndex > -1 && match[config.minuteIndex] ? parseInt(match[config.minuteIndex], 10) : 0,
      meridiem: config.meridiemIndex > -1 ? match[config.meridiemIndex]?.replace(/\./g, '').toLowerCase() : undefined,
    };
    break;
  }

  if (!hasDayHint && !parsedTime) {
    return null;
  }

  const now = new Date();
  const target = getDefaultAppointmentStart();

  if (/\btoday\b/.test(source)) {
    target.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (/\btomorrow\b/.test(source)) {
    target.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    target.setDate(target.getDate() + 1);
  } else if (!/next business day/.test(source)) {
    for (const [weekdayName, weekdayIndex] of Object.entries(WEEKDAY_MAP)) {
      if (!new RegExp(`\\b${weekdayName}\\b`).test(source)) continue;
      target.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      const diff = (weekdayIndex - now.getDay() + 7) % 7 || 7;
      target.setDate(target.getDate() + diff);
      break;
    }
  }

  if (!/\btoday\b/.test(source)) {
    while (target.getDay() === 0 || target.getDay() === 6) {
      target.setDate(target.getDate() + 1);
    }
  }

  if (parsedTime) {
    let { hour, minute } = parsedTime;
    let meridiem = parsedTime.meridiem;

    if (!meridiem) {
      if (/morning/.test(source)) meridiem = 'am';
      if (/afternoon|evening|tonight/.test(source)) meridiem = 'pm';
    }

    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (!meridiem && /evening|tonight/.test(source) && hour < 12) hour += 12;

    target.setHours(hour, minute, 0, 0);
  }

  return target;
};

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

const extractCallerEmailFromTranscript = (transcript: string) => {
  if (!transcript) return '';

  const directMatches = Array.from(transcript.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)).map((match) => normalizeEmailCandidate(match[0]));
  if (directMatches.length > 0) return directMatches[directMatches.length - 1];

  const flattened = transcript
    .toLowerCase()
    .replace(/\bg\s*mail\b/g, 'gmail')
    .replace(/\s+at\s+/g, '@')
    .replace(/\s+dot\s+/g, '.')
    .replace(/[^a-z0-9@._%+-]/g, ' ')
    .replace(/\s+/g, '');

  return normalizeEmailCandidate(flattened);
};

const extractCallerNameFromTranscript = (transcript: string) => {
  if (!transcript) return '';

  const matches = Array.from(
    transcript.matchAll(/User:\s.*?\b(?:my name is|this is|i am|i'm)\s+([A-Za-z][A-Za-z'-]*)/gi),
  );

  return matches.length > 0 ? matches[matches.length - 1][1] : '';
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
    callbackRequested: /callback|call me|call back|speak with|human|owner/i.test(transcript),
    appointmentRequested: /appointment|book|schedule|consultation|meeting/i.test(transcript),
    transferRequested: /transfer|connect me|put me through|live handoff|live transfer|speak to ron|talk to ron/i.test(transcript),
  };

  const fallbackAppointmentTimeText = extractAppointmentTimeHint(transcript);
  const fallbackCallerName = extractCallerNameFromTranscript(transcript);
  const fallbackCallerEmail = extractCallerEmailFromTranscript(transcript);

  if (!lovableApiKey) {
    return {
      summary: existingSummary || 'Call completed. AI summary is unavailable because LOVABLE_API_KEY is not configured.',
      nextStep: fallbackFlags.appointmentRequested
        ? 'Confirm the requested appointment time and send the owner the details.'
        : fallbackFlags.transferRequested
          ? `Attempt an immediate handoff to ${ownerName}.`
          : fallbackFlags.callbackRequested
            ? 'Call the lead back directly.'
            : 'Review the transcript and follow up if needed.',
      ...fallbackFlags,
      appointmentTimeText: fallbackAppointmentTimeText,
      callerName: fallbackCallerName,
      callerEmail: fallbackCallerEmail,
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
            'You summarize demo call transcripts for business owners. Return strict JSON with these keys only: summary (string), nextStep (string), callbackRequested (boolean), appointmentRequested (boolean), transferRequested (boolean), appointmentTimeText (string), callerName (string), callerEmail (string), keyPoints (array of up to 4 short strings). callerName must be the final confirmed caller name, not the business owner. callerEmail must be the final corrected caller email address if one was provided. appointmentTimeText must capture the exact requested appointment slot or time window if one was mentioned, otherwise return an empty string. Keep the summary practical and concise.',
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
        ? 'Confirm the requested appointment time and send the owner the details.'
        : fallbackFlags.transferRequested
          ? `Attempt an immediate handoff to ${ownerName}.`
          : fallbackFlags.callbackRequested
            ? 'Call the lead back directly.'
            : 'Review the transcript and follow up if needed.'),
    callbackRequested: Boolean(parsed.callbackRequested ?? fallbackFlags.callbackRequested),
    appointmentRequested: Boolean(parsed.appointmentRequested ?? fallbackFlags.appointmentRequested),
    transferRequested: Boolean(parsed.transferRequested ?? fallbackFlags.transferRequested),
    appointmentTimeText:
      typeof parsed.appointmentTimeText === 'string' && parsed.appointmentTimeText.trim()
        ? parsed.appointmentTimeText.trim()
        : fallbackAppointmentTimeText,
    callerName: typeof parsed.callerName === 'string' && parsed.callerName.trim() ? parsed.callerName.trim() : fallbackCallerName,
    callerEmail:
      typeof parsed.callerEmail === 'string' && parsed.callerEmail.trim()
        ? normalizeEmailCandidate(parsed.callerEmail)
        : fallbackCallerEmail,
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 4) : [],
  };
}

async function sendSummaryEmail({
  resendApiKey,
  callerName,
  callerEmail,
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
  transferRequested,
  appointmentScheduledFor,
  keyPoints,
  callDurationSeconds,
}: {
  resendApiKey: string;
  callerName: string;
  callerEmail: string;
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
  transferRequested: boolean;
  appointmentScheduledFor?: string | null;
  keyPoints: string[];
  callDurationSeconds?: number;
}) {
  const pointsHtml = keyPoints.length
    ? `<ul>${keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`
    : '<p>No additional highlights were extracted.</p>';

  const appointmentHtml = appointmentScheduledFor
    ? `<p style="margin: 0 0 8px;"><strong>Confirmed time:</strong> ${escapeHtml(appointmentScheduledFor)}</p>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 760px; margin: 0 auto; color: #0f172a;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Aspen demo call recap</h1>
      <p style="margin-top: 0; color: #475569;">${escapeHtml(businessName)} · ${escapeHtml(websiteUrl)}</p>

      <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0; background: #f8fafc;">
        <h2 style="font-size: 18px; margin: 0 0 8px;">Caller details</h2>
        <p style="margin: 4px 0;"><strong>Name:</strong> ${escapeHtml(callerName || 'Not captured')}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${escapeHtml(callerEmail || 'Not captured')}</p>
        <p style="margin: 4px 0;"><strong>Business owner on file:</strong> ${escapeHtml(ownerName)}</p>
        <p style="margin: 4px 0;"><strong>Owner email on file:</strong> ${escapeHtml(ownerEmail)}</p>
        <p style="margin: 4px 0;"><strong>Owner phone on file:</strong> ${escapeHtml(ownerPhone || 'Not provided')}</p>
        <p style="margin: 4px 0;"><strong>Call length:</strong> ${callDurationSeconds ? `${callDurationSeconds}s` : 'Unavailable'}</p>
      </div>

      <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <h2 style="font-size: 18px; margin: 0 0 8px;">AI summary</h2>
        <p style="margin: 0 0 12px;">${escapeHtml(summary)}</p>
        <p style="margin: 0 0 12px;"><strong>Next step:</strong> ${escapeHtml(nextStep)}</p>
        <p style="margin: 0 0 8px;"><strong>Callback requested:</strong> ${callbackRequested ? 'Yes' : 'No'}</p>
        <p style="margin: 0 0 8px;"><strong>Appointment requested:</strong> ${appointmentRequested ? 'Yes' : 'No'}</p>
        <p style="margin: 0 0 8px;"><strong>Immediate transfer requested:</strong> ${transferRequested ? 'Yes' : 'No'}</p>
        ${appointmentHtml}
        <div><strong>Key points:</strong>${pointsHtml}</div>
      </div>

      <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <h2 style="font-size: 18px; margin: 0 0 8px;">Transcript</h2>
        <pre style="white-space: pre-wrap; word-break: break-word; font-family: Arial, sans-serif; line-height: 1.6; margin: 0;">${escapeHtml(transcript || 'Transcript was not available yet.')}</pre>
      </div>
    </div>
  `;

  const requestedRecipients = Array.from(new Set([ownerEmail, TESTING_INBOX_EMAIL].filter(Boolean)));

  const sendEmail = async (to: string[]) => {
    const res = await fetch(RESEND_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SignalAgent Demo <onboarding@resend.dev>',
        to,
        subject: `Aspen demo recap for ${businessName}`,
        html,
        text: `Aspen demo call recap\n\nBusiness: ${businessName}\nWebsite: ${websiteUrl}\nCaller name: ${callerName || 'Not captured'}\nCaller email: ${callerEmail || 'Not captured'}\nBusiness owner: ${ownerName}\nOwner email: ${ownerEmail}\nOwner phone: ${ownerPhone || 'Not provided'}\n\nSummary: ${summary}\nNext step: ${nextStep}\nCallback requested: ${callbackRequested ? 'Yes' : 'No'}\nAppointment requested: ${appointmentRequested ? 'Yes' : 'No'}\nImmediate transfer requested: ${transferRequested ? 'Yes' : 'No'}\n${appointmentScheduledFor ? `Confirmed time: ${appointmentScheduledFor}\n` : ''}\nTranscript:\n${transcript || 'Transcript was not available yet.'}`,
      }),
    });

    const data = await res.json().catch(() => null);
    return { res, data, recipients: to };
  };

  let result = await sendEmail(requestedRecipients);
  let warning: string | null = null;

  const testingRestriction =
    result.res.status === 403 &&
    result.data?.name === 'validation_error' &&
    typeof result.data?.message === 'string' &&
    result.data.message.includes('testing emails');

  if (!result.res.ok && testingRestriction && requestedRecipients.some((email) => email !== TESTING_INBOX_EMAIL)) {
    console.warn('Resend test mode active; retrying with testing inbox only.');
    result = await sendEmail([TESTING_INBOX_EMAIL]);
    warning = `Testing mode: recap delivered to ${TESTING_INBOX_EMAIL} only.`;
  }

  if (!result.res.ok) {
    throw new Error(`Resend email failed [${result.res.status}]: ${JSON.stringify(result.data)}`);
  }

  return {
    id: result.data?.id ?? null,
    deliveredTo: result.recipients,
    warning,
  };
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

    if (action === 'chat-completion') {
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) {
        return jsonResponse({ error: 'LOVABLE_API_KEY not configured' }, 500);
      }

      const systemPrompt = body.systemPrompt || 'You are a helpful assistant.';
      const chatMessages = Array.isArray(body.messages) ? body.messages : [];

      try {
        const response = await fetch(LOVABLE_AI_BASE, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            temperature: 0.7,
            messages: [
              { role: 'system', content: systemPrompt },
              ...chatMessages,
            ],
          }),
        });

        const completion = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(`AI chat failed [${response.status}]: ${JSON.stringify(completion)}`);
        }

        const content = completion?.choices?.[0]?.message?.content || 'I apologize, I had trouble processing that. Could you try again?';

        return jsonResponse({ success: true, content });
      } catch (err) {
        console.error('Chat completion error:', err);
        return jsonResponse({ error: err instanceof Error ? err.message : 'Chat failed' }, 500);
      }
    }

    if (action === 'email-call-summary') {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        return jsonResponse({ error: 'RESEND_API_KEY not configured' }, 500);
      }

      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      const callId = typeof body.callId === 'string' ? body.callId : '';
      const ownerEmail = typeof body.ownerEmail === 'string' ? body.ownerEmail.trim() : '';
      const ownerNameInput = typeof body.ownerName === 'string' ? body.ownerName.trim() : '';
      const ownerPhone = typeof body.ownerPhone === 'string' ? body.ownerPhone.trim() : '';
      const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : 'Demo Business';
      const websiteUrl = typeof body.websiteUrl === 'string' ? body.websiteUrl.trim() : '';
      const resolvedOwnerName = ownerNameInput || DEFAULT_OWNER_NAME;

      if (!callId) {
        return jsonResponse({ error: 'callId is required' }, 400);
      }
      const effectiveOwnerEmail = ownerEmail || TESTING_INBOX_EMAIL;

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
        ownerName: resolvedOwnerName,
        ownerPhone,
        ownerEmail: effectiveOwnerEmail,
        lovableApiKey: lovableApiKey || undefined,
        existingSummary: callData?.call_analysis?.call_summary || callData?.call_analysis?.summary,
      });

      let calendarEventId: string | null = null;
      let appointmentScheduledFor: string | null = null;
      let calendarWarning: string | null = null;

      if (aiSummary.appointmentRequested) {
        try {
          const preferredStart =
            parseRequestedAppointmentStart(aiSummary.appointmentTimeText, transcript) ?? getDefaultAppointmentStart();
          const attendeeEmail = aiSummary.callerEmail || undefined;
          const bookingContext = await findAvailableSlotAcrossCalendars([effectiveOwnerEmail, TESTING_INBOX_EMAIL], preferredStart, 15);
          const calendarIdForBooking = bookingContext.calendarId;
          const appointmentStart = bookingContext.slot;
          const appointmentEnd = new Date(appointmentStart);
          appointmentEnd.setMinutes(appointmentEnd.getMinutes() + 15);
          calendarWarning = bookingContext.warning;

          const wasRescheduled = appointmentStart.getTime() !== preferredStart.getTime();
          appointmentScheduledFor = `${formatAppointmentLabel(appointmentStart)} (15 minutes)${wasRescheduled ? ' — adjusted from requested time due to existing calendar conflict' : ''}`;

          const calEvent = await createCalendarEvent({
            calendarId: calendarIdForBooking,
            summary: `Aspen Demo Follow-up: ${resolvedOwnerName} — ${businessName}`,
            description: `Auto-booked by Aspen AI after a demo call.\n\nSummary: ${aiSummary.summary}\nNext step: ${aiSummary.nextStep}\nRequested slot: ${appointmentScheduledFor || aiSummary.appointmentTimeText || 'Default next business day at 10:00 AM ET'}\n\nPhone: ${ownerPhone || 'Not provided'}\nEmail: ${effectiveOwnerEmail}\nWebsite: ${websiteUrl}`,
            startTime: formatNaiveCalendarDateTime(appointmentStart),
            endTime: formatNaiveCalendarDateTime(appointmentEnd),
            attendeeEmail,
            timeZone: DEFAULT_TIME_ZONE,
          });

          calendarEventId = calEvent?.id || null;
          console.log('Calendar event created:', calendarEventId);

          if (!attendeeEmail) {
            calendarWarning = [calendarWarning, 'Aspen could not confidently capture the caller email, so no invite email was sent.']
              .filter(Boolean)
              .join(' ');
          }
        } catch (calErr) {
          calendarWarning = calErr instanceof Error ? calErr.message : 'Calendar availability could not be checked.';
          console.error('Failed to create calendar event (non-fatal):', calErr);
        }
      }

      let emailResult: { id: string | null; deliveredTo: string[]; warning: string | null } | null = null;
      let emailWarning: string | null = null;

      try {
        emailResult = await sendSummaryEmail({
          resendApiKey,
          callerName: aiSummary.callerName || '',
          callerEmail: aiSummary.callerEmail || '',
          ownerName: resolvedOwnerName,
          ownerEmail: effectiveOwnerEmail,
          ownerPhone,
          businessName,
          websiteUrl,
          transcript,
          summary: aiSummary.summary,
          nextStep: aiSummary.nextStep,
          callbackRequested: aiSummary.callbackRequested,
          appointmentRequested: aiSummary.appointmentRequested,
          transferRequested: aiSummary.transferRequested,
          appointmentScheduledFor,
          keyPoints: aiSummary.keyPoints,
          callDurationSeconds:
            typeof callData?.duration_ms === 'number' ? Math.round(callData.duration_ms / 1000) : undefined,
        });

        emailWarning = emailResult.warning;
        console.log('Call summary email sent:', emailResult.id || 'no-id');
      } catch (emailErr) {
        emailWarning = emailErr instanceof Error ? emailErr.message : 'Unable to send recap email.';
        console.error('Failed to send recap email (non-fatal):', emailErr);
      }

      return jsonResponse({
        success: true,
        callbackRequested: aiSummary.callbackRequested,
        appointmentRequested: aiSummary.appointmentRequested,
        transferRequested: aiSummary.transferRequested,
        emailId: emailResult?.id ?? null,
        emailDeliveredTo: emailResult?.deliveredTo ?? [],
        emailWarning,
        calendarEventId,
        appointmentScheduledFor,
        calendarWarning,
      });
    }

    if (action === 'warm-transfer') {
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) {
        return jsonResponse({ error: 'LOVABLE_API_KEY not configured' }, 500);
      }

      const twilioApiKey = Deno.env.get('TWILIO_API_KEY');
      if (!twilioApiKey) {
        return jsonResponse({ error: 'TWILIO_API_KEY not configured' }, 500);
      }

      const transferTo = normalizePhoneNumber(body.transferTo) || DEFAULT_TRANSFER_NUMBER;
      const callerName = typeof body.callerName === 'string' ? body.callerName.trim() : 'a caller';
      const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : 'Demo Business';
      const resolvedOwnerName = typeof body.ownerName === 'string' && body.ownerName.trim() ? body.ownerName.trim() : DEFAULT_OWNER_NAME;
      const callId = typeof body.callId === 'string' ? body.callId : '';

      console.log(`Initiating warm transfer to ${transferTo} for call ${callId}`);

      // Caller's phone for Ron to call back
      const callerPhone = typeof body.callerPhone === 'string' ? normalizePhoneNumber(body.callerPhone) : '';

      // Use Twilio TwiML to announce caller details so Ron can call them back immediately
      const callerPhoneAnnouncement = callerPhone
        ? ` Their phone number is ${callerPhone.split('').join(' ')}. Again, ${callerPhone.split('').join(' ')}.`
        : ' Their phone number was not captured — check the email recap for details.';
      const twimlMessage = `Hello ${resolvedOwnerName}, this is Aspen, the AI assistant for ${businessName}. ${callerName} just finished a demo call and would like to speak with you right away.${callerPhoneAnnouncement} Please call them back as soon as possible. Thank you!`;
      const twimlUrl = `http://twimlets.com/message?Message%5B0%5D=${encodeURIComponent(twimlMessage)}`;

      try {
        const response = await fetch(`${TWILIO_GATEWAY_URL}/Calls.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'X-Connection-Api-Key': twilioApiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: transferTo,
            From: TWILIO_CALLER_ID,
            Url: twimlUrl,
          }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(`Twilio call failed [${response.status}]: ${JSON.stringify(data)}`);
        }

        console.log('Warm transfer call initiated:', data?.sid);

        return jsonResponse({
          success: true,
          callSid: data?.sid,
          transferTo,
          transferTitle: TRANSFER_TITLE,
        });
      } catch (err) {
        console.error('Warm transfer error:', err);
        return jsonResponse({
          error: err instanceof Error ? err.message : 'Transfer failed',
          fallback: 'callback',
        }, 500);
      }
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

    const resolvedOwnerName = typeof ownerName === 'string' && ownerName.trim() ? ownerName.trim() : DEFAULT_OWNER_NAME;
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
          owner_name: resolvedOwnerName,
          owner_email: ownerEmail || '',
          website_url: websiteUrl || '',
          business_info: (businessInfo || 'A professional business offering quality services.').substring(0, 12000),
          owner_phone: normalizedOwnerPhone || '',
          caller_name: '',
          caller_email: '',
          voice_persona: `You are Aspen, the AI voice assistant for ${businessName || 'this business'}. You are FUNNY, CORDIAL, and CONVERSATIONAL — like a witty, charming receptionist who genuinely loves helping people.

CRITICAL OPENING RULE:
- When the call starts, greet the caller warmly and IMMEDIATELY ask for their name. Example: "Hey there! Thanks for calling ${businessName || 'us'}! Before we dive in, who do I have the pleasure of speaking with today?"
- Once they tell you their name, USE IT naturally throughout the conversation.
- NEVER assume the caller's name. ALWAYS ask first.

TWO PEOPLE IN EVERY CALL:
- The CALLER is the person on the phone right now — a potential customer/lead. You do NOT know their name until they tell you.
- The BUSINESS OWNER is ${resolvedOwnerName} — the person who owns ${businessName || 'this business'}. When offering callbacks, appointments, or transfers, always refer to ${resolvedOwnerName} by name.
- These are DIFFERENT people. Never confuse them.

PERSONALITY RULES:
- Be warm and playful. Use light humor and casual language.
- Let the caller ask questions — don't monologue. Keep answers to 2-3 sentences max.
- Validate their questions: "Oh great question!" / "I love that you asked that!"
- Sound human, not robotic. Use filler words occasionally: "So...", "Well...", "Actually..."
- If something is funny or relatable, acknowledge it with warmth.

KNOWLEDGE: Use the business_info to answer questions about services, pricing, service area, and competitors. If you don't have a specific answer, use common ${businessNiche || 'industry'} knowledge to give a helpful response and offer to have ${resolvedOwnerName} follow up with specifics.

LIVE CALENDAR HONESTY:
- Never claim someone is available all day or say a time is booked before a real calendar check happens.
- If someone asks about availability, say you can REQUEST their preferred time and the calendar will be checked right after the call.
- If the caller gives a preferred time, confirm it as a requested slot, not a guaranteed booking.

EMAIL CAPTURE RULES:
- Never use owner_email as the caller's email. owner_email belongs only to the business owner.
- If you promise to send anything by email, explicitly ask for the caller's best email address.
- After they say it, repeat it back slowly and clearly, character by character.
- Always confirm gmail as "g-m-a-i-l dot com" when that is the domain.
- If the caller corrects any part of the email, discard the old version and restate only the corrected one.
- If you are not fully sure, ask them to repeat it once more instead of guessing.

APPOINTMENT & CALLBACK:
- When offering to schedule, say something like: "I can request a time for you to chat with ${resolvedOwnerName}. What day and time works best for you?"
- At the end of the call, confirm: "I'll make sure ${resolvedOwnerName} gets all the details from our chat, and we'll confirm the timing by email if needed!"

LIVE TRANSFER / CALLBACK:
- If the caller asks to speak with someone right now, a live person, or requests a transfer, FIRST make sure you have their phone number. Ask: "Absolutely! Before I get ${resolvedOwnerName} on the line, can I grab your phone number so they can reach you right away?"
- Once you have their phone number, say: "Perfect! I'll have ${resolvedOwnerName} call you right back — usually within a minute or two. Hang tight!"
- Mark this as a transfer request so the system can alert ${resolvedOwnerName} immediately.
- Do NOT say you are "connecting" or "transferring" them live — instead frame it as an immediate callback.

DEMO CONTEXT: This is a demonstration of AI voice capabilities. If the caller asks about signing up for the AI service itself, you can mention they can speak with Ron Melo, our Director of Sales, about getting this for their own business.`,
        },
        metadata: {
          niche: businessNiche || 'general',
          owner_name: resolvedOwnerName,
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
