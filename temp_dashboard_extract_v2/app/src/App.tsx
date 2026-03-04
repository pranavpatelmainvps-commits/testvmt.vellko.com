import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { Deployment } from '@/pages/Deployment';
import { DNSManager } from '@/pages/DNSManager';
import { PMTAConfig } from '@/pages/PMTAConfig';
import { AdminPanel } from '@/pages/AdminPanel';
import { InstalledServers } from '@/pages/InstalledServers';
import { Toaster } from '@/components/ui/sonner';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';

type View = 'dashboard' | 'deploy' | 'servers' | 'dns' | 'logs' | 'pmta-config' | 'admin';

// Component for authenticated users (Main App)
function AuthenticatedApp() {
  const [currentView, setCurrentView] = useState<View>('dashboard');


  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'deploy':
        return <Deployment />;
      case 'servers':
        return <InstalledServers />;
      case 'dns':
        return <DNSManager />;
      case 'pmta-config':
        return <PMTAConfig />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[hsl(222,47%,6%)] text-foreground overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="min-h-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

function Root() {
  const { isAuthenticated } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  if (!isAuthenticated) {
    if (authMode === 'register') {
      return <Register onSwitchToLogin={() => setAuthMode('login')} />;
    }
    return <Login onSwitchToRegister={() => setAuthMode('register')} />;
  }

  return <AuthenticatedApp />;
}


export default App;
