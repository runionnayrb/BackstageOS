import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Settings, ExternalLink, Shield, Mail, Route, Trash2, Edit, Eye, ArrowUpRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Domain, Subdomain, EmailAlias, PageRoute, DomainSettings } from "@shared/schema";

interface DomainFormData {
  name: string;
  provider: string;
  status: string;
  isMainDomain: boolean;
  autoRenewal: boolean;
  expiryDate?: string;
}

export default function DomainManagement() {
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all domains
  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['/api/domains'],
    queryFn: () => apiRequest('/api/domains')
  });

  // Create domain mutation
  const createDomainMutation = useMutation({
    mutationFn: (data: DomainFormData) => apiRequest('/api/domains', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains'] });
      setShowCreateDialog(false);
      toast({ title: "Domain created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating domain", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Transfer to Cloudflare mutation
  const transferMutation = useMutation({
    mutationFn: (domainId: number) => apiRequest(`/api/domains/${domainId}/transfer-to-cloudflare`, {
      method: 'POST'
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains'] });
      setShowTransferDialog(false);
      toast({ 
        title: "Domain transferred to Cloudflare", 
        description: `Please update your nameservers: ${data.nameservers?.join(', ')}`
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Transfer failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleCreateDomain = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: DomainFormData = {
      name: formData.get('name') as string,
      provider: formData.get('provider') as string,
      status: 'active',
      isMainDomain: formData.get('isMainDomain') === 'on',
      autoRenewal: formData.get('autoRenewal') === 'on',
      expiryDate: formData.get('expiryDate') as string || undefined
    };
    createDomainMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Globe className="h-8 w-8" />
              Domain Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your domains, subdomains, email aliases, and page routes
            </p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Domain
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Domain</DialogTitle>
                  <DialogDescription>
                    Add a domain to manage with Backstage OS
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateDomain} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Domain Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      placeholder="example.com"
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="provider">Current Provider</Label>
                    <Select name="provider" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="godaddy">GoDaddy</SelectItem>
                        <SelectItem value="cloudflare">Cloudflare</SelectItem>
                        <SelectItem value="namecheap">Namecheap</SelectItem>
                        <SelectItem value="route53">AWS Route 53</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                    <Input 
                      id="expiryDate" 
                      name="expiryDate" 
                      type="date"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="isMainDomain" name="isMainDomain" />
                    <Label htmlFor="isMainDomain">Set as main domain</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="autoRenewal" name="autoRenewal" defaultChecked />
                    <Label htmlFor="autoRenewal">Enable auto-renewal</Label>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createDomainMutation.isPending}>
                      {createDomainMutation.isPending ? "Creating..." : "Create Domain"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Domain List */}
        {domains.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Globe className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No domains yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                Add your first domain to start managing your web presence with full control over DNS, email, and routing.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Domain
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {domains.map((domain: Domain) => (
              <Card key={domain.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {domain.name}
                          {domain.isMainDomain && (
                            <Badge variant="secondary">Main</Badge>
                          )}
                          <Badge className={getStatusColor(domain.status)}>
                            {domain.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Provider: {domain.provider} • DNS: {domain.dnsProvider}
                          {domain.transferredToCloudflare && " • Managed by Cloudflare"}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDomain(domain)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                      
                      {!domain.transferredToCloudflare && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDomain(domain);
                            setShowTransferDialog(true);
                          }}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Transfer to Cloudflare
                        </Button>
                      )}
                      
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Subdomains</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Email Aliases</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Page Routes</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">Active</div>
                      <div className="text-sm text-muted-foreground">SSL Status</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Transfer to Cloudflare Dialog */}
        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Domain to Cloudflare</DialogTitle>
              <DialogDescription>
                This will set up {selectedDomain?.name} on Cloudflare for advanced DNS management, security, and performance.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">What happens next:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Cloudflare zone will be created for your domain</li>
                  <li>• You'll receive new nameservers to update at GoDaddy</li>
                  <li>• Full DNS management will be available in this interface</li>
                  <li>• Free SSL certificates and security features enabled</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => selectedDomain && transferMutation.mutate(selectedDomain.id)}
                  disabled={transferMutation.isPending}
                >
                  {transferMutation.isPending ? "Transferring..." : "Transfer to Cloudflare"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Domain Management Modal */}
        {selectedDomain && !showTransferDialog && (
          <DomainDetailModal 
            domain={selectedDomain} 
            onClose={() => setSelectedDomain(null)} 
          />
        )}
      </div>
    </div>
  );
}

// Domain Detail Modal Component
function DomainDetailModal({ domain, onClose }: { domain: Domain; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("subdomains");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {domain.name}
          </DialogTitle>
          <DialogDescription>
            Manage subdomains, email aliases, page routes, and settings
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="subdomains">Subdomains</TabsTrigger>
            <TabsTrigger value="email">Email Aliases</TabsTrigger>
            <TabsTrigger value="routes">Page Routes</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="subdomains" className="space-y-4">
            <SubdomainManagement domainId={domain.id} />
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <EmailAliasManagement domainId={domain.id} />
          </TabsContent>

          <TabsContent value="routes" className="space-y-4">
            <PageRouteManagement domainId={domain.id} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <DomainSettingsManagement domainId={domain.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Subdomain Management Component
function SubdomainManagement({ domainId }: { domainId: number }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subdomains = [] } = useQuery({
    queryKey: ['/api/domains', domainId, 'subdomains'],
    queryFn: () => apiRequest(`/api/domains/${domainId}/subdomains`)
  });

  const createSubdomainMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/domains/${domainId}/subdomains`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains', domainId, 'subdomains'] });
      setShowCreateDialog(false);
      toast({ title: "Subdomain created successfully" });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Subdomains</h3>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Subdomain
        </Button>
      </div>

      {subdomains.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No subdomains configured yet
        </div>
      ) : (
        <div className="space-y-2">
          {subdomains.map((subdomain: Subdomain) => (
            <div key={subdomain.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{subdomain.fullDomain}</div>
                <div className="text-sm text-muted-foreground">
                  {subdomain.type} → {subdomain.target}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={subdomain.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {subdomain.status}
                </Badge>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Subdomain Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subdomain</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createSubdomainMutation.mutate({
              name: formData.get('name'),
              type: formData.get('type'),
              target: formData.get('target'),
              fullDomain: `${formData.get('name')}.${formData.get('domain')}`,
              ttl: parseInt(formData.get('ttl') as string) || 300
            });
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subdomain Name</Label>
              <Input id="name" name="name" placeholder="api, blog, app" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Record Type</Label>
              <Select name="type" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A Record</SelectItem>
                  <SelectItem value="CNAME">CNAME</SelectItem>
                  <SelectItem value="AAAA">AAAA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target</Label>
              <Input id="target" name="target" placeholder="IP address or domain" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ttl">TTL (seconds)</Label>
              <Input id="ttl" name="ttl" type="number" defaultValue="300" />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSubdomainMutation.isPending}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Email Alias Management Component
function EmailAliasManagement({ domainId }: { domainId: number }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: aliases = [] } = useQuery({
    queryKey: ['/api/domains', domainId, 'email-aliases'],
    queryFn: () => apiRequest(`/api/domains/${domainId}/email-aliases`)
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Email Aliases</h3>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Email Alias
        </Button>
      </div>

      {aliases.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No email aliases configured yet
        </div>
      ) : (
        <div className="space-y-2">
          {aliases.map((alias: EmailAlias) => (
            <div key={alias.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{alias.fullEmail}</div>
                <div className="text-sm text-muted-foreground">
                  Forwards to: {JSON.parse(alias.forwardTo).join(', ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={alias.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {alias.status}
                </Badge>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Page Route Management Component
function PageRouteManagement({ domainId }: { domainId: number }) {
  const { data: routes = [] } = useQuery({
    queryKey: ['/api/domains', domainId, 'page-routes'],
    queryFn: () => apiRequest(`/api/domains/${domainId}/page-routes`)
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Page Routes</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Route
        </Button>
      </div>

      {routes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No custom routes configured yet
        </div>
      ) : (
        <div className="space-y-2">
          {routes.map((route: PageRoute) => (
            <div key={route.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{route.fullUrl}</div>
                <div className="text-sm text-muted-foreground">{route.title}</div>
              </div>
              <Badge>{route.contentType}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Domain Settings Management Component  
function DomainSettingsManagement({ domainId }: { domainId: number }) {
  const { data: settings } = useQuery({
    queryKey: ['/api/domains', domainId, 'settings'],
    queryFn: () => apiRequest(`/api/domains/${domainId}/settings`)
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Domain Settings</h3>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SSL & Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>SSL Enabled</Label>
                <p className="text-sm text-muted-foreground">Automatically provision SSL certificates</p>
              </div>
              <Switch defaultChecked={settings?.sslEnabled !== false} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto HTTPS Redirect</Label>
                <p className="text-sm text-muted-foreground">Redirect HTTP traffic to HTTPS</p>
              </div>
              <Switch defaultChecked={settings?.autoHttpsRedirect !== false} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Domain Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>WWW Redirect</Label>
              <Select defaultValue={settings?.wwwRedirect || 'non-www'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="www">Redirect to www</SelectItem>
                  <SelectItem value="non-www">Redirect to non-www</SelectItem>
                  <SelectItem value="none">No redirect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}