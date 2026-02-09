import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { Users, FileText, TrendingUp, MapPin, Clock, CheckCircle, Package } from 'lucide-react';

interface Stats {
  totalInstallers: number;
  activeInstallers: number;
  totalLeads: number;
  newLeads: number;
  wonLeads: number;
  lostLeads: number;
  totalAreaManagers: number;
  pendingInstallations: number;
  approvedInstallations: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalInstallers: 0,
    activeInstallers: 0,
    totalLeads: 0,
    newLeads: 0,
    wonLeads: 0,
    lostLeads: 0,
    totalAreaManagers: 0,
    pendingInstallations: 0,
    approvedInstallations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const countGroupedInstallations = (serials: { installer_id: string; customer_phone: string; installation_date: string }[]) => {
    const groups = new Set<string>();
    serials.forEach(s => {
      groups.add(`${s.installer_id}_${s.customer_phone}_${s.installation_date}`);
    });
    return groups.size;
  };

  const loadStats = async () => {
    try {
      const [
        installersRes,
        activeInstallersRes,
        leadsRes,
        newLeadsRes,
        wonLeadsRes,
        lostLeadsRes,
        areaManagersRes,
        pendingSerialsRes,
        approvedSerialsRes
      ] = await Promise.all([
        supabase.from('installers').select('*', { count: 'exact', head: true }),
        supabase.from('installers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Nuova'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Chiusa Vinta'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Chiusa Persa'),
        supabase.from('area_managers').select('*', { count: 'exact', head: true }),
        supabase.from('wallbox_serials').select('installer_id, customer_phone, installation_date')
          .eq('source_type', 'self_reported').eq('approval_status', 'pending'),
        supabase.from('wallbox_serials').select('installer_id, customer_phone, installation_date')
          .eq('source_type', 'self_reported').eq('approval_status', 'approved'),
      ]);

      setStats({
        totalInstallers: installersRes.count || 0,
        activeInstallers: activeInstallersRes.count || 0,
        totalLeads: leadsRes.count || 0,
        newLeads: newLeadsRes.count || 0,
        wonLeads: wonLeadsRes.count || 0,
        lostLeads: lostLeadsRes.count || 0,
        totalAreaManagers: areaManagersRes.count || 0,
        pendingInstallations: countGroupedInstallations(pendingSerialsRes.data || []),
        approvedInstallations: countGroupedInstallations(approvedSerialsRes.data || []),
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Installatori Totali',
      value: stats.totalInstallers,
      subtitle: `${stats.activeInstallers} attivi`,
      icon: Users,
      bg: 'bg-daze-blue',
    },
    {
      title: 'Area Manager',
      value: stats.totalAreaManagers,
      subtitle: 'Responsabili territorio',
      icon: MapPin,
      bg: 'bg-daze-forest',
    },
    {
      title: 'Lead Totali',
      value: stats.totalLeads,
      subtitle: `${stats.newLeads} nuove`,
      icon: FileText,
      bg: 'bg-daze-black',
    },
    {
      title: 'Lead Vinte',
      value: stats.wonLeads,
      subtitle: `${stats.totalLeads > 0 ? Math.round((stats.wonLeads / stats.totalLeads) * 100) : 0}% tasso conversione`,
      icon: TrendingUp,
      bg: 'bg-daze-forest',
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-daze-blue"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto pt-2 lg:pt-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-daze-black mb-2">Dashboard</h1>
          <p className="text-daze-black/70 font-inter">Panoramica generale della piattaforma</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white rounded-squircle border border-daze-gray p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 ${card.bg} rounded-xl`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-daze-black/80 font-medium text-sm font-inter mb-1">{card.title}</h3>
                <p className="text-3xl font-bold text-daze-black mb-1">{card.value}</p>
                <p className="text-sm font-inter text-daze-black/60">{card.subtitle}</p>
              </div>
            );
          })}
        </div>

        {stats.pendingInstallations > 0 && (
          <Link
            to="/admin/pending-installations"
            className="block bg-daze-honey rounded-squircle p-6 mb-8 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Installazioni da Approvare</h2>
                </div>
                <p className="text-white/80 text-sm font-inter mb-4">
                  Ci sono installazioni autonome degli installatori in attesa di verifica e approvazione
                </p>
                <div className="flex items-center gap-6 text-white">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-white/70" />
                    <span className="text-sm font-inter font-medium">
                      {stats.pendingInstallations} in attesa
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-white/70" />
                    <span className="text-sm font-inter font-medium">
                      {stats.approvedInstallations} approvate
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:flex items-center justify-center w-16 h-16 bg-white/20 rounded-full">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
          </Link>
        )}
      </div>
    </AdminLayout>
  );
}
