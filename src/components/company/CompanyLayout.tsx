import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Users, FileText, LogOut, LayoutDashboard, Trophy, Menu, X, Building2 } from 'lucide-react';
import DazeLogo from '../shared/DazeLogo';
import Button from '../shared/Button';

interface CompanyLayoutProps {
  children: ReactNode;
}

export default function CompanyLayout({ children }: CompanyLayoutProps) {
  const { user, installer, signOut } = useAuth();
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
    { path: '/company', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/company/team', icon: Users, label: 'Team' },
    { path: '/company/leads', icon: FileText, label: 'Lead' },
    { path: '/company/rewards', icon: Trophy, label: 'Rewards' },
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

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed inset-y-0 left-0 z-50
          w-72 bg-daze-blue
          h-screen shadow-strong overflow-hidden
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col h-full p-6">
            <div className="hidden lg:flex flex-col items-center mb-10">
              <DazeLogo height={48} className="filter brightness-0 invert" />
              <p className="text-white/70 text-sm font-inter mt-3">Portale Azienda</p>
              {installer?.company && (
                <p className="text-white/50 font-inter text-xs mt-1">{installer.company.company_name}</p>
              )}
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
                        ? 'text-white font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-white before:rounded-full'
                        : 'text-white/60 hover:text-white/90 font-medium'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-4 pt-6 border-t border-white/20">
              <div className="bg-white/10 rounded-squircle p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-roobert font-bold text-base">
                      {installer?.first_name?.[0] || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-roobert font-semibold text-sm">
                      {installer?.first_name} {installer?.last_name}
                    </p>
                    <p className="text-white/50 font-inter text-xs truncate mt-0.5">{user?.email}</p>
                  </div>
                </div>
                {installer?.role_in_company && (
                  <div className="mt-2 px-2 py-1 bg-white/15 rounded-lg text-center">
                    <p className="text-white/80 font-inter text-xs font-medium capitalize">
                      {installer.role_in_company}
                    </p>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-white/15">
                  <Button
                    variant="primaryWhite"
                    size="sm"
                    fullWidth
                    icon={<LogOut className="w-4 h-4" />}
                    onClick={handleSignOut}
                  >
                    Esci
                  </Button>
                </div>
              </div>

              <Link
                to="/installer"
                onClick={() => setSidebarOpen(false)}
                className="block mt-4"
              >
                <Button
                  variant="secondaryDark"
                  size="sm"
                  fullWidth
                  icon={<Building2 className="w-4 h-4" />}
                  iconPosition="left"
                >
                  Vista Installatore
                </Button>
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 mt-16 lg:mt-0 lg:ml-72">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
