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
        <div className="flex items-center gap-2 px-3 py-1.5 bg-daze-gray text-daze-black rounded-pill text-sm font-roobert font-medium">
          <XCircle className="w-4 h-4" />
          <span>Non supportato</span>
        </div>
      );
    }

    if (permission === 'denied') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-daze-salmon/10 text-daze-salmon-dark rounded-pill text-sm font-roobert font-medium">
          <XCircle className="w-4 h-4" />
          <span>Bloccate</span>
        </div>
      );
    }

    if (isSubscribed) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-daze-forest/10 text-daze-forest rounded-pill text-sm font-roobert font-medium">
          <CheckCircle className="w-4 h-4" />
          <span>Attive</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-daze-honey/10 text-daze-honey-dark rounded-pill text-sm font-roobert font-medium">
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
      <div className="bg-white rounded-squircle border border-daze-gray p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-daze-gray/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-daze-black/40" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-roobert font-bold text-daze-black mb-2">
              Notifiche Push non supportate
            </h3>
            <p className="text-sm font-inter text-daze-black/70">
              Il tuo browser o dispositivo non supporta le notifiche push.
              Prova ad utilizzare un browser moderno come Chrome, Firefox, o Edge su desktop.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-squircle border border-daze-gray p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-daze-blue rounded-xl flex items-center justify-center flex-shrink-0">
            {isSubscribed ? (
              <Bell className="w-6 h-6 text-white" />
            ) : (
              <BellOff className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-roobert font-bold text-daze-black mb-1">
              Notifiche Push del Browser
            </h3>
            <p className="text-sm font-inter text-daze-black/70">
              Ricevi notifiche istantanee quando arriva una nuova lead
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-daze-salmon/10 border border-daze-salmon/20 rounded-squircle">
          <p className="text-sm font-inter text-daze-salmon-dark">{error}</p>
        </div>
      )}

      {permission === 'denied' && (
        <div className="mb-4 p-4 bg-daze-honey/10 border border-daze-honey/20 rounded-squircle">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-daze-honey-dark flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-inter font-medium text-daze-black mb-2">
                Le notifiche sono bloccate dal browser
              </p>
              <p className="text-sm font-inter text-daze-black/70 mb-3">
                Per ricevere le notifiche push, devi prima sbloccarle nelle impostazioni del browser.
              </p>
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-sm font-roobert font-medium text-daze-blue hover:text-daze-black underline"
              >
                {showInstructions ? 'Nascondi istruzioni' : 'Mostra istruzioni'}
              </button>
            </div>
          </div>

          {showInstructions && (
            <div className="mt-4 pt-4 border-t border-daze-honey/20">
              <p className="text-sm font-inter font-medium text-daze-black mb-3">
                Come sbloccare le notifiche su {getBrowserInstructions().browser}:
              </p>
              <ol className="space-y-2">
                {getBrowserInstructions().steps.map((step, index) => (
                  <li key={index} className="text-sm font-inter text-daze-black/70 flex gap-2">
                    <span className="font-medium text-daze-black">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-daze-gray/10 rounded-xl">
          <div className="flex-1">
            <p className="text-sm font-inter font-medium text-daze-black">
              Stato notifiche
            </p>
            <p className="text-sm font-inter text-daze-black mt-1">
              {isSubscribed
                ? 'Riceverai notifiche push quando arriva una nuova lead'
                : 'Attiva le notifiche per non perdere mai una lead'}
            </p>
          </div>
          <button
            onClick={handleToggleNotifications}
            disabled={isLoading || permission === 'denied'}
            className={`px-6 py-2.5 rounded-pill font-roobert font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isSubscribed
                ? 'bg-daze-gray text-daze-black hover:bg-daze-gray/80'
                : 'bg-daze-black text-white hover:opacity-90'
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
          <div className="p-4 bg-daze-forest/10 border border-daze-forest/20 rounded-squircle">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-daze-forest flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-inter font-medium text-daze-black">
                  Notifiche push attive!
                </p>
                <p className="text-sm font-inter text-daze-black/70 mt-1">
                  Riceverai una notifica sul browser ogni volta che ti viene assegnata una nuova lead,
                  anche se la finestra del browser è chiusa.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-daze-gray">
          <h4 className="text-sm font-roobert font-bold text-daze-black mb-3">
            Perché attivare le notifiche push?
          </h4>
          <ul className="space-y-2 font-inter">
            <li className="flex items-start gap-2 text-sm text-daze-black/70">
              <span className="text-daze-forest font-bold">✓</span>
              <span>Rispondi più velocemente alle lead e aumenta le conversioni</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-daze-black/70">
              <span className="text-daze-forest font-bold">✓</span>
              <span>Ricevi notifiche anche quando il browser è chiuso</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-daze-black/70">
              <span className="text-daze-forest font-bold">✓</span>
              <span>Non perdere mai più un'opportunità di business</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
