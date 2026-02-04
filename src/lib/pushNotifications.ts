import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

if (!VAPID_PUBLIC_KEY) {
  console.error('VITE_VAPID_PUBLIC_KEY is not defined in environment variables');
  console.error('Available env vars:', import.meta.env);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isPushNotificationSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export async function getCurrentPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeToPushNotifications(
  installerId: string
): Promise<boolean> {
  try {
    if (!VAPID_PUBLIC_KEY) {
      throw new Error('VAPID public key is not configured. Please check your environment variables.');
    }

    const supported = await isPushNotificationSupported();
    if (!supported) {
      throw new Error('Push notifications are not supported');
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error('Service Worker registration failed');
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const subscriptionData = subscription.toJSON();

    const { error } = await supabase.from('push_subscriptions').insert({
      installer_id: installerId,
      endpoint: subscriptionData.endpoint!,
      p256dh_key: subscriptionData.keys!.p256dh,
      auth_key: subscriptionData.keys!.auth,
      user_agent: navigator.userAgent,
      is_active: true,
    });

    if (error) {
      console.error('Error saving push subscription:', error);
      throw error;
    }

    localStorage.setItem('push_notifications_enabled', 'true');

    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}

export async function unsubscribeFromPushNotifications(
  installerId: string
): Promise<boolean> {
  console.log('unsubscribeFromPushNotifications called with installerId:', installerId);
  
  try {
    // Prima cancella dal database (sempre)
    console.log('Attempting to delete from database...');
    const { data, error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('installer_id', installerId)
      .select();

    console.log('Delete result:', { data, deleteError });

    if (deleteError) {
      console.error('Error deleting subscription from database:', deleteError);
      throw deleteError;
    }

    // Poi prova a cancellare dal browser (se possibile)
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }
    } catch (browserError) {
      console.warn('Could not unsubscribe from browser:', browserError);
    }

    localStorage.setItem('push_notifications_enabled', 'false');

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
}

export async function getActiveSubscription(
  installerId: string
): Promise<boolean> {
  console.log('getActiveSubscription called with installerId:', installerId);
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('installer_id', installerId)
      .eq('is_active', true)
      .limit(1);

    console.log('getActiveSubscription result:', { data, error });

    if (error) {
      console.error('Error checking subscription:', error);
      return false;
    }

    const hasSubscription = data && data.length > 0;
    console.log('hasSubscription:', hasSubscription);
    return hasSubscription;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

export async function isPushNotificationDismissed(): Promise<boolean> {
  return localStorage.getItem('push_notification_banner_dismissed') === 'true';
}

export async function dismissPushNotificationBanner(): Promise<void> {
  localStorage.setItem('push_notification_banner_dismissed', 'true');
}
