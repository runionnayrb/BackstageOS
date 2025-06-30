import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Globe, Shield, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface DNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
}

interface SubdomainConfig {
  subdomain: string;
  target: string;
  pageRoute: string;
  description: string;
}

interface EmailConfig {
  alias: string;
  destination: string;
  description: string;
}

interface ZoneInfo {
  id: string;
  name: string;
  status: string;
}

export default function DNSManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is admin
  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">You need admin privileges to access the DNS Manager.</p>
            <Link href="/admin">
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const [newRecord, setNewRecord] = useState<Partial<DNSRecord>>({
    type: 'A',
    ttl: 300,
    proxied: false
  });
  const [editRecord, setEditRecord] = useState<DNSRecord | null>(null);
  const [subdomainConfig, setSubdomainConfig] = useState<SubdomainConfig>({
    subdomain: '',
    target: '',
    pageRoute: 'app',
    description: ''
  });
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    alias: '',
    destination: '',
    description: ''
  });

  // Fetch DNS records
  const { data: dnsRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['/api/dns/records'],
    queryFn: () => fetch('/api/dns/records').then(res => res.json()),
    meta: { errorMessage: 'Failed to load DNS records' }
  });

  // Fetch zone info
  const { data: zoneInfo } = useQuery({
    queryKey: ['/api/dns/zone'],
    queryFn: () => fetch('/api/dns/zone').then(res => res.json()),
    meta: { errorMessage: 'Failed to load zone information' }
  });

  // Create DNS record mutation
  const createRecordMutation = useMutation({
    mutationFn: (record: Partial<DNSRecord>) => 
      apiRequest('POST', '/api/dns/records', record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dns/records'] });
      toast({ title: "DNS record created successfully" });
      setNewRecord({ type: 'A', ttl: 300, proxied: false });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create DNS record", description: error.message, variant: "destructive" });
    }
  });

  // Update DNS record mutation
  const updateRecordMutation = useMutation({
    mutationFn: ({ id, ...record }: DNSRecord) => 
      apiRequest('PUT', `/api/dns/records/${id}`, record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dns/records'] });
      toast({ title: "DNS record updated successfully" });
      setEditRecord(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update DNS record", description: error.message, variant: "destructive" });
    }
  });

  // Delete DNS record mutation
  const deleteRecordMutation = useMutation({
    mutationFn: (recordId: string) => 
      apiRequest(`/api/dns/records/${recordId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dns/records'] });
      toast({ title: "DNS record deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete DNS record", description: error.message, variant: "destructive" });
    }
  });

  // Create subdomain mutation
  const createSubdomainMutation = useMutation({
    mutationFn: (config: SubdomainConfig) => 
      apiRequest('POST', '/api/dns/subdomain', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dns/records'] });
      toast({ title: "Subdomain created successfully" });
      setSubdomainConfig({ subdomain: '', target: '', pageRoute: 'app', description: '' });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create subdomain", description: error.message, variant: "destructive" });
    }
  });

  // Create email alias mutation
  const createEmailMutation = useMutation({
    mutationFn: (config: EmailConfig) => 
      apiRequest('POST', '/api/dns/email', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dns/records'] });
      toast({ title: "Email alias created successfully" });
      setEmailConfig({ alias: '', destination: '', description: '' });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create email alias", description: error.message, variant: "destructive" });
    }
  });

  const handleCreateRecord = () => {
    if (!newRecord.type || !newRecord.name || !newRecord.content) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createRecordMutation.mutate(newRecord);
  };

  const handleUpdateRecord = () => {
    if (!editRecord) return;
    updateRecordMutation.mutate(editRecord);
  };

  const handleDeleteRecord = (recordId: string) => {
    if (confirm('Are you sure you want to delete this DNS record?')) {
      deleteRecordMutation.mutate(recordId);
    }
  };

  const handleCreateSubdomain = () => {
    if (!subdomainConfig.subdomain || !subdomainConfig.target) {
      toast({ title: "Please fill in subdomain and target", variant: "destructive" });
      return;
    }
    createSubdomainMutation.mutate(subdomainConfig);
  };

  const handleCreateEmail = () => {
    if (!emailConfig.alias || !emailConfig.destination) {
      toast({ title: "Please fill in alias and destination", variant: "destructive" });
      return;
    }
    createEmailMutation.mutate(emailConfig);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">DNS Manager</h1>
          <p className="text-gray-600">Manage DNS records and domain configuration</p>
        </div>
      </div>

      {zoneInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domain Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Domain Name</Label>
                <p className="text-lg">{(zoneInfo as ZoneInfo).name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Zone ID</Label>
                <p className="text-sm text-gray-600">{(zoneInfo as ZoneInfo).id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Badge variant={(zoneInfo as ZoneInfo).status === 'active' ? 'default' : 'secondary'}>
                  {(zoneInfo as ZoneInfo).status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="records" className="space-y-6">
        <TabsList>
          <TabsTrigger value="records">DNS Records</TabsTrigger>
          <TabsTrigger value="subdomains">Subdomains</TabsTrigger>
          <TabsTrigger value="email">Email Aliases</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                DNS Records
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Record
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create DNS Record</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="record-type">Type</Label>
                        <Select 
                          value={newRecord.type} 
                          onValueChange={(value) => setNewRecord({ ...newRecord, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="AAAA">AAAA</SelectItem>
                            <SelectItem value="CNAME">CNAME</SelectItem>
                            <SelectItem value="MX">MX</SelectItem>
                            <SelectItem value="TXT">TXT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="record-name">Name</Label>
                        <Input
                          id="record-name"
                          value={newRecord.name || ''}
                          onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })}
                          placeholder="subdomain or @"
                        />
                      </div>
                      <div>
                        <Label htmlFor="record-content">Content</Label>
                        <Input
                          id="record-content"
                          value={newRecord.content || ''}
                          onChange={(e) => setNewRecord({ ...newRecord, content: e.target.value })}
                          placeholder="IP address or target"
                        />
                      </div>
                      <div>
                        <Label htmlFor="record-ttl">TTL (seconds)</Label>
                        <Input
                          id="record-ttl"
                          type="number"
                          value={newRecord.ttl || 300}
                          onChange={(e) => setNewRecord({ ...newRecord, ttl: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="record-proxied"
                          checked={newRecord.proxied || false}
                          onChange={(e) => setNewRecord({ ...newRecord, proxied: e.target.checked })}
                        />
                        <Label htmlFor="record-proxied">Proxied through Cloudflare</Label>
                      </div>
                      <Button 
                        onClick={handleCreateRecord} 
                        disabled={createRecordMutation.isPending}
                        className="w-full"
                      >
                        {createRecordMutation.isPending ? 'Creating...' : 'Create Record'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="text-center py-8">Loading DNS records...</div>
              ) : (
                <div className="space-y-2">
                  {Array.isArray(dnsRecords) && dnsRecords.map((record: DNSRecord) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1 grid grid-cols-4 gap-4">
                        <div>
                          <Badge variant="outline">{record.type}</Badge>
                        </div>
                        <div>
                          <p className="font-medium">{record.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">{record.content}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">TTL: {record.ttl}s</span>
                          {record.proxied && <Shield className="h-4 w-4 text-orange-500" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditRecord(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRecord(record.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subdomains" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Subdomain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subdomain">Subdomain</Label>
                <Input
                  id="subdomain"
                  value={subdomainConfig.subdomain}
                  onChange={(e) => setSubdomainConfig({ ...subdomainConfig, subdomain: e.target.value })}
                  placeholder="app, beta, www"
                />
              </div>
              <div>
                <Label htmlFor="target">Target</Label>
                <Input
                  id="target"
                  value={subdomainConfig.target}
                  onChange={(e) => setSubdomainConfig({ ...subdomainConfig, target: e.target.value })}
                  placeholder="your-app.replit.dev"
                />
              </div>
              <div>
                <Label htmlFor="page-route">Page Route</Label>
                <Select 
                  value={subdomainConfig.pageRoute} 
                  onValueChange={(value) => setSubdomainConfig({ ...subdomainConfig, pageRoute: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="app">App Home</SelectItem>
                    <SelectItem value="landing">Landing Page</SelectItem>
                    <SelectItem value="signin">Sign In</SelectItem>
                    <SelectItem value="admin">Admin Dashboard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={subdomainConfig.description}
                  onChange={(e) => setSubdomainConfig({ ...subdomainConfig, description: e.target.value })}
                  placeholder="Main application subdomain"
                />
              </div>
              <Button 
                onClick={handleCreateSubdomain} 
                disabled={createSubdomainMutation.isPending}
                className="w-full"
              >
                {createSubdomainMutation.isPending ? 'Creating...' : 'Create Subdomain'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Email Alias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email-alias">Email Alias</Label>
                <Input
                  id="email-alias"
                  value={emailConfig.alias}
                  onChange={(e) => setEmailConfig({ ...emailConfig, alias: e.target.value })}
                  placeholder="contact, support, hello"
                />
              </div>
              <div>
                <Label htmlFor="destination">Destination Email</Label>
                <Input
                  id="destination"
                  type="email"
                  value={emailConfig.destination}
                  onChange={(e) => setEmailConfig({ ...emailConfig, destination: e.target.value })}
                  placeholder="your-email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="email-description">Description</Label>
                <Input
                  id="email-description"
                  value={emailConfig.description}
                  onChange={(e) => setEmailConfig({ ...emailConfig, description: e.target.value })}
                  placeholder="Contact form submissions"
                />
              </div>
              <Button 
                onClick={handleCreateEmail} 
                disabled={createEmailMutation.isPending}
                className="w-full"
              >
                {createEmailMutation.isPending ? 'Creating...' : 'Create Email Alias'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Record Dialog */}
      {editRecord && (
        <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit DNS Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select 
                  value={editRecord.type} 
                  onValueChange={(value) => setEditRecord({ ...editRecord, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="AAAA">AAAA</SelectItem>
                    <SelectItem value="CNAME">CNAME</SelectItem>
                    <SelectItem value="MX">MX</SelectItem>
                    <SelectItem value="TXT">TXT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editRecord.name}
                  onChange={(e) => setEditRecord({ ...editRecord, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-content">Content</Label>
                <Input
                  id="edit-content"
                  value={editRecord.content}
                  onChange={(e) => setEditRecord({ ...editRecord, content: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-ttl">TTL (seconds)</Label>
                <Input
                  id="edit-ttl"
                  type="number"
                  value={editRecord.ttl}
                  onChange={(e) => setEditRecord({ ...editRecord, ttl: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-proxied"
                  checked={editRecord.proxied || false}
                  onChange={(e) => setEditRecord({ ...editRecord, proxied: e.target.checked })}
                />
                <Label htmlFor="edit-proxied">Proxied through Cloudflare</Label>
              </div>
              <Button 
                onClick={handleUpdateRecord} 
                disabled={updateRecordMutation.isPending}
                className="w-full"
              >
                {updateRecordMutation.isPending ? 'Updating...' : 'Update Record'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}