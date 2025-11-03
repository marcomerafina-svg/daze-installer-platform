import { useState, useEffect } from 'react';
import {
  isPushNotificationSupported,
  getCurrentPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getActiveSubscription,
  registerServiceWorker,
} from '../lib/pushNotifications';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

export function usePushNotifications(
  installerId: string | null
): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializePushNotifications = async () => {
      const supported = await isPushNotificationSupported();
      setIsSupported(supported);

      if (supported) {
        const currentPermission = await getCurrentPermission();
        setPermission(currentPermission);

        await registerServiceWorker();

        if (installerId) {
          await checkSubscription();
        }
      }

      setIsLoading(false);
    };

    initializePushNotifications();
  }, [installerId]);

  const checkSubscription = async () => {
    if (!installerId) return;

    try {
      const hasSubscription = await getActiveSubscription(installerId);
      setIsSubscribed(hasSubscription);
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  const subscribe = async () => {
    if (!installerId) {
      setError('Installer ID not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await subscribeToPushNotifications(installerId);
      setIsSubscribed(true);
      const newPermission = await getCurrentPermission();
      setPermission(newPermission);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to subscribe to notifications';
      setError(errorMessage);
      console.error('Subscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!installerId) {
      setError('Installer ID not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await unsubscribeFromPushNotifications(installerId);
      setIsSubscribed(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to unsubscribe from notifications';
      setError(errorMessage);
      console.error('Unsubscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
