import { Settings, Users, LogOut, ChevronDown, MessageSquare, UserCheck, Shield, Globe, Search, Bot, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect } from "react";
import { useAdminView } from "@/contexts/AdminViewContext";
import GlobalSearchBar from "@/components/search/GlobalSearchBar";

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

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedBetaAccess, setSelectedBetaAccess } = useAdminView();
  const [defaultUserId, setDefaultUserId] = useState<string>("");



  // Fetch all users for account switching (admin only)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/admin/users', selectedBetaAccess],
    enabled: isAdmin(user),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBetaAccess !== 'all') {
        params.append('betaAccess', selectedBetaAccess === 'admin' ? 'true' : 'false');
      }
      
      const url = `/api/admin/users${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    },
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

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        // Always navigate to auth page after logout attempt
        setLocation('/');
      }
    });
  };

  const handleAccountSwitch = (targetUserId: string) => {
    if (targetUserId === "switch-back") {
      switchBackMutation.mutate();
    } else {
      switchAccountMutation.mutate(targetUserId);
    }
  };

  const handleBetaAccessChange = (betaAccess: string) => {
    setSelectedBetaAccess(betaAccess);
    const displayValue = betaAccess === "admin" ? "admin access" : `${betaAccess} beta access`;
    toast({
      title: "Access View Changed",
      description: `Now viewing ${displayValue}`,
    });
    // Invalidate queries to refetch data with new access level
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
  };

  const handleProfileTypeChange = (profileType: string) => {
    setSelectedProfileType(profileType);
    const displayValue = profileType === "all" ? "all profile types" : `${profileType} users`;
    toast({
      title: "Profile Type View Changed", 
      description: `Now viewing ${displayValue}`,
    });
    // Invalidate user-related queries to show filtered results
    queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
  };

  // NEW: Simple profile type dropdown from scratch
  const [selectedProfileType, setSelectedProfileType] = useState('Freelance');
  const profileTypes = ['Freelance', 'Full-timer'];

  const handleProfileTypeChangeNew = (value: string) => {
    setSelectedProfileType(value);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`;
  };

  const currentUser = switchStatus?.isViewingAs ? switchStatus?.viewingUser : user;

  console.log('🔍 Header component rendering, user:', user);
  
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-xl p-0 hover:bg-transparent"
            >
              <span 
                style={{
                  color: '#111827',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  console.log('Mouse entered BackstageOS');
                  e.currentTarget.style.color = '#ff0000';
                  e.currentTarget.style.fontSize = '24px';
                }}
                onMouseLeave={(e) => {
                  console.log('Mouse left BackstageOS');
                  e.currentTarget.style.color = '#111827';
                  e.currentTarget.style.fontSize = '20px';
                }}
              >
                <span style={{ fontWeight: 400 }}>Backstage</span>
                <span style={{ fontWeight: 700 }}>OS</span>
              </span>
            </Button>
          </div>

          {/* Search Bar - centered */}
          <div className="flex-1 max-w-md mx-2 md:mx-8">
            <GlobalSearchBar />
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Admin Only: Account Type Selection */}
            {isAdmin(user) && (
              <>
                {/* Beta Access Level Selector */}
                <div className="hidden lg:flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <Select value={selectedBetaAccess} onValueChange={handleBetaAccessChange}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue placeholder="Access View" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="limited">Limited Beta</SelectItem>
                      <SelectItem value="full">Full Beta</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* NEW: Profile Type Selector */}
                <div className="hidden lg:flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-gray-500" />
                  <Select value={selectedProfileType} onValueChange={handleProfileTypeChangeNew}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue placeholder="Profile Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {profileTypes.map((profileType) => (
                        <SelectItem key={profileType} value={profileType}>
                          {profileType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Account Switcher */}
                <div className="hidden lg:flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <Select 
                    value={switchStatus?.isViewingAs ? switchStatus?.viewingUser?.id?.toString() : defaultUserId} 
                    onValueChange={handleAccountSwitch}
                  >
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue placeholder={
                        switchStatus?.isViewingAs 
                          ? `Viewing as ${switchStatus?.viewingUser?.firstName || switchStatus?.viewingUser?.email}`
                          : defaultUserId 
                            ? `Bryan Runion`
                            : "Switch Account"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {switchStatus?.isViewingAs && (
                        <SelectItem value="switch-back">← Back to Admin</SelectItem>
                      )}
                      {allUsers.map((userOption: any) => (
                        <SelectItem key={userOption.id} value={userOption.id.toString()}>
                          {userOption.firstName || userOption.lastName 
                            ? `${userOption.firstName || ""} ${userOption.lastName || ""}`.trim()
                            : userOption.email
                          } ({userOption.profileType || "Unknown"} • {userOption.betaAccess})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Feedback */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/feedback')}
              className="flex items-center space-x-2"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="hidden sm:inline text-sm">Feedback</span>
            </Button>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-3 p-2"
                >
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {currentUser?.firstName || currentUser?.lastName 
                      ? `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim()
                      : currentUser?.email
                    }
                    {switchStatus?.isViewingAs && (
                      <span className="text-blue-600 ml-1">(Admin View)</span>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setLocation('/profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/billing')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </DropdownMenuItem>
                
                {isAdmin(user) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation('/admin')}>
                      <Users className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation('/admin/dns')}>
                      <Globe className="mr-2 h-4 w-4" />
                      Domain Management
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation('/admin/seo')}>
                      <Search className="mr-2 h-4 w-4" />
                      SEO & AI Optimization
                    </DropdownMenuItem>
                    
                    {/* Mobile Admin Controls */}
                    <DropdownMenuSeparator className="lg:hidden" />
                    <div className="lg:hidden px-2 py-1 text-xs text-gray-500 font-medium">
                      Admin Controls
                    </div>
                    
                    {/* Mobile Beta Access Selector */}
                    <div className="lg:hidden px-2 py-1">
                      <div className="text-xs text-gray-600 mb-1">Access View:</div>
                      <Select value={selectedBetaAccess} onValueChange={handleBetaAccessChange}>
                        <SelectTrigger className="w-full h-7 text-xs">
                          <SelectValue placeholder="Access View" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="limited">Limited Beta</SelectItem>
                          <SelectItem value="full">Full Beta</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* NEW: Mobile Profile Type Selector */}
                    <div className="lg:hidden px-2 py-1">
                      <div className="text-xs text-gray-600 mb-1">Profile Type View:</div>
                      <Select value={selectedProfileType} onValueChange={handleProfileTypeChangeNew}>
                        <SelectTrigger className="w-full h-7 text-xs">
                          <SelectValue placeholder="Profile Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {profileTypes.map((profileType) => (
                            <SelectItem key={profileType} value={profileType}>
                              {profileType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Mobile Account Switcher */}
                    <div className="lg:hidden px-2 py-1">
                      <div className="text-xs text-gray-600 mb-1">Switch Account:</div>
                      <Select 
                        value={switchStatus?.isViewingAs ? switchStatus?.viewingUser?.id?.toString() : defaultUserId} 
                        onValueChange={handleAccountSwitch}
                      >
                        <SelectTrigger className="w-full h-7 text-xs">
                          <SelectValue placeholder={
                            switchStatus?.isViewingAs 
                              ? `Viewing as ${switchStatus?.viewingUser?.firstName || switchStatus?.viewingUser?.email}`
                              : defaultUserId 
                                ? `Bryan Runion`
                                : "Select User"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {switchStatus?.isViewingAs && (
                            <SelectItem value="switch-back">← Back to Admin</SelectItem>
                          )}
                          {allUsers.map((userOption: User) => (
                            <SelectItem key={userOption.id} value={userOption.id.toString()}>
                              {userOption.firstName || userOption.lastName 
                                ? `${userOption.firstName || ""} ${userOption.lastName || ""}`.trim()
                                : userOption.email
                              } ({userOption.profileType || "Unknown"} • {userOption.betaAccess})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
