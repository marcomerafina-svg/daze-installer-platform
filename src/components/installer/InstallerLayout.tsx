import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Home, Kanban, LogOut, MessageCircle, Trophy } from 'lucide-react';
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
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center">
                <DazeLogo height={32} />
              </div>

              <div className="flex gap-2">
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

            <div className="flex items-center gap-4">
              {installer && (
                <NotificationsDropdown
                  installerId={installer.id}
                  unreadCount={unreadCount}
                  onUnreadCountChange={setUnreadCount}
                />
              )}

              <div className="flex items-center gap-3 pl-4 border-l border-cool-gray-300">
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
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
