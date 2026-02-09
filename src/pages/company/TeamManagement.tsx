import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CompanyLayout from '../../components/company/CompanyLayout';
import AddTeamMemberModal from '../../components/company/AddTeamMemberModal';
import { Users, Mail, Phone, Award, ToggleLeft, ToggleRight, Plus, Shield } from 'lucide-react';
import type { Installer } from '../../types';
import Button from '../../components/shared/Button';

interface TeamMemberWithStats extends Installer {
  total_points: number;
  total_leads: number;
  won_leads: number;
  conversion_rate: number;
}

export default function TeamManagement() {
  const { installer, loading: authLoading } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (installer?.company_id) {
      loadTeamMembers();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [installer?.company_id, authLoading]);

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
      owner: 'bg-daze-blue-light text-daze-blue border-daze-blue/20',
      admin: 'bg-daze-blue-light/50 text-daze-blue border-daze-blue/20',
      member: 'bg-daze-gray text-daze-black border-daze-gray',
    };
    return badges[role as keyof typeof badges] || badges.member;
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

  return (
    <CompanyLayout>
      <div className="max-w-7xl mx-auto pt-2 lg:pt-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-roobert font-bold text-daze-black mb-2">Gestione Team</h1>
            <p className="text-daze-black/70 font-inter">
              {teamMembers.length} {teamMembers.length === 1 ? 'membro' : 'membri'} nel team
            </p>
          </div>
          {installer?.can_manage_company && (
            <Button
              variant="primaryBlack"
              size="sm"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => setShowAddModal(true)}
            >
              Aggiungi Membro
            </Button>
          )}
        </div>

        {/* Team members */}
        <div className="grid grid-cols-1 gap-4">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-squircle border border-daze-gray p-6 hover:border-daze-black/20 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-daze-blue-light rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-roobert font-bold text-daze-blue">
                      {member.first_name[0]}{member.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-roobert font-bold text-daze-black mb-1">
                      {member.first_name} {member.last_name}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2.5 py-1 text-xs font-roobert font-medium rounded-pill border ${getRoleBadge(member.role_in_company || 'member')}`}
                      >
                        {member.role_in_company?.toUpperCase() || 'MEMBER'}
                      </span>
                      {member.can_manage_company && (
                        <span className="px-2.5 py-1 text-xs font-roobert font-medium rounded-pill border bg-daze-honey/10 text-daze-honey-dark border-daze-honey/20 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          MANAGER
                        </span>
                      )}
                      {!member.is_active && (
                        <span className="px-2.5 py-1 text-xs font-roobert font-medium rounded-pill border bg-daze-salmon/10 text-daze-salmon-dark border-daze-salmon/20">
                          INATTIVO
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm font-inter text-daze-black/70">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-daze-black" />
                        <a href={`mailto:${member.email}`} className="hover:text-daze-blue">
                          {member.email}
                        </a>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-daze-black" />
                          <a href={`tel:${member.phone}`} className="hover:text-daze-blue">
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
                        className="p-2 hover:bg-daze-gray/20 rounded-xl transition-colors"
                        title={member.can_manage_company ? 'Rimuovi permessi gestione' : 'Assegna permessi gestione'}
                      >
                        {member.can_manage_company ? (
                          <Shield className="w-5 h-5 text-daze-honey-dark" />
                        ) : (
                          <Shield className="w-5 h-5 text-daze-black/30" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => toggleMemberStatus(member.id, member.is_active)}
                      className="p-2 hover:bg-daze-gray/20 rounded-xl transition-colors"
                    >
                      {member.is_active ? (
                        <ToggleRight className="w-6 h-6 text-daze-forest" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-daze-black/30" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Stat mini-cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-inter">
                <div className="bg-daze-forest/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-daze-forest" />
                    <span className="text-xs text-daze-black/70">Punti</span>
                  </div>
                  <p className="text-lg font-roobert font-bold text-daze-black">
                    {member.total_points.toLocaleString()}
                  </p>
                </div>

                <div className="bg-daze-blue-light rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-daze-blue" />
                    <span className="text-xs text-daze-black/70">Lead Totali</span>
                  </div>
                  <p className="text-lg font-roobert font-bold text-daze-black">
                    {member.total_leads}
                  </p>
                </div>

                <div className="bg-daze-blue-light/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-daze-blue" />
                    <span className="text-xs text-daze-black/70">Lead Vinte</span>
                  </div>
                  <p className="text-lg font-roobert font-bold text-daze-black">
                    {member.won_leads}
                  </p>
                </div>

                <div className="bg-daze-honey/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-daze-honey-dark" />
                    <span className="text-xs text-daze-black/70">Conversion</span>
                  </div>
                  <p className="text-lg font-roobert font-bold text-daze-black">
                    {member.conversion_rate}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {teamMembers.length === 0 && (
          <div className="bg-white rounded-squircle border border-daze-gray p-12 text-center">
            <Users className="w-16 h-16 text-daze-black/20 mx-auto mb-4" />
            <p className="text-daze-black/70 text-lg font-inter mb-2">Nessun membro nel team</p>
            {installer?.can_manage_company && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="mt-4"
              >
                Aggiungi il primo membro
              </Button>
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
