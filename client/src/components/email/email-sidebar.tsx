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
        isCollapsed ? "w-16" : "w-64"
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

          {/* Bottom Row: Account Selector (Expanded) or Compose Button (Collapsed) */}
          <div className="flex items-end">
            {isCollapsed && selectedAccount ? (
              // Collapsed: Show compose button with right-click menu
              <div className="w-full relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center p-2"
                  onClick={(e) => {
                    e.preventDefault();
                    onCompose();
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setDropdownOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 text-gray-600" />
                </Button>
                
                {/* Right-click dropdown */}
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <div className="absolute inset-0 pointer-events-none" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-60" align="center" side="right" sideOffset={4}>
                    <DropdownMenuItem onClick={onCreateAccount}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onCreateSharedInbox}>
                      <Users className="h-4 w-4 mr-2" />
                      New Shared Inbox
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              // Expanded: Show account selector with compose button
              selectedAccount && (
                <div className="w-full relative">
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
                    <DropdownMenuContent className="w-60" align="start">
                      {/* Account options */}
                      <DropdownMenuItem onClick={onCreateAccount}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Account
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onCreateSharedInbox}>
                        <Users className="h-4 w-4 mr-2" />
                        New Shared Inbox
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
                onClick={() => setActiveFolder(folder.id)}
                className={cn(
                  "w-full flex items-center rounded-md transition-colors",
                  isCollapsed ? "justify-center p-3" : "justify-between px-3 py-2 text-sm",
                  activeFolder === folder.id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                )}
                title={isCollapsed ? folder.name : undefined}
              >
                {isCollapsed ? (
                  <IconComponent className="h-4 w-4" />
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <IconComponent className="h-4 w-4" />
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
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Settings Button */}
        <div className={cn("mt-6 pt-4 border-t border-gray-100", isCollapsed ? "px-2" : "px-4")}>
          <button 
            className={cn(
              "w-full flex items-center rounded-md hover:bg-gray-50 transition-colors text-gray-700",
              isCollapsed ? "justify-center p-3" : "space-x-2 px-3 py-2 text-sm"
            )}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings className="h-4 w-4" />
            {!isCollapsed && <span>Settings</span>}
          </button>
        </div>
      </div>
    </div>
  );
}