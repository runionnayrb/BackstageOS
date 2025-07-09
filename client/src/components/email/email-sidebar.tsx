import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  Send,
  Archive,
  Trash2,
  ArrowLeft,
  ChevronDown,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

  const [showEditAccount, setShowEditAccount] = useState(false);
  
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
                  {emailAccounts.map((account) => (
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setEditDisplayName(selectedAccount?.displayName || '');
                      setShowEditAccount(true);
                    }}
                    className="flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Display Name</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onCreateAccount}
                    className="flex items-center space-x-2 p-3"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">{hasPersonalAccount && !isAdmin ? "Add new team account" : "Add new account"}</span>
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

        {/* Theater Features Section */}
        <div className="mt-6 px-4">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSharedInboxes?.();
              }}
              className="w-full justify-start text-sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Shared Inboxes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onTheaterGroupEmail?.();
              }}
              className="w-full justify-start text-sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Group Management
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onTheaterTemplates?.();
              }}
              className="w-full justify-start text-sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              Email Templates
            </Button>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start"
          onClick={() => setShowEditAccount(true)}
          data-settings-trigger
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Email Settings Dialog */}
      <Dialog open={showEditAccount} onOpenChange={setShowEditAccount}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email Settings</DialogTitle>
            <DialogDescription>
              Manage your email account settings and preferences.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailAddress">Email Address</Label>
              <div
                className="w-full px-3 py-2 text-sm text-gray-900 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 cursor-default"
                tabIndex={-1}
              >
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
                onClick={() => setShowEditAccount(false)}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}