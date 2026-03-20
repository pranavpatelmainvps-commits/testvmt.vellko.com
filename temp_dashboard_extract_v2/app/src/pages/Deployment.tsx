import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Rocket, Plus, Trash2, Server, User, Lock, CheckCircle,
  FileText, List, ArrowLeft, Wifi, WifiOff, RefreshCw, Globe, Zap, Hash,
  Loader2, CheckCircle2, Circle, XCircle, Shield, Monitor, AlertTriangle, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useInstall, useLogStream, useInstallProgress } from '@/hooks/useApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';

const isIPv4 = (ip: string) => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
const isValidIPField = (input: string) => {
  if (isIPv4(input)) return true;
  if (input.includes('/')) {
    const [ip, cidr] = input.split('/');
    return isIPv4(ip) && /^\d+$/.test(cidr) && parseInt(cidr, 10) <= 32;
  }
  if (input.includes('-')) {
    const [start, end] = input.split('-');
    return isIPv4(start) && isIPv4(end);
  }
  return false;
};
const isValidDomain = (domain: string) => /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain);

// ---- Types ----
interface SavedServer {
  id: number;
  host_ip: string;
  ssh_username: string;
  ssh_port: number;
  installed_at: string;
  domain?: string;
}

interface MappingRow {
  id: string;
  domain: string;
  ip: string;
}

interface CheckResult {
  status: 'pass' | 'warn' | 'fail' | 'info';
  detail: string;
  [key: string]: any;
}

interface AdvancedTestResult {
  success: boolean;
  message: string;
  checks: Record<string, CheckResult>;
  os?: string | null;
  pmta_installed?: boolean;
  ports_in_use?: string[];
  ram_mb?: number | null;
  disk_available?: string | null;
  cpu_cores?: number | null;
  load_average?: string | null;
  is_root?: boolean | null;
  package_manager?: string | null;
  port25_outbound?: boolean | null;
  ssh_latency_ms?: number | null;
  warnings?: string[];
  errors?: string[];
  score?: number;
  status?: 'ready' | 'warning' | 'failed';
}

type PageView = 'server-list' | 'add-server' | 'deploy';

export function Deployment() {
  // Page state
  const [view, setView] = useState<PageView>('server-list');
  const [servers, setServers] = useState<SavedServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<SavedServer | null>(null);
  const [isLoadingServers, setIsLoadingServers] = useState(true);

  // Add Server form
  const [newIp, setNewIp] = useState('');
  const [newUser, setNewUser] = useState('root');
  const [newPass, setNewPass] = useState('');
  const [newPort, setNewPort] = useState('22');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [advancedResult, setAdvancedResult] = useState<AdvancedTestResult | null>(null);

  // Deploy form
  const [deployPass, setDeployPass] = useState('');
  const [tempPass, setTempPass] = useState(''); // Temp for unlock card
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [mappings, setMappings] = useState<MappingRow[]>([{ id: '1', domain: '', ip: '' }]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkIPs, setBulkIPs] = useState('');
  const [bulkDomains, setBulkDomains] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  const { install, isLoading: isInstalling } = useInstall();
  const { logs, isConnected, clearLogs } = useLogStream(showLogs);
  const { data: progressData } = useInstallProgress(showLogs);
  const [polledLogs, setPolledLogs] = useState<string[]>([]);
  const [logOffset, setLogOffset] = useState(0);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const pollerRef = useRef<number | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleDownloadLogs = () => {
    if (!polledLogs || polledLogs.length === 0) return;
    const text = polledLogs.join('\n') + '\n';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-logs-${ts}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ---- Fetch Servers ----
  const fetchServers = useCallback(async () => {
    setIsLoadingServers(true);
    try {
      const result = await fetchApi<{ servers: SavedServer[] }>('/api/servers');
      setServers(result.servers || []);
    } catch {
      setServers([]);
    } finally {
      setIsLoadingServers(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const deploymentFinished = progressData?.status === 'completed' || progressData?.status === 'complete' || progressData?.status === 'failed' || progressData?.status === 'error';
  const deploymentFailed = progressData?.status === 'failed' || progressData?.status === 'error';

  useEffect(() => {
    if (!showLogs) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetchApi<{ logs: string[]; next_offset: number }>(`/api/logs?offset=${logOffset}`);
        if (cancelled) return;
        if (Array.isArray(res?.logs) && res.logs.length > 0) {
          setPolledLogs(prev => [...prev, ...res.logs]);
        }
        if (typeof res?.next_offset === 'number') {
          setLogOffset(res.next_offset);
        }
      } catch {
        // keep polling silently
      }
    };

    // Reset on new deployment session
    setPolledLogs([]);
    setLogOffset(0);
    tick();

    pollerRef.current = window.setInterval(() => {
      if (!deploymentFinished) tick();
    }, 2000);

    return () => {
      cancelled = true;
      if (pollerRef.current) {
        window.clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLogs]);

  useEffect(() => {
    if (!showLogs) return;
    if (deploymentFinished && pollerRef.current) {
      window.clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
  }, [deploymentFinished, showLogs]);

  useEffect(() => {
    if (!showLogs) return;
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [polledLogs, showLogs]);

  // ---- Test SSH (Full Validation) ----
  const handleTestConnection = async () => {
    if (!newIp || !newUser || !newPass) {
      toast.error('Fill all fields first');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    setAdvancedResult(null);
    try {
      // Uses /api/server/test-ssh which calls validate_ssh_server()
      // and returns full result (os, ram, disk, cpu, score, warnings, etc.)
      const result = await fetchApi<AdvancedTestResult>('/api/server/test-ssh', {
        method: 'POST',
        body: JSON.stringify({
          host: newIp,
          username: newUser,
          password: newPass,
          port: parseInt(newPort),
        }),
      });
      console.log('[TestSSH] Full validation result:', result);
      setAdvancedResult(result);
      if (result.success) {
        setTestResult('success');
        toast.success(result.message || 'Server validation passed!');
      } else {
        setTestResult('fail');
        toast.error(result.message || (result.errors?.join(', ')) || 'Validation failed');
      }
    } catch (err) {
      setTestResult('fail');
      toast.error('Connection failed: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setIsTesting(false);
    }
  };

  const precheckStatus = advancedResult?.status ?? (advancedResult && advancedResult.success === false ? 'failed' : undefined);
  const precheckScore = typeof advancedResult?.score === 'number' ? advancedResult?.score : null;
  const precheckBadge = precheckStatus === 'ready'
    ? "bg-green-500/10 text-green-400 border-green-500/20"
    : precheckStatus === 'warning'
      ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
      : precheckStatus === 'failed'
        ? "bg-red-500/10 text-red-400 border-red-500/20"
        : "bg-slate-700/20 text-slate-300 border-slate-700/40";

  // Use backend-generated warnings if available, fallback to client-side
  const precheckWarnings: string[] = advancedResult?.warnings && advancedResult.warnings.length > 0
    ? advancedResult.warnings
    : (() => {
        const w: string[] = [];
        if (advancedResult?.pmta_installed) w.push("PMTA already installed");
        if ((advancedResult?.ports_in_use?.length || 0) > 0) w.push("Ports already in use");
        if (typeof advancedResult?.ram_mb === 'number' && advancedResult.ram_mb < 2048) w.push("Low RAM");
        if (precheckStatus === 'warning') w.push("Proceed with caution");
        return w;
      })();

  // ---- Save & Deploy from Add Server ----
  const handleSaveAndDeploy = () => {
    if (!newIp || !newUser || !newPass) {
      toast.error('Fill all connection fields');
      return;
    }
    // Move to deploy view with this new server info
    setSelectedServer({
      id: 0, // new server, not yet saved
      host_ip: newIp,
      ssh_username: newUser,
      ssh_port: parseInt(newPort),
      installed_at: '',
    });
    setDeployPass(newPass);
    setTempPass('');
    setIsUnlocked(true); // Already have password from add server flow
    setMappings([{ id: '1', domain: '', ip: '' }]);
    setBulkIPs('');
    setBulkDomains('');
    setShowLogs(false);
    clearLogs();
    setView('deploy');
  };

  // ---- Select existing server ----
  const handleSelectServer = (server: SavedServer) => {
    setSelectedServer(server);
    setDeployPass(''); // User must re-enter password for security
    setTempPass('');
    setIsUnlocked(false);
    setMappings([{ id: '1', domain: '', ip: '' }]);
    setBulkIPs('');
    setBulkDomains('');
    setShowLogs(false);
    clearLogs();
    setView('deploy');
  };

  const isFormValid = () => {
    if (bulkMode) {
      const ips = bulkIPs.split('\n').map(s => s.trim()).filter(Boolean);
      const domains = bulkDomains.split('\n').map(s => s.trim()).filter(Boolean);
      if (ips.length === 0 || domains.length === 0) return false;
      if (ips.length !== domains.length) return false;
      return ips.every(ip => isValidIPField(ip)) && domains.every(d => isValidDomain(d));
    } else {
      const validRows = mappings.filter(m => m.domain || m.ip);
      if (validRows.length === 0) return false;
      return validRows.every(m => m.domain && m.ip && isValidDomain(m.domain) && isValidIPField(m.ip));
    }
  };

  // ---- Deploy ----
  const handleDeploy = async () => {
    if (!selectedServer) return;
    if (!deployPass) {
      toast.error('Enter the SSH password for this server');
      return;
    }
    if (!isFormValid()) {
      toast.error('Please fix validation errors before deploying');
      return;
    }

    let validMappings: { domain: string; ip: string }[] = [];

    if (bulkMode) {
      const ips = bulkIPs.split('\n').map(s => s.trim()).filter(Boolean);
      const domains = bulkDomains.split('\n').map(s => s.trim()).filter(Boolean);
      if (ips.length === 0) { toast.error('Add at least one IP'); return; }
      if (ips.length !== domains.length) {
        toast.error(`Mismatch: ${ips.length} IPs vs ${domains.length} domains`);
        return;
      }
      validMappings = ips.map((ip, i) => ({ ip, domain: domains[i] }));
    } else {
      validMappings = mappings.filter(m => m.domain && m.ip).map(m => ({ domain: m.domain, ip: m.ip }));
      if (validMappings.length === 0) { toast.error('Add at least one domain mapping'); return; }
    }

    try {
      clearLogs();
      setShowLogs(true);
      await install({
        server_ip: selectedServer.host_ip,
        ssh_user: selectedServer.ssh_username,
        ssh_pass: deployPass,
        mappings: validMappings,
        mode: 'install',
      });
      toast.success('Deployment started!');
    } catch (err) {
      setShowLogs(false);
      toast.error('Deploy failed: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const handleRetryDeploy = async () => {
    if (!selectedServer) return;
    if (!deployPass) {
      toast.error('Enter the SSH password for this server');
      return;
    }
    if (!isFormValid()) {
      toast.error('Please fix validation errors before deploying');
      return;
    }

    setIsRetrying(true);
    try {
      clearLogs();
      setPolledLogs([]);
      setLogOffset(0);
      setShowLogs(false);
      setTimeout(() => setShowLogs(true), 0);

      let validMappings: { domain: string; ip: string }[] = [];
      if (bulkMode) {
        const ips = bulkIPs.split('\n').map(s => s.trim()).filter(Boolean);
        const domains = bulkDomains.split('\n').map(s => s.trim()).filter(Boolean);
        if (ips.length === 0) { toast.error('Add at least one IP'); return; }
        if (ips.length !== domains.length) {
          toast.error(`Mismatch: ${ips.length} IPs vs ${domains.length} domains`);
          return;
        }
        validMappings = ips.map((ip, i) => ({ ip, domain: domains[i] }));
      } else {
        validMappings = mappings.filter(m => m.domain && m.ip).map(m => ({ domain: m.domain, ip: m.ip }));
        if (validMappings.length === 0) { toast.error('Add at least one domain mapping'); return; }
      }

      await install({
        server_ip: selectedServer.host_ip,
        ssh_user: selectedServer.ssh_username,
        ssh_pass: deployPass,
        mappings: validMappings,
        mode: 'install',
      });
      toast.success('Deployment retry started!');
    } catch (err) {
      toast.error('Retry failed: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setIsRetrying(false);
    }
  };

  // ---- Mapping helpers ----
  const addMapping = () => {
    setMappings([...mappings, { id: Date.now().toString(), domain: '', ip: '' }]);
  };
  const removeMapping = (id: string) => {
    if (mappings.length > 1) setMappings(mappings.filter(m => m.id !== id));
  };
  const updateMapping = (id: string, field: 'domain' | 'ip', value: string) => {
    setMappings(mappings.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const getLogType = (line: string): 'info' | 'success' | 'error' | 'warn' => {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('failed') || lower.includes('!!!')) return 'error';
    if (lower.includes('success') || lower.includes('completed') || lower.includes('✅')) return 'success';
    if (lower.includes('warning') || lower.includes('⚠')) return 'warn';
    return 'info';
  };

  // ========== RENDER: SERVER LIST ==========
  if (view === 'server-list') {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Rocket className="w-6 h-6 text-blue-500" />
              Server Deployment
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Select a server to deploy or add a new one</p>
          </div>
          <Button
            onClick={() => {
              setNewIp(''); setNewUser('root'); setNewPass(''); setNewPort('22');
              setTestResult(null);
              setShowLogs(false);
              clearLogs();
              setView('add-server');
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Server
          </Button>
        </div>

        {/* Server Cards */}
        {isLoadingServers ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading servers...</span>
          </div>
        ) : servers.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Server className="w-12 h-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Servers Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Add your first server to get started with VelkoMTA deployment.
              </p>
              <Button
                onClick={() => {
                  setNewIp(''); setNewUser('root'); setNewPass(''); setNewPort('22');
                  setTestResult(null);
                  setShowLogs(false);
                  clearLogs();
                  setView('add-server');
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Server
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map(server => (
              <Card
                key={server.id}
                className="glass-card dashboard-card cursor-pointer group hover:border-blue-500/40 transition-all"
                onClick={() => handleSelectServer(server)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Server className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{server.host_ip}</p>
                        <p className="text-xs text-muted-foreground">{server.ssh_username}@port {server.ssh_port}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                      Installed
                    </Badge>
                  </div>
                  <Separator className="mb-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {server.installed_at
                        ? new Date(server.installed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </span>
                    <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Deploy →
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Refresh */}
        {servers.length > 0 && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={fetchServers} className="text-muted-foreground">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ========== RENDER: ADD SERVER ==========
  if (view === 'add-server') {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setView('server-list');
              setShowLogs(false);
              clearLogs();
            }}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Plus className="w-6 h-6 text-blue-500" />
              Add New Server
            </h1>
            <p className="text-sm text-muted-foreground">Enter SSH credentials and test the connection</p>
          </div>
        </div>

        <Card className="glass-card max-w-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              Server Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Host IP Address</Label>
                <div className="relative">
                  <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="e.g. 192.168.1.1"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">SSH Port</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="22"
                    value={newPort}
                    onChange={(e) => setNewPort(e.target.value)}
                    className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">SSH Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    value={newUser}
                    onChange={(e) => setNewUser(e.target.value)}
                    className="pl-10 bg-slate-900 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">SSH Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Advanced test results */}
            {advancedResult && (
              <div className="space-y-2">
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium",
                  advancedResult.success
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                )}>
                  {advancedResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {advancedResult.message || (advancedResult.success
                    ? `Server validation passed${typeof advancedResult.score === 'number' ? ` (Score: ${advancedResult.score}/100)` : ''}`
                    : advancedResult.errors?.join(', ') || 'Validation failed')}
                </div>

                {(advancedResult.os || advancedResult.ram_mb != null || advancedResult.disk_available || typeof advancedResult.score === 'number' || advancedResult.status) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                      <span className="text-slate-400">Status</span>
                      <span className={cn("px-2 py-0.5 rounded border text-xs font-semibold uppercase tracking-wide", precheckBadge)}>
                        {advancedResult.status || 'unknown'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                      <span className="text-slate-400">Score</span>
                      <span className="text-white font-mono text-sm">{precheckScore != null ? `${precheckScore}/100` : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                      <span className="text-slate-400">OS</span>
                      <span className="text-white truncate max-w-[60%]" title={advancedResult.os || ''}>{advancedResult.os || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                      <span className="text-slate-400">RAM</span>
                      <span className="text-white font-mono">{advancedResult.ram_mb != null ? `${advancedResult.ram_mb} MB` : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                      <span className="text-slate-400">Disk</span>
                      <span className="text-white font-mono">{advancedResult.disk_available || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                      <span className="text-slate-400">PMTA Installed</span>
                      <span className={cn("font-semibold", advancedResult.pmta_installed ? "text-orange-400" : "text-green-400")}>
                        {advancedResult.pmta_installed ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {advancedResult.cpu_cores != null && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                        <span className="text-slate-400">CPU Cores</span>
                        <span className={cn("font-mono", advancedResult.cpu_cores < 2 ? "text-orange-400" : "text-white")}>
                          {advancedResult.cpu_cores}
                        </span>
                      </div>
                    )}
                    {advancedResult.load_average != null && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                        <span className="text-slate-400">Load Average</span>
                        <span className="text-white font-mono">{advancedResult.load_average}</span>
                      </div>
                    )}
                    {advancedResult.is_root != null && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                        <span className="text-slate-400">Root Access</span>
                        <span className={cn("font-semibold", advancedResult.is_root ? "text-green-400" : "text-red-400")}>
                          {advancedResult.is_root ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                    {advancedResult.package_manager != null && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                        <span className="text-slate-400">Package Manager</span>
                        <span className="text-white font-mono uppercase text-xs">{advancedResult.package_manager}</span>
                      </div>
                    )}
                    {advancedResult.port25_outbound != null && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                        <span className="text-slate-400">Port 25 Outbound</span>
                        <span className={cn("font-semibold", advancedResult.port25_outbound ? "text-green-400" : "text-red-400")}>
                          {advancedResult.port25_outbound ? 'Open' : 'Blocked'}
                        </span>
                      </div>
                    )}
                    {advancedResult.ssh_latency_ms != null && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                        <span className="text-slate-400">SSH Latency</span>
                        <span className={cn("font-mono", advancedResult.ssh_latency_ms > 200 ? "text-orange-400" : "text-white")}>
                          {advancedResult.ssh_latency_ms}ms
                        </span>
                      </div>
                    )}
                    <div className="md:col-span-2 p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-400 shrink-0">Ports in use</span>
                        <div className="text-right">
                          {(advancedResult.ports_in_use && advancedResult.ports_in_use.length > 0) ? (
                            <div className="space-y-1">
                              {advancedResult.ports_in_use.slice(0, 6).map((p, idx) => (
                                <div key={idx} className="text-xs font-mono text-orange-300/90 break-all">{p}</div>
                              ))}
                              {advancedResult.ports_in_use.length > 6 && (
                                <div className="text-xs text-muted-foreground">+{advancedResult.ports_in_use.length - 6} more</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-green-400 font-semibold">None</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {precheckWarnings.length > 0 && (
                  <div className={cn(
                    "p-3 rounded-lg border text-sm",
                    precheckStatus === 'warning'
                      ? "bg-orange-500/10 border-orange-500/20 text-orange-300"
                      : precheckStatus === 'failed'
                        ? "bg-red-500/10 border-red-500/20 text-red-300"
                        : "bg-slate-800/40 border-slate-700 text-slate-300"
                  )}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        {precheckWarnings.map((w, i) => (
                          <div key={i}>{w}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {advancedResult.checks && Object.keys(advancedResult.checks).length > 0 && (
                <div className="grid gap-2">
                  {Object.entries(advancedResult.checks).map(([key, check]) => {
                    const icons: Record<string, any> = {
                      ssh: Wifi, os: Monitor, pmta: Server, ports: Globe, firewall: Shield, error: XCircle
                    };
                    const Icon = icons[key] || Info;
                    const labels: Record<string, string> = {
                      ssh: 'SSH Connection', os: 'Operating System', pmta: 'PMTA Status',
                      ports: 'Port Availability', firewall: 'Firewall', error: 'Error'
                    };
                    const statusColors: Record<string, string> = {
                      pass: 'text-green-400 bg-green-500/10 border-green-500/20',
                      warn: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
                      fail: 'text-red-400 bg-red-500/10 border-red-500/20',
                      info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                    };
                    const statusIcons: Record<string, any> = {
                      pass: CheckCircle2, warn: AlertTriangle, fail: XCircle, info: Info
                    };
                    const StatusIcon = statusIcons[check.status] || Circle;
                    return (
                      <div key={key} className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border text-sm",
                        statusColors[check.status] || 'text-slate-400 bg-slate-800/50 border-slate-700'
                      )}>
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="font-medium min-w-[130px]">{labels[key] || key}</span>
                        <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs opacity-90 truncate flex-1">{check.detail}</span>
                        {key === 'ports' && check.results && (
                          <div className="flex gap-1 ml-auto">
                            {Object.entries(check.results as Record<string, string>).map(([port, status]) => (
                              <span key={port} className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-mono",
                                status === 'available' ? 'bg-green-500/20 text-green-400' :
                                status === 'in_use' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-slate-700 text-slate-400'
                              )}>{port}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}

            {/* Simple fallback badge if no advanced result */}
            {testResult && !advancedResult && (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg border text-sm",
                testResult === 'success'
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              )}>
                {testResult === 'success' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {testResult === 'success' ? 'SSH connection verified!' : 'Connection failed — check credentials'}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || !newIp || !newPass}
                className="border-slate-700"
              >
                {isTesting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                  <Wifi className="w-4 h-4 mr-2" />
                )}
                Test Connection
              </Button>
              <Button
                onClick={handleSaveAndDeploy}
                disabled={!newIp || !newPass || precheckStatus === 'failed'}
                className="bg-blue-600 hover:bg-blue-700 flex-1"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Continue to Deploy
              </Button>
            </div>
            {precheckStatus === 'warning' && (
              <p className="text-xs text-orange-300/90">
                Warning: server pre-check returned warnings. You can continue, but deployment may fail.
              </p>
            )}
            {precheckStatus === 'failed' && (
              <p className="text-xs text-red-300/90">
                Deployment disabled: server pre-check failed.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== RENDER: DEPLOY TO SELECTED SERVER ==========
  return (
    <div className="p-6 space-y-6">
      {/* Header with Back */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => { setView('server-list'); fetchServers(); }} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Servers
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Rocket className="w-6 h-6 text-blue-500" />
            Deploy to {selectedServer?.host_ip}
          </h1>
          <p className="text-sm text-muted-foreground">Configure domain mappings and start deployment</p>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          {selectedServer?.ssh_username}@{selectedServer?.ssh_port}
        </Badge>
      </div>

      {/* SSH Password (required for existing servers) */}
      {!isUnlocked && (
        <Card className="glass-card max-w-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-white font-medium text-sm">Authentication Required</p>
                <p className="text-xs text-muted-foreground">Enter SSH password for {selectedServer?.host_ip}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Input
                type="password"
                placeholder="SSH Password"
                value={tempPass}
                onChange={(e) => setTempPass(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tempPass) {
                    setDeployPass(tempPass);
                    setIsUnlocked(true);
                    toast.success('Server unlocked');
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (tempPass) {
                    setDeployPass(tempPass);
                    setIsUnlocked(true);
                    toast.success('Server unlocked');
                  }
                }}
                disabled={!tempPass}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Unlock
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain Mappings */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Domain & IP Mappings
          </CardTitle>
          <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
            <Button
              variant={!bulkMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setBulkMode(false)}
              className={!bulkMode ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-400 hover:text-white"}
            >
              <List className="w-4 h-4 mr-1" /> Standard Install
            </Button>
            <Button
              variant={bulkMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setBulkMode(true)}
              className={bulkMode ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-400 hover:text-white"}
            >
              <FileText className="w-4 h-4 mr-1" /> Bulk Onboard
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!bulkMode ? (
            <div className="overflow-x-auto">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={addMapping} className="border-slate-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Row
                </Button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">VelkoMTA Domain</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Sending IP</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping) => (
                    <tr key={mapping.id} className="border-b border-border/50">
                      <td className="py-3 px-4 align-top">
                        <Input
                          placeholder="example.com"
                          value={mapping.domain}
                          onChange={(e) => updateMapping(mapping.id, 'domain', e.target.value)}
                          className={cn("bg-slate-900 border-slate-700 text-white placeholder:text-slate-600", mapping.domain && !isValidDomain(mapping.domain) && "border-red-500 bg-red-500/10")}
                        />
                        {mapping.domain && !isValidDomain(mapping.domain) && (
                          <p className="text-red-500 text-xs mt-1">Invalid domain format</p>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <Input
                          placeholder="1.2.3.4"
                          value={mapping.ip}
                          onChange={(e) => updateMapping(mapping.id, 'ip', e.target.value)}
                          className={cn("bg-slate-900 border-slate-700 text-white placeholder:text-slate-600", mapping.ip && !isValidIPField(mapping.ip) && "border-red-500 bg-red-500/10")}
                        />
                        {mapping.ip && !isValidIPField(mapping.ip) && (
                          <p className="text-red-500 text-xs mt-1">Invalid IPv4 format</p>
                        )}
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
                  placeholder={"1.2.3.4\n1.2.3.5\n..."}
                  className={cn(
                    "w-full h-48 p-3 bg-slate-900 border border-slate-700 rounded-md text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500",
                    bulkIPs.split('\n').some(ip => ip.trim() && !isValidIPField(ip.trim())) && "border-red-500 bg-red-500/5 focus:ring-red-500"
                  )}
                />
                <div className={cn("text-xs flex justify-between", bulkIPs.split('\n').some(ip => ip.trim() && !isValidIPField(ip.trim())) ? "text-red-500" : "text-slate-500")}>
                  <span>{bulkIPs.split('\n').filter(Boolean).length} IPs</span>
                  {bulkIPs.split('\n').some(ip => ip.trim() && !isValidIPField(ip.trim())) && <span>Invalid IP format detected</span>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Domains (One per line)</Label>
                <textarea
                  value={bulkDomains}
                  onChange={(e) => setBulkDomains(e.target.value)}
                  placeholder={"example.com\nmail.test.com\n..."}
                  className={cn(
                    "w-full h-48 p-3 bg-slate-900 border border-slate-700 rounded-md text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500",
                    bulkDomains.split('\n').some(d => d.trim() && !isValidDomain(d.trim())) && "border-red-500 bg-red-500/5 focus:ring-red-500"
                  )}
                />
                <div className={cn("text-xs flex justify-between", bulkDomains.split('\n').some(d => d.trim() && !isValidDomain(d.trim())) ? "text-red-500" : "text-slate-500")}>
                  <span>{bulkDomains.split('\n').filter(Boolean).length} Domains</span>
                  {bulkDomains.split('\n').some(d => d.trim() && !isValidDomain(d.trim())) && <span>Invalid domain format detected</span>}
                </div>
              </div>
              <div className="md:col-span-2 space-y-3">
                <p className="text-sm text-yellow-500/80 bg-yellow-500/10 p-3 rounded border border-yellow-500/20">
                  <strong>Note:</strong> IPs and Domains are paired 1-to-1 by line number. Ensure the order matches.
                </p>
                <p className="text-sm text-blue-400/80 bg-blue-500/10 p-3 rounded border border-blue-500/20">
                  <strong>IP Format Tip:</strong> You can enter single IPs (<code>1.1.1.1</code>), IP ranges (<code>1.1.1.10-1.1.1.20</code>), or CIDR networks (<code>1.1.1.0/24</code>). The system will automatically map the single domain on the same line to all expanded IPs.
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
          disabled={isInstalling || !deployPass || !isFormValid() || precheckStatus === 'failed'}
          className="bg-blue-600 hover:bg-blue-700 px-8 disabled:opacity-50"
        >
          {isInstalling ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Deploying...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5 mr-2" />
              Start Deployment
            </>
          )}
        </Button>
      </div>
      {deploymentFailed && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="lg"
            onClick={handleRetryDeploy}
            disabled={isInstalling || isRetrying || !deployPass || !isFormValid() || precheckStatus === 'failed'}
            className="border-slate-700 text-slate-200"
          >
            {(isInstalling || isRetrying) ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Retrying...
              </>
            ) : (
              "Retry Deployment"
            )}
          </Button>
        </div>
      )}
      {precheckStatus === 'warning' && (
        <p className="text-sm text-orange-300/90 bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg">
          Warning: server pre-check returned warnings. Deployment is allowed, but proceed carefully.
        </p>
      )}
      {precheckStatus === 'failed' && (
        <p className="text-sm text-red-300/90 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
          Deployment disabled: server pre-check failed.
        </p>
      )}

      {/* Active Deployment Details */}
      {showLogs && (
        <Card className="glass-card mb-6 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              Deployment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Server IP</p>
                <p className="text-base font-medium text-white break-all flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-500" />
                  {selectedServer?.host_ip}
                </p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                 <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Domain{bulkMode || mappings.length > 1 ? 's' : ''}</p>
                 <p className="text-base font-medium text-white break-all flex items-center gap-2">
                   <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                   <span className="truncate">
                     {(() => {
                       if (bulkMode) return bulkDomains.split('\n').map(d => d.trim()).filter(Boolean).join(', ') || 'None';
                       return mappings.map(m => m.domain.trim()).filter(Boolean).join(', ') || 'None';
                     })()}
                   </span>
                 </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Polling Log Viewer */}
      {showLogs && (
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Live Logs (Polling)
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {deploymentFinished ? 'Stopped' : 'Polling every 2s'}
              </span>
              {polledLogs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadLogs}
                  disabled={polledLogs.length === 0}
                  className="border-slate-700 text-slate-200"
                >
                  Download Logs
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg p-4 h-[400px] overflow-y-auto font-mono text-sm bg-slate-950 border border-slate-800 text-slate-200 whitespace-pre-wrap">
              {polledLogs.length > 0 ? (
                polledLogs.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))
              ) : (
                <div className="text-slate-400">Waiting for logs...</div>
              )}
              <div ref={logEndRef} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Stepper */}
      {showLogs && progressData && progressData.progress_steps && progressData.progress_steps.length > 0 && (
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Loader2 className={cn("w-5 h-5 text-blue-500", progressData.status !== 'completed' && progressData.status !== 'error' ? "animate-spin" : "")} />
                Installation Progress
              </span>
              <Badge variant="outline" className={cn(
                progressData.status === 'completed' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                  progressData.status === 'error' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    "bg-blue-500/10 text-blue-500 border-blue-500/20"
              )}>
                {progressData.status === 'completed' ? 'Done' : progressData.status === 'error' ? 'Failed' : 'In Progress'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressData.progress_steps.map((step) => (
                <div key={step.id} className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0">
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : step.status === 'in_progress' ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    ) : step.status === 'error' ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-medium",
                      step.status === 'completed' ? "text-slate-300" :
                        step.status === 'in_progress' ? "text-blue-400 font-semibold" :
                          step.status === 'error' ? "text-red-400" : "text-slate-500"
                    )}>
                      {step.name === 'Uploading Files' ? 'Connecting MTA' : step.name === 'Installing PowerMTA' ? 'Installing VelkoMTA' : step.name}
                    </p>
                    {step.status === 'in_progress' && progressData.message && (
                      <p className="text-xs text-muted-foreground mt-1 bg-slate-900/50 p-2 rounded-md border border-slate-800 animate-pulse">
                        {progressData.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Console */}
      {showLogs && (
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Live Console
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
                <div className="terminal-log log-info">Waiting for deployment...</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
