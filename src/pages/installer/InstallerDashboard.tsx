import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import InstallerLayout from '../../components/installer/InstallerLayout';
import PushNotificationBanner from '../../components/installer/PushNotificationBanner';
import RegisterInstallationModal from '../../components/installer/RegisterInstallationModal';
import type { Lead, LeadAssignment } from '../../types';
import { Phone, Mail, MapPin, ArrowRight, ExternalLink, Sparkles, AlertCircle, TrendingUp, Users, User, Target, Award, Package, Plus, Clock } from 'lucide-react';
import Button from '../../components/shared/Button';

interface LeadWithAssignment extends Lead {
  assignment: LeadAssignment;
}

export default function InstallerDashboard() {
  const { installer, loading: authLoading } = useAuth();
  const [newLeads, setNewLeads] = useState<LeadWithAssignment[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, won: 0, conversionRate: 0 });
  const [installationStats, setInstallationStats] = useState({ total: 0, pending: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    console.log('[Dashboard] useEffect - installer:', installer?.id || 'NULL', 'authLoading:', authLoading, 'loading:', loading);
    if (installer) {
      loadData();
    } else if (!authLoading) {
      console.log('[Dashboard] No installer found, stopping spinner');
      setLoading(false);
    }
  }, [installer, authLoading]);

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
      'Nuova': 'bg-daze-blue-light text-daze-blue border-daze-blue/20',
      'In lavorazione': 'bg-daze-honey/10 text-daze-honey-dark border-daze-honey/20',
      'Chiusa Vinta': 'bg-daze-forest/10 text-daze-forest border-daze-forest/20',
      'Chiusa Persa': 'bg-daze-salmon/10 text-daze-salmon-dark border-daze-salmon/20',
    };
    return colors[status] || 'bg-daze-gray text-daze-black/70';
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
        <div className="mb-10">
          <h1 className="text-3xl font-roobert font-bold text-daze-black mb-2">
            Benvenuto, {installer?.first_name}!
          </h1>
          <p className="text-daze-black/70 font-inter">Ecco una panoramica delle tue attività</p>
        </div>

        {installer && <PushNotificationBanner installerId={installer.id} />}

        <div
          onClick={() => setShowRegisterModal(true)}
          className="bg-daze-black rounded-squircle p-8 mb-10 cursor-pointer hover:opacity-95 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white/10 rounded-xl">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-roobert font-bold text-white">Registra Nuova Installazione</h2>
              </div>
              <p className="text-white/70 text-sm font-inter mb-4">
                Hai installato una wallbox autonomamente? Registrala qui per guadagnare punti!
              </p>
              <div className="flex items-center gap-6 text-white/80 font-inter">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-white/50" />
                  <span className="text-sm font-medium">
                    {installationStats.total} totali
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-white/50" />
                  <span className="text-sm font-medium">
                    {installationStats.pending} in approvazione
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-white/50" />
                  <span className="text-sm font-medium">
                    {installationStats.thisMonth} questo mese
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center w-16 h-16 bg-white/10 rounded-full">
              <Plus className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-squircle border border-daze-gray p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-daze-black/10 rounded-xl">
                <Users className="w-6 h-6 text-daze-black" />
              </div>
            </div>
            <h3 className="text-daze-black/80 text-sm font-inter font-medium mb-1">Lead Totali</h3>
            <p className="text-3xl font-roobert font-bold text-daze-black">{stats.total}</p>
          </div>

          <div className="bg-white rounded-squircle border border-daze-gray p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-daze-blue-light rounded-xl">
                <Target className="w-6 h-6 text-daze-blue" />
              </div>
            </div>
            <h3 className="text-daze-black/80 text-sm font-inter font-medium mb-1">Lead Attive</h3>
            <p className="text-3xl font-roobert font-bold text-daze-black">{stats.active}</p>
          </div>

          <div className="bg-white rounded-squircle border border-daze-gray p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-daze-forest/10 rounded-xl">
                <Award className="w-6 h-6 text-daze-forest" />
              </div>
            </div>
            <h3 className="text-daze-black/80 text-sm font-inter font-medium mb-1">Lead Vinte</h3>
            <p className="text-3xl font-roobert font-bold text-daze-black">{stats.won}</p>
          </div>

          <div className="bg-white rounded-squircle border border-daze-gray p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-daze-honey/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-daze-honey-dark" />
              </div>
            </div>
            <h3 className="text-daze-black/80 text-sm font-inter font-medium mb-1">Conversione</h3>
            <p className="text-3xl font-roobert font-bold text-daze-black">{stats.conversionRate}%</p>
          </div>
        </div>

        {newLeads.some(lead => !lead.assignment.confirmed_by_installer) && (
          <div className="bg-daze-salmon/10 rounded-squircle p-6 mb-6 border border-daze-salmon/30">
            <div className="flex items-start gap-4">
              <div className="bg-daze-salmon p-3 rounded-xl">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-roobert font-bold text-daze-black mb-2">
                  Lead da Confermare
                </h2>
                <p className="text-daze-black/70 font-inter">
                  Hai {newLeads.filter(l => !l.assignment.confirmed_by_installer).length} lead in attesa di conferma.
                  Clicca su "Visualizza Dettagli" e conferma di aver contattato il cliente.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-daze-blue-light rounded-squircle p-6 mb-10 border border-daze-blue/20">
          <div className="flex items-start gap-4">
            <div className="bg-daze-blue p-3 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-roobert font-bold text-daze-black mb-2">
                Nuove Lead ({newLeads.length})
              </h2>
              <p className="text-daze-black/70 font-inter">
                {newLeads.length === 0
                  ? 'Al momento non hai nuove lead da gestire.'
                  : `Hai ${newLeads.length} nuov${newLeads.length === 1 ? 'a' : 'e'} lead in attesa!`}
              </p>
            </div>
          </div>
        </div>

        {newLeads.length > 0 && (
          <div className="grid gap-4">
            {newLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white rounded-squircle border border-daze-gray p-6 flex items-center gap-6"
              >
                {/* Contenuto a sinistra */}
                <div className="flex-1 min-w-0">
                  {/* Data */}
                  <p className="text-sm font-inter font-medium text-daze-black mb-3">
                    Assegnato il: {new Date(lead.assignment.assigned_at).toLocaleDateString('it-IT')}
                  </p>

                  {/* Nome + badge */}
                  <div className="flex items-center mb-3">
                    <User className="w-5 h-5 text-daze-black flex-shrink-0" />
                    <h3 className="text-xl font-roobert font-bold text-daze-black ml-2">
                      {lead.first_name} {lead.last_name}
                    </h3>

                    <div className="flex items-center gap-2 ml-4">
                      {!lead.assignment.is_viewed && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-inter font-medium bg-daze-salmon text-white">
                          Nuovo
                        </span>
                      )}
                      {!lead.assignment.confirmed_by_installer && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-inter font-medium bg-daze-honey text-daze-black">
                          Da confermare
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-inter font-medium border ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                  </div>

                  {/* Contatti — separati con più spazio */}
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-base font-inter font-medium text-daze-black">
                    {lead.phone && (
                      <span className="inline-flex items-center gap-2">
                        <Phone className="w-[18px] h-[18px] text-daze-black" />
                        {lead.phone}
                      </span>
                    )}
                    {lead.email && (
                      <span className="inline-flex items-center gap-2">
                        <Mail className="w-[18px] h-[18px] text-daze-black" />
                        {lead.email}
                      </span>
                    )}
                    {lead.address && (
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="w-[18px] h-[18px] text-daze-black" />
                        {lead.address}
                      </span>
                    )}
                  </div>

                  {lead.description && (
                    <p className="text-sm font-inter text-daze-black mt-3">
                      <span className="text-daze-black/70">Note:</span> {lead.description}
                    </p>
                  )}
                </div>

                {/* Bottone secondary — centrato verticalmente a destra */}
                <div className="flex-shrink-0">
                  <Link
                    to={`/installer/leads/${lead.id}`}
                    onClick={() => markAsViewed(lead.assignment.id)}
                  >
                    <Button variant="secondary" size="sm" icon={<ArrowRight className="w-5 h-5" />}>
                      Visualizza Dettagli
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/installer/pipeline"
            className="inline-flex items-center gap-2 text-daze-blue hover:text-daze-blue/80 font-inter font-semibold"
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
