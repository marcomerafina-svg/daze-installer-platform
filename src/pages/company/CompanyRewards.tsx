import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CompanyLayout from '../../components/company/CompanyLayout';
import TierCard from '../../components/shared/TierCard';
import { Award, Building2, User } from 'lucide-react';
import type { RewardsTier, CompanyRewards, InstallerRewards } from '../../types';

export default function CompanyRewardsPage() {
  const { installer, loading: authLoading } = useAuth();
  const [view, setView] = useState<'company' | 'personal'>('company');
  const [tiers, setTiers] = useState<RewardsTier[]>([]);
  const [companyRewards, setCompanyRewards] = useState<CompanyRewards | null>(null);
  const [personalRewards, setPersonalRewards] = useState<InstallerRewards | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (installer || !authLoading) {
      loadData();
    }
  }, [installer?.id, installer?.company_id, authLoading]);

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-daze-blue"></div>
        </div>
      </CompanyLayout>
    );
  }

  const currentRewards = view === 'company' ? companyRewards : personalRewards;
  const currentPoints = currentRewards?.total_points || 0;
  const currentTier = currentRewards?.tier;

  return (
    <CompanyLayout>
      <div className="max-w-7xl mx-auto pt-2 lg:pt-4 space-y-6">
        {/* Header + view toggle */}
        <div>
          <h1 className="text-3xl font-roobert font-bold text-daze-black mb-4">Sistema Rewards</h1>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setView('company')}
              className={`flex items-center gap-2 px-4 py-2 rounded-pill font-roobert font-medium text-sm transition-all ${
                view === 'company'
                  ? 'bg-daze-black text-white'
                  : 'bg-daze-gray text-daze-black hover:bg-daze-gray/80'
              }`}
            >
              <Building2 className="w-5 h-5" />
              Punti Azienda
            </button>
            <button
              onClick={() => setView('personal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-pill font-roobert font-medium text-sm transition-all ${
                view === 'personal'
                  ? 'bg-daze-black text-white'
                  : 'bg-daze-gray text-daze-black hover:bg-daze-gray/80'
              }`}
            >
              <User className="w-5 h-5" />
              Punti Personali
            </button>
          </div>
        </div>

        {/* Points hero */}
        <div className="bg-daze-blue-light border border-daze-blue/20 rounded-squircle p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-daze-blue/20 rounded-full flex items-center justify-center">
              {view === 'company' ? (
                <Building2 className="w-8 h-8 text-daze-blue" />
              ) : (
                <User className="w-8 h-8 text-daze-blue" />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-roobert font-bold text-daze-black">
                {currentPoints.toLocaleString()} Punti
              </h3>
              <p className="text-daze-black/70 font-inter">
                {view === 'company' ? 'Totale Azienda' : 'Punti Personali'}
              </p>
            </div>
          </div>
          {currentTier && (
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-daze-blue" />
              <span className="font-roobert font-bold text-daze-black">
                Tier Attuale: {currentTier.display_name}
              </span>
            </div>
          )}
        </div>

        {/* Info card */}
        {view === 'company' && installer?.company && (
          <div className="bg-white rounded-squircle border border-daze-gray p-6">
            <h3 className="text-lg font-roobert font-bold text-daze-black mb-3">
              Informazioni Azienda
            </h3>
            <p className="text-daze-black font-inter mb-2">
              <strong>{installer.company.company_name}</strong>
            </p>
            <p className="text-sm font-inter text-daze-black/70">
              I punti azienda vengono accumulati da tutte le installazioni dei membri del team.
              Il tier aziendale si basa sul totale punti accumulati dall'azienda.
            </p>
          </div>
        )}

        {view === 'personal' && (
          <div className="bg-white rounded-squircle border border-daze-gray p-6">
            <h3 className="text-lg font-roobert font-bold text-daze-black mb-3">
              Punti Personali
            </h3>
            <p className="text-sm font-inter text-daze-black/70">
              I tuoi punti personali vengono accumulati dalle tue installazioni individuali.
              Questi punti sono separati dai punti azienda e contribuiscono al tuo tier personale.
            </p>
          </div>
        )}

        {/* Tiers */}
        <div>
          <h2 className="text-2xl font-roobert font-bold text-daze-black mb-6">Tutti i Livelli</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {tiers.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                isUnlocked={currentPoints >= tier.points_required}
                isCurrent={currentTier?.id === tier.id}
              />
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-daze-gray/10 border border-daze-gray rounded-squircle p-6">
          <h3 className="text-lg font-roobert font-bold text-daze-black mb-3">
            Come Funziona
          </h3>
          <div className="space-y-2 text-sm font-inter text-daze-black/70">
            <p>• <strong className="text-daze-black">Punti Azienda:</strong> Accumulati da tutte le installazioni approvate dei membri del team</p>
            <p>• <strong className="text-daze-black">Punti Personali:</strong> Accumulati dalle tue installazioni individuali</p>
            <p>• <strong className="text-daze-black">Tier:</strong> Il livello viene determinato in base ai punti totali</p>
            <p>• <strong className="text-daze-black">Prodotti:</strong> Ogni tipo di prodotto installato vale un numero diverso di punti</p>
            <p>• <strong className="text-daze-black">Approvazione:</strong> I punti vengono assegnati solo dopo l'approvazione dell'installazione da parte dell'admin</p>
          </div>
        </div>
      </div>
    </CompanyLayout>
  );
}
