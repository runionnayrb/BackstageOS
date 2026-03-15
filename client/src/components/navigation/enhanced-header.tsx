import { Settings, Users, LogOut, ChevronDown, MessageSquare, UserCheck, Shield, Globe, Search, Bot, Menu, Mail, FolderOpen, Plus, FileText, Calendar, TrendingUp, CheckSquare, CreditCard, GripVertical, CalendarDays, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { isAdmin, isEffectiveAdmin, isOriginalAdmin } from "@/lib/admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useFeatureSettings } from "@/hooks/useFeatureSettings";
import { useBetaFeatures } from "@/hooks/useBetaFeatures";
import BreadcrumbNavigation from "./breadcrumb-navigation";
import { useAdminView } from "@/contexts/AdminViewContext";
import GlobalSearchBar from "@/components/search/GlobalSearchBar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useHeaderIcons } from "@/hooks/useHeaderIcons";
import { useFolderName } from "@/hooks/useFolderName";

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
  const { pageTitle } = usePageTitle();
  const { headerIcons } = useHeaderIcons();
  const folderName = useFolderName();
  
  const headerRef = useRef<HTMLDivElement>(null);



  // Fetch total unread email count - staleTime added to reduce refetches
  const { data: unreadEmailData } = useQuery({
    queryKey: ['/api/email/unread-count'],
    enabled: !!user,
    refetchInterval: 600000, // Refresh every 10 minutes (cost reduction)
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Cache for 30 minutes
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
  
  // Get beta feature access
  const { canAccessFeature } = useBetaFeatures();

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
        let sectionName = pathParts[3]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        let sectionPath = pathParts[3];
        if (pathParts[3] === 'settings') {
          sectionName = 'Show Settings';
        } else if (pathParts[3] === 'templates' || pathParts[3] === 'templates-v2') {
          sectionName = 'Report Templates';
        } else if (pathParts[3] === 'notes-tracking') {
          sectionName = 'Report Notes';
        } else if (pathParts[3] === 'calls') {
          // If we're inside a specific daily call (has date in path), show "Daily Calls" to navigate back to list
          // Otherwise on the calls list page, show "Calendar" to navigate back to calendar
          if (pathParts[4]) {
            sectionName = 'Daily Calls';
            sectionPath = 'calls';
          } else {
            sectionName = 'Calendar';
            sectionPath = 'calendar';
          }
        }
        breadcrumbs.push({
          label: sectionName,
          href: `/shows/${pathParts[2]}/${sectionPath}`
        });
      }

      // Don't add breadcrumb items for templates-v2 editing pages (they show template name in header)
      // Don't add breadcrumb for schedule page (pathParts[4] === 'schedule')
      // Don't add breadcrumb for calls page (pathParts[3] === 'calls') - date is shown in header
      if (pathParts[4] && pathParts[3] !== 'templates-v2' && pathParts[4] !== 'schedule' && pathParts[3] !== 'calls') {
        const label = pathParts[4]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        breadcrumbs.push({
          label: label,
          isCurrentPage: true
        });
      }
    }

    return breadcrumbs;
  };

  // Fetch all users for account switching (admin only) - with staleTime to reduce refetches
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: isOriginalAdmin(user),
    select: (data: any[]) => data || [],
    staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes (admin users rarely change)
    gcTime: 60 * 60 * 1000, // Cache for 1 hour
  });



  // Fetch current switch status - with staleTime to reduce refetches
  const { data: switchStatus } = useQuery<SwitchStatus>({
    queryKey: ['/api/admin/switch-status'],
    enabled: isOriginalAdmin(user),
    staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes (rarely changes during session)
    gcTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  // Sync defaultUserId with the current viewing user or logged-in user
  useEffect(() => {
    if (allUsers.length > 0) {
      // If viewing as another user, use that user's ID
      if (switchStatus?.isViewingAs && switchStatus.viewingUser?.id) {
        setDefaultUserId(switchStatus.viewingUser.id.toString());
      } 
      // Otherwise use the logged-in user's ID
      else if (user?.id && !defaultUserId) {
        setDefaultUserId(user.id.toString());
      }
    }
  }, [allUsers, switchStatus, user?.id]);

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
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
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
          {/* Desktop Layout - Left side - Logo and Navigation */}
          <div className="hidden md:flex items-center gap-1 flex-1 min-w-0">
            <div 
              className="text-xl text-gray-900 cursor-pointer hover:text-gray-700 transition-colors flex-shrink-0"
              onClick={() => setLocation('/')}
            >
              <span style={{ fontWeight: 400 }}>Backstage</span>
              <span style={{ fontWeight: 700 }}>OS</span>
            </div>
            
            {/* Navigation Menu - Desktop only */}
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
                  
                  {canAccessFeature('email-integration') && (
                    <DropdownMenuItem onClick={() => setLocation('/email')}>
                      <Mail className="h-4 w-4 mr-2" strokeWidth={1.5} />
                      Email
                      {unreadEmailData?.totalUnread > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="ml-auto bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                {unreadEmailData.totalUnread}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Total unread emails across all accounts</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </DropdownMenuItem>
                  )}
                  
                  {canAccessFeature('task-boards') && (
                    <DropdownMenuItem onClick={() => setLocation('/tasks')}>
                      <CheckSquare className="h-4 w-4 mr-2" strokeWidth={1.5} />
                      Tasks
                    </DropdownMenuItem>
                  )}
                  
                  {canAccessFeature('advanced-notes') && (
                    <DropdownMenuItem onClick={() => setLocation('/notes')}>
                      <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                      Notes
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setLocation('/')}>
                    <FolderOpen className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    All Shows
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setLocation('/onboarding')}>
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
                      {canAccessFeature('report-builder') && (
                        <>
                          <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/reports`)}>
                            <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                            Reports
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/notes-tracking`)}>
                            <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                            Report Notes
                          </DropdownMenuItem>
                        </>
                      )}
                      {canAccessFeature('calendar-management') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/calendar`)}>
                          <Calendar className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Calendar
                        </DropdownMenuItem>
                      )}
                      {canAccessFeature('script-editor') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/script`)}>
                          <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Script
                        </DropdownMenuItem>
                      )}
                      {canAccessFeature('props-tracker') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/props`)}>
                          <FolderOpen className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Props
                        </DropdownMenuItem>
                      )}
                      {canAccessFeature('costume-tracker') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/costumes`)}>
                          <Shirt className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Costumes
                        </DropdownMenuItem>
                      )}
                      {canAccessFeature('contact-management') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/contacts`)}>
                          <Users className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Contacts
                        </DropdownMenuItem>
                      )}
                      {canAccessFeature('task-boards') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/tasks`)}>
                          <CheckSquare className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Show Tasks
                        </DropdownMenuItem>
                      )}
                      {canAccessFeature('advanced-notes') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/notes`)}>
                          <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          Show Notes
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  

                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Breadcrumb Navigation - Desktop only */}
            {breadcrumbs.length > 0 && (
              <div className="flex items-center ml-2 sm:ml-4 flex-1 min-w-0 overflow-hidden">
                <BreadcrumbNavigation items={breadcrumbs} className="text-sm" />
              </div>
            )}

          </div>

          {/* Mobile Layout - Page Title and Breadcrumbs */}
          <div className="md:hidden flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2">
              {/* Page Title */}
              <h1 className="text-2xl font-bold text-gray-900 truncate flex-shrink-0">
                {location === '/email' ? folderName : pageTitle}
              </h1>
              {/* Hamburger icon directly to the right of title (email page only) */}
              {headerIcons && headerIcons.length > 0 && headerIcons[0].icon === Menu && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={headerIcons[0].onClick}
                  className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
                  title={headerIcons[0].title}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              {/* Breadcrumbs - Mobile (subtle, to the right of title) */}
              {breadcrumbs.length > 0 && (
                <div className="flex items-center overflow-hidden min-w-0">
                  <BreadcrumbNavigation items={breadcrumbs} className="text-xs text-gray-500" />
                </div>
              )}
            </div>
            
            {/* Venue row - Show underneath title only on show details page */}
            {showData?.venue && navContext.showId && !navContext.sectionId && (
              <div>
                <p className="text-base text-foreground">{showData.venue}</p>
              </div>
            )}
          </div>

          {/* Admin-Only Dropdowns - Viewing As User / Profile Type Selection */}
          {isOriginalAdmin(user) ? (
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
          ) : null}

          {/* Desktop Right side - Search, User menu and admin controls */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {/* Expandable Search Icon */}
            <GlobalSearchBar />
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

                  {isOriginalAdmin(user) && (
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

                  {/* Switch back option - ONLY show for admin when viewing as another user */}
                  {(isOriginalAdmin(user) && switchStatus?.isViewingAs && user?.id === 2) ? (
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
                  ) : null}

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

          {/* Mobile Right side - Search and dynamic header icons (excluding hamburger when next to title) */}
          <div className="md:hidden flex items-center gap-2 flex-shrink-0">
            {/* Page-specific header icons (excluding hamburger if it's the first icon) */}
            {headerIcons && headerIcons.length > 0 && (
              <div className="flex items-center gap-1">
                {headerIcons.map((iconConfig, index) => {
                  // Skip hamburger icon if it's the first one (it's shown next to title)
                  if (index === 0 && iconConfig.icon === Menu) {
                    return null;
                  }
                  
                  // If it has a component, render the component directly
                  if (iconConfig.component) {
                    return <iconConfig.component key={index} />;
                  }
                  
                  // Otherwise render the default button
                  return (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={iconConfig.onClick}
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      title={iconConfig.title}
                    >
                      <iconConfig.icon className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
            )}
            
            {/* Reorder button - Only show on show details page */}
            {navContext.showId && !navContext.sectionId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                title="Reorder sections"
                onClick={() => {
                  // Dispatch custom event to toggle reordering in show details page
                  window.dispatchEvent(new CustomEvent('toggleReorder'));
                }}
              >
                <GripVertical className="h-4 w-4" />
              </Button>
            )}

            {/* Template Settings button - Only show on reports page */}
            {navContext.showId && navContext.sectionId === 'reports' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                title="Template Settings"
                onClick={() => setLocation(`/shows/${navContext.showId}/templates`)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}

            {/* Availability button - Only show on calendar overview page (not on schedule subpage) */}
            {navContext.showId && navContext.sectionId === 'calendar' && !location.includes('/schedule') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                title="Availability"
                onClick={() => {
                  // Dispatch custom event to open availability dropdown in calendar page
                  window.dispatchEvent(new CustomEvent('openAvailabilityDropdown'));
                }}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            )}
            
            <GlobalSearchBar />
          </div>
        </div>
      </div>


    </div>
  );
}