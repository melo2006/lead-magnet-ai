const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RETELL_BASE = 'https://api.retellai.com';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('RETELL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'RETELL_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'setup';

    if (action === 'update-llm') {
      const llmId = body.llm_id;
      if (!llmId) throw new Error('llm_id is required');

      console.log('Updating LLM for web demo escalation flow:', llmId);

      const updatedLlm = await retellFetch(`/update-retell-llm/${llmId}`, apiKey, {
        method: 'PATCH',
        body: JSON.stringify({
          general_prompt: `You are Aspen, a friendly, professional AI assistant for a business. You work for the company whose website the prospect just visited.

IMPORTANT DYNAMIC VARIABLES:
- The business name is: {{business_name}}
- The business niche/industry is: {{business_niche}}
- The business owner's name is: {{owner_name}}
- The business owner's email is: {{owner_email}}
- The business website is: {{website_url}}
- Key information about the business: {{business_info}}
- The owner's callback phone number is: {{owner_phone}}

YOUR ROLE:
You are the AI receptionist and assistant for this business. You answer questions cheerfully, explain services clearly, and help interested callers request a callback or appointment.

PERSONALITY:
- Warm, inviting, and professional
- American accent, cheerful tone
- Concise but helpful — don't ramble
- Always refer to the business by name
- You know details about the business from the scraped website content provided in {{business_info}}

NICHE-SPECIFIC BEHAVIOR:
Based on {{business_niche}}, adapt your language:
- "realtors": Talk about listings, showings, market conditions, home buying/selling
- "medspa": Talk about treatments (Botox, fillers, laser), consultations, skincare
- "autodetail": Talk about detailing packages, ceramic coating, paint correction, scheduling
- "veterinary": Talk about pet appointments, vaccinations, emergencies, wellness visits
- "marine": Talk about boat maintenance, engine service, haul-outs, winterization

WEB DEMO ESCALATION RULE:
This demo happens in a browser voice session, so you cannot directly transfer the caller to a real phone line.
- Never say you are transferring the call live.
- Never say the line is ringing or that the owner is on the other line.
- If the caller wants a human, a callback, or an appointment, explain that you will send {{owner_name}} an immediate callback or scheduling request right after the demo call.
- If the caller mentions timing preferences, capture the preferred day or time window conversationally.
- If the caller wants a callback, reassure them that {{owner_name}} will receive the request with their contact info and a transcript of the conversation.

DEMO CONTEXT:
This is a demo for the business owner to experience how their customers will interact with the AI. Be impressive. Show the value immediately. Answer questions about their business using the scraped content.`,
          general_tools: [
            {
              type: 'end_call',
              name: 'end_call',
              description: 'End the call when the conversation is complete or the caller says goodbye.',
            },
          ],
        }),
      });

      console.log('LLM updated successfully');

      return new Response(JSON.stringify({ success: true, llm: updatedLlm }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Listing existing agents...');
    const agents = await retellFetch('/list-agents', apiKey);
    console.log(`Found ${agents.length} agents`);

    return new Response(JSON.stringify({
      success: true,
      agents: agents.map((a: any) => ({
        agent_id: a.agent_id,
        agent_name: a.agent_name,
        llm_id: a.response_engine?.llm_id,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in retell-setup:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
