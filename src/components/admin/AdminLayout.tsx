import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Users, FileText, LogOut, LayoutDashboard, MapPin, Trophy, Menu, X, Building2, PackageCheck } from 'lucide-react';
import DazeLogo from '../shared/DazeLogo';
import Button from '../shared/Button';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/area-managers', icon: MapPin, label: 'Area Manager' },
    { path: '/admin/companies', icon: Building2, label: 'Aziende' },
    { path: '/admin/installers', icon: Users, label: 'Installatori' },
    { path: '/admin/leads', icon: FileText, label: 'Lead' },
    { path: '/admin/pending-installations', icon: PackageCheck, label: 'Approvazioni' },
    { path: '/admin/rewards', icon: Trophy, label: 'Rewards' },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-daze-gray">
          <div className="flex items-center justify-between px-4 py-3">
            <DazeLogo height={28} />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-daze-gray/20 rounded-xl transition-all"
            >
              {sidebarOpen ? <X className="w-6 h-6 text-daze-black" /> : <Menu className="w-6 h-6 text-daze-black" />}
            </button>
          </div>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed inset-y-0 left-0 z-50
          w-72 bg-[#c1d7ff]
          h-screen overflow-hidden
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col h-full p-6">
            <div className="hidden lg:flex flex-col items-center mb-10">
              <DazeLogo height={48} />
              <p className="text-daze-black/70 text-sm font-inter mt-3">Pannello Admin</p>
            </div>

            <nav className="space-y-1 flex-1 font-inter">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`relative flex items-center gap-3 pl-5 pr-4 py-3 transition-colors ${
                      isActive
                        ? 'text-daze-black font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-daze-black before:rounded-full'
                        : 'text-daze-black/70 hover:text-daze-black font-medium'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-4 pt-6 border-t border-daze-blue/15">
              <div className="bg-white/60 rounded-squircle p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-daze-blue/15 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-daze-blue font-roobert font-bold text-base">A</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-daze-black font-roobert font-semibold text-sm">Admin</p>
                    <p className="text-daze-black/70 font-inter text-xs truncate mt-0.5">{user?.email}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-daze-blue/10">
                  <Button
                    variant="primaryBlack"
                    size="sm"
                    fullWidth
                    icon={<LogOut className="w-4 h-4" />}
                    onClick={() => {
                      handleSignOut();
                      setSidebarOpen(false);
                    }}
                  >
                    Esci
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 pt-16 lg:pt-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 overflow-auto lg:ml-72">
          {children}
        </main>
      </div>
    </div>
  );
}
