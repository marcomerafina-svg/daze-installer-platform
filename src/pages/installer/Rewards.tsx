import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import InstallerLayout from '../../components/installer/InstallerLayout';
import TierBadge from '../../components/shared/TierBadge';
import TierCard from '../../components/shared/TierCard';
import type { InstallerRewards, RewardsTier, PointsTransaction } from '../../types';
import { Trophy, TrendingUp, Award, Clock, ArrowRight } from 'lucide-react';

export default function Rewards() {
  const { installer } = useAuth();
  const [rewards, setRewards] = useState<InstallerRewards | null>(null);
  const [allTiers, setAllTiers] = useState<RewardsTier[]>([]);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [pendingPoints, setPendingPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (installer) {
      loadData();
    }
  }, [installer]);

  const loadData = async () => {
    if (!installer) return;

    try {
      const [rewardsRes, tiersRes, transactionsRes, pendingInstallationsRes] = await Promise.all([
        supabase
          .from('installer_rewards')
          .select('*, tier:rewards_tiers(*)')
          .eq('installer_id', installer.id)
          .single(),
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4a5fc1]"></div>
        </div>
      </InstallerLayout>
    );
  }

  return (
    <InstallerLayout>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Il Mio Sistema Rewards</h1>
        <p className="text-sm sm:text-base text-gray-600">Traccia i tuoi progressi e sblocca premi esclusivi</p>
      </div>

      {pendingPoints > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 rounded-xl">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">Punti in Attesa di Approvazione</h3>
              <p className="text-sm text-amber-800">
                Hai <span className="font-bold">{pendingPoints} punti</span> da installazioni autonome che verranno confermati dopo la verifica dell'admin
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Punti Confermati</h3>
          <p className="text-3xl font-bold text-gray-900">{rewards?.total_points.toLocaleString('it-IT') || 0}</p>
        </div>

        {pendingPoints > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">In Attesa</h3>
            <p className="text-3xl font-bold text-amber-600">{pendingPoints.toLocaleString('it-IT')}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-gradient-to-br from-[#223aa3] to-[#4a5fc1] p-3 rounded-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Tier Attuale</h3>
          <div className="mt-2">
            <TierBadge tier={rewards?.tier} size="lg" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Prossimo Traguardo</h3>
          <p className="text-3xl font-bold text-gray-900">
            {getNextTier() ? getPointsToNextTier().toLocaleString('it-IT') : '✓'}
          </p>
          <p className="text-xs text-gray-500 mt-1">{getNextTier() ? 'punti mancanti' : 'Massimo livello raggiunto!'}</p>
        </div>
      </div>

      {rewards && getNextTier() && (
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-8 mb-8 border-2 border-yellow-300 shadow-lg">
          <div className="flex items-start gap-6">
            <div className="bg-yellow-500 p-4 rounded-xl shadow-md">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-yellow-900 mb-3">Prossimo Obiettivo</h2>
              <p className="text-yellow-700 mb-6 text-lg">
                Ancora <span className="font-bold text-2xl">{getPointsToNextTier().toLocaleString('it-IT')}</span> punti per
                raggiungere il livello <span className="font-bold">{getNextTier()?.display_name}</span>!
              </p>
              <div className="w-full bg-yellow-200 rounded-full h-6 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                  style={{ width: `${getProgressToNextTier()}%` }}
                >
                  {getProgressToNextTier() > 10 && (
                    <span className="text-white text-xs font-bold">{Math.round(getProgressToNextTier())}%</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Tutti i Livelli</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {allTiers.map((tier) => {
            const isUnlocked = (rewards?.total_points || 0) >= tier.points_required;
            const isCurrent = rewards?.tier?.id === tier.id;
            return <TierCard key={tier.id} tier={tier} isUnlocked={isUnlocked} isCurrent={isCurrent} />;
          })}
        </div>
      </div>

      {transactions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-900">Storico Punti</h2>
            <p className="text-sm text-gray-600">Le tue ultime 10 transazioni</p>
          </div>
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        transaction.points_earned > 0 ? 'bg-green-100' : 'bg-orange-100'
                      }`}
                    >
                      {transaction.points_earned > 0 ? (
                        <Trophy className="w-5 h-5 text-green-600" />
                      ) : (
                        <ArrowRight className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500">
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
                    className={`text-xl font-bold ${
                      transaction.points_earned > 0 ? 'text-green-600' : 'text-orange-600'
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
    </InstallerLayout>
  );
}
