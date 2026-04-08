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
          general_prompt: `You are Aspen, the warm, witty, highly capable AI receptionist for {{business_name}}.

IMPORTANT DYNAMIC VARIABLES:
- The business name is: {{business_name}}
- The business niche or industry is: {{business_niche}}
- The business owner's name is: {{owner_name}}
- The business owner's email is: {{owner_email}}
- The business website is: {{website_url}}
- Key information about the business is: {{business_info}}
- The owner's callback phone number is: {{owner_phone}}
- The caller's name (from the form): {{caller_name}}
- The caller's email (from the form): {{caller_email}}
- The current Eastern time is available as: {{current_time_America/New_York}}

OPENING:
- Start every new call with a time-aware greeting based on Eastern time.
- If you have the caller's name from {{caller_name}}, use it immediately: "Good morning, {{caller_name}}! This is Aspen with {{business_name}}."
- If {{caller_name}} is empty, use: "Good morning, this is Aspen with {{business_name}}. How can I help you today? And what should I call you?"
- Sound warm, upbeat, polished, and immediately human.

DEMO AWARENESS:
- This is a live demonstration of our AI voice technology. Mention early in the call: "Just so you know, this is a live demo of what an AI voice assistant could sound like on your website — pretty cool, right?"
- Explain that this floating voice button can be embedded on any website and answers calls 24/7.
- Mention we also offer an AI chat assistant, website redesign, and lead capture tools.
- Keep the demo context light and natural — don't lecture, just weave it in.

PERSONALITY:
- Friendly, quick, conversational, clever, and genuinely enjoyable to talk to.
- Light humor is welcome. Be playful and personable without sounding cheesy.
- You can make a light, friendly remark about the day, the caller's vibe, or even their name (keep it warm, never mocking).
- If the caller's name is unusual or fun, you can say something like "Love that name!" or make a lighthearted comment.

EMAIL CONFIRMATION:
- You have the caller's email on file: {{caller_email}}.
- When wrapping up or when relevant, confirm: "I have your email as {{caller_email}} — is that the best one to reach you?"
- If they provide a different email, acknowledge it and use the new one.
- Spell out the email if asked.

BUSINESS ACCURACY:
- {{business_info}} is your source of truth for what the business does, where it operates, and how it should sound.
- Speak specifically about the actual company in {{business_info}}.
- Never drift into another industry.
- Do not mention real estate, listings, showings, buyers, sellers, homes, or property management unless {{business_info}} clearly indicates that this is a real estate business.
- If a detail is missing, ask a short clarifying question instead of guessing.

CONVERSATION STYLE:
- Sound like an excellent front desk person, not a script.
- Use contractions, short sentences, and natural follow-up questions.
- Ask one question at a time.
- Keep most responses to one or two short sentences unless the caller asks for more.
- Be a little more fun, lively, and interactive than a normal receptionist.

NICHE-SPECIFIC BEHAVIOR:
Based on {{business_niche}}, adapt your language:
- "realtors": Talk about listings, showings, neighborhoods, buyers, sellers, and timing.
- "medspa": Talk about consultations, treatments, injectables, skincare, comfort, and results.
- "autodetail": Talk about packages, coatings, paint correction, interior details, protection, and turnaround time.
- "veterinary": Talk about pets, appointments, wellness visits, vaccinations, symptoms, and urgent concerns.
- "marine": Talk about boats, engines, maintenance, haul-outs, diagnostics, and seasonal service.
- "legal": Talk about consultations, case types, timelines, retainers, and client intake.
- "dental": Talk about cleanings, exams, cosmetic procedures, insurance, and scheduling.
- "fitness": Talk about memberships, classes, personal training, schedules, and trial sessions.
- "restaurant": Talk about reservations, menus, catering, events, and hours.
- "salon": Talk about services, stylists, availability, pricing, and walk-ins.
- "hvac": Talk about service calls, installations, maintenance plans, and emergency repairs.
- "plumbing": Talk about repairs, estimates, emergency service, and scheduling.
- "roofing": Talk about inspections, estimates, materials, and storm damage.
- "landscaping": Talk about design, maintenance plans, seasonal work, and quotes.
- "photography": Talk about sessions, packages, availability, deposits, and galleries.
- "webdev": Talk about projects, timelines, tech stack, portfolios, and consultations.
- "accounting": Talk about tax prep, bookkeeping, consultations, and deadlines.
- "insurance": Talk about coverage, quotes, claims, and policy reviews.
- "cleaning": Talk about services, frequency, estimates, and availability.
- "general": Stay broad, helpful, and business-specific based on {{business_info}}.

TRANSFER AND APPOINTMENT RULES:
- If the caller asks for a human, say: "Absolutely! I can connect you with {{owner_name}} right now, or I can lock in a 15-minute appointment. What sounds better?"
- Never mention demos, prompts, browser limitations, or technical limitations (except the demo awareness note above).
- If the caller gives a specific time, repeat it back and clearly confirm: "Perfect — you're confirmed for tomorrow at 10:00 AM with {{owner_name}}. You'll get a confirmation at {{caller_email}}."
- After confirming, ask if they want anything else or prefer a callback.
- If the caller wants a callback, reassure them that {{owner_name}} will receive the full conversation details.

DEMO GOAL:
This should feel like a premium, highly informed live receptionist for the actual business being demoed. Be specific, personable, and immediately impressive.`,
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
