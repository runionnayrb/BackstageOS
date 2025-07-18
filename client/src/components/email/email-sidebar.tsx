import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
import {
  Mail,
  Send,
  Archive,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  Edit,
  Inbox,
  Clock,
  Theater,
  Users,
  FileText,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface Project {
  id: number;
  name: string;
}

interface SharedInbox {
  id: number;
  projectId: number;
  name: string;
  emailAddress: string;
  isActive: boolean;
}

interface EmailSidebarProps {
  emailAccounts: EmailAccount[];
  selectedAccount: EmailAccount | null;
  onAccountSelect: (account: EmailAccount) => void;
  onCreateAccount: () => void;
  onCompose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  accountStats?: EmailStats;
  activeFolder?: string;
  onFolderChange?: (folder: string) => void;
  onTheaterGroupEmail?: () => void;
  onTheaterTemplates?: () => void;
  onSharedInboxes?: () => void;
  hasPersonalAccount?: boolean;
  isAdmin?: boolean;
  user?: { firstName?: string; lastName?: string; } | null;
  onSettings?: () => void;
}

export function EmailSidebar({
  emailAccounts,
  selectedAccount,
  onAccountSelect,
  onCreateAccount,
  onCompose,
  isCollapsed,
  onToggleCollapse,
  accountStats,
  activeFolder = "inbox",
  onFolderChange,
  onTheaterGroupEmail,
  onTheaterTemplates,
  onSharedInboxes,
  hasPersonalAccount = false,
  isAdmin = false,
  onSettings,
  user,
}: EmailSidebarProps) {

  const folders = [
    { id: "inbox", name: "Inbox", icon: Inbox, count: accountStats?.unreadMessages || 0 },
    { id: "sent", name: "Sent", icon: Send, count: 0 },
    { id: "drafts", name: "Drafts", icon: Clock, count: accountStats?.draftCount || 0 },
    { id: "archive", name: "Archive", icon: Archive, count: 0 },
    { id: "trash", name: "Trash", icon: Trash2, count: 0 },
  ];

  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showCreateSharedInbox, setShowCreateSharedInbox] = useState(false);
  const [selectedProjectForInbox, setSelectedProjectForInbox] = useState<Project | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch projects for shared inbox dropdown
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    enabled: true,
  });

  // Fetch all shared inboxes  
  const { data: allSharedInboxes } = useQuery({
    queryKey: ['/api/shared-inboxes'],
    enabled: true,
  });
  
  // Create placeholder text from user's name
  const getUserNamePlaceholder = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user?.firstName) {
      return user.firstName;
    } else if (user?.lastName) {
      return user.lastName;
    }
    return "Your display name";
  };

  // Initialize with existing display name or user's actual name as fallback
  const [editDisplayName, setEditDisplayName] = useState(
    selectedAccount?.displayName || getUserNamePlaceholder()
  );
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update editDisplayName when selectedAccount changes
  useEffect(() => {
    setEditDisplayName(selectedAccount?.displayName || getUserNamePlaceholder());
  }, [selectedAccount?.displayName, user?.firstName, user?.lastName]);

  // Mutation for updating account display name
  const updateAccountMutation = useMutation({
    mutationFn: async (data: { displayName: string }) => {
      return apiRequest(`/api/email/accounts/${selectedAccount?.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts'] });
      setShowEditAccount(false);
      toast({
        title: "Display name updated",
        description: "Your email display name has been successfully updated.",
      });
    },
    onError: (error) => {
      console.error('Error updating display name:', error);
      toast({
        title: "Error",
        description: "Failed to update display name. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for creating shared inbox
  const createSharedInboxMutation = useMutation({
    mutationFn: async (data: { projectId: number; name: string; emailAddress: string }) => {
      return apiRequest(`/api/projects/${data.projectId}/shared-inboxes`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shared-inboxes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setShowCreateSharedInbox(false);
      setSelectedProjectForInbox(null);
      toast({
        title: "Shared inbox created",
        description: "Your shared inbox has been successfully created.",
      });
    },
    onError: (error: any) => {
      console.error('Error creating shared inbox:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create shared inbox. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSaveDisplayName = () => {
    if (!editDisplayName.trim()) {
      toast({
        title: "Error",
        description: "Display name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    updateAccountMutation.mutate({ displayName: editDisplayName.trim() });
  };

  const handleCreateSharedInbox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForInbox) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const customEmailPrefix = formData.get('customEmailPrefix') as string;
    const emailAddress = `${customEmailPrefix.toLowerCase().replace(/[^a-z0-9-]/g, '')}@backstageos.com`;

    const data = {
      projectId: selectedProjectForInbox.id,
      name: formData.get('name') as string,
      emailAddress,
    };

    createSharedInboxMutation.mutate(data);
  };

  return (
    <div
      className={cn(
        "absolute left-0 top-0 bottom-0 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-40 flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "border-b border-gray-100 flex-shrink-0",
        isCollapsed ? "p-2" : "p-4"
      )}>
        <div className={cn(
          "flex items-center justify-between",
          !isCollapsed && "mb-4"
        )}>
          {!isCollapsed && <h2 className="text-lg font-semibold text-gray-900 ml-2">Email</h2>}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={cn(
              "h-8 w-8 p-0 hover:bg-gray-100",
              isCollapsed && "mx-auto"
            )}
          >
            {isCollapsed ? (
              <ArrowRight className="h-4 w-4" />
            ) : (
              <ArrowLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Account Selector */}
        {selectedAccount && !isCollapsed && (
          <div className="space-y-2">
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center justify-between p-2 pr-12 rounded-md cursor-pointer transition-colors hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedAccount.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {selectedAccount.emailAddress}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-60 max-w-[calc(100vw-32px)]" 
                  align="start"
                  side="bottom"
                  sideOffset={4}
                  avoidCollisions={true}
                  collisionPadding={16}
                >
                  {/* Personal Accounts */}
                  {emailAccounts.filter(account => account.accountType === 'personal').map((account) => (
                    <DropdownMenuItem
                      key={account.id}
                      onClick={() => onAccountSelect(account)}
                      className={cn(
                        "flex flex-col items-start space-y-1 p-3",
                        selectedAccount?.id === account.id && "bg-gray-50"
                      )}
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {account.displayName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {account.emailAddress}
                      </p>
                    </DropdownMenuItem>
                  ))}
                  
                  {/* Shared Inboxes - Simple version without submenu for now */}
                  {allSharedInboxes && allSharedInboxes.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Shared Inboxes
                      </div>
                      {allSharedInboxes.map((inbox: SharedInbox) => (
                        <DropdownMenuItem
                          key={inbox.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Shared inbox clicked:', inbox);
                            
                            // Find the corresponding email account for this shared inbox
                            const matchingAccount = emailAccounts.find(account => 
                              account.emailAddress === inbox.emailAddress
                            );
                            
                            if (matchingAccount) {
                              console.log('Selecting real shared inbox account:', matchingAccount);
                              onAccountSelect(matchingAccount);
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
                              onAccountSelect(sharedInboxAsAccount);
                            }
                          }}
                          className={cn(
                            "flex flex-col items-start space-y-1 p-3 cursor-pointer",
                            selectedAccount?.emailAddress === inbox.emailAddress && "bg-gray-50"
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
                    onClick={onCreateAccount}
                    className="flex items-center space-x-2 p-3"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">{hasPersonalAccount && !isAdmin ? "Add new team account" : "Add new account"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowCreateSharedInbox(true)}
                    className="flex items-center space-x-2 p-3"
                  >
                    <Users className="h-4 w-4" />
                    <span className="text-sm">New Shared Inbox</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Compose button positioned absolutely - only show when not collapsed */}
              {!isCollapsed && (
                <div
                  onClick={onCompose}
                  className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 hover:text-blue-600 cursor-pointer z-10"
                >
                  <Edit className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Collapsed State Compose Button */}
      {isCollapsed && selectedAccount && (
        <div className="px-4 py-2 border-b border-gray-100 relative">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center p-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCompose();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setDropdownOpen(true);
            }}
          >
            <Edit className="h-4 w-4 text-gray-600" />
          </Button>
          
          {/* Right-click Account Selector Dropdown */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <div className="absolute inset-0 pointer-events-none" />
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="w-60 max-w-[calc(100vw-32px)]" 
              align="start"
              side="right"
              sideOffset={4}
              avoidCollisions={true}
              collisionPadding={16}
            >
              {/* Personal Accounts */}
              {emailAccounts.filter(account => account.accountType === 'personal').map((account) => (
                <DropdownMenuItem
                  key={account.id}
                  onClick={() => onAccountSelect(account)}
                  className={cn(
                    "flex flex-col items-start space-y-1 p-3",
                    selectedAccount?.id === account.id && "bg-gray-50"
                  )}
                >
                  <p className="text-sm font-medium text-gray-900">
                    {account.displayName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {account.emailAddress}
                  </p>
                </DropdownMenuItem>
              ))}
              
              {/* Shared Inboxes */}
              {allSharedInboxes && allSharedInboxes.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Shared Inboxes
                  </div>
                  {allSharedInboxes.map((inbox: SharedInbox) => (
                    <DropdownMenuItem
                      key={inbox.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const matchingAccount = emailAccounts.find(account => 
                          account.emailAddress === inbox.emailAddress
                        );
                        if (matchingAccount) {
                          onAccountSelect(matchingAccount);
                        }
                      }}
                      className={cn(
                        "flex flex-col items-start space-y-1 p-3 cursor-pointer",
                        selectedAccount?.emailAddress === inbox.emailAddress && "bg-gray-50"
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
                onClick={onCreateAccount}
                className="flex items-center space-x-2 p-3"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">{hasPersonalAccount && !isAdmin ? "Add new team account" : "Add new account"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Folders */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 space-y-1">
          {folders.map((folder) => {
            const IconComponent = folder.icon;
            return (
              <Button
                key={folder.id}
                variant={activeFolder === folder.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onFolderChange?.(folder.id)}
                className={cn(
                  "w-full",
                  isCollapsed ? "justify-center p-2" : "justify-start"
                )}
              >
                <IconComponent className={cn(
                  "h-4 w-4",
                  !isCollapsed && "mr-2"
                )} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{folder.name}</span>
                    {folder.count > 0 && (
                      <Badge variant="secondary" className="h-5 min-w-[20px] text-xs">
                        {folder.count}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "w-full",
            isCollapsed ? "justify-center p-2" : "justify-start"
          )}
          onClick={() => setShowEmailSettings(true)}
          data-settings-trigger
        >
          <Settings className={cn(
            "h-4 w-4",
            !isCollapsed && "mr-2"
          )} />
          {!isCollapsed && "Settings"}
        </Button>
      </div>

      {/* Email Settings Dialog */}
      <Dialog open={showEmailSettings} onOpenChange={setShowEmailSettings}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Email Settings</DialogTitle>
            <DialogDescription>
              Manage your email accounts, shared inboxes, and preferences.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex space-x-6">
            {/* Tab Navigation */}
            <div className="w-48 space-y-1">
              <Button
                variant={activeSettingsTab === "general" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveSettingsTab("general")}
                className="w-full justify-start"
              >
                <Settings className="h-4 w-4 mr-2" />
                General
              </Button>
              <Button
                variant={activeSettingsTab === "shared-inboxes" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveSettingsTab("shared-inboxes")}
                className="w-full justify-start"
              >
                <Users className="h-4 w-4 mr-2" />
                Shared Inboxes
              </Button>
            </div>
            
            {/* Tab Content */}
            <div className="flex-1">
              {activeSettingsTab === "general" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailAddress">Email Address</Label>
                    <div className="w-full px-3 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-md cursor-default">
                      {selectedAccount?.emailAddress || ''}
                    </div>
                    <p className="text-xs text-gray-500">
                      Email addresses cannot be changed after creation
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder={getUserNamePlaceholder()}
                      className="w-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !updateAccountMutation.isPending) {
                          e.preventDefault();
                          handleSaveDisplayName();
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500">
                      This is how your name appears to recipients
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowEmailSettings(false)}
                      disabled={updateAccountMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveDisplayName}
                      disabled={updateAccountMutation.isPending}
                    >
                      {updateAccountMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              )}
              
              {activeSettingsTab === "shared-inboxes" && (
                <div>
                  {projects && projects.length > 0 ? (
                    <div className="space-y-4">
                      {projects.map((project: Project) => (
                        <div key={project.id} className="border rounded-lg p-4">
                          <h3 className="font-medium text-gray-900 mb-2">{project.name}</h3>
                          <div className="text-sm text-gray-600 mb-3">
                            Manage shared team inboxes for this production
                          </div>
                          <Button
                            size="sm"
                            onClick={() => onSharedInboxes?.()}
                            className="flex items-center space-x-2"
                          >
                            <Users className="h-4 w-4" />
                            <span>Manage Shared Inboxes</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No shows available</p>
                      <p className="text-sm">Create a show to set up shared inboxes</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Shared Inbox Dialog */}
      <Dialog open={showCreateSharedInbox} onOpenChange={setShowCreateSharedInbox}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Shared Inbox</DialogTitle>
          </DialogHeader>
          
          {!selectedProjectForInbox ? (
            /* Project Selection Step */
            <div className="space-y-4">
              <div>
                <Label>Choose a Show</Label>
                <div className="mt-2 space-y-2">
                  {projects && projects.length > 0 ? (
                    projects.map((project: Project) => (
                      <div
                        key={project.id}
                        onClick={() => setSelectedProjectForInbox(project)}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-gray-500">Create shared inbox for this show</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No shows available</p>
                      <p className="text-sm">Create a show first to set up shared inboxes</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowCreateSharedInbox(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* Shared Inbox Creation Form */
            <form onSubmit={handleCreateSharedInbox} className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-blue-900">Creating shared inbox for:</div>
                <div className="text-sm text-blue-700">{selectedProjectForInbox.name}</div>
              </div>
              
              <div>
                <Label htmlFor="name">Inbox Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Stage Management Team" 
                  required 
                />
              </div>
              
              <div>
                <Label htmlFor="customEmailPrefix">Custom Email Address</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="customEmailPrefix" 
                    name="customEmailPrefix" 
                    placeholder="macbeth-cast" 
                    required
                    className="flex-1"
                  />
                  <span className="text-gray-500 text-sm">@backstageos.com</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Choose a unique email address for this show's team inbox
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setSelectedProjectForInbox(null);
                    setShowCreateSharedInbox(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setSelectedProjectForInbox(null)}
                >
                  Back
                </Button>
                <Button type="submit" disabled={createSharedInboxMutation.isPending}>
                  {createSharedInboxMutation.isPending ? 'Creating...' : 'Create Inbox'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}