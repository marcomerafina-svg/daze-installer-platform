import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import CreateCompanyModal from '../../components/admin/CreateCompanyModal';
import type { CompanyWithStats, InstallationCompany } from '../../types';
import { Plus, Search, Building2, Users, Award, TrendingUp, Mail, Phone, MapPin, KeyRound } from 'lucide-react';
import Button from '../../components/shared/Button';
import Toggle from '../../components/shared/Toggle';

export default function Companies() {
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data: companiesData, error } = await supabase
        .from('installation_companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const companiesWithStats = await Promise.all(
        (companiesData || []).map(async (company) => {
          const { count: totalInstallers } = await supabase
            .from('installers')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

          const { count: activeInstallers } = await supabase
            .from('installers')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('is_active', true);

          const { data: rewardsData } = await supabase
            .from('company_rewards')
            .select('total_points, tier:rewards_tiers(*)')
            .eq('company_id', company.id)
            .maybeSingle();

          const { count: totalLeads } = await supabase
            .from('lead_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to_company_id', company.id);

          const { data: ownerData } = await supabase
            .from('installers')
            .select('*')
            .eq('company_id', company.id)
            .eq('role_in_company', 'owner')
            .maybeSingle();

          return {
            ...company,
            stats: {
              total_installers: totalInstallers || 0,
              active_installers: activeInstallers || 0,
              total_points: rewardsData?.total_points || 0,
              total_leads: totalLeads || 0,
              total_installations: 0,
              conversion_rate: 0,
              current_tier: rewardsData?.tier || undefined,
            },
            owner: ownerData,
          };
        })
      );

      setCompanies(companiesWithStats);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanyStatus = async (companyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('installation_companies')
        .update({ is_active: !currentStatus })
        .eq('id', companyId);

      if (error) throw error;
      await loadCompanies();
    } catch (error) {
      console.error('Error toggling company status:', error);
    }
  };

  const resetOwnerPassword = async (company: CompanyWithStats) => {
    if (!company.owner) {
      alert('Nessun owner trovato per questa azienda');
      return;
    }

    if (!confirm(`Vuoi resettare la password per ${company.owner.first_name} ${company.owner.last_name}? Verrà inviata una nuova password via email.`)) {
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Sessione non valida');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/reset-owner-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          owner_email: company.owner.email,
          company_name: company.company_name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante il reset della password');
      }

      alert('Password resettata con successo! Email inviata all\'owner.');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(error instanceof Error ? error.message : 'Errore durante il reset della password');
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.owner?.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.owner?.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto pt-2 lg:pt-4">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-daze-black">Aziende Installatrici</h1>
              <p className="text-daze-black/60 font-inter mt-1">Gestisci le aziende partner e i loro team</p>
            </div>
            <Button
              variant="primaryBlack"
              size="sm"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => setShowModal(true)}
            >
              Nuova Azienda
            </Button>
          </div>

          <div className="bg-white rounded-squircle border border-daze-gray p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-daze-black/40 w-5 h-5" />
              <input
                type="text"
                placeholder="Cerca per nome azienda, città, owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 font-inter border border-daze-gray rounded-lg outline-none focus:ring-0 focus:border-daze-blue transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-daze-blue"></div>
              <p className="text-daze-black/60 font-inter mt-2">Caricamento aziende...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="bg-white rounded-squircle border border-daze-gray p-12 text-center">
              <Building2 className="w-16 h-16 text-daze-black/20 mx-auto mb-4" />
              <p className="text-daze-black/60 text-lg">
                {searchQuery ? 'Nessuna azienda trovata' : 'Nessuna azienda ancora registrata'}
              </p>
              {!searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(true)}
                  className="mt-4"
                >
                  Crea la prima azienda
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredCompanies.map((company) => (
                <div
                  key={company.id}
                  className="bg-white rounded-squircle border border-daze-gray p-6 transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-16 h-16 bg-daze-blue-light rounded-lg flex items-center justify-center flex-shrink-0">
                        {company.logo_url ? (
                          <img
                            src={company.logo_url}
                            alt={company.company_name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Building2 className="w-8 h-8 text-daze-blue" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-daze-black">
                            {company.company_name}
                          </h3>
                          {!company.is_active && (
                            <span className="px-2 py-1 text-xs font-medium bg-daze-salmon/10 text-daze-salmon-dark rounded-pill">
                              Inattiva
                            </span>
                          )}
                        </div>

                        {company.business_name && (
                          <p className="text-sm font-inter text-daze-black/70 mb-2">{company.business_name}</p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm font-inter text-daze-black/70 mb-4">
                          {company.owner && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>Owner: {company.owner.first_name} {company.owner.last_name}</span>
                            </div>
                          )}
                          {company.city && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{company.city}{company.province && ` (${company.province})`}</span>
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              <span>{company.email}</span>
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              <span>{company.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-inter">
                          <div className="bg-daze-blue-light rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="w-4 h-4 text-daze-blue" />
                              <span className="text-xs text-daze-black/70">Installatori</span>
                            </div>
                            <p className="text-lg font-semibold text-daze-black">
                              {company.stats.active_installers}/{company.stats.total_installers}
                            </p>
                          </div>

                          <div className="bg-daze-forest/10 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Award className="w-4 h-4 text-daze-forest" />
                              <span className="text-xs text-daze-black/70">Punti Totali</span>
                            </div>
                            <p className="text-lg font-semibold text-daze-black">
                              {company.stats.total_points.toLocaleString()}
                            </p>
                          </div>

                          <div className="bg-daze-blue-light rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="w-4 h-4 text-daze-blue" />
                              <span className="text-xs text-daze-black/70">Lead Assegnate</span>
                            </div>
                            <p className="text-lg font-semibold text-daze-black">
                              {company.stats.total_leads}
                            </p>
                          </div>

                          <div className="bg-daze-honey/10 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Award className="w-4 h-4 text-daze-honey-dark" />
                              <span className="text-xs text-daze-black/70">Tier</span>
                            </div>
                            <p className="text-sm font-semibold text-daze-black">
                              {company.stats.current_tier?.display_name || 'Nessuno'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => resetOwnerPassword(company)}
                        className="p-2 text-daze-honey-dark hover:bg-daze-honey/10 rounded-lg transition-colors"
                        title="Reset password owner"
                      >
                        <KeyRound className="w-5 h-5" />
                      </button>
                      <Toggle
                        checked={company.is_active}
                        onChange={() => toggleCompanyStatus(company.id, company.is_active)}
                        label={company.is_active ? 'Disattiva azienda' : 'Attiva azienda'}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CreateCompanyModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            loadCompanies();
          }}
        />
      )}
    </AdminLayout>
  );
}
