import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Users, FileText, LogOut, LayoutDashboard, MapPin, Trophy } from 'lucide-react';
import DazeLogo from '../shared/DazeLogo';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/area-managers', icon: MapPin, label: 'Area Manager' },
    { path: '/admin/installers', icon: Users, label: 'Installatori' },
    { path: '/admin/leads', icon: FileText, label: 'Lead' },
    { path: '/admin/rewards', icon: Trophy, label: 'Rewards' },
  ];

  return (
    <div className="min-h-screen bg-cool-gray-100">
      <div className="flex">
        <aside className="w-64 bg-gradient-to-b from-reflex-blue via-reflex-blue-700 to-reflex-blue-900 min-h-screen p-6 text-white">
          <div className="flex flex-col gap-2 mb-8">
            <DazeLogo height={40} className="filter brightness-0 invert" />
            <p className="text-xs text-white/70">Admin Panel</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white/25 text-white shadow-lg'
                      : 'text-white/80 hover:bg-white/15 hover:text-white hover:translate-x-1'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-white/15 rounded-lg p-4 mb-4 border border-white/20">
              <p className="text-xs text-white/70 mb-1">Connesso come</p>
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-salmon/20 hover:bg-salmon/30 transition-all w-full text-white border border-salmon/40"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Esci</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
