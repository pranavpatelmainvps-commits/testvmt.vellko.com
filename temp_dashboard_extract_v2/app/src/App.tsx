import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { Deployment } from '@/pages/Deployment';
import { DNSManager } from '@/pages/DNSManager';
import { PMTAConfig } from '@/pages/PMTAConfig';
import { Toaster } from '@/components/ui/sonner';

type View = 'dashboard' | 'deploy' | 'dns' | 'logs' | 'pmta-config';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'deploy':
        return <Deployment />;
      case 'dns':
        return <DNSManager />;
      case 'pmta-config':
        return <PMTAConfig />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[hsl(222,47%,6%)] text-foreground overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>
      <Toaster />
    </div>
  );
}

export default App;
