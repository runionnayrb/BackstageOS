import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Theater, 
  Mail, 
  Users, 
  Settings, 
  TrendingUp, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useParams } from 'wouter';

interface EmailTemplate {
  id: number;
  name: string;
  templateType: string;
  subject: string;
  content: string;
  projectId?: number;
}

interface EmailRule {
  id: number;
  name: string;
  description: string;
  isEnabled: boolean;
  conditions: any;
  actions: any;
}

interface DeliveryStats {
  total: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export default function TheaterEmail() {
  const { showId } = useParams<{ showId: string }>();
  const [selectedTab, setSelectedTab] = useState('overview');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get email accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/email/accounts'],
  });

  const primaryAccount = accounts[0];

  // Get show details
  const { data: show } = useQuery({
    queryKey: ['/api/projects', showId],
    enabled: !!showId,
  });

  // Get delivery stats
  const { data: deliveryStats } = useQuery<DeliveryStats>({
    queryKey: ['/api/email/accounts', primaryAccount?.id, 'delivery-stats', 'detailed'],
    enabled: !!primaryAccount,
  });

  // Get email templates
  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email/templates'],
    queryFn: () => apiRequest(`/api/email/templates?showId=${showId}`),
    enabled: !!showId,
  });

  // Get email rules
  const { data: rules = [] } = useQuery<EmailRule[]>({
    queryKey: ['/api/email/rules'],
    queryFn: () => apiRequest(`/api/email/rules?accountId=${primaryAccount?.id}&showId=${showId}`),
    enabled: !!primaryAccount && !!showId,
  });

  // Get show emails
  const { data: showEmails = [] } = useQuery({
    queryKey: ['/api/email/shows', showId, 'messages'],
    enabled: !!showId,
  });

  // Create default templates mutation
  const createTemplatesMutation = useMutation({
    mutationFn: () => apiRequest('/api/email/templates', {
      method: 'POST',
      body: {
        name: 'Call Sheet',
        templateType: 'call_sheet',
        subject: `${show?.name} - Call Sheet for {{date}}`,
        content: `Dear {{recipientName}},\n\nPlease find the call sheet for ${show?.name} on {{date}}.\n\nCall Time: {{callTime}}\nLocation: ${show?.venue}\n\nThank you,\n{{senderName}}\nStage Manager`,
        projectId: parseInt(showId!),
      },
    }),
    onSuccess: () => {
      toast({ title: 'Template created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/email/templates'] });
    },
  });

  // Bulk email mutation
  const bulkEmailMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/email/shows/${showId}/bulk-send`, {
      method: 'POST',
      body: data,
    }),
    onSuccess: (result) => {
      toast({ 
        title: 'Bulk email sent', 
        description: `${result.sent} emails sent, ${result.failed} failed` 
      });
    },
  });

  const handleBulkEmail = (recipientType: string) => {
    if (!primaryAccount) return;
    
    bulkEmailMutation.mutate({
      accountId: primaryAccount.id,
      recipientType,
      subject: `${show?.name} - Update`,
      message: `Dear team,\n\nThis is an update for ${show?.name}.\n\nBest regards,\nStage Management`,
    });
  };

  if (!showId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Theater className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Select a Show</h2>
          <p className="text-gray-600 mb-4">Choose a show to manage theater-specific email features</p>
          <Link href="/shows">
            <Button>Browse Shows</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Theater className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Theater Email Management</h1>
        </div>
        <p className="text-gray-600">
          Manage email communications for {show?.name || 'your production'}
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Email</TabsTrigger>
          <TabsTrigger value="rules">Auto-Rules</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Show Emails</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{showEmails.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total emails for this production
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active email templates
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Auto-Rules</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rules.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active filtering rules
                </p>
              </CardContent>
            </Card>
          </div>

          {deliveryStats && (
            <Card>
              <CardHeader>
                <CardTitle>Email Performance</CardTitle>
                <CardDescription>Recent delivery and engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{deliveryStats.deliveryRate}%</div>
                    <div className="text-sm text-gray-600">Delivery Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{deliveryStats.openRate}%</div>
                    <div className="text-sm text-gray-600">Open Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{deliveryStats.clickRate}%</div>
                    <div className="text-sm text-gray-600">Click Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{deliveryStats.bounceRate}%</div>
                    <div className="text-sm text-gray-600">Bounce Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Email Templates</h2>
            <Button onClick={() => createTemplatesMutation.mutate()}>
              Create Call Sheet Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge variant="secondary">{template.templateType}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{template.subject}</p>
                  <div className="text-xs text-gray-500 line-clamp-3">
                    {template.content}
                  </div>
                </CardContent>
              </Card>
            ))}

            {templates.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
                <p className="text-gray-600 mb-4">Create email templates for call sheets, reports, and more</p>
                <Button onClick={() => createTemplatesMutation.mutate()}>
                  Create First Template
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Bulk Email to Cast & Crew</h2>
            <p className="text-gray-600 mb-6">
              Send emails to specific groups for {show?.name}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => handleBulkEmail('all')}>
              <CardHeader className="text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <CardTitle className="text-lg">All Team</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-gray-600">Send to entire production team</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => handleBulkEmail('cast')}>
              <CardHeader className="text-center">
                <Theater className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <CardTitle className="text-lg">Cast Only</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-gray-600">Send to actors and performers</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => handleBulkEmail('crew')}>
              <CardHeader className="text-center">
                <Settings className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <CardTitle className="text-lg">Crew Only</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-gray-600">Send to technical crew</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => handleBulkEmail('creative')}>
              <CardHeader className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <CardTitle className="text-lg">Creative Team</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-gray-600">Send to directors and designers</p>
              </CardContent>
            </Card>
          </div>

          {bulkEmailMutation.isPending && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Sending emails...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Email Auto-Filing Rules</h2>
            <p className="text-gray-600 mb-6">
              Automatically organize emails based on content and recipients
            </p>
          </div>

          <div className="space-y-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <CardDescription>{rule.description}</CardDescription>
                    </div>
                    <Badge variant={rule.isEnabled ? "default" : "secondary"}>
                      {rule.isEnabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    <strong>Conditions:</strong> {JSON.stringify(rule.conditions)}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    <strong>Actions:</strong> {JSON.stringify(rule.actions)}
                  </div>
                </CardContent>
              </Card>
            ))}

            {rules.length === 0 && (
              <div className="text-center py-12">
                <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Auto-Rules Set</h3>
                <p className="text-gray-600 mb-4">Create rules to automatically organize show emails</p>
                <Button>Create First Rule</Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Email Analytics</h2>
            <p className="text-gray-600 mb-6">
              Track email performance and engagement
            </p>
          </div>

          {deliveryStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Delivered</span>
                    </div>
                    <span className="font-semibold">{deliveryStats.delivered}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>Bounced</span>
                    </div>
                    <span className="font-semibold">{deliveryStats.bounced}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span>Opened</span>
                    </div>
                    <span className="font-semibold">{deliveryStats.opened}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <MousePointer className="h-4 w-4 text-purple-600" />
                      <span>Clicked</span>
                    </div>
                    <span className="font-semibold">{deliveryStats.clicked}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Rates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Delivery Rate</span>
                      <span className="font-semibold">{deliveryStats.deliveryRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${deliveryStats.deliveryRate}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Open Rate</span>
                      <span className="font-semibold">{deliveryStats.openRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${deliveryStats.openRate}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Click Rate</span>
                      <span className="font-semibold">{deliveryStats.clickRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${deliveryStats.clickRate}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}