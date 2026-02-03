import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ResetPasswordRequest {
  owner_email: string;
  company_name: string;
}

function generateSecurePassword(): string {
  const length = 16;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function sendPasswordResetEmail(
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
      <h1 style="margin: 0;">Password Resettata</h1>
    </div>
    <div class="content">
      <p>Ciao <strong>${firstName} ${lastName}</strong>,</p>
      <p>La tua password per l'account <strong>${companyName}</strong> è stata resettata.</p>
      <p>Ecco le tue nuove credenziali di accesso:</p>

      <div class="credentials">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Nuova Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
      </div>

      <p>Per accedere alla piattaforma, clicca sul pulsante qui sotto:</p>
      <a href="https://installer.daze.eu/login" class="button">Accedi alla Piattaforma</a>

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
      subject: `Password Resettata - ${companyName}`,
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
        JSON.stringify({ error: 'Only admins can reset passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: ResetPasswordRequest = await req.json();
    const { owner_email, company_name } = requestData;

    if (!owner_email || !company_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('installers')
      .select('user_id, first_name, last_name, email')
      .eq('email', owner_email)
      .eq('role_in_company', 'owner')
      .maybeSingle();

    if (ownerError || !owner) {
      return new Response(
        JSON.stringify({ error: 'Owner not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newPassword = generateSecurePassword();

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      owner.user_id,
      { password: newPassword }
    );

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      await sendPasswordResetEmail(
        owner.email,
        owner.first_name,
        owner.last_name,
        company_name,
        newPassword
      );
    } catch (emailError) {
      console.error('Errore invio email:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password resettata con successo. Email inviata.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error resetting password:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});