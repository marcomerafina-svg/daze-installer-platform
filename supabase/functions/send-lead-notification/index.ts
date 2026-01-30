import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NotificationPayload {
  assignmentId?: string;
  installerEmail: string;
  installerName: string;
  leadName: string;
  leadPhone: string;
  leadDescription?: string;
  notificationLogId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: NotificationPayload = await req.json();

    console.log('Received notification request:', {
      assignmentId: payload.assignmentId,
      installerEmail: payload.installerEmail,
      notificationLogId: payload.notificationLogId
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #161950 0%, #262f89 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .content {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .lead-info {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
      border-left: 4px solid #262f89;
    }
    .info-row {
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #161950;
      display: inline-block;
      width: 120px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #161950 0%, #262f89 100%);
      color: white !important;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      color: #6c757d;
      font-size: 14px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">⚡ Daze</div>
    <p>Stazioni di ricarica per auto elettriche</p>
  </div>

  <div class="content">
    <h2 style="color: #161950; margin-top: 0;">Ciao ${payload.installerName}! 👋</h2>
    <p>Hai ricevuto una <strong>nuova lead</strong> da gestire.</p>

    <div class="lead-info">
      <h3 style="color: #262f89; margin-top: 0;">Dettagli Lead</h3>
      <div class="info-row">
        <span class="label">Cliente:</span>
        <span>${payload.leadName}</span>
      </div>
      <div class="info-row">
        <span class="label">Telefono:</span>
        <span>${payload.leadPhone}</span>
      </div>
      ${payload.leadDescription ? `
      <div class="info-row">
        <span class="label">Descrizione:</span>
        <span>${payload.leadDescription}</span>
      </div>
      ` : ''}
    </div>

    <p style="margin-top: 20px;">
      Accedi alla piattaforma per visualizzare tutti i dettagli e prendere in carico la lead.
    </p>

    <center>
      <a href="https://installer.daze.eu/pipeline" class="button">
        Vai alla Piattaforma
      </a>
    </center>
  </div>

  <div class="footer">
    <p>© 2025 Daze - Tutti i diritti riservati</p>
    <p>Hai ricevuto questa email perché sei un installatore partner Daze</p>
  </div>
</body>
</html>
    `;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');

      if (payload.notificationLogId) {
        await updateNotificationLog(
          payload.notificationLogId,
          'failed',
          'RESEND_API_KEY not configured'
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'RESEND_API_KEY not configured',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Sending email to:', payload.installerEmail);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Daze <noreply@mails.daze.eu>',
        to: payload.installerEmail,
        subject: 'Nuova Lead Ricevuta - Daze',
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', errorText);

      if (payload.notificationLogId) {
        await updateNotificationLog(
          payload.notificationLogId,
          'failed',
          `Resend API error: ${errorText}`
        );
      }

      throw new Error(`Failed to send email: ${errorText}`);
    }

    const resendResponse = await response.json();
    console.log('Email sent successfully:', resendResponse);

    if (payload.notificationLogId) {
      await updateNotificationLog(
        payload.notificationLogId,
        'sent',
        null,
        resendResponse.id
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification sent successfully',
        messageId: resendResponse.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending notification:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function updateNotificationLog(
  logId: string,
  status: 'sent' | 'failed',
  errorMessage: string | null = null,
  resendMessageId: string | null = null
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Cannot update notification log: Supabase credentials not available');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const updateData: any = {
      status,
      sent_at: new Date().toISOString(),
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (resendMessageId) {
      updateData.resend_message_id = resendMessageId;
    }

    const { error } = await supabase
      .from('notification_logs')
      .update(updateData)
      .eq('id', logId);

    if (error) {
      console.error('Error updating notification log:', error);
    } else {
      console.log('Notification log updated successfully:', logId);
    }
  } catch (error) {
    console.error('Failed to update notification log:', error);
  }
}