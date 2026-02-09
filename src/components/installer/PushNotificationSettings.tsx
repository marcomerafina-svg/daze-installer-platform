import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle, Smartphone } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

interface PushNotificationSettingsProps {
  installerId: string;
}

export default function PushNotificationSettings({ installerId }: PushNotificationSettingsProps) {
  const { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe, checkSubscription } = usePushNotifications(installerId);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const getStatusBadge = () => {
    if (!isSupported) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm">
          <XCircle className="w-4 h-4" />
          <span>Non supportato</span>
        </div>
      );
    }

    if (permission === 'denied') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm">
          <XCircle className="w-4 h-4" />
          <span>Bloccate</span>
        </div>
      );
    }

    if (isSubscribed) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>Attive</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>Non attive</span>
      </div>
    );
  };

  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome')) {
      return {
        browser: 'Chrome',
        steps: [
          'Clicca sull\'icona del lucchetto o delle informazioni nella barra degli indirizzi',
          'Trova la sezione "Notifiche"',
          'Cambia l\'impostazione da "Blocca" a "Consenti"',
          'Ricarica la pagina e attiva le notifiche',
        ],
      };
    } else if (userAgent.includes('firefox')) {
      return {
        browser: 'Firefox',
        steps: [
          'Clicca sull\'icona del lucchetto nella barra degli indirizzi',
          'Clicca sulla freccia accanto a "Autorizzazioni"',
          'Trova "Mostrare notifiche" e cambia l\'impostazione',
          'Ricarica la pagina e attiva le notifiche',
        ],
      };
    } else if (userAgent.includes('safari')) {
      return {
        browser: 'Safari',
        steps: [
          'Vai su Safari > Preferenze > Siti web',
          'Seleziona "Notifiche" dalla barra laterale',
          'Trova questo sito e cambia l\'impostazione su "Consenti"',
          'Ricarica la pagina e attiva le notifiche',
        ],
      };
    } else {
      return {
        browser: 'il tuo browser',
        steps: [
          'Accedi alle impostazioni del browser',
          'Trova la sezione delle notifiche per questo sito',
          'Cambia l\'impostazione per consentire le notifiche',
          'Ricarica la pagina e attiva le notifiche',
        ],
      };
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Notifiche Push non supportate
            </h3>
            <p className="text-sm text-gray-600">
              Il tuo browser o dispositivo non supporta le notifiche push.
              Prova ad utilizzare un browser moderno come Chrome, Firefox, o Edge su desktop.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            {isSubscribed ? (
              <Bell className="w-6 h-6 text-white" />
            ) : (
              <BellOff className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Notifiche Push del Browser
            </h3>
            <p className="text-sm font-inter text-gray-600">
              Ricevi notifiche istantanee quando arriva una nuova lead
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {permission === 'denied' && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                Le notifiche sono bloccate dal browser
              </p>
              <p className="text-sm text-yellow-700 mb-3">
                Per ricevere le notifiche push, devi prima sbloccarle nelle impostazioni del browser.
              </p>
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-sm text-yellow-800 font-medium hover:text-yellow-900 underline"
              >
                {showInstructions ? 'Nascondi istruzioni' : 'Mostra istruzioni'}
              </button>
            </div>
          </div>

          {showInstructions && (
            <div className="mt-4 pt-4 border-t border-yellow-200">
              <p className="text-sm font-medium text-yellow-900 mb-3">
                Come sbloccare le notifiche su {getBrowserInstructions().browser}:
              </p>
              <ol className="space-y-2">
                {getBrowserInstructions().steps.map((step, index) => (
                  <li key={index} className="text-sm text-yellow-800 flex gap-2">
                    <span className="font-medium">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              Stato notifiche
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {isSubscribed
                ? 'Riceverai notifiche push quando arriva una nuova lead'
                : 'Attiva le notifiche per non perdere mai una lead'}
            </p>
          </div>
          <button
            onClick={handleToggleNotifications}
            disabled={isLoading || permission === 'denied'}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isSubscribed
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-gradient-to-r from-[#223aa3] to-[#4a5fc1] text-white hover:shadow-lg'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Caricamento...
              </span>
            ) : isSubscribed ? (
              'Disattiva'
            ) : (
              'Attiva'
            )}
          </button>
        </div>

        {isSubscribed && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-800 font-medium">
                  Notifiche push attive!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Riceverai una notifica sul browser ogni volta che ti viene assegnata una nuova lead,
                  anche se la finestra del browser è chiusa.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Perché attivare le notifiche push?
          </h4>
          <ul className="space-y-2 font-inter">
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-green-600 font-bold">✓</span>
              <span>Rispondi più velocemente alle lead e aumenta le conversioni</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-green-600 font-bold">✓</span>
              <span>Ricevi notifiche anche quando il browser è chiuso</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-green-600 font-bold">✓</span>
              <span>Non perdere mai più un'opportunità di business</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
