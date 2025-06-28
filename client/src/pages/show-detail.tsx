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
  Settings,
  GripVertical
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

  // State for drag and drop reordering
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Default sections array
  const defaultSections = [
    {
      id: "reports",
      title: "Reports",
      href: `/shows/${projectId}/reports`,
    },
    {
      id: "calendar",
      title: "Calendar",
      href: `/shows/${projectId}/calendar`,
    },
    {
      id: "script",
      title: "Script",
      href: `/shows/${projectId}/script`,
    },
    {
      id: "props-costumes",
      title: "Props & Costumes",
      href: `/shows/${projectId}/props`,
    },
    {
      id: "contacts",
      title: "Contacts",
      href: `/shows/${projectId}/contacts`,
    },
  ];

  // State for sections with default value
  const [sections, setSections] = useState(defaultSections);

  // Data queries - always called in same order
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const { data: projectSettings } = useQuery({
    queryKey: ["/api/projects", projectId, "settings"],
    enabled: isAuthenticated && !!projectId,
  });

  // Mutations - always defined in same order
  const saveSectionOrderMutation = useMutation({
    mutationFn: async (sectionOrder: string[]) => {
      return apiRequest(`/api/projects/${projectId}/settings`, {
        method: "PUT",
        body: JSON.stringify({
          sectionsOrder: sectionOrder,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "settings"] });
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

  // Apply saved section order when project settings load
  useEffect(() => {
    if (projectSettings && (projectSettings as any).sectionsOrder) {
      const savedOrder = (projectSettings as any).sectionsOrder;
      const reorderedSections = savedOrder.map((id: string) => 
        defaultSections.find(section => section.id === id)
      ).filter(Boolean);
      
      // Add any new sections that weren't in the saved order
      const savedIds = new Set(savedOrder);
      const newSections = defaultSections.filter(section => !savedIds.has(section.id));
      
      setSections([...reorderedSections, ...newSections]);
    }
  }, [projectSettings]);

  // Early returns after all hooks are called
  if (isLoading || projectsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const project = projects?.find((p: any) => p.id === parseInt(projectId));
  
  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
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

  return (
    <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/projects")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Shows
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.venue && (
                <p className="text-gray-600 mt-1">{project.venue}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReordering(!isReordering)}
            >
              {isReordering ? "Done Reordering" : "Re-order"}
            </Button>
            <Button
              variant="outline"
              size="sm" 
              onClick={() => setLocation(`/shows/${projectId}/settings`)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Show Settings
            </Button>
          </div>
        </div>

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
  );
}