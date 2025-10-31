import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import type { InstallerWithStats } from '../../types';
import { Plus, Search, ToggleLeft, ToggleRight, Mail, Phone, MapPin } from 'lucide-react';

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
        .select('*')
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
                .not('status', 'in', '("Chiusa vinta","Chiusa persa")')
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
                .eq('status', 'Chiusa vinta')
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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Installatori</h1>
            <p className="text-gray-600">Gestisci i tuoi partner installatori</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#223aa3] to-[#4a5fc1] text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Nuovo Installatore
          </button>
        </div>

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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4a5fc1]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Installatore</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Contatti</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Regione</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">Lead Totali</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">Lead Attive</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">Lead Vinte</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">Conversion Rate</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInstallers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    Nessun installatore trovato
                  </td>
                </tr>
              ) : (
                filteredInstallers.map((installer) => (
                  <tr key={installer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {installer.first_name} {installer.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{installer.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />
                          <a href={`mailto:${installer.email}`} className="hover:text-[#4a5fc1]">
                            {installer.email}
                          </a>
                        </div>
                        {installer.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${installer.phone}`} className="hover:text-[#4a5fc1]">
                              {installer.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {installer.region ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{installer.region}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Non specificata</span>
                      )}
                    </td>
                    <td className="text-center px-6 py-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full font-semibold text-gray-900">
                        {installer.total_leads}
                      </span>
                    </td>
                    <td className="text-center px-6 py-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full font-semibold text-blue-900">
                        {installer.active_leads}
                      </span>
                    </td>
                    <td className="text-center px-6 py-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-full font-semibold text-green-900">
                        {installer.won_leads}
                      </span>
                    </td>
                    <td className="text-center px-6 py-4">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${
                        installer.conversion_rate >= 70 ? 'bg-green-100 text-green-800' :
                        installer.conversion_rate >= 40 ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {installer.conversion_rate}%
                      </span>
                    </td>
                    <td className="text-center px-6 py-4">
                      <button
                        onClick={() => toggleInstallerStatus(installer.id, installer.is_active)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-100"
                      >
                        {installer.is_active ? (
                          <>
                            <ToggleRight className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-green-600">Attivo</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-500">Inattivo</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <CreateInstallerModal onClose={() => setShowModal(false)} onSuccess={loadInstallers} />}
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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const supabaseUrl = import.meta.env.VITE_BoltDatabase_URL;
      const anonKey = import.meta.env.VITE_BoltDatabase_ANON_KEY;

      if (!supabaseUrl) {
        throw new Error('Configurazione mancante: SUPABASE_URL');
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuovo Installatore</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a5fc1] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cognome</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a5fc1] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a5fc1] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Una password temporanea verrà generata e inviata via email
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefono</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a5fc1] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Regione</label>
            <select
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a5fc1] focus:border-transparent"
            >
              <option value="">Seleziona regione...</option>
              {ITALIAN_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#223aa3] to-[#4a5fc1] text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Creazione...' : 'Crea Installatore'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
