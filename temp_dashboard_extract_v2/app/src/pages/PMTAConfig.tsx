import { useState, useCallback, useEffect } from 'react';
import {
  Settings,
  Server,
  Layers,
  AlertTriangle,
  Shield,
  Users,
  Globe,
  Save,
  Play,
  Download,
  CheckCircle,
  AlertCircle,
  FileCode,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePMTAConfig, useVMTAManager, usePoolManager, useBounceRuleManager, useSourceManager, useUserManager, defaultPMTAConfig } from '@/hooks/usePMTAConfig';
import type { VMTAConfig, VMTAPool, BounceRule, SMTPSource, SMTPUser } from '@/types';

// VMTA Manager Component
function VMTAManager({
  vmtas,
  onAdd,
  onUpdate,
  onDelete,
  onDuplicate
}: {
  vmtas: VMTAConfig[];
  onAdd: (vmta: Omit<VMTAConfig, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<VMTAConfig>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<VMTAConfig>>({});

  const handleEdit = (vmta: VMTAConfig) => {
    setEditing(vmta.id);
    setFormData(vmta);
  };

  const handleSave = () => {
    if (editing && editing.startsWith('new-')) {
      onAdd(formData as Omit<VMTAConfig, 'id'>);
    } else if (editing) {
      onUpdate(editing, formData);
    }
    setEditing(null);
    setFormData({});
  };

  const handleAddNew = () => {
    const newId = `new-${Date.now()}`;
    setEditing(newId);
    setFormData({
      name: '',
      smtpSourceHost: '',
      dkimEnabled: false,
      enabled: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Virtual MTAs</h3>
        <Button onClick={handleAddNew} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Server className="w-4 h-4 mr-2" />
          Add VMTA
        </Button>
      </div>

      <div className="space-y-3">
        {/* Render New VMTA Form */}
        {editing && editing.startsWith('new-') && (
          <Card className="glass-card border-blue-500/50">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-blue-400">
                  <Server className="w-5 h-5" />
                  <span className="font-semibold">New VMTA</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">VMTA Name</Label>
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="vmta1"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">SMTP Source Host</Label>
                    <Input
                      value={formData.smtpSourceHost || ''}
                      onChange={(e) => setFormData({ ...formData, smtpSourceHost: e.target.value })}
                      placeholder="mail.example.com"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-300">Max Connections</Label>
                    <Input
                      type="number"
                      value={formData.maxConnections || ''}
                      onChange={(e) => setFormData({ ...formData, maxConnections: parseInt(e.target.value) })}
                      placeholder="100"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Max Msg/Conn</Label>
                    <Input
                      type="number"
                      value={formData.maxMessagesPerConnection || ''}
                      onChange={(e) => setFormData({ ...formData, maxMessagesPerConnection: parseInt(e.target.value) })}
                      placeholder="1000"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Max Msg/Hour</Label>
                    <Input
                      type="number"
                      value={formData.maxMessagesPerHour || ''}
                      onChange={(e) => setFormData({ ...formData, maxMessagesPerHour: parseInt(e.target.value) })}
                      placeholder="10000"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.dkimEnabled || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, dkimEnabled: checked })}
                    />
                    <Label className="text-slate-300">DKIM Enabled</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.enabled !== false}
                      onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    />
                    <Label className="text-slate-300">Enabled</Label>
                  </div>
                </div>
                {formData.dkimEnabled && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300">DKIM Selector</Label>
                      <Input
                        value={formData.domainKey?.selector || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          domainKey: {
                            selector: e.target.value,
                            domain: formData.domainKey?.domain || '',
                            keyPath: formData.domainKey?.keyPath || ''
                          }
                        })}
                        placeholder="default"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">DKIM Domain</Label>
                      <Input
                        value={formData.domainKey?.domain || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          domainKey: {
                            selector: formData.domainKey?.selector || '',
                            domain: e.target.value,
                            keyPath: formData.domainKey?.keyPath || ''
                          }
                        })}
                        placeholder="example.com"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Key Path</Label>
                      <Input
                        value={formData.domainKey?.keyPath || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          domainKey: {
                            selector: formData.domainKey?.selector || '',
                            domain: formData.domainKey?.domain || '',
                            keyPath: e.target.value
                          }
                        })}
                        placeholder="/etc/pmta/dkim/default.private"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save New VMTA
                  </Button>
                  <Button onClick={() => setEditing(null)} variant="outline" size="sm" className="border-slate-700">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {vmtas.map((vmta) => (
          <Card key={vmta.id} className="glass-card">
            <CardContent className="p-4">
              {editing === vmta.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">VMTA Name</Label>
                      <Input
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="vmta1"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">SMTP Source Host</Label>
                      <Input
                        value={formData.smtpSourceHost || ''}
                        onChange={(e) => setFormData({ ...formData, smtpSourceHost: e.target.value })}
                        placeholder="mail.example.com"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300">Max Connections</Label>
                      <Input
                        type="number"
                        value={formData.maxConnections || ''}
                        onChange={(e) => setFormData({ ...formData, maxConnections: parseInt(e.target.value) })}
                        placeholder="100"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Max Msg/Conn</Label>
                      <Input
                        type="number"
                        value={formData.maxMessagesPerConnection || ''}
                        onChange={(e) => setFormData({ ...formData, maxMessagesPerConnection: parseInt(e.target.value) })}
                        placeholder="1000"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Max Msg/Hour</Label>
                      <Input
                        type="number"
                        value={formData.maxMessagesPerHour || ''}
                        onChange={(e) => setFormData({ ...formData, maxMessagesPerHour: parseInt(e.target.value) })}
                        placeholder="10000"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.dkimEnabled || false}
                        onCheckedChange={(checked) => setFormData({ ...formData, dkimEnabled: checked })}
                      />
                      <Label className="text-slate-300">DKIM Enabled</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.enabled !== false}
                        onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                      />
                      <Label className="text-slate-300">Enabled</Label>
                    </div>
                  </div>
                  {formData.dkimEnabled && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-slate-300">DKIM Selector</Label>
                        <Input
                          value={formData.domainKey?.selector || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            domainKey: {
                              selector: e.target.value,
                              domain: formData.domainKey?.domain || '',
                              keyPath: formData.domainKey?.keyPath || ''
                            }
                          })}
                          placeholder="default"
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">DKIM Domain</Label>
                        <Input
                          value={formData.domainKey?.domain || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            domainKey: {
                              selector: formData.domainKey?.selector || '',
                              domain: e.target.value,
                              keyPath: formData.domainKey?.keyPath || ''
                            }
                          })}
                          placeholder="example.com"
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Key Path</Label>
                        <Input
                          value={formData.domainKey?.keyPath || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            domainKey: {
                              selector: formData.domainKey?.selector || '',
                              domain: formData.domainKey?.domain || '',
                              keyPath: e.target.value
                            }
                          })}
                          placeholder="/etc/pmta/dkim/default.private"
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={() => setEditing(null)} variant="outline" size="sm" className="border-slate-700">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      vmta.enabled ? "bg-green-500/10" : "bg-slate-500/10"
                    )}>
                      <Server className={cn("w-5 h-5", vmta.enabled ? "text-green-500" : "text-slate-500")} />
                    </div>
                    <div>
                      <p className="font-medium text-white">{vmta.name}</p>
                      <p className="text-sm text-slate-400">{vmta.smtpSourceHost}</p>
                      <div className="flex gap-2 mt-1">
                        {vmta.dkimEnabled && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                            DKIM
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-xs">
                          {vmta.maxConnections || 100} conn
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(vmta)} variant="outline" size="sm" className="border-slate-700">
                      Edit
                    </Button>
                    <Button onClick={() => onDuplicate(vmta.id)} variant="outline" size="sm" className="border-slate-700">
                      Duplicate
                    </Button>
                    <Button onClick={() => onDelete(vmta.id)} variant="destructive" size="sm">
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {vmtas.length === 0 && !editing && (
          <div className="text-center py-8 text-slate-500">
            <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No VMTAs configured</p>
            <p className="text-sm">Click "Add VMTA" to create one</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Pool Manager Component
function PoolManager({
  pools,
  vmtas,
  onAdd,
  onUpdate,
  onDelete,
  onAddVMTA,
  onRemoveVMTA
}: {
  pools: VMTAPool[];
  vmtas: VMTAConfig[];
  onAdd: (pool: Omit<VMTAPool, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<VMTAPool>) => void;
  onDelete: (id: string) => void;
  onAddVMTA: (poolId: string, vmtaId: string) => void;
  onRemoveVMTA: (poolId: string, vmtaId: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<VMTAPool>>({});
  const [expanded, setExpanded] = useState<string[]>([]);

  const handleEdit = (pool: VMTAPool) => {
    setEditing(pool.id);
    setFormData(pool);
  };

  const handleSave = () => {
    if (editing && editing.startsWith('new-')) {
      onAdd(formData as Omit<VMTAPool, 'id'>);
    } else if (editing) {
      onUpdate(editing, formData);
    }
    setEditing(null);
    setFormData({});
  };

  const handleAddNew = () => {
    const newId = `new-${Date.now()}`;
    setEditing(newId);
    setFormData({
      name: '',
      vmtas: [],
      enabled: true,
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">VMTA Pools</h3>
        <Button onClick={handleAddNew} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Layers className="w-4 h-4 mr-2" />
          Add Pool
        </Button>
      </div>

      <div className="space-y-3">
        {/* Render New Pool Form */}
        {editing && editing.startsWith('new-') && (
          <Card className="glass-card border-purple-500/50">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-purple-400">
                  <Layers className="w-5 h-5" />
                  <span className="font-semibold">New VMTA Pool</span>
                </div>
                <div>
                  <Label className="text-slate-300">Pool Name</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="pool1"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Description</Label>
                  <Input
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Main sending pool"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.enabled !== false}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                  />
                  <Label className="text-slate-300">Enabled</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save New Pool
                  </Button>
                  <Button onClick={() => setEditing(null)} variant="outline" size="sm" className="border-slate-700">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {pools.map((pool) => (
          <Card key={pool.id} className="glass-card">
            <CardContent className="p-4">
              {editing === pool.id ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Pool Name</Label>
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="pool1"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Description</Label>
                    <Input
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Main sending pool"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.enabled !== false}
                      onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    />
                    <Label className="text-slate-300">Enabled</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={() => setEditing(null)} variant="outline" size="sm" className="border-slate-700">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(pool.id)}
                        className="p-0 h-auto"
                      >
                        {expanded.includes(pool.id) ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </Button>
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        pool.enabled ? "bg-purple-500/10" : "bg-slate-500/10"
                      )}>
                        <Layers className={cn("w-5 h-5", pool.enabled ? "text-purple-500" : "text-slate-500")} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{pool.name}</p>
                        <p className="text-sm text-slate-400">{pool.vmtas.length} VMTAs</p>
                        {pool.description && (
                          <p className="text-xs text-slate-500">{pool.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleEdit(pool)} variant="outline" size="sm" className="border-slate-700">
                        Edit
                      </Button>
                      <Button onClick={() => onDelete(pool.id)} variant="destructive" size="sm">
                        Delete
                      </Button>
                    </div>
                  </div>

                  {expanded.includes(pool.id) && (
                    <div className="mt-4 pl-12 space-y-3">
                      <div className="flex items-center gap-2">
                        <select
                          onChange={(e) => e.target.value && onAddVMTA(pool.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-1 text-sm"
                          defaultValue=""
                        >
                          <option value="">Add VMTA to pool...</option>
                          {vmtas
                            .filter(v => !pool.vmtas.includes(v.id))
                            .map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pool.vmtas.map(vmtaId => {
                          const vmta = vmtas.find(v => v.id === vmtaId);
                          return vmta ? (
                            <Badge
                              key={vmtaId}
                              variant="outline"
                              className="bg-slate-800 border-slate-600 text-slate-300 flex items-center gap-2"
                            >
                              {vmta.name}
                              <button
                                onClick={() => onRemoveVMTA(pool.id, vmtaId)}
                                className="text-slate-500 hover:text-red-400"
                              >
                                ×
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {pools.length === 0 && !editing && (
          <div className="text-center py-8 text-slate-500">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pools configured</p>
            <p className="text-sm">Click "Add Pool" to create one</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Bounce Rules Manager Component
function BounceRulesManager({
  rules,
  onAdd,
  onUpdate,
  onDelete
}: {
  rules: BounceRule[];
  onAdd: (rule: Omit<BounceRule, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<BounceRule>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<BounceRule>>({});

  const handleEdit = (rule: BounceRule) => {
    setEditing(rule.id);
    setFormData(rule);
  };

  const handleSave = () => {
    if (editing && editing.startsWith('new-')) {
      onAdd(formData as Omit<BounceRule, 'id'>);
    } else if (editing) {
      onUpdate(editing, formData);
    }
    setEditing(null);
    setFormData({});
  };

  const handleAddNew = () => {
    const newId = `new-${Date.now()}`;
    setEditing(newId);
    setFormData({
      name: '',
      pattern: '',
      type: 'soft',
      action: 'retry',
      enabled: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Bounce Rules</h3>
        <Button onClick={handleAddNew} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <div className="space-y-3">
        {/* Render New Bounce Rule Form */}
        {editing && editing.startsWith('new-') && (
          <Card className="glass-card border-yellow-500/50">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-yellow-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">New Bounce Rule</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Rule Name</Label>
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Mailbox Full"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Pattern</Label>
                    <Input
                      value={formData.pattern || ''}
                      onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                      placeholder="mailbox full"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-300">Bounce Type</Label>
                    <select
                      value={formData.type || 'soft'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'hard' | 'soft' | 'defer' })}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-2"
                    >
                      <option value="soft">Soft Bounce</option>
                      <option value="hard">Hard Bounce</option>
                      <option value="defer">Defer</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Action</Label>
                    <select
                      value={formData.action || 'retry'}
                      onChange={(e) => setFormData({ ...formData, action: e.target.value as 'bounce' | 'retry' | 'discard' | 'quarantine' })}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-2"
                    >
                      <option value="retry">Retry</option>
                      <option value="bounce">Bounce</option>
                      <option value="discard">Discard</option>
                      <option value="quarantine">Quarantine</option>
                    </select>
                  </div>
                  {formData.action === 'retry' && (
                    <div>
                      <Label className="text-slate-300">Retry After</Label>
                      <Input
                        value={formData.retryAfter || ''}
                        onChange={(e) => setFormData({ ...formData, retryAfter: e.target.value })}
                        placeholder="1h"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.enabled !== false}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                  />
                  <Label className="text-slate-300">Enabled</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save New Rule
                  </Button>
                  <Button onClick={() => setEditing(null)} variant="outline" size="sm" className="border-slate-700">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {rules.map((rule) => (
          <Card key={rule.id} className="glass-card">
            <CardContent className="p-4">
              {editing === rule.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Rule Name</Label>
                      <Input
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Mailbox Full"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Pattern</Label>
                      <Input
                        value={formData.pattern || ''}
                        onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                        placeholder="mailbox full"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300">Bounce Type</Label>
                      <select
                        value={formData.type || 'soft'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'hard' | 'soft' | 'defer' })}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-2"
                      >
                        <option value="soft">Soft Bounce</option>
                        <option value="hard">Hard Bounce</option>
                        <option value="defer">Defer</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Action</Label>
                      <select
                        value={formData.action || 'retry'}
                        onChange={(e) => setFormData({ ...formData, action: e.target.value as 'bounce' | 'retry' | 'discard' | 'quarantine' })}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-2"
                      >
                        <option value="retry">Retry</option>
                        <option value="bounce">Bounce</option>
                        <option value="discard">Discard</option>
                        <option value="quarantine">Quarantine</option>
                      </select>
                    </div>
                    {formData.action === 'retry' && (
                      <div>
                        <Label className="text-slate-300">Retry After</Label>
                        <Input
                          value={formData.retryAfter || ''}
                          onChange={(e) => setFormData({ ...formData, retryAfter: e.target.value })}
                          placeholder="1h"
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.enabled !== false}
                      onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    />
                    <Label className="text-slate-300">Enabled</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={() => setEditing(null)} variant="outline" size="sm" className="border-slate-700">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      rule.enabled
                        ? rule.type === 'hard' ? "bg-red-500/10" : "bg-yellow-500/10"
                        : "bg-slate-500/10"
                    )}>
                      <AlertTriangle className={cn("w-5 h-5",
                        rule.enabled
                          ? rule.type === 'hard' ? "text-red-500" : "text-yellow-500"
                          : "text-slate-500"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-white">{rule.name}</p>
                      <p className="text-sm text-slate-400">Pattern: "{rule.pattern}"</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          rule.type === 'hard'
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : rule.type === 'soft'
                              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                              : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        )}>
                          {rule.type}
                        </Badge>
                        <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-xs">
                          {rule.action}
                        </Badge>
                        {rule.retryAfter && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                            retry: {rule.retryAfter}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(rule)} variant="outline" size="sm" className="border-slate-700">
                      Edit
                    </Button>
                    <Button onClick={() => onDelete(rule.id)} variant="destructive" size="sm">
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {rules.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No bounce rules configured</p>
            <p className="text-sm">Click "Add Rule" to create one</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Source Manager Component
function SourceManager({
  sources,
  pools,
  onAdd,
  onUpdate,
  onDelete
}: {
  sources: SMTPSource[];
  pools: VMTAPool[];
  onAdd: (source: Omit<SMTPSource, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<SMTPSource>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<SMTPSource>>({});

  const handleEdit = (source: SMTPSource) => {
    setEditing(source.id);
    setFormData(source);
  };

  const handleSave = () => {
    if (editing && editing.startsWith('new-')) {
      onAdd(formData as Omit<SMTPSource, 'id'>);
    } else if (editing) {
      onUpdate(editing, formData);
    }
    setEditing(null);
    setFormData({});
  };

  const handleAddNew = () => {
    const newId = `new-${Date.now()}`;
    setEditing(newId);
    setFormData({
      name: '',
      alwaysAllowRelaying: false,
      smtpService: true,
      addDateHeader: true,
      requireAuth: true,
      enabled: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">SMTP Sources</h3>
        <Button onClick={handleAddNew} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Shield className="w-4 h-4 mr-2" />
          Add Source
        </Button>
      </div>

      <div className="space-y-3">
        {/* Render New Source Form */}
        {editing && editing.startsWith('new-') && (
          <Card className="glass-card border-blue-500/50">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-blue-400">
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">New Source</span>
                </div>
                <div>
                  <Label className="text-slate-300">Source Name</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="0.0.0.0/0"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Default VMTA/Pool</Label>
                  <select
                    value={formData.defaultVMTA || ''}
                    onChange={(e) => setFormData({ ...formData, defaultVMTA: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-2"
                  >
                    <option value="">None</option>
                    {pools.map(p => (
                      <option key={p.id} value={p.name}>{p.name} (Pool)</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.alwaysAllowRelaying || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, alwaysAllowRelaying: checked })}
                    />
                    <Label className="text-slate-300">Allow Relaying</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.smtpService !== false}
                      onCheckedChange={(checked) => setFormData({ ...formData, smtpService: checked })}
                    />
                    <Label className="text-slate-300">SMTP Service</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.addDateHeader !== false}
                      onCheckedChange={(checked) => setFormData({ ...formData, addDateHeader: checked })}
                    />
                    <Label className="text-slate-300">Add Date Header</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.requireAuth !== false}
                      onCheckedChange={(checked) => setFormData({ ...formData, requireAuth: checked })}
                    />
                    <Label className="text-slate-300">Require Auth</Label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.enabled !== false}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                  />
                  <Label className="text-slate-300">Enabled</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save New Source
                  </Button>
                  <Button onClick={() => setEditing(null)} variant="outline" size="sm" className="border-slate-700">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {sources.map((source) => (
          <Card key={source.id} className="glass-card">
            <CardContent className="p-4">
              {editing === source.id ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Source Name</Label>
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="0.0.0.0/0"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Default VMTA/Pool</Label>
                    <select
                      value={formData.defaultVMTA || ''}
                      onChange={(e) => setFormData({ ...formData, defaultVMTA: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-2"
                    >
                      <option value="">None</option>
                      {pools.map(p => (
                        <option key={p.id} value={p.name}>{p.name} (Pool)</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.alwaysAllowRelaying || false}
                        onCheckedChange={(checked) => setFormData({ ...formData, alwaysAllowRelaying: checked })}
                      />
                      <Label className="text-slate-300">Allow Relaying</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.smtpService !== false}
                        onCheckedChange={(checked) => setFormData({ ...formData, smtpService: checked })}
                      />
                      <Label className="text-slate-300">SMTP Service</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.addDateHeader !== false}
                        onCheckedChange={(checked) => setFormData({ ...formData, addDateHeader: checked })}
                      />
                      <Label className="text-slate-300">Add Date Header</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.requireAuth !== false}
                        onCheckedChange={(checked) => setFormData({ ...formData, requireAuth: checked })}
                      />
                      <Label className="text-slate-300">Require Auth</Label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.enabled !== false}
                      onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    />
                    <Label className="text-slate-300">Enabled</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={() => setEditing(null)} variant="outline" size="sm" className="border-slate-700">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      source.enabled ? "bg-blue-500/10" : "bg-slate-500/10"
                    )}>
                      <Shield className={cn("w-5 h-5", source.enabled ? "text-blue-500" : "text-slate-500")} />
                    </div>
                    <div>
                      <p className="font-medium text-white">{source.name}</p>
                      <div className="flex gap-2 mt-1">
                        {source.alwaysAllowRelaying && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                            relay
                          </Badge>
                        )}
                        {source.requireAuth && (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs">
                            auth
                          </Badge>
                        )}
                        {source.defaultVMTA && (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                            {source.defaultVMTA}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(source)} variant="outline" size="sm" className="border-slate-700">
                      Edit
                    </Button>
                    <Button onClick={() => onDelete(source.id)} variant="destructive" size="sm">
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {sources.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No sources configured</p>
            <p className="text-sm">Click "Add Source" to create one</p>
          </div>
        )}
      </div>
    </div>
  );
}

// User Manager Component
function UserManager({
  users,
  sources,
  onAdd,
  onUpdate,
  onDelete
}: {
  users: SMTPUser[];
  sources: SMTPSource[];
  onAdd: (user: Omit<SMTPUser, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<SMTPUser>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<SMTPUser>>({});

  const handleEdit = (user: SMTPUser) => {
    setEditing(user.id);
    setFormData(user);
  };

  const handleSave = () => {
    if (editing && editing.startsWith('new-')) {
      onAdd(formData as Omit<SMTPUser, 'id'>);
    } else if (editing) {
      onUpdate(editing, formData);
    }
    setEditing(null);
    setFormData({});
  };

  const handleAddNew = () => {
    const newId = `new-${Date.now()}`;
    setEditing(newId);
    setFormData({
      username: '',
      password: '',
      enabled: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">SMTP Users</h3>
        <Button onClick={handleAddNew} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Users className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="space-y-3">
        {/* Render New User Form */}
        {editing && editing.startsWith('new-') && (
          <Card className="glass-card border-blue-500/50">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-blue-400">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">New User</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Username</Label>
                    <Input
                      value={formData.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="user1"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Password</Label>
                    <Input
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Associated Source</Label>
                  <select
                    value={formData.source || ''}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-2"
                  >
                    <option value="">All Sources</option>
                    {sources.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save New User
                  </Button>
                  <Button onClick={() => setEditing(null)} variant="outline" size="sm" className="border-slate-700">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {users.map((user) => (
          <Card key={user.id} className="glass-card">
            <CardContent className="p-4">
              {editing === user.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Username</Label>
                      <Input
                        value={formData.username || ''}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="smtpuser"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Password</Label>
                      <Input
                        type="password"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300">Source</Label>
                    <select
                      value={formData.source || ''}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-2"
                    >
                      <option value="">Any</option>
                      {sources.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Max Messages/Hour</Label>
                    <Input
                      type="number"
                      value={formData.maxMessagesPerHour || ''}
                      onChange={(e) => setFormData({ ...formData, maxMessagesPerHour: parseInt(e.target.value) })}
                      placeholder="Unlimited"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.enabled !== false}
                      onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    />
                    <Label className="text-slate-300">Enabled</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={() => setEditing(null)} variant="outline" size="sm" className="border-slate-700">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      user.enabled ? "bg-green-500/10" : "bg-slate-500/10"
                    )}>
                      <Users className={cn("w-5 h-5", user.enabled ? "text-green-500" : "text-slate-500")} />
                    </div>
                    <div>
                      <p className="font-medium text-white">{user.username}</p>
                      <div className="flex gap-2 mt-1">
                        {user.source && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                            {user.source}
                          </Badge>
                        )}
                        {user.maxMessagesPerHour && (
                          <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-xs">
                            {user.maxMessagesPerHour}/hr
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(user)} variant="outline" size="sm" className="border-slate-700">
                      Edit
                    </Button>
                    <Button onClick={() => onDelete(user.id)} variant="destructive" size="sm">
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {users.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No users configured</p>
            <p className="text-sm">Click "Add User" to create one</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Global Settings Component
function GlobalSettings({
  settings,
  onUpdate
}: {
  settings: typeof defaultPMTAConfig.global;
  onUpdate: (updates: Partial<typeof defaultPMTAConfig.global>) => void;
}) {
  const [formData, setFormData] = useState(settings);
  const [isEditing, setIsEditing] = useState(false);

  // Sync formData with settings when settings change, but only if not editing
  useEffect(() => {
    if (!isEditing) {
      setFormData(settings);
    }
  }, [settings, isEditing]);

  const handleEditClick = () => {
    setFormData(settings);
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(settings);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Global Settings</h3>
        {!isEditing ? (
          <Button onClick={handleEditClick} variant="outline" size="sm" className="border-slate-700">
            Edit Settings
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleCancel} variant="outline" size="sm" className="border-slate-700">
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-slate-400 text-xs">Run As User</Label>
              {isEditing ? (
                <Input
                  value={formData.runAsUser ?? ''}
                  onChange={(e) => setFormData({ ...formData, runAsUser: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              ) : (
                <p className="text-white font-mono">{settings.runAsUser}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Run As Group</Label>
              {isEditing ? (
                <Input
                  value={formData.runAsGroup ?? ''}
                  onChange={(e) => setFormData({ ...formData, runAsGroup: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              ) : (
                <p className="text-white font-mono">{settings.runAsGroup}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Hostname</Label>
              {isEditing ? (
                <Input
                  value={formData.hostname ?? ''}
                  onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              ) : (
                <p className="text-white font-mono">{settings.hostname}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">SMTP Port</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.smtpPort ?? ''}
                  onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              ) : (
                <p className="text-white font-mono">{settings.smtpPort}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">HTTP Port</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.httpPort ?? ''}
                  onChange={(e) => setFormData({ ...formData, httpPort: parseInt(e.target.value) })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              ) : (
                <p className="text-white font-mono">{settings.httpPort}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Admin Port</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.httpAdminPort ?? ''}
                  onChange={(e) => setFormData({ ...formData, httpAdminPort: parseInt(e.target.value) })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              ) : (
                <p className="text-white font-mono">{settings.httpAdminPort}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Max Connections</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.maxConnections ?? ''}
                  onChange={(e) => setFormData({ ...formData, maxConnections: parseInt(e.target.value) })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              ) : (
                <p className="text-white font-mono">{settings.maxConnections}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Max Msg/Connection</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.maxMessagesPerConnection ?? ''}
                  onChange={(e) => setFormData({ ...formData, maxMessagesPerConnection: parseInt(e.target.value) })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              ) : (
                <p className="text-white font-mono">{settings.maxMessagesPerConnection}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Max Msg/Hour</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.maxMessagesPerHour ?? ''}
                  onChange={(e) => setFormData({ ...formData, maxMessagesPerHour: parseInt(e.target.value) })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              ) : (
                <p className="text-white font-mono">{settings.maxMessagesPerHour}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Retry After</Label>
              {isEditing ? (
                <Input
                  value={formData.retryAfter}
                  onChange={(e) => setFormData({ ...formData, retryAfter: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              ) : (
                <p className="text-white font-mono">{settings.retryAfter}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Retry Count</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.retryCount}
                  onChange={(e) => setFormData({ ...formData, retryCount: parseInt(e.target.value) })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              ) : (
                <p className="text-white font-mono">{settings.retryCount}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Bounce After</Label>
              {isEditing ? (
                <Input
                  value={formData.bounceAfter}
                  onChange={(e) => setFormData({ ...formData, bounceAfter: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              ) : (
                <p className="text-white font-mono">{settings.bounceAfter}</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <Switch
                  checked={formData.addDateHeader}
                  onCheckedChange={(checked) => setFormData({ ...formData, addDateHeader: checked })}
                />
              ) : (
                <div className={cn("w-4 h-4 rounded", settings.addDateHeader ? "bg-green-500" : "bg-slate-600")} />
              )}
              <Label className="text-slate-300">Add Date Header</Label>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <Switch
                  checked={formData.addMessageIdHeader}
                  onCheckedChange={(checked) => setFormData({ ...formData, addMessageIdHeader: checked })}
                />
              ) : (
                <div className={cn("w-4 h-4 rounded", settings.addMessageIdHeader ? "bg-green-500" : "bg-slate-600")} />
              )}
              <Label className="text-slate-300">Add Message-ID Header</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Credential Update Form
function CredentialForm({ onUpdate, error }: { onUpdate: (ip: string, user: string, pass: string) => void; error: string }) {
  const [ip, setIp] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onUpdate(ip, user, pass);
    setLoading(false);
  };

  return (
    <div className="p-6 flex items-center justify-center min-h-[50vh]">
      <div className="bg-slate-900 border border-red-500/30 rounded-lg p-6 max-w-md w-full shadow-2xl shadow-red-900/10">
        <div className="flex items-center gap-3 mb-4 text-red-500">
          <AlertCircle className="w-6 h-6" />
          <h3 className="font-semibold text-lg">Connection Failed</h3>
        </div>
        <p className="text-slate-400 mb-6 text-sm border-l-2 border-red-500/50 pl-3">
          {error}. Please verify your server credentials.
        </p>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-300">Server IP</Label>
            <Input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="1.2.3.4"
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-slate-300">SSH Username</Label>
            <Input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="root"
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-slate-300">SSH Password</Label>
            <Input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!ip || !user || !pass || loading}
            className="w-full bg-red-600 hover:bg-red-700 mt-2"
          >
            {loading ? 'Connecting...' : 'Update Credentials & Retry'}
          </Button>

          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
            className="w-full text-slate-500 hover:text-white"
          >
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main PMTA Config Page
export function PMTAConfig() {
  const {
    config,
    isLoading,
    error,
    hasChanges,
    saveConfig,
    applyConfig,
    validateConfig,
    exportConfig,
    updateLocalConfig,
    updateCredentials,
  } = usePMTAConfig();

  const { addVMTA, updateVMTA, deleteVMTA, duplicateVMTA: duplicateVMTARaw } = useVMTAManager(config, updateLocalConfig);

  // Wrapper for duplicateVMTA that passes config
  const duplicateVMTA = useCallback((id: string) => {
    return duplicateVMTARaw(id, config);
  }, [duplicateVMTARaw, config]);
  const { addPool, updatePool, deletePool, addVMTAToPool, removeVMTAFromPool } = usePoolManager(config, updateLocalConfig);
  const { addBounceRule, updateBounceRule, deleteBounceRule } = useBounceRuleManager(config, updateLocalConfig);
  const { addSource, updateSource, deleteSource } = useSourceManager(config, updateLocalConfig);
  const { addUser, updateUser, deleteUser } = useUserManager(config, updateLocalConfig);

  const handleSave = async () => {
    if (!config) return;
    try {
      await saveConfig(config);
      toast.success('Configuration saved successfully');
    } catch (err) {
      toast.error('Failed to save configuration');
    }
  };

  const handleApply = async () => {
    try {
      await applyConfig();
      toast.success('Configuration applied and PMTA restarted');
    } catch (err) {
      toast.error('Failed to apply configuration');
    }
  };

  const handleValidate = async () => {
    if (!config) return;
    try {
      const result = await validateConfig(config);
      if (result.valid) {
        toast.success('Configuration is valid');
      } else {
        toast.error(`Configuration has ${result.errors.length} errors`);
      }
    } catch (err) {
      toast.error('Validation failed');
    }
  };

  const handleExport = async (format: 'json' | 'xml' | 'conf') => {
    try {
      const result = await exportConfig(format);
      const blob = new Blob([result.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pmta-config.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Configuration exported');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  // Import and Reset handlers are available from usePMTAConfig hook
  // These can be used with file input dialogs in the future

  if (isLoading && !config) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error && !config) {
    return <CredentialForm onUpdate={updateCredentials} error={error} />;
  }

  const currentConfig = config || defaultPMTAConfig;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-500" />
            PMTA Configuration
          </h1>
          <p className="text-sm text-muted-foreground">Manage PowerMTA settings, VMTAs, pools, and rules</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-slate-700">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Export Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Button onClick={() => handleExport('json')} className="w-full bg-blue-600 hover:bg-blue-700">
                  <FileCode className="w-4 h-4 mr-2" />
                  Export as JSON
                </Button>
                <Button onClick={() => handleExport('conf')} variant="outline" className="w-full border-slate-700">
                  <FileCode className="w-4 h-4 mr-2" />
                  Export as .conf
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleValidate} variant="outline" size="sm" className="border-slate-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Validate
          </Button>
          <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button onClick={handleApply} size="sm" className="bg-green-600 hover:bg-green-700">
            <Play className="w-4 h-4 mr-2" />
            Apply
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="vmtas" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-700">
          <TabsTrigger value="vmtas" className="data-[state=active]:bg-blue-600">
            <Server className="w-4 h-4 mr-2" />
            VMTAs
          </TabsTrigger>
          <TabsTrigger value="pools" className="data-[state=active]:bg-blue-600">
            <Layers className="w-4 h-4 mr-2" />
            Pools
          </TabsTrigger>
          <TabsTrigger value="bounce" className="data-[state=active]:bg-blue-600">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Bounce Rules
          </TabsTrigger>
          <TabsTrigger value="sources" className="data-[state=active]:bg-blue-600">
            <Shield className="w-4 h-4 mr-2" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-blue-600">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="global" className="data-[state=active]:bg-blue-600">
            <Globe className="w-4 h-4 mr-2" />
            Global
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vmtas" className="mt-6">
          <VMTAManager
            vmtas={currentConfig.vmtas}
            onAdd={addVMTA}
            onUpdate={updateVMTA}
            onDelete={deleteVMTA}
            onDuplicate={duplicateVMTA}
          />
        </TabsContent>

        <TabsContent value="pools" className="mt-6">
          <PoolManager
            pools={currentConfig.pools}
            vmtas={currentConfig.vmtas}
            onAdd={addPool}
            onUpdate={updatePool}
            onDelete={deletePool}
            onAddVMTA={addVMTAToPool}
            onRemoveVMTA={removeVMTAFromPool}
          />
        </TabsContent>

        <TabsContent value="bounce" className="mt-6">
          <BounceRulesManager
            rules={currentConfig.bounceRules}
            onAdd={addBounceRule}
            onUpdate={updateBounceRule}
            onDelete={deleteBounceRule}
          />
        </TabsContent>

        <TabsContent value="sources" className="mt-6">
          <SourceManager
            sources={currentConfig.sources}
            pools={currentConfig.pools}
            onAdd={addSource}
            onUpdate={updateSource}
            onDelete={deleteSource}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManager
            users={currentConfig.users}
            sources={currentConfig.sources}
            onAdd={addUser}
            onUpdate={updateUser}
            onDelete={deleteUser}
          />
        </TabsContent>

        <TabsContent value="global" className="mt-6">
          <GlobalSettings
            settings={currentConfig.global}
            onUpdate={(updates) => updateLocalConfig(prev => ({ ...prev, global: { ...prev.global, ...updates } }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
