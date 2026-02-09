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
  const { installer, loading: authLoading } = useAuth();
  const [installations, setInstallations] = useState<InstallationGroup[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [selectedInstallation, setSelectedInstallation] = useState<InstallationGroup | null>(null);

  useEffect(() => {
    if (installer) {
      loadInstallations();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [installer, authLoading]);

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
        bg: 'bg-daze-honey/10',
        text: 'text-daze-honey-dark',
        border: 'border-daze-honey/20',
        icon: Clock,
        label: 'In Approvazione',
      },
      approved: {
        bg: 'bg-daze-forest/10',
        text: 'text-daze-forest',
        border: 'border-daze-forest/20',
        icon: CheckCircle,
        label: 'Approvata',
      },
      rejected: {
        bg: 'bg-daze-salmon/10',
        text: 'text-daze-salmon-dark',
        border: 'border-daze-salmon/20',
        icon: XCircle,
        label: 'Rifiutata',
      },
    };
    return badges[status];
  };

  const getSourceBadge = (sourceType: 'daze_lead' | 'self_reported') => {
    return sourceType === 'daze_lead'
      ? { bg: 'bg-daze-blue-light', text: 'text-daze-blue', label: 'Lead Daze' }
      : { bg: 'bg-daze-gray', text: 'text-daze-black', label: 'Autonoma' };
  };

  if (loading) {
    return (
      <InstallerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-daze-blue"></div>
        </div>
      </InstallerLayout>
    );
  }

  return (
    <InstallerLayout>
      <div className="max-w-7xl mx-auto pt-2 lg:pt-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-roobert font-bold text-daze-black mb-2">Le Mie Installazioni</h1>
          <p className="text-daze-black/70 font-inter">Tutte le tue installazioni, da lead Daze e autonome</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 font-inter">
          <div className="bg-white rounded-squircle border border-daze-gray p-4">
            <p className="text-sm font-medium text-daze-black/80 mb-1">Totali</p>
            <p className="text-3xl font-bold text-daze-black">{stats.total}</p>
          </div>
          <div className="bg-white rounded-squircle border border-daze-gray p-4">
            <p className="text-sm font-medium text-daze-black/80 mb-1">Da Lead</p>
            <p className="text-3xl font-bold text-daze-blue">{stats.from_leads}</p>
          </div>
          <div className="bg-white rounded-squircle border border-daze-gray p-4">
            <p className="text-sm font-medium text-daze-black/80 mb-1">Autonome</p>
            <p className="text-3xl font-bold text-daze-black">{stats.self_reported}</p>
          </div>
          <div className="bg-white rounded-squircle border border-daze-gray p-4">
            <p className="text-sm font-medium text-daze-black/80 mb-1">In Approvazione</p>
            <p className="text-3xl font-bold text-daze-honey-dark">{stats.pending}</p>
          </div>
        </div>

        {/* Filter tabs + pending banner */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3 mb-4">
            {([
              { key: 'all' as FilterTab, label: `Tutte (${stats.total})` },
              { key: 'daze_lead' as FilterTab, label: `Da Lead Daze (${stats.from_leads})` },
              { key: 'self_reported' as FilterTab, label: `Autonome (${stats.self_reported})` },
              { key: 'pending' as FilterTab, label: `In Approvazione (${stats.pending})` },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-pill font-roobert font-medium text-sm transition-all ${
                  filter === tab.key
                    ? 'bg-daze-black text-white'
                    : 'bg-daze-gray text-daze-black hover:bg-daze-gray/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {stats.pending_points > 0 && (
            <div className="bg-daze-honey/10 border border-daze-honey/20 rounded-squircle p-4">
              <div className="flex items-center gap-2 text-daze-black">
                <Clock className="w-5 h-5 text-daze-honey-dark" />
                <div>
                  <p className="text-sm font-inter font-medium">Punti in Attesa di Approvazione</p>
                  <p className="text-xs font-inter text-daze-black/70 mt-1">
                    Hai <span className="font-bold text-daze-black">{stats.pending_points} punti</span> in attesa di verifica admin
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Installation list */}
        <div className="space-y-4">
          {filteredInstallations.length === 0 ? (
            <div className="bg-white rounded-squircle border border-daze-gray p-12 text-center">
              <Package className="w-16 h-16 text-daze-black/20 mx-auto mb-4" />
              <p className="text-daze-black font-inter font-medium">Nessuna installazione trovata</p>
              <p className="text-sm text-daze-black/70 font-inter mt-2">
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
                  className="bg-white rounded-squircle border border-daze-gray p-6 hover:border-daze-black/20 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-daze-black" />
                          <h3 className="text-lg font-roobert font-bold text-daze-black">
                            {installation.customer_name}
                          </h3>
                        </div>
                        <span className={`px-2.5 py-1 rounded-pill text-xs font-roobert font-medium ${sourceBadge.bg} ${sourceBadge.text}`}>
                          {sourceBadge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-6 text-sm font-inter font-medium text-daze-black">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-daze-black" />
                          <span>{new Date(installation.installation_date).toLocaleDateString('it-IT')}</span>
                        </div>
                        {installation.customer_phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-daze-black" />
                            <span>{installation.customer_phone}</span>
                          </div>
                        )}
                        {installation.photo_count > 0 && (
                          <div className="flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-daze-black" />
                            <span>{installation.photo_count} foto</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-pill border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-roobert font-medium">{statusBadge.label}</span>
                    </div>
                  </div>

                  {installation.rejection_reason && (
                    <div className="bg-daze-salmon/10 border border-daze-salmon/20 rounded-squircle p-3 mb-4">
                      <div className="flex items-start gap-2 text-daze-salmon-dark">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-inter font-medium">Motivo Rifiuto</p>
                          <p className="text-xs font-inter mt-1 text-daze-black/70">{installation.rejection_reason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-inter text-daze-black/70 mb-1.5">Prodotti Installati</p>
                      <div className="flex flex-wrap gap-2 -ml-0.5">
                        {installation.serials.map((serial, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-daze-gray text-daze-black rounded-pill text-xs font-roobert font-medium"
                          >
                            {serial.product?.name || 'Prodotto Sconosciuto'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-inter text-daze-black/70">Punti</p>
                      <p className={`text-2xl font-roobert font-bold ${
                        installation.approval_status === 'approved'
                          ? 'text-daze-forest'
                          : installation.approval_status === 'pending'
                          ? 'text-daze-honey-dark'
                          : 'text-daze-black/30'
                      }`}>
                        {installation.approval_status === 'approved'
                          ? installation.total_points
                          : installation.serials.reduce((sum, s) => sum + (s.product?.points || 0), 0)
                        }
                      </p>
                      {installation.approval_status === 'pending' && (
                        <p className="text-xs font-inter font-medium text-daze-honey-dark">In attesa</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedInstallation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedInstallation(null)}
        >
          <div
            className="bg-white rounded-squircle max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-roobert font-bold text-daze-black mb-2">
                  {selectedInstallation.customer_name}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-pill text-xs font-roobert font-medium ${
                    getSourceBadge(selectedInstallation.source_type).bg
                  } ${getSourceBadge(selectedInstallation.source_type).text}`}>
                    {getSourceBadge(selectedInstallation.source_type).label}
                  </span>
                  <span className={`px-2.5 py-1 rounded-pill text-xs font-roobert font-medium border ${
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
                className="p-2 hover:bg-daze-gray/20 rounded-xl transition-all"
              >
                <XCircle className="w-6 h-6 text-daze-black/40" />
              </button>
            </div>

            {selectedInstallation.rejection_reason && (
              <div className="bg-daze-salmon/10 border border-daze-salmon/20 rounded-squircle p-4 mb-6">
                <div className="flex items-start gap-3 text-daze-salmon-dark">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-inter font-medium">Motivo Rifiuto</p>
                    <p className="text-sm font-inter mt-1 text-daze-black/70">{selectedInstallation.rejection_reason}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Customer info */}
              <div className="bg-daze-gray/10 rounded-squircle p-4">
                <h3 className="font-roobert font-bold text-daze-black mb-3">Informazioni Cliente</h3>
                <div className="space-y-2 text-sm font-inter">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-daze-black" />
                    <span className="text-daze-black font-medium">{selectedInstallation.customer_name}</span>
                  </div>
                  {selectedInstallation.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-daze-black" />
                      <span className="text-daze-black">{selectedInstallation.customer_phone}</span>
                    </div>
                  )}
                  {selectedInstallation.customer_address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-daze-black" />
                      <span className="text-daze-black">{selectedInstallation.customer_address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-daze-black" />
                    <span className="text-daze-black">
                      Installata il {new Date(selectedInstallation.installation_date).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div className="bg-daze-gray/10 rounded-squircle p-4">
                <h3 className="font-roobert font-bold text-daze-black mb-3">
                  Prodotti Installati ({selectedInstallation.serials.length})
                </h3>
                <div className="space-y-2">
                  {selectedInstallation.serials.map((serial, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl">
                      <div>
                        <p className="font-inter font-medium text-daze-black">{serial.product?.name || 'Prodotto Sconosciuto'}</p>
                        <p className="text-xs font-inter text-daze-black/40">S/N: {serial.serial_code}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-roobert font-bold ${
                          selectedInstallation.approval_status === 'approved'
                            ? 'text-daze-forest'
                            : 'text-daze-honey-dark'
                        }`}>
                          {serial.product?.points || 0} pt
                        </p>
                        {selectedInstallation.approval_status === 'pending' && (
                          <p className="text-xs font-inter text-daze-honey-dark">In attesa</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total points */}
              <div className="bg-daze-blue-light border border-daze-blue/20 rounded-squircle p-4">
                <div className="flex items-center justify-between">
                  <span className="font-roobert font-bold text-daze-black">Totale Punti</span>
                  <span className="text-2xl font-roobert font-bold text-daze-blue">
                    {selectedInstallation.approval_status === 'approved'
                      ? selectedInstallation.total_points
                      : selectedInstallation.serials.reduce((sum, s) => sum + (s.product?.points || 0), 0)
                    }
                  </span>
                </div>
                {selectedInstallation.approval_status === 'pending' && (
                  <p className="text-xs font-inter font-medium text-daze-honey-dark mt-2">
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
