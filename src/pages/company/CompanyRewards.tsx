import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CompanyLayout from '../../components/company/CompanyLayout';
import TierCard from '../../components/shared/TierCard';
import { Award, Building2, User } from 'lucide-react';
import type { RewardsTier, CompanyRewards, InstallerRewards } from '../../types';

export default function CompanyRewards() {
  const { installer } = useAuth();
  const [view, setView] = useState<'company' | 'personal'>('company');
  const [tiers, setTiers] = useState<RewardsTier[]>([]);
  const [companyRewards, setCompanyRewards] = useState<CompanyRewards | null>(null);
  const [personalRewards, setPersonalRewards] = useState<InstallerRewards | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [installer?.id, installer?.company_id]);

  const loadData = async () => {
    try {
      const { data: tiersData } = await supabase
        .from('rewards_tiers')
        .select('*')
        .order('points_required', { ascending: true });

      setTiers(tiersData || []);

      if (installer?.company_id) {
        const { data: companyData } = await supabase
          .from('company_rewards')
          .select('*, tier:rewards_tiers(*)')
          .eq('company_id', installer.company_id)
          .maybeSingle();

        setCompanyRewards(companyData);
      }

      if (installer?.id) {
        const { data: personalData } = await supabase
          .from('installer_rewards')
          .select('*, tier:rewards_tiers(*)')
          .eq('installer_id', installer.id)
          .maybeSingle();

        setPersonalRewards(personalData);
      }
    } catch (error) {
      console.error('Error loading rewards data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <CompanyLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyLayout>
    );
  }

  const currentRewards = view === 'company' ? companyRewards : personalRewards;
  const currentPoints = currentRewards?.total_points || 0;
  const currentTier = currentRewards?.tier;

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Sistema Rewards</h1>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setView('company')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'company'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Building2 className="w-5 h-5" />
              Punti Azienda
            </button>
            <button
              onClick={() => setView('personal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'personal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <User className="w-5 h-5" />
              Punti Personali
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center">
              {view === 'company' ? (
                <Building2 className="w-8 h-8 text-blue-700" />
              ) : (
                <User className="w-8 h-8 text-blue-700" />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-blue-900">
                {currentPoints.toLocaleString()} Punti
              </h3>
              <p className="text-blue-700">
                {view === 'company' ? 'Totale Azienda' : 'Punti Personali'}
              </p>
            </div>
          </div>
          {currentTier && (
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-700" />
              <span className="text-blue-800 font-semibold">
                Tier Attuale: {currentTier.display_name}
              </span>
            </div>
          )}
        </div>

        {view === 'company' && installer?.company && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Informazioni Azienda
            </h3>
            <p className="text-gray-700 mb-2">
              <strong>{installer.company.company_name}</strong>
            </p>
            <p className="text-sm text-gray-600">
              I punti azienda vengono accumulati da tutte le installazioni dei membri del team.
              Il tier aziendale si basa sul totale punti accumulati dall'azienda.
            </p>
          </div>
        )}

        {view === 'personal' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Punti Personali
            </h3>
            <p className="text-sm text-gray-600">
              I tuoi punti personali vengono accumulati dalle tue installazioni individuali.
              Questi punti sono separati dai punti azienda e contribuiscono al tuo tier personale.
            </p>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tutti i Tier</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiers.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                currentPoints={currentPoints}
                isCurrentTier={currentTier?.id === tier.id}
              />
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Come Funziona
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>• <strong>Punti Azienda:</strong> Accumulati da tutte le installazioni approvate dei membri del team</p>
            <p>• <strong>Punti Personali:</strong> Accumulati dalle tue installazioni individuali</p>
            <p>• <strong>Tier:</strong> Il livello viene determinato in base ai punti totali</p>
            <p>• <strong>Prodotti:</strong> Ogni tipo di prodotto installato vale un numero diverso di punti</p>
            <p>• <strong>Approvazione:</strong> I punti vengono assegnati solo dopo l'approvazione dell'installazione da parte dell'admin</p>
          </div>
        </div>
      </div>
    </CompanyLayout>
  );
}
