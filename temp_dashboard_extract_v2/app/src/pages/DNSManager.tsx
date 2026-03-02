import { useState } from 'react';
import { Globe, Copy, CheckCircle, Server, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useDNSInfo } from '@/hooks/useApi';
import { toast } from 'sonner';

export function DNSManager() {
  const [domain, setDomain] = useState('');
  const { fetchDNSInfo, isLoading, error, data } = useDNSInfo();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!domain.trim()) {
      toast.error('Please enter a domain');
      return;
    }
    try {
      await fetchDNSInfo(domain);
    } catch (err) {
      toast.error('Failed to generate DNS configuration');
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            DNS Configuration Generator
          </h1>
          <p className="text-sm text-muted-foreground">Generate required DNS records for your domains</p>
        </div>
      </div>

      {/* Input Section */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter domain name (e.g., example.com)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 min-w-[150px]"
            >
              {isLoading ? 'Generating...' : 'Generate Config'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="glass-card border-red-500/20">
          <CardContent className="p-6 text-red-400">
            Error: {error}
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {data && (
        <div className="space-y-6">
          <Tabs defaultValue="external" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 p-1 rounded-lg">
              <TabsTrigger value="external" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400">
                Use External DNS (GoDaddy, Namecheap, etc.)
              </TabsTrigger>
              <TabsTrigger value="ours" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400">
                Use Our Nameservers
              </TabsTrigger>
            </TabsList>

            {/* Tab: External DNS */}
            <TabsContent value="external" className="mt-6 space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Required Records</CardTitle>
                  <CardDescription>Add these records to your domain's DNS settings at your registrar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                  {data.formatted_records?.map((record: any, idx: number) => (
                    <div key={idx} className="space-y-2 pb-4 border-b border-slate-800/50 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-300">
                          {record.type === 'TXT' && record.host.includes('_domainkey') ? 'DKIM Record' :
                            record.type === 'TXT' && record.host.includes('_dmarc') ? 'DMARC Record' :
                              record.type === 'TXT' ? 'SPF Record' : 'A Record'} ({record.type})
                        </label>
                        <Badge variant="outline" className={record.type === 'A' || record.host.includes('domainkey') || record.value?.includes('spf1') ? "border-green-500/30 text-green-500 bg-green-500/10" : "border-blue-500/30 text-blue-500 bg-blue-500/10"}>
                          {record.type === 'A' || record.host.includes('domainkey') || record.value?.includes('spf1') ? 'Essential' : 'Recommended'}
                        </Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="sm:w-36 px-3 bg-slate-900/50 flex items-center border border-slate-700 rounded text-slate-400 text-sm overflow-hidden text-ellipsis whitespace-nowrap" title={record.host}>
                          {record.host}
                        </div>
                        <code className="flex-1 bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 text-sm font-mono break-all max-h-32 overflow-y-auto min-h-[44px] flex items-center">
                          {record.value}
                        </code>
                        <Button variant="ghost" size="icon" className="shrink-0 h-11 w-11" onClick={() => copyToClipboard(record.value, `rec-${idx}`)}>
                          {copiedField === `rec-${idx}` ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {(!data.formatted_records || data.formatted_records.length === 0) && (
                    <div className="text-center p-6 text-slate-400">
                      No formatted records returned from the server.
                    </div>
                  )}

                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Our NS */}
            <TabsContent value="ours" className="mt-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Nameserver Configuration</CardTitle>
                  <CardDescription>Update your domain's nameservers at your registrar to point to the following:</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.ns_records.map((ns, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                        <div className="flex items-center gap-4">
                          <Server className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="text-white font-medium">{ns.host}</p>
                            <p className="text-sm text-slate-400">Points to: {ns.value}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(ns.host, `ns-${idx}`)}>
                          {copiedField === `ns-${idx}` ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    ))}

                    <div className="mt-8 p-4 border border-blue-500/20 bg-blue-500/10 rounded-lg">
                      <h4 className="flex items-center gap-2 text-blue-400 font-medium mb-2">
                        <Globe className="w-4 h-4" />
                        Next Steps
                      </h4>
                      <p className="text-sm text-slate-300">
                        1. Log in to your domain registrar (GoDaddy, Namecheap, etc.).<br />
                        2. Navigate to DNS Management or Nameservers.<br />
                        3. Change the nameserver type to "Custom".<br />
                        4. Enter the nameservers listed above.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
