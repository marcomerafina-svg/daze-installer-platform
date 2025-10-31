import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ClosureNotificationPayload {
  leadId: string;
  installerName: string;
  installerEmail: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  leadAddress?: string;
  closureStatus: 'Chiusa Vinta' | 'Chiusa Persa';
  wallboxSerial?: string;
  closedAt: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: ClosureNotificationPayload = await req.json();

    console.log('Received closure notification request:', {
      leadId: payload.leadId,
      installerName: payload.installerName,
      leadName: payload.leadName,
      closureStatus: payload.closureStatus,
    });

    const closedDate = new Date(payload.closedAt);
    const formattedDate = closedDate.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isWon = payload.closureStatus === 'Chiusa Vinta';
    const statusColor = isWon ? '#10b981' : '#ef4444';
    const statusIcon = isWon ? '🎉' : '❌';
    const statusText = isWon ? 'Chiusa Vinta' : 'Chiusa Persa';

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
    .status-box {
      background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      margin: 25px 0;
      text-align: center;
    }
    .status-box h2 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .status-box p {
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
    .serial-box {
      background: #d1fae5;
      border: 2px solid #10b981;
      color: #065f46;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
      text-align: center;
      font-weight: 600;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">⚡ Daze</div>
    <p>Stazioni di ricarica per auto elettriche</p>
  </div>

  <div class="content">
    <div class="status-box">
      <h2>${statusIcon} Lead ${statusText}</h2>
      <p><strong>${payload.installerName}</strong> ha chiuso la lead</p>
      <p><strong>${payload.leadName}</strong></p>
    </div>

    <p style="font-size: 16px; margin-bottom: 10px;">
      L'installatore <strong>${payload.installerName}</strong> ha marcato la lead
      <strong>${payload.leadName}</strong> come <strong>${statusText}</strong>.
    </p>

    <div class="timestamp">
      <strong>📅 Data e ora chiusura:</strong> ${formattedDate}
    </div>

    ${isWon && payload.wallboxSerial ? `
    <div class="serial-box">
      📦 Numero di serie Wallbox: <strong>${payload.wallboxSerial}</strong>
    </div>
    ` : ''}

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
      <div class="info-row">
        <span class="label">Stato Finale:</span>
        <span class="value" style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
      </div>
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

    console.log('Sending closure email to: marco.merafina@daze.eu');

    const emailSubject = `${statusIcon} ${payload.installerName} ha chiuso la lead ${payload.leadName} - ${statusText}`;

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
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const resendResponse = await response.json();
    console.log('Closure email sent successfully:', resendResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Closure email notification sent successfully',
        messageId: resendResponse.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending closure notification:', error);

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