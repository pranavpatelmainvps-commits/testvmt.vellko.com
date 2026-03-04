import { useState, useEffect, useCallback } from 'react';
import {
    Server, RefreshCw, Trash2, Settings, Wifi, WifiOff,
    Clock, ExternalLink, Mail
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { motion, type Variants } from 'framer-motion';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface InstalledServer {
    id: number;
    host_ip: string;
    ssh_username: string;
    ssh_port: number;
    installed_at: string;
    domain?: string;
    status?: string;
}

export function InstalledServers() {
    const [servers, setServers] = useState<InstalledServer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [testingId, setTestingId] = useState<number | null>(null);
    const [testResults, setTestResults] = useState<Record<number, 'success' | 'fail'>>({});

    const fetchServers = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await fetchApi<{ servers: InstalledServer[] }>('/api/servers');
            setServers(result.servers || []);
        } catch {
            setServers([]);
            toast.error('Failed to load servers');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchServers();
    }, [fetchServers]);

    const handleTestConnection = async (server: InstalledServer) => {
        setTestingId(server.id);
        try {
            const result = await fetchApi<{ success: boolean; message: string }>('/api/test-ssh', {
                method: 'POST',
                body: JSON.stringify({ server_id: server.id }),
            });
            setTestResults(prev => ({ ...prev, [server.id]: result.success ? 'success' : 'fail' }));
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (err) {
            setTestResults(prev => ({ ...prev, [server.id]: 'fail' }));
            toast.error('Connection test failed');
        } finally {
            setTestingId(null);
        }
    };

    const handleDelete = async (serverId: number) => {
        if (!confirm('Are you sure you want to remove this server?')) return;
        try {
            await fetchApi(`/api/servers/${serverId}`, { method: 'DELETE' });
            toast.success('Server removed');
            fetchServers();
        } catch {
            toast.error('Failed to remove server');
        }
    };

    return (
        <motion.div
            className="p-6 space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Server className="w-6 h-6 text-blue-500" />
                        Installed Servers
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your deployed VelkoMTA servers
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchServers} className="text-muted-foreground">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </motion.div>

            {/* Loading */}
            {isLoading ? (
                <motion.div variants={itemVariants} className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <span className="ml-3 text-muted-foreground">Loading servers...</span>
                </motion.div>
            ) : servers.length === 0 ? (
                <motion.div variants={itemVariants}>
                    <Card className="glass-card">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <Server className="w-12 h-12 text-slate-600 mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">No Installed Servers</h3>
                            <p className="text-muted-foreground max-w-sm">
                                Go to <strong>New Deployment</strong> to install VelkoMTA on a server.
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            ) : (
                <div className="space-y-4">
                    {servers.map(server => {
                        const testResult = testResults[server.id];
                        return (
                            <motion.div key={server.id} variants={itemVariants}>
                                <Card className="glass-card dashboard-card">
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-5">
                                            {/* Server Icon */}
                                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                <Server className="w-6 h-6 text-blue-500" />
                                            </div>

                                            {/* Server Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-semibold text-white">{server.host_ip}</h3>
                                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                                        Installed
                                                    </Badge>
                                                    {testResult && (
                                                        <Badge
                                                            variant="outline"
                                                            className={testResult === 'success'
                                                                ? "bg-green-500/10 text-green-400 border-green-500/20 text-xs"
                                                                : "bg-red-500/10 text-red-400 border-red-500/20 text-xs"
                                                            }
                                                        >
                                                            {testResult === 'success' ? (
                                                                <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> Reachable</span>
                                                            ) : (
                                                                <span className="flex items-center gap-1"><WifiOff className="w-3 h-3" /> Unreachable</span>
                                                            )}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Settings className="w-3.5 h-3.5" />
                                                        {server.ssh_username}@port {server.ssh_port}
                                                    </span>
                                                    {server.installed_at && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {new Date(server.installed_at).toLocaleDateString('en-IN', {
                                                                day: 'numeric', month: 'short', year: 'numeric',
                                                                hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTestConnection(server)}
                                                    disabled={testingId === server.id}
                                                    className="border-slate-700 text-slate-300"
                                                >
                                                    {testingId === server.id ? (
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <span className="flex items-center gap-1"><Wifi className="w-4 h-4" /> Test</span>
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => window.open(`http://${server.host_ip}:8000`, '_blank')}
                                                    className="border-slate-700 text-slate-300"
                                                    title="Open Roundcube Webmail"
                                                >
                                                    <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> Webmail</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => window.open(`http://${server.host_ip}:8080`, '_blank')}
                                                    className="border-slate-700 text-slate-300"
                                                    title="Open VelkoMTA Web Monitor"
                                                >
                                                    <span className="flex items-center gap-1"><ExternalLink className="w-4 h-4" /> Monitor</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(server.id)}
                                                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                    title="Remove server"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Server Count */}
            {servers.length > 0 && (
                <motion.div variants={itemVariants}>
                    <p className="text-center text-xs text-muted-foreground">
                        {servers.length} server{servers.length > 1 ? 's' : ''} installed
                    </p>
                </motion.div>
            )}
        </motion.div>
    );
}
