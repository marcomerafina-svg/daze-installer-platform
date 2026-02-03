import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import InstallerLayout from '../../components/installer/InstallerLayout';
import { Package, Clock, CheckCircle, XCircle, Calendar, User, MapPin, Phone, Image as ImageIcon, AlertCircle } from 'lucide-react';
import type { WallboxSerial, Product } from '../../types';

interface InstallationGroup {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  installation_date: string;
  source_type: 'daze_lead' | 'self_reported';
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  serials: WallboxSerial[];
  total_points: number;
  photo_count: number;
  created_at: string;
}

type FilterTab = 'all' | 'daze_lead' | 'self_reported' | 'pending';

export default function Installations() {
  const { installer } = useAuth();
  const [installations, setInstallations] = useState<InstallationGroup[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [selectedInstallation, setSelectedInstallation] = useState<InstallationGroup | null>(null);

  useEffect(() => {
    if (installer) {
      loadInstallations();
    }
  }, [installer]);

  const loadInstallations = async () => {
    if (!installer) return;

    try {
      const { data: serials, error } = await supabase
        .from('wallbox_serials')
        .select('id, serial_code, product_id, installer_id, lead_id, source_type, approval_status, created_at, customer_first_name, customer_last_name, customer_phone, customer_email, customer_address, installation_date, rejection_reason, photo_urls, product:products(id, name, points)')
        .eq('installer_id', installer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (serials) {
        const groupedMap = new Map<string, InstallationGroup>();

        serials.forEach((serial) => {
          let groupKey: string;
          if (serial.lead_id) {
            groupKey = `lead_${serial.lead_id}`;
          } else {
            groupKey = `self_${serial.customer_phone}_${serial.installation_date}`;
          }

          if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
              id: groupKey,
              customer_name: serial.lead_id
                ? 'Da Lead Daze'
                : `${serial.customer_first_name} ${serial.customer_last_name}`,
              customer_phone: serial.customer_phone || '',
              customer_email: serial.customer_email,
              customer_address: serial.customer_address,
              installation_date: serial.installation_date || serial.created_at,
              source_type: serial.source_type as 'daze_lead' | 'self_reported',
              approval_status: serial.approval_status as 'pending' | 'approved' | 'rejected',
              rejection_reason: serial.rejection_reason,
              serials: [],
              total_points: 0,
              photo_count: Array.isArray(serial.photo_urls) ? serial.photo_urls.length : 0,
              created_at: serial.created_at,
            });
          }

          const group = groupedMap.get(groupKey)!;
          group.serials.push(serial);
          if (serial.approval_status === 'approved' && serial.product) {
            group.total_points += serial.product.points;
          }
        });

        setInstallations(Array.from(groupedMap.values()));
      }
    } catch (error) {
      console.error('Error loading installations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInstallations = installations.filter((installation) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return installation.approval_status === 'pending';
    return installation.source_type === filter;
  });

  const stats = {
    total: installations.length,
    from_leads: installations.filter(i => i.source_type === 'daze_lead').length,
    self_reported: installations.filter(i => i.source_type === 'self_reported').length,
    pending: installations.filter(i => i.approval_status === 'pending').length,
    approved: installations.filter(i => i.approval_status === 'approved').length,
    rejected: installations.filter(i => i.approval_status === 'rejected').length,
    total_points: installations.reduce((sum, i) => sum + i.total_points, 0),
    pending_points: installations
      .filter(i => i.approval_status === 'pending')
      .reduce((sum, i) => {
        return sum + i.serials.reduce((s, serial) => s + (serial.product?.points || 0), 0);
      }, 0),
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    const badges = {
      pending: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: Clock,
        label: 'In Approvazione',
      },
      approved: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: CheckCircle,
        label: 'Approvata',
      },
      rejected: {
        bg: 'bg-rose-100',
        text: 'text-rose-700',
        border: 'border-rose-200',
        icon: XCircle,
        label: 'Rifiutata',
      },
    };
    return badges[status];
  };

  const getSourceBadge = (sourceType: 'daze_lead' | 'self_reported') => {
    return sourceType === 'daze_lead'
      ? { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Lead Daze' }
      : { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Autonoma' };
  };

  if (loading) {
    return (
      <InstallerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </InstallerLayout>
    );
  }

  return (
    <InstallerLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Le Mie Installazioni</h1>
          <p className="text-slate-600">Tutte le tue installazioni, da lead Daze e autonome</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Totali</p>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Da Lead</p>
            <p className="text-3xl font-bold text-teal-600">{stats.from_leads}</p>
          </div>
          <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Autonome</p>
            <p className="text-3xl font-bold text-blue-600">{stats.self_reported}</p>
          </div>
          <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">In Approvazione</p>
            <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6 mb-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tutte ({stats.total})
            </button>
            <button
              onClick={() => setFilter('daze_lead')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'daze_lead'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Da Lead Daze ({stats.from_leads})
            </button>
            <button
              onClick={() => setFilter('self_reported')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'self_reported'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Autonome ({stats.self_reported})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'pending'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              In Approvazione ({stats.pending})
            </button>
          </div>

          {stats.pending_points > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <Clock className="w-5 h-5" />
                <div>
                  <p className="text-sm font-medium">Punti in Attesa di Approvazione</p>
                  <p className="text-xs mt-1">
                    Hai <span className="font-bold">{stats.pending_points} punti</span> in attesa di verifica admin
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {filteredInstallations.length === 0 ? (
            <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-12 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Nessuna installazione trovata</p>
              <p className="text-sm text-slate-500 mt-2">
                {filter !== 'all' ? 'Prova a cambiare filtro' : 'Registra la tua prima installazione dalla dashboard'}
              </p>
            </div>
          ) : (
            filteredInstallations.map((installation) => {
              const statusBadge = getStatusBadge(installation.approval_status);
              const sourceBadge = getSourceBadge(installation.source_type);
              const StatusIcon = statusBadge.icon;

              return (
                <div
                  key={installation.id}
                  onClick={() => setSelectedInstallation(installation)}
                  className="bg-white rounded-xl shadow-soft border border-slate-200 p-6 hover:shadow-medium hover:border-slate-300 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {installation.customer_name}
                        </h3>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${sourceBadge.bg} ${sourceBadge.text}`}>
                          {sourceBadge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(installation.installation_date).toLocaleDateString('it-IT')}</span>
                        </div>
                        {installation.customer_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            <span>{installation.customer_phone}</span>
                          </div>
                        )}
                        {installation.photo_count > 0 && (
                          <div className="flex items-center gap-1">
                            <ImageIcon className="w-4 h-4" />
                            <span>{installation.photo_count} foto</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{statusBadge.label}</span>
                    </div>
                  </div>

                  {installation.rejection_reason && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2 text-rose-800">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Motivo Rifiuto</p>
                          <p className="text-xs mt-1">{installation.rejection_reason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Prodotti Installati</p>
                      <div className="flex flex-wrap gap-2">
                        {installation.serials.map((serial, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium"
                          >
                            {serial.product?.name || 'Prodotto Sconosciuto'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Punti</p>
                      <p className={`text-2xl font-bold ${
                        installation.approval_status === 'approved'
                          ? 'text-emerald-600'
                          : installation.approval_status === 'pending'
                          ? 'text-amber-600'
                          : 'text-slate-400'
                      }`}>
                        {installation.approval_status === 'approved'
                          ? installation.total_points
                          : installation.serials.reduce((sum, s) => sum + (s.product?.points || 0), 0)
                        }
                      </p>
                      {installation.approval_status === 'pending' && (
                        <p className="text-xs text-amber-600 font-medium">In attesa</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedInstallation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedInstallation(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {selectedInstallation.customer_name}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    getSourceBadge(selectedInstallation.source_type).bg
                  } ${getSourceBadge(selectedInstallation.source_type).text}`}>
                    {getSourceBadge(selectedInstallation.source_type).label}
                  </span>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                    getStatusBadge(selectedInstallation.approval_status).bg
                  } ${getStatusBadge(selectedInstallation.approval_status).text} ${
                    getStatusBadge(selectedInstallation.approval_status).border
                  }`}>
                    {getStatusBadge(selectedInstallation.approval_status).label}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedInstallation(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <XCircle className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            {selectedInstallation.rejection_reason && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3 text-rose-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Motivo Rifiuto</p>
                    <p className="text-sm">{selectedInstallation.rejection_reason}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Informazioni Cliente</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-900 font-medium">{selectedInstallation.customer_name}</span>
                  </div>
                  {selectedInstallation.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{selectedInstallation.customer_phone}</span>
                    </div>
                  )}
                  {selectedInstallation.customer_address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{selectedInstallation.customer_address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      Installata il {new Date(selectedInstallation.installation_date).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-3">
                  Prodotti Installati ({selectedInstallation.serials.length})
                </h3>
                <div className="space-y-2">
                  {selectedInstallation.serials.map((serial, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{serial.product?.name || 'Prodotto Sconosciuto'}</p>
                        <p className="text-xs text-slate-500">S/N: {serial.serial_code}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          selectedInstallation.approval_status === 'approved'
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}>
                          {serial.product?.points || 0} pt
                        </p>
                        {selectedInstallation.approval_status === 'pending' && (
                          <p className="text-xs text-amber-600">In attesa</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-teal-900">Totale Punti</span>
                  <span className="text-2xl font-bold text-teal-600">
                    {selectedInstallation.approval_status === 'approved'
                      ? selectedInstallation.total_points
                      : selectedInstallation.serials.reduce((sum, s) => sum + (s.product?.points || 0), 0)
                    }
                  </span>
                </div>
                {selectedInstallation.approval_status === 'pending' && (
                  <p className="text-xs text-amber-600 font-medium mt-2">
                    I punti saranno confermati dopo l'approvazione admin
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </InstallerLayout>
  );
}
