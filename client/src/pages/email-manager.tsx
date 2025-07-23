import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
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
import { InlineEmailComposer } from "@/components/email/inline-email-composer";
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
  Contact,
  MailOpen,
  Folder,
  FolderOpen,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const queryClient = useQueryClient();
  
  // Prefetch contacts data for better performance
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['/api/contacts'],
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);
  
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
  const [location, setLocation] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');

  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeToEmail, setComposeToEmail] = useState<string>('');
  
  // Reply functionality state
  const [replyMessage, setReplyMessage] = useState<any>(null);
  const [composeMode, setComposeMode] = useState<'compose' | 'reply' | 'replyAll' | 'forward'>('compose');
  
  // Minimized compose system
  const [minimizedComposers, setMinimizedComposers] = useState<Array<{
    id: string;
    subject: string;
    toAddresses: any[];
    fromAccountId: number;
    composeData: any;
  }>>([]);
  const [activeComposer, setActiveComposer] = useState<string | null>(null);
  
  // Email selection state
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [filteredMessages, setFilteredMessages] = useState<any[]>([]);
  
  // Functions for managing minimized composers
  const handleMinimizeComposer = (composerData: any) => {
    const composerId = Date.now().toString();
    setMinimizedComposers(prev => [...prev, {
      id: composerId,
      subject: composerData.subject || 'New Message',
      toAddresses: composerData.toAddresses || [],
      fromAccountId: composerData.fromAccountId,
      composeData: composerData
    }]);
    setShowCompose(false);
    setActiveComposer(null);
  };
  
  // Handler for reply functionality
  const handleReply = (message: any, mode: 'reply' | 'replyAll' | 'forward' = 'reply') => {
    setReplyMessage(message);
    setComposeMode(mode);
    setShowCompose(true);
    // Clear the to email when replying since it will be auto-populated
    setComposeToEmail('');
  };

  const handleRestoreComposer = (composerId: string) => {
    const composer = minimizedComposers.find(c => c.id === composerId);
    if (composer) {
      setActiveComposer(composerId);
      setShowCompose(true);
      // Remove from minimized list when restored
      setMinimizedComposers(prev => prev.filter(c => c.id !== composerId));
    }
  };
  
  const handleCloseMinimizedComposer = (composerId: string) => {
    setMinimizedComposers(prev => prev.filter(c => c.id !== composerId));
  };

  // Selection management functions
  const toggleSelectAll = () => {
    if (selectedMessages.size === filteredMessages.length && filteredMessages.length > 0) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(filteredMessages.map(msg => msg.id)));
    }
  };

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async ({ messageIds, action, targetFolder }: { messageIds: number[]; action: string; targetFolder?: string }) => {
      if (!selectedAccount) throw new Error('No selected account');
      
      console.log('🗑️ Bulk action requested:', { messageIds, action, targetFolder, accountId: selectedAccount.id });
      
      const response = await fetch('/api/email/messages/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageIds,
          action,
          accountId: selectedAccount.id,
          targetFolder,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to perform bulk action');
      }
      const result = await response.json();
      console.log('✅ Bulk action completed:', result);
      return result;
    },
    onSuccess: () => {
      // Clear selection
      setSelectedMessages(new Set());
      
      // Invalidate and refetch ALL email queries to ensure fresh data
      if (selectedAccount) {
        queryClient.invalidateQueries({ queryKey: ['/api/email/accounts', selectedAccount.id] });
        queryClient.invalidateQueries({ queryKey: ['/api/email/unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['/api/email/stats', selectedAccount.id] });
        
        // Force refresh the current view
        queryClient.refetchQueries({ queryKey: ['/api/email/accounts', selectedAccount.id, activeFolder] });
      }
      
      toast({
        title: "Success",
        description: "Bulk action completed successfully",
      });
    },
    onError: (error: any) => {
      console.error('Bulk action failed:', error);
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
        variant: "destructive",
      });
    }
  });

  const handleBulkAction = (action: string, targetFolder?: string) => {
    const messageIds = Array.from(selectedMessages);
    if (messageIds.length === 0) return;
    
    bulkActionMutation.mutate({ messageIds, action, targetFolder });
  };
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuAnimating, setIsMobileMenuAnimating] = useState(false);

  // Handle mobile menu animations
  const openMobileMenu = () => {
    setIsMobileMenuAnimating(true);
    setTimeout(() => {
      setIsMobileMenuOpen(true);
    }, 10);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      setIsMobileMenuAnimating(false);
    }, 300);
  };
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
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
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
      {/* Mobile Navigation Panel - Side navigation with backdrop */}
      {(isMobileMenuAnimating || isMobileMenuOpen) && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className={cn(
              "absolute inset-0 bg-black transition-opacity duration-300 ease-out",
              isMobileMenuOpen ? "opacity-50" : "opacity-0"
            )}
            onClick={closeMobileMenu}
          />
          
          {/* Mobile Menu Panel */}
          <div className={cn(
            "fixed top-16 left-0 bottom-0 w-80 bg-white border-r border-gray-200 shadow-xl overflow-hidden transform transition-all duration-300 ease-out origin-top-left",
            isMobileMenuOpen 
              ? "translate-x-0 scale-100 opacity-100" 
              : "-translate-x-full scale-75 opacity-0"
          )}>
            <div className="w-full bg-white p-4 space-y-4 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900" style={{ paddingLeft: '16px' }}>{getFolderDisplayName(activeFolder)}</h2>
              <Button 
                variant="ghost"
                size="sm"
                onClick={closeMobileMenu}
                className="p-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Account Selector - Hidden on desktop per user request */}
            <div className="mb-4 md:hidden">
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
                              closeMobileMenu();
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
                                onClick={async () => {
                                  console.log('Mobile shared inbox clicked:', inbox);
                                  
                                  // Find the corresponding email account for this shared inbox
                                  try {
                                    const matchingAccount = (emailAccounts as EmailAccount[]).find(account => 
                                      account.emailAddress === inbox.emailAddress
                                    );
                                    
                                    if (matchingAccount) {
                                      console.log('Setting selected account to real shared inbox account:', matchingAccount);
                                      setSelectedAccount(matchingAccount);
                                    } else {
                                      console.error('No matching email account found for shared inbox:', inbox.emailAddress);
                                      // Fallback to virtual account if no real account exists
                                      const sharedInboxAsAccount: EmailAccount = {
                                        id: inbox.id + 1000,
                                        userId: 0,
                                        projectId: inbox.projectId,
                                        emailAddress: inbox.emailAddress,
                                        displayName: inbox.name,
                                        accountType: 'shared',
                                        isDefault: false,
                                        isActive: inbox.isActive,
                                        createdAt: new Date().toISOString(),
                                      };
                                      setSelectedAccount(sharedInboxAsAccount);
                                    }
                                  } catch (error) {
                                    console.error('Error finding email account for shared inbox:', error);
                                  }
                                  
                                  closeMobileMenu();
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
                            closeMobileMenu();
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
                      closeMobileMenu();
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
                    closeMobileMenu();
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
                    window.location.href = '/email-contacts';
                    closeMobileMenu();
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-50 text-gray-700 flex items-center space-x-2"
                >
                  <Contact className="w-4 h-4" />
                  <span>Contacts</span>
                </button>

                <button
                  onClick={() => {
                    setShowGroupManager(true);
                    closeMobileMenu();
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-50 text-gray-700 flex items-center space-x-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Distro Management</span>
                </button>
                <button
                  onClick={() => {
                    setShowTemplateManager(true);
                    closeMobileMenu();
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-50 text-gray-700 flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Email Templates</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileSettings(true);
                    closeMobileMenu();
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
            onSettings={() => setShowMobileSettings(true)}
            onDistroManagement={() => setShowGroupManager(true)}
            onTemplateSettings={() => setShowTemplateManager(true)}
            onContacts={() => setLocation('/email-contacts')}
            sharedInboxes={[]}
            hasPersonalAccount={hasPersonalAccount}
            isAdmin={user?.isAdmin || false}
            onCreateSharedInbox={() => {}}
          />
        </div>

        {/* Main Content - Mobile Full Width, Desktop With Sidebar */}
        <div 
          className={`transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? "md:ml-16" : "md:ml-64"
          } relative`}
        >

          <div className="px-1 md:px-4 py-2 md:py-4">
          {/* Header - Mobile with hamburger left, search right */}
          <div>
            <div className="flex items-center justify-between mb-4">
              {/* Left side - hamburger, title/selection controls */}
              <div className="flex items-center gap-1.5">
                {/* Mobile hamburger menu - left side */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openMobileMenu}
                  className={cn(
                    "md:hidden h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0 transition-transform duration-300 border-0 !border-none focus:border-0 focus:!border-none active:border-0 active:!border-none hover:border-0 hover:!border-none",
                    isMobileMenuOpen && "scale-110"
                  )}
                >
                  <Menu className={cn(
                    "h-4 w-4 transition-all duration-300",
                    isMobileMenuOpen && "rotate-90 opacity-75"
                  )} />
                </Button>
                
                {/* Dynamic header content - title or selection controls */}
                {selectedMessages?.size > 0 ? (
                  // Selection mode - show select all checkbox and bulk actions on same line
                  <div className="flex items-center gap-1 px-1">
                    {/* Checkbox and text */}
                    <div className="w-6 h-6 flex-shrink-0">
                      <Checkbox
                        checked={selectedMessages.size === filteredMessages?.length && filteredMessages?.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 ml-2 mr-4">
                      {selectedMessages.size} of {filteredMessages?.length || 0} selected
                    </span>
                    
                    {/* Bulk action buttons - inline with checkbox */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBulkAction('mark-read')}
                      disabled={bulkActionMutation?.isPending}
                      className="h-8 w-8 p-0 hover:bg-transparent group"
                      title="Mark as read"
                    >
                      <MailOpen className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBulkAction('mark-unread')}
                      disabled={bulkActionMutation?.isPending}
                      className="h-8 w-8 p-0 hover:bg-transparent group"
                      title="Mark as unread"
                    >
                      <Mail className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBulkAction('archive')}
                      disabled={bulkActionMutation?.isPending}
                      className="h-8 w-8 p-0 hover:bg-transparent group"
                      title="Archive"
                    >
                      <Archive className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={bulkActionMutation?.isPending || selectedMessages.size === 0}
                          className="h-8 w-8 p-0 hover:bg-transparent group"
                          title="Move to folder"
                        >
                          <FolderOpen className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48" align="end">
                        <div className="space-y-1">
                          <div className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">
                            Move to:
                          </div>
                          {activeFolder !== 'inbox' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBulkAction('move', 'inbox')}
                              disabled={bulkActionMutation?.isPending}
                              className="w-full h-8 justify-start text-sm"
                            >
                              <Inbox className="h-4 w-4 mr-2" />
                              Inbox
                            </Button>
                          )}
                          {activeFolder !== 'sent' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBulkAction('move', 'sent')}
                              disabled={bulkActionMutation?.isPending}
                              className="w-full h-8 justify-start text-sm"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Sent
                            </Button>
                          )}
                          {activeFolder !== 'drafts' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBulkAction('move', 'drafts')}
                              disabled={bulkActionMutation?.isPending}
                              className="w-full h-8 justify-start text-sm"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Drafts
                            </Button>
                          )}
                          {activeFolder !== 'archive' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBulkAction('move', 'archive')}
                              disabled={bulkActionMutation?.isPending}
                              className="w-full h-8 justify-start text-sm"
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </Button>
                          )}
                          {activeFolder !== 'trash' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBulkAction('move', 'trash')}
                              disabled={bulkActionMutation?.isPending}
                              className="w-full h-8 justify-start text-sm"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Trash
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBulkAction('delete')}
                      disabled={bulkActionMutation?.isPending}
                      className="h-8 w-8 p-0 hover:bg-transparent group"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                    </Button>
                  </div>
                ) : (
                  // Normal mode - show folder title aligned with sender text
                  <h1 className="text-xl md:text-3xl font-bold text-gray-900 flex-shrink-0 md:ml-7">
                    {getFolderDisplayName(activeFolder)}
                  </h1>
                )}
              </div>
              
              {/* Right side - Search bar */}
              <div className="max-w-md">
                <Input
                  type="text"
                  placeholder="Search emails..."
                  className="w-64 h-8 md:h-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>
            </div>


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
                  className="flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Account
                </Button>
              </CardContent>
            </Card>
          ) : selectedAccount && !showSharedInboxes ? (
            <div className="relative h-full">
              {/* Email Interface - Always full width, unchanged */}
              <EmailInterface 
                selectedAccount={selectedAccount} 
                onBack={() => setSelectedAccount(null)}
                showCompose={showCompose}
                onShowComposeChange={(show) => {
                  setShowCompose(show);
                  if (!show) {
                    // Clear recipient email and reply data when closing compose
                    setComposeToEmail('');
                    setReplyMessage(null);
                    setComposeMode('compose');
                  }
                }}
                activeFolder={activeFolder}
                showTheaterFeatures={showTheaterFeatures}
                onShowTheaterFeaturesChange={setShowTheaterFeatures}
                composeToEmail={composeToEmail}
                selectedMessages={selectedMessages}
                onSelectedMessagesChange={setSelectedMessages}
                onFilteredMessagesChange={setFilteredMessages}
                onReply={handleReply}
              />
              
              {/* Compose Window - Fixed to stick to bottom properly */}
              {showCompose && (
                <div className="fixed top-16 right-0 bottom-0 w-full md:w-[600px] bg-white border-l border-t border-gray-200 shadow-lg z-[60]">
                  <InlineEmailComposer
                    isOpen={showCompose}
                    onClose={() => setShowCompose(false)}
                    onMinimize={handleMinimizeComposer}
                    fromAccountId={selectedAccount.id}
                    fromEmail={selectedAccount.emailAddress}
                    projectId={selectedAccount.projectId}
                    composeMode={composeMode}
                    initialRecipient={composeToEmail}
                    replyToMessage={replyMessage ? {
                      id: replyMessage.id.toString(),
                      subject: replyMessage.subject,
                      fromAddress: replyMessage.fromAddress,
                      content: replyMessage.content,
                      toAddresses: replyMessage.toAddresses,
                      ccAddresses: replyMessage.ccAddresses,
                      bccAddresses: replyMessage.bccAddresses
                    } : undefined}
                  />
                </div>
              )}
              
              {/* Minimized Composer Tabs - Fixed at bottom of screen */}
              {minimizedComposers.length > 0 && (
                <div className="fixed bottom-0 right-0 flex items-end space-x-1 z-[50] p-2">
                  {minimizedComposers.map((composer) => (
                    <div
                      key={composer.id}
                      className="bg-white border border-gray-300 rounded-t-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                      onClick={() => handleRestoreComposer(composer.id)}
                    >
                      <div className="px-3 py-2 flex items-center justify-between min-w-[250px] max-w-[312px]">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {composer.subject || 'New Message'}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-2 hover:bg-red-50 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseMinimizedComposer(composer.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            <DialogTitle>Create New Distro</DialogTitle>
          </DialogHeader>
          
          {/* Updated timestamp */}
          <div className="text-sm text-gray-500 -mt-2">
            Updated: {new Date().toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })} at {new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            })}
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Distro Name *</Label>
              <Input
                id="groupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Cast Only, Crew Team, Creative Team"
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
              <Label>Contacts</Label>
              <div className="border border-gray-200 rounded-lg p-4 min-h-[24rem] max-h-96 overflow-y-auto">
                {contacts && contacts.length > 0 ? (
                  <div className="space-y-4">
                    {/* Group contacts by show */}
                    {Object.entries(
                      contacts.reduce((acc, contact) => {
                        const projectId = contact.projectId || 'email-contacts';
                        if (!acc[projectId]) {
                          acc[projectId] = [];
                        }
                        acc[projectId].push(contact);
                        return acc;
                      }, {} as Record<string, typeof contacts>)
                    ).map(([projectId, projectContacts]) => {
                      const projectName = projectId === 'email-contacts' 
                        ? 'Email Contacts' 
                        : projects?.find(p => p.id === parseInt(projectId))?.name || 'Unknown Show';
                      
                      const isAllProjectSelected = projectContacts.every(contact => 
                        selectedMembers.includes(contact.id)
                      );

                      const isExpanded = expandedProjects.includes(projectId);
                      
                      return (
                        <div key={projectId} className="border-b pb-4 last:border-b-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <button
                              onClick={() => {
                                if (isExpanded) {
                                  setExpandedProjects(expandedProjects.filter(id => id !== projectId));
                                } else {
                                  setExpandedProjects([...expandedProjects, projectId]);
                                }
                              }}
                              className="p-0.5 hover:bg-gray-100 rounded"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            <input
                              type="checkbox"
                              checked={isAllProjectSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Select all contacts from this project
                                  const projectContactIds = projectContacts.map(c => c.id);
                                  setSelectedMembers([...new Set([...selectedMembers, ...projectContactIds])]);
                                } else {
                                  // Deselect all contacts from this project
                                  const projectContactIds = projectContacts.map(c => c.id);
                                  setSelectedMembers(selectedMembers.filter(id => !projectContactIds.includes(id)));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                            <span className="font-semibold text-sm">{projectName}</span>
                            <span className="text-xs text-gray-500">({projectContacts.length})</span>
                          </div>
                          
                          {/* Group by contact type within each show */}
                          {isExpanded && (
                            <div className="ml-6 space-y-3">
                            {Object.entries(
                              projectContacts.reduce((acc, contact) => {
                                const category = contact.category || 'Other';
                                if (!acc[category]) {
                                  acc[category] = [];
                                }
                                acc[category].push(contact);
                                return acc;
                              }, {} as Record<string, typeof projectContacts>)
                            ).map(([category, categoryContacts]) => {
                              const isAllCategorySelected = categoryContacts.every(contact => 
                                selectedMembers.includes(contact.id)
                              );

                              return (
                                <div key={category}>
                                  <div className="flex items-center space-x-2 mb-1">
                                    <input
                                      type="checkbox"
                                      checked={isAllCategorySelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          // Select all contacts from this category
                                          const categoryContactIds = categoryContacts.map(c => c.id);
                                          setSelectedMembers([...new Set([...selectedMembers, ...categoryContactIds])]);
                                        } else {
                                          // Deselect all contacts from this category
                                          const categoryContactIds = categoryContacts.map(c => c.id);
                                          setSelectedMembers(selectedMembers.filter(id => !categoryContactIds.includes(id)));
                                        }
                                      }}
                                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                    />
                                    <span className="text-sm font-medium capitalize">{category.replace(/_/g, ' ')}</span>
                                    <span className="text-xs text-gray-500">({categoryContacts.length})</span>
                                  </div>
                                  
                                  <div className="ml-6 space-y-1">
                                    {categoryContacts.map(contact => (
                                      <label key={contact.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2">
                                        <input
                                          type="checkbox"
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
                                        <span className="text-sm">{contact.firstName} {contact.lastName}</span>
                                        {contact.email && (
                                          <span className="text-xs text-gray-500">({contact.email})</span>
                                        )}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          )}
                        </div>
                      );
                    })}
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
                <p className="text-sm text-gray-600 mt-2">
                  {selectedMembers.length} member{selectedMembers.length === 1 ? '' : 's'} selected
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-between items-center">
            <div className="text-sm text-gray-500 !mt-0">
              Created: {new Date().toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })} at {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              })}
            </div>
            <div className="flex gap-2">
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
            </div>
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