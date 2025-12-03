import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { MapPin, Mail, Phone, Plus, Pencil, Trash2 } from 'lucide-react';
import type { AreaManager } from '../../types';

export default function AreaManagers() {
  const [areaManagers, setAreaManagers] = useState<AreaManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingManager, setEditingManager] = useState<AreaManager | null>(null);

  useEffect(() => {
    loadAreaManagers();
  }, []);

  const loadAreaManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('area_managers')
        .select('*')
        .order('name');

      if (error) throw error;
      setAreaManagers(data || []);
    } catch (error) {
      console.error('Error loading area managers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo area manager?')) return;

    try {
      const { error } = await supabase
        .from('area_managers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadAreaManagers();
    } catch (error) {
      console.error('Error deleting area manager:', error);
      alert('Errore durante l\'eliminazione');
    }
  };

  const openEditModal = (manager: AreaManager) => {
    setEditingManager(manager);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingManager(null);
    setShowModal(true);
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Area Manager</h1>
          <p className="text-gray-600">Gestisci i responsabili commerciali per territorio</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#4a5fc1] text-white rounded-lg hover:bg-[#223aa3] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuovo Area Manager
        </button>
      </div>

      {areaManagers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun area manager</h3>
          <p className="text-gray-600 mb-6">Inizia aggiungendo il primo area manager</p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4a5fc1] text-white rounded-lg hover:bg-[#223aa3] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Aggiungi Area Manager
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {areaManagers.map((manager) => (
            <div
              key={manager.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-gradient-to-br from-[#223aa3] to-[#4a5fc1] p-3 rounded-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(manager)}
                    className="p-2 text-gray-600 hover:text-[#4a5fc1] hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(manager.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-4">{manager.name}</h3>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${manager.email}`} className="hover:text-[#4a5fc1]">
                    {manager.email}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${manager.phone}`} className="hover:text-[#4a5fc1]">
                    {manager.phone}
                  </a>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-2">REGIONI GESTITE</p>
                <div className="flex flex-wrap gap-1">
                  {manager.regions.slice(0, 3).map((region) => (
                    <span
                      key={region}
                      className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium"
                    >
                      {region}
                    </span>
                  ))}
                  {manager.regions.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                      +{manager.regions.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AreaManagerModal
          manager={editingManager}
          onClose={() => {
            setShowModal(false);
            setEditingManager(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingManager(null);
            loadAreaManagers();
          }}
        />
      )}
    </AdminLayout>
  );
}

interface AreaManagerModalProps {
  manager: AreaManager | null;
  onClose: () => void;
  onSave: () => void;
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

function AreaManagerModal({ manager, onClose, onSave }: AreaManagerModalProps) {
  const [formData, setFormData] = useState({
    name: manager?.name || '',
    email: manager?.email || '',
    phone: manager?.phone || '',
    regions: manager?.regions || [],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (manager) {
        const { error } = await supabase
          .from('area_managers')
          .update(formData)
          .eq('id', manager.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('area_managers')
          .insert([formData]);
        if (error) throw error;
      }
      onSave();
    } catch (error) {
      console.error('Error saving area manager:', error);
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const toggleRegion = (region: string) => {
    setFormData((prev) => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter((r) => r !== region)
        : [...prev.regions, region],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {manager ? 'Modifica Area Manager' : 'Nuovo Area Manager'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome completo
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a5fc1] focus:border-transparent"
              placeholder="Mario Rossi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a5fc1] focus:border-transparent"
              placeholder="mario.rossi@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefono
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a5fc1] focus:border-transparent"
              placeholder="+39 333 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Regioni gestite ({formData.regions.length} selezionate)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-4 border border-gray-200 rounded-lg">
              {ITALIAN_REGIONS.map((region) => (
                <label
                  key={region}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={formData.regions.includes(region)}
                    onChange={() => toggleRegion(region)}
                    className="w-4 h-4 text-[#4a5fc1] border-gray-300 rounded focus:ring-[#4a5fc1]"
                  />
                  <span className="text-sm text-gray-700">{region}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || formData.regions.length === 0}
              className="flex-1 px-4 py-2 bg-[#4a5fc1] text-white rounded-lg hover:bg-[#223aa3] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
