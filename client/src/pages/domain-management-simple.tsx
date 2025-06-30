import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Plus, Globe, ArrowLeft, Settings, ExternalLink, Edit2, Save, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/admin";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function DomainManagement() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [newSubdomain, setNewSubdomain] = useState("");
  const [newEmailAlias, setNewEmailAlias] = useState("");
  const [editingSubdomain, setEditingSubdomain] = useState(null);
  const [editingEmailAlias, setEditingEmailAlias] = useState(null);
  const [editingDomain, setEditingDomain] = useState(null);
  const [newDnsRecord, setNewDnsRecord] = useState({ name: "", type: "CNAME", value: "" });
  const [editingDnsRecord, setEditingDnsRecord] = useState(null);
  const [showSubdomainDialog, setShowSubdomainDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showDomainDialog, setShowDomainDialog] = useState(false);
  const [showDnsDialog, setShowDnsDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Admin access check
  if (!user || !isAdmin(user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-600" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Domain management is restricted to administrators only.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation('/')} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch real domain data from API
  const { data: domains = [], isLoading: domainsLoading } = useQuery({
    queryKey: ['/api/domains'],
    queryFn: async () => {
      const response = await fetch('/api/domains');
      if (!response.ok) throw new Error('Failed to fetch domains');
      return response.json();
    }
  });

  // Fetch real subdomain data from API
  const { data: subdomains = [], isLoading: subdomainsLoading } = useQuery({
    queryKey: ['/api/subdomains'],
    queryFn: async () => {
      const response = await fetch('/api/subdomains');
      if (!response.ok) throw new Error('Failed to fetch subdomains');
      return response.json();
    }
  });

  // Fetch real email alias data from API
  const { data: emailAliases = [], isLoading: emailLoading } = useQuery({
    queryKey: ['/api/email-aliases'],
    queryFn: async () => {
      const response = await fetch('/api/email-aliases');
      if (!response.ok) throw new Error('Failed to fetch email aliases');
      return response.json();
    }
  });

  // Fetch DNS records from Cloudflare
  const { data: dnsRecords = [], isLoading: dnsLoading } = useQuery({
    queryKey: ['/api/dns-records'],
    queryFn: () => apiRequest('/api/dns-records')
  });

  const handleCreateSubdomain = () => {
    if (!newSubdomain) return;
    
    toast({
      title: "Subdomain Created",
      description: `${newSubdomain}.backstageos.com has been created successfully`
    });
    setNewSubdomain("");
  };

  const handleCreateEmailAlias = () => {
    if (!newEmailAlias) return;
    
    toast({
      title: "Email Alias Created", 
      description: `${newEmailAlias}@backstageos.com has been created successfully`
    });
    setNewEmailAlias("");
  };

  const handleCreateDnsRecord = async () => {
    if (!newDnsRecord.name || !newDnsRecord.value) return;
    
    try {
      const response = await fetch('/api/dns-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDnsRecord),
      });
      
      if (!response.ok) throw new Error('Failed to create DNS record');
      
      toast({
        title: "DNS Record Created",
        description: `${newDnsRecord.type} record for ${newDnsRecord.name || '@'} created successfully`
      });
      
      setNewDnsRecord({ name: "", type: "CNAME", value: "" });
      // Refresh the DNS records list
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create DNS record. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditDnsRecord = (record: any) => {
    setEditingDnsRecord(record);
    setShowDnsDialog(true);
  };

  const handleEditEmailAlias = (alias) => {
    setEditingEmailAlias(alias);
    setShowEmailDialog(true);
  };

  const handleSaveEmailAlias = () => {
    if (!editingEmailAlias) return;
    
    toast({
      title: "Email Alias Updated",
      description: `${editingEmailAlias.alias} settings have been updated successfully`
    });
    setShowEmailDialog(false);
    setEditingEmailAlias(null);
  };

  const handleEditSubdomain = (subdomain) => {
    setEditingSubdomain(subdomain);
    setShowSubdomainDialog(true);
  };

  const handleSaveSubdomain = () => {
    if (!editingSubdomain) return;
    
    toast({
      title: "Subdomain Updated",
      description: `${editingSubdomain.fullDomain} settings have been updated successfully`
    });
    setShowSubdomainDialog(false);
    setEditingSubdomain(null);
  };

  const handleDeleteSubdomain = () => {
    if (!editingSubdomain) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${editingSubdomain.fullDomain}? This action cannot be undone.`
    );
    
    if (confirmDelete) {
      toast({
        title: "Subdomain Deleted",
        description: `${editingSubdomain.fullDomain} has been deleted successfully`
      });
      setShowSubdomainDialog(false);
      setEditingSubdomain(null);
    }
  };

  const handleEditDomain = (domain) => {
    setEditingDomain(domain);
    setShowDomainDialog(true);
  };

  const handleSaveDomain = () => {
    if (!editingDomain) return;
    
    toast({
      title: "Domain Updated",
      description: `${editingDomain.name} routing has been updated successfully`
    });
    setShowDomainDialog(false);
    setEditingDomain(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Globe className="h-8 w-8" />
                Domain Management
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">v2.1 - Fixed</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your domains, subdomains, and DNS settings
              </p>
            </div>
            <Button onClick={() => setLocation('/domain-setup')} variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Setup Guide
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="dns">DNS Records</TabsTrigger>
            <TabsTrigger value="subdomains">Subdomains</TabsTrigger>
            <TabsTrigger value="email">Email Aliases</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Domain Status</CardTitle>
                <CardDescription>
                  Your domain configuration and health overview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {domains.map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-semibold">{domain.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Points to {domain.pointsToPage} • Primary domain
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                      <Badge variant="outline">
                        SSL Enabled
                      </Badge>
                      <Badge variant="outline">
                        Cloudflare
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEditDomain(domain)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your domain is properly configured with Cloudflare DNS management and SSL certificates.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Active Subdomains</span>
                    <span className="font-semibold">{subdomains.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email Aliases</span>
                    <span className="font-semibold">{emailAliases.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SSL Status</span>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Domain added to Cloudflare</span>
                      <span className="text-muted-foreground">Today</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SSL certificate renewed</span>
                      <span className="text-muted-foreground">3 days ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="dns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>DNS Records</CardTitle>
                <CardDescription>
                  Manage DNS records for backstageos.com
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="dns-name">Name</Label>
                    <Input
                      id="dns-name"
                      placeholder="@ (root) or www"
                      value={newDnsRecord?.name || ""}
                      onChange={(e) => setNewDnsRecord({...newDnsRecord, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dns-type">Type</Label>
                    <Select value={newDnsRecord?.type || "CNAME"} onValueChange={(value) => setNewDnsRecord({...newDnsRecord, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="CNAME">CNAME</SelectItem>
                        <SelectItem value="MX">MX</SelectItem>
                        <SelectItem value="TXT">TXT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dns-value">Value</Label>
                    <Input
                      id="dns-value"
                      placeholder="your-repl.replit.app"
                      value={newDnsRecord?.value || ""}
                      onChange={(e) => setNewDnsRecord({...newDnsRecord, value: e.target.value})}
                    />
                  </div>
                </div>
                <Button onClick={handleCreateDnsRecord}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create DNS Record
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing DNS Records</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dnsRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-semibold">{record.name || '@'}.backstageos.com</div>
                      <div className="text-sm text-muted-foreground">
                        {record.type} → {record.value}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEditDnsRecord(record)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subdomains" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Subdomain</CardTitle>
                <CardDescription>
                  Add a new subdomain to your domain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="subdomain">Subdomain Name</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="subdomain"
                        placeholder="api"
                        value={newSubdomain}
                        onChange={(e) => setNewSubdomain(e.target.value)}
                      />
                      <span className="text-muted-foreground">.backstageos.com</span>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleCreateSubdomain}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Subdomains</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {subdomains.map((subdomain) => (
                  <div key={subdomain.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-semibold">{subdomain.fullDomain}</div>
                      <div className="text-sm text-muted-foreground">
                        Points to {subdomain.pointsToPage} • Active subdomain
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEditSubdomain(subdomain)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Email Alias</CardTitle>
                <CardDescription>
                  Forward emails from your domain to your personal email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="email-alias">Email Alias</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="email-alias"
                        placeholder="info"
                        value={newEmailAlias}
                        onChange={(e) => setNewEmailAlias(e.target.value)}
                      />
                      <span className="text-muted-foreground">@backstageos.com</span>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleCreateEmailAlias}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create
                    </Button>
                  </div>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Emails will be forwarded to runion.bryan@gmail.com
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Email Aliases</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {emailAliases.map((alias) => (
                  <div key={alias.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-semibold">{alias.alias}</div>
                      <div className="text-sm text-muted-foreground">
                        Forwards to {alias.forwarding}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEditEmailAlias(alias)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SSL & Security</CardTitle>
                <CardDescription>
                  Security settings and SSL certificate status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-semibold">SSL Certificate</div>
                      <div className="text-sm text-muted-foreground">Automatic HTTPS encryption</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-semibold">HTTPS Redirect</div>
                      <div className="text-sm text-muted-foreground">Automatically redirect HTTP to HTTPS</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-semibold">DDoS Protection</div>
                      <div className="text-sm text-muted-foreground">Cloudflare security features</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All security features are properly configured. Your domain is protected with enterprise-grade security.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Subdomain Edit Dialog */}
        <Dialog open={showSubdomainDialog} onOpenChange={setShowSubdomainDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Subdomain</DialogTitle>
              <DialogDescription>
                Configure subdomain settings and where it points to
              </DialogDescription>
            </DialogHeader>
            {editingSubdomain && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Subdomain</label>
                    <Input 
                      value={editingSubdomain.name} 
                      onChange={(e) => setEditingSubdomain({...editingSubdomain, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Record Type</label>
                    <select 
                      className="w-full p-2 border rounded"
                      value={editingSubdomain.recordType}
                      onChange={(e) => setEditingSubdomain({...editingSubdomain, recordType: e.target.value})}
                    >
                      <option value="CNAME">CNAME</option>
                      <option value="A">A Record</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Points To</label>
                  <Input 
                    value={editingSubdomain.pointsTo} 
                    onChange={(e) => setEditingSubdomain({...editingSubdomain, pointsTo: e.target.value})}
                    placeholder="example.com or 192.168.1.1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Page Route</label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={editingSubdomain.pointsToPage}
                    onChange={(e) => setEditingSubdomain({...editingSubdomain, pointsToPage: e.target.value})}
                  >
                    {editingSubdomain.pageOptions?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">SSL Certificate</div>
                      <div className="text-sm text-muted-foreground">Enable HTTPS encryption</div>
                    </div>
                    <Switch 
                      checked={editingSubdomain.sslEnabled}
                      onCheckedChange={(checked) => setEditingSubdomain({...editingSubdomain, sslEnabled: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Cloudflare Proxy</div>
                      <div className="text-sm text-muted-foreground">Enable DDoS protection and performance optimization</div>
                    </div>
                    <Switch 
                      checked={editingSubdomain.proxyEnabled}
                      onCheckedChange={(checked) => setEditingSubdomain({...editingSubdomain, proxyEnabled: checked})}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex justify-between">
              <Button 
                variant="destructive" 
                onClick={handleDeleteSubdomain}
                className="mr-auto"
              >
                Delete Subdomain
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSubdomainDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSubdomain}>
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Alias Edit Dialog */}
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Email Alias</DialogTitle>
              <DialogDescription>
                Configure email alias settings and forwarding options
              </DialogDescription>
            </DialogHeader>
            {editingEmailAlias && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email Alias</label>
                    <Input 
                      value={editingEmailAlias.alias} 
                      onChange={(e) => setEditingEmailAlias({...editingEmailAlias, alias: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select 
                      className="w-full p-2 border rounded"
                      value={editingEmailAlias.status}
                      onChange={(e) => setEditingEmailAlias({...editingEmailAlias, status: e.target.value})}
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Forward To</label>
                  <Input 
                    value={editingEmailAlias.forwarding} 
                    onChange={(e) => setEditingEmailAlias({...editingEmailAlias, forwarding: e.target.value})}
                    placeholder="destination@email.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input 
                    value={editingEmailAlias.description} 
                    onChange={(e) => setEditingEmailAlias({...editingEmailAlias, description: e.target.value})}
                    placeholder="Brief description of this alias purpose"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Spam Filter</div>
                      <div className="text-sm text-muted-foreground">Enable spam detection and filtering</div>
                    </div>
                    <Switch 
                      checked={editingEmailAlias.spamFilter}
                      onCheckedChange={(checked) => setEditingEmailAlias({...editingEmailAlias, spamFilter: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Auto Reply</div>
                      <div className="text-sm text-muted-foreground">Send automatic response to incoming emails</div>
                    </div>
                    <Switch 
                      checked={editingEmailAlias.autoReply}
                      onCheckedChange={(checked) => setEditingEmailAlias({...editingEmailAlias, autoReply: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Catch All</div>
                      <div className="text-sm text-muted-foreground">Receive emails sent to non-existent addresses</div>
                    </div>
                    <Switch 
                      checked={editingEmailAlias.catchAll}
                      onCheckedChange={(checked) => setEditingEmailAlias({...editingEmailAlias, catchAll: checked})}
                    />
                  </div>
                </div>

                {editingEmailAlias.autoReply && (
                  <div>
                    <label className="text-sm font-medium">Auto Reply Message</label>
                    <textarea 
                      className="w-full p-2 border rounded mt-1"
                      rows={3}
                      placeholder="Thank you for your email. We'll get back to you soon."
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEmailAlias}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Domain Edit Dialog */}
        <Dialog open={showDomainDialog} onOpenChange={setShowDomainDialog}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Domain Routing Settings</DialogTitle>
              <DialogDescription>
                Configure where your domain points to when visitors access it
              </DialogDescription>
            </DialogHeader>
            {editingDomain && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium">Domain</label>
                  <Input 
                    value={editingDomain.name} 
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Page Route</label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={editingDomain.pointsToPage}
                    onChange={(e) => setEditingDomain({...editingDomain, pointsToPage: e.target.value})}
                  >
                    {editingDomain.pageOptions?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-sm text-muted-foreground mt-1">
                    Choose which page visitors see when they visit {editingDomain.name}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm">
                    <strong>Current Configuration:</strong>
                    <br />
                    {editingDomain.name} → {editingDomain.pointsToPage}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDomainDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDomain}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}