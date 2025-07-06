import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Mail, Plus, Settings, FolderOpen, Users, BarChart3, Inbox, Send, Trash2, Archive, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { EmailInterface } from "@/components/email/email-interface";

interface EmailAccount {
  id: number;
  userId: number;
  projectId?: number;
  emailAddress: string;
  displayName: string;
  accountType: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface EmailStats {
  totalMessages: number;
  unreadMessages: number;
  threadsCount: number;
  draftCount: number;
}

export default function EmailManager() {
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Check if email system is set up
  const { data: setupStatus, isLoading: setupLoading } = useQuery({
    queryKey: ['/api/email/setup-status'],
    retry: false,
  });

  const setupCompleted = setupStatus?.isSetup === true;

  // Fetch email accounts only if setup is completed
  const { data: emailAccounts = [], isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ['/api/email/accounts'],
    enabled: setupCompleted,
  });

  const { data: emailStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/email/accounts', selectedAccount?.id, 'stats'],
    enabled: !!selectedAccount && setupCompleted,
  });

  // Mutations
  const setupMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/email/setup', {}),
    onSuccess: () => {
      toast({
        title: "Email System Setup",
        description: "Email system tables created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email/setup-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup email system",
        variant: "destructive",
      });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/email/accounts', data),
    onSuccess: () => {
      toast({
        title: "Email Account Created",
        description: "Your new email account has been created successfully",
      });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create email account",
        variant: "destructive",
      });
    },
  });

  const handleSetupEmail = () => {
    setupMutation.mutate();
  };

  const handleCreateAccount = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const emailPrefix = formData.get('emailAddress') as string;
    const fullEmailAddress = `${emailPrefix}@backstageos.com`;
    
    const accountData = {
      displayName: formData.get('displayName'),
      emailAddress: fullEmailAddress,
      accountType: formData.get('accountType'),
      isDefault: formData.get('isDefault') === 'on',
    };

    createAccountMutation.mutate(accountData);
  };

  // Show loading state while checking setup status
  if (setupLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Email
            </h1>
            <p className="mt-2 text-gray-600">
              Loading email system...
            </p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!setupCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Email System Setup
            </h1>
            <p className="mt-2 text-gray-600">
              Initialize the integrated email system for BackstageOS
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Setup Required</CardTitle>
              <CardDescription>
                The email system needs to be initialized. This will create the necessary database tables
                and configure email routing for your custom @backstageos.com addresses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleSetupEmail}
                disabled={setupMutation.isPending}
                className="w-full"
              >
                {setupMutation.isPending ? "Setting up..." : "Initialize Email System"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (accountsError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Email System</CardTitle>
              <CardDescription>
                {accountsError instanceof Error ? accountsError.message : "Failed to load email accounts"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Email
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your @backstageos.com email addresses and communication
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Email Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateAccount}>
                <DialogHeader>
                  <DialogTitle>Create Email Account</DialogTitle>
                  <DialogDescription>
                    Create a new @backstageos.com email address for personal or show-specific use
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      placeholder="e.g., Bryan Runion"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="emailAddress">Email Address</Label>
                    <div className="flex">
                      <Input
                        id="emailAddress"
                        name="emailAddress"
                        placeholder="bryan"
                        className="rounded-r-none"
                        required
                      />
                      <div className="bg-gray-100 border border-l-0 rounded-r-md px-3 py-2 text-sm text-gray-600 flex items-center">
                        @backstageos.com
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the part before @backstageos.com (e.g., "bryan" for bryan@backstageos.com)
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select name="accountType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="role">Role-based</SelectItem>
                        <SelectItem value="show">Show-specific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      name="isDefault"
                      className="rounded"
                    />
                    <Label htmlFor="isDefault">Set as default email account</Label>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="submit" disabled={createAccountMutation.isPending}>
                    {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Accounts List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Email Accounts
                </CardTitle>
                <CardDescription>
                  Your @backstageos.com email addresses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {accountsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : emailAccounts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No email accounts yet</p>
                    <p className="text-sm">Create your first @backstageos.com address</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emailAccounts.map((account: EmailAccount) => (
                      <div
                        key={account.id}
                        onClick={() => setSelectedAccount(account)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAccount?.id === account.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {account.displayName}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {account.emailAddress}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={account.accountType === 'personal' ? 'default' : 'secondary'}>
                                {account.accountType}
                              </Badge>
                              {account.isDefault && (
                                <Badge variant="outline">Default</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Email Interface */}
          <div className="lg:col-span-2">
            {selectedAccount ? (
              <EmailInterface 
                selectedAccount={selectedAccount} 
                onBack={() => setSelectedAccount(null)}
              />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select an Email Account
                  </h3>
                  <p className="text-gray-500">
                    Choose an email account from the left to view your inbox
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}