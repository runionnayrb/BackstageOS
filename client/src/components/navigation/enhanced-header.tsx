import { Settings, Users, LogOut, ChevronDown, MessageSquare, UserCheck, Shield, Globe, Search, Bot, Menu, Mail, FolderOpen, Plus, FileText, Calendar, TrendingUp, CheckSquare, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { isAdmin, isEffectiveAdmin, isOriginalAdmin } from "@/lib/admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useFeatureSettings } from "@/hooks/useFeatureSettings";
import BreadcrumbNavigation from "./breadcrumb-navigation";
import { useAdminView } from "@/contexts/AdminViewContext";

interface SwitchStatus {
  isViewingAs: boolean;
  viewingUser: any;
  originalAdminId: string | null;
}

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  profileType?: string;
  betaAccess: boolean;
  isAdmin?: boolean;
}

interface NavigationContext {
  showId?: string;
  showName?: string;
  sectionId?: string;
  pageTitle?: string;
}

export default function EnhancedHeader() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedBetaAccess, setSelectedBetaAccess, selectedProfileType, setSelectedProfileType } = useAdminView();
  const [defaultUserId, setDefaultUserId] = useState<string>("");
  
  const headerRef = useRef<HTMLDivElement>(null);



  // Fetch total unread email count
  const { data: unreadEmailData } = useQuery({
    queryKey: ['/api/email/unread-count'],
    enabled: !!user,
    refetchInterval: 600000, // Refresh every 10 minutes (cost reduction)
  });

  // Parse current location to determine navigation context
  const getNavigationContext = (): NavigationContext => {
    const pathParts = location.split('/');
    
    if (pathParts[1] === 'shows' && pathParts[2]) {
      const showId = pathParts[2];
      
      // Determine section from path
      let sectionId: string | undefined;
      if (pathParts[3]) {
        sectionId = pathParts[3];
      }
      
      return {
        showId,
        sectionId,
      };
    }
    
    return {};
  };

  const navContext = getNavigationContext();

  // Get show data if we're in a show context
  const { data: showData } = useQuery({
    queryKey: [`/api/projects/${navContext.showId}`],
    enabled: !!navContext.showId,
    select: (data: any) => data || {},
  });

  // Get feature settings for the current show
  const { isFeatureEnabled, isEmailEnabled } = useFeatureSettings(navContext.showId);

  // Generate breadcrumbs based on current location
  const getBreadcrumbs = () => {
    const pathParts = location.split('/');
    const breadcrumbs = [];

    if (pathParts[1] === 'shows' && pathParts[2]) {
      breadcrumbs.push({
        label: 'Shows',
        href: '/'
      });
      
      if (showData?.name) {
        breadcrumbs.push({
          label: showData.name,
          href: `/shows/${pathParts[2]}`
        });
      }

      if (pathParts[3]) {
        const sectionName = pathParts[3].charAt(0).toUpperCase() + pathParts[3].slice(1);
        breadcrumbs.push({
          label: sectionName,
          href: `/shows/${pathParts[2]}/${pathParts[3]}`
        });
      }

      if (pathParts[4]) {
        breadcrumbs.push({
          label: pathParts[4].charAt(0).toUpperCase() + pathParts[4].slice(1),
          isCurrentPage: true
        });
      }
    }

    return breadcrumbs;
  };

  // Fetch all users for account switching (admin only)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: isOriginalAdmin(user),
    select: (data: any[]) => data || [],
  });

  // Set default user ID to Bryan Runion when users are loaded
  useEffect(() => {
    if (allUsers.length > 0 && !defaultUserId) {
      const bryanRunion = allUsers.find((u: User) => 
        u.email === "runion.bryan@gmail.com" || 
        (u.firstName === "Bryan" && u.lastName === "Runion")
      );
      if (bryanRunion) {
        setDefaultUserId(bryanRunion.id.toString());
      }
    }
  }, [allUsers, defaultUserId]);





  // Fetch current switch status
  const { data: switchStatus } = useQuery<SwitchStatus>({
    queryKey: ['/api/admin/switch-status'],
    enabled: isOriginalAdmin(user),
  });

  // Switch account mutation
  const switchAccountMutation = useMutation({
    mutationFn: (targetUserId: string) => 
      apiRequest('POST', '/api/admin/switch-account', { targetUserId }),
    onSuccess: () => {
      toast({
        title: "Account Switched",
        description: "Successfully switched to view as selected user",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/switch-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Switch Failed",
        description: error.message || "Failed to switch account",
        variant: "destructive",
      });
    },
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

  const breadcrumbs = getBreadcrumbs();

  return (
    <div ref={headerRef} className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      {/* Main Header */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <div 
              className="text-xl font-bold text-gray-900 cursor-pointer hover:text-gray-700 transition-colors flex-shrink-0"
              onClick={() => setLocation('/')}
            >
              BackstageOS
            </div>

            {/* Navigation Menu - Moved after BackstageOS */}
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:text-blue-600 hover:bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0">
                    <Menu className="h-5 w-5" strokeWidth={1.5} />
                    <span className="sr-only">Navigation menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <div className="px-3 py-2 text-sm font-semibold text-gray-900">
                    Navigation
                  </div>
                  <DropdownMenuSeparator />
                  
                  {(!navContext.showId || isEmailEnabled()) && (
                    <DropdownMenuItem onClick={() => setLocation('/email')}>
                      <Mail className="h-4 w-4 mr-2" strokeWidth={1.5} />
                      Email
                      {unreadEmailData?.totalUnread > 0 && (
                        <span className="ml-auto bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {unreadEmailData.totalUnread}
                        </span>
                      )}
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem onClick={() => setLocation('/tasks')}>
                    <CheckSquare className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Tasks
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setLocation('/notes')}>
                    <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Notes
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setLocation('/')}>
                    <FolderOpen className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    All Shows
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setLocation('/create-project')}>
                    <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    New Show
                  </DropdownMenuItem>
                  
                  {/* Show-specific navigation - only when in a show */}
                  {navContext.showId && showData && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-3 py-2 text-sm font-semibold text-gray-900">
                        {showData.name}
                      </div>
                      {isFeatureEnabled('reports') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/reports`)}>
                          <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Reports
                        </DropdownMenuItem>
                      )}
                      {isFeatureEnabled('calendar') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/calendar`)}>
                          <Calendar className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Calendar
                        </DropdownMenuItem>
                      )}
                      {isFeatureEnabled('script') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/script`)}>
                          <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Script
                        </DropdownMenuItem>
                      )}
                      {isFeatureEnabled('props') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/props`)}>
                          <FolderOpen className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Props
                        </DropdownMenuItem>
                      )}
                      {isFeatureEnabled('contacts') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/contacts`)}>
                          <Users className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Contacts
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/performance-tracker`)}>
                        <TrendingUp className="h-4 w-4 mr-2" strokeWidth={1.5} />
                        Performance Tracker
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/tasks`)}>
                        <CheckSquare className="h-4 w-4 mr-2" strokeWidth={1.5} />
                        Show Tasks
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/notes`)}>
                        <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                        Show Notes
                      </DropdownMenuItem>
                      {isFeatureEnabled('reports') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/notes-tracking`)}>
                          <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Report Notes
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setLocation('/feedback')}>
                    <MessageSquare className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Send Feedback
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Breadcrumb Navigation */}
            {breadcrumbs.length > 0 && (
              <div className="flex items-center ml-2 sm:ml-4 flex-1 min-w-0 overflow-hidden">
                <BreadcrumbNavigation items={breadcrumbs} className="text-sm" />
              </div>
            )}

          </div>

          {/* Admin Dropdowns - Only visible to original admins */}
          {isOriginalAdmin(user) && (
            <div className="hidden lg:flex items-center space-x-3">
              {/* User Selector */}
              <Select value={defaultUserId} onValueChange={(userId) => {
                setDefaultUserId(userId);
                switchAccountMutation.mutate(userId);
              }}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((user: User) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Profile Type Selector */}
              <Select value={selectedProfileType} onValueChange={setSelectedProfileType}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Profile Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="fulltime">Full-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Right side - User menu and admin controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Show Settings Button - appears when in a show, hidden on mobile */}
            {navContext.showId && showData?.name && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/shows/${navContext.showId}/settings`)}
                className="hidden sm:flex items-center gap-2 hover:text-blue-600 hover:bg-transparent"
              >
                <Settings className="h-4 w-4" />
                <span>Show Settings</span>
              </Button>
            )}

            {/* Admin View As Controls - Hidden per user request */}

            {/* User Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 max-w-[150px] sm:max-w-none">
                    <span className="font-medium truncate">
                      <span className="hidden sm:inline">
                        {switchStatus?.isViewingAs ? switchStatus.viewingUser?.firstName + ' ' + (switchStatus.viewingUser?.lastName || '') : user.firstName + ' ' + (user.lastName || '')}
                        {isEffectiveAdmin(user, switchStatus) && " - Admin"}
                      </span>
                      <span className="sm:hidden">
                        {switchStatus?.isViewingAs ? switchStatus.viewingUser?.firstName : user.firstName}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {switchStatus?.isViewingAs 
                      ? `${switchStatus.viewingUser?.profileType ? switchStatus.viewingUser.profileType.charAt(0).toUpperCase() + switchStatus.viewingUser.profileType.slice(1) : 'Unknown'} • ${switchStatus.viewingUser?.betaAccess ? 'Beta' : 'No Beta'} Access`
                      : `${user.profileType ? user.profileType.charAt(0).toUpperCase() + user.profileType.slice(1) : 'Unknown'} • ${user.betaAccess ? 'Beta' : 'No Beta'} Access`
                    }
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setLocation('/profile')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setLocation('/billing')}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing Settings
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setLocation('/feedback')}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send Feedback
                  </DropdownMenuItem>

                  {isEffectiveAdmin(user, switchStatus) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setLocation('/admin')}>
                        Admin Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation('/admin/seo')}>
                        SEO Manager
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation('/admin/dns')}>
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
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>


    </div>
  );
}