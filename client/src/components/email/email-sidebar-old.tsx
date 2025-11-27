import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  X, 
  Inbox, 
  Send, 
  Trash2, 
  Archive, 
  Clock, 
  Star,
  Plus,
  Settings,
  Mail,
  ArrowLeft,
  ArrowRight,
  Edit,
  Users,
  ChevronDown
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  accountStats?: EmailStats;
  onCompose: () => void;
  sharedInboxes?: any[];
  hasPersonalAccount?: boolean;
  isAdmin?: boolean;
  onCreateSharedInbox?: () => void;
}

export function EmailSidebar({
  emailAccounts,
  selectedAccount,
  onAccountSelect,
  onCreateAccount,
  isCollapsed,
  onToggleCollapse,
  accountStats,
  onCompose,
  sharedInboxes = [],
  hasPersonalAccount = false,
  isAdmin = false,
  onCreateSharedInbox = () => {}
}: EmailSidebarProps) {
  const [activeFolder, setActiveFolder] = useState("inbox");

  const folders = [
    { id: "inbox", name: "Inbox", icon: Inbox, count: accountStats?.unreadMessages || 0 },
    { id: "sent", name: "Sent", icon: Send, count: 0 },
    { id: "drafts", name: "Drafts", icon: Clock, count: accountStats?.draftCount || 0 },
    { id: "starred", name: "Starred", icon: Star, count: 0 },
    { id: "archive", name: "Archive", icon: Archive, count: 0 },
    { id: "trash", name: "Trash", icon: Trash2, count: 0 },
  ];

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out z-40",
        isCollapsed ? "-translate-x-full" : "translate-x-0",
        "w-64"
      )}
    >
        {/* Header */}
        <div className="p-4 pt-16 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateAccount}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Account Selector */}
          {emailAccounts.length > 0 && (
            <div className="space-y-2">
              {emailAccounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => onAccountSelect(account)}
                  className={cn(
                    "flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors",
                    selectedAccount?.id === account.id
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50"
                  )}
                >
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {account.displayName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {account.emailAddress}
                    </p>
                  </div>
                  {account.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Folders */}
        <div className="p-4">
          <div className="space-y-1">
            {folders.map((folder) => {
              const IconComponent = folder.icon;
              return (
                <button
                  key={folder.id}
                  onClick={() => setActiveFolder(folder.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                    activeFolder === folder.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-4 w-4" />
                    <span>{folder.name}</span>
                  </div>
                  {folder.count > 0 && (
                    <Badge 
                      variant={activeFolder === folder.id ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {folder.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}