import { Settings, Users, LogOut, ChevronDown, MessageSquare, UserCheck, Shield, Globe, Search, Bot, Menu, Mail, FolderOpen, Plus, FileText, Calendar, TrendingUp, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/admin";
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
    enabled: isAdmin(user),
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
    enabled: isAdmin(user),
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
          <div className="flex items-center gap-1">
            <div 
              className="text-xl font-bold text-gray-900 cursor-pointer hover:text-gray-700 transition-colors"
              onClick={() => setLocation('/')}
            >
              BackstageOS
            </div>

            {/* Navigation Menu - Moved after BackstageOS */}
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:text-blue-600 hover:bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0">
                    <Menu className="h-5 w-5" />
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
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                      {unreadEmailData?.totalUnread > 0 && (
                        <span className="ml-auto bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {unreadEmailData.totalUnread}
                        </span>
                      )}
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem onClick={() => setLocation('/tasks')}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Tasks
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setLocation('/notes')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Notes
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setLocation('/')}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    All Shows
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setLocation('/create-project')}>
                    <Plus className="h-4 w-4 mr-2" />
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
                          <FileText className="h-4 w-4 mr-2" />
                          Reports
                        </DropdownMenuItem>
                      )}
                      {isFeatureEnabled('calendar') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/calendar`)}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Calendar
                        </DropdownMenuItem>
                      )}
                      {isFeatureEnabled('script') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/script`)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Script
                        </DropdownMenuItem>
                      )}
                      {isFeatureEnabled('props') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/props`)}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Props
                        </DropdownMenuItem>
                      )}
                      {isFeatureEnabled('contacts') && (
                        <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/contacts`)}>
                          <Users className="h-4 w-4 mr-2" />
                          Contacts
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/performance-tracker`)}>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Performance Tracker
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/tasks`)}>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Show Tasks
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation(`/shows/${navContext.showId}/notes`)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Show Notes
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setLocation('/feedback')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Feedback
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Breadcrumb Navigation */}
            {breadcrumbs.length > 0 && (
              <div className="flex items-center ml-4">
                <BreadcrumbNavigation items={breadcrumbs} className="text-sm" />
              </div>
            )}

          </div>

          {/* Admin Dropdowns - Only visible to admins */}
          {isAdmin(user) && (
            <div className="flex items-center space-x-3">
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
          <div className="flex items-center gap-4">
            {/* Show Settings Button - appears when in a show */}
            {navContext.showId && showData?.name && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/shows/${navContext.showId}/settings`)}
                className="flex items-center gap-2 hover:text-blue-600 hover:bg-transparent"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Show Settings</span>
              </Button>
            )}

            {/* Admin View As Controls */}
            {isAdmin(user) && switchStatus?.isViewingAs && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-md text-sm">
                <UserCheck className="h-4 w-4" />
                <span>Viewing as {switchStatus.viewingUser?.firstName || 'User'}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => switchBackMutation.mutate()}
                  disabled={switchBackMutation.isPending}
                  className="h-6 px-2 ml-2 text-orange-700 hover:text-orange-900"
                >
                  Switch Back
                </Button>
              </div>
            )}

            {/* User Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <span className="font-medium">
                      {user.firstName} {user.lastName}
                      {isAdmin(user) && " - Admin"}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {user.profileType ? user.profileType.charAt(0).toUpperCase() + user.profileType.slice(1) : 'Unknown'} • {user.betaAccess ? 'Beta' : 'No Beta'} Access
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setLocation('/profile')}>
                    Profile Settings
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setLocation('/feedback')}>
                    Send Feedback
                  </DropdownMenuItem>

                  {isAdmin(user) && (
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