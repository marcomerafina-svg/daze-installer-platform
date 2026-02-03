import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';

import Login from './pages/auth/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import AreaManagers from './pages/admin/AreaManagers';
import Installers from './pages/admin/Installers';
import Companies from './pages/admin/Companies';
import AdminLeads from './pages/admin/AdminLeads';
import AdminRewards from './pages/admin/Rewards';
import PendingInstallations from './pages/admin/PendingInstallations';
import InstallerDashboard from './pages/installer/InstallerDashboard';
import Pipeline from './pages/installer/Pipeline';
import LeadDetail from './pages/installer/LeadDetail';
import Installations from './pages/installer/Installations';
import Contact from './pages/installer/Contact';
import InstallerRewards from './pages/installer/Rewards';
import CompanyDashboard from './pages/company/CompanyDashboard';
import TeamManagement from './pages/company/TeamManagement';
import CompanyLeads from './pages/company/CompanyLeads';
import CompanyRewards from './pages/company/CompanyRewards';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/area-managers"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AreaManagers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/installers"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Installers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/companies"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Companies />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leads"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLeads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rewards"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminRewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pending-installations"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PendingInstallations />
              </ProtectedRoute>
            }
          />

          <Route
            path="/installer"
            element={
              <ProtectedRoute allowedRoles={['installer']}>
                <InstallerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/installer/pipeline"
            element={
              <ProtectedRoute allowedRoles={['installer']}>
                <Pipeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/installer/installations"
            element={
              <ProtectedRoute allowedRoles={['installer']}>
                <Installations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/installer/rewards"
            element={
              <ProtectedRoute allowedRoles={['installer']}>
                <InstallerRewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/installer/leads/:id"
            element={
              <ProtectedRoute allowedRoles={['installer']}>
                <LeadDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/installer/contact"
            element={
              <ProtectedRoute allowedRoles={['installer']}>
                <Contact />
              </ProtectedRoute>
            }
          />

          <Route
            path="/company"
            element={
              <ProtectedRoute allowedRoles={['installer']}>
                <CompanyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/company/team"
            element={
              <ProtectedRoute allowedRoles={['installer']}>
                <TeamManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/company/leads"
            element={
              <ProtectedRoute allowedRoles={['installer']}>
                <CompanyLeads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/company/rewards"
            element={
              <ProtectedRoute allowedRoles={['installer']}>
                <CompanyRewards />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
