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
import { cn } from "@/lib/utils";
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
  Clock,
  ChevronDown,
  Theater,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
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

  // Define folders array similar to desktop sidebar
  const folders = [
    { id: "inbox", name: "Inbox", icon: Inbox, count: accountStats?.unreadMessages || 0 },
    { id: "sent", name: "Sent", icon: Send, count: 0 },
    { id: "drafts", name: "Drafts", icon: Clock, count: accountStats?.draftCount || 0 },
    { id: "archive", name: "Archive", icon: Archive, count: 0 },
    { id: "trash", name: "Trash", icon: Trash2, count: 0 },
  ];

  return (
    <div className="w-full min-h-screen bg-white relative">
      {/* Mobile Navigation Panel - Side navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 bottom-0 w-80 z-50 bg-white border-r border-gray-200 shadow-lg overflow-hidden">
          {/* Mobile Menu Panel */}
          <div className="w-full bg-white p-4 space-y-4 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Email</h2>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Account Selector */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-between mr-2">
                      <div className="flex items-center space-x-2">
                        <div className="text-left">
                          <div className="font-medium text-sm">
                            {selectedAccount?.displayName || "Select Account"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {selectedAccount?.emailAddress || "No account selected"}
                          </div>
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    {emailAccounts && Array.isArray(emailAccounts) && (emailAccounts as EmailAccount[]).length > 0 ? (
                      (emailAccounts as EmailAccount[]).map((account) => (
                        <DropdownMenuItem
                          key={account.id}
                          onClick={() => {
                            setSelectedAccount(account);
                            setIsMobileMenuOpen(false);
                          }}
                          className={selectedAccount?.id === account.id ? 'bg-blue-50' : ''}
                        >
                          <div className="w-full">
                            <div className="font-medium">{account.displayName}</div>
                            <div className="text-xs text-gray-500">{account.emailAddress}</div>
                          </div>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>No accounts found</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Edit Button */}
                {selectedAccount && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditDisplayName(selectedAccount.displayName);
                      setShowEditAccount(true);
                    }}
                    className="p-2 h-auto"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

              {/* Compose Button */}
            <div className="mb-4">
              <Button 
                onClick={() => {
                  setShowCompose(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Compose
              </Button>
            </div>

            {/* Folders Section */}
            <div className="space-y-1">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    setActiveFolder(folder.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between",
                    activeFolder === folder.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <folder.icon className="w-4 h-4" />
                    <span>{folder.name}</span>
                  </div>
                  {folder.count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {folder.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
            
            {/* Theater Tools Section */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Theater Tools</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-50 text-gray-700 flex items-center space-x-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Group Emailing</span>
                </button>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-50 text-gray-700 flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Theater Templates</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Desktop Sidebar */}
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
          } relative`}
        >

          <div className="px-2 md:px-4 lg:px-8 py-2 md:py-6">
          {/* Header - Mobile with hamburger left, search right */}
          <div className="border-b border-gray-200 pb-2 md:pb-4">
            <div className="flex items-center gap-3 mb-4">
              {/* Mobile hamburger menu - left side */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              {/* Email title */}
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 flex-shrink-0">
                Email
              </h1>
              
              {/* Search bar - mobile and desktop */}
              <div className="flex-1 max-w-md">
                <Input
                  type="text"
                  placeholder="Search emails..."
                  className="w-full h-8 md:h-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>
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

      {/* Edit Account Dialog */}
      <Dialog open={showEditAccount} onOpenChange={setShowEditAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account Display Name</DialogTitle>
            <DialogDescription>
              Change how your name appears in sent emails.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDisplayName">Display Name</Label>
              <Input
                id="editDisplayName"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Enter display name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowEditAccount(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={() => {
                // TODO: Implement edit account functionality
                setShowEditAccount(false);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}