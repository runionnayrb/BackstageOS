import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Inbox, 
  Send, 
  Trash2, 
  Archive, 
  Clock, 
  Star,
  Plus,
  Settings,
  Mail,
  Edit,
  ChevronDown,
  ArrowLeft
} from "lucide-react";
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
  onCompose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  accountStats?: EmailStats;
}

export function EmailSidebar({
  emailAccounts,
  selectedAccount,
  onAccountSelect,
  onCreateAccount,
  onCompose,
  isCollapsed,
  onToggleCollapse,
  accountStats
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
        "absolute left-0 top-0 bottom-0 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out z-40",
        isCollapsed ? "-translate-x-full" : "translate-x-0",
        "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {selectedAccount.displayName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {selectedAccount.emailAddress}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCompose();
                      }}
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 hover:text-blue-600 cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                    </div>
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
                  onClick={onCreateAccount}
                  className="flex items-center space-x-2 p-3"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">Add new account</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                onClick={() => setActiveFolder(folder.id)}
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
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
}