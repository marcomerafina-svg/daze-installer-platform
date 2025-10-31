import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import InstallerLayout from '../../components/installer/InstallerLayout';
import type { Lead, LeadStatus } from '../../types';
import { Phone, Mail, ExternalLink } from 'lucide-react';

const PIPELINE_STAGES: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'Nuova', label: 'Nuova', color: 'bg-sky-light border-sky-dark' },
  { status: 'In lavorazione', label: 'In lavorazione', color: 'bg-honey/30 border-honey' },
  { status: 'Chiusa Vinta', label: 'Chiusa Vinta', color: 'bg-forest/30 border-forest' },
  { status: 'Chiusa Persa', label: 'Chiusa Persa', color: 'bg-salmon/30 border-salmon' },
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
    if (!installer) return;

    try {
      await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);

      await supabase.from('lead_status_history').insert({
        lead_id: leadId,
        installer_id: installer.id,
        old_status: currentStatus,
        new_status: newStatus,
      });

      await loadLeads();
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  if (loading) {
    return (
      <InstallerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-reflex-blue"></div>
        </div>
      </InstallerLayout>
    );
  }

  return (
    <InstallerLayout>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Pipeline Lead</h1>
        <p className="text-sm sm:text-base text-black/70">Gestisci lo stato delle tue lead</p>
      </div>

      <div className="overflow-x-auto pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="inline-flex lg:grid lg:grid-cols-2 xl:grid-cols-4 gap-4 min-w-full lg:min-w-0">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.status} className="flex flex-col w-64 lg:w-auto flex-shrink-0">
              <div className={`${stage.color} border-2 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4`}>
                <h3 className="font-bold text-black text-sm sm:text-base mb-1">{stage.label}</h3>
                <p className="text-xs sm:text-sm text-black/70">{leadsByStatus[stage.status].length} lead</p>
              </div>

              <div className="space-y-3 flex-1">
                {leadsByStatus[stage.status].map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-white rounded-lg border border-cool-gray-300 p-3 sm:p-4 hover:shadow-lg transition-all"
                  >
                    <Link to={`/installer/leads/${lead.id}`}>
                      <h4 className="font-semibold text-black text-sm sm:text-base mb-2 hover:text-reflex-blue">
                        {lead.first_name} {lead.last_name}
                      </h4>
                    </Link>

                    <div className="space-y-1 mb-3">
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-xs text-black/70">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <a href={`tel:${lead.phone}`} className="hover:text-reflex-blue truncate">
                            {lead.phone}
                          </a>
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center gap-2 text-xs text-black/70">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                    </div>

                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, lead.status, e.target.value as LeadStatus)}
                      className="w-full text-xs px-2 py-1.5 border border-cool-gray-400 rounded bg-white hover:bg-cool-gray-100 transition-all cursor-pointer mb-2"
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s.status} value={s.status}>
                          {s.label}
                        </option>
                      ))}
                    </select>

                    <Link
                      to={`/installer/leads/${lead.id}`}
                      className="flex items-center justify-center gap-1 text-xs text-reflex-blue-600 hover:text-reflex-blue font-medium"
                    >
                      Dettagli
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ))}

                {leadsByStatus[stage.status].length === 0 && (
                  <div className="bg-cool-gray-100 rounded-lg border-2 border-dashed border-cool-gray-300 p-3 sm:p-4 text-center">
                    <p className="text-xs text-black/40">Nessuna lead</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </InstallerLayout>
  );
}
