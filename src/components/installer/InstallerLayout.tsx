import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Home, Kanban, LogOut, MessageCircle, Trophy, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (installer) {
      loadUnreadCount();
    }
  }, [installer]);

  const loadUnreadCount = async () => {
    if (!installer) return;

    const { count } = await supabase
      .from('lead_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('installer_id', installer.id)
      .eq('is_viewed', false);

    setUnreadCount(count || 0);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/installer', icon: Home, label: 'Home' },
    { path: '/installer/pipeline', icon: Kanban, label: 'Pipeline' },
    { path: '/installer/rewards', icon: Trophy, label: 'Rewards' },
    { path: '/installer/contact', icon: MessageCircle, label: 'Contattaci' },
  ];

  return (
    <div className="min-h-screen bg-cool-gray-100">
      <nav className="bg-white border-b border-cool-gray-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 lg:gap-8">
              <div className="flex items-center">
                <DazeLogo height={28} className="sm:h-8" />
              </div>

              <div className="hidden lg:flex gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-reflex-blue to-reflex-blue-600 text-white shadow-md'
                          : 'text-black hover:bg-cool-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {installer && (
                <NotificationsDropdown
                  installerId={installer.id}
                  unreadCount={unreadCount}
                  onUnreadCountChange={setUnreadCount}
                />
              )}

              <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-cool-gray-300">
                <div className="text-right">
                  <p className="text-sm font-medium text-black">
                    {installer?.first_name} {installer?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-black hover:bg-salmon/20 rounded-lg transition-all"
                  title="Esci"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-black hover:bg-cool-gray-200 rounded-lg transition-all"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-cool-gray-300 bg-white">
            <div className="px-4 py-3 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-reflex-blue to-reflex-blue-600 text-white shadow-md'
                        : 'text-black hover:bg-cool-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}

              <div className="sm:hidden border-t border-cool-gray-300 pt-3 mt-3">
                <div className="px-4 py-2 mb-2">
                  <p className="text-sm font-medium text-black">
                    {installer?.first_name} {installer?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-salmon/20 hover:bg-salmon/30 transition-all w-full text-black"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Esci</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
}
