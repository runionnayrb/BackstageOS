import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, CheckCircle, AlertTriangle, Trash2, Plus, Send } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ForwardingRule {
  id: number;
  accountId: number;
  forwardToEmail: string;
  isActive: boolean;
  forwardIncoming: boolean;
  forwardOutgoing: boolean;
  keepOriginal: boolean;
  backstageEmail: string;
  displayName: string;
  accountType: string;
  createdAt: string;
}

interface EmailAccount {
  id: number;
  emailAddress: string;
  displayName: string;
  accountType: string;
}

export default function EmailForwardingSetupPage() {
  const [newRuleEmail, setNewRuleEmail] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Get user's email accounts
  const { data: emailAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/email/accounts'],
  });

  // Get existing forwarding rules
  const { data: forwardingRules, isLoading: rulesLoading } = useQuery({
    queryKey: ['/api/email-forwarding/rules'],
  });

  // Create forwarding rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: { accountId: number; forwardToEmail: string }) => {
      return apiRequest('/api/email-forwarding/rules', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-forwarding/rules'] });
      setNewRuleEmail('');
      setSelectedAccountId(null);
      toast({
        title: 'Success',
        description: 'Email forwarding rule created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create forwarding rule',
        variant: 'destructive',
      });
    },
  });

  // Update forwarding rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<ForwardingRule>) => {
      return apiRequest(`/api/email-forwarding/rules/${id}`, {
        method: 'PUT',
        body: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-forwarding/rules'] });
      toast({
        title: 'Success',
        description: 'Forwarding rule updated successfully',
      });
    },
  });

  // Delete forwarding rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/email-forwarding/rules/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-forwarding/rules'] });
      toast({
        title: 'Success',
        description: 'Forwarding rule deleted successfully',
      });
    },
  });

  // Test forwarding mutation
  const testForwardingMutation = useMutation({
    mutationFn: async (accountId: number) => {
      return apiRequest('/api/email-forwarding/test', {
        method: 'POST',
        body: { accountId },
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Test Email Sent',
        description: data.message,
      });
    },
  });

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !newRuleEmail) {
      toast({
        title: 'Error',
        description: 'Please select an account and enter an email address',
        variant: 'destructive',
      });
      return;
    }

    createRuleMutation.mutate({
      accountId: selectedAccountId,
      forwardToEmail: newRuleEmail,
    });
  };

  const handleToggleRule = (rule: ForwardingRule, field: keyof Pick<ForwardingRule, 'isActive' | 'forwardIncoming' | 'forwardOutgoing' | 'keepOriginal'>) => {
    updateRuleMutation.mutate({
      id: rule.id,
      [field]: !rule[field],
    });
  };

  const handleDeleteRule = (id: number) => {
    if (confirm('Are you sure you want to delete this forwarding rule?')) {
      deleteRuleMutation.mutate(id);
    }
  };

  const handleTestForwarding = (accountId: number) => {
    testForwardingMutation.mutate(accountId);
  };

  if (accountsLoading || rulesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/email-setup/apple-mail">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Mail className="h-6 w-6" />
              Email Forwarding Setup
            </h1>
            <p className="text-muted-foreground">
              Forward your BackstageOS emails to Apple Mail or other email clients
            </p>
          </div>
        </div>

        {/* How It Works */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>How Email Forwarding Works:</strong> When someone sends an email to your BackstageOS address, 
            we'll automatically forward a copy to your personal email (like Gmail or Apple Mail). You can then reply 
            directly from your personal email, and it will be sent as your BackstageOS address.
          </AlertDescription>
        </Alert>

        {/* Create New Forwarding Rule */}
        <Card>
          <CardHeader>
            <CardTitle>Add Email Forwarding</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="account">BackstageOS Email Account</Label>
                  <select
                    id="account"
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select an account...</option>
                    {emailAccounts?.map((account: EmailAccount) => (
                      <option key={account.id} value={account.id}>
                        {account.emailAddress} ({account.displayName})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="forwardTo">Forward to Email</Label>
                  <Input
                    id="forwardTo"
                    type="email"
                    placeholder="your.email@gmail.com"
                    value={newRuleEmail}
                    onChange={(e) => setNewRuleEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={createRuleMutation.isPending}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {createRuleMutation.isPending ? 'Creating...' : 'Create Forwarding Rule'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Forwarding Rules */}
        {forwardingRules && forwardingRules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Forwarding Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forwardingRules.map((rule: ForwardingRule) => (
                  <div key={rule.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">{rule.accountType}</Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <p><strong>From:</strong> {rule.backstageEmail}</p>
                          <p><strong>To:</strong> {rule.forwardToEmail}</p>
                        </div>
                        
                        <div className="flex items-center gap-6 mt-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.isActive}
                              onCheckedChange={() => handleToggleRule(rule, 'isActive')}
                              disabled={updateRuleMutation.isPending}
                            />
                            <span className="text-sm">Active</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.forwardIncoming}
                              onCheckedChange={() => handleToggleRule(rule, 'forwardIncoming')}
                              disabled={updateRuleMutation.isPending}
                            />
                            <span className="text-sm">Forward Incoming</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.keepOriginal}
                              onCheckedChange={() => handleToggleRule(rule, 'keepOriginal')}
                              disabled={updateRuleMutation.isPending}
                            />
                            <span className="text-sm">Keep Copy</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestForwarding(rule.accountId)}
                          disabled={testForwardingMutation.isPending}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                          disabled={deleteRuleMutation.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <p className="text-sm">
                  <strong>Test the forwarding:</strong> Click the "Test" button next to your forwarding rule to send a test email.
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <p className="text-sm">
                  <strong>Check your personal email:</strong> You should receive the forwarded email in your Gmail, Apple Mail, or other email client.
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <p className="text-sm">
                  <strong>Reply naturally:</strong> When you reply to forwarded emails, your response will be sent from your BackstageOS address automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}