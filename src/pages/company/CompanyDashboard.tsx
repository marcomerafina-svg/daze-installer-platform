import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CompanyLayout from '../../components/company/CompanyLayout';
import CompanyOnboardingModal from '../../components/company/CompanyOnboardingModal';
import OnboardingChecklist from '../../components/company/OnboardingChecklist';
import { Users, Award, TrendingUp, CheckCircle, Clock, Building2 } from 'lucide-react';
import type { CompanyRewards, RewardsTier } from '../../types';

interface CompanyStats {
  total_members: number;
  active_members: number;
  total_points: number;
  current_tier?: RewardsTier;
  total_leads: number;
  active_leads: number;
  won_leads: number;
  conversion_rate: number;
  total_installations: number;
  pending_installations: number;
}

export default function CompanyDashboard() {
  const { installer } = useAuth();
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  useEffect(() => {
    if (installer?.company_id) {
      loadCompanyStats();
      checkOnboardingStatus();
    }
  }, [installer?.company_id]);

  const checkOnboardingStatus = async () => {
    if (!installer?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('installation_companies')
        .select('onboarding_completed, onboarding_step')
        .eq('id', installer.company_id)
        .maybeSingle();

      if (error) throw error;

      if (data && !data.onboarding_completed) {
        setOnboardingStep(data.onboarding_step || 0);
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const loadCompanyStats = async () => {
    if (!installer?.company_id) return;

    try {
      const [
        membersResult,
        activeMembersResult,
        rewardsResult,
        leadsResult,
        activeLeadsResult,
        wonLeadsResult,
        installationsResult,
        pendingInstallationsResult,
      ] = await Promise.all([
        supabase
          .from('installers')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', installer.company_id),

        supabase
          .from('installers')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', installer.company_id)
          .eq('is_active', true),

        supabase
          .from('company_rewards')
          .select('total_points, tier:rewards_tiers(*)')
          .eq('company_id', installer.company_id)
          .maybeSingle(),

        supabase
          .from('lead_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to_company_id', installer.company_id),

        supabase
          .from('lead_assignments')
          .select('lead_id', { count: 'exact', head: true })
          .eq('assigned_to_company_id', installer.company_id)
          .in('lead_id',
            (await supabase
              .from('leads')
              .select('id')
              .not('status', 'in', '("Chiusa Vinta","Chiusa Persa")')
            ).data?.map(l => l.id) || []
          ),

        supabase
          .from('lead_assignments')
          .select('lead_id', { count: 'exact', head: true })
          .eq('assigned_to_company_id', installer.company_id)
          .in('lead_id',
            (await supabase
              .from('leads')
              .select('id')
              .eq('status', 'Chiusa Vinta')
            ).data?.map(l => l.id) || []
          ),

        supabase
          .from('wallbox_serials')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', installer.company_id),

        supabase
          .from('wallbox_serials')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', installer.company_id)
          .eq('approval_status', 'pending'),
      ]);

      const totalLeads = leadsResult.count || 0;
      const wonLeads = wonLeadsResult.count || 0;

      setStats({
        total_members: membersResult.count || 0,
        active_members: activeMembersResult.count || 0,
        total_points: rewardsResult.data?.total_points || 0,
        current_tier: rewardsResult.data?.tier,
        total_leads: totalLeads,
        active_leads: activeLeadsResult.count || 0,
        won_leads: wonLeads,
        conversion_rate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
        total_installations: installationsResult.count || 0,
        pending_installations: pendingInstallationsResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading company stats:', error);
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

  return (
    <CompanyLayout>
      {showOnboarding && installer?.company_id && installer?.company && (
        <CompanyOnboardingModal
          companyId={installer.company_id}
          companyName={installer.company.company_name}
          currentStep={onboardingStep}
          onComplete={() => {
            setShowOnboarding(false);
            loadCompanyStats();
          }}
          onSkip={() => {
            setShowOnboarding(false);
          }}
        />
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Azienda</h1>
          {installer?.company && (
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 className="w-5 h-5" />
              <span className="text-lg">{installer.company.company_name}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stats?.active_members}/{stats?.total_members}
            </p>
            <p className="text-sm text-gray-600">Membri Attivi</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stats?.total_points.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Punti Totali</p>
            {stats?.current_tier && (
              <div className="mt-2 inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                {stats.current_tier.display_name}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stats?.active_leads}
            </p>
            <p className="text-sm text-gray-600">Lead Attive</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.won_leads} vinte su {stats?.total_leads} totali
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stats?.conversion_rate}%
            </p>
            <p className="text-sm text-gray-600">Conversion Rate</p>
          </div>
        </div>

        <OnboardingChecklist
          totalMembers={stats?.total_members || 0}
          totalLeads={stats?.total_leads || 0}
          totalInstallations={stats?.total_installations || 0}
          hasCompanyInfo={!!(installer?.company?.vat_number && installer?.company?.address)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Installazioni
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">Totali</span>
                <span className="text-lg font-bold text-green-700">
                  {stats?.total_installations}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-gray-700">In Attesa Approvazione</span>
                </div>
                <span className="text-lg font-bold text-orange-700">
                  {stats?.pending_installations}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Performance Lead
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-700">Lead Totali</span>
                <span className="text-lg font-bold text-blue-700">
                  {stats?.total_leads}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm text-gray-700">Lead Attive</span>
                <span className="text-lg font-bold text-purple-700">
                  {stats?.active_leads}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">Lead Vinte</span>
                <span className="text-lg font-bold text-green-700">
                  {stats?.won_leads}
                </span>
              </div>
            </div>
          </div>
        </div>

        {stats?.current_tier && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center">
                <Award className="w-8 h-8 text-green-700" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-900">
                  {stats.current_tier.display_name}
                </h3>
                <p className="text-green-700">Tier Attuale</p>
              </div>
            </div>
            <p className="text-green-800 mb-2">
              <strong>{stats.total_points.toLocaleString()}</strong> punti totali
            </p>
            {stats.current_tier.description && (
              <p className="text-sm text-green-700">{stats.current_tier.description}</p>
            )}
          </div>
        )}
      </div>
    </CompanyLayout>
  );
}
