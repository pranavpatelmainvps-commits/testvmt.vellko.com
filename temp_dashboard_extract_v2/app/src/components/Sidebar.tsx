
import {
  LayoutDashboard,
  Rocket,
  Globe,
  Zap,
  User,
  Settings,
  LogOut,
  Shield,
  Server
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'deploy' | 'servers' | 'dns' | 'logs' | 'pmta-config' | 'admin' | 'profile') => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'deploy', label: 'New Deployment', icon: Rocket },
  { id: 'servers', label: 'Installed Servers', icon: Server },
  { id: 'dns', label: 'DNS Manager', icon: Globe },
  { id: 'pmta-config', label: 'VelkoMTA Config', icon: Settings },
];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { user, logout } = useAuth();
  return (
    <aside className="w-64 bg-[hsl(222,47%,5%)] border-r border-[hsl(217,33%,15%)] flex flex-col">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">VelkoMTA</h1>
          <p className="text-xs text-muted-foreground">Enterprise Cloud Console</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id as any)}
                  className={cn(
                    "relative w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 z-10",
                    isActive
                      ? "text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20 -z-10"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-5 h-5 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </motion.div>
                  {item.label}
                </button>
              </li>
            );
          })}

          {/* Admin Panel - Only visible to admins */}
          {user?.role === 'admin' && (
            <li>
              <button
                onClick={() => onViewChange('admin')}
                className={cn(
                  "relative w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 z-10",
                  currentView === 'admin'
                    ? "text-white"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {currentView === 'admin' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20 -z-10"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-5 h-5 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </motion.div>
                Admin Panel
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-[hsl(217,33%,15%)]">
        <div className="flex items-center gap-3 px-2">
          <button onClick={() => onViewChange('profile')} className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center hover:scale-105 transition-transform" title="Profile Settings">
            <User className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => onViewChange('profile')} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity" title="Profile Settings">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || 'user@example.com'}</p>
          </button>
          <button onClick={logout} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
