import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import type { Lead, Installer, LeadAssignment } from '../../types';
import { Search, Phone, Mail, MapPin, ExternalLink, FileText, Package, CheckCircle, Clock } from 'lucide-react';

interface LeadWithDetails extends Lead {
  installer?: Installer;
  assignment?: LeadAssignment;
}

export default function AdminLeads() {
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const leadsWithInstallers = await Promise.all(
        (leadsData || []).map(async (lead) => {
          const { data: assignment } = await supabase
            .from('lead_assignments')
            .select('id, lead_id, installer_id, assigned_at, is_viewed, viewed_at, confirmed_by_installer, confirmed_at, installers!lead_assignments_installer_id_fkey(*)')
            .eq('lead_id', lead.id)
            .maybeSingle();

          return {
            ...lead,
            installer: (assignment as any)?.installers,
            assignment: assignment as any,
          };
        })
      );

      setLeads(leadsWithInstallers);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = `${lead.first_name} ${lead.last_name} ${lead.email} ${lead.phone}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Nuova': 'bg-sky/30 text-reflex-blue-800',
      'In lavorazione': 'bg-honey/30 text-honey-dark',
      'Chiusa Vinta': 'bg-forest/30 text-forest-dark',
      'Chiusa Persa': 'bg-salmon/30 text-salmon-dark',
    };
    return colors[status] || 'bg-cool-gray-200 text-black';
  };

  return (
    <AdminLayout>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Lead</h1>
        <p className="text-sm sm:text-base font-inter text-black/70">Tutte le lead della piattaforma</p>
      </div>

      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-black/40 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Cerca lead..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base font-inter border border-cool-gray-400 rounded-lg focus:ring-2 focus:ring-reflex-blue focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base font-inter border border-cool-gray-400 rounded-lg focus:ring-2 focus:ring-reflex-blue focus:border-transparent"
        >
          <option value="all">Tutti gli stati</option>
          <option value="Nuova">Nuova</option>
          <option value="In lavorazione">In lavorazione</option>
          <option value="Chiusa Vinta">Chiusa Vinta</option>
          <option value="Chiusa Persa">Chiusa Persa</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-reflex-blue"></div>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {filteredLeads.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-cool-gray-300 p-12 text-center text-black/60">
              Nessuna lead trovata
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white rounded-xl shadow-sm border border-cool-gray-300 p-4 sm:p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                          {lead.first_name} {lead.last_name}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm font-inter text-gray-600">
                          {lead.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <a href={`tel:${lead.phone}`} className="hover:text-[#4a5fc1]">
                                {lead.phone}
                              </a>
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-2 min-w-0">
                              <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <a href={`mailto:${lead.email}`} className="hover:text-[#4a5fc1] truncate">
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
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>

                    {lead.description && (
                      <p className="text-xs sm:text-sm font-inter text-gray-600 mb-3 sm:mb-4 line-clamp-2">{lead.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3">
                      {lead.quote_pdf_url && (
                        <a
                          href={lead.quote_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-green-100 transition-all"
                        >
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Preventivo PDF</span>
                          <span className="sm:hidden">PDF</span>
                        </a>
                      )}
                      {lead.wallbox_serial && (
                        <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2 sm:px-3 py-1.5 rounded-lg">
                          <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="font-mono font-medium text-xs truncate max-w-[100px] sm:max-w-none">{lead.wallbox_serial}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm flex-wrap gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        {lead.installer ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Assegnato a:</span>
                            <span className="font-medium text-gray-900">
                              {lead.installer.first_name} {lead.installer.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Non assegnato</span>
                        )}
                        {lead.assignment?.confirmed_by_installer && (
                          <div className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs font-medium">Confermata</span>
                          </div>
                        )}
                        {lead.assignment && !lead.assignment.confirmed_by_installer && lead.status === 'Nuova' && (
                          <div className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs font-medium">In attesa</span>
                          </div>
                        )}
                      </div>
                      <span className="text-gray-400 text-xs">
                        {new Date(lead.created_at).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/admin/leads/${lead.id}`}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-[#4a5fc1] hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </AdminLayout>
  );
}
