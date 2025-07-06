import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Mail, Send, Inbox, Settings, TestTube, RefreshCw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface EmailAccountConfigProps {
  accountId: number;
  onClose?: () => void;
}

interface ImapConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  sslEnabled: boolean;
}

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  sslEnabled: boolean;
}

export function EmailAccountConfig({ accountId, onClose }: EmailAccountConfigProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for IMAP configuration
  const [imapConfig, setImapConfig] = useState<ImapConfig>({
    host: '',
    port: 993,
    username: '',
    password: '',
    sslEnabled: true,
  });

  // State for SMTP configuration
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: '',
    port: 587,
    username: '',
    password: '',
    sslEnabled: true,
  });

  // State for connection testing
  const [imapTestResult, setImapTestResult] = useState<boolean | null>(null);
  const [smtpTestResult, setSmtpTestResult] = useState<boolean | null>(null);

  // Get email account details
  const { data: account } = useQuery({
    queryKey: ['/api/email/accounts', accountId],
    enabled: !!accountId,
  });

  // Configure IMAP settings
  const configureImapMutation = useMutation({
    mutationFn: async (config: ImapConfig) => {
      return apiRequest(`/api/email/accounts/${accountId}/imap-config`, {
        method: 'POST',
        body: JSON.stringify(config),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({ title: 'IMAP configuration saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to configure IMAP',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Configure SMTP settings
  const configureSmtpMutation = useMutation({
    mutationFn: async (config: SmtpConfig) => {
      return apiRequest(`/api/email/accounts/${accountId}/smtp-config`, {
        method: 'POST',
        body: JSON.stringify(config),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({ title: 'SMTP configuration saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to configure SMTP',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Test IMAP connection
  const testImapMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/email/accounts/${accountId}/test-imap`, {
        method: 'POST',
      });
    },
    onSuccess: (data: any) => {
      setImapTestResult(data.connected);
      toast({
        title: data.connected ? 'IMAP connection successful' : 'IMAP connection failed',
        variant: data.connected ? 'default' : 'destructive',
      });
    },
    onError: () => {
      setImapTestResult(false);
      toast({
        title: 'IMAP connection test failed',
        variant: 'destructive',
      });
    },
  });

  // Test SMTP connection
  const testSmtpMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/email/accounts/${accountId}/test-smtp`, {
        method: 'POST',
      });
    },
    onSuccess: (data: any) => {
      setSmtpTestResult(data.connected);
      toast({
        title: data.connected ? 'SMTP connection successful' : 'SMTP connection failed',
        variant: data.connected ? 'default' : 'destructive',
      });
    },
    onError: () => {
      setSmtpTestResult(false);
      toast({
        title: 'SMTP connection test failed',
        variant: 'destructive',
      });
    },
  });

  // Sync emails
  const syncEmailsMutation = useMutation({
    mutationFn: async (options: { folderName?: string; isFullSync?: boolean }) => {
      return apiRequest(`/api/email/accounts/${accountId}/sync`, {
        method: 'POST',
        body: JSON.stringify(options),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Email sync completed',
        description: `Synced ${data.processedMessages} messages`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Email sync failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleConfigureImap = () => {
    configureImapMutation.mutate(imapConfig);
  };

  const handleConfigureSmtp = () => {
    configureSmtpMutation.mutate(smtpConfig);
  };

  const handleTestImap = () => {
    testImapMutation.mutate();
  };

  const handleTestSmtp = () => {
    testSmtpMutation.mutate();
  };

  const handleSyncEmails = (isFullSync = false) => {
    syncEmailsMutation.mutate({ folderName: 'INBOX', isFullSync });
  };

  // Common email provider configurations
  const getProviderConfig = (provider: string, email: string) => {
    const configs = {
      gmail: {
        imap: { host: 'imap.gmail.com', port: 993, sslEnabled: true },
        smtp: { host: 'smtp.gmail.com', port: 587, sslEnabled: true },
      },
      outlook: {
        imap: { host: 'outlook.office365.com', port: 993, sslEnabled: true },
        smtp: { host: 'smtp.office365.com', port: 587, sslEnabled: true },
      },
      yahoo: {
        imap: { host: 'imap.mail.yahoo.com', port: 993, sslEnabled: true },
        smtp: { host: 'smtp.mail.yahoo.com', port: 587, sslEnabled: true },
      },
    };

    const config = configs[provider as keyof typeof configs];
    if (config) {
      setImapConfig(prev => ({ ...prev, ...config.imap, username: email }));
      setSmtpConfig(prev => ({ ...prev, ...config.smtp, username: email }));
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Email Account Configuration</CardTitle>
          </div>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
        <CardDescription>
          Configure IMAP and SMTP settings for {account?.emailAddress}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="imap">IMAP (Receiving)</TabsTrigger>
            <TabsTrigger value="smtp">SMTP (Sending)</TabsTrigger>
            <TabsTrigger value="sync">Sync & Test</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    IMAP Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={account?.imapEnabled ? 'default' : 'secondary'}>
                    {account?.imapEnabled ? 'Configured' : 'Not Configured'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    SMTP Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={account?.smtpEnabled ? 'default' : 'secondary'}>
                    {account?.smtpEnabled ? 'Configured' : 'Not Configured'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Last Sync
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {account?.lastSyncAt 
                      ? new Date(account.lastSyncAt).toLocaleString()
                      : 'Never'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Quick Setup</h4>
              <p className="text-sm text-muted-foreground">
                Choose your email provider for automatic configuration:
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => getProviderConfig('gmail', account?.emailAddress || '')}
                >
                  Gmail
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => getProviderConfig('outlook', account?.emailAddress || '')}
                >
                  Outlook
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => getProviderConfig('yahoo', account?.emailAddress || '')}
                >
                  Yahoo
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="imap" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imap-host">IMAP Server</Label>
                  <Input
                    id="imap-host"
                    value={imapConfig.host}
                    onChange={(e) => setImapConfig(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="imap.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imap-port">Port</Label>
                  <Input
                    id="imap-port"
                    type="number"
                    value={imapConfig.port}
                    onChange={(e) => setImapConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imap-username">Username</Label>
                  <Input
                    id="imap-username"
                    value={imapConfig.username}
                    onChange={(e) => setImapConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imap-password">Password</Label>
                  <Input
                    id="imap-password"
                    type="password"
                    value={imapConfig.password}
                    onChange={(e) => setImapConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="App password or account password"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="imap-ssl"
                  checked={imapConfig.sslEnabled}
                  onCheckedChange={(checked) => setImapConfig(prev => ({ ...prev, sslEnabled: checked }))}
                />
                <Label htmlFor="imap-ssl">Use SSL/TLS</Label>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleConfigureImap}
                  disabled={configureImapMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  {configureImapMutation.isPending ? 'Saving...' : 'Save IMAP Config'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleTestImap}
                  disabled={testImapMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  {testImapMutation.isPending ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>

              {imapTestResult !== null && (
                <div className={`flex items-center gap-2 p-3 rounded-md ${
                  imapTestResult ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {imapTestResult ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {imapTestResult ? 'IMAP connection successful' : 'IMAP connection failed'}
                  </span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="smtp" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Server</Label>
                  <Input
                    id="smtp-host"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={smtpConfig.port}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-username">Username</Label>
                  <Input
                    id="smtp-username"
                    value={smtpConfig.username}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-password">Password</Label>
                  <Input
                    id="smtp-password"
                    type="password"
                    value={smtpConfig.password}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="App password or account password"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="smtp-ssl"
                  checked={smtpConfig.sslEnabled}
                  onCheckedChange={(checked) => setSmtpConfig(prev => ({ ...prev, sslEnabled: checked }))}
                />
                <Label htmlFor="smtp-ssl">Use SSL/TLS</Label>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleConfigureSmtp}
                  disabled={configureSmtpMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  {configureSmtpMutation.isPending ? 'Saving...' : 'Save SMTP Config'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleTestSmtp}
                  disabled={testSmtpMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  {testSmtpMutation.isPending ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>

              {smtpTestResult !== null && (
                <div className={`flex items-center gap-2 p-3 rounded-md ${
                  smtpTestResult ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {smtpTestResult ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {smtpTestResult ? 'SMTP connection successful' : 'SMTP connection failed'}
                  </span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sync" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Email Synchronization</h4>
                <p className="text-sm text-muted-foreground">
                  Sync emails from your IMAP account to BackstageOS.
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => handleSyncEmails(false)}
                  disabled={syncEmailsMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {syncEmailsMutation.isPending ? 'Syncing...' : 'Quick Sync (New Messages)'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleSyncEmails(true)}
                  disabled={syncEmailsMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {syncEmailsMutation.isPending ? 'Syncing...' : 'Full Sync (All Messages)'}
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Sync Status</h4>
                <div className="text-sm text-muted-foreground">
                  <div>Last sync: {account?.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString() : 'Never'}</div>
                  <div>Next sync: {account?.nextSyncAt ? new Date(account.nextSyncAt).toLocaleString() : 'Not scheduled'}</div>
                  <div>Total emails received: {account?.receivedCount || 0}</div>
                  <div>Total emails sent: {account?.sentCount || 0}</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}