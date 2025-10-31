import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Users, FileText, LogOut, LayoutDashboard, MapPin, Trophy, Menu, X } from 'lucide-react';
import DazeLogo from '../shared/DazeLogo';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-reflex-blue to-reflex-blue-700 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <DazeLogo height={28} className="filter brightness-0 invert" />
            <span className="text-sm font-medium">Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className="flex pt-14 lg:pt-0">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-gradient-to-b from-reflex-blue via-reflex-blue-700 to-reflex-blue-900
          min-h-screen p-6 text-white
          transform transition-transform duration-300 ease-in-out
          lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col gap-2 mb-8 hidden lg:flex">
            <DazeLogo height={40} className="filter brightness-0 invert" />
            <p className="text-xs text-white/70">Admin Panel</p>
          </div>

          <nav className="space-y-2 mt-8 lg:mt-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
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
              onClick={() => {
                handleSignOut();
                setSidebarOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-salmon/20 hover:bg-salmon/30 transition-all w-full text-white border border-salmon/40"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Esci</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full lg:w-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
