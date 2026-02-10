import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { MapPin, Mail, Phone, Plus, Pencil, Trash2 } from 'lucide-react';
import type { AreaManager } from '../../types';
import Button from '../../components/shared/Button';

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
        <div className="max-w-7xl mx-auto pt-2 lg:pt-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-daze-blue"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto pt-2 lg:pt-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-daze-black mb-2">Area Manager</h1>
            <p className="text-daze-black/70 font-inter">Gestisci i responsabili commerciali per territorio</p>
          </div>
          <Button
            variant="primaryBlack"
            size="sm"
            icon={<Plus className="w-5 h-5" />}
            onClick={openCreateModal}
          >
            Nuovo Area Manager
          </Button>
        </div>

        {areaManagers.length === 0 ? (
          <div className="bg-white rounded-squircle border border-daze-gray p-12 text-center">
            <MapPin className="w-16 h-16 text-daze-black/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-daze-black mb-2">Nessun area manager</h3>
            <p className="text-daze-black/70 font-inter mb-6">Inizia aggiungendo il primo area manager</p>
            <Button
              variant="primaryBlack"
              size="sm"
              icon={<Plus className="w-5 h-5" />}
              onClick={openCreateModal}
            >
              Aggiungi Area Manager
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {areaManagers.map((manager) => (
              <div
                key={manager.id}
                className="bg-white rounded-squircle border border-daze-gray p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-daze-blue p-3 rounded-lg">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(manager)}
                      className="p-2 text-daze-black/70 hover:text-daze-blue hover:bg-daze-gray/20 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(manager.id)}
                      className="p-2 text-daze-black/70 hover:text-daze-salmon-dark hover:bg-daze-salmon/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-daze-black mb-4">{manager.name}</h3>

                <div className="space-y-3 mb-4 font-inter">
                  <div className="flex items-center gap-2 text-sm text-daze-black/70">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${manager.email}`} className="hover:text-daze-blue">
                      {manager.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-daze-black/70">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${manager.phone}`} className="hover:text-daze-blue">
                      {manager.phone}
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-daze-gray">
                  <p className="text-xs font-inter font-medium text-daze-black/60 mb-2">REGIONI GESTITE</p>
                  <div className="flex flex-wrap gap-1">
                    {manager.regions.map((region) => (
                      <span
                        key={region}
                        className="inline-flex items-center px-2 py-1 rounded-md bg-daze-blue-light text-daze-blue text-xs font-medium"
                      >
                        {region}
                      </span>
                    ))}
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
      </div>
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
      <div className="bg-white rounded-squircle max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-daze-gray">
          <h2 className="text-2xl font-bold text-daze-black">
            {manager ? 'Modifica Area Manager' : 'Nuovo Area Manager'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 font-inter">
          <div>
            <label className="block text-sm font-medium text-daze-black/70 mb-2">
              Nome completo
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-daze-gray rounded-lg outline-none focus:ring-0 focus:border-daze-blue transition-all"
              placeholder="Mario Rossi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-daze-black/70 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-daze-gray rounded-lg outline-none focus:ring-0 focus:border-daze-blue transition-all"
              placeholder="mario.rossi@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-daze-black/70 mb-2">
              Telefono
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-daze-gray rounded-lg outline-none focus:ring-0 focus:border-daze-blue transition-all"
              placeholder="+39 333 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-daze-black/70 mb-2">
              Regioni gestite ({formData.regions.length} selezionate)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-4 border border-daze-gray rounded-lg">
              {ITALIAN_REGIONS.map((region) => (
                <label
                  key={region}
                  className="flex items-center gap-2 cursor-pointer hover:bg-daze-gray/10 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={formData.regions.includes(region)}
                    onChange={() => toggleRegion(region)}
                    className="w-4 h-4 text-daze-blue border-daze-gray rounded focus:ring-daze-blue"
                  />
                  <span className="text-sm text-daze-black/70">{region}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={onClose}
              fullWidth
            >
              Annulla
            </Button>
            <Button
              variant="primaryBlack"
              size="sm"
              type="submit"
              disabled={saving || formData.regions.length === 0}
              fullWidth
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
