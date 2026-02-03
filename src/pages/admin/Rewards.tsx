import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import TierBadge from '../../components/shared/TierBadge';
import type { LeaderboardEntry, RewardsTier } from '../../types';
import { Trophy, TrendingUp, Award, ArrowUp, ArrowDown, Search } from 'lucide-react';

export default function Rewards() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tiers, setTiers] = useState<RewardsTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'points' | 'conversion' | 'wins'>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tiersRes, installersRes] = await Promise.all([
        supabase.from('rewards_tiers').select('*').order('tier_level', { ascending: true }),
        supabase.from('installers').select('*'),
      ]);

      if (tiersRes.error) throw tiersRes.error;
      if (installersRes.error) throw installersRes.error;

      setTiers(tiersRes.data || []);

      const leaderboardData = await Promise.all(
        (installersRes.data || []).map(async (installer) => {
          const [rewardsRes, assignmentsRes] = await Promise.all([
            supabase
              .from('installer_rewards')
              .select('*, tier:rewards_tiers(*)')
              .eq('installer_id', installer.id)
              .maybeSingle(),
            supabase.from('lead_assignments').select('lead_id').eq('installer_id', installer.id),
          ]);

          const rewards = rewardsRes.data;
          const assignments = assignmentsRes.data || [];
          const totalLeads = assignments.length;

          const wonLeadsRes = await supabase
            .from('leads')
            .select('id')
            .eq('status', 'Chiusa Vinta')
            .in(
              'id',
              assignments.map((a) => a.lead_id)
            );

          const wonLeads = wonLeadsRes.data?.length || 0;
          const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

          return {
            ...installer,
            total_points: rewards?.total_points || 0,
            current_tier: rewards?.tier || undefined,
            won_leads: wonLeads,
            total_leads: totalLeads,
            conversion_rate: conversionRate,
            rank: 0,
          };
        })
      );

      const sortedLeaderboard = leaderboardData
        .sort((a, b) => b.total_points - a.total_points)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setLeaderboard(sortedLeaderboard);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSortedLeaderboard = () => {
    let sorted = [...leaderboard];

    if (sortBy === 'points') {
      sorted.sort((a, b) => (sortOrder === 'desc' ? b.total_points - a.total_points : a.total_points - b.total_points));
    } else if (sortBy === 'conversion') {
      sorted.sort((a, b) => (sortOrder === 'desc' ? b.conversion_rate - a.conversion_rate : a.conversion_rate - b.conversion_rate));
    } else if (sortBy === 'wins') {
      sorted.sort((a, b) => (sortOrder === 'desc' ? b.won_leads - a.won_leads : a.won_leads - b.won_leads));
    }

    return sorted;
  };

  const filteredLeaderboard = getSortedLeaderboard().filter((entry) =>
    `${entry.first_name} ${entry.last_name} ${entry.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSort = (field: 'points' | 'conversion' | 'wins') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: 'points' | 'conversion' | 'wins' }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />;
  };

  const stats = {
    totalInstallers: leaderboard.length,
    activeInstallers: leaderboard.filter((e) => e.is_active).length,
    totalPoints: leaderboard.reduce((sum, e) => sum + e.total_points, 0),
    avgPoints: leaderboard.length > 0 ? Math.round(leaderboard.reduce((sum, e) => sum + e.total_points, 0) / leaderboard.length) : 0,
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4a5fc1]"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Rewards Leaderboard</h1>
        <p className="text-gray-600">Classifica installatori per punti e performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Installatori Totali</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalInstallers}</p>
          <p className="text-sm text-gray-500">{stats.activeInstallers} attivi</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-3 rounded-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Punti Totali</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalPoints.toLocaleString('it-IT')}</p>
          <p className="text-sm text-gray-500">Sistema rewards</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Media Punti</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.avgPoints.toLocaleString('it-IT')}</p>
          <p className="text-sm text-gray-500">Per installatore</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-gradient-to-br from-[#223aa3] to-[#4a5fc1] p-3 rounded-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Tier Attivi</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">{tiers.length}</p>
          <p className="text-sm text-gray-500">Livelli disponibili</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Tier System</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {tiers.map((tier) => {
            const installersInTier = leaderboard.filter((e) => e.current_tier?.id === tier.id).length;
            return (
              <div key={tier.id} className="text-center p-4 bg-gray-50 rounded-lg">
                <TierBadge tier={tier} size="lg" showLabel={false} className="mb-2" />
                <p className="font-bold text-gray-900 text-sm mb-1">{tier.display_name}</p>
                <p className="text-xs text-gray-600 mb-2">{tier.points_required.toLocaleString('it-IT')} pts</p>
                <p className="text-lg font-bold text-[#4a5fc1]">{installersInTier}</p>
                <p className="text-xs text-gray-500">installatori</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cerca installatore..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a5fc1] focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900 w-20">Rank</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Installatore</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">Tier</th>
                <th
                  className="text-center px-6 py-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('points')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Punti
                    <SortIcon field="points" />
                  </div>
                </th>
                <th
                  className="text-center px-6 py-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('wins')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Lead Vinte
                    <SortIcon field="wins" />
                  </div>
                </th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">Lead Totali</th>
                <th
                  className="text-center px-6 py-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('conversion')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Conversion Rate
                    <SortIcon field="conversion" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    Nessun installatore trovato
                  </td>
                </tr>
              ) : (
                filteredLeaderboard.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="text-center px-6 py-4">
                      <div
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                          index === 0
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
                            : index === 1
                            ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white'
                            : index === 2
                            ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {entry.first_name} {entry.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{entry.email}</p>
                      </div>
                    </td>
                    <td className="text-center px-6 py-4">
                      <div className="flex justify-center">
                        <TierBadge tier={entry.current_tier} size="md" />
                      </div>
                    </td>
                    <td className="text-center px-6 py-4">
                      <span className="inline-flex items-center justify-center px-4 py-2 bg-blue-100 rounded-lg font-bold text-blue-900">
                        {entry.total_points.toLocaleString('it-IT')}
                      </span>
                    </td>
                    <td className="text-center px-6 py-4">
                      <span className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full font-semibold text-green-900">
                        {entry.won_leads}
                      </span>
                    </td>
                    <td className="text-center px-6 py-4">
                      <span className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full font-semibold text-gray-900">
                        {entry.total_leads}
                      </span>
                    </td>
                    <td className="text-center px-6 py-4">
                      <span
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold ${
                          entry.conversion_rate >= 70
                            ? 'bg-green-100 text-green-800'
                            : entry.conversion_rate >= 40
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {entry.conversion_rate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
