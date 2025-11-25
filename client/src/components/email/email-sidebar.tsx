import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  ArrowRight,
  Edit,
  Users,
  ChevronDown,
  FileText,
  Contact
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
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  onSettings?: () => void;
  onDistroManagement?: () => void;
  onTemplateSettings?: () => void;
  onContacts?: () => void;
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
  onCreateSharedInbox = () => {},
  activeFolder,
  onFolderChange,
  onSettings,
  onDistroManagement = () => {},
  onTemplateSettings = () => {},
  onContacts = () => {}
}: EmailSidebarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
        "absolute left-0 top-0 bottom-0 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-40 flex flex-col",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header with Fixed Height for Consistent Icon Positioning */}
      <div className="border-b border-gray-100 flex-shrink-0" style={{ height: '128px' }}>
        <div className="p-4 h-full flex flex-col justify-between">
          {/* Top Row: Title and Toggle */}
          <div className="flex items-center justify-between">
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

          {/* Bottom Row: Account Display and Compose Button */}
          <div className="flex items-end">
            {isCollapsed && selectedAccount ? (
              // Collapsed: Show compose button only
              <div className="w-full relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center p-4"
                  onClick={(e) => {
                    e.preventDefault();
                    onCompose();
                  }}
                >
                  <Edit className="h-5 w-5 text-gray-600" />
                </Button>
              </div>
            ) : (
              // Expanded: Show connected account info with compose button
              selectedAccount && (
                <div className="w-full relative">
                  <div className="flex items-center justify-between p-2 pr-12 rounded-md bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedAccount.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {selectedAccount.emailAddress}
                      </p>
                      {selectedAccount.accountType && (
                        <p className="text-xs text-blue-600 capitalize">
                          {selectedAccount.accountType === 'gmail' ? 'Gmail' : selectedAccount.accountType === 'outlook' ? 'Outlook' : selectedAccount.accountType}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Compose button positioned absolutely */}
                  <div
                    onClick={onCompose}
                    className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 hover:text-blue-600 cursor-pointer z-10"
                  >
                    <Edit className="h-4 w-4" />
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Folders Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-1">
          {folders.map((folder) => {
            const IconComponent = folder.icon;
            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={cn(
                  "w-full flex items-center rounded-md transition-colors",
                  isCollapsed ? "justify-center p-3" : "px-3 py-2 text-sm",
                  activeFolder === folder.id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                )}
                title={isCollapsed ? folder.name : undefined}
              >
{isCollapsed ? (
                  <IconComponent className="h-5 w-5" />
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="h-5 w-5" />
                      <span>{folder.name}</span>
                    </div>
                    {folder.count > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-gray-100 text-gray-600"
                      >
                        {folder.count}
                      </Badge>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Theater Tools Section */}
        <div className={cn("mt-6 pt-4 border-t border-gray-100", isCollapsed ? "px-2" : "px-4")}>
          <div className="space-y-1">
            {/* Contacts */}
            <button 
              onClick={onContacts}
              className={cn(
                "w-full flex items-center rounded-md hover:bg-gray-50 transition-colors text-gray-700",
                isCollapsed ? "justify-center p-3" : "px-3 py-2 text-sm"
              )}
              title={isCollapsed ? "Contacts" : undefined}
            >
              {isCollapsed ? (
                <Contact className="h-5 w-5" />
              ) : (
                <div className="flex items-center space-x-2">
                  <Contact className="h-5 w-5" />
                  <span>Contacts</span>
                </div>
              )}
            </button>

            {/* Distro Management */}
            <button 
              onClick={onDistroManagement}
              className={cn(
                "w-full flex items-center rounded-md hover:bg-gray-50 transition-colors text-gray-700",
                isCollapsed ? "justify-center p-3" : "px-3 py-2 text-sm"
              )}
              title={isCollapsed ? "Distro Management" : undefined}
            >
              {isCollapsed ? (
                <Users className="h-5 w-5" />
              ) : (
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Distro Management</span>
                </div>
              )}
            </button>

            {/* Email Templates */}
            <button 
              onClick={onTemplateSettings}
              className={cn(
                "w-full flex items-center rounded-md hover:bg-gray-50 transition-colors text-gray-700",
                isCollapsed ? "justify-center p-3" : "px-3 py-2 text-sm"
              )}
              title={isCollapsed ? "Email Templates" : undefined}
            >
              {isCollapsed ? (
                <FileText className="h-5 w-5" />
              ) : (
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Email Templates</span>
                </div>
              )}
            </button>

            {/* Settings */}
            <button 
              onClick={onSettings}
              className={cn(
                "w-full flex items-center rounded-md hover:bg-gray-50 transition-colors text-gray-700",
                isCollapsed ? "justify-center p-3" : "px-3 py-2 text-sm"
              )}
              title={isCollapsed ? "Settings" : undefined}
            >
              {isCollapsed ? (
                <Settings className="h-5 w-5" />
              ) : (
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}