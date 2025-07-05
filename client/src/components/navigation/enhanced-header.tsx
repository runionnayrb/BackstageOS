import { Settings, Users, LogOut, ChevronDown, MessageSquare, UserCheck, Shield, Globe, Search, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import BreadcrumbNavigation from "./breadcrumb-navigation";
import QuickSectionSwitcher from "./quick-section-switcher";
import RecentShowsSwitcher from "./recent-shows-switcher";

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
  betaAccess: string;
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
  const [selectedBetaAccess, setSelectedBetaAccess] = useState<string>("admin");
  const [selectedProfileType, setSelectedProfileType] = useState<string>("freelance");
  const [defaultUserId, setDefaultUserId] = useState<string>("");

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
    <div className="bg-white border-b border-gray-200">
      {/* Main Header */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center gap-6">
            <div 
              className="text-xl font-bold text-gray-900 cursor-pointer hover:text-gray-700 transition-colors"
              onClick={() => setLocation('/')}
            >
              BackstageOS
            </div>

            {/* Context-aware navigation */}
            <div className="flex items-center gap-4">
              {/* Recent Shows Switcher - only show if not on home page */}
              {location !== '/' && (
                <RecentShowsSwitcher 
                  currentShowId={navContext.showId}
                />
              )}

              {/* Quick Section Switcher - only show when in a show */}
              {navContext.showId && showData && (
                <QuickSectionSwitcher
                  currentShowId={navContext.showId}
                  currentShowName={showData.name}
                  currentSection={navContext.sectionId}
                />
              )}
            </div>
          </div>

          {/* Right side - User menu and admin controls */}
          <div className="flex items-center gap-4">
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
                    {user.profileType ? user.profileType.charAt(0).toUpperCase() + user.profileType.slice(1) : 'Unknown'} • {user.betaAccess ? user.betaAccess.charAt(0).toUpperCase() + user.betaAccess.slice(1) : 'None'} Access
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setLocation('/profile')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Profile Settings
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setLocation('/feedback')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Feedback
                  </DropdownMenuItem>

                  {isAdmin(user) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setLocation('/admin')}>
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation('/seo-manager')}>
                        <Globe className="h-4 w-4 mr-2" />
                        SEO Manager
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation('/dns-manager')}>
                        <Bot className="h-4 w-4 mr-2" />
                        DNS Manager
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
            )}
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation - only show when we have breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 py-2 bg-gray-50 border-t border-gray-100">
          <BreadcrumbNavigation items={breadcrumbs} />
        </div>
      )}
    </div>
  );
}