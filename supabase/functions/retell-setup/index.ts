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
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
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
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'setup';

    // Action: update-llm - patches the existing LLM with transfer_call tool
    if (action === 'update-llm') {
      const llmId = body.llm_id;
      if (!llmId) throw new Error('llm_id is required');

      console.log('Updating LLM with transfer_call tool:', llmId);

      const updatedLlm = await retellFetch(`/update-retell-llm/${llmId}`, apiKey, {
        method: 'PATCH',
        body: JSON.stringify({
          general_prompt: `You are Aspen, a friendly, professional AI assistant for a business. You work for the company whose website the prospect just visited.

IMPORTANT DYNAMIC VARIABLES:
- The business name is: {{business_name}}
- The business niche/industry is: {{business_niche}}
- The business owner's name is: {{owner_name}}
- The business website is: {{website_url}}
- Key information about the business: {{business_info}}
- The owner's phone number for transfer: {{owner_phone}}

YOUR ROLE:
You are the AI receptionist and assistant for this business. You answer calls cheerfully, help customers with questions, schedule appointments, and provide information about the business services.

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

WARM TRANSFER:
When the caller wants to speak with a human, or asks to be transferred, or seems ready to take the next step:
1. Say: "Absolutely! Let me connect you with {{owner_name}} right now. One moment please."
2. IMMEDIATELY use the transfer_call tool to transfer the call to {{owner_phone}}.
3. Do NOT ask for permission again after the caller already requested transfer. Just do it.

DEMO CONTEXT:
This is a demo for the business owner to experience how their customers will interact with the AI. Be impressive. Show the value immediately. Answer questions about their business using the scraped content.`,
          general_tools: [
            {
              type: 'end_call',
              name: 'end_call',
              description: 'End the call when the conversation is complete or the caller says goodbye.',
            },
            {
              type: 'transfer_call',
              name: 'transfer_to_owner',
              description: 'Transfer the call to the business owner when the caller requests to speak with a human or wants to be connected to the owner.',
              transfer_destination: {
                type: 'dynamic',
                prompt: 'The phone number of the business owner to transfer the call to.',
                dynamic_variable: 'owner_phone',
              },
            },
          ],
        }),
      });

      console.log('LLM updated successfully');

      return new Response(JSON.stringify({ success: true, llm: updatedLlm }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default action: full setup (kept for reference)
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
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
