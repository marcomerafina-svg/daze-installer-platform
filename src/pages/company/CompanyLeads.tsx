import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import CompanyLayout from '../../components/company/CompanyLayout';
import type { Lead } from '../../types';
import { Phone, Mail, ExternalLink, User, Calendar, MapPin, Package } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'Nuova': 'bg-sky-100 text-sky-800 border-sky-300',
  'In lavorazione': 'bg-amber-100 text-amber-800 border-amber-300',
  'Chiusa Vinta': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Chiusa Persa': 'bg-rose-100 text-rose-800 border-rose-300',
};

export default function CompanyLeads() {
  const { installer } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assigned'>('all');

  useEffect(() => {
    if (installer?.company_id) {
      loadLeads();
    }
  }, [installer, filter]);

  const loadLeads = async () => {
    if (!installer?.company_id) return;

    setLoading(true);
    try {
      // Prima otteniamo tutti gli installatori della company
      const { data: companyInstallers } = await supabase
        .from('installers')
        .select('id')
        .eq('company_id', installer.company_id);

      if (!companyInstallers || companyInstallers.length === 0) {
        setLeads([]);
        setLoading(false);
        return;
      }

      const installerIds = companyInstallers.map(i => i.id);

      // Poi otteniamo le lead assegnate a questi installatori
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select('*, leads(*), installer:installers(id, first_name, last_name)')
        .in('installer_id', installerIds)
        .order('assigned_at', { ascending: false });

      if (assignments) {
        let filteredLeads = assignments.map(a => ({
          ...a.leads,
          assigned_installer: a.installer,
        }));

        if (filter === 'assigned') {
          filteredLeads = filteredLeads.filter(l => l.assigned_installer?.id === installer.id);
        }

        setLeads(filteredLeads as Lead[]);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <CompanyLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Lead Aziendali</h1>
          <p className="text-slate-600">Gestisci tutte le lead assegnate alla tua azienda</p>
        </div>

        <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tutte le Lead ({leads.length})
            </button>
            <button
              onClick={() => setFilter('assigned')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'assigned'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Assegnate a Me
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {leads.length === 0 ? (
            <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-12 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Nessuna lead disponibile</p>
            </div>
          ) : (
            leads.map((lead: any) => (
              <div
                key={lead.id}
                className="bg-white rounded-xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {lead.customer_first_name} {lead.customer_last_name}
                      </h3>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-800'}`}>
                        {lead.status}
                      </span>
                    </div>
                    {lead.assigned_installer && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                        <User className="w-4 h-4" />
                        <span>
                          {lead.assigned_installer.first_name} {lead.assigned_installer.last_name}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${lead.customer_phone}`} className="hover:text-teal-600 transition-colors">
                          {lead.customer_phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${lead.customer_email}`} className="hover:text-teal-600 transition-colors">
                          {lead.customer_email}
                        </a>
                      </div>
                      {lead.customer_address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{lead.customer_address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(lead.created_at).toLocaleDateString('it-IT')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {lead.customer_notes && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-slate-700">{lead.customer_notes}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Link
                    to={`/installer/leads/${lead.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visualizza Dettagli
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </CompanyLayout>
  );
}
