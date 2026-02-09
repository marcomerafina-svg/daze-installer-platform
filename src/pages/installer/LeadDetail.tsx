import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import InstallerLayout from '../../components/installer/InstallerLayout';
import type { Lead, LeadNote, LeadStatusHistory, LeadStatus, LeadAssignment, WallboxSerial } from '../../types';
import { Phone, Mail, MapPin, ArrowLeft, Clock, MessageSquare, Save, Upload, FileText, Download, X as XIcon, CheckCircle, Package } from 'lucide-react';
import WallboxSerialModal from '../../components/installer/WallboxSerialModal';
import Button from '../../components/shared/Button';

const PIPELINE_STAGES: LeadStatus[] = [
  'Nuova',
  'In lavorazione',
  'Chiusa Vinta',
  'Chiusa Persa',
];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { installer, loading: authLoading } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [assignment, setAssignment] = useState<LeadAssignment | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [history, setHistory] = useState<LeadStatusHistory[]>([]);
  const [serials, setSerials] = useState<WallboxSerial[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);

  useEffect(() => {
    if (id && installer) {
      loadLeadData();
      markAsViewed();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [id, installer, authLoading]);

  const loadLeadData = async () => {
    if (!id || !installer) return;

    try {
      const [leadRes, assignmentRes, notesRes, historyRes, serialsRes] = await Promise.all([
        supabase.from('leads').select('*').eq('id', id).maybeSingle(),
        supabase.from('lead_assignments').select('*').eq('lead_id', id).eq('installer_id', installer.id).maybeSingle(),
        supabase.from('lead_notes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
        supabase
          .from('lead_status_history')
          .select('*')
          .eq('lead_id', id)
          .order('changed_at', { ascending: false }),
        supabase
          .from('wallbox_serials')
          .select('id, serial_code, product_id, installer_id, lead_id, source_type, created_at, product:products(id, name, points)')
          .eq('lead_id', id)
          .order('created_at', { ascending: true }),
      ]);

      if (leadRes.data) setLead(leadRes.data);
      if (assignmentRes.data) setAssignment(assignmentRes.data);
      if (notesRes.data) setNotes(notesRes.data);
      if (historyRes.data) setHistory(historyRes.data);
      if (serialsRes.data) setSerials(serialsRes.data);
    } catch (error) {
      console.error('Error loading lead data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async () => {
    if (!id || !installer) return;

    await supabase
      .from('lead_assignments')
      .update({ is_viewed: true, viewed_at: new Date().toISOString() })
      .eq('lead_id', id)
      .eq('installer_id', installer.id);
  };

  const updateLeadStatus = async (newStatus: LeadStatus) => {
    if (!id || !installer || !lead) return;

    if (newStatus === 'Chiusa Vinta' && serials.length === 0) {
      setPendingStatus(newStatus);
      setShowSerialModal(true);
      return;
    }

    try {
      await supabase.from('leads').update({ status: newStatus }).eq('id', id);

      await supabase.from('lead_status_history').insert({
        lead_id: id,
        installer_id: installer.id,
        old_status: lead.status,
        new_status: newStatus,
      });

      if (newStatus === 'Chiusa Vinta' || newStatus === 'Chiusa Persa') {
        try {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-lead-closure-notification`;
          await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              leadId: id,
              installerName: `${installer.first_name} ${installer.last_name}`,
              installerEmail: installer.email,
              leadName: `${lead.first_name} ${lead.last_name}`,
              leadPhone: lead.phone,
              leadEmail: lead.email,
              leadAddress: lead.address,
              closureStatus: newStatus,
              wallboxSerial: serials.map(s => s.serial_code).join(', '),
              closedAt: new Date().toISOString(),
            }),
          });
        } catch (emailError) {
          console.error('Error sending closure email:', emailError);
        }
      }

      await loadLeadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSerialSaved = async () => {
    setShowSerialModal(false);
    if (pendingStatus) {
      await loadLeadData();
      if (id && installer && lead) {
        try {
          await supabase.from('leads').update({ status: pendingStatus }).eq('id', id);

          await supabase.from('lead_status_history').insert({
            lead_id: id,
            installer_id: installer.id,
            old_status: lead.status,
            new_status: pendingStatus,
          });

          if (pendingStatus === 'Chiusa Vinta' || pendingStatus === 'Chiusa Persa') {
            const updatedSerials = await supabase
              .from('wallbox_serials')
              .select('serial_code')
              .eq('lead_id', id);

            try {
              const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-lead-closure-notification`;
              await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  leadId: id,
                  installerName: `${installer.first_name} ${installer.last_name}`,
                  installerEmail: installer.email,
                  leadName: `${lead.first_name} ${lead.last_name}`,
                  leadPhone: lead.phone,
                  leadEmail: lead.email,
                  leadAddress: lead.address,
                  closureStatus: pendingStatus,
                  wallboxSerial: updatedSerials.data?.map(s => s.serial_code).join(', ') || '',
                  closedAt: new Date().toISOString(),
                }),
              });
            } catch (emailError) {
              console.error('Error sending closure email:', emailError);
            }
          }

          await loadLeadData();
        } catch (error) {
          console.error('Error updating status:', error);
        }
      }
      setPendingStatus(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !id) return;

    const file = event.target.files[0];

    if (file.type !== 'application/pdf') {
      alert('Solo file PDF sono accettati');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Il file non può superare i 10MB');
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `${id}/${fileName}`;

      console.log('Inizio upload PDF:', { fileName, filePath, fileSize: file.size });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lead-quotes')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Errore upload storage:', uploadError);
        throw new Error(`Errore storage: ${uploadError.message}`);
      }

      console.log('Upload completato:', uploadData);

      const { data: urlData } = supabase.storage
        .from('lead-quotes')
        .getPublicUrl(filePath);

      console.log('URL pubblico generato:', urlData.publicUrl);

      const { error: updateError } = await supabase
        .from('leads')
        .update({ quote_pdf_url: urlData.publicUrl })
        .eq('id', id);

      if (updateError) {
        console.error('Errore aggiornamento database:', updateError);
        throw new Error(`Errore database: ${updateError.message}`);
      }

      console.log('Preventivo caricato con successo!');
      alert('Preventivo caricato con successo!');
      await loadLeadData();
    } catch (error: any) {
      console.error('Errore durante il caricamento:', error);
      const errorMessage = error?.message || 'Errore sconosciuto durante il caricamento del file';
      alert(`Errore: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePDF = async () => {
    if (!id || !lead?.quote_pdf_url) return;

    if (!confirm('Sei sicuro di voler eliminare il preventivo?')) return;

    try {
      const pathParts = lead.quote_pdf_url.split('/lead-quotes/');
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await supabase.storage.from('lead-quotes').remove([filePath]);
      }

      await supabase.from('leads').update({ quote_pdf_url: null }).eq('id', id);

      await loadLeadData();
    } catch (error) {
      console.error('Error deleting PDF:', error);
      alert('Errore durante l\'eliminazione del file');
    }
  };

  const handleConfirmContact = async () => {
    if (!id || !installer || !lead || !assignment) return;

    setConfirming(true);
    try {
      const confirmedAt = new Date().toISOString();

      await supabase
        .from('lead_assignments')
        .update({
          confirmed_by_installer: true,
          confirmed_at: confirmedAt,
        })
        .eq('id', assignment.id);

      await supabase.from('leads').update({ status: 'In lavorazione' }).eq('id', id);

      await supabase.from('lead_status_history').insert({
        lead_id: id,
        installer_id: installer.id,
        old_status: lead.status,
        new_status: 'In lavorazione',
      });

      // Send confirmation notification email
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-lead-confirmation-notification`;
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assignmentId: assignment.id,
            installerName: `${installer.first_name} ${installer.last_name}`,
            installerEmail: installer.email,
            leadName: `${lead.first_name} ${lead.last_name}`,
            leadPhone: lead.phone,
            leadEmail: lead.email,
            leadAddress: lead.address,
            confirmedAt: confirmedAt,
          }),
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't block the user if email fails
      }

      await loadLeadData();
    } catch (error) {
      console.error('Error confirming contact:', error);
      alert('Errore durante la conferma. Riprova.');
    } finally {
      setConfirming(false);
    }
  };

  const addNote = async () => {
    if (!id || !installer || !newNote.trim()) return;

    setSaving(true);
    try {
      await supabase.from('lead_notes').insert({
        lead_id: id,
        installer_id: installer.id,
        note_text: newNote,
      });

      setNewNote('');
      await loadLeadData();
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <InstallerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4a5fc1]"></div>
        </div>
      </InstallerLayout>
    );
  }

  if (!lead) {
    return (
      <InstallerLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Lead non trovata</p>
        </div>
      </InstallerLayout>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Nuova': 'bg-blue-100 text-blue-800',
      'In lavorazione': 'bg-yellow-100 text-yellow-800',
      'Chiusa Vinta': 'bg-green-100 text-green-800',
      'Chiusa Persa': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <InstallerLayout>
      <Button
        variant="ghost"
        size="sm"
        icon={<ArrowLeft className="w-4 h-4" />}
        iconPosition="left"
        onClick={() => navigate(-1)}
        className="mb-4 sm:mb-6"
      >
        Indietro
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {lead.status === 'Nuova' && assignment && !assignment.confirmed_by_installer && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 border-2 border-blue-300 shadow-md">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="bg-blue-500 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-blue-900 mb-2">
                    Conferma Presa in Carico
                  </h3>
                  <p className="text-sm sm:text-base font-inter text-blue-700 mb-4">
                    Hai contattato questa lead? Conferma per far sapere all'admin che hai preso in carico la richiesta.
                    Lo stato passerà automaticamente a "In lavorazione".
                  </p>
                  <Button
                    variant="primaryBlack"
                    size="sm"
                    icon={<CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                    onClick={handleConfirmContact}
                    disabled={confirming}
                    fullWidth
                    className="sm:w-auto"
                  >
                    {confirming ? 'Conferma in corso...' : 'Conferma di aver contattato la lead'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {assignment?.confirmed_by_installer && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-300">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-green-900 font-semibold">Lead confermata</p>
                  <p className="text-sm text-green-700">
                    Hai confermato di aver contattato questa lead il {new Date(assignment.confirmed_at!).toLocaleString('it-IT')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {lead.first_name} {lead.last_name}
                </h1>
                <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 font-inter">
              <div className="flex items-start gap-2 sm:gap-3">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Telefono</p>
                  <a href={`tel:${lead.phone}`} className="text-base sm:text-lg font-medium text-[#4a5fc1] hover:text-[#223aa3] break-all">
                    {lead.phone}
                  </a>
                </div>
              </div>

              {lead.email && (
                <div className="flex items-start gap-2 sm:gap-3">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Email</p>
                    <a href={`mailto:${lead.email}`} className="text-base sm:text-lg font-medium text-[#4a5fc1] hover:text-[#223aa3] break-all">
                      {lead.email}
                    </a>
                  </div>
                </div>
              )}

              {lead.address && (
                <div className="flex items-start gap-2 sm:gap-3">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Indirizzo</p>
                    <p className="text-base sm:text-lg font-medium text-gray-900 break-words">{lead.address}</p>
                  </div>
                </div>
              )}

              {lead.description && (
                <div className="pt-3 sm:pt-4 border-t border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-500 mb-2">Descrizione</p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{lead.description}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              Preventivo
            </h2>

            {lead.quote_pdf_url ? (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500 p-2 rounded-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Preventivo caricato</p>
                      <p className="text-sm text-gray-600">File PDF disponibile</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDeletePDF}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                    title="Elimina preventivo"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <a
                    href={lead.quote_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#223aa3] to-[#4a5fc1] text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Visualizza PDF
                  </a>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-inter font-medium mb-2">Carica il preventivo</p>
                <p className="text-sm font-inter text-gray-500 mb-4">
                  File PDF fino a 10MB (opzionale)
                </p>
                <label className="inline-flex items-center gap-2 bg-gradient-to-r from-[#223aa3] to-[#4a5fc1] text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Caricamento...' : 'Scegli File PDF'}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {serials.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Prodotti Installati ({serials.length})
              </h2>
              <div className="grid gap-3">
                {serials.map((serial) => (
                  <div key={serial.id} className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-blue-900 text-lg mb-1">
                          {serial.product?.name || 'Prodotto sconosciuto'}
                        </p>
                        <p className="text-sm text-blue-700 font-mono mb-2">
                          {serial.serial_code}
                        </p>
                        <div className="flex gap-4 text-xs text-blue-600">
                          {serial.year && <span>Anno: {serial.year}</span>}
                          {serial.production_number && <span>Prog: {serial.production_number}</span>}
                        </div>
                      </div>
                      <div className="bg-blue-500 p-2 rounded-lg">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Note
            </h2>

            <div className="mb-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Aggiungi una nota..."
                rows={3}
                className="w-full px-4 py-3 font-inter border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a5fc1] focus:border-transparent resize-none"
              />
              <Button
                variant="primaryBlack"
                size="sm"
                icon={<Save className="w-4 h-4" />}
                onClick={addNote}
                disabled={!newNote.trim() || saving}
                className="mt-2"
              >
                {saving ? 'Salvataggio...' : 'Salva Nota'}
              </Button>
            </div>

            <div className="space-y-3">
              {notes.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Nessuna nota</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-4 font-inter">
                    <p className="text-gray-700 mb-2">{note.note_text}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(note.created_at).toLocaleString('it-IT')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Cambia Stato</h2>
            <div className="space-y-2">
              {PIPELINE_STAGES.map((status) => (
                <button
                  key={status}
                  onClick={() => updateLeadStatus(status)}
                  disabled={lead.status === status}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium text-left transition-all ${
                    lead.status === status
                      ? 'bg-[#223aa3] text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              Storico
            </h2>
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-gray-500 text-xs sm:text-sm text-center py-4">Nessuno storico</p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="border-l-2 border-[#4a5fc1] pl-3 py-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                      {h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(h.changed_at).toLocaleString('it-IT')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showSerialModal && id && installer && (
        <WallboxSerialModal
          leadId={id}
          installerId={installer.id}
          onClose={() => {
            setShowSerialModal(false);
            setPendingStatus(null);
          }}
          onSave={handleSerialSaved}
        />
      )}
    </InstallerLayout>
  );
}
