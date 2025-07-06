import { useState, useEffect } from "react";
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

  // Auto-select default account or first account when available
  useEffect(() => {
    if (emailAccounts.length > 0 && !selectedAccount) {
      // Find default account or use first account
      const defaultAccount = emailAccounts.find((account: EmailAccount) => account.isDefault);
      const accountToSelect = defaultAccount || emailAccounts[0];
      setSelectedAccount(accountToSelect);
    }
  }, [emailAccounts, selectedAccount]);

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
    <div className="w-full min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
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
                New Account
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

        {/* Main Content - Full Width Email Interface */}
        {accountsLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading email system...</p>
            </div>
          </div>
        ) : (emailAccounts as EmailAccount[]).length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Email Accounts Yet
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first @backstageos.com address to get started
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Your First Account
              </Button>
            </CardContent>
          </Card>
        ) : selectedAccount ? (
          <EmailInterface 
            selectedAccount={selectedAccount} 
            onBack={() => setSelectedAccount(null)}
          />
        ) : (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading inbox...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}