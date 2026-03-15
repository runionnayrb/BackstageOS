import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Plus, FolderOpen, Settings, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminView } from "@/contexts/AdminViewContext";
import { isAdmin } from "@/lib/admin";
import { FloatingActionButton } from "@/components/navigation/floating-action-button";

export default function Projects() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { selectedProfileType } = useAdminView();
  
  // Check if user is full-time either by their actual profile type OR if admin has selected full-time view
  const isFullTime = (user as any)?.profileType === "fulltime" || 
    (isAdmin(user) && selectedProfileType === "fulltime");
  
  // User can create shows if they are a USER (not just an invited editor) with fulltime profile AND active subscription
  // Editors invited to productions cannot create shows unless they're also a user with their own subscription
  // Admins can always create unlimited shows regardless of subscription status
  const isUserRole = (user as any)?.userRole === "user" || (user as any)?.userRole === "admin";
  const hasActiveSubscription = (user as any)?.subscriptionStatus === "active" || 
     (user as any)?.subscriptionStatus === "trialing" ||
     (user as any)?.grandfatheredFree === true;
  const userIsAdmin = isAdmin(user);
  const isBetaUser = (user as any)?.betaAccess === true;
  
  const projectLabel = "Shows";
  const projectSingle = "Show";

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
  });
  
  // Filter to only non-archived, owned projects for beta limit check
  const ownedActiveProjects = (projects as any[]).filter((p: any) => !p.isArchived && !p.isInvited);
  
  // Beta users can only have 1 active show (check after projects is defined)
  const betaLimitReached = isBetaUser && !userIsAdmin && ownedActiveProjects.length >= 1;
  const canCreateShow = userIsAdmin || (isFullTime && isUserRole && (hasActiveSubscription || isBetaUser) && !betaLimitReached);

  // Sort projects by first rehearsal date (primary) and closing date (secondary)
  const sortedProjects = [...(projects as any[])].sort((a, b) => {
    // Primary sort: first rehearsal date (most future first)
    const aRehearsalDate = a.firstRehearsalDate ? new Date(a.firstRehearsalDate).getTime() : 0;
    const bRehearsalDate = b.firstRehearsalDate ? new Date(b.firstRehearsalDate).getTime() : 0;
    
    // If both have rehearsal dates, sort by them (most future first)
    if (aRehearsalDate && bRehearsalDate) {
      const rehearsalComparison = bRehearsalDate - aRehearsalDate;
      if (rehearsalComparison !== 0) return rehearsalComparison;
    }
    
    // If only one has rehearsal date, prioritize it
    if (aRehearsalDate && !bRehearsalDate) return -1;
    if (!aRehearsalDate && bRehearsalDate) return 1;
    
    // Secondary sort: closing date (most future first)
    const aClosingDate = a.closingDate ? new Date(a.closingDate).getTime() : 0;
    const bClosingDate = b.closingDate ? new Date(b.closingDate).getTime() : 0;
    
    if (aClosingDate && bClosingDate) {
      return bClosingDate - aClosingDate;
    }
    
    // If only one has closing date, prioritize it
    if (aClosingDate && !bClosingDate) return -1;
    if (!aClosingDate && bClosingDate) return 1;
    
    // If neither has dates, maintain original order
    return 0;
  });

  const getProjectInitial = (name: string) => name.charAt(0).toUpperCase();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning": return "bg-gray-500";
      case "pre-production": return "bg-blue-500";
      case "rehearsal": return "bg-yellow-500";
      case "tech": return "bg-orange-500";
      case "performance": return "bg-green-500";
      case "closed": return "bg-gray-400";
      default: return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateRange = (prepStart?: string, closing?: string) => {
    if (!prepStart && !closing) return "No dates set";
    if (prepStart && closing) {
      return `${formatDate(prepStart)} - ${formatDate(closing)}`;
    }
    if (prepStart) return `From ${formatDate(prepStart)}`;
    if (closing) return `Until ${formatDate(closing)}`;
    return "No dates set";
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="w-full">
        {/* Desktop Header Only */}
        <div className="hidden md:block px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-3xl font-bold">{projectLabel}</h1>
            </div>
            <div className="flex gap-2">
              {isFullTime && (
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/settings")}
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Settings
                </Button>
              )}
              {canCreateShow && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setLocation("/onboarding")}
                  className="hover:bg-transparent hover:text-blue-600 transition-colors p-1"
                  data-testid="button-create-show"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8">
          {betaLimitReached && (
            <Alert className="mb-4 border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Beta accounts are limited to 1 active show. Archive your current show to create a new one, or upgrade after the beta period ends.
              </AlertDescription>
            </Alert>
          )}
          
          {sortedProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {projectLabel.toLowerCase()} yet</h3>
              {canCreateShow ? (
                <>
                  <p className="text-gray-500 mb-6">Get started by creating your first {projectSingle.toLowerCase()}</p>
                  <Button onClick={() => setLocation("/onboarding")} data-testid="button-create-show-empty">
                    <Plus className="w-5 h-5 mr-2" />
                    Create {projectSingle}
                  </Button>
                </>
              ) : (
                <p className="text-gray-500 mb-6">You don't have any shows yet. Ask a producer to invite you to a production.</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {sortedProjects.map((project: any) => (
                <div 
                  key={project.id} 
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/shows/${project.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-0.5">{project.name}</h3>
                      <div className="text-sm text-muted-foreground mb-1 ml-0.5">
                        {project.venue || "No venue set"}
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Floating Action Button - Mobile Only */}
      {canCreateShow && <FloatingActionButton onClick={() => setLocation("/onboarding")} />}
    </div>
  );
}
