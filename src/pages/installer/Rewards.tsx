import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import InstallerLayout from '../../components/installer/InstallerLayout';
import TierBadge from '../../components/shared/TierBadge';
import TierCard from '../../components/shared/TierCard';
import type { InstallerRewards, RewardsTier, PointsTransaction } from '../../types';
import { Trophy, TrendingUp, Award, Clock, ArrowRight } from 'lucide-react';

export default function Rewards() {
  const { installer, loading: authLoading } = useAuth();
  const [rewards, setRewards] = useState<InstallerRewards | null>(null);
  const [allTiers, setAllTiers] = useState<RewardsTier[]>([]);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [pendingPoints, setPendingPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (installer) {
      loadData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [installer, authLoading]);

  const loadData = async () => {
    if (!installer) return;

    try {
      const [rewardsRes, tiersRes, transactionsRes, pendingInstallationsRes] = await Promise.all([
        supabase
          .from('installer_rewards')
          .select('*, tier:rewards_tiers(*)')
          .eq('installer_id', installer.id)
          .maybeSingle(),
        supabase.from('rewards_tiers').select('*').order('tier_level', { ascending: true }),
        supabase
          .from('points_transactions')
          .select('*')
          .eq('installer_id', installer.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('wallbox_serials')
          .select('id, serial_code, product_id, approval_status, created_at, product:products(id, name, points)')
          .eq('installer_id', installer.id)
          .eq('approval_status', 'pending'),
      ]);

      if (rewardsRes.data) {
        setRewards(rewardsRes.data);
      }

      if (tiersRes.data) {
        setAllTiers(tiersRes.data);
      }

      if (transactionsRes.data) {
        setTransactions(transactionsRes.data);
      }

      if (pendingInstallationsRes.data) {
        const pending = pendingInstallationsRes.data.reduce(
          (sum, serial) => sum + (serial.product?.points || 0),
          0
        );
        setPendingPoints(pending);
      }
    } catch (error) {
      console.error('Error loading rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextTier = () => {
    if (!rewards?.tier) return allTiers[0];
    const currentTierLevel = rewards.tier.tier_level;
    return allTiers.find((t) => t.tier_level === currentTierLevel + 1);
  };

  const getPointsToNextTier = () => {
    const nextTier = getNextTier();
    if (!nextTier) return 0;
    return nextTier.points_required - (rewards?.total_points || 0);
  };

  const getProgressToNextTier = () => {
    const nextTier = getNextTier();
    if (!nextTier) return 100;
    const currentPoints = rewards?.total_points || 0;
    const previousTier = allTiers.find((t) => t.tier_level === (rewards?.tier?.tier_level || 0));
    const previousPoints = previousTier?.points_required || 0;
    const progress = ((currentPoints - previousPoints) / (nextTier.points_required - previousPoints)) * 100;
    return Math.min(Math.max(progress, 0), 100);
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
        <h1 className="text-3xl font-roobert font-bold text-daze-black mb-2">Il Mio Sistema Rewards</h1>
        <p className="font-inter text-daze-black/70">Traccia i tuoi progressi e sblocca premi esclusivi</p>
      </div>

      {/* Banner punti pendenti */}
      {pendingPoints > 0 && (
        <div className="bg-daze-honey/10 border border-daze-honey/20 rounded-squircle p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-daze-honey rounded-xl">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-roobert font-bold text-daze-black mb-1">Punti in Attesa di Approvazione</h3>
              <p className="text-sm font-inter text-daze-black/70">
                Hai <span className="font-bold text-daze-black">{pendingPoints} punti</span> da installazioni autonome che verranno confermati dopo la verifica dell'admin
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-squircle border border-daze-gray p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-daze-forest p-3 rounded-xl">
              <Trophy className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-inter font-medium text-daze-black/80 mb-1">Punti Confermati</h3>
          <p className="text-3xl font-roobert font-bold text-daze-black">{rewards?.total_points.toLocaleString('it-IT') || 0}</p>
        </div>

        {pendingPoints > 0 && (
          <div className="bg-white rounded-squircle border border-daze-honey/30 p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-daze-honey p-3 rounded-xl">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-daze-black/80 text-sm font-inter font-medium mb-1">In Attesa</h3>
            <p className="text-3xl font-roobert font-bold text-daze-honey-dark">{pendingPoints.toLocaleString('it-IT')}</p>
          </div>
        )}

        <div className="bg-white rounded-squircle border border-daze-gray p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-daze-blue p-3 rounded-xl">
              <Award className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-daze-black/80 text-sm font-inter font-medium mb-1">Tier Attuale</h3>
          <div className="mt-2">
            <TierBadge tier={rewards?.tier} size="lg" />
          </div>
        </div>

        <div className="bg-white rounded-squircle border border-daze-gray p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-daze-forest p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-daze-black/80 text-sm font-inter font-medium mb-1">Prossimo Traguardo</h3>
          <p className="text-3xl font-roobert font-bold text-daze-black">
            {getNextTier() ? getPointsToNextTier().toLocaleString('it-IT') : '✓'}
          </p>
          <p className="text-xs font-inter text-daze-black/70 mt-1">{getNextTier() ? 'punti mancanti' : 'Massimo livello raggiunto!'}</p>
        </div>
      </div>

      {/* Prossimo Obiettivo */}
      {rewards && getNextTier() && (
        <div className="bg-daze-honey/10 border border-daze-honey/20 rounded-squircle p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="bg-daze-honey p-4 rounded-xl">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-roobert font-bold text-daze-black mb-3">Prossimo Obiettivo</h2>
              <p className="text-daze-black/70 font-inter mb-6 text-lg">
                Ancora <span className="font-bold text-2xl text-daze-black">{getPointsToNextTier().toLocaleString('it-IT')}</span> punti per
                raggiungere il livello <span className="font-bold text-daze-black">{getNextTier()?.display_name}</span>!
              </p>
              <div className="w-full bg-daze-honey/20 rounded-pill h-6 overflow-hidden">
                <div
                  className="bg-daze-honey h-full rounded-pill transition-all duration-500 flex items-center justify-end pr-3"
                  style={{ width: `${getProgressToNextTier()}%` }}
                >
                  {getProgressToNextTier() > 10 && (
                    <span className="text-white text-xs font-roobert font-bold">{Math.round(getProgressToNextTier())}%</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutti i Livelli */}
      <div className="mb-8">
        <h2 className="text-2xl font-roobert font-bold text-daze-black mb-6">Tutti i Livelli</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {allTiers.map((tier) => {
            const isUnlocked = (rewards?.total_points || 0) >= tier.points_required;
            const isCurrent = rewards?.tier?.id === tier.id;
            return <TierCard key={tier.id} tier={tier} isUnlocked={isUnlocked} isCurrent={isCurrent} />;
          })}
        </div>
      </div>

      {/* Storico Punti */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-squircle border border-daze-gray overflow-hidden">
          <div className="px-6 py-4 border-b border-daze-gray bg-daze-gray/10">
            <h2 className="text-xl font-roobert font-bold text-daze-black">Storico Punti</h2>
            <p className="text-sm font-inter text-daze-black/70">Le tue ultime 10 transazioni</p>
          </div>
          <div className="divide-y divide-daze-gray/50">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4 hover:bg-daze-gray/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-xl ${
                        transaction.points_earned > 0 ? 'bg-daze-forest/10' : 'bg-daze-honey/10'
                      }`}
                    >
                      {transaction.points_earned > 0 ? (
                        <Trophy className="w-5 h-5 text-daze-forest" />
                      ) : (
                        <ArrowRight className="w-5 h-5 text-daze-honey-dark" />
                      )}
                    </div>
                    <div>
                      <p className="font-inter font-medium text-daze-black">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-daze-black/40" />
                        <p className="text-xs font-inter text-daze-black/50">
                          {new Date(transaction.created_at).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-xl font-roobert font-bold ${
                      transaction.points_earned > 0 ? 'text-daze-forest' : 'text-daze-honey-dark'
                    }`}
                  >
                    {transaction.points_earned > 0 ? '+' : ''}
                    {transaction.points_earned.toLocaleString('it-IT')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </InstallerLayout>
  );
}
