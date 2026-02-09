import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { CheckCircle, XCircle, Clock, Package, User, Calendar, Phone, MapPin, Image as ImageIcon, AlertCircle, X } from 'lucide-react';
import type { WallboxSerial, Installer } from '../../types';
import Button from '../../components/shared/Button';

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
      // Debug: Check current session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', {
        userId: session?.user?.id,
        email: session?.user?.email,
        role: session?.user?.app_metadata?.role || session?.user?.user_metadata?.role
      });

      const { data: serials, error: serialsError } = await supabase
        .from('wallbox_serials')
        .select(`
          id,
          serial_code,
          product_id,
          installer_id,
          source_type,
          approval_status,
          approved_at,
          approved_by,
          rejection_reason,
          customer_first_name,
          customer_last_name,
          customer_phone,
          customer_email,
          customer_address,
          installation_date,
          photo_urls,
          created_at
        `)
        .eq('source_type', 'self_reported')
        .eq('approval_status', filter)
        .order('created_at', { ascending: false });

      if (serialsError) {
        console.error('Supabase serials error:', serialsError);
        throw serialsError;
      }

      console.log('Loaded serials:', serials?.length || 0, 'records');
      console.log('Filter:', filter);

      if (!serials || serials.length === 0) {
        setInstallations([]);
        return;
      }

      const installerIds = [...new Set(serials.map(s => s.installer_id).filter(Boolean))];
      const productIds = [...new Set(serials.map(s => s.product_id).filter(Boolean))];

      console.log('Installer IDs:', installerIds);
      console.log('Product IDs:', productIds);

      const [{ data: installers, error: installersError }, { data: products, error: productsError }] = await Promise.all([
        supabase.from('installers').select('*').in('id', installerIds),
        supabase.from('products').select('*').in('id', productIds),
      ]);

      if (installersError) console.error('Installers error:', installersError);
      if (productsError) console.error('Products error:', productsError);

      console.log('Loaded installers:', installers?.length || 0);
      console.log('Loaded products:', products?.length || 0);

      const installerMap = new Map(installers?.map(i => [i.id, i]) || []);
      const productMap = new Map(products?.map(p => [p.id, p]) || []);

      const groupedMap = new Map<string, PendingInstallation>();

      serials.forEach((serial, index) => {
        const groupKey = `${serial.installer_id}_${serial.customer_phone}_${serial.installation_date}`;

        if (!groupedMap.has(groupKey)) {
          const installer = installerMap.get(serial.installer_id);
          if (!installer) {
            console.warn(`Serial ${index}: Installer not found for ID ${serial.installer_id}`);
            return;
          }

          console.log(`Creating group for serial ${index}:`, {
            groupKey,
            installer: installer.first_name + ' ' + installer.last_name,
            customer: `${serial.customer_first_name} ${serial.customer_last_name}`,
            hasPhotos: serial.photo_urls ? 'yes' : 'no'
          });

          groupedMap.set(groupKey, {
            id: groupKey,
            installer: installer as Installer,
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
        const product = productMap.get(serial.product_id);
        group.serials.push({ ...serial, product } as WallboxSerial);
        if (product) {
          group.total_points += product.points;
        }
      });

      const installations = Array.from(groupedMap.values());
      console.log('Grouped installations:', installations.length);
      console.log('Installations:', installations);
      setInstallations(installations);
    } catch (error) {
      console.error('Error loading installations:', error);
      alert('Errore nel caricamento delle installazioni. Verifica la console per dettagli.');
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
          <p className="text-slate-600 font-inter">Gestisci le installazioni autonome degli installatori</p>
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
              <p className="text-sm font-inter text-amber-800">
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
                    <div className="flex items-center gap-2 text-sm font-inter text-slate-600 mb-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">
                        {installation.installer.first_name} {installation.installer.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-inter text-slate-600">
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
                  <div className="text-right font-inter">
                    <p className="text-sm text-slate-600 mb-1">Punti</p>
                    <p className="text-2xl font-bold text-teal-600">{installation.total_points}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-inter text-slate-600 mb-2">Prodotti Installati ({installation.serials.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {installation.serials.map((serial, idx) => (
                      <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                        {serial.product?.name || 'Sconosciuto'} - {serial.serial_code}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedInstallation(installation)}
                    fullWidth
                  >
                    Visualizza Dettagli
                  </Button>
                  {filter === 'pending' && (
                    <>
                      <Button
                        variant="primaryBlack"
                        size="sm"
                        icon={<CheckCircle className="w-4 h-4" />}
                        onClick={() => handleApprove(installation)}
                        disabled={processing}
                      >
                        Approva
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        icon={<XCircle className="w-4 h-4" />}
                        onClick={() => {
                          setSelectedInstallation(installation);
                          setShowRejectModal(true);
                        }}
                        disabled={processing}
                      >
                        Rifiuta
                      </Button>
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
                <p className="text-slate-600 font-inter">
                  Installatore: {selectedInstallation.installer.first_name} {selectedInstallation.installer.last_name}
                </p>
              </div>
              <Button variant="icon" onClick={() => setSelectedInstallation(null)}>
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Informazioni Cliente</h3>
                <div className="grid grid-cols-2 gap-4 text-sm font-inter">
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
                <Button
                  variant="primaryBlack"
                  size="md"
                  icon={<CheckCircle className="w-5 h-5" />}
                  onClick={() => handleApprove(selectedInstallation)}
                  disabled={processing}
                  fullWidth
                >
                  {processing ? 'Approvazione...' : 'Approva Installazione'}
                </Button>
                <Button
                  variant="destructive"
                  size="md"
                  icon={<XCircle className="w-5 h-5" />}
                  onClick={() => setShowRejectModal(true)}
                  disabled={processing}
                  fullWidth
                >
                  Rifiuta Installazione
                </Button>
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

            <p className="text-slate-600 font-inter mb-4">
              Inserisci il motivo per cui rifiuti questa installazione. Il messaggio sarà visibile all'installatore.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Es: Le foto fornite non sono sufficienti per verificare l'installazione..."
              rows={4}
              className="w-full px-4 py-3 font-inter border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent mb-4"
            />

            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                fullWidth
              >
                Annulla
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing}
                fullWidth
              >
                {processing ? 'Rifiuto...' : 'Conferma Rifiuto'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
