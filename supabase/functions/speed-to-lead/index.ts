import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RETELL_BASE = 'https://api.retellai.com';
const DEFAULT_RETELL_AGENT_ID = 'agent_0dd08673d770e8adf08f920490';

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

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    
    if (!retellApiKey) {
      return json({ error: 'RETELL_API_KEY not configured' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { prospect_id, trigger, agent_id } = body;

    if (!prospect_id) {
      return json({ error: 'prospect_id is required' }, 400);
    }

    // Fetch prospect data
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', prospect_id)
      .single();

    if (prospectError || !prospect) {
      return json({ error: 'Prospect not found' }, 404);
    }

    // Determine best phone number to call
    const phoneToCall = prospect.owner_phone || prospect.phone;
    if (!phoneToCall) {
      console.log(`No phone number for prospect ${prospect_id}, skipping auto-call`);
      
      // Still update engagement tracking
      await supabase.from('prospects').update({
        pipeline_stage: 'interested',
        updated_at: new Date().toISOString(),
      }).eq('id', prospect_id);

      return json({ success: true, action: 'pipeline_updated', reason: 'no_phone' });
    }

    // Normalize phone number
    const digits = phoneToCall.replace(/\D/g, '');
    let normalizedPhone = phoneToCall;
    if (digits.length === 10) normalizedPhone = `+1${digits}`;
    else if (digits.length === 11 && digits.startsWith('1')) normalizedPhone = `+${digits}`;

    // Check if we already called this prospect in the last hour (prevent spam)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentCalls } = await supabase
      .from('call_history')
      .select('id')
      .eq('prospect_id', prospect_id)
      .eq('trigger_source', 'speed_to_lead')
      .gte('created_at', oneHourAgo)
      .limit(1);

    if (recentCalls && recentCalls.length > 0) {
      console.log(`Already called prospect ${prospect_id} within the last hour, skipping`);
      return json({ success: true, action: 'skipped', reason: 'recent_call' });
    }

    // Get the agent ID - use provided or find the first available
    let targetAgentId = agent_id || DEFAULT_RETELL_AGENT_ID;
    if (!targetAgentId) {
      const agents = await retellFetch('/list-agents', retellApiKey);
      if (agents && agents.length > 0) {
        targetAgentId = agents[0].agent_id;
      }
    }

    if (!targetAgentId) {
      return json({ error: 'No Retell agent available' }, 500);
    }

    // Build dynamic variables for the AI agent
    const businessData = prospect.business_data || {};
    const businessInfo = businessData.exa_research 
      ? (Array.isArray(businessData.exa_research) ? businessData.exa_research.join('\n\n') : businessData.exa_research)
      : `${prospect.business_name} located at ${prospect.formatted_address || 'unknown location'}`;

    const retellVariables = {
      business_name: prospect.business_name,
      business_niche: prospect.niche || 'general',
      owner_name: prospect.owner_name || 'the business owner',
      owner_email: prospect.owner_email || '',
      website_url: prospect.website_url || '',
      business_info: typeof businessInfo === 'string' ? businessInfo.slice(0, 2000) : '',
      owner_phone: normalizedPhone,
      caller_name: '',
      caller_email: '',
      trigger_type: trigger || 'demo_click',
    };

    console.log(`Initiating speed-to-lead outbound call to ${normalizedPhone} for ${prospect.business_name}`);

    // Create outbound phone call via Retell
    const callResult = await retellFetch('/v2/create-phone-call', retellApiKey, {
      method: 'POST',
      body: JSON.stringify({
        from_number: Deno.env.get('RETELL_PHONE_NUMBER') || '+19548336081',
        to_number: normalizedPhone,
        agent_id: targetAgentId,
        retell_llm_dynamic_variables: retellVariables,
        metadata: {
          prospect_id: prospect.id,
          trigger_source: 'speed_to_lead',
          trigger_event: trigger || 'demo_click',
        },
      }),
    });

    console.log('Retell outbound call created:', callResult.call_id);

    // Log the call in call_history
    await supabase.from('call_history').insert({
      retell_call_id: callResult.call_id,
      prospect_id: prospect.id,
      business_name: prospect.business_name,
      website_url: prospect.website_url,
      owner_name: prospect.owner_name,
      owner_email: prospect.owner_email,
      owner_phone: normalizedPhone,
      call_status: 'initiated',
      trigger_source: 'speed_to_lead',
      metadata: {
        trigger_event: trigger || 'demo_click',
        agent_id: targetAgentId,
      },
    });

    // Update prospect pipeline stage
    await supabase.from('prospects').update({
      pipeline_stage: 'contacted',
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', prospect_id);

    return json({
      success: true,
      action: 'call_initiated',
      call_id: callResult.call_id,
      phone: normalizedPhone,
      business: prospect.business_name,
    });

  } catch (error) {
    console.error('Speed-to-lead error:', error);
    return json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
