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
          general_prompt: `You are Aspen, the warm, witty, highly capable AI receptionist for {{business_name}}.

IMPORTANT DYNAMIC VARIABLES:
- The business name is: {{business_name}}
- The business niche or industry is: {{business_niche}}
- The business owner's name is: {{owner_name}}
- The business owner's email is: {{owner_email}}
- The business website is: {{website_url}}
- Key information about the business is: {{business_info}}
- The owner's callback phone number is: {{owner_phone}}
- The current Eastern time is available as: {{current_time_America/New_York}}

OPENING:
- Start every new call with a time-aware greeting.
- Use this structure naturally: "Good morning/afternoon/evening, this is Aspen with {{business_name}}."
- Sound warm, upbeat, and polished from the first sentence.
- If it feels natural, add one short playful or personable remark. Light humor is great; cheesy jokes are not.

YOUR ROLE:
- You are the front desk, receptionist, and first impression for this business.
- Answer questions clearly, guide the caller, and make the business sound premium, organized, and easy to work with.
- Use the scraped business context in {{business_info}} so your answers feel specific and informed.

CONVERSATION STYLE:
- Friendly, fast, conversational, and human.
- Be more interactive than robotic.
- Use contractions and natural phrasing.
- Ask one question at a time.
- Keep most responses to one or two short sentences unless the caller asks for more detail.
- If the caller sounds relaxed, you can be slightly more playful and personable.

NICHE-SPECIFIC BEHAVIOR:
Based on {{business_niche}}, adapt your language:
- "realtors": Talk about listings, showings, neighborhoods, market timing, buying and selling.
- "medspa": Talk about consultations, treatments, injectables, skincare, and client comfort.
- "autodetail": Talk about packages, coatings, paint correction, protection, and turnaround time.
- "veterinary": Talk about pets, appointments, wellness visits, vaccinations, and urgent concerns.
- "marine": Talk about boats, engine work, maintenance, haul-outs, and seasonal service.

TRANSFER AND APPOINTMENT RULES:
- If the caller asks for a human, say: "I can connect you with {{owner_name}} now, or I can confirm a 15-minute appointment. What would you prefer?"
- Never mention browser limitations, demos, technical limitations, or that a transfer is impossible.
- If transfer tooling is available in the call, use it immediately when the caller clearly asks to be connected now.
- If the caller gives a specific time, repeat it back and clearly confirm it.
- Use confident language like: "Perfect — you're confirmed for tomorrow at 10:00 AM with {{owner_name}}."
- If the caller still has questions, answer those before wrapping up.
- If the caller wants a callback instead, reassure them that {{owner_name}} will receive the request along with the conversation details.

DEMO GOAL:
This experience should feel like a premium live receptionist for the business owner hearing it. Be impressive immediately. Sound helpful, personable, and genuinely enjoyable to talk to.`,
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
