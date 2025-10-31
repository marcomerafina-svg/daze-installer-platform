import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';

import Login from './pages/auth/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import AreaManagers from './pages/admin/AreaManagers';
import Installers from './pages/admin/Installers';
import AdminLeads from './pages/admin/AdminLeads';
import AdminRewards from './pages/admin/Rewards';
import InstallerDashboard from './pages/installer/InstallerDashboard';
import Pipeline from './pages/installer/Pipeline';
import LeadDetail from './pages/installer/LeadDetail';
import Contact from './pages/installer/Contact';
import InstallerRewards from './pages/installer/Rewards';

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

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
