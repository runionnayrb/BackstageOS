import { FolderOpen, Mail, CheckSquare, FileText, MessageSquare, MoreHorizontal, Settings, CreditCard, Shield, LogOut, Plus, Users, Calendar, TrendingUp, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isEffectiveAdmin, isOriginalAdmin, isAdmin } from "@/lib/admin";
import { useFeatureSettings } from "@/hooks/useFeatureSettings";
import { useBetaFeatures } from "@/hooks/useBetaFeatures";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdminView } from "@/contexts/AdminViewContext";

interface SwitchStatus {
  isViewingAs: boolean;
  viewingUser: any;
  originalAdminId: string | null;
}

export default function MobileFooterNav() {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { showId } = usePageTitle();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedProfileType } = useAdminView();
  
  // Check if user can create shows (same logic as projects.tsx)
  const isFullTime = (user as any)?.profileType === "fulltime" || 
    (isAdmin(user) && selectedProfileType === "fulltime");
  const isUserRole = (user as any)?.userRole === "user" || (user as any)?.userRole === "admin";
  const hasActiveSubscription = (user as any)?.subscriptionStatus === "active" || 
     (user as any)?.subscriptionStatus === "trialing" ||
     (user as any)?.grandfatheredFree === true;
  const canCreateShow = isFullTime && isUserRole && hasActiveSubscription;
  
  // Fetch unread email count
  const { data: unreadEmailData } = useQuery({
    queryKey: ['/api/email/unread-count'],
    enabled: !!user,
    refetchInterval: 600000,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch switch status for admin functionality
  const { data: switchStatus } = useQuery<SwitchStatus>({
    queryKey: ['/api/admin/switch-status'],
    enabled: !!user && isOriginalAdmin(user),
  });

  // Switch back mutation
  const switchBackMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/switch-back'),
    onSuccess: () => {
      toast({
        title: "Switched Back",
        description: "Successfully switched back to admin account",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/switch-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Switch Back Failed",
        description: error.message || "Failed to switch back",
        variant: "destructive",
      });
    },
  });

  // Get feature settings for the current show
  const { isFeatureEnabled, isEmailEnabled } = useFeatureSettings(showId);
  
  // Get beta feature access
  const { canAccessFeature } = useBetaFeatures();
  

  // Get show data if we're in a show context
  const { data: showData } = useQuery({
    queryKey: [`/api/projects/${showId}`],
    enabled: !!showId,
    select: (data: any) => data || {},
  });

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const unreadCount = unreadEmailData?.totalUnread || 0;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around py-2 px-4">
        {/* Shows */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/')}
          className={`flex flex-col items-center gap-1 h-12 px-3 ${
            isActive('/') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <FolderOpen className="h-5 w-5" />
          <span className="text-xs">Shows</span>
        </Button>

        {/* Email - Only show if enabled in beta configuration */}
        {canAccessFeature('email-integration') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/email')}
            className={`flex flex-col items-center gap-1 h-12 px-3 relative ${
              isActive('/email') ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <div className="relative">
              <Mail className="h-5 w-5" />
              {unreadCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs bg-red-500 hover:bg-red-500">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total unread emails across all accounts</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <span className="text-xs">Email</span>
          </Button>
        )}

        {/* Tasks - Only show if enabled in beta configuration */}
        {canAccessFeature('task-boards') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/tasks')}
            className={`flex flex-col items-center gap-1 h-12 px-3 ${
              isActive('/tasks') ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <CheckSquare className="h-5 w-5" />
            <span className="text-xs">Tasks</span>
          </Button>
        )}

        {/* Notes - Only show if enabled in beta configuration */}
        {canAccessFeature('advanced-notes') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/notes')}
            className={`flex flex-col items-center gap-1 h-12 px-3 ${
              isActive('/notes') ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs">Notes</span>
          </Button>
        )}

        {/* Chat */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/chat')}
          className={`flex flex-col items-center gap-1 h-12 px-3 ${
            isActive('/chat') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs">Chat</span>
        </Button>

        {/* More - Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-12 px-3 text-gray-600"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 mb-2">
            {/* User Profile Section */}
            <div className="px-3 py-2 text-sm font-semibold text-gray-900">
              {switchStatus?.isViewingAs 
                ? `${switchStatus.viewingUser?.firstName} ${switchStatus.viewingUser?.lastName || ''}`
                : `${user?.firstName} ${user?.lastName || ''}`
              }
              {isEffectiveAdmin(user, switchStatus) && " - Admin"}
            </div>
            <div className="px-3 py-1 text-xs text-gray-500">
              {switchStatus?.isViewingAs 
                ? `${switchStatus.viewingUser?.profileType ? switchStatus.viewingUser.profileType.charAt(0).toUpperCase() + switchStatus.viewingUser.profileType.slice(1) : 'Unknown'} • ${switchStatus.viewingUser?.betaAccess ? 'Beta' : 'No Beta'} Access`
                : `${user?.profileType ? user.profileType.charAt(0).toUpperCase() + user.profileType.slice(1) : 'Unknown'} • ${user?.betaAccess ? 'Beta' : 'No Beta'} Access`
              }
            </div>
            
            <DropdownMenuSeparator />
            
            {/* Navigation Section */}
            <div className="px-3 py-2 text-sm font-semibold text-gray-900">
              Navigation
            </div>
            
            {canCreateShow && (
              <DropdownMenuItem onClick={() => setLocation('/onboarding')}>
                <Plus className="h-4 w-4 mr-2" />
                New Show
              </DropdownMenuItem>
            )}
            
            {/* Show-specific navigation - only when in a show */}
            {showId && showData && (
              <>
                <DropdownMenuSeparator />
                <div className="px-3 py-2 text-sm font-semibold text-gray-900">
                  {showData.name}
                </div>
                {canAccessFeature('report-builder') && isFeatureEnabled('reports') && (
                  <>
                    <DropdownMenuItem onClick={() => setLocation(`/shows/${showId}/reports`)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Reports
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation(`/shows/${showId}/notes-tracking`)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Report Notes
                    </DropdownMenuItem>
                  </>
                )}
                {canAccessFeature('calendar-management') && isFeatureEnabled('calendar') && (
                  <DropdownMenuItem onClick={() => setLocation(`/shows/${showId}/calendar`)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Calendar
                  </DropdownMenuItem>
                )}
                {canAccessFeature('script-editor') && isFeatureEnabled('script') && (
                  <DropdownMenuItem onClick={() => setLocation(`/shows/${showId}/script`)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Script
                  </DropdownMenuItem>
                )}
                {canAccessFeature('props-tracker') && isFeatureEnabled('props') && (
                  <DropdownMenuItem onClick={() => setLocation(`/shows/${showId}/props`)}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Props
                  </DropdownMenuItem>
                )}
                {isFeatureEnabled('contacts') && (
                  <DropdownMenuItem onClick={() => setLocation(`/shows/${showId}/contacts`)}>
                    <Users className="h-4 w-4 mr-2" />
                    Contacts
                  </DropdownMenuItem>
                )}
                {canAccessFeature('performance-tracker') && (
                  <DropdownMenuItem onClick={() => setLocation(`/shows/${showId}/performance-tracker`)}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Performance Tracker
                  </DropdownMenuItem>
                )}
                {canAccessFeature('costume-tracker') && isFeatureEnabled('costumes') && (
                  <DropdownMenuItem onClick={() => setLocation(`/shows/${showId}/costumes`)}>
                    <Shirt className="h-4 w-4 mr-2" />
                    Costumes
                  </DropdownMenuItem>
                )}
                {canAccessFeature('task-boards') && (
                  <DropdownMenuItem onClick={() => setLocation(`/shows/${showId}/tasks`)}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Show Tasks
                  </DropdownMenuItem>
                )}
                {canAccessFeature('advanced-notes') && (
                  <DropdownMenuItem onClick={() => setLocation(`/shows/${showId}/notes`)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Show Notes
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setLocation(`/shows/${showId}/settings`)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Show Settings
                </DropdownMenuItem>
              </>
            )}
            
            <DropdownMenuSeparator />
            
            {/* Account Section */}
            <div className="px-3 py-2 text-sm font-semibold text-gray-900">
              Account
            </div>
            
            <DropdownMenuItem onClick={() => setLocation('/profile')}>
              <Settings className="h-4 w-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => setLocation('/billing')}>
              <CreditCard className="h-4 w-4 mr-2" />
              Billing Settings
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setLocation('/feedback')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Feedback
            </DropdownMenuItem>

            {/* Admin Section */}
            {isEffectiveAdmin(user, switchStatus) && (
              <>
                <DropdownMenuSeparator />
                <div className="px-3 py-2 text-sm font-semibold text-gray-900">
                  Admin
                </div>
                <DropdownMenuItem onClick={() => setLocation('/admin')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/admin/seo')}>
                  <Settings className="h-4 w-4 mr-2" />
                  SEO Manager
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/admin/dns')}>
                  <Settings className="h-4 w-4 mr-2" />
                  DNS Manager
                </DropdownMenuItem>
              </>
            )}

            {/* Switch back option for original admins */}
            {isOriginalAdmin(user) && switchStatus?.isViewingAs && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => switchBackMutation.mutate()}
                  disabled={switchBackMutation.isPending}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Switch Back to Admin
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => logoutMutation.mutate()}
              className="text-red-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}