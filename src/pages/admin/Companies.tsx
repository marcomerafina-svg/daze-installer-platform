import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import CreateCompanyModal from '../../components/admin/CreateCompanyModal';
import type { CompanyWithStats, InstallationCompany } from '../../types';
import { Plus, Search, Building2, Users, Award, TrendingUp, Mail, Phone, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';

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

  const filteredCompanies = companies.filter(company =>
    company.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.owner?.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.owner?.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Aziende Installatrici</h1>
            <p className="text-gray-500 mt-1">Gestisci le aziende partner e i loro team</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuova Azienda
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cerca per nome azienda, città, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-2">Caricamento aziende...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchQuery ? 'Nessuna azienda trovata' : 'Nessuna azienda ancora registrata'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Crea la prima azienda
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {company.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={company.company_name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-blue-600" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {company.company_name}
                        </h3>
                        {!company.is_active && (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            Inattiva
                          </span>
                        )}
                      </div>

                      {company.business_name && (
                        <p className="text-sm text-gray-600 mb-2">{company.business_name}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
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

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-gray-600">Installatori</span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">
                            {company.stats.active_installers}/{company.stats.total_installers}
                          </p>
                        </div>

                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-gray-600">Punti Totali</span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">
                            {company.stats.total_points.toLocaleString()}
                          </p>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-purple-600" />
                            <span className="text-xs text-gray-600">Lead Assegnate</span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">
                            {company.stats.total_leads}
                          </p>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="w-4 h-4 text-orange-600" />
                            <span className="text-xs text-gray-600">Tier</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">
                            {company.stats.current_tier?.display_name || 'Nessuno'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleCompanyStatus(company.id, company.is_active)}
                    className="ml-4 text-gray-400 hover:text-gray-600"
                    title={company.is_active ? 'Disattiva azienda' : 'Attiva azienda'}
                  >
                    {company.is_active ? (
                      <ToggleRight className="w-8 h-8 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
