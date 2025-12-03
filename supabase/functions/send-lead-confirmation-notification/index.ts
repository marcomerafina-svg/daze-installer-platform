import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ConfirmationNotificationPayload {
  assignmentId: string;
  installerName: string;
  installerEmail: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  leadAddress?: string;
  confirmedAt: string;
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
    const payload: ConfirmationNotificationPayload = await req.json();

    console.log('Received confirmation notification request:', {
      assignmentId: payload.assignmentId,
      installerName: payload.installerName,
      leadName: payload.leadName,
      notificationLogId: payload.notificationLogId,
    });

    const confirmedDate = new Date(payload.confirmedAt);
    const formattedDate = confirmedDate.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
    .confirmation-box {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      margin: 25px 0;
      text-align: center;
    }
    .confirmation-box h2 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .confirmation-box p {
      margin: 5px 0;
      font-size: 16px;
      opacity: 0.95;
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
      width: 140px;
    }
    .value {
      color: #495057;
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
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
    }
    .timestamp {
      background: #fff3cd;
      color: #856404;
      padding: 12px;
      border-radius: 6px;
      margin-top: 15px;
      text-align: center;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">⚡ Daze</div>
    <p>Stazioni di ricarica per auto elettriche</p>
  </div>

  <div class="content">
    <div class="confirmation-box">
      <h2>✅ Lead Presa in Carico</h2>
      <p><strong>${payload.installerName}</strong> ha confermato di aver contattato la lead</p>
      <p><strong>${payload.leadName}</strong></p>
    </div>

    <p style="font-size: 16px; margin-bottom: 10px;">
      L'installatore <strong>${payload.installerName}</strong> ha confermato di aver preso in carico
      e contattato la lead <strong>${payload.leadName}</strong>.
    </p>

    <div class="timestamp">
      <strong>📅 Data e ora conferma:</strong> ${formattedDate}
    </div>

    <div class="lead-info">
      <h3 style="color: #262f89; margin-top: 0;">Dettagli Lead</h3>
      <div class="info-row">
        <span class="label">Cliente:</span>
        <span class="value">${payload.leadName}</span>
      </div>
      <div class="info-row">
        <span class="label">Telefono:</span>
        <span class="value">${payload.leadPhone}</span>
      </div>
      ${payload.leadEmail ? `
      <div class="info-row">
        <span class="label">Email:</span>
        <span class="value">${payload.leadEmail}</span>
      </div>
      ` : ''}
      ${payload.leadAddress ? `
      <div class="info-row">
        <span class="label">Indirizzo:</span>
        <span class="value">${payload.leadAddress}</span>
      </div>
      ` : ''}
    </div>

    <div class="lead-info" style="margin-top: 15px;">
      <h3 style="color: #262f89; margin-top: 0;">Installatore</h3>
      <div class="info-row">
        <span class="label">Nome:</span>
        <span class="value">${payload.installerName}</span>
      </div>
      <div class="info-row">
        <span class="label">Email:</span>
        <span class="value">${payload.installerEmail}</span>
      </div>
    </div>

    <p style="margin-top: 25px; font-size: 15px;">
      Lo stato della lead è stato automaticamente aggiornato a <strong>"In lavorazione"</strong>.
    </p>

    <center>
      <a href="https://installer.daze.eu/admin/leads" class="button">
        Vai alla Dashboard Admin
      </a>
    </center>
  </div>

  <div class="footer">
    <p><strong>© 2025 Daze</strong> - Tutti i diritti riservati</p>
    <p>Questa è una notifica automatica del sistema di gestione lead</p>
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

    console.log('Sending confirmation email to: marco.merafina@daze.eu');

    const emailSubject = `${payload.installerName} ha preso in carico ${payload.leadName}`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Daze Lead System <noreply@mails.daze.eu>',
        to: 'marco.merafina@daze.eu',
        subject: emailSubject,
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
    console.log('Confirmation email sent successfully:', resendResponse);

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
        message: 'Confirmation email notification sent successfully',
        messageId: resendResponse.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending confirmation notification:', error);

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
