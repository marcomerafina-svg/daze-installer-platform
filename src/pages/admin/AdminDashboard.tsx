import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { Users, FileText, TrendingUp, Clock, MapPin } from 'lucide-react';

interface Stats {
  totalInstallers: number;
  activeInstallers: number;
  totalLeads: number;
  newLeads: number;
  wonLeads: number;
  lostLeads: number;
  totalAreaManagers: number;
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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [installersRes, activeInstallersRes, leadsRes, newLeadsRes, wonLeadsRes, lostLeadsRes, areaManagersRes] = await Promise.all([
        supabase.from('installers').select('*', { count: 'exact', head: true }),
        supabase.from('installers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Nuova'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Chiusa Vinta'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Chiusa Persa'),
        supabase.from('area_managers').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        totalInstallers: installersRes.count || 0,
        activeInstallers: activeInstallersRes.count || 0,
        totalLeads: leadsRes.count || 0,
        newLeads: newLeadsRes.count || 0,
        wonLeads: wonLeadsRes.count || 0,
        lostLeads: lostLeadsRes.count || 0,
        totalAreaManagers: areaManagersRes.count || 0,
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
      color: 'from-sky to-sky-dark',
    },
    {
      title: 'Area Manager',
      value: stats.totalAreaManagers,
      subtitle: 'Responsabili territorio',
      icon: MapPin,
      color: 'from-reflex-blue to-reflex-blue-700',
    },
    {
      title: 'Lead Totali',
      value: stats.totalLeads,
      subtitle: `${stats.newLeads} nuove`,
      icon: FileText,
      color: 'from-cool-gray-500 to-cool-gray-700',
    },
    {
      title: 'Lead Vinte',
      value: stats.wonLeads,
      subtitle: `${stats.totalLeads > 0 ? Math.round((stats.wonLeads / stats.totalLeads) * 100) : 0}% tasso conversione`,
      icon: TrendingUp,
      color: 'from-forest to-forest-dark',
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-reflex-blue"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Dashboard</h1>
        <p className="text-black/70">Panoramica generale della piattaforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border border-cool-gray-300 p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`bg-gradient-to-br ${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-black/70 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-3xl font-bold text-black mb-1">{card.value}</p>
              <p className="text-sm text-black/60">{card.subtitle}</p>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
