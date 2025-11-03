import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

interface PushSubscription {
  id: string;
  installer_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  is_active: boolean;
  error_count: number;
}

interface RequestPayload {
  installerId: string;
  leadId: string;
  leadName: string;
  leadPhone?: string;
  assignmentId: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload: RequestPayload = await req.json();
    const { installerId, leadId, leadName, leadPhone, assignmentId } = payload;

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('installer_id', installerId)
      .eq('is_active', true);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscriptions found for installer:', installerId);
      return new Response(
        JSON.stringify({ message: 'No active subscriptions', sent: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const notificationPayload = {
      title: 'Nuova Lead Ricevuta! 🎯',
      body: `${leadName}${leadPhone ? ' • ' + leadPhone : ''} - Clicca per visualizzare`,
      leadId: leadId,
      url: `/installer/leads/${leadId}`,
    };

    let successCount = 0;
    let failureCount = 0;

    for (const subscription of subscriptions as PushSubscription[]) {
      try {
        const webPushPayload = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        const response = await fetch('https://web-push-codelab.glitch.me/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: webPushPayload,
            payload: JSON.stringify(notificationPayload),
            vapidPublicKey: VAPID_PUBLIC_KEY,
            vapidPrivateKey: VAPID_PRIVATE_KEY,
          }),
        });

        if (!response.ok) {
          throw new Error(`Push service returned ${response.status}`);
        }

        await supabase
          .from('push_subscriptions')
          .update({
            last_used_at: new Date().toISOString(),
            error_count: 0,
          })
          .eq('id', subscription.id);

        successCount++;
      } catch (error) {
        console.error(`Error sending to subscription ${subscription.id}:`, error);
        failureCount++;

        const newErrorCount = subscription.error_count + 1;

        if (newErrorCount >= 5) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false, error_count: newErrorCount })
            .eq('id', subscription.id);

          console.log(`Deactivated subscription ${subscription.id} after ${newErrorCount} errors`);
        } else {
          await supabase
            .from('push_subscriptions')
            .update({ error_count: newErrorCount })
            .eq('id', subscription.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Push notifications processed',
        sent: successCount,
        failed: failureCount,
        total: subscriptions.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
