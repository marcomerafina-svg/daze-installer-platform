import { useState, useEffect } from 'react';
import { Bell, X, Zap, TrendingUp, Clock } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { isPushNotificationDismissed, dismissPushNotificationBanner } from '../../lib/pushNotifications';

interface PushNotificationBannerProps {
  installerId: string;
}

export default function PushNotificationBanner({ installerId }: PushNotificationBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { isSupported, permission, isSubscribed, subscribe, isLoading } = usePushNotifications(installerId);

  useEffect(() => {
    const checkVisibility = async () => {
      if (!isSupported || isSubscribed || permission === 'denied') {
        setIsVisible(false);
        return;
      }

      const isDismissed = await isPushNotificationDismissed();
      if (!isDismissed) {
        setIsVisible(true);
        setTimeout(() => setIsAnimating(true), 100);
      }
    };

    checkVisibility();
  }, [isSupported, isSubscribed, permission]);

  useEffect(() => {
    if (isSubscribed && isVisible) {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [isSubscribed, isVisible]);

  const handleDismiss = async () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      dismissPushNotificationBanner();
    }, 300);
  };

  const handleActivate = async () => {
    try {
      await subscribe();
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300);
    } catch (error) {
      console.error('Error activating push notifications:', error);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
        isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="relative p-6">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-all"
          aria-label="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
              <Bell className="w-7 h-7 text-white" />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Non perdere mai più una lead! 🎯
            </h3>
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
              Attiva le notifiche push per essere avvisato istantaneamente quando ricevi una nuova lead.
              Rispondi più velocemente e aumenta le tue conversioni.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur rounded-lg p-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Tempo reale</p>
                  <p className="text-xs text-gray-500">Avviso immediato</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/60 backdrop-blur rounded-lg p-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Più vendite</p>
                  <p className="text-xs text-gray-500">Risposta rapida</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/60 backdrop-blur rounded-lg p-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Sempre attivo</p>
                  <p className="text-xs text-gray-500">Anche offline</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleActivate}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-[#223aa3] to-[#4a5fc1] text-white px-6 py-3 rounded-lg font-semibold hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Attivazione...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Bell className="w-5 h-5" />
                    Attiva Notifiche Push
                  </span>
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium text-sm transition-all"
              >
                Ricordamelo dopo
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Puoi disattivare le notifiche in qualsiasi momento dalle impostazioni
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
