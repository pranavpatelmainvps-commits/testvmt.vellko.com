import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ExternalLink,
  FileText,
  Globe,
  Rocket,
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react';
import { useLogStream } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// import { useMockDomainMappings, useMockInboundEmails } from '@/hooks/useApi'; // Removed

import { useEffect, useState } from 'react';
import { Key } from 'lucide-react';

interface SystemStatus {
  status: string;
  server_ip?: string;
  smtp_user?: string;
  smtp_pass?: string;
  ssh_user?: string;
  ssh_pass?: string;
  roundcube_url?: string;
  installed_at?: string;
  mappings?: Array<{ ip: string, domain: string }>;
  ptr_results?: Array<{ ip: string, required: string, current: string, status: string }>;
  message?: string;
}

interface InboundEmail {
  subject: string;
  sender: string;
  domain: string;
  messageType: 'bounce' | 'reply' | 'auto';
}


// Installation Status Card Component with Logs
function InstallationStatusCard({ status, message }: { status: string, message?: string }) {
  const [showLogs, setShowLogs] = useState(false);
  const { logs, isConnected } = useLogStream(true); // Always poll when component is mounted
  const logsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current && showLogs) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs, showLogs]);

  // Auto-show logs on error
  useEffect(() => {
    if (status === 'error') {
      setShowLogs(true);
    }
  }, [status]);

  return (
    <Card className={`glass-card mb-6 border-l-4 ${status === 'error' ? 'border-l-red-500' : 'border-l-blue-500'}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            {status === 'error' ? <AlertCircle className="w-5 h-5 text-red-500" /> : <Rocket className="w-5 h-5 text-blue-500 animate-pulse" />}
            {status === 'error' ? 'Installation Error' : 'Installation in Progress'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs text-slate-400 hover:text-white"
          >
            {showLogs ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {showLogs ? 'Hide Logs' : 'View Logs'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-300">
              {message || (status === 'error' ? 'An error occurred during installation.' : 'Deployment is running...')}
            </p>
            {status !== 'error' && (
              <div className="flex items-center gap-2 text-xs text-blue-400 mt-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                Status updates automatically.
              </div>
            )}
          </div>

          {showLogs && (
            <div className="bg-slate-950 rounded-lg border border-slate-800 p-0 overflow-hidden">
              <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Terminal className="w-3 h-3" />
                  <span>install_progress.log</span>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live" />}
                  <Button variant="ghost" size="icon" className="h-4 w-4 text-slate-500 hover:text-white" onClick={() => navigator.clipboard.writeText(logs)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div
                ref={logsRef}
                className="p-3 h-64 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed"
                style={{ scrollBehavior: 'smooth' }}
              >
                {logs || <span className="text-slate-600 italic">Waiting for logs...</span>}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper needed for scroll ref
import { useRef } from 'react';

// Domain PTR Row Component
function DomainPTRRow({
  ip,
  domain,
  ptrStatus
}: {
  ip: string;
  domain: string;
  ptrStatus: 'verified' | 'fix' | 'pending';
}) {
  return (
    <tr className="border-b border-border/50 hover:bg-white/5 transition-colors">
      <td className="py-3 px-4 font-mono text-sm text-slate-300">{ip}</td>
      <td className="py-3 px-4 text-sm text-slate-300">{domain}</td>
      <td className="py-3 px-4">
        {ptrStatus === 'verified' ? (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Verified</span>
          </div>
        ) : ptrStatus === 'fix' ? (
          <Button variant="destructive" size="sm" className="h-7 px-3 text-xs">
            <Wrench className="w-3 h-3 mr-1" />
            Fix
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Pending</span>
          </div>
        )}
      </td>
    </tr>
  );
}

// Inbound Email Item Component
function InboundEmailItem({
  subject,
  sender,
  domain,
  messageType
}: {
  subject: string;
  sender: string;
  domain: string;
  messageType: 'bounce' | 'reply' | 'auto';
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{subject}</p>
        <p className="text-xs text-muted-foreground truncate">{sender}</p>
        <p className="text-xs text-slate-500">{domain}</p>
      </div>
      <Badge
        variant={messageType === 'bounce' ? 'destructive' : messageType === 'reply' ? 'default' : 'secondary'}
        className="ml-2 shrink-0"
      >
        {messageType === 'bounce' ? 'Bounce' : messageType === 'reply' ? 'Reply' : 'Auto'}
      </Badge>
    </div>
  );
}

// Quick Link Card Component
function QuickLinkCard({
  title,
  icon: Icon,
  href
}: {
  title: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-card dashboard-card p-4 flex items-center gap-4 rounded-lg cursor-pointer group"
    >
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{title}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
    </a>
  );
}

export function Dashboard() {

  // const { mappings } = useMockDomainMappings(); // Removed
  // const { emails } = useMockInboundEmails(); // Removed

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({ status: 'loading' });
  const [inboundEmails, setInboundEmails] = useState<InboundEmail[]>([]);

  // Derived state for mappings to match UI format
  const domainMappings = (systemStatus.mappings || []).map(m => {
    // Check if there is a failure for this IP
    const failure = (systemStatus.ptr_results || []).find(f => f.ip === m.ip);
    return {
      ip: m.ip,
      domain: m.domain,
      ptrStatus: failure ? 'fix' : 'verified'
    };
  });

  useEffect(() => {
    // Poll for status
    const fetchStatus = () => {
      fetch('/api/status')
        .then(res => res.json())
        .then(data => setSystemStatus(data))
        .catch(err => console.error('Failed to fetch status:', err));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Poll for inbound emails
    const fetchEmails = () => {
      fetch('/api/inbound/emails')
        .then(res => res.json())
        .then(data => {
          // Transform backend format to UI format if needed
          // Backend returns { "emails": [...] }
          // Assuming backend structure matches or needs slight mapping
          // For now, let's assume backend stores "subject", "sender", etc.
          // If not, we might need to map it.
          // The backend 'inbound_webhook' accepts data.
          setInboundEmails(data.emails || []);
        })
        .catch(err => console.error('Failed to fetch emails:', err));
    };

    fetchEmails();
    const interval = setInterval(fetchEmails, 5000); // 5s poll
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setSystemStatus(data))
      .catch(err => console.error('Failed to fetch status:', err));
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor your PowerMTA infrastructure</p>
        </div>

      </div>



      {/* Main Content Grid */}

      {/* Installation Progress / Status Card */}
      {(systemStatus.status === 'installing' || systemStatus.status === 'error' || systemStatus.status === 'started') && (
        <InstallationStatusCard
          status={systemStatus.status}
          message={systemStatus.message}
        />
      )}

      {/* Domain & PTR Identity Check */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Globe className="w-5 h-5 text-blue-500" />
              Domain & PTR Identity Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/50 text-xs uppercase text-slate-500">
                    <th className="py-2 px-4 font-medium">IP Address</th>
                    <th className="py-2 px-4 font-medium">Assigned Domain</th>
                    <th className="py-2 px-4 font-medium">PTR Status</th>
                  </tr>
                </thead>
                <tbody>
                  {domainMappings.length > 0 ? (
                    domainMappings.map((mapping, i) => (
                      <DomainPTRRow
                        key={i}
                        ip={mapping.ip}
                        domain={mapping.domain}
                        ptrStatus={mapping.ptrStatus as any}
                      />
                    ))
                  ) : (
                    <tr><td colSpan={3} className="text-center py-4 text-slate-500">No domains configured</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Live Inbound Feed */}
        <Card className="glass-card dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Mail className="w-5 h-5 text-purple-500" />
              Live Inbound Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {inboundEmails.length > 0 ? (
                inboundEmails.map((email, i) => (
                  <InboundEmailItem
                    key={i}
                    subject={email.subject}
                    sender={email.sender}
                    domain={email.domain || 'unknown'}
                    messageType={email.messageType || 'reply'}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No inbound emails received yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Access Credentials */}
      {systemStatus.status === 'installed' && (
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-500" />
              Access Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">SMTP Host</p>
                <p className="text-sm font-mono text-white">{systemStatus.server_ip} (Port 2525)</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Roundcube / IMAP Username</p>
                <p className="text-sm font-mono text-white">{systemStatus.smtp_user || 'admin'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Password</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-white bg-slate-900 px-2 py-1 rounded">{systemStatus.smtp_pass}</p>
                </div>
              </div>
            </div>

            {/* SSH Credentials Section */}
            <div className="mt-6 pt-4 border-t border-border/50 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">SSH Host</p>
                <p className="text-sm font-mono text-white">{systemStatus.server_ip} (Port 22)</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">SSH Username</p>
                <p className="text-sm font-mono text-white">{systemStatus.ssh_user || 'root'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">SSH Password</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-white bg-slate-900 px-2 py-1 rounded">{systemStatus.ssh_pass}</p>
                </div>
              </div>
            </div>

            {/* Standard Mailboxes Section */}
            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground uppercase mb-2">Standard Mailboxes (Created for each domain)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['postmaster', 'abuse', 'reply', 'support'].map(user => (
                  <div key={user} className="bg-slate-900/50 p-2 rounded text-xs text-slate-300 font-mono border border-slate-700/50">
                    {user}@&lt;domain&gt;
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                * Password for all mailboxes is the same as the <strong>SMTP Password</strong> above.
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-blue-400">Note:</span> Use these credentials for SMTP authentication (Port 2525) and Roundcube login.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Deployment */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Configuration Deployment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select defaultValue="v2.4.1">
              <SelectTrigger className="w-[280px] bg-slate-900 border-slate-700">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="v2.4.1">v2.4.1 — Authoritative Mode</SelectItem>
                <SelectItem value="v2.4.0">v2.4.0 — Standard Mode</SelectItem>
                <SelectItem value="v2.3.9">v2.3.9 — Legacy Mode</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Deploy Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickLinkCard
          title="Roundcube Webmail"
          icon={Mail}
          href={`http://${window.location.hostname}:80`}
        />
        <QuickLinkCard
          title="PowerDNS Admin"
          icon={Globe}
          href={`http://${window.location.hostname}:9191`}
        />
      </div>
    </div>
  );
}
