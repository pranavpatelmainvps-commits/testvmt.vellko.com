import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';

import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import { Dashboard } from '@/pages/Dashboard';
import { Deployment } from '@/pages/Deployment';
import { DNSManager } from '@/pages/DNSManager';
import { PMTAConfig } from '@/pages/PMTAConfig';
import { AdminPanel } from '@/pages/AdminPanel';
import { InstalledServers } from '@/pages/InstalledServers';
import { ProfilePage } from '@/pages/ProfilePage';

import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { LandingPage } from '@/pages/LandingPage';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public/Auth Routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />

      {/* Protected Routes inside Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/deploy" element={<Deployment />} />
          <Route path="/servers" element={<InstalledServers />} />
          <Route path="/dns" element={<DNSManager />} />
          <Route path="/pmta-config" element={<PMTAConfig />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
