import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmailSidebar } from "@/components/email/email-sidebar";
import { EmailInterface } from "@/components/email/email-interface-clean";
import { EmailAccountConfig } from "@/components/email/email-account-config";
import { SharedInboxManager } from "@/components/email/shared-inbox-manager";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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
  ChevronRight,
  Theater,
  Settings,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  // Helper function to get folder display name
  const getFolderDisplayName = (folder: string) => {
    switch (folder) {
      case 'inbox':
        return 'Inbox';
      case 'sent':
        return 'Sent';
      case 'drafts':
        return 'Drafts';
      case 'archive':
        return 'Archive';
      case 'trash':
        return 'Trash';
      default:
        return 'Email';
    }
  };

  // Get URL parameters for smart email routing
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');

  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeToEmail, setComposeToEmail] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [showTheaterFeatures, setShowTheaterFeatures] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3b82f6');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showSharedInboxes, setShowSharedInboxes] = useState(false);
  const [activeTab, setActiveTab] = useState("inbox");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch email accounts
  const { data: emailAccounts, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ['/api/email/accounts'],
    enabled: true,
  });

  // Check if user has personal account
  const { data: hasPersonalData } = useQuery({
    queryKey: ['/api/email/accounts/has-personal'],
    enabled: true,
  });

  const hasPersonalAccount = hasPersonalData?.hasPersonal || false;

  // Fetch projects for shared inboxes
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    enabled: true,
  });

  // Fetch shared inboxes
  const { data: allSharedInboxes } = useQuery({
    queryKey: ['/api/shared-inboxes'],
    enabled: true,
  });

  // Fetch current user data for admin status
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  // Fetch account stats for selected account
  const { data: accountStats } = useQuery({
    queryKey: ['/api/email/stats', selectedAccount?.id],
    enabled: !!selectedAccount?.id,
  });

  // Email groups data
  const { data: emailGroups = [] } = useQuery({
    queryKey: ['/api/email/groups'],
  });

  // Contacts data for group management
  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/contacts'],
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

  // Handle smart email routing from URL parameters
  useEffect(() => {
    const shouldCompose = urlParams.get('compose') === 'true';
    const fromEmail = urlParams.get('from');
    const toEmail = urlParams.get('to');
    
    if (shouldCompose && fromEmail && emailAccounts && Array.isArray(emailAccounts)) {
      // Find the account that matches the from email address
      const targetAccount = (emailAccounts as EmailAccount[]).find(
        (account: EmailAccount) => account.emailAddress === fromEmail
      );
      
      if (targetAccount) {
        setSelectedAccount(targetAccount);
        setShowCompose(true);
        
        // Set the recipient email if provided
        if (toEmail) {
          setComposeToEmail(toEmail);
        }
        
        // Clear URL parameters after processing (clean URL)
        const [pathname] = location.split('?');
        window.history.replaceState({}, '', pathname);
      }
    }
  }, [urlParams, emailAccounts, location]);

  // Handle group selection for details view
  useEffect(() => {
    if (selectedGroup) {
      setShowGroupDetails(true);
      setShowGroupManager(false);
    }
  }, [selectedGroup]);

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

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: (groupData: any) => apiRequest('POST', '/api/email/groups', groupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/groups'] });
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupColor('#3b82f6');
      setSelectedMembers([]);
      toast({
        title: "Group created",
        description: "Email group has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: number) => apiRequest('DELETE', `/api/email/groups/${groupId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/groups'] });
      toast({
        title: "Group deleted",
        description: "Email group has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete group. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleCreateAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createAccountMutation.mutate(formData);
  };

  // Handle create group
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required.",
        variant: "destructive",
      });
      return;
    }

    createGroupMutation.mutate({
      name: newGroupName,
      description: newGroupDescription,
      color: newGroupColor,
      memberIds: selectedMembers,
    });
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
              <h2 className="text-lg font-semibold text-gray-900">{getFolderDisplayName(activeFolder)}</h2>
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
                    <Button variant="ghost" className="flex-1 justify-between mr-2 border-none">
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
                  <DropdownMenuContent align="start" className="w-64 max-w-[calc(100vw-32px)]">
                    {emailAccounts && Array.isArray(emailAccounts) && (emailAccounts as EmailAccount[]).length > 0 ? (
                      <>
                        {/* Personal Accounts */}
                        {(emailAccounts as EmailAccount[]).filter(account => account.accountType === 'personal').map((account) => (
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
                        ))}
                        
                        {/* Shared Inboxes - Flattened list */}
                        {allSharedInboxes && allSharedInboxes.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Shared Inboxes
                            </div>
                            {allSharedInboxes.map((inbox: any) => (
                              <DropdownMenuItem
                                key={inbox.id}
                                onClick={() => {
                                  console.log('Mobile shared inbox clicked:', inbox);
                                  
                                  // Convert shared inbox to EmailAccount format for selection
                                  const sharedInboxAsAccount: EmailAccount = {
                                    id: inbox.id + 1000, // Add offset to avoid ID conflicts with regular accounts
                                    userId: 0, // Shared inbox doesn't have a specific user
                                    projectId: inbox.projectId,
                                    emailAddress: inbox.emailAddress,
                                    displayName: inbox.name,
                                    accountType: 'shared',
                                    isDefault: false,
                                    isActive: inbox.isActive,
                                    createdAt: new Date().toISOString(),
                                  };
                                  
                                  console.log('Setting selected account to shared inbox:', sharedInboxAsAccount);
                                  setSelectedAccount(sharedInboxAsAccount);
                                  setIsMobileMenuOpen(false);
                                }}
                                className={cn(
                                  "flex flex-col items-start space-y-1 p-3 cursor-pointer",
                                  selectedAccount?.emailAddress === inbox.emailAddress && "bg-blue-50"
                                )}
                              >
                                <p className="text-sm font-medium text-gray-900">
                                  {inbox.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {inbox.emailAddress}
                                </p>
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setIsCreateDialogOpen(true);
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex items-center space-x-2 p-3 text-blue-600"
                        >
                          <Plus className="h-4 w-4" />
                          <span>{hasPersonalAccount && !user?.isAdmin ? "New Team Account" : "New Account"}</span>
                        </DropdownMenuItem>
                        

                      </>
                    ) : (
                      <DropdownMenuItem disabled>No accounts found</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Compose Button */}
                {selectedAccount && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCompose(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-2 h-auto"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
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
              <div className="space-y-1">

                <button
                  onClick={() => {
                    setShowGroupManager(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-50 text-gray-700 flex items-center space-x-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Distro Management</span>
                </button>
                <button
                  onClick={() => {
                    setShowTemplateManager(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-50 text-gray-700 flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Email Templates</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileSettings(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-50 text-gray-700 flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
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
            onTheaterGroupEmail={() => setShowGroupManager(true)}
            onTheaterTemplates={() => setShowTemplateManager(true)}
            onSharedInboxes={() => {}}
            hasPersonalAccount={hasPersonalAccount}
            isAdmin={user?.isAdmin || false}
            user={user}
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
            <div className="flex items-center gap-1.5 mb-4">
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
                {getFolderDisplayName(activeFolder)}
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
          ) : selectedAccount && !showSharedInboxes ? (
            <EmailInterface 
              selectedAccount={selectedAccount} 
              onBack={() => setSelectedAccount(null)}
              showCompose={showCompose}
              onShowComposeChange={(show) => {
                setShowCompose(show);
                if (!show) {
                  // Clear recipient email when closing compose
                  setComposeToEmail('');
                }
              }}
              activeFolder={activeFolder}
              showTheaterFeatures={showTheaterFeatures}
              onShowTheaterFeaturesChange={setShowTheaterFeatures}
              composeToEmail={composeToEmail}
            />
          ) : selectedAccount && showSharedInboxes ? (
            <div className="space-y-4">
              {/* Back button */}
              <Button
                variant="ghost"
                onClick={() => setShowSharedInboxes(false)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Email
              </Button>
              
              {projects && projects.length > 0 ? (
                <div className="space-y-4">
                  {/* Project Selector */}
                  <div className="max-w-md">
                    <Label htmlFor="project-select">Select Project</Label>
                    <Select
                      value={selectedProject?.id?.toString() || ''}
                      onValueChange={(value) => {
                        const project = projects.find(p => p.id.toString() === value);
                        setSelectedProject(project);
                      }}
                    >
                      <SelectTrigger id="project-select">
                        <SelectValue placeholder="Choose a project to manage shared inboxes" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Shared Inbox Manager */}
                  {selectedProject && (
                    <SharedInboxManager
                      projectId={selectedProject.id}
                      projectName={selectedProject.name}
                    />
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Theater className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Projects Found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Create a project first to set up shared inboxes for your production team
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/'}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create Project
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
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



      {/* Group Manager Dialog */}
      <Dialog open={showGroupManager} onOpenChange={setShowGroupManager}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Distro Management</DialogTitle>
            <DialogDescription>
              Manage email distribution lists for quick messaging to cast, crew, and creative teams.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Distribution Lists</h3>
              <Button size="sm" variant="outline" onClick={() => setShowCreateGroup(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {emailGroups.map((group) => (
                <div 
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{group.name}</h4>
                      <p className="text-sm text-gray-600">{group.description}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-purple-600 font-medium">{group.memberCount || 0} people</span>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={(e) => {
                        e.stopPropagation();
                        deleteGroupMutation.mutate(group.id);
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Manager Dialog */}
      <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Management</DialogTitle>
            <DialogDescription>
              Create and manage email templates for common theater communications.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Email Templates</h3>
              <Button onClick={() => {/* Add new template logic */}}>
                <Plus className="h-4 w-4 mr-2" />
                Add Template
              </Button>
            </div>
            
            <div className="grid gap-4">
              {[
                { name: 'Daily Call Sheet', type: 'call_sheet', subject: 'Call Sheet for {{date}}', preview: 'Today\'s schedule and important information...' },
                { name: 'Rehearsal Report', type: 'rehearsal_report', subject: 'Rehearsal Report - {{date}}', preview: 'Summary of today\'s rehearsal progress...' },
                { name: 'Tech Notes', type: 'tech_notes', subject: 'Tech Notes - {{date}}', preview: 'Technical notes and updates...' },
                { name: 'General Update', type: 'general', subject: 'Production Update', preview: 'General production information...' }
              ].map((template, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {template.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Subject: {template.subject}</p>
                        <p className="text-sm text-gray-600">{template.preview}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Details Dialog */}
      <Dialog open={showGroupDetails} onOpenChange={(open) => {
        setShowGroupDetails(open);
        if (!open) {
          setSelectedGroup(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedGroup?.name} Members</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowGroupDetails(false);
                  setShowGroupManager(true);
                  setSelectedGroup(null);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Distros
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Manage members for {selectedGroup?.name}
              </p>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>

            {/* Group Members List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {contacts?.filter(contact => 
                selectedGroup?.memberIds?.includes(contact.id)
              ).map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.firstName} {member.lastName}</p>
                      <p className="text-sm text-gray-600">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {(!contacts || contacts.filter(contact => 
                selectedGroup?.memberIds?.includes(contact.id)
              ).length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No members in this group yet</p>
                  <p className="text-sm">Click "Add Member" to get started</p>
                </div>
              )}
            </div>

            {/* Available Contacts to Add */}
            {contacts?.filter(contact => 
              !selectedGroup?.memberIds?.includes(contact.id)
            ).length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Available Contacts</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {contacts.filter(contact => 
                    !selectedGroup?.memberIds?.includes(contact.id)
                  ).map((contact) => (
                    <div 
                      key={contact.id}
                      className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {contact.firstName?.[0]}{contact.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{contact.firstName} {contact.lastName}</p>
                          <p className="text-xs text-gray-600">{contact.email}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Email Group</DialogTitle>
            <DialogDescription>
              Create a new email group for easy messaging to specific team members.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Cast Only, Crew Team, Creative Team"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupDescription">Description</Label>
              <Input
                id="groupDescription"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Brief description of this group"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupColor">Group Color</Label>
              <Input
                id="groupColor"
                type="color"
                value={newGroupColor}
                onChange={(e) => setNewGroupColor(e.target.value)}
                className="w-20 h-10"
              />
            </div>

            <div className="space-y-2">
              <Label>Group Members</Label>
              <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                {contacts && contacts.length > 0 ? (
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`contact-${contact.id}`}
                          checked={selectedMembers.includes(contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers([...selectedMembers, contact.id]);
                            } else {
                              setSelectedMembers(selectedMembers.filter(id => id !== contact.id));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                        <label htmlFor={`contact-${contact.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {contact.firstName?.[0]}{contact.lastName?.[0]}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{contact.firstName} {contact.lastName}</p>
                              <p className="text-xs text-gray-600">{contact.email}</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No contacts available</p>
                    <p className="text-xs">Add contacts to your show first</p>
                  </div>
                )}
              </div>
              {selectedMembers.length > 0 && (
                <p className="text-sm text-gray-600">
                  {selectedMembers.length} member{selectedMembers.length === 1 ? '' : 's'} selected
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateGroup(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGroup}
              disabled={createGroupMutation.isPending || !newGroupName.trim()}
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Settings Dialog */}
      <Dialog open={showMobileSettings} onOpenChange={setShowMobileSettings}>
        <DialogContent className="sm:max-w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Settings</DialogTitle>
            <DialogDescription>
              Manage your email account settings and preferences.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAccount && (
            <EmailAccountConfig 
              account={selectedAccount}
              onClose={() => setShowMobileSettings(false)}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}