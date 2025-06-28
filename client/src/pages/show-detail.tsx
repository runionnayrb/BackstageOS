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

  // Redirect to home if not authenticated
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

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Load saved section order from project settings
  const { data: projectSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: !!projectId,
  });
  
  const project = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId || '0')) : null;

  if (isLoading || projectsLoading) return <div>Loading...</div>;
  if (!project) return <div>Show not found</div>;

  // Adapt terminology based on profile type
  const isFreelance = user?.profileType === 'freelance';
  const projectLabel = isFreelance ? "Project" : "Production";
  const showLabel = isFreelance ? "Project" : "Show";

  const defaultSections = [
    {
      id: "reports",
      title: "Reports",
      description: isFreelance ? "Project reports and documentation" : "Show reports and documentation",
      href: `/shows/${projectId}/reports`,
    },
    {
      id: "calendar",
      title: "Calendar",
      description: isFreelance ? "Project schedules and calls" : "Rehearsal schedules and daily calls",
      href: `/shows/${projectId}/calendar`,
    },
    {
      id: "script",
      title: "Script",
      description: isFreelance ? "Script and materials" : "Script management and notes",
      href: `/shows/${projectId}/script`,
    },
    {
      id: "props-costumes",
      title: "Props & Costumes",
      description: isFreelance ? "Project inventory tracking" : "Props and costume management",
      href: `/shows/${projectId}/props-costumes`,
    },
    {
      id: "contacts",
      title: "Contacts",
      description: isFreelance ? "Team and character information" : "Cast and character information",
      href: `/shows/${projectId}/contacts`,
    },
  ];

  const [sections, setSections] = useState(defaultSections);

  // Apply saved section order when project settings load
  useEffect(() => {
    if (projectSettings?.sectionsOrder) {
      const savedOrder = projectSettings.sectionsOrder;
      const reorderedSections = savedOrder.map((id: string) => 
        defaultSections.find(section => section.id === id)
      ).filter(Boolean);
      
      // Add any new sections that weren't in the saved order
      const savedIds = new Set(savedOrder);
      const newSections = defaultSections.filter(section => !savedIds.has(section.id));
      
      setSections([...reorderedSections, ...newSections]);
    }
  }, [projectSettings]);

  // Save section order mutation
  const saveSectionOrderMutation = useMutation({
    mutationFn: async (sectionOrder: string[]) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}/settings`, {
        sectionsOrder: sectionOrder
      });
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save section order",
        variant: "destructive",
      });
    },
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
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

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shows
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-muted-foreground mt-2">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={isReordering ? "default" : "outline"}
                size="sm"
                onClick={() => setIsReordering(!isReordering)}
                className="flex items-center gap-2"
              >
                <GripVertical className="h-4 w-4" />
                {isReordering ? "Done Reordering" : "Re-order"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation(`/shows/${projectId}/settings`)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Show Settings
              </Button>
            </div>
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
    </div>
  );
}