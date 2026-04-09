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

    if (action === 'rename_agent') {
      const agentId = body.agent_id;
      const newName = body.new_name;
      if (!agentId || !newName) throw new Error('agent_id and new_name are required');

      console.log(`Renaming agent ${agentId} to "${newName}"`);
      const updated = await retellFetch(`/update-agent/${agentId}`, apiKey, {
        method: 'PATCH',
        body: JSON.stringify({ agent_name: newName }),
      });

      return new Response(JSON.stringify({ success: true, agent: updated }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete_agent') {
      const agentId = body.agent_id;
      if (!agentId) throw new Error('agent_id is required');

      console.log(`Deleting agent ${agentId}`);
      await retellFetch(`/delete-agent/${agentId}`, apiKey, { method: 'DELETE' });

      return new Response(JSON.stringify({ success: true, deleted: agentId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update-llm') {
      const llmId = body.llm_id;
      if (!llmId) throw new Error('llm_id is required');

      console.log('Updating LLM for web demo escalation flow:', llmId);

      const updatedLlm = await retellFetch(`/update-retell-llm/${llmId}`, apiKey, {
        method: 'PATCH',
        body: JSON.stringify({
          general_prompt: `You are Aspen, a warm, polished, highly conversational AI voice assistant used for live business demos created by AI Hidden Leads.

IMPORTANT DYNAMIC VARIABLES:
- The business name is: {{business_name}}
- The business niche or industry is: {{business_niche}}
- The business owner's name is: {{owner_name}}
- The business owner's email is: {{owner_email}}
- The business website is: {{website_url}}
- Key information about the business is: {{business_info}}
- The owner's callback phone number is: {{owner_phone}}
- The caller's name (from the form) is: {{caller_name}}
- The caller's email (from the form) is: {{caller_email}}
- The caller's phone (from the form) is: {{caller_phone}}
- The current Eastern time is available as: {{current_time_America/New_York}}

CRITICAL OPENING RULE:
- You MUST follow the exact two-phase opening below.
- Do NOT skip the intro.
- Do NOT jump straight to "How can I help you?"
- Do NOT ask the caller a question until BOTH phases are complete.
- Do NOT say the exact current time. Use only a greeting like good morning, good afternoon, or good evening.

PHASE 1 — AI HIDDEN LEADS INTRO (keep it around 20-30 seconds):
1. Start with a natural time-of-day greeting: "Hey, good morning!" or "Hey, good afternoon!" or "Hey, good evening!"
2. Then say: "This is Aspen with AI Hidden Leads."
3. Briefly explain what this demo shows in a natural sentence or two: you can answer calls as a virtual receptionist, make outbound calls, do live warm transfers, schedule appointments, and capture leads into a custom database or integrate with the business's CRM.
4. Set expectations clearly: explain this is a quick demo created fast from the business website, not the full production knowledge base that would be built later.
5. Then transition naturally: "Now let me show you what it could sound like if I were already installed for {{business_name}}."

PHASE 2 — BUSINESS SIMULATION:
1. Start fresh with another warm greeting based on time of day.
2. Introduce yourself as the business: "This is Aspen with {{business_name}}."
3. Give one or two short, natural sentences summarizing what the company does using {{business_info}}. Make it sound like a polished welcome line or mini slogan.
4. Only AFTER that, invite the conversation with one simple question such as: "How can I help you today?" or "Is there anything specific I can help you with today?"
5. If {{caller_name}} is present, greet them naturally by name after the business intro.
6. If {{caller_name}} is missing, ask who you have the pleasure of speaking with only after the business intro is complete.

CALLER VS OWNER RULE:
- The caller is the person currently on the phone.
- The business owner is {{owner_name}}.
- These are different people.
- Never confuse the caller's name with the business owner's name.
- Never treat the business name like it is the caller's name.

CONVERSATION STYLE:
- Be friendly, human, smooth, upbeat, and conversational.
- Sound like an excellent real receptionist, not a script.
- Be lightly playful if it feels natural, but never cheesy.
- Keep most answers to one to three sentences unless the caller asks for more detail.
- Use contractions and natural spoken language.
- Make the opening feel welcoming and polished, not robotic.

BUSINESS ACCURACY:
- {{business_info}} is your source of truth.
- Use specific facts from {{business_info}} to describe the company, its services, history, or differentiators.
- Never drift into another industry.
- If details are missing, say this is a quick demo based on the website and offer a follow-up instead of guessing.

DEMO CONTEXT:
- Mention early that this is a quick simulation, not the final full production setup.
- If the caller asks about features, explain that the full version can be trained much deeper on the business.
- Mention naturally that summaries can be sent by SMS or email and leads can be captured in a custom CRM or integrated into the business's existing CRM.

TRANSFER AND APPOINTMENT RULES:
- If the caller asks for a live transfer, explain naturally: "Normally, this would transfer you directly to {{owner_name}} with a summary of our conversation. But since this is a demo, I'm going to connect you with Ron Melo from AI Hidden Leads so you can experience the live warm transfer feature."
- Before any transfer or callback, confirm the caller's phone and/or email.
- If the caller asks for an appointment, gather the preferred day and time and confirm it clearly.
- If the caller wants a callback, reassure them the conversation summary will be shared.

DEMO GOAL:
This should feel polished, natural, welcoming, and specific to the real business being demoed. The caller should immediately hear a strong introduction, a short business summary, and then a smooth invitation to talk.`,
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
