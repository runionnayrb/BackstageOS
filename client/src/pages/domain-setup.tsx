import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, ExternalLink, Key, Shield, Globe, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";

export default function DomainSetup() {
  const [, setLocation] = useLocation();
  const [cloudflareToken, setCloudflareToken] = useState("");
  const [godaddyKey, setGodaddyKey] = useState("");
  const [godaddySecret, setGodaddySecret] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/domain-management')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Domain Management
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Domain Management Setup
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure API credentials to enable full domain management capabilities
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cloudflare">Cloudflare Setup</TabsTrigger>
            <TabsTrigger value="godaddy">GoDaddy Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>What You'll Get</CardTitle>
                <CardDescription>
                  Complete control over your domain infrastructure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Subdomain Management</h4>
                      <p className="text-sm text-muted-foreground">Create and manage subdomains like api.backstageos.com, blog.backstageos.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Email Aliases</h4>
                      <p className="text-sm text-muted-foreground">Set up professional email aliases like support@backstageos.com, hello@backstageos.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Page Route Control</h4>
                      <p className="text-sm text-muted-foreground">Custom routing, redirects, and page management</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">SSL & Security</h4>
                      <p className="text-sm text-muted-foreground">Automatic SSL certificates, DDoS protection, and security features</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Setup Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Cloudflare Account</div>
                        <div className="text-sm text-muted-foreground">Free plan available</div>
                      </div>
                    </div>
                    <Badge variant="secondary">Required</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="font-medium">GoDaddy API Access</div>
                        <div className="text-sm text-muted-foreground">For domain transfers</div>
                      </div>
                    </div>
                    <Badge variant="secondary">Optional</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cloudflare" className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cloudflare provides free DNS management, SSL certificates, and CDN services. This is our recommended solution for reliable domain management.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Step 1: Create Cloudflare Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Go to <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">
                    cloudflare.com <ExternalLink className="h-3 w-3 ml-1" />
                  </a></li>
                  <li>Sign up for a free account</li>
                  <li>Verify your email address</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step 2: Generate API Token</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Go to <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">
                    API Tokens page <ExternalLink className="h-3 w-3 ml-1" />
                  </a></li>
                  <li>Click "Create Token"</li>
                  <li>Use the "Edit zone DNS" template</li>
                  <li>Set Zone Resources to "Include All zones"</li>
                  <li>Click "Continue to summary" then "Create Token"</li>
                  <li>Copy the token (you won't see it again)</li>
                </ol>

                <div className="space-y-2">
                  <Label htmlFor="cloudflare-token">Cloudflare API Token</Label>
                  <Input
                    id="cloudflare-token"
                    type="password"
                    placeholder="Enter your Cloudflare API token"
                    value={cloudflareToken}
                    onChange={(e) => setCloudflareToken(e.target.value)}
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This token will be stored securely as an environment variable. You can revoke it anytime from your Cloudflare dashboard.
                  </AlertDescription>
                </Alert>

                <Button disabled={!cloudflareToken} className="w-full">
                  <Key className="h-4 w-4 mr-2" />
                  Save Cloudflare Token
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="godaddy" className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                GoDaddy API credentials are only needed if you want to automate the nameserver update process. You can also update nameservers manually in your GoDaddy dashboard.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Step 1: Get GoDaddy API Credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Go to <a href="https://developer.godaddy.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">
                    GoDaddy Developer Portal <ExternalLink className="h-3 w-3 ml-1" />
                  </a></li>
                  <li>Sign in with your GoDaddy account</li>
                  <li>Click "Create New API Key"</li>
                  <li>Choose "Production" environment</li>
                  <li>Copy both the API Key and Secret</li>
                </ol>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="godaddy-key">GoDaddy API Key</Label>
                    <Input
                      id="godaddy-key"
                      type="password"
                      placeholder="Enter your GoDaddy API key"
                      value={godaddyKey}
                      onChange={(e) => setGodaddyKey(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="godaddy-secret">GoDaddy API Secret</Label>
                    <Input
                      id="godaddy-secret"
                      type="password"
                      placeholder="Enter your GoDaddy API secret"
                      value={godaddySecret}
                      onChange={(e) => setGodaddySecret(e.target.value)}
                    />
                  </div>
                </div>

                <Button disabled={!godaddyKey || !godaddySecret} className="w-full">
                  <Key className="h-4 w-4 mr-2" />
                  Save GoDaddy Credentials
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alternative: Manual Setup</CardTitle>
                <CardDescription>
                  You can skip API credentials and update nameservers manually
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  When you transfer a domain to Cloudflare, you'll receive nameservers like:
                </p>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  <div>ns1.cloudflare.com</div>
                  <div>ns2.cloudflare.com</div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Simply update these in your GoDaddy domain settings manually.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}