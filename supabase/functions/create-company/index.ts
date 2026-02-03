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

async function sendCompanyWelcomeEmail(
  email: string,
  firstName: string,
  lastName: string,
  companyName: string,
  password: string
): Promise<void> {
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #223aa3 0%, #4a5fc1 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #223aa3; }
    .button { display: inline-block; background: linear-gradient(135deg, #223aa3 0%, #4a5fc1 100%); color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Benvenuto in Daze</h1>
    </div>
    <div class="content">
      <p>Ciao <strong>${firstName} ${lastName}</strong>,</p>
      <p>La tua azienda <strong>${companyName}</strong> è stata registrata con successo sulla piattaforma Daze!</p>
      <p>Ecco le tue credenziali di accesso come amministratore aziendale:</p>

      <div class="credentials">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
      </div>

      <p>Per accedere alla piattaforma, clicca sul pulsante qui sotto:</p>
      <a href="https://installer.daze.eu/login" class="button">Accedi alla Piattaforma</a>

      <p><strong>Come amministratore aziendale potrai:</strong></p>
      <ul>
        <li>Gestire il team di installatori</li>
        <li>Monitorare le installazioni</li>
        <li>Visualizzare i punti e i premi aziendali</li>
        <li>Gestire i lead assegnati</li>
      </ul>

      <p><strong>Importante:</strong> Ti consigliamo di cambiare la password al primo accesso per motivi di sicurezza.</p>

      <div class="footer">
        <p>Questa è un'email automatica, si prega di non rispondere.</p>
        <p>&copy; ${new Date().getFullYear()} Daze. Tutti i diritti riservati.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    console.warn('RESEND_API_KEY non configurata, skip invio email');
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'Daze <noreply@mails.daze.eu>',
      to: email,
      subject: `Benvenuto in Daze - ${companyName}`,
      html: emailHtml,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Errore invio email: ${error}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('=== CREATE COMPANY FUNCTION STARTED ===');
    console.log('SUPABASE_URL:', Deno.env.get('SUPABASE_URL'));
    console.log('SERVICE_ROLE_KEY exists:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    console.log('Auth header exists:', !!authHeader);
    
    if (!authHeader) {
      console.log('ERROR: No auth header');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token length:', token.length);
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    console.log('getUser result - user:', !!user, 'error:', userError?.message);

    if (userError || !user) {
      console.log('ERROR: Unauthorized -', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
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

    try {
      await sendCompanyWelcomeEmail(
        owner.email,
        owner.first_name,
        owner.last_name,
        company.company_name,
        owner.password
      );
    } catch (emailError) {
      console.error('Errore invio email:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        company: newCompany,
        owner: newInstaller,
        message: 'Azienda creata con successo. Email di benvenuto inviata.',
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