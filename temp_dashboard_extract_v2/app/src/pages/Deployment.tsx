import { useState } from 'react';
import { Rocket, Plus, Trash2, Server, User, Lock, CheckCircle, FileText, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useInstall, useLogStream } from '@/hooks/useApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MappingRow {
  id: string;
  domain: string;
  ip: string;
}

export function Deployment() {
  const [serverIp, setServerIp] = useState('');
  const [sshUser, setSshUser] = useState('root');
  const [sshPass, setSshPass] = useState('');
  // const [freshInstall, setFreshInstall] = useState(false); // Removed
  const [mappings, setMappings] = useState<MappingRow[]>([{ id: '1', domain: '', ip: '' }]);
  const [showLogs, setShowLogs] = useState(false);

  // Bulk Mode State
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkIPs, setBulkIPs] = useState('');
  const [bulkDomains, setBulkDomains] = useState('');

  const { install, isLoading: isInstalling } = useInstall();
  const { logs, isConnected } = useLogStream(showLogs);

  const addMapping = () => {
    setMappings([...mappings, { id: Date.now().toString(), domain: '', ip: '' }]);
  };

  const removeMapping = (id: string) => {
    if (mappings.length > 1) {
      setMappings(mappings.filter(m => m.id !== id));
    }
  };

  const updateMapping = (id: string, field: 'domain' | 'ip', value: string) => {
    setMappings(mappings.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleDeploy = async () => {
    if (!serverIp || !sshUser || !sshPass) {
      toast.error('Please fill in all server connection fields');
      return;
    }

    let validMappings: { domain: string; ip: string }[] = [];
    let deployMode = 'install';

    if (bulkMode) {
      deployMode = 'onboard';
      const ips = bulkIPs.split('\n').map(s => s.trim()).filter(Boolean);
      const domains = bulkDomains.split('\n').map(s => s.trim()).filter(Boolean);

      if (ips.length === 0) {
        toast.error('Please provide at least one IP and Domain.');
        return;
      }
      if (ips.length !== domains.length) {
        toast.error(`Count Mismatch: ${ips.length} IPs vs ${domains.length} Domains. They must match 1-to-1.`);
        return;
      }

      validMappings = ips.map((ip, i) => ({ ip, domain: domains[i] }));

    } else {
      validMappings = mappings
        .filter(m => m.domain && m.ip)
        .map(m => ({ domain: m.domain, ip: m.ip }));

      if (validMappings.length === 0) {
        toast.error('Please add at least one domain mapping');
        return;
      }
    }

    try {
      setShowLogs(true);
      await install({
        server_ip: serverIp,
        ssh_user: sshUser,
        ssh_pass: sshPass,
        mappings: validMappings,
        mode: deployMode,
      });
      toast.success('Deployment started successfully');

      // Auto-redirect to Dashboard view after short delay to allow toast to be seen
      setTimeout(() => {
        window.location.reload(); // Force refresh to Dashboard default view or just reload to clear state
        // Better: Assuming App.tsx defaults to Dashboard, reload works. 
        // Or if using router, navigate. But here it seems state based 'currentView'. 
        // Since we are in a sub-component, we can't easily set parent state without passing it down.
        // But reloading the page resets App.tsx state to 'dashboard' (default).
      }, 1000);

    } catch (err) {
      toast.error('Failed to start deployment: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setShowLogs(false);
    }
  };

  const getLogType = (line: string): 'info' | 'success' | 'error' | 'warn' => {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('failed') || lower.includes('!!!')) return 'error';
    if (lower.includes('success') || lower.includes('completed') || lower.includes('✅')) return 'success';
    if (lower.includes('warning') || lower.includes('⚠')) return 'warn';
    return 'info';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Rocket className="w-6 h-6 text-blue-500" />
            Server Deployment
          </h1>
          <p className="text-sm text-muted-foreground">Deploy and configure PowerMTA on your servers</p>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          v2.4.2
        </Badge>
      </div>

      {/* Server Connection */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-500" />
            Server Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="server_ip" className="text-slate-300">Host IP Address</Label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="server_ip"
                  placeholder="e.g. 192.168.1.1"
                  value={serverIp}
                  onChange={(e) => setServerIp(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ssh_user" className="text-slate-300">SSH Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="ssh_user"
                  value={sshUser}
                  onChange={(e) => setSshUser(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ssh_pass" className="text-slate-300">SSH Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="ssh_pass"
                  type="password"
                  placeholder="••••••••"
                  value={sshPass}
                  onChange={(e) => setSshPass(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>
          {/* Fresh Install Checkbox Removed */}
        </CardContent>
      </Card>

      {/* Network & Domains */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            Network & Domains
            {bulkMode && <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs">Bulk Mode</Badge>}
          </CardTitle>
          <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
            <Button
              variant={!bulkMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setBulkMode(false)}
              className={!bulkMode ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-400 hover:text-white"}
            >
              <List className="w-4 h-4 mr-1" /> Table
            </Button>
            <Button
              variant={bulkMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setBulkMode(true)}
              className={bulkMode ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-400 hover:text-white"}
            >
              <FileText className="w-4 h-4 mr-1" /> Bulk Text
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!bulkMode ? (
            <div className="overflow-x-auto">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={addMapping} className="border-slate-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Node
                </Button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tracking Domain</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned IP</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping) => (
                    <tr key={mapping.id} className="border-b border-border/50">
                      <td className="py-3 px-4">
                        <Input
                          placeholder="example.com"
                          value={mapping.domain}
                          onChange={(e) => updateMapping(mapping.id, 'domain', e.target.value)}
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          placeholder="1.2.3.4"
                          value={mapping.ip}
                          onChange={(e) => updateMapping(mapping.id, 'ip', e.target.value)}
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMapping(mapping.id)}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-300">IP Addresses (One per line)</Label>
                <textarea
                  value={bulkIPs}
                  onChange={(e) => setBulkIPs(e.target.value)}
                  placeholder="1.2.3.4&#10;1.2.3.5&#10;..."
                  className="w-full h-64 p-3 bg-slate-900 border border-slate-700 rounded-md text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500">
                  {bulkIPs.split('\n').filter(Boolean).length} IPs found
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Domains (One per line)</Label>
                <textarea
                  value={bulkDomains}
                  onChange={(e) => setBulkDomains(e.target.value)}
                  placeholder="example.com&#10;mail.test.com&#10;..."
                  className="w-full h-64 p-3 bg-slate-900 border border-slate-700 rounded-md text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500">
                  {bulkDomains.split('\n').filter(Boolean).length} Domains found
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-yellow-500/80 bg-yellow-500/10 p-3 rounded border border-yellow-500/20">
                  <strong>Note:</strong> IPs and Domains will be paired 1-to-1 based on line number. Ensure the order matches. Existing IPs on the server will be skipped.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deploy Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleDeploy}
          disabled={isInstalling}
          className="bg-blue-600 hover:bg-blue-700 px-8"
        >
          {isInstalling ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Initializing...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5 mr-2" />
              Initialize Deployment
            </>
          )}
        </Button>
      </div>

      {/* Live Console Output */}
      {showLogs && (
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Live Console Output
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="terminal rounded-lg p-4 h-[400px] overflow-y-auto font-mono text-sm">
              {logs ? (
                logs.split('\n').map((line, index) => (
                  <div key={index} className={`terminal-log log-${getLogType(line)}`}>
                    {line}
                  </div>
                ))
              ) : (
                <div className="terminal-log log-info">Waiting for deployment to start...</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
