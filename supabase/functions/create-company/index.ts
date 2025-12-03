import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateCompanyRequest {
  company: {
    company_name: string;
    vat_number?: string;
    business_name?: string;
    address?: string;
    city?: string;
    province?: string;
    zip_code?: string;
    phone?: string;
    email?: string;
  };
  owner: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    password: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userRole = user.app_metadata?.role || user.user_metadata?.role;
    if (userRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can create companies' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: CreateCompanyRequest = await req.json();
    const { company, owner } = requestData;

    if (!company.company_name || !owner.first_name || !owner.last_name || !owner.email || !owner.password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: newCompany, error: companyError } = await supabaseAdmin
      .from('installation_companies')
      .insert([company])
      .select()
      .single();

    if (companyError) {
      return new Response(
        JSON.stringify({ error: companyError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: owner.email,
      password: owner.password,
      email_confirm: true,
      app_metadata: { role: 'installer' },
    });

    if (authError || !authUser.user) {
      await supabaseAdmin.from('installation_companies').delete().eq('id', newCompany.id);
      return new Response(
        JSON.stringify({ error: authError?.message || 'Failed to create owner account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: newInstaller, error: installerError } = await supabaseAdmin
      .from('installers')
      .insert([{
        user_id: authUser.user.id,
        first_name: owner.first_name,
        last_name: owner.last_name,
        email: owner.email,
        phone: owner.phone || null,
        company_id: newCompany.id,
        role_in_company: 'owner',
        can_manage_company: true,
        is_active: true,
      }])
      .select()
      .single();

    if (installerError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from('installation_companies').delete().eq('id', newCompany.id);
      return new Response(
        JSON.stringify({ error: installerError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: rewardsError } = await supabaseAdmin
      .from('company_rewards')
      .insert([{
        company_id: newCompany.id,
        total_points: 0,
      }]);

    if (rewardsError) {
      console.error('Failed to create company_rewards:', rewardsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        company: newCompany,
        owner: newInstaller,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating company:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});