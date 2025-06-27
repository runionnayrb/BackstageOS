import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Settings
} from "lucide-react";

interface ShowDetailParams {
  id: string;
}

export default function ShowDetail() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<ShowDetailParams>();
  const projectId = params.id;

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
  
  const project = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId || '0')) : null;

  if (isLoading || projectsLoading) return <div>Loading...</div>;
  if (!project) return <div>Show not found</div>;

  // Adapt terminology based on profile type
  const isFreelance = user?.profileType === 'freelance';
  const projectLabel = isFreelance ? "Project" : "Production";
  const showLabel = isFreelance ? "Project" : "Show";

  const sections = [
    {
      title: "Reports",
      description: isFreelance ? "Project reports and documentation" : "Show reports and documentation",
      href: `/shows/${projectId}/reports`,
    },
    {
      title: "Calendar",
      description: isFreelance ? "Project schedules and calls" : "Rehearsal schedules and daily calls",
      href: `/shows/${projectId}/calendar`,
    },
    {
      title: "Script",
      description: isFreelance ? "Script and materials" : "Script management and notes",
      href: `/shows/${projectId}/script`,
    },
    {
      title: "Props & Costumes",
      description: isFreelance ? "Project inventory tracking" : "Props and costume management",
      href: `/shows/${projectId}/props-costumes`,
    },
    {
      title: "Personnel",
      description: isFreelance ? "Team and character information" : "Cast and character information",
      href: `/shows/${projectId}/personnel`,
    },
  ];

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
          {sections.map((section) => (
            <div
              key={section.title}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setLocation(section.href)}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                <span className="text-gray-400 text-lg">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}