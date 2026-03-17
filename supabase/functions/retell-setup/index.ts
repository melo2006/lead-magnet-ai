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

    // Step 1: List all agents to find "Taylor" and get phone number
    console.log('Listing existing agents...');
    const agents = await retellFetch('/list-agents', apiKey);
    console.log(`Found ${agents.length} agents`);

    const taylorAgent = agents.find((a: any) =>
      a.agent_name?.toLowerCase().includes('taylor')
    );

    // Step 2: List phone numbers to find Taylor's number
    console.log('Listing phone numbers...');
    const phoneNumbers = await retellFetch('/list-phone-numbers', apiKey);
    console.log(`Found ${phoneNumbers.length} phone numbers`);

    let demoPhoneNumber = null;
    if (taylorAgent) {
      console.log(`Found Taylor agent: ${taylorAgent.agent_id}`);
      // Find phone number bound to Taylor
      demoPhoneNumber = phoneNumbers.find((p: any) =>
        p.inbound_agent_id === taylorAgent.agent_id
      );
    }

    if (!demoPhoneNumber && phoneNumbers.length > 0) {
      // Use first available phone number
      demoPhoneNumber = phoneNumbers[0];
    }

    console.log('Demo phone number:', demoPhoneNumber?.phone_number || 'none found');

    // Step 3: Create Retell LLM with dynamic niche prompt
    console.log('Creating Retell LLM for Aspen...');
    const llm = await retellFetch('/create-retell-llm', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        model: 'gpt-4o',
        general_prompt: `You are Aspen, a friendly, professional AI assistant for a business. You work for the company whose website the prospect just visited.

IMPORTANT DYNAMIC VARIABLES:
- The business name is: {{business_name}}
- The business niche/industry is: {{business_niche}}
- The business owner's name is: {{owner_name}}
- The business website is: {{website_url}}
- Key information about the business: {{business_info}}

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
When the caller seems satisfied or wants to speak with a human:
1. Say: "I'd love to connect you directly with {{owner_name}}. Let me transfer you now."
2. Perform a warm transfer to the owner's phone.

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

    console.log('Created LLM:', llm.llm_id);

    // Step 4: Create the Aspen voice agent
    console.log('Creating Aspen voice agent...');
    const aspenAgent = await retellFetch('/create-agent', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        agent_name: 'Aspen - SignalAgent Demo',
        response_engine: {
          type: 'retell-llm',
          llm_id: llm.llm_id,
        },
        voice_id: '11labs-Aria',
        voice_model: 'eleven_turbo_v2',
        language: 'en-US',
        opt_out_sensitive_data_storage: false,
        responsiveness: 0.6,
        interruption_sensitivity: 0.7,
        enable_backchannel: true,
        backchannel_frequency: 0.5,
        reminder_trigger_ms: 10000,
        reminder_max_count: 2,
        ambient_sound: 'coffee-shop',
        ambient_sound_volume: 0.3,
      }),
    });

    console.log('Created Aspen agent:', aspenAgent.agent_id);

    return new Response(JSON.stringify({
      success: true,
      agent: {
        agent_id: aspenAgent.agent_id,
        agent_name: aspenAgent.agent_name,
        llm_id: llm.llm_id,
      },
      phoneNumber: demoPhoneNumber ? {
        phone_number: demoPhoneNumber.phone_number,
        phone_number_pretty: demoPhoneNumber.phone_number_pretty,
        nickname: demoPhoneNumber.nickname,
      } : null,
      taylor: taylorAgent ? {
        agent_id: taylorAgent.agent_id,
        agent_name: taylorAgent.agent_name,
      } : null,
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
