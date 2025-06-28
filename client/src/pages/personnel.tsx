import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PersonnelParams {
  id: string;
}

export default function Personnel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<PersonnelParams>();
  const projectId = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultCategories = [
    {
      id: "cast",
      title: "Cast",
      description: "Actors and performers",
      href: `/shows/${projectId}/contacts/cast`,
    },
    {
      id: "crew",
      title: "Crew",
      description: "Technical and production crew",
      href: `/shows/${projectId}/contacts/crew`,
    },
    {
      id: "stage_management",
      title: "Stage Management",
      description: "Stage managers and assistants",
      href: `/shows/${projectId}/contacts/stage_management`,
    },
    {
      id: "creative_team",
      title: "Creative Team",
      description: "Directors, designers, and creative staff",
      href: `/shows/${projectId}/contacts/creative_team`,
    },
    {
      id: "theater_staff",
      title: "Theater Staff",
      description: "House management and venue staff",
      href: `/shows/${projectId}/contacts/theater_staff`,
    },
  ];

  const [categories, setCategories] = useState(defaultCategories);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  // Load saved category order from project settings
  const { data: projectSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: !!projectId,
  });

  // Apply saved category order when project settings load
  useEffect(() => {
    if (projectSettings?.contactCategoriesOrder) {
      const savedOrder = projectSettings.contactCategoriesOrder;
      const reorderedCategories = savedOrder.map((id: string) => 
        defaultCategories.find(cat => cat.id === id)
      ).filter(Boolean);
      
      // Add any new categories that weren't in the saved order
      const savedIds = new Set(savedOrder);
      const newCategories = defaultCategories.filter(cat => !savedIds.has(cat.id));
      
      setCategories([...reorderedCategories, ...newCategories]);
    }
  }, [projectSettings]);

  // Save category order mutation
  const saveCategoryOrderMutation = useMutation({
    mutationFn: async (categoryOrder: string[]) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}/settings`, {
        contactCategoriesOrder: categoryOrder
      });
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save category order",
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
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newCategories = [...categories];
    const draggedCategory = newCategories[draggedIndex];
    
    // Remove dragged item
    newCategories.splice(draggedIndex, 1);
    
    // Insert at new position
    newCategories.splice(dropIndex, 0, draggedCategory);
    
    setCategories(newCategories);
    setDraggedIndex(null);
    
    // Save the new order
    const categoryOrder = newCategories.map(cat => cat.id);
    saveCategoryOrderMutation.mutate(categoryOrder);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {(project as any)?.name}
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-gray-500 mt-2">
            Manage contact information by category
          </p>
        </div>

        <div className="space-y-1">
          {categories.map((category, index) => (
            <div
              key={category.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`p-4 transition-colors cursor-pointer border border-transparent group relative ${
                draggedIndex === index 
                  ? 'opacity-50 bg-blue-50 border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="drag-handle cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-5 w-5 text-gray-400" />
                </div>
                <div 
                  className="flex-1 flex justify-between items-center"
                  onClick={() => setLocation(category.href)}
                >
                  <h3 className="text-lg font-medium text-gray-900">{category.title}</h3>
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