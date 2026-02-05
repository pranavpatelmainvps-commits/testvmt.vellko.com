import { useState, useCallback, useEffect } from 'react';
import type {
  PMTAConfig,
  VMTAConfig,
  VMTAPool,
  BounceRule,
  SMTPSource,
  SMTPUser,
  ConfigValidationResult,
  ConfigExport
} from '@/types';

const API_BASE = '/api/pmta';

// Generic fetch wrapper
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Hook for managing complete PMTA configuration
export function usePMTAConfig() {
  const [config, setConfig] = useState<PMTAConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current configuration
  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchApi<PMTAConfig>('/config');
      setConfig(result);
      setHasChanges(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch config');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save configuration
  const saveConfig = useCallback(async (newConfig: PMTAConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchApi<{ status: string; message: string }>('/config', {
        method: 'POST',
        body: JSON.stringify(newConfig),
      });
      setConfig(newConfig);
      setHasChanges(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply configuration (restart PMTA)
  const applyConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchApi<{ status: string; message: string }>('/config/apply', {
        method: 'POST',
      });
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply config');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Validate configuration
  const validateConfig = useCallback(async (configToValidate: PMTAConfig) => {
    try {
      const result = await fetchApi<ConfigValidationResult>('/config/validate', {
        method: 'POST',
        body: JSON.stringify(configToValidate),
      });
      return result;
    } catch (err) {
      throw err;
    }
  }, []);

  // Export configuration
  const exportConfig = useCallback(async (format: 'json' | 'xml' | 'conf' = 'json') => {
    try {
      const result = await fetchApi<ConfigExport>(`/config/export?format=${format}`);
      return result;
    } catch (err) {
      throw err;
    }
  }, []);

  // Import configuration
  const importConfig = useCallback(async (content: string, format: 'json' | 'xml' | 'conf' = 'json') => {
    setIsLoading(true);
    try {
      const result = await fetchApi<{ status: string; config: PMTAConfig }>('/config/import', {
        method: 'POST',
        body: JSON.stringify({ content, format }),
      });
      setConfig(result.config);
      setHasChanges(true);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import config');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update local config without saving
  const updateLocalConfig = useCallback((updater: (config: PMTAConfig) => PMTAConfig) => {
    setConfig(prev => {
      const baseConfig = prev || defaultPMTAConfig;
      console.log('Updating local config', { from: prev ? 'existing' : 'default' });
      const updated = updater(baseConfig);
      setHasChanges(true);
      return updated;
    });
  }, []);

  // Reset to default configuration
  const resetConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchApi<PMTAConfig>('/config/reset', {
        method: 'POST',
      });
      setConfig(result);
      setHasChanges(true);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset config');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update Credentials
  const updateCredentials = useCallback(async (server_ip: string, ssh_user: string, ssh_pass: string) => {
    setIsLoading(true);
    try {
      await fetchApi('/config/update_credentials', {
        method: 'POST',
        body: JSON.stringify({ server_ip, ssh_user, ssh_pass }),
      });
      // Retry fetch immediately
      await fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update credentials');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchConfig]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    isLoading,
    error,
    hasChanges,
    fetchConfig,
    saveConfig,
    applyConfig,
    validateConfig,
    exportConfig,
    importConfig,
    updateLocalConfig,
    resetConfig,
    updateCredentials,
  };
}

// Hook for VMTA management
export function useVMTAManager(_config: PMTAConfig | null, updateConfig: (updater: (config: PMTAConfig) => PMTAConfig) => void) {
  const addVMTA = useCallback((vmta: Omit<VMTAConfig, 'id'>) => {
    const newVMTA: VMTAConfig = {
      ...vmta,
      id: `vmta-${Date.now()}`,
    };
    updateConfig(prev => ({
      ...prev,
      vmtas: [...prev.vmtas, newVMTA],
    }));
    return newVMTA;
  }, [updateConfig]);

  const updateVMTA = useCallback((id: string, updates: Partial<VMTAConfig>) => {
    updateConfig(prev => ({
      ...prev,
      vmtas: prev.vmtas.map(v => v.id === id ? { ...v, ...updates } : v),
    }));
  }, [updateConfig]);

  const deleteVMTA = useCallback((id: string) => {
    updateConfig(prev => ({
      ...prev,
      vmtas: prev.vmtas.filter(v => v.id !== id),
      // Also remove from pools
      pools: prev.pools.map(p => ({
        ...p,
        vmtas: p.vmtas.filter(v => v !== id),
      })),
    }));
  }, [updateConfig]);

  const duplicateVMTA = useCallback((id: string, currentConfig: PMTAConfig | null) => {
    const vmta = currentConfig?.vmtas.find((v: VMTAConfig) => v.id === id);
    if (!vmta) return;

    const newVMTA: VMTAConfig = {
      ...vmta,
      id: `vmta-${Date.now()}`,
      name: `${vmta.name}-copy`,
    };
    updateConfig(prev => ({
      ...prev,
      vmtas: [...prev.vmtas, newVMTA],
    }));
    return newVMTA;
  }, [updateConfig]);

  return { addVMTA, updateVMTA, deleteVMTA, duplicateVMTA };
}

// Hook for Pool management
export function usePoolManager(_config: PMTAConfig | null, updateConfig: (updater: (config: PMTAConfig) => PMTAConfig) => void) {
  const addPool = useCallback((pool: Omit<VMTAPool, 'id'>) => {
    const newPool: VMTAPool = {
      ...pool,
      id: `pool-${Date.now()}`,
    };
    updateConfig(prev => ({
      ...prev,
      pools: [...prev.pools, newPool],
    }));
    return newPool;
  }, [updateConfig]);

  const updatePool = useCallback((id: string, updates: Partial<VMTAPool>) => {
    updateConfig(prev => ({
      ...prev,
      pools: prev.pools.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, [updateConfig]);

  const deletePool = useCallback((id: string) => {
    updateConfig(prev => ({
      ...prev,
      pools: prev.pools.filter(p => p.id !== id),
    }));
  }, [updateConfig]);

  const addVMTAToPool = useCallback((poolId: string, vmtaId: string) => {
    updateConfig(prev => ({
      ...prev,
      pools: prev.pools.map(p =>
        p.id === poolId && !p.vmtas.includes(vmtaId)
          ? { ...p, vmtas: [...p.vmtas, vmtaId] }
          : p
      ),
    }));
  }, [updateConfig]);

  const removeVMTAFromPool = useCallback((poolId: string, vmtaId: string) => {
    updateConfig(prev => ({
      ...prev,
      pools: prev.pools.map(p =>
        p.id === poolId
          ? { ...p, vmtas: p.vmtas.filter(v => v !== vmtaId) }
          : p
      ),
    }));
  }, [updateConfig]);

  return { addPool, updatePool, deletePool, addVMTAToPool, removeVMTAFromPool };
}

// Hook for Bounce Rule management
export function useBounceRuleManager(_config: PMTAConfig | null, updateConfig: (updater: (config: PMTAConfig) => PMTAConfig) => void) {
  const addBounceRule = useCallback((rule: Omit<BounceRule, 'id'>) => {
    const newRule: BounceRule = {
      ...rule,
      id: `bounce-${Date.now()}`,
    };
    updateConfig(prev => ({
      ...prev,
      bounceRules: [...prev.bounceRules, newRule],
    }));
    return newRule;
  }, [updateConfig]);

  const updateBounceRule = useCallback((id: string, updates: Partial<BounceRule>) => {
    updateConfig(prev => ({
      ...prev,
      bounceRules: prev.bounceRules.map(r => r.id === id ? { ...r, ...updates } : r),
    }));
  }, [updateConfig]);

  const deleteBounceRule = useCallback((id: string) => {
    updateConfig(prev => ({
      ...prev,
      bounceRules: prev.bounceRules.filter(r => r.id !== id),
    }));
  }, [updateConfig]);

  const reorderBounceRules = useCallback((newOrder: string[]) => {
    updateConfig(prev => ({
      ...prev,
      bounceRules: newOrder
        .map(id => prev.bounceRules.find(r => r.id === id))
        .filter((r): r is BounceRule => r !== undefined),
    }));
  }, [updateConfig]);

  return { addBounceRule, updateBounceRule, deleteBounceRule, reorderBounceRules };
}

// Hook for SMTP Source management
export function useSourceManager(_config: PMTAConfig | null, updateConfig: (updater: (config: PMTAConfig) => PMTAConfig) => void) {
  const addSource = useCallback((source: Omit<SMTPSource, 'id'>) => {
    const newSource: SMTPSource = {
      ...source,
      id: `source-${Date.now()}`,
    };
    updateConfig(prev => ({
      ...prev,
      sources: [...prev.sources, newSource],
    }));
    return newSource;
  }, [updateConfig]);

  const updateSource = useCallback((id: string, updates: Partial<SMTPSource>) => {
    updateConfig(prev => ({
      ...prev,
      sources: prev.sources.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  }, [updateConfig]);

  const deleteSource = useCallback((id: string) => {
    updateConfig(prev => ({
      ...prev,
      sources: prev.sources.filter(s => s.id !== id),
    }));
  }, [updateConfig]);

  return { addSource, updateSource, deleteSource };
}

// Hook for SMTP User management
export function useUserManager(_config: PMTAConfig | null, updateConfig: (updater: (config: PMTAConfig) => PMTAConfig) => void) {
  const addUser = useCallback((user: Omit<SMTPUser, 'id'>) => {
    const newUser: SMTPUser = {
      ...user,
      id: `user-${Date.now()}`,
    };
    updateConfig(prev => ({
      ...prev,
      users: [...prev.users, newUser],
    }));
    return newUser;
  }, [updateConfig]);

  const updateUser = useCallback((id: string, updates: Partial<SMTPUser>) => {
    updateConfig(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === id ? { ...u, ...updates } : u),
    }));
  }, [updateConfig]);

  const deleteUser = useCallback((id: string) => {
    updateConfig(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== id),
    }));
  }, [updateConfig]);

  return { addUser, updateUser, deleteUser };
}

// Hook for Domain management
export function useDomainManager(_config: PMTAConfig | null, updateConfig: (updater: (config: PMTAConfig) => PMTAConfig) => void) {
  const addDomain = useCallback((domain: Omit<import('@/types').DomainConfig, 'id'>) => {
    const newDomain: import('@/types').DomainConfig = {
      ...domain,
      id: `domain-${Date.now()}`,
    };
    updateConfig(prev => ({
      ...prev,
      domains: [...prev.domains, newDomain],
    }));
    return newDomain;
  }, [updateConfig]);

  const updateDomain = useCallback((id: string, updates: Partial<import('@/types').DomainConfig>) => {
    updateConfig(prev => ({
      ...prev,
      domains: prev.domains.map(d => d.id === id ? { ...d, ...updates } : d),
    }));
  }, [updateConfig]);

  const deleteDomain = useCallback((id: string) => {
    updateConfig(prev => ({
      ...prev,
      domains: prev.domains.filter(d => d.id !== id),
    }));
  }, [updateConfig]);

  return { addDomain, updateDomain, deleteDomain };
}

// Default PMTA configuration
export const defaultPMTAConfig: PMTAConfig = {
  global: {
    runAsUser: 'pmta',
    runAsGroup: 'pmta',
    logFile: '/var/log/pmta/log',
    logMode: 'traditional',
    pidFile: '/var/run/pmta/pmta.pid',
    spoolPath: '/var/spool/pmta',
    maxConnections: 100,
    maxMessagesPerConnection: 1000,
    maxMessagesPerHour: 10000,
    retryAfter: '5m',
    retryCount: 30,
    bounceAfter: '4d',
    timeoutAfter: '5m',
    addDateHeader: true,
    addMessageIdHeader: true,
    hostname: 'localhost',
    smtpPort: 25,
    httpPort: 8080,
    httpAdminPort: 8081,
  },
  vmtas: [],
  pools: [],
  sources: [],
  users: [],
  domains: [],
  bounceRules: [
    {
      id: 'bounce-1',
      name: 'Mailbox Full',
      pattern: 'mailbox full',
      type: 'soft',
      action: 'retry',
      retryAfter: '1h',
      enabled: true,
    },
    {
      id: 'bounce-2',
      name: 'User Unknown',
      pattern: 'user unknown',
      type: 'hard',
      action: 'bounce',
      enabled: true,
    },
    {
      id: 'bounce-3',
      name: 'Domain Not Found',
      pattern: 'domain not found',
      type: 'hard',
      action: 'bounce',
      enabled: true,
    },
    {
      id: 'bounce-4',
      name: 'Connection Refused',
      pattern: 'connection refused',
      type: 'soft',
      action: 'retry',
      retryAfter: '15m',
      enabled: true,
    },
  ],
  patternLists: [],
};
