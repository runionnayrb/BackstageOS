import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  GripVertical
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useFeatureSettings } from "@/hooks/useFeatureSettings";
import { useBetaFeatures } from "@/hooks/useBetaFeatures";
import { usePageTitle } from "@/hooks/usePageTitle";
import ShowBillingPrompt from "@/components/ShowBillingPrompt";

interface ShowDetailParams {
  id: string;
}

export default function ShowDetail() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<ShowDetailParams>();
  const projectId = params.id;
  const queryClient = useQueryClient();

  // Guard against missing projectId
  if (!projectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Show Not Found</h1>
          <p className="text-muted-foreground mb-4">The show you're looking for doesn't exist or the URL is invalid.</p>
          <Button onClick={() => setLocation('/shows')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shows
          </Button>
        </div>
      </div>
    );
  }

  // State for drag and drop reordering
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Set page title for mobile header
  usePageTitle();

  // Import feature settings hooks - both user preferences and beta access
  const { isFeatureEnabled } = useFeatureSettings(projectId);
  const { canAccessFeature } = useBetaFeatures();
  
  // Helper function to check if feature should be shown (both user enabled AND beta accessible)
  const shouldShowFeature = (userFeature: string, betaFeature: string) => {
    return isFeatureEnabled(userFeature as any) && canAccessFeature(betaFeature);
  };
  
  // Default sections array - filtered by both user settings and beta access
  const defaultSections = [
    ...(shouldShowFeature('reports', 'report-builder') ? [{
      id: "reports",
      title: "Reports",
      href: `/shows/${projectId}/reports`,
    }] : []),
    ...(shouldShowFeature('calendar', 'calendar-management') ? [{
      id: "calendar",
      title: "Calendar",
      href: `/shows/${projectId}/calendar`,
    }] : []),
    ...(shouldShowFeature('script', 'script-editor') ? [{
      id: "script",
      title: "Script",
      href: `/shows/${projectId}/script`,
    }] : []),
    ...(shouldShowFeature('props', 'props-tracker') ? [{
      id: "props",
      title: "Props",
      href: `/shows/${projectId}/props`,
    }] : []),
    ...(shouldShowFeature('costumes', 'costume-tracker') ? [{
      id: "costumes",
      title: "Costumes",
      href: `/shows/${projectId}/costumes`,
    }] : []),
    ...(shouldShowFeature('contacts', 'contact-management') ? [{
      id: "contacts",
      title: "Contacts",
      href: `/shows/${projectId}/contacts`,
    }] : []),
  ];

  // State for sections - start empty to prevent flash
  const [sections, setSections] = useState<typeof defaultSections>([]);

  // Data queries - always called in same order
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Fetch project directly by ID to support archived shows
  const { data: projectData, isLoading: projectDataLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: isAuthenticated && !!projectId,
  });

  const { data: projectSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: isAuthenticated && !!projectId,
  });

  // Fetch billing status for this show
  const { data: billingStatus } = useQuery({
    queryKey: ['/api/shows', projectId, 'billing'],
    queryFn: async () => {
      const response = await fetch(`/api/shows/${projectId}/billing`, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch billing');
      }
      return response.json();
    },
    enabled: isAuthenticated && !!projectId,
  });

  // Mutations - always defined in same order
  const saveSectionOrderMutation = useMutation({
    mutationFn: async (sectionOrder: string[]) => {
      return apiRequest("PUT", `/api/projects/${projectId}/settings`, {
        sectionsOrder: sectionOrder,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/settings`] });
      toast({
        title: "Section order saved",
        description: "Your custom section order has been saved.",
      });
    },
    onError: (error) => {
      console.error("Error saving section order:", error);
      toast({
        title: "Error",
        description: "Failed to save section order. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Effects - always called in same order
  useEffect(() => {
    // Listen for toggle reorder event from enhanced header
    const handleToggleReorder = () => {
      setIsReordering(!isReordering);
    };

    window.addEventListener('toggleReorder', handleToggleReorder);
    return () => window.removeEventListener('toggleReorder', handleToggleReorder);
  }, [isReordering]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Initialize sections once project settings are loaded or confirmed to not exist
  useEffect(() => {
    if (projectSettings !== undefined) {
      if (projectSettings && (projectSettings as any).sectionsOrder) {
        const savedOrder = (projectSettings as any).sectionsOrder;
        const reorderedSections = savedOrder.map((id: string) => 
          defaultSections.find(section => section.id === id)
        ).filter(Boolean);
        
        // Add any new sections that weren't in the saved order
        const savedIds = new Set(savedOrder);
        const newSections = defaultSections.filter(section => !savedIds.has(section.id));
        
        setSections([...reorderedSections, ...newSections]);
      } else {
        setSections(defaultSections);
      }
    }
  }, [projectSettings]);

  // Early returns after all hooks are called
  if (isLoading || projectDataLoading || sections.length === 0) {
    return (
      <div className="w-full">
        {/* Mobile Loading */}
        <div className="md:hidden px-4 py-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
            <div className="space-y-3">
              <div className="h-12 bg-gray-200 rounded-lg"></div>
              <div className="h-12 bg-gray-200 rounded-lg"></div>
              <div className="h-12 bg-gray-200 rounded-lg"></div>
              <div className="h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
        
        {/* Desktop Loading */}
        <div className="hidden md:block container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-6 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Use directly fetched project data (supports both active and archived shows)
  const project = projectData as any;
  
  if (!project) {
    return (
      <div className="w-full">
        {/* Mobile Error */}
        <div className="md:hidden px-4 py-6">
          <Card className="border-red-200">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg text-red-600">Show Not Found</CardTitle>
              <CardDescription className="text-sm">The requested show could not be found.</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button 
                onClick={() => setLocation("/projects")} 
                className="w-full"
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Shows
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Desktop Error */}
        <div className="hidden md:block container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Show Not Found</CardTitle>
              <CardDescription>The requested show could not be found.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation("/projects")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Shows
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newSections = [...sections];
    const draggedSection = newSections[draggedIndex];
    
    // Remove dragged item
    newSections.splice(draggedIndex, 1);
    
    // Insert at new position
    newSections.splice(dropIndex, 0, draggedSection);
    
    setSections(newSections);
    
    // Save the new order
    const sectionOrder = newSections.map(section => section.id);
    saveSectionOrderMutation.mutate(sectionOrder);
  };

  // Check if billing payment is required
  const requiresPayment = billingStatus && 
    (billingStatus.billingStatus === 'unpaid' || 
     (billingStatus.billingStatus === 'trial' && !billingStatus.trialActive));

  return (
    <div className="w-full">
      {/* Show billing prompt if payment is required */}
      {requiresPayment && (
        <ShowBillingPrompt 
          projectId={parseInt(projectId)} 
          projectName={project.name}
          onActivated={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/shows', projectId, 'billing'] });
          }}
        />
      )}

      {/* Mobile reorder indicator */}
      {isReordering && (
        <div className="md:hidden px-4 sm:px-6 lg:px-8 pt-2 pb-1">
          <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full inline-block">
            Drag sections to reorder
          </div>
        </div>
      )}

      {/* Desktop Header */}
      <div className="hidden md:block px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsReordering(!isReordering)}
            className="flex items-center gap-2"
          >
            <GripVertical className="h-4 w-4" />
            {isReordering ? "Done Reordering" : "Reorder"}
          </Button>
        </div>
      </div>

      {/* Mobile Sections List */}
      <div className="md:hidden px-4 sm:px-6 lg:px-8 pb-4">
        <div className="space-y-1">
          {sections.map((section, index) => (
            <div
              key={section.id}
              draggable={isReordering}
              onDragStart={isReordering ? (e) => handleDragStart(e, index) : undefined}
              onDragOver={isReordering ? handleDragOver : undefined}
              onDrop={isReordering ? (e) => handleDrop(e, index) : undefined}
              onDragEnd={isReordering ? handleDragEnd : undefined}
              className={`p-4 transition-colors border border-transparent group relative ${
                isReordering && draggedIndex === index 
                  ? 'opacity-50 bg-blue-50 border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {isReordering && (
                  <div className="drag-handle cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div 
                  className="flex-1 flex justify-between items-center cursor-pointer"
                  onClick={() => setLocation(section.href)}
                >
                  <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                  <span className="text-gray-400 text-lg">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Desktop Sections List */}
      <div className="hidden md:block px-4 sm:px-6 lg:px-8">
        <div className="space-y-1">
          {sections.map((section, index) => (
            <div
              key={section.id}
              draggable={isReordering}
              onDragStart={isReordering ? (e) => handleDragStart(e, index) : undefined}
              onDragOver={isReordering ? handleDragOver : undefined}
              onDrop={isReordering ? (e) => handleDrop(e, index) : undefined}
              onDragEnd={isReordering ? handleDragEnd : undefined}
              className={`p-4 transition-colors border border-transparent group relative ${
                isReordering && draggedIndex === index 
                  ? 'opacity-50 bg-blue-50 border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {isReordering && (
                  <div className="drag-handle cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div 
                  className="flex-1 flex justify-between items-center cursor-pointer"
                  onClick={() => setLocation(section.href)}
                >
                  <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                  <span className="text-gray-400 text-lg">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}