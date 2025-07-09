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
  inboxType: string;
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

  return (
    <div
      className={cn(
        "absolute left-0 top-0 bottom-0 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out z-40 flex flex-col",
        isCollapsed ? "-translate-x-full" : "translate-x-0",
        "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 ml-2">Email</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Account Selector */}
        {selectedAccount && (
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
                <DropdownMenuContent className="w-64" align="start">
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
                  
                  {/* Shared Inboxes Submenu */}
                  {projects && projects.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="flex items-center space-x-2 p-3">
                          <Users className="h-4 w-4" />
                          <span>Shared Inboxes</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56 max-w-[calc(100vw-32px)]">
                          {projects.map((project: Project) => {
                            const projectInboxes = allSharedInboxes?.filter((inbox: SharedInbox) => inbox.projectId === project.id) || [];
                            // Only show projects that have shared inboxes
                            if (projectInboxes.length === 0) return null;
                            
                            return (
                              <div key={project.id}>
                                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                  {project.name}
                                </div>
                                {projectInboxes.map((inbox: SharedInbox) => (
                                  <DropdownMenuItem
                                    key={inbox.id}
                                    className="flex flex-col items-start space-y-1 p-3 pl-6"
                                  >
                                    <p className="text-sm font-medium text-gray-900">
                                      {inbox.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {inbox.emailAddress}
                                    </p>
                                  </DropdownMenuItem>
                                ))}
                              </div>
                            );
                          })}
                          
                          {/* Show message if no shared inboxes exist */}
                          {allSharedInboxes?.length === 0 && (
                            <div className="px-3 py-4 text-xs text-gray-400 text-center">
                              No shared inboxes created yet
                            </div>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setActiveSettingsTab("shared-inboxes");
                              setShowEmailSettings(true);
                            }}
                            className="flex items-center space-x-2 p-3"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Manage Shared Inboxes</span>
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
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
                    onClick={() => {
                      setActiveSettingsTab("shared-inboxes");
                      setShowEmailSettings(true);
                    }}
                    className="flex items-center space-x-2 p-3"
                  >
                    <Users className="h-4 w-4" />
                    <span className="text-sm">New Shared Inbox</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Compose button positioned absolutely */}
              <div
                onClick={onCompose}
                className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 hover:text-blue-600 cursor-pointer z-10"
              >
                <Edit className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}
      </div>

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
                className="w-full justify-start"
              >
                <IconComponent className="h-4 w-4 mr-2" />
                <span className="flex-1 text-left">{folder.name}</span>
                {folder.count > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-[20px] text-xs">
                    {folder.count}
                  </Badge>
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
          className="w-full justify-start"
          onClick={() => setShowEmailSettings(true)}
          data-settings-trigger
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
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
    </div>
  );
}