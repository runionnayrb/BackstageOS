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
  const projectLabel = isFullTime ? "Shows" : "Projects";
  const projectSingle = isFullTime ? "Show" : "Project";

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
    return new Date(dateString).toLocaleDateString();
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{projectLabel}</h1>
            <p className="text-muted-foreground mt-2">
              {isFullTime ? "Manage your theater productions" : "Manage your client projects"}
            </p>
          </div>
          <Button onClick={() => setLocation("/create-project")}>
            <Plus className="w-5 h-5 mr-2" />
            New {projectSingle}
          </Button>
        </div>

        {(projects as any[]).length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No {projectLabel.toLowerCase()} yet</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first {projectSingle.toLowerCase()}</p>
          <Button onClick={() => setLocation("/create-project")}>
            <Plus className="w-5 h-5 mr-2" />
            Create {projectSingle}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(projects as any[]).map((project: any) => (
            <Card 
              key={project.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation(`/shows/${project.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {getProjectInitial(project.name)}
                    </span>
                  </div>
                  <Badge 
                    className={`${getStatusColor(project.status)} text-white capitalize`}
                  >
                    {project.status}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {project.description || "No description provided"}
                </p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{project.venue || "No venue set"}</span>
                  <span>Updated {formatDate(project.updatedAt)}</span>
                </div>
                {project.openingNight && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Opens: {formatDate(project.openingNight)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
