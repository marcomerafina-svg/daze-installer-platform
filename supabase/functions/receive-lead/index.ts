import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface LeadPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  description?: string;
  installerEmail: string;
  zohoLeadId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: LeadPayload = await req.json();

    if (!payload.firstName || !payload.lastName || !payload.phone || !payload.installerEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Campi obbligatori mancanti: firstName, lastName, phone, installerEmail',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: installer, error: installerError } = await supabase
      .from('installers')
      .select('*')
      .eq('email', payload.installerEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (installerError || !installer) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Installatore non trovato o non attivo',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        first_name: payload.firstName,
        last_name: payload.lastName,
        email: payload.email || null,
        phone: payload.phone,
        address: payload.address || null,
        description: payload.description || null,
        status: 'Nuova',
        zoho_lead_id: payload.zohoLeadId || null,
      })
      .select()
      .single();

    if (leadError || !lead) {
      throw new Error('Errore durante la creazione della lead');
    }

    const { error: assignmentError } = await supabase
      .from('lead_assignments')
      .insert({
        lead_id: lead.id,
        installer_id: installer.id,
        is_viewed: false,
      });

    if (assignmentError) {
      throw new Error('Errore durante l\'assegnazione della lead');
    }

    await supabase.from('lead_status_history').insert({
      lead_id: lead.id,
      installer_id: installer.id,
      old_status: null,
      new_status: 'Nuova',
      notes: 'Lead creata da Zoho CRM',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lead creata e assegnata con successo',
        leadId: lead.id,
        installerId: installer.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing lead:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Errore interno del server',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});