import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import InstallerLayout from '../../components/installer/InstallerLayout';
import Button from '../../components/shared/Button';
import type { Lead, LeadStatus } from '../../types';
import { Phone, Mail, ArrowRight, Sparkles, Clock, CheckCircle, XCircle, Lock, ChevronDown, User } from 'lucide-react';
import WallboxSerialModal from '../../components/installer/WallboxSerialModal';

const PIPELINE_STAGES: { status: LeadStatus; label: string; bgColor: string; borderColor: string; iconBg: string; icon: any }[] = [
  {
    status: 'Nuova',
    label: 'Nuove',
    bgColor: 'bg-daze-blue-light',
    borderColor: 'border-daze-blue/20',
    iconBg: 'bg-daze-blue',
    icon: Sparkles,
  },
  {
    status: 'In lavorazione',
    label: 'In Lavorazione',
    bgColor: 'bg-daze-honey/10',
    borderColor: 'border-daze-honey/20',
    iconBg: 'bg-daze-honey',
    icon: Clock,
  },
  {
    status: 'Chiusa Vinta',
    label: 'Chiuse Vinte',
    bgColor: 'bg-daze-forest/10',
    borderColor: 'border-daze-forest/20',
    iconBg: 'bg-daze-forest',
    icon: CheckCircle,
  },
  {
    status: 'Chiusa Persa',
    label: 'Chiuse Perse',
    bgColor: 'bg-daze-salmon/10',
    borderColor: 'border-daze-salmon/20',
    iconBg: 'bg-daze-salmon',
    icon: XCircle,
  },
];

export default function Pipeline() {
  const { installer, loading: authLoading } = useAuth();
  const [leadsByStatus, setLeadsByStatus] = useState<Record<LeadStatus, Lead[]>>({
    'Nuova': [],
    'In lavorazione': [],
    'Chiusa Vinta': [],
    'Chiusa Persa': [],
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [serialModal, setSerialModal] = useState<{ leadId: string; fromStatus: LeadStatus } | null>(null);

  useEffect(() => {
    if (installer) {
      loadLeads();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [installer, authLoading]);

  const loadLeads = async () => {
    if (!installer) return;

    try {
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select('*, leads(*)')
        .eq('installer_id', installer.id);

      if (assignments) {
        const grouped = PIPELINE_STAGES.reduce((acc, stage) => {
          acc[stage.status] = assignments
            .filter(a => a.leads.status === stage.status)
            .map(a => a.leads);
          return acc;
        }, {} as Record<LeadStatus, Lead[]>);

        setLeadsByStatus(grouped);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, currentStatus: LeadStatus, newStatus: LeadStatus) => {
    if (!installer || currentStatus === newStatus) return;

    const isClosed = currentStatus === 'Chiusa Vinta' || currentStatus === 'Chiusa Persa';
    if (isClosed) {
      alert('Le lead chiuse non possono essere modificate');
      return;
    }

    // Se si sposta su "Chiusa Vinta", apri la modale seriali
    if (newStatus === 'Chiusa Vinta') {
      setSerialModal({ leadId, fromStatus: currentStatus });
      return;
    }

    await executeStatusUpdate(leadId, currentStatus, newStatus);
  };

  const executeStatusUpdate = async (leadId: string, currentStatus: LeadStatus, newStatus: LeadStatus) => {
    if (!installer) return;

    setUpdating(leadId);

    try {
      const { error: updateError } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('lead_status_history')
        .insert({
          lead_id: leadId,
          installer_id: installer.id,
          old_status: currentStatus,
          new_status: newStatus,
        });

      if (historyError) throw historyError;

      await loadLeads();
    } catch (error) {
      console.error('Error updating lead status:', error);
      alert('Errore durante l\'aggiornamento dello stato. Riprova.');
    } finally {
      setUpdating(null);
    }
  };

  const handleSerialModalSave = async () => {
    if (!serialModal) return;
    // I seriali sono stati salvati, ora aggiorna lo stato a "Chiusa Vinta"
    await executeStatusUpdate(serialModal.leadId, serialModal.fromStatus, 'Chiusa Vinta');
    setSerialModal(null);
  };

  const handleSerialModalClose = () => {
    // Annullato: ricarica le lead per ripristinare la posizione originale
    setSerialModal(null);
    loadLeads();
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceStatus = source.droppableId as LeadStatus;
    const destStatus = destination.droppableId as LeadStatus;
    const leadId = draggableId;

    const isClosed = sourceStatus === 'Chiusa Vinta' || sourceStatus === 'Chiusa Persa';
    if (isClosed) return;

    const sourceLead = leadsByStatus[sourceStatus].find(l => l.id === leadId);
    if (!sourceLead) return;

    const newLeadsByStatus = { ...leadsByStatus };
    newLeadsByStatus[sourceStatus] = newLeadsByStatus[sourceStatus].filter(l => l.id !== leadId);
    const updatedLead = { ...sourceLead, status: destStatus };
    newLeadsByStatus[destStatus] = [...newLeadsByStatus[destStatus]];
    newLeadsByStatus[destStatus].splice(destination.index, 0, updatedLead);
    setLeadsByStatus(newLeadsByStatus);

    await updateLeadStatus(leadId, sourceStatus, destStatus);
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
      <div className="mb-8">
        <h1 className="text-3xl font-roobert font-bold text-daze-black mb-2">Pipeline Lead</h1>
        <p className="text-daze-black/70 font-inter">Trascina le card per aggiornare lo stato delle tue lead</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-6 -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="inline-flex lg:grid lg:grid-cols-2 xl:grid-cols-4 gap-6 min-w-full lg:min-w-0">
            {PIPELINE_STAGES.map((stage) => {
              const Icon = stage.icon;
              return (
                <div key={stage.status} className="flex flex-col w-80 lg:w-auto flex-shrink-0">
                  {/* Stage header */}
                  <div className={`${stage.bgColor} border ${stage.borderColor} rounded-squircle p-4 mb-4`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 ${stage.iconBg} rounded-xl`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-roobert font-bold text-lg text-daze-black">{stage.label}</h3>
                    </div>
                    <p className="text-sm text-daze-black/70 font-inter font-medium">
                      {leadsByStatus[stage.status].length} lead
                    </p>
                  </div>

                  {/* Droppable zone */}
                  <Droppable droppableId={stage.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-4 flex-1 min-h-[200px] rounded-squircle transition-all ${
                          snapshot.isDraggingOver ? 'bg-daze-blue-light/30 ring-2 ring-daze-blue/30 ring-offset-2' : ''
                        }`}
                      >
                        {leadsByStatus[stage.status].map((lead, index) => {
                          const isClosed = lead.status === 'Chiusa Vinta' || lead.status === 'Chiusa Persa';

                          return (
                            <Draggable
                              key={lead.id}
                              draggableId={lead.id}
                              index={index}
                              isDragDisabled={isClosed}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white rounded-squircle border border-daze-gray p-4 transition-all ${
                                    snapshot.isDragging
                                      ? 'rotate-2 scale-105 border-daze-blue'
                                      : ''
                                  } ${isClosed ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                                >
                                  <div className={isClosed ? 'opacity-60' : ''}>
                                  {/* Closed banner */}
                                  {isClosed && (
                                    <div className="flex items-center gap-2 mb-3 text-xs font-inter font-medium text-daze-black bg-daze-gray rounded-lg px-3 py-1.5">
                                      <Lock className="w-3 h-3 text-daze-black" />
                                      <span>Lead chiusa — non modificabile</span>
                                    </div>
                                  )}

                                  {/* Nome — protagonista */}
                                  <Link to={`/installer/leads/${lead.id}`}>
                                    <div className="flex items-center gap-2 mb-3 -ml-[1px] hover:text-daze-blue transition-colors">
                                      <User className="w-[18px] h-[18px] text-daze-black flex-shrink-0" />
                                      <h4 className="font-roobert font-bold text-daze-black text-base">
                                        {lead.first_name} {lead.last_name}
                                      </h4>
                                    </div>
                                  </Link>

                                  {/* Contatti — semplici, senza box */}
                                  <div className="space-y-2 mb-4">
                                    {lead.phone && (
                                      <div className="flex items-center gap-2 text-sm font-inter font-medium text-daze-black">
                                        <Phone className="w-4 h-4 flex-shrink-0 text-daze-black" />
                                        <a href={`tel:${lead.phone}`} className="hover:text-daze-blue transition-colors truncate">
                                          {lead.phone}
                                        </a>
                                      </div>
                                    )}
                                    {lead.email && (
                                      <div className="flex items-center gap-2 text-sm font-inter font-medium text-daze-black">
                                        <Mail className="w-4 h-4 flex-shrink-0 text-daze-black" />
                                        <span className="truncate">{lead.email}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Dropdown stato — DS pill */}
                                  <div className="relative mb-3">
                                    <select
                                      value={lead.status}
                                      onChange={(e) => updateLeadStatus(lead.id, lead.status, e.target.value as LeadStatus)}
                                      disabled={isClosed || updating === lead.id}
                                      className={`w-full text-sm pl-4 pr-10 py-2.5 border border-daze-gray rounded-pill bg-white appearance-none transition-all font-roobert font-medium text-daze-black ${
                                        isClosed
                                          ? 'opacity-50 cursor-not-allowed'
                                          : 'hover:border-daze-black/30 focus:border-daze-blue focus:ring-1 focus:ring-daze-blue/30 focus:outline-none cursor-pointer'
                                      } ${updating === lead.id ? 'opacity-50' : ''}`}
                                    >
                                      {PIPELINE_STAGES.map((s) => (
                                        <option key={s.status} value={s.status}>
                                          {s.label}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-daze-black/40 pointer-events-none" />
                                  </div>
                                  </div>

                                  {/* Bottone Visualizza Dettagli */}
                                  <Link to={`/installer/leads/${lead.id}`}>
                                    <Button variant="secondary" size="sm" fullWidth icon={<ArrowRight className="w-5 h-5" />}>
                                      Visualizza Dettagli
                                    </Button>
                                  </Link>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}

                        {/* Empty state */}
                        {leadsByStatus[stage.status].length === 0 && (
                          <div className="bg-daze-gray/20 rounded-squircle border-2 border-dashed border-daze-gray p-6 text-center">
                            <Icon className="w-8 h-8 text-daze-black/30 mx-auto mb-2" />
                            <p className="text-sm font-inter font-medium text-daze-black/40">Nessuna lead</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>
      </div>

      {serialModal && installer && (
        <WallboxSerialModal
          leadId={serialModal.leadId}
          installerId={installer.id}
          onClose={handleSerialModalClose}
          onSave={handleSerialModalSave}
        />
      )}
    </InstallerLayout>
  );
}
