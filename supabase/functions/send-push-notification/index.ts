import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';

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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

webpush.setVapidDetails(
  'mailto:support@daze.eu',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

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

    console.log(`Processing push notification for installer ${installerId}, lead ${leadId}`);

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

    console.log(`Found ${subscriptions.length} active subscriptions`);

    const notificationPayload = JSON.stringify({
      title: 'Nuova Lead da Daze! 🎯',
      body: `${leadName}${leadPhone ? ' • ' + leadPhone : ''}`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        leadId: leadId,
        assignmentId: assignmentId,
        url: `/installer/leads/${leadId}`,
      },
    });

    let successCount = 0;
    let failureCount = 0;

    for (const subscription of subscriptions as PushSubscription[]) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        console.log(`Sending push to subscription ${subscription.id}`);
        await webpush.sendNotification(pushSubscription, notificationPayload);
        console.log(`Successfully sent to subscription ${subscription.id}`);

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

    console.log(`Push notification complete: ${successCount} sent, ${failureCount} failed`);

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