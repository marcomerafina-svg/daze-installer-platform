import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import InstallerLayout from '../../components/installer/InstallerLayout';
import PushNotificationSettings from '../../components/installer/PushNotificationSettings';
import { MapPin, Mail, Phone, User } from 'lucide-react';
import type { AreaManager, Installer } from '../../types';

export default function Contact() {
  const [installer, setInstaller] = useState<Installer | null>(null);
  const [areaManager, setAreaManager] = useState<AreaManager | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: installerData, error: installerError } = await supabase
        .from('installers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (installerError) throw installerError;
      setInstaller(installerData);

      if (installerData?.region) {
        const { data: areaManagerData, error: areaManagerError } = await supabase
          .from('area_managers')
          .select('*')
          .contains('regions', [installerData.region])
          .maybeSingle();

        if (areaManagerError) throw areaManagerError;
        setAreaManager(areaManagerData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <InstallerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4a5fc1]"></div>
        </div>
      </InstallerLayout>
    );
  }

  return (
    <InstallerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Impostazioni e Contatti</h1>
        <p className="text-gray-600">Gestisci le tue preferenze e trova i tuoi contatti di riferimento</p>
      </div>

      {installer && (
        <div className="mb-8">
          <PushNotificationSettings installerId={installer.id} />
        </div>
      )}

      {!installer?.region ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <MapPin className="w-6 h-6 text-yellow-600 mt-1" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">Regione non configurata</h3>
              <p className="text-yellow-800">
                La tua regione di operatività non è ancora stata configurata.
                Contatta l'amministratore per completare il tuo profilo e visualizzare il tuo area manager di riferimento.
              </p>
            </div>
          </div>
        </div>
      ) : !areaManager ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <MapPin className="w-6 h-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Nessun area manager assegnato</h3>
              <p className="text-blue-800 mb-4">
                Al momento non è presente un area manager per la tua regione ({installer.region}).
              </p>
              <p className="text-blue-800">
                Per assistenza immediata, contatta l'amministratore di sistema.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-gradient-to-br from-[#223aa3] to-[#4a5fc1] p-3 rounded-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Il tuo Area Manager</h2>
                <p className="text-gray-600">Referente commerciale per la tua zona</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Nome</p>
                <p className="text-lg font-semibold text-gray-900">{areaManager.name}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Contatti</p>
                <div className="space-y-3">
                  <a
                    href={`mailto:${areaManager.email}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <Mail className="w-5 h-5 text-gray-400 group-hover:text-[#4a5fc1]" />
                    <span className="text-gray-900 group-hover:text-[#4a5fc1] font-medium">
                      {areaManager.email}
                    </span>
                  </a>

                  <a
                    href={`tel:${areaManager.phone}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <Phone className="w-5 h-5 text-gray-400 group-hover:text-[#4a5fc1]" />
                    <span className="text-gray-900 group-hover:text-[#4a5fc1] font-medium">
                      {areaManager.phone}
                    </span>
                  </a>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Regioni gestite</p>
                <div className="flex flex-wrap gap-2">
                  {areaManager.regions.map((region) => (
                    <span
                      key={region}
                      className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                        region === installer.region
                          ? 'bg-[#4a5fc1] text-white'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {region}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">La tua regione</h2>
                <p className="text-gray-600">Area di operatività</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-center">
              <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <p className="text-2xl font-bold text-blue-900">{installer.region}</p>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Come possiamo aiutarti?</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#4a5fc1] mt-1">•</span>
                  <span>Domande tecniche sulle installazioni</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4a5fc1] mt-1">•</span>
                  <span>Supporto per la gestione delle lead</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4a5fc1] mt-1">•</span>
                  <span>Informazioni su prezzi e preventivi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4a5fc1] mt-1">•</span>
                  <span>Assistenza generale e coordinamento</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 bg-gradient-to-r from-[#223aa3] to-[#4a5fc1] rounded-xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-4">Hai bisogno di aiuto immediato?</h2>
        <p className="text-white/90 mb-6">
          Il nostro team è qui per supportarti in ogni fase del processo. Non esitare a contattarci per qualsiasi domanda o necessità.
        </p>
        <div className="flex flex-wrap gap-4">
          {areaManager && (
            <>
              <a
                href={`mailto:${areaManager.email}`}
                className="flex items-center gap-2 px-6 py-3 bg-white text-[#4a5fc1] rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                <Mail className="w-5 h-5" />
                Invia Email
              </a>
              <a
                href={`tel:${areaManager.phone}`}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white border border-white/20 rounded-lg font-medium hover:bg-white/20 transition-colors"
              >
                <Phone className="w-5 h-5" />
                Chiama ora
              </a>
            </>
          )}
        </div>
      </div>
    </InstallerLayout>
  );
}
