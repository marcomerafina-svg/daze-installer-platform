import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Home, Kanban, LogOut, MessageCircle, Trophy, Menu, X, Bell, Package, Building2 } from 'lucide-react';
import DazeLogo from '../shared/DazeLogo';
import NotificationsDropdown from './NotificationsDropdown';

interface InstallerLayoutProps {
  children: ReactNode;
}

export default function InstallerLayout({ children }: InstallerLayoutProps) {
  const { user, installer, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (installer) {
      loadUnreadCount();
    }
  }, [installer]);

  const loadUnreadCount = async () => {
    if (!installer) return;
    setUnreadCount(0);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error (ignored):', error);
    }
    // Naviga sempre al login, anche se c'è un errore
    navigate('/login');
  };

  const navItems = [
    { path: '/installer', icon: Home, label: 'Dashboard' },
    { path: '/installer/pipeline', icon: Kanban, label: 'Pipeline' },
    { path: '/installer/installations', icon: Package, label: 'Le Mie Installazioni' },
    { path: '/installer/rewards', icon: Trophy, label: 'Rewards' },
    { path: '/installer/contact', icon: MessageCircle, label: 'Contatti' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <DazeLogo height={28} />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all"
            >
              {sidebarOpen ? <X className="w-6 h-6 text-slate-700" /> : <Menu className="w-6 h-6 text-slate-700" />}
            </button>
          </div>
        </div>

        <main className="flex-1 pt-16 lg:pt-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 overflow-auto lg:mr-72">
          {children}
        </main>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed inset-y-0 right-0 z-50
          w-72 bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700
          h-screen shadow-strong overflow-y-auto
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col h-full p-6">
            <div className="hidden lg:flex flex-col items-center mb-8">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-4">
                <DazeLogo height={40} className="filter brightness-0 invert" />
              </div>
              <p className="text-white/90 text-sm font-medium">Installer Portal</p>
            </div>

            <nav className="space-y-2 flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${
                      isActive
                        ? 'bg-white text-teal-700 shadow-medium'
                        : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-teal-600' : ''}`} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-4 pt-6 border-t border-white/20">
              {installer && (
                <div className="relative">
                  <NotificationsDropdown
                    installerId={installer.id}
                    unreadCount={unreadCount}
                    onUnreadCountChange={setUnreadCount}
                  />
                </div>
              )}

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/30 to-white/10 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {installer?.first_name?.[0]}{installer?.last_name?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {installer?.first_name} {installer?.last_name}
                    </p>
                    <p className="text-white/70 text-xs truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleSignOut();
                    setSidebarOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all text-white font-medium text-sm border border-white/30"
                >
                  <LogOut className="w-4 h-4" />
                  Esci
                </button>
              </div>

              {installer?.company_id && installer?.can_manage_company && (
                <Link
                  to="/company"
                  onClick={() => setSidebarOpen(false)}
                  className="block w-full text-center px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  Dashboard Azienda
                </Link>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
