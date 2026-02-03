import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CompanyLayout from '../../components/company/CompanyLayout';
import AddTeamMemberModal from '../../components/company/AddTeamMemberModal';
import { Users, Mail, Phone, Award, ToggleLeft, ToggleRight, Plus, Shield } from 'lucide-react';
import type { Installer } from '../../types';

interface TeamMemberWithStats extends Installer {
  total_points: number;
  total_leads: number;
  won_leads: number;
  conversion_rate: number;
}

export default function TeamManagement() {
  const { installer } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (installer?.company_id) {
      loadTeamMembers();
    }
  }, [installer?.company_id]);

  const loadTeamMembers = async () => {
    if (!installer?.company_id) return;

    try {
      const { data: members, error } = await supabase
        .from('installers')
        .select('*')
        .eq('company_id', installer.company_id)
        .order('role_in_company', { ascending: true })
        .order('first_name', { ascending: true });

      if (error) throw error;

      const membersWithStats = await Promise.all(
        (members || []).map(async (member) => {
          const { data: rewardsData } = await supabase
            .from('installer_rewards')
            .select('total_points')
            .eq('installer_id', member.id)
            .maybeSingle();

          const { count: totalLeads } = await supabase
            .from('lead_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('installer_id', member.id);

          const { count: wonLeads } = await supabase
            .from('lead_assignments')
            .select('lead_id', { count: 'exact', head: true })
            .eq('installer_id', member.id)
            .in('lead_id',
              (await supabase
                .from('leads')
                .select('id')
                .eq('status', 'Chiusa Vinta')
              ).data?.map(l => l.id) || []
            );

          return {
            ...member,
            total_points: rewardsData?.total_points || 0,
            total_leads: totalLeads || 0,
            won_leads: wonLeads || 0,
            conversion_rate: totalLeads && totalLeads > 0
              ? Math.round((wonLeads! / totalLeads) * 100)
              : 0,
          };
        })
      );

      setTeamMembers(membersWithStats);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberStatus = async (memberId: string, currentStatus: boolean) => {
    if (!installer?.can_manage_company) {
      alert('Non hai i permessi per modificare i membri del team');
      return;
    }

    try {
      const { error } = await supabase
        .from('installers')
        .update({ is_active: !currentStatus })
        .eq('id', memberId);

      if (error) throw error;
      await loadTeamMembers();
    } catch (error) {
      console.error('Error toggling member status:', error);
    }
  };

  const toggleManagementPermission = async (memberId: string, currentPermission: boolean) => {
    if (!installer?.can_manage_company || installer.role_in_company !== 'owner') {
      alert('Solo il proprietario può modificare i permessi di gestione');
      return;
    }

    try {
      const { error } = await supabase
        .from('installers')
        .update({ can_manage_company: !currentPermission })
        .eq('id', memberId);

      if (error) throw error;
      await loadTeamMembers();
    } catch (error) {
      console.error('Error toggling management permission:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      owner: 'bg-purple-100 text-purple-800 border-purple-200',
      admin: 'bg-blue-100 text-blue-800 border-blue-200',
      member: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return badges[role as keyof typeof badges] || badges.member;
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Team</h1>
            <p className="text-gray-600">
              {teamMembers.length} {teamMembers.length === 1 ? 'membro' : 'membri'} nel team
            </p>
          </div>
          {installer?.can_manage_company && (
            <button
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-5 h-5" />
              Aggiungi Membro
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-blue-600">
                      {member.first_name[0]}{member.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {member.first_name} {member.last_name}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded border ${getRoleBadge(member.role_in_company || 'member')}`}
                      >
                        {member.role_in_company?.toUpperCase() || 'MEMBER'}
                      </span>
                      {member.can_manage_company && (
                        <span className="px-2 py-1 text-xs font-semibold rounded border bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          MANAGER
                        </span>
                      )}
                      {!member.is_active && (
                        <span className="px-2 py-1 text-xs font-semibold rounded border bg-red-100 text-red-800 border-red-200">
                          INATTIVO
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${member.email}`} className="hover:text-blue-600">
                          {member.email}
                        </a>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <a href={`tel:${member.phone}`} className="hover:text-blue-600">
                            {member.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {installer?.can_manage_company && member.id !== installer.id && (
                  <div className="flex gap-2">
                    {installer.role_in_company === 'owner' && member.role_in_company !== 'owner' && (
                      <button
                        onClick={() => toggleManagementPermission(member.id, member.can_manage_company)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title={member.can_manage_company ? 'Rimuovi permessi gestione' : 'Assegna permessi gestione'}
                      >
                        {member.can_manage_company ? (
                          <Shield className="w-5 h-5 text-orange-600" />
                        ) : (
                          <Shield className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => toggleMemberStatus(member.id, member.is_active)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {member.is_active ? (
                        <ToggleRight className="w-6 h-6 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-gray-600">Punti</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.total_points.toLocaleString()}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-gray-600">Lead Totali</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.total_leads}
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-gray-600">Lead Vinte</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.won_leads}
                  </p>
                </div>

                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-gray-600">Conversion</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.conversion_rate}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {teamMembers.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">Nessun membro nel team</p>
            {installer?.can_manage_company && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Aggiungi il primo membro
              </button>
            )}
          </div>
        )}
      </div>

      {showAddModal && installer?.company_id && (
        <AddTeamMemberModal
          companyId={installer.company_id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadTeamMembers();
          }}
        />
      )}
    </CompanyLayout>
  );
}
