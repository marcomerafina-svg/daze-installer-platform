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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-daze-blue"></div>
        </div>
      </InstallerLayout>
    );
  }

  return (
    <InstallerLayout>
      <div className="max-w-7xl mx-auto pt-2 lg:pt-4">
        <div className="mb-8">
          <h1 className="text-3xl font-roobert font-bold text-daze-black mb-2">Impostazioni e Contatti</h1>
          <p className="text-daze-black/70 font-inter">Gestisci le tue preferenze e trova i tuoi contatti di riferimento</p>
        </div>

        {installer && (
          <div className="mb-8">
            <PushNotificationSettings installerId={installer.id} />
          </div>
        )}

        {!installer?.region ? (
          <div className="bg-daze-honey/10 border border-daze-honey/20 rounded-squircle p-6">
            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 text-daze-honey-dark mt-1" />
              <div>
                <h3 className="font-roobert font-bold text-daze-black mb-2">Regione non configurata</h3>
                <p className="text-daze-black/70 font-inter">
                  La tua regione di operatività non è ancora stata configurata.
                  Contatta l'amministratore per completare il tuo profilo e visualizzare il tuo area manager di riferimento.
                </p>
              </div>
            </div>
          </div>
        ) : !areaManager ? (
          <div className="bg-daze-blue-light border border-daze-blue/20 rounded-squircle p-6">
            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 text-daze-blue mt-1" />
              <div>
                <h3 className="font-roobert font-bold text-daze-black mb-2">Nessun area manager assegnato</h3>
                <p className="text-daze-black/70 font-inter mb-4">
                  Al momento non è presente un area manager per la tua regione ({installer.region}).
                </p>
                <p className="text-daze-black/70 font-inter">
                  Per assistenza immediata, contatta l'amministratore di sistema.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card Area Manager */}
            <div className="bg-white rounded-squircle border border-daze-gray p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-daze-blue p-3 rounded-xl">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-roobert font-bold text-daze-black mb-1">Il tuo Area Manager</h2>
                  <p className="text-daze-black/70 font-inter">Referente commerciale per la tua zona</p>
                </div>
              </div>

              <div className="space-y-4 font-inter">
                <div>
                  <p className="text-sm font-medium text-daze-black/70 mb-1">Nome</p>
                  <p className="text-lg font-roobert font-bold text-daze-black">{areaManager.name}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-daze-black/70 mb-2">Contatti</p>
                  <div className="space-y-3">
                    <a
                      href={`mailto:${areaManager.email}`}
                      className="flex items-center gap-3 p-3 bg-daze-gray/10 rounded-xl hover:bg-daze-gray/20 transition-colors group"
                    >
                      <Mail className="w-5 h-5 text-daze-black/40 group-hover:text-daze-blue" />
                      <span className="text-daze-black group-hover:text-daze-blue font-medium">
                        {areaManager.email}
                      </span>
                    </a>

                    <a
                      href={`tel:${areaManager.phone}`}
                      className="flex items-center gap-3 p-3 bg-daze-gray/10 rounded-xl hover:bg-daze-gray/20 transition-colors group"
                    >
                      <Phone className="w-5 h-5 text-daze-black/40 group-hover:text-daze-blue" />
                      <span className="text-daze-black group-hover:text-daze-blue font-medium">
                        {areaManager.phone}
                      </span>
                    </a>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-daze-black/70 mb-2">Regioni gestite</p>
                  <div className="flex flex-wrap gap-2">
                    {areaManager.regions.map((region) => (
                      <span
                        key={region}
                        className={`inline-flex items-center px-3 py-1 rounded-pill text-sm font-roobert font-medium ${
                          region === installer.region
                            ? 'bg-daze-blue text-white'
                            : 'bg-daze-blue-light text-daze-blue'
                        }`}
                      >
                        {region}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Regione */}
            <div className="bg-white rounded-squircle border border-daze-gray p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-daze-blue p-3 rounded-xl">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-roobert font-bold text-daze-black mb-1">La tua regione</h2>
                  <p className="text-daze-black/70 font-inter">Area di operatività</p>
                </div>
              </div>

              <div className="bg-daze-blue-light rounded-squircle p-6 text-center">
                <MapPin className="w-12 h-12 text-daze-blue mx-auto mb-3" />
                <p className="text-2xl font-roobert font-bold text-daze-black">{installer.region}</p>
              </div>

              <div className="mt-6 p-4 bg-daze-gray/10 rounded-xl">
                <h3 className="font-roobert font-bold text-daze-black mb-2">Come possiamo aiutarti?</h3>
                <ul className="space-y-2 text-sm font-inter text-daze-black/70">
                  <li className="flex items-start gap-2">
                    <span className="text-daze-blue mt-1">•</span>
                    <span>Domande tecniche sulle installazioni</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-daze-blue mt-1">•</span>
                    <span>Supporto per la gestione delle lead</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-daze-blue mt-1">•</span>
                    <span>Informazioni su prezzi e preventivi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-daze-blue mt-1">•</span>
                    <span>Assistenza generale e coordinamento</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* CTA Banner */}
        <div className="mt-8 bg-daze-blue rounded-squircle p-8 text-white">
          <h2 className="text-2xl font-roobert font-bold mb-4">Hai bisogno di aiuto immediato?</h2>
          <p className="text-white/80 font-inter mb-6">
            Il nostro team è qui per supportarti in ogni fase del processo. Non esitare a contattarci per qualsiasi domanda o necessità.
          </p>
          <div className="flex flex-wrap gap-4">
            {areaManager && (
              <>
                <a
                  href={`mailto:${areaManager.email}`}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-daze-blue rounded-pill font-roobert font-medium hover:opacity-90 transition-all"
                >
                  <Mail className="w-5 h-5" />
                  Invia Email
                </a>
                <a
                  href={`tel:${areaManager.phone}`}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white border border-white/20 rounded-pill font-roobert font-medium hover:bg-white/20 transition-all"
                >
                  <Phone className="w-5 h-5" />
                  Chiama ora
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </InstallerLayout>
  );
}
