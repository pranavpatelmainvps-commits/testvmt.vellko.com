import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  DeploymentConfig,
  InstallResponse,
  LogsResponse,
  EmailsResponse,
  DNSZone,
  InboundEmail
} from '@/types';

import { fetchApi } from '@/lib/api';

// Hook for installation
export function useInstall() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InstallResponse | null>(null);

  const install = useCallback(async (config: DeploymentConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchApi<InstallResponse>('/install', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { install, isLoading, error, data };
}

// Hook for log streaming
export function useLogStream(enabled: boolean = false) {
  const [logs, setLogs] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLengthRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    setIsConnected(true);
    lastLengthRef.current = 0;

    const pollLogs = async () => {
      try {
        const result = await fetchApi<LogsResponse>('/install_logs');
        if (result.logs && result.logs.length > lastLengthRef.current) {
          setLogs(result.logs);
          lastLengthRef.current = result.logs.length;
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      }
    };

    pollLogs();
    intervalRef.current = setInterval(pollLogs, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled]);

  const clearLogs = useCallback(() => {
    setLogs('');
    lastLengthRef.current = 0;
  }, []);

  return { logs, isConnected, clearLogs };
}

// Hook for inbound emails
export function useInboundEmails(pollInterval: number = 5000) {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    try {
      const result = await fetchApi<EmailsResponse>('/api/inbound/emails');
      setEmails(result.emails || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, pollInterval);
    return () => clearInterval(interval);
  }, [fetchEmails, pollInterval]);

  return { emails, error, refetch: fetchEmails };
}

// Hook for DNS records
export function useDNSRecords() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DNSZone | null>(null);

  const searchDNS = useCallback(async (domain: string) => {
    if (!domain.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchApi<DNSZone>(`/dns/records?domain=${encodeURIComponent(domain)}`);
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch DNS records');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { searchDNS, isLoading, error, data };
}

// Hook for DNS Info Generation
export function useDNSInfo() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    domain: string;
    server_ip: string;
    spf: string;
    dkim: string;
    dmarc: string;
    ns_records: Array<{ host: string; value: string }>;
  } | null>(null);

  const fetchDNSInfo = useCallback(async (domain: string) => {
    if (!domain.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchApi<any>('/api/dns/info', {
        method: 'POST',
        body: JSON.stringify({ domain }),
      });
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch DNS info');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fetchDNSInfo, isLoading, error, data };
}

// Hook for server logs via SSH
export function useServerLogs() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');

  const fetchLogs = useCallback(async (serverIp: string, sshUser: string, sshPass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchApi<{ logs: string; status: string }>('/logs', {
        method: 'POST',
        body: JSON.stringify({ server_ip: serverIp, ssh_user: sshUser, ssh_pass: sshPass }),
      });
      setLogs(result.logs);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fetchLogs, isLoading, error, logs };
}

// Mock data for development/demo
export function useMockServiceStatus(): { services: Array<{ name: string; status: 'ok' | 'warning' | 'error'; icon: string }> } {
  return {
    services: [
      { name: 'Dashboard', status: 'ok', icon: 'LayoutDashboard' },
      { name: 'Inbound', status: 'ok', icon: 'Mail' },
      { name: 'Dovecot', status: 'ok', icon: 'Server' },
      { name: 'Postfix', status: 'ok', icon: 'Send' },
      { name: 'MariaDB', status: 'ok', icon: 'Database' },
    ],
  };
}

export function useMockDomainMappings(): { mappings: Array<{ ip: string; domain: string; ptrStatus: 'verified' | 'fix' | 'pending' }> } {
  return {
    mappings: [
      { ip: '192.168.1.10', domain: 'mail.example.com', ptrStatus: 'verified' },
      { ip: '192.168.1.20', domain: 'smtp.testdomain.net', ptrStatus: 'verified' },
      { ip: '192.168.1.30', domain: 'mail.misstsiph.com', ptrStatus: 'fix' },
      { ip: '192.168.1.40', domain: 'sender.domain.org', ptrStatus: 'verified' },
      { ip: '192.168.1.50', domain: 'host.mailserver.net', ptrStatus: 'verified' },
    ],
  };
}

export function useMockInboundEmails(): { emails: InboundEmail[] } {
  return {
    emails: [
      { id: '1', subject: 'Password Reset', sender: 'noreply@service.com', domain: 'Bomany.com', messageType: 'bounce', timestamp: new Date().toISOString() },
      { id: '2', subject: 'Meeting Reminder', sender: 'jane@company.com', domain: 'Bomany.com', messageType: 'reply', timestamp: new Date().toISOString() },
      { id: '3', subject: 'Delivery Failed: Order #12345', sender: 'sales@shopsite.com', domain: 'shopsite.com', messageType: 'bounce', timestamp: new Date().toISOString() },
      { id: '4', subject: 'Re: Project Update', sender: 'mike@bizcorp.com', domain: 'Bomany.com', messageType: 'reply', timestamp: new Date().toISOString() },
      { id: '5', subject: 'Undelivered Mail Alert', sender: 'mailer-daemon@domain.com', domain: 'domain.com', messageType: 'bounce', timestamp: new Date().toISOString() },
    ],
  };
}
