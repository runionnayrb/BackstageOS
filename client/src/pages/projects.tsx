import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Plus, FolderOpen } from "lucide-react";

export default function Projects() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const isFullTime = (user as any)?.profileType === "fulltime";
  const projectLabel = "Shows";
  const projectSingle = "Show";

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
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
      <div className="notion-container py-notion-section">
        <div className="animate-pulse space-y-notion-element">
          <div className="h-8 bg-muted rounded-notion w-1/4"></div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-notion"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full">
        <div className="notion-container py-notion-section">
          <div className="flex justify-between items-center mb-notion-element">
            <div>
              <h1 className="text-3xl font-semibold text-text-heading">{projectLabel}</h1>
            </div>
            <Button 
              onClick={() => setLocation("/create-project")}
              className="notion-button notion-button-primary rounded-notion"
            >
              <Plus className="w-5 h-5 mr-2" />
              New {projectSingle}
            </Button>
          </div>
        </div>

        <div className="notion-container">
          {(projects as any[]).length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-heading mb-2">No {projectLabel.toLowerCase()} yet</h3>
              <p className="text-text-muted mb-6">Get started by creating your first {projectSingle.toLowerCase()}</p>
              <Button 
                onClick={() => setLocation("/create-project")}
                className="notion-button notion-button-primary rounded-notion"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create {projectSingle}
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {(projects as any[]).map((project: any) => (
                <div 
                  key={project.id} 
                  className="notion-card p-4 hover:bg-muted transition-colors cursor-pointer rounded-notion"
                  onClick={() => setLocation(`/shows/${project.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-text-heading mb-0.5">{project.name}</h3>
                      <div className="text-sm text-text-muted mb-1 ml-0.5">
                        {project.venue || "No venue set"}
                      </div>
                      <div className="text-sm text-text-muted ml-0.5">
                        {formatDateRange(project.prepStartDate, project.closingDate)}
                      </div>
                    </div>
                    <div className="text-text-muted">
                      →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
