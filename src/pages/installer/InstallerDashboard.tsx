import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import InstallerLayout from '../../components/installer/InstallerLayout';
import PushNotificationBanner from '../../components/installer/PushNotificationBanner';
import RegisterInstallationModal from '../../components/installer/RegisterInstallationModal';
import type { Lead, LeadAssignment } from '../../types';
import { Phone, Mail, MapPin, ExternalLink, Sparkles, AlertCircle, TrendingUp, Users, Target, Award, Package, Plus, Clock } from 'lucide-react';

interface LeadWithAssignment extends Lead {
  assignment: LeadAssignment;
}

export default function InstallerDashboard() {
  const { installer } = useAuth();
  const [newLeads, setNewLeads] = useState<LeadWithAssignment[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, won: 0, conversionRate: 0 });
  const [installationStats, setInstallationStats] = useState({ total: 0, pending: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    if (installer) {
      loadData();
    }
  }, [installer]);

  const loadData = async () => {
    if (!installer) return;

    try {
      const [assignmentsRes, installationsRes] = await Promise.all([
        supabase
          .from('lead_assignments')
          .select('*, leads(*)')
          .eq('installer_id', installer.id),
        supabase
          .from('wallbox_serials')
          .select('id')
          .eq('installer_id', installer.id)
      ]);

      if (assignmentsRes.data) {
        const leadsWithAssignment = assignmentsRes.data.map(a => ({
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

      if (installationsRes.data) {
        const allInstallations = installationsRes.data;
        const pendingCount = allInstallations.filter(i => i.approval_status === 'pending').length;

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthCount = allInstallations.filter(i => {
          const installDate = new Date(i.installation_date || i.created_at);
          return installDate >= firstDayOfMonth;
        }).length;

        setInstallationStats({
          total: allInstallations.length,
          pending: pendingCount,
          thisMonth: thisMonthCount,
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
      'Nuova': 'bg-sky-100 text-sky-700 border-sky-200',
      'In lavorazione': 'bg-amber-100 text-amber-700 border-amber-200',
      'Chiusa Vinta': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Chiusa Persa': 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Benvenuto, {installer?.first_name}!
          </h1>
          <p className="text-slate-600">Ecco una panoramica delle tue attività</p>
        </div>

        {installer && <PushNotificationBanner installerId={installer.id} />}

        <div
          onClick={() => setShowRegisterModal(true)}
          className="bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 rounded-2xl shadow-strong p-8 mb-8 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Registra Nuova Installazione</h2>
              </div>
              <p className="text-teal-50 text-sm mb-4">
                Hai installato una wallbox autonomamente? Registrala qui per guadagnare punti!
              </p>
              <div className="flex items-center gap-6 text-white">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-200" />
                  <span className="text-sm font-medium">
                    {installationStats.total} totali
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-200" />
                  <span className="text-sm font-medium">
                    {installationStats.pending} in approvazione
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-200" />
                  <span className="text-sm font-medium">
                    {installationStats.thisMonth} questo mese
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full group-hover:bg-white/30 transition-all">
              <Plus className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl shadow-sm">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-slate-600 text-sm font-medium mb-1">Lead Totali</h3>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl shadow-sm">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-slate-600 text-sm font-medium mb-1">Lead Attive</h3>
            <p className="text-3xl font-bold text-slate-900">{stats.active}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-slate-600 text-sm font-medium mb-1">Lead Vinte</h3>
            <p className="text-3xl font-bold text-slate-900">{stats.won}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-sm">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-slate-600 text-sm font-medium mb-1">Conversione</h3>
            <p className="text-3xl font-bold text-slate-900">{stats.conversionRate}%</p>
          </div>
        </div>

        {newLeads.some(lead => !lead.assignment.confirmed_by_installer) && (
          <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl p-6 mb-6 border-2 border-rose-200 shadow-soft">
            <div className="flex items-start gap-4">
              <div className="bg-rose-500 p-3 rounded-xl animate-pulse-soft shadow-medium">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-rose-900 mb-2">
                  Lead da Confermare
                </h2>
                <p className="text-rose-800">
                  Hai {newLeads.filter(l => !l.assignment.confirmed_by_installer).length} lead in attesa di conferma.
                  Clicca su "Visualizza Dettagli" e conferma di aver contattato il cliente.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-6 mb-8 border border-teal-200 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-3 rounded-xl shadow-medium">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-teal-900 mb-2">
                Nuove Lead ({newLeads.length})
              </h2>
              <p className="text-teal-800">
                {newLeads.length === 0
                  ? 'Al momento non hai nuove lead da gestire.'
                  : `Hai ${newLeads.length} nuov${newLeads.length === 1 ? 'a' : 'e'} lead in attesa!`}
              </p>
            </div>
          </div>
        </div>

        {newLeads.length > 0 && (
          <div className="grid gap-6">
            {newLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-teal-600"></div>

                <div className="absolute top-4 right-4 flex gap-2">
                  {!lead.assignment.is_viewed && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse-soft shadow-medium">
                      NUOVO
                    </span>
                  )}
                  {!lead.assignment.confirmed_by_installer && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-medium">
                      DA CONF.
                    </span>
                  )}
                </div>

                <div className="pr-32 mb-4">
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">
                    {lead.first_name} {lead.last_name}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {lead.phone && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <Phone className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500">Telefono</p>
                          <a href={`tel:${lead.phone}`} className="text-sm font-medium text-teal-600 hover:text-teal-700 truncate block">
                            {lead.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <Mail className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500">Email</p>
                          <a href={`mailto:${lead.email}`} className="text-sm font-medium text-teal-600 hover:text-teal-700 truncate block">
                            {lead.email}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {lead.address && (
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl mb-4">
                      <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 mb-1">Indirizzo</p>
                        <p className="text-sm text-slate-900">{lead.address}</p>
                      </div>
                    </div>
                  )}

                  {lead.description && (
                    <div className="p-4 bg-slate-50 rounded-xl mb-4">
                      <p className="text-sm text-slate-700 leading-relaxed">{lead.description}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-medium border ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                    <span className="text-sm text-slate-500">
                      Assegnato il {new Date(lead.assignment.assigned_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/installer/leads/${lead.id}`}
                  onClick={() => markAsViewed(lead.assignment.id)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-medium hover:scale-[1.02] transition-all"
                >
                  Visualizza Dettagli
                  <ExternalLink className="w-5 h-5" />
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/installer/pipeline"
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-semibold"
          >
            Vai alla Pipeline completa
            <ExternalLink className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {showRegisterModal && installer && (
        <RegisterInstallationModal
          installerId={installer.id}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            setShowRegisterModal(false);
            loadData();
          }}
        />
      )}
    </InstallerLayout>
  );
}
