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
import { Mail, Plus, Settings, FolderOpen, Users, BarChart3, Inbox, Send, Trash2, Archive, Clock, Menu, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { EmailInterface } from "@/components/email/email-interface-clean";
import { EmailSidebar } from "@/components/email/email-sidebar";

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  // Check if email system is set up
  const { data: setupStatus, isLoading: setupLoading } = useQuery({
    queryKey: ['/api/email/setup-status'],
    retry: false,
  });

  const setupCompleted = (setupStatus as any)?.isSetup === true;

  // Fetch email accounts only if setup is completed
  const { data: emailAccounts = [], isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ['/api/email/accounts'],
    enabled: setupCompleted,
    retry: false,
  });

  // Auto-select default account if none selected
  useEffect(() => {
    if (emailAccounts && Array.isArray(emailAccounts) && emailAccounts.length > 0 && !selectedAccount) {
      const defaultAccount = (emailAccounts as EmailAccount[]).find((account: EmailAccount) => account.isDefault);
      if (defaultAccount) {
        setSelectedAccount(defaultAccount);
      }
    }
  }, [emailAccounts, selectedAccount]);

  // Fetch stats for selected account
  const { data: accountStats } = useQuery({
    queryKey: ['/api/email/accounts', selectedAccount?.id, 'stats'],
    enabled: !!selectedAccount,
    retry: false,
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest('/api/email/accounts', 'POST', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Email Account Created",
        description: "Your new email account is ready to use",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create email account",
        variant: "destructive",
      });
    },
  });

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createAccountMutation.mutate(formData);
  };

  // Show loading state during setup check
  if (setupLoading) {
    return (
      <div className="w-full min-h-screen bg-white">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading email system...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show setup required message if system is not set up
  if (!setupCompleted) {
    return (
      <div className="w-full min-h-screen bg-white">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Email System Setup Required</CardTitle>
              <CardDescription>
                The email system has not been initialized yet. Please contact your administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white relative">
      {/* Mobile: Hide Sidebar, Desktop: Show Sidebar */}
      <div className="hidden md:block">
        <EmailSidebar
          emailAccounts={emailAccounts as EmailAccount[]}
          selectedAccount={selectedAccount}
          onAccountSelect={setSelectedAccount}
          onCreateAccount={() => setIsCreateDialogOpen(true)}
          onCompose={() => setShowCompose(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          accountStats={accountStats as EmailStats}
        />
      </div>

      {/* Main Content - Mobile Full Width, Desktop With Sidebar */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "md:ml-0" : "md:ml-64"
        }`}
      >
        <div className="px-2 md:px-4 lg:px-8 py-2 md:py-6">
          {/* Header - Mobile Optimized */}
          <div className="border-b border-gray-200 pb-2 md:pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-gray-900">
                  Email
                </h1>
              </div>
              {/* Mobile Actions */}
              <div className="md:hidden flex items-center gap-2">
                {/* Mobile Menu Button */}
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2"
                >
                  <Menu className="w-5 h-5" />
                </Button>
                
                {/* Mobile Account Selector */}
                {emailAccounts && Array.isArray(emailAccounts) && emailAccounts.length > 1 && (
                  <Select 
                    value={selectedAccount?.id?.toString() || ''} 
                    onValueChange={(value) => {
                      const account = (emailAccounts as EmailAccount[]).find(acc => acc.id.toString() === value);
                      if (account) setSelectedAccount(account);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {(emailAccounts as EmailAccount[]).map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.emailAddress.split('@')[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button 
                  onClick={() => setShowCompose(true)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Compose
                </Button>
              </div>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                      <Label htmlFor="emailPrefix">Email Address</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="emailPrefix"
                          name="emailPrefix"
                          placeholder="bryan.runion"
                          pattern="[a-z0-9.-]+"
                          title="Only lowercase letters, numbers, dots, and hyphens allowed"
                          required
                        />
                        <span className="text-gray-500">@backstageos.com</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="accountType">Account Type</Label>
                      <Select name="accountType" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="show-specific">Show-Specific</SelectItem>
                          <SelectItem value="department">Department</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createAccountMutation.isPending}
                    >
                      {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Main Content - Email Interface */}
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
              showCompose={showCompose}
              onShowComposeChange={setShowCompose}
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

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Mobile Menu Panel */}
          <div className="absolute left-0 top-0 h-full w-80 max-w-[90vw] bg-white shadow-xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Navigation Content */}
              <div className="flex-1 p-4 space-y-4">
                {/* Email Accounts Section */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Email Accounts</h3>
                  <div className="space-y-2">
                    {emailAccounts && Array.isArray(emailAccounts) && emailAccounts.length > 0 ? (
                      (emailAccounts as EmailAccount[]).map((account) => (
                        <button
                          key={account.id}
                          onClick={() => {
                            setSelectedAccount(account);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                            selectedAccount?.id === account.id 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <Mail className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{account.displayName}</p>
                              <p className="text-sm text-gray-500">{account.emailAddress}</p>
                            </div>
                          </div>
                          {account.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No email accounts found</p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => {
                        setShowCompose(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start"
                      variant="ghost"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Compose Email
                    </Button>
                    
                    <Button 
                      onClick={() => {
                        setIsCreateDialogOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start"
                      variant="ghost"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Create Account
                    </Button>
                  </div>
                </div>

                {/* Folders Section */}
                {selectedAccount && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Folders</h3>
                    <div className="space-y-1">
                      <Button variant="ghost" className="w-full justify-start text-left">
                        <Inbox className="w-4 h-4 mr-2" />
                        Inbox
                        {accountStats && (accountStats as any).unreadMessages > 0 && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {(accountStats as any).unreadMessages}
                          </Badge>
                        )}
                      </Button>
                      <Button variant="ghost" className="w-full justify-start">
                        <Send className="w-4 h-4 mr-2" />
                        Sent
                      </Button>
                      <Button variant="ghost" className="w-full justify-start">
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </Button>
                      <Button variant="ghost" className="w-full justify-start">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Trash
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}