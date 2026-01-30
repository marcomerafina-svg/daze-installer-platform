import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import InstallerLayout from '../../components/installer/InstallerLayout';
import type { Lead, LeadStatus } from '../../types';
import { Phone, Mail, ExternalLink, Sparkles, Clock, CheckCircle, XCircle, Lock } from 'lucide-react';

const PIPELINE_STAGES: { status: LeadStatus; label: string; color: string; icon: any; gradient: string }[] = [
  {
    status: 'Nuova',
    label: 'Nuove',
    color: 'bg-sky-100 border-sky-300 text-sky-900',
    icon: Sparkles,
    gradient: 'from-sky-400 to-sky-500'
  },
  {
    status: 'In lavorazione',
    label: 'In Lavorazione',
    color: 'bg-amber-100 border-amber-300 text-amber-900',
    icon: Clock,
    gradient: 'from-amber-400 to-amber-500'
  },
  {
    status: 'Chiusa Vinta',
    label: 'Chiuse Vinte',
    color: 'bg-emerald-100 border-emerald-300 text-emerald-900',
    icon: CheckCircle,
    gradient: 'from-emerald-400 to-emerald-500'
  },
  {
    status: 'Chiusa Persa',
    label: 'Chiuse Perse',
    color: 'bg-rose-100 border-rose-300 text-rose-900',
    icon: XCircle,
    gradient: 'from-rose-400 to-rose-500'
  },
];

export default function Pipeline() {
  const { installer } = useAuth();
  const [leadsByStatus, setLeadsByStatus] = useState<Record<LeadStatus, Lead[]>>({
    'Nuova': [],
    'In lavorazione': [],
    'Chiusa Vinta': [],
    'Chiusa Persa': [],
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (installer) {
      loadLeads();
    }
  }, [installer]);

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </InstallerLayout>
    );
  }

  return (
    <InstallerLayout>
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Pipeline Lead</h1>
        <p className="text-slate-600">Gestisci lo stato delle tue lead con il board Kanban - Trascina le card per cambiare stato</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-6 -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="inline-flex lg:grid lg:grid-cols-2 xl:grid-cols-4 gap-6 min-w-full lg:min-w-0">
            {PIPELINE_STAGES.map((stage) => {
              const Icon = stage.icon;
              return (
                <div key={stage.status} className="flex flex-col w-80 lg:w-auto flex-shrink-0">
                  <div className={`${stage.color} border-2 rounded-2xl p-4 mb-4 shadow-soft`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 bg-gradient-to-br ${stage.gradient} rounded-xl shadow-sm`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-lg">{stage.label}</h3>
                    </div>
                    <p className="text-sm opacity-80 font-medium">
                      {leadsByStatus[stage.status].length} lead
                    </p>
                  </div>

                  <Droppable droppableId={stage.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-4 flex-1 min-h-[200px] rounded-2xl transition-all ${
                          snapshot.isDraggingOver ? 'bg-slate-100 ring-2 ring-teal-400 ring-offset-2' : ''
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
                                  className={`bg-white rounded-2xl border-2 border-slate-200 p-4 transition-all ${
                                    snapshot.isDragging
                                      ? 'shadow-xl rotate-2 scale-105 border-teal-400'
                                      : 'hover:shadow-medium hover:border-slate-300'
                                  } ${isClosed ? 'opacity-75 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                                >
                                  {isClosed && (
                                    <div className="flex items-center gap-2 mb-2 text-xs text-slate-500 bg-slate-100 rounded-lg px-2 py-1">
                                      <Lock className="w-3 h-3" />
                                      <span>Lead chiusa - non modificabile</span>
                                    </div>
                                  )}

                                  <Link to={`/installer/leads/${lead.id}`}>
                                    <h4 className="font-bold text-slate-900 text-base mb-3 hover:text-teal-600 transition-colors">
                                      {lead.first_name} {lead.last_name}
                                    </h4>
                                  </Link>

                                  <div className="space-y-2 mb-4">
                                    {lead.phone && (
                                      <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                                        <Phone className="w-4 h-4 flex-shrink-0 text-slate-400" />
                                        <a href={`tel:${lead.phone}`} className="hover:text-teal-600 truncate font-medium">
                                          {lead.phone}
                                        </a>
                                      </div>
                                    )}
                                    {lead.email && (
                                      <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                                        <Mail className="w-4 h-4 flex-shrink-0 text-slate-400" />
                                        <span className="truncate">{lead.email}</span>
                                      </div>
                                    )}
                                  </div>

                                  <select
                                    value={lead.status}
                                    onChange={(e) => updateLeadStatus(lead.id, lead.status, e.target.value as LeadStatus)}
                                    disabled={isClosed || updating === lead.id}
                                    className={`w-full text-sm px-3 py-2 border-2 border-slate-200 rounded-xl bg-white transition-all mb-3 font-medium ${
                                      isClosed
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:bg-slate-50 hover:border-teal-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 cursor-pointer'
                                    } ${updating === lead.id ? 'opacity-50' : ''}`}
                                  >
                                    {PIPELINE_STAGES.map((s) => (
                                      <option key={s.status} value={s.status}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>

                                  <Link
                                    to={`/installer/leads/${lead.id}`}
                                    className="flex items-center justify-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-semibold hover:bg-teal-50 rounded-lg py-2 transition-all"
                                  >
                                    Dettagli
                                    <ExternalLink className="w-4 h-4" />
                                  </Link>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}

                        {leadsByStatus[stage.status].length === 0 && (
                          <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center">
                            <Icon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-400 font-medium">Nessuna lead</p>
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
    </InstallerLayout>
  );
}
