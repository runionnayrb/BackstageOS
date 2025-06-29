import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Plus, Globe, ArrowLeft, Settings, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/admin";

export default function DomainManagement() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [newSubdomain, setNewSubdomain] = useState("");
  const [newEmailAlias, setNewEmailAlias] = useState("");
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

  // Mock data for demonstration - in real implementation this would come from API
  const domains = [
    {
      id: 1,
      name: "backstageos.com",
      status: "active",
      cloudflareEnabled: true,
      sslEnabled: true
    }
  ];

  const subdomains = [
    { id: 1, name: "join", fullDomain: "join.backstageos.com", status: "active" },
    { id: 2, name: "beta", fullDomain: "beta.backstageos.com", status: "active" }
  ];

  const emailAliases = [
    { id: 1, alias: "support@backstageos.com", forwarding: "runion.bryan@gmail.com" },
    { id: 2, alias: "hello@backstageos.com", forwarding: "runion.bryan@gmail.com" }
  ];

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
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
                        <div className="text-sm text-muted-foreground">Primary domain</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                      <Badge variant="outline">
                        SSL Enabled
                      </Badge>
                      <Badge variant="outline">
                        Cloudflare
                      </Badge>
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
                    <Badge variant="secondary">Active</Badge>
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
                      <div className="text-sm text-muted-foreground">Active subdomain</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Active</Badge>
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
                    <Badge variant="secondary">Active</Badge>
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
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-semibold">HTTPS Redirect</div>
                      <div className="text-sm text-muted-foreground">Automatically redirect HTTP to HTTPS</div>
                    </div>
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-semibold">DDoS Protection</div>
                      <div className="text-sm text-muted-foreground">Cloudflare security features</div>
                    </div>
                    <Badge variant="secondary">
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
      </div>
    </div>
  );
}