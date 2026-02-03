import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Users, FileText, LogOut, LayoutDashboard, Trophy, Menu, X, Building2 } from 'lucide-react';
import DazeLogo from '../shared/DazeLogo';

interface CompanyLayoutProps {
  children: ReactNode;
}

export default function CompanyLayout({ children }: CompanyLayoutProps) {
  const { user, installer, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
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
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900
          min-h-screen shadow-strong
          transform transition-all duration-300 ease-in-out
          lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col h-full p-6">
            <div className="hidden lg:flex flex-col items-center mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <p className="text-white/90 text-sm font-medium">Company Panel</p>
              {installer?.company && (
                <p className="text-white/70 text-xs mt-1">{installer.company.company_name}</p>
              )}
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
                        ? 'bg-white text-blue-800 shadow-medium'
                        : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-blue-700' : ''}`} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-4 pt-6 border-t border-white/20">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/30 to-white/10 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {installer?.first_name?.[0] || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">
                      {installer?.first_name} {installer?.last_name}
                    </p>
                    <p className="text-white/70 text-xs truncate">{user?.email}</p>
                  </div>
                </div>
                {installer?.role_in_company && (
                  <div className="mb-3 px-2 py-1 bg-white/20 rounded-lg text-center">
                    <p className="text-white/90 text-xs font-medium capitalize">
                      {installer.role_in_company}
                    </p>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white font-medium text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>

              <Link
                to="/installer"
                className="block w-full text-center px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white font-medium text-sm"
              >
                Vista Installatore
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 mt-16 lg:mt-0">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
