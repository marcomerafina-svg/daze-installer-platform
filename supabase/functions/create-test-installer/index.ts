import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InstallerPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  region: string;
  companyId?: string;
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

async function sendWelcomeEmail(email: string, firstName: string, lastName: string, password: string): Promise<void> {
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
      <p>Il tuo account installatore è stato creato con successo! Ecco le tue credenziali di accesso:</p>

      <div class="credentials">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
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
      subject: 'Benvenuto in Daze - Credenziali di Accesso',
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
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: InstallerPayload = await req.json();
    const password = generateSecurePassword();

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.phone || !payload.region) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Campi obbligatori mancanti',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: password,
      email_confirm: true,
      user_metadata: { role: 'installer' },
      app_metadata: { role: 'installer' },
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: authError?.message || 'Errore nella creazione dell\'utente auth',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const installerData: any = {
      user_id: authData.user.id,
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      region: payload.region,
      is_active: true,
    };

    if (payload.companyId) {
      installerData.company_id = payload.companyId;
      installerData.role_in_company = 'installer';
    }

    const { data: installer, error: installerError } = await supabase
      .from('installers')
      .insert(installerData)
      .select()
      .single();

    if (installerError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({
          success: false,
          error: installerError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      await sendWelcomeEmail(payload.email, payload.firstName, payload.lastName, password);
    } catch (emailError) {
      console.error('Errore invio email:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Installatore creato con successo. Email inviata con le credenziali di accesso.',
        installer: installer,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating installer:', error);
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