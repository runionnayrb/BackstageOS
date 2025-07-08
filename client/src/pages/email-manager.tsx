import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmailSidebar } from "@/components/email/email-sidebar";
import { EmailInterface } from "@/components/email/email-interface-clean";
import { apiRequest } from "@/lib/queryClient";
import {
  Mail,
  Plus,
  Menu,
  X,
  Inbox,
  Send,
  Archive,
  Trash2,
  Edit,
  Users,
  FileText,
} from "lucide-react";

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
  const [showCompose, setShowCompose] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState("inbox");
  const queryClient = useQueryClient();

  // Fetch email accounts
  const { data: emailAccounts, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ['/api/email/accounts'],
    enabled: true,
  });

  // Fetch account stats for selected account
  const { data: accountStats } = useQuery({
    queryKey: ['/api/email/stats', selectedAccount?.id],
    enabled: !!selectedAccount?.id,
  });

  // Set default account when accounts load
  useEffect(() => {
    if (emailAccounts && Array.isArray(emailAccounts) && (emailAccounts as EmailAccount[]).length > 0 && !selectedAccount) {
      const defaultAccount = (emailAccounts as EmailAccount[]).find((account: EmailAccount) => account.isDefault);
      if (defaultAccount) {
        setSelectedAccount(defaultAccount);
      } else {
        setSelectedAccount((emailAccounts as EmailAccount[])[0]);
      }
    }
  }, [emailAccounts, selectedAccount]);

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const data = Object.fromEntries(formData.entries());
      const response = await fetch('/api/email/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: data.displayName,
          emailPrefix: data.emailPrefix,
          accountType: data.accountType,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create account');
      }
      return response.json();
    },
    onSuccess: (newAccount: EmailAccount) => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts'] });
      setSelectedAccount(newAccount);
      setIsCreateDialogOpen(false);
    },
  });

  // Handle form submission
  const handleCreateAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createAccountMutation.mutate(formData);
  };

  // Loading state
  if (accountsLoading) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading email system...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (accountsError) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Email System Error</CardTitle>
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
          activeFolder={activeFolder}
          onFolderChange={setActiveFolder}
        />
      </div>

      {/* Main Content - Mobile Full Width, Desktop With Sidebar */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "md:ml-0" : "md:ml-64"
        }`}
      >
        <div className="px-2 md:px-4 lg:px-8 py-2 md:py-6">
          {/* Header - Desktop Style on All Devices */}
          <div className="border-b border-gray-200 pb-2 md:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl md:text-3xl font-bold text-gray-900">
                Email
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden h-8 w-8 p-0 hover:bg-gray-100"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>

            {/* Account Selector and Actions - Desktop Style */}
            {selectedAccount && (
              <div className="space-y-3">
                {/* Account Selector */}
                {emailAccounts && Array.isArray(emailAccounts) && (emailAccounts as EmailAccount[]).length > 1 && (
                  <Select 
                    value={selectedAccount?.id?.toString() || ''} 
                    onValueChange={(value) => {
                      const account = (emailAccounts as EmailAccount[]).find(acc => acc.id.toString() === value);
                      if (account) setSelectedAccount(account);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {(emailAccounts as EmailAccount[]).map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{account.displayName}</span>
                            <span className="text-sm text-gray-500">{account.emailAddress}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Compose Button */}
                <Button 
                  onClick={() => setShowCompose(true)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Compose
                </Button>
              </div>
            )}
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
              activeFolder={activeFolder}
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

      {/* Create Account Dialog */}
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
                    {emailAccounts && Array.isArray(emailAccounts) && (emailAccounts as EmailAccount[]).length > 0 ? (
                      (emailAccounts as EmailAccount[]).map((account) => (
                        <button
                          key={account.id}
                          onClick={() => {
                            setSelectedAccount(account);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full text-left p-3 rounded-md hover:bg-gray-50 border ${
                            selectedAccount?.id === account.id ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="font-medium text-gray-900 truncate">
                            {account.displayName}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {account.emailAddress}
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No accounts available</p>
                    )}
                  </div>
                </div>

                {/* Create Account Button */}
                <Button 
                  onClick={() => {
                    setIsCreateDialogOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Account
                </Button>

                {/* Compose Button */}
                <Button 
                  onClick={() => {
                    setShowCompose(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Compose
                </Button>

                {/* Navigation Folders */}
                {selectedAccount && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Folders</h3>
                    <div className="space-y-1">
                      <Button 
                        variant={activeFolder === "inbox" ? "default" : "ghost"} 
                        className="w-full justify-start text-left"
                        onClick={() => {
                          setActiveFolder("inbox");
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Inbox className="w-4 h-4 mr-2" />
                        Inbox
                        {accountStats && (accountStats as any).unreadMessages > 0 && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {(accountStats as any).unreadMessages}
                          </Badge>
                        )}
                      </Button>
                      <Button 
                        variant={activeFolder === "sent" ? "default" : "ghost"} 
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveFolder("sent");
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Sent
                      </Button>
                      <Button 
                        variant={activeFolder === "drafts" ? "default" : "ghost"} 
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveFolder("drafts");
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Drafts
                        {accountStats && (accountStats as any).draftCount > 0 && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {(accountStats as any).draftCount}
                          </Badge>
                        )}
                      </Button>
                      <Button 
                        variant={activeFolder === "archive" ? "default" : "ghost"} 
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveFolder("archive");
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </Button>
                      <Button 
                        variant={activeFolder === "trash" ? "default" : "ghost"} 
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveFolder("trash");
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Trash
                      </Button>
                    </div>
                  </div>
                )}

                {/* Theater Tools Section */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Theater Tools</h3>
                  <div className="space-y-1">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-left"
                      onClick={() => {
                        setShowCompose(true);
                        setIsMobileMenuOpen(false);
                        // Could set theater mode context here
                      }}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Send to Groups
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        console.log('Theater templates clicked');
                        // Could navigate to templates view
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Email Templates
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}