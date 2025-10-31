import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import InstallerLayout from '../../components/installer/InstallerLayout';
import type { Lead, LeadAssignment } from '../../types';
import { Phone, Mail, MapPin, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';

interface LeadWithAssignment extends Lead {
  assignment: LeadAssignment;
}

export default function InstallerDashboard() {
  const { installer } = useAuth();
  const [newLeads, setNewLeads] = useState<LeadWithAssignment[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, won: 0, conversionRate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (installer) {
      loadData();
    }
  }, [installer]);

  const loadData = async () => {
    if (!installer) return;

    try {
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select('*, leads(*)')
        .eq('installer_id', installer.id);

      if (assignments) {
        const leadsWithAssignment = assignments.map(a => ({
          ...a.leads,
          assignment: a,
        })) as LeadWithAssignment[];

        const newLeadsFiltered = leadsWithAssignment.filter(l => l.status === 'Nuova');
        const activeLeadsCount = leadsWithAssignment.filter(
          l => !['Chiusa Vinta', 'Chiusa Persa'].includes(l.status)
        ).length;
        const wonLeadsCount = leadsWithAssignment.filter(l => l.status === 'Chiusa Vinta').length;
        const conversionRate = leadsWithAssignment.length > 0
          ? Math.round((wonLeadsCount / leadsWithAssignment.length) * 100)
          : 0;

        setNewLeads(newLeadsFiltered);
        setStats({
          total: leadsWithAssignment.length,
          active: activeLeadsCount,
          won: wonLeadsCount,
          conversionRate,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (assignmentId: string) => {
    await supabase
      .from('lead_assignments')
      .update({ is_viewed: true, viewed_at: new Date().toISOString() })
      .eq('id', assignmentId);
    loadData();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Nuova': 'bg-sky/30 text-reflex-blue-800',
      'In lavorazione': 'bg-honey/30 text-honey-dark',
      'Chiusa Vinta': 'bg-forest/30 text-forest-dark',
      'Chiusa Persa': 'bg-salmon/30 text-salmon-dark',
    };
    return colors[status] || 'bg-cool-gray-200 text-black';
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Benvenuto, {installer?.first_name}!
        </h1>
        <p className="text-sm sm:text-base text-gray-600">Ecco le tue lead più recenti</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-cool-gray-300 p-4 sm:p-6">
          <h3 className="text-black/70 text-xs sm:text-sm font-medium mb-2">Lead Totali</h3>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-cool-gray rounded-lg flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold text-black">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-cool-gray-300 p-4 sm:p-6">
          <h3 className="text-black/70 text-xs sm:text-sm font-medium mb-2">Lead Attive</h3>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky/40 rounded-lg flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold text-reflex-blue-900">{stats.active}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-cool-gray-300 p-4 sm:p-6">
          <h3 className="text-black/70 text-xs sm:text-sm font-medium mb-2">Lead Vinte</h3>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-forest/40 rounded-lg flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold text-forest-dark">{stats.won}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-cool-gray-300 p-4 sm:p-6">
          <h3 className="text-black/70 text-xs sm:text-sm font-medium mb-2">Conversion</h3>
          <div className="w-10 h-8 sm:w-14 sm:h-10 bg-honey/40 rounded-lg flex items-center justify-center">
            <span className="text-lg sm:text-xl font-bold text-honey-dark">{stats.conversionRate}%</span>
          </div>
        </div>
      </div>

      {newLeads.some(lead => !lead.assignment.confirmed_by_installer) && (
        <div className="bg-gradient-to-br from-salmon-light to-salmon/40 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-salmon shadow-md">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="bg-salmon p-2 sm:p-3 rounded-lg animate-pulse shadow-lg flex-shrink-0">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-black mb-1 sm:mb-2">
                ⚠️ Lead da Confermare
              </h2>
              <p className="text-black/80 text-xs sm:text-sm">
                Hai {newLeads.filter(l => !l.assignment.confirmed_by_installer).length} lead in attesa di conferma.
                Clicca su "Visualizza Dettagli" e conferma di aver contattato il cliente.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-sky-light to-sky/50 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-sky-dark shadow-md">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-reflex-blue to-reflex-blue-700 p-2 sm:p-3 rounded-lg shadow-lg flex-shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-1 sm:mb-2">
              Nuove Lead ({newLeads.length})
            </h2>
            <p className="text-black/80 text-xs sm:text-sm">
              {newLeads.length === 0
                ? 'Al momento non hai nuove lead da gestire.'
                : `Hai ${newLeads.length} nuov${newLeads.length === 1 ? 'a' : 'e'} lead in attesa!`}
            </p>
          </div>
        </div>
      </div>

      {newLeads.length > 0 && (
        <div className="grid gap-3 sm:gap-4">
          {newLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-xl shadow-sm border-2 border-sky-dark p-4 sm:p-6 hover:shadow-lg hover:border-reflex-blue transition-all relative"
            >
              <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex flex-col sm:flex-row gap-1 sm:gap-2">
                {!lead.assignment.is_viewed && (
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-salmon text-white animate-pulse shadow-md">
                    NUOVO
                  </span>
                )}
                {!lead.assignment.confirmed_by_installer && (
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-honey text-white shadow-md">
                    DA CONF.
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between mb-3 sm:mb-4 pr-20 sm:pr-32">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    {lead.first_name} {lead.last_name}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3">
                    {lead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <a href={`tel:${lead.phone}`} className="hover:text-reflex-blue font-medium">
                          {lead.phone}
                        </a>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <a href={`mailto:${lead.email}`} className="hover:text-reflex-blue truncate">
                          {lead.email}
                        </a>
                      </div>
                    )}
                    {lead.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="break-words">{lead.address}</span>
                      </div>
                    )}
                  </div>
                  {lead.description && (
                    <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 rounded-lg p-2 sm:p-3 mb-3">
                      {lead.description}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      Assegnato il {new Date(lead.assignment.assigned_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <Link
                  to={`/installer/leads/${lead.id}`}
                  onClick={() => markAsViewed(lead.assignment.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-reflex-blue to-reflex-blue-600 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:shadow-xl hover:scale-[1.02] transition-all"
                >
                  <span className="hidden sm:inline">Visualizza Dettagli</span>
                  <span className="sm:hidden">Dettagli</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 sm:mt-8 text-center">
        <Link
          to="/installer/pipeline"
          className="inline-flex items-center gap-2 text-sm sm:text-base text-reflex-blue-600 hover:text-reflex-blue font-medium"
        >
          Vai alla Pipeline completa
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </InstallerLayout>
  );
}
