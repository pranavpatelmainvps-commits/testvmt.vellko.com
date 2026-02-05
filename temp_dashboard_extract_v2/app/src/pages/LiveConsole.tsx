import { useState, useRef, useEffect } from 'react';
import { Terminal, Play, Square, Trash2, Download, Server, User, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useServerLogs } from '@/hooks/useApi';
import { toast } from 'sonner';

export function LiveConsole() {
  const [serverIp, setServerIp] = useState('');
  const [sshUser, setSshUser] = useState('root');
  const [sshPass, setSshPass] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [localLogs, setLocalLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  
  const { fetchLogs, isLoading, logs } = useServerLogs();

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [localLogs, logs]);

  const handleStartStreaming = async () => {
    if (!serverIp || !sshUser || !sshPass) {
      toast.error('Please fill in all connection fields');
      return;
    }

    setIsStreaming(true);
    setLocalLogs(prev => [...prev, `Connecting to ${serverIp}...`]);

    try {
      await fetchLogs(serverIp, sshUser, sshPass);
      setLocalLogs(prev => [...prev, 'Connected successfully']);
    } catch (err) {
      setLocalLogs(prev => [...prev, `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`]);
      setIsStreaming(false);
    }
  };

  const handleStopStreaming = () => {
    setIsStreaming(false);
    setLocalLogs(prev => [...prev, 'Stream stopped']);
  };

  const handleClearLogs = () => {
    setLocalLogs([]);
    toast.success('Console cleared');
  };

  const handleDownloadLogs = () => {
    const content = [...localLogs, logs].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmta-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Logs downloaded');
  };

  const getLogType = (line: string): 'info' | 'success' | 'error' | 'warn' => {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('failed') || lower.includes('!!!') || lower.includes('connection failed')) return 'error';
    if (lower.includes('success') || lower.includes('connected') || lower.includes('completed')) return 'success';
    if (lower.includes('warning') || lower.includes('warn')) return 'warn';
    return 'info';
  };

  const allLogs = [...localLogs, ...(logs ? logs.split('\n') : [])];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-blue-500" />
            Live Console
          </h1>
          <p className="text-sm text-muted-foreground">Real-time system logs and monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={isStreaming 
              ? "bg-green-500/10 text-green-500 border-green-500/20" 
              : "bg-slate-500/10 text-slate-500 border-slate-500/20"
            }
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
            {isStreaming ? 'Streaming' : 'Idle'}
          </Badge>
        </div>
      </div>

      {/* Connection Settings */}
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
              <Label htmlFor="console_server_ip" className="text-slate-300">Server IP</Label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="console_server_ip"
                  placeholder="192.168.1.1"
                  value={serverIp}
                  onChange={(e) => setServerIp(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="console_ssh_user" className="text-slate-300">SSH User</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="console_ssh_user"
                  value={sshUser}
                  onChange={(e) => setSshUser(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="console_ssh_pass" className="text-slate-300">SSH Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="console_ssh_pass"
                  type="password"
                  placeholder="••••••••"
                  value={sshPass}
                  onChange={(e) => setSshPass(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            {!isStreaming ? (
              <Button 
                onClick={handleStartStreaming}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Stream
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleStopStreaming}
                variant="destructive"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Stream
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleClearLogs}
              className="border-slate-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDownloadLogs}
              className="border-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Terminal Output */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-500" />
            Console Output
          </CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{allLogs.length} lines</span>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            ref={terminalRef}
            className="terminal rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-sm"
          >
            {allLogs.length === 0 ? (
              <div className="terminal-log log-info">System ready. Start streaming to view logs...</div>
            ) : (
              allLogs.map((line, index) => (
                line.trim() && (
                  <div key={index} className={`terminal-log log-${getLogType(line)}`}>
                    {line}
                  </div>
                )
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
