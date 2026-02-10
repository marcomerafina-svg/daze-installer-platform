import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import type { InstallerWithStats } from '../../types';
import { Plus, Search, Phone, MapPin, Building2 } from 'lucide-react';
import Button from '../../components/shared/Button';
import Toggle from '../../components/shared/Toggle';
import React from 'react';

export default function Installers() {
  const [installers, setInstallers] = useState<InstallerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadInstallers();
  }, []);

  const loadInstallers = async () => {
    try {
      const { data, error } = await supabase
        .from('installers')
        .select('*, company:installation_companies(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const installersWithStats = await Promise.all(
        (data || []).map(async (installer) => {
          const { count: totalLeads } = await supabase
            .from('lead_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('installer_id', installer.id);

          const { count: activeLeads } = await supabase
            .from('lead_assignments')
            .select('lead_id', { count: 'exact', head: true })
            .eq('installer_id', installer.id)
            .in('lead_id',
              (await supabase
                .from('leads')
                .select('id')
                .not('status', 'in', '("Chiusa Vinta","Chiusa Persa")')
              ).data?.map(l => l.id) || []
            );

          const { count: wonLeads } = await supabase
            .from('lead_assignments')
            .select('lead_id', { count: 'exact', head: true })
            .eq('installer_id', installer.id)
            .in('lead_id',
              (await supabase
                .from('leads')
                .select('id')
                .eq('status', 'Chiusa Vinta')
              ).data?.map(l => l.id) || []
            );

          const conversionRate = totalLeads && totalLeads > 0
            ? Math.round((wonLeads! / totalLeads) * 100)
            : 0;

          return {
            ...installer,
            total_leads: totalLeads || 0,
            active_leads: activeLeads || 0,
            won_leads: wonLeads || 0,
            conversion_rate: conversionRate,
          };
        })
      );

      setInstallers(installersWithStats);
    } catch (error) {
      console.error('Error loading installers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleInstallerStatus = async (installerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('installers')
        .update({ is_active: !currentStatus })
        .eq('id', installerId);

      if (error) throw error;
      await loadInstallers();
    } catch (error) {
      console.error('Error toggling installer status:', error);
    }
  };

  const filteredInstallers = installers.filter((installer) =>
    `${installer.first_name} ${installer.last_name} ${installer.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto pt-2 lg:pt-4">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-daze-black mb-2">Installatori</h1>
            <p className="text-sm sm:text-base font-inter text-daze-black/70">Gestisci i tuoi partner installatori</p>
          </div>
          <Button
            variant="primaryBlack"
            size="sm"
            icon={<Plus className="w-5 h-5" />}
            onClick={() => setShowModal(true)}
          >
            <span className="hidden sm:inline">Nuovo Installatore</span>
            <span className="sm:hidden">Nuovo</span>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-daze-black/40 w-5 h-5" />
          <input
            type="text"
            placeholder="Cerca installatore..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 font-inter border border-daze-gray rounded-lg outline-none focus:ring-0 focus:border-daze-blue transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-daze-blue"></div>
        </div>
      ) : (
        <>
          <div className="hidden lg:block bg-white rounded-squircle border border-daze-gray overflow-hidden">
            <table className="w-full table-fixed">
            <thead className="bg-daze-gray/10 border-b border-daze-gray font-inter">
              <tr>
                <th className="text-left px-3 py-3 text-sm font-semibold text-daze-black w-[22%]">Installatore</th>
                <th className="text-left px-3 py-3 text-sm font-semibold text-daze-black w-[16%]">Azienda</th>
                <th className="text-left px-3 py-3 text-sm font-semibold text-daze-black w-[12%]">Regione</th>
                <th className="text-center px-2 py-3 text-sm font-semibold text-daze-black w-[10%]">Totali</th>
                <th className="text-center px-2 py-3 text-sm font-semibold text-daze-black w-[10%]">Attive</th>
                <th className="text-center px-2 py-3 text-sm font-semibold text-daze-black w-[10%]">Vinte</th>
                <th className="text-center px-2 py-3 text-sm font-semibold text-daze-black w-[10%]">Conv.</th>
                <th className="text-center px-2 py-3 text-sm font-semibold text-daze-black w-[10%]">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-daze-gray font-inter">
              {filteredInstallers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-daze-black/60">
                    Nessun installatore trovato
                  </td>
                </tr>
              ) : (
                filteredInstallers.map((installer) => (
                  <tr key={installer.id} className="hover:bg-daze-gray/10 transition-colors">
                    <td className="px-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-daze-black truncate">
                          {installer.first_name} {installer.last_name}
                        </p>
                        <p className="text-xs text-daze-black/60 truncate">{installer.email}</p>
                        {installer.phone && (
                          <p className="text-xs text-daze-black/50 truncate mt-0.5">
                            <Phone className="w-3 h-3 inline mr-1" />
                            {installer.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {installer.company ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Building2 className="w-4 h-4 text-daze-blue shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-daze-black truncate">{installer.company.company_name}</p>
                            {installer.role_in_company && (
                              <p className="text-xs text-daze-black/60 capitalize truncate">{installer.role_in_company}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-daze-black/40 italic">Indipendente</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {installer.region ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-daze-black/40 shrink-0" />
                          <span className="text-sm text-daze-black truncate">{installer.region}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-daze-black/40 italic">N/D</span>
                      )}
                    </td>
                    <td className="text-center px-2 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-daze-gray rounded-full text-sm font-semibold text-daze-black">
                        {installer.total_leads}
                      </span>
                    </td>
                    <td className="text-center px-2 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-daze-blue-light rounded-full text-sm font-semibold text-daze-blue">
                        {installer.active_leads}
                      </span>
                    </td>
                    <td className="text-center px-2 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-daze-forest/10 rounded-full text-sm font-semibold text-daze-forest">
                        {installer.won_leads}
                      </span>
                    </td>
                    <td className="text-center px-2 py-3">
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold ${
                        installer.conversion_rate >= 70 ? 'bg-daze-forest/10 text-daze-forest' :
                        installer.conversion_rate >= 40 ? 'bg-daze-honey/10 text-daze-honey-dark' :
                        'bg-daze-salmon/10 text-daze-salmon-dark'
                      }`}>
                        {installer.conversion_rate}%
                      </span>
                    </td>
                    <td className="text-center px-2 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <Toggle
                          checked={installer.is_active}
                          onChange={() => toggleInstallerStatus(installer.id, installer.is_active)}
                          size="sm"
                        />
                        <span className={`text-xs font-medium ${installer.is_active ? 'text-daze-forest' : 'text-daze-black/60'}`}>
                          {installer.is_active ? 'Attivo' : 'Inattivo'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-4">
            {filteredInstallers.length === 0 ? (
              <div className="bg-white rounded-squircle border border-daze-gray p-8 text-center text-daze-black/60">
                Nessun installatore trovato
              </div>
            ) : (
              filteredInstallers.map((installer) => (
                <div key={installer.id} className="bg-white rounded-squircle border border-daze-gray p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-daze-black text-lg mb-1">
                        {installer.first_name} {installer.last_name}
                      </h3>
                      <p className="text-sm font-inter text-daze-black/60 mb-3">{installer.email}</p>

                      <div className="space-y-2 mb-3 font-inter">
                        {installer.phone && (
                          <div className="flex items-center gap-2 text-sm text-daze-black/70">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${installer.phone}`} className="hover:text-daze-blue">
                              {installer.phone}
                            </a>
                          </div>
                        )}
                        {installer.region && (
                          <div className="flex items-center gap-2 text-sm text-daze-black/70">
                            <MapPin className="w-4 h-4" />
                            <span>{installer.region}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Toggle
                      checked={installer.is_active}
                      onChange={() => toggleInstallerStatus(installer.id, installer.is_active)}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-daze-gray font-inter">
                    <div className="text-center">
                      <p className="text-xs text-daze-black/60 mb-1">Totali</p>
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-daze-gray rounded-full text-sm font-semibold text-daze-black">
                        {installer.total_leads}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-daze-black/60 mb-1">Attive</p>
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-daze-blue-light rounded-full text-sm font-semibold text-daze-blue">
                        {installer.active_leads}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-daze-black/60 mb-1">Vinte</p>
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-daze-forest/10 rounded-full text-sm font-semibold text-daze-forest">
                        {installer.won_leads}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-daze-black/60 mb-1">Conv.</p>
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold ${
                        installer.conversion_rate >= 70 ? 'bg-daze-forest/10 text-daze-forest' :
                        installer.conversion_rate >= 40 ? 'bg-daze-honey/10 text-daze-honey-dark' :
                        'bg-daze-salmon/10 text-daze-salmon-dark'
                      }`}>
                        {installer.conversion_rate}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showModal && <CreateInstallerModal onClose={() => setShowModal(false)} onSuccess={loadInstallers} />}
      </div>
    </AdminLayout>
  );
}

const ITALIAN_REGIONS = [
  'Valle d\'Aosta',
  'Piemonte',
  'Liguria',
  'Lombardia',
  'Trentino-Alto Adige',
  'Veneto',
  'Friuli-Venezia Giulia',
  'Emilia-Romagna',
  'Toscana',
  'Umbria',
  'Marche',
  'Lazio',
  'Abruzzo',
  'Molise',
  'Campania',
  'Puglia',
  'Basilicata',
  'Calabria',
  'Sicilia',
  'Sardegna',
];

function CreateInstallerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    region: '',
    companyId: '',
  });
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('installation_companies')
        .select('id, company_name')
        .eq('is_active', true)
        .order('company_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl) {
        throw new Error('Configurazione mancante: VITE_SUPABASE_URL');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/create-test-installer`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Errore durante la creazione dell\'installatore');
      }

      setSuccessMessage(data.message || 'Installatore creato con successo!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Errore durante la creazione dell\'installatore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-squircle max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-daze-black mb-4 sm:mb-6">Nuovo Installatore</h2>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 font-inter">
          {error && (
            <div className="bg-daze-salmon/10 border border-daze-salmon/20 rounded-lg p-2 sm:p-3 text-xs sm:text-sm text-daze-salmon-dark">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-daze-forest/10 border border-daze-forest/20 rounded-lg p-2 sm:p-3 text-xs sm:text-sm text-daze-forest">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-daze-black/70 mb-2">Nome</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-daze-gray rounded-lg outline-none focus:ring-0 focus:border-daze-blue transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-daze-black/70 mb-2">Cognome</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-daze-gray rounded-lg outline-none focus:ring-0 focus:border-daze-blue transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-daze-black/70 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-daze-gray rounded-lg outline-none focus:ring-0 focus:border-daze-blue transition-all"
            />
            <p className="text-xs text-daze-black/60 mt-1">
              Una password temporanea verrà generata e inviata via email
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-daze-black/70 mb-2">Telefono</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-daze-gray rounded-lg outline-none focus:ring-0 focus:border-daze-blue transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-daze-black/70 mb-2">Regione</label>
            <select
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              className="w-full px-4 py-2 border border-daze-gray rounded-lg outline-none focus:ring-0 focus:border-daze-blue transition-all"
            >
              <option value="">Seleziona regione...</option>
              {ITALIAN_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-daze-black/70 mb-2">Azienda (opzionale)</label>
            <select
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              className="w-full px-4 py-2 border border-daze-gray rounded-lg outline-none focus:ring-0 focus:border-daze-blue transition-all"
            >
              <option value="">Installatore indipendente</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.company_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-daze-black/60 mt-1">
              Seleziona un'azienda se l'installatore ne fa parte
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={onClose}
              disabled={loading}
              fullWidth
            >
              Annulla
            </Button>
            <Button
              variant="primaryBlack"
              size="sm"
              type="submit"
              disabled={loading}
              fullWidth
            >
              {loading ? 'Creazione...' : 'Crea Installatore'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
