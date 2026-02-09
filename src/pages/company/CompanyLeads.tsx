import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import CompanyLayout from '../../components/company/CompanyLayout';
import Button from '../../components/shared/Button';
import type { Lead } from '../../types';
import { Phone, Mail, ArrowRight, User, Calendar, MapPin, Package } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'Nuova': 'bg-daze-blue-light text-daze-blue border-daze-blue/20',
  'In lavorazione': 'bg-daze-honey/10 text-daze-honey-dark border-daze-honey/20',
  'Chiusa Vinta': 'bg-daze-forest/10 text-daze-forest border-daze-forest/20',
  'Chiusa Persa': 'bg-daze-salmon/10 text-daze-salmon-dark border-daze-salmon/20',
};

export default function CompanyLeads() {
  const { installer, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assigned'>('all');

  useEffect(() => {
    if (installer?.company_id) {
      loadLeads();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [installer, filter, authLoading]);

  const loadLeads = async () => {
    if (!installer?.company_id) return;

    setLoading(true);
    try {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-daze-blue"></div>
        </div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      <div className="max-w-7xl mx-auto pt-2 lg:pt-4">
        <div className="mb-8">
          <h1 className="text-3xl font-roobert font-bold text-daze-black mb-2">Lead Aziendali</h1>
          <p className="text-daze-black/70 font-inter">Gestisci tutte le lead assegnate alla tua azienda</p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-pill font-roobert font-medium text-sm transition-all ${
              filter === 'all'
                ? 'bg-daze-black text-white'
                : 'bg-daze-gray text-daze-black hover:bg-daze-gray/80'
            }`}
          >
            Tutte le Lead ({leads.length})
          </button>
          <button
            onClick={() => setFilter('assigned')}
            className={`px-4 py-2 rounded-pill font-roobert font-medium text-sm transition-all ${
              filter === 'assigned'
                ? 'bg-daze-black text-white'
                : 'bg-daze-gray text-daze-black hover:bg-daze-gray/80'
            }`}
          >
            Assegnate a Me
          </button>
        </div>

        {/* Lead list */}
        <div className="space-y-4">
          {leads.length === 0 ? (
            <div className="bg-white rounded-squircle border border-daze-gray p-12 text-center">
              <Package className="w-16 h-16 text-daze-black/20 mx-auto mb-4" />
              <p className="text-daze-black/70 font-inter font-medium">Nessuna lead disponibile</p>
            </div>
          ) : (
            leads.map((lead: any) => (
              <div
                key={lead.id}
                className="bg-white rounded-squircle border border-daze-gray p-6 hover:border-daze-black/20 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-roobert font-bold text-daze-black">
                        {lead.customer_first_name} {lead.customer_last_name}
                      </h3>
                      <span className={`px-2.5 py-1 rounded-pill text-xs font-roobert font-medium border ${STATUS_COLORS[lead.status] || 'bg-daze-gray text-daze-black'}`}>
                        {lead.status}
                      </span>
                    </div>
                    {lead.assigned_installer && (
                      <div className="flex items-center gap-2 text-sm font-inter text-daze-black/70 mb-2">
                        <User className="w-4 h-4 text-daze-black" />
                        <span>
                          {lead.assigned_installer.first_name} {lead.assigned_installer.last_name}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-inter font-medium text-daze-black">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-daze-black" />
                        <a href={`tel:${lead.customer_phone}`} className="hover:text-daze-blue transition-colors">
                          {lead.customer_phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-daze-black" />
                        <a href={`mailto:${lead.customer_email}`} className="hover:text-daze-blue transition-colors">
                          {lead.customer_email}
                        </a>
                      </div>
                      {lead.customer_address && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-daze-black" />
                          <span>{lead.customer_address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-daze-black" />
                        <span>{new Date(lead.created_at).toLocaleDateString('it-IT')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {lead.customer_notes && (
                  <div className="bg-daze-gray/10 rounded-xl p-4 mb-4">
                    <p className="text-sm font-inter text-daze-black/70">{lead.customer_notes}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Link to={`/installer/leads/${lead.id}`}>
                    <Button variant="secondary" size="sm" icon={<ArrowRight className="w-5 h-5" />}>
                      Visualizza Dettagli
                    </Button>
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
