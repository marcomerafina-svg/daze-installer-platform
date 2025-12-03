import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { CheckCircle, XCircle, Clock, Package, User, Calendar, Phone, MapPin, Image as ImageIcon, AlertCircle, X } from 'lucide-react';
import type { WallboxSerial, Installer } from '../../types';

interface PendingInstallation {
  id: string;
  installer: Installer;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  installation_date: string;
  serials: WallboxSerial[];
  total_points: number;
  photo_urls: string[];
  created_at: string;
}

type FilterTab = 'pending' | 'approved' | 'rejected';

export default function PendingInstallations() {
  const [installations, setInstallations] = useState<PendingInstallation[]>([]);
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [loading, setLoading] = useState(true);
  const [selectedInstallation, setSelectedInstallation] = useState<PendingInstallation | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadInstallations();
  }, [filter]);

  const loadInstallations = async () => {
    setLoading(true);
    try {
      const { data: serials, error } = await supabase
        .from('wallbox_serials')
        .select('*, installer:installers(*), product:products(*)')
        .eq('source_type', 'self_reported')
        .eq('approval_status', filter)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (serials) {
        const groupedMap = new Map<string, PendingInstallation>();

        serials.forEach((serial) => {
          const groupKey = `${serial.installer_id}_${serial.customer_phone}_${serial.installation_date}`;

          if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
              id: groupKey,
              installer: serial.installer as Installer,
              customer_name: `${serial.customer_first_name} ${serial.customer_last_name}`,
              customer_phone: serial.customer_phone || '',
              customer_email: serial.customer_email,
              customer_address: serial.customer_address,
              installation_date: serial.installation_date || serial.created_at,
              serials: [],
              total_points: 0,
              photo_urls: Array.isArray(serial.photo_urls) ? serial.photo_urls : [],
              created_at: serial.created_at,
            });
          }

          const group = groupedMap.get(groupKey)!;
          group.serials.push(serial);
          if (serial.product) {
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

  const handleApprove = async (installation: PendingInstallation) => {
    setProcessing(true);
    try {
      const serialIds = installation.serials.map(s => s.id);

      const { error } = await supabase
        .from('wallbox_serials')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .in('id', serialIds);

      if (error) throw error;

      await loadInstallations();
      setSelectedInstallation(null);
    } catch (error) {
      console.error('Error approving installation:', error);
      alert('Errore durante l\'approvazione');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedInstallation || !rejectReason.trim()) {
      alert('Inserisci un motivo per il rifiuto');
      return;
    }

    setProcessing(true);
    try {
      const serialIds = selectedInstallation.serials.map(s => s.id);

      const { error } = await supabase
        .from('wallbox_serials')
        .update({
          approval_status: 'rejected',
          rejection_reason: rejectReason.trim(),
          approved_at: new Date().toISOString(),
        })
        .in('id', serialIds);

      if (error) throw error;

      await loadInstallations();
      setSelectedInstallation(null);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting installation:', error);
      alert('Errore durante il rifiuto');
    } finally {
      setProcessing(false);
    }
  };

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage
      .from('installation-photos')
      .getPublicUrl(path);
    return data.publicUrl;
  };

  const stats = {
    pending: installations.filter(i => filter === 'pending').length,
    total_points: installations.reduce((sum, i) => sum + i.total_points, 0),
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Approvazione Installazioni</h1>
          <p className="text-slate-600">Gestisci le installazioni autonome degli installatori</p>
        </div>

        <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6 mb-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'pending'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                In Attesa
              </div>
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'approved'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Approvate
              </div>
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'rejected'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Rifiutate
              </div>
            </button>
          </div>

          {filter === 'pending' && stats.pending > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <span className="font-bold">{stats.pending}</span> installazioni in attesa di approvazione per un totale di{' '}
                <span className="font-bold">{stats.total_points} punti</span>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {installations.length === 0 ? (
            <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-12 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">
                {filter === 'pending' ? 'Nessuna installazione in attesa' : 'Nessuna installazione'}
              </p>
            </div>
          ) : (
            installations.map((installation) => (
              <div
                key={installation.id}
                className="bg-white rounded-xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{installation.customer_name}</h3>
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">
                        Autonoma
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">
                        {installation.installer.first_name} {installation.installer.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(installation.installation_date).toLocaleDateString('it-IT')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        <span>{installation.customer_phone}</span>
                      </div>
                      {installation.photo_urls.length > 0 && (
                        <div className="flex items-center gap-1">
                          <ImageIcon className="w-4 h-4" />
                          <span>{installation.photo_urls.length} foto</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600 mb-1">Punti</p>
                    <p className="text-2xl font-bold text-teal-600">{installation.total_points}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-slate-600 mb-2">Prodotti Installati ({installation.serials.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {installation.serials.map((serial, idx) => (
                      <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                        {serial.product?.name || 'Sconosciuto'} - {serial.serial_code}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedInstallation(installation)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    Visualizza Dettagli
                  </button>
                  {filter === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(installation)}
                        disabled={processing}
                        className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-all disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Approva
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedInstallation(installation);
                          setShowRejectModal(true);
                        }}
                        disabled={processing}
                        className="px-6 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-all disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Rifiuta
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedInstallation && !showRejectModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedInstallation(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedInstallation.customer_name}</h2>
                <p className="text-slate-600">
                  Installatore: {selectedInstallation.installer.first_name} {selectedInstallation.installer.last_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedInstallation(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Informazioni Cliente</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Nome Completo</p>
                    <p className="font-medium text-slate-900">{selectedInstallation.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Telefono</p>
                    <p className="font-medium text-slate-900">{selectedInstallation.customer_phone}</p>
                  </div>
                  {selectedInstallation.customer_email && (
                    <div>
                      <p className="text-slate-600">Email</p>
                      <p className="font-medium text-slate-900">{selectedInstallation.customer_email}</p>
                    </div>
                  )}
                  {selectedInstallation.customer_address && (
                    <div className="col-span-2">
                      <p className="text-slate-600">Indirizzo</p>
                      <p className="font-medium text-slate-900">{selectedInstallation.customer_address}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-600">Data Installazione</p>
                    <p className="font-medium text-slate-900">
                      {new Date(selectedInstallation.installation_date).toLocaleDateString('it-IT')}
                    </p>
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
                      <p className="font-bold text-teal-600">{serial.product?.points || 0} pt</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedInstallation.photo_urls.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="font-semibold text-slate-900 mb-3">
                    Foto Installazione ({selectedInstallation.photo_urls.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedInstallation.photo_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={getPhotoUrl(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-video rounded-lg overflow-hidden border-2 border-slate-200 hover:border-teal-500 transition-all"
                      >
                        <img
                          src={getPhotoUrl(url)}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {filter === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(selectedInstallation)}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {processing ? 'Approvazione...' : 'Approva Installazione'}
                  </div>
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center justify-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Rifiuta Installazione
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showRejectModal && selectedInstallation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowRejectModal(false);
            setRejectReason('');
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Rifiuta Installazione</h3>
            </div>

            <p className="text-slate-600 mb-4">
              Inserisci il motivo per cui rifiuti questa installazione. Il messaggio sarà visibile all'installatore.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Es: Le foto fornite non sono sufficienti per verificare l'installazione..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing}
                className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Rifiuto...' : 'Conferma Rifiuto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
